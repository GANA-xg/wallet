import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql, isNull } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  topupSchema,
  transferSchema,
  transactionsQuerySchema,
} from "@workspace/api-zod";
import { runSubscriptionDetection } from "../jobs/detectSubscriptions";
import { logAndEmit } from "../lib/socketServer";

const router: IRouter = Router();
router.use(requireAuth);

// GET /wallet
router.get("/wallet", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const wallet = await db.query.wallets.findFirst({
      where: eq(schema.wallets.userId, userId),
    });

    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    // Calculate spendable = balance_paise - sum of active reserved_amounts
    const [reservedSum] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.reservedAmounts.amountPaise}), 0)` })
      .from(schema.reservedAmounts)
      .where(
        and(
          eq(schema.reservedAmounts.userId, userId),
          isNull(schema.reservedAmounts.deletedAt),
        ),
      );

    const spendablePaise = wallet.balancePaise - (reservedSum?.total ?? 0);

    res.json({
      wallet: {
        id: wallet.id,
        balance_paise: wallet.balancePaise,
        upi_lite_paise: wallet.upiLitePaise,
        spendable_paise: spendablePaise,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to get wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /wallet/topup
router.post(
  "/wallet/topup",
  validate({ schema: topupSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { amount_paise, source } = req.body;

      const wallet = await db.query.wallets.findFirst({
        where: eq(schema.wallets.userId, userId),
      });

      if (!wallet) {
        res.status(404).json({ error: "Wallet not found" });
        return;
      }

      // Use a DB transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Increment balance
        const [updatedWallet] = await tx
          .update(schema.wallets)
          .set({
            balancePaise: wallet.balancePaise + amount_paise,
            updatedAt: new Date(),
          })
          .where(eq(schema.wallets.id, wallet.id))
          .returning();

        // Create transaction record
        const [transaction] = await tx
          .insert(schema.transactions)
          .values({
            userId,
            amountPaise: amount_paise,
            type: "credit",
            status: "success",
            category: "topup",
            source,
            occurredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return { wallet: updatedWallet, transaction };
      });

      res.status(201).json(result);

      // Socket.IO real-time events
      logAndEmit(req.user!.userId, "wallet:updated", {
        balance_paise: result.wallet.balancePaise,
        spendable_paise: result.wallet.balancePaise,
      }).catch(() => {});
      logAndEmit(req.user!.userId, "transaction:new", {
        transaction: result.transaction,
      }).catch(() => {});

      // Background subscription detection — fire and forget
      // TODO: move to BullMQ job queue once Redis is added
      runSubscriptionDetection(req.user!.userId).catch((err) => {
        console.error("[subscription-detection] failed:", err);
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to topup wallet");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /wallet/transfer
router.post(
  "/wallet/transfer",
  validate({ schema: transferSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { to_upi_id, amount_paise, note, idempotency_key } = req.body;

      // Check for duplicate idempotency_key first
      const existingTxn = await db.query.transactions.findFirst({
        where: and(
          eq(schema.transactions.userId, userId),
          eq(schema.transactions.idempotencyKey, idempotency_key),
        ),
      });

      if (existingTxn) {
        // Return original transaction (idempotent)
        res.json({ transaction: existingTxn });
        return;
      }

      const wallet = await db.query.wallets.findFirst({
        where: eq(schema.wallets.userId, userId),
      });

      if (!wallet) {
        res.status(404).json({ error: "Wallet not found" });
        return;
      }

      // Calculate spendable balance
      const [reservedSum] = await db
        .select({ total: sql<number>`coalesce(sum(${schema.reservedAmounts.amountPaise}), 0)` })
        .from(schema.reservedAmounts)
        .where(
          and(
            eq(schema.reservedAmounts.userId, userId),
            isNull(schema.reservedAmounts.deletedAt),
          ),
        );

      const spendablePaise = wallet.balancePaise - (reservedSum?.total ?? 0);

      if (spendablePaise < amount_paise) {
        res.status(422).json({ error: "insufficient_balance" });
        return;
      }

      const result = await db.transaction(async (tx) => {
        // Decrement balance
        const [updatedWallet] = await tx
          .update(schema.wallets)
          .set({
            balancePaise: wallet.balancePaise - amount_paise,
            updatedAt: new Date(),
          })
          .where(eq(schema.wallets.id, wallet.id))
          .returning();

        // Create transaction record
        const [transaction] = await tx
          .insert(schema.transactions)
          .values({
            userId,
            amountPaise: amount_paise,
            type: "debit",
            status: "success",
            category: "transfer",
            counterpartyUpi: to_upi_id,
            merchant: null,
            source: "upi_app",
            idempotencyKey: idempotency_key,
            occurredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Create notification
        await tx.insert(schema.notifications).values({
          userId,
          type: "payment",
          title: "Money Sent",
          body: `You sent ₹${amount_paise / 100} to ${to_upi_id}`,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { transaction };
      });

      res.status(201).json(result);

      // Socket.IO real-time events
      const newBalance = wallet.balancePaise - amount_paise;
      logAndEmit(userId, "wallet:updated", {
        balance_paise: newBalance,
        spendable_paise: newBalance,
      }).catch(() => {});
      logAndEmit(userId, "notification:new", {
        notification: {
          type: "payment",
          title: "Money Sent",
          body: `You sent ₹${amount_paise / 100} to ${to_upi_id}`,
        },
      }).catch(() => {});

      // Background subscription detection — fire and forget
      // TODO: move to BullMQ job queue once Redis is added
      runSubscriptionDetection(req.user!.userId).catch((err) => {
        console.error("[subscription-detection] failed:", err);
      });
    } catch (error) {
      // Handle unique constraint violation as idempotency fallback
      if ((error as any).code === "23505") {
        const db = getDb();
        const existingTxn = await db.query.transactions.findFirst({
          where: eq(schema.transactions.idempotencyKey, req.body.idempotency_key),
        });
        if (existingTxn) {
          res.json({ transaction: existingTxn });
          return;
        }
      }
      logger.error({ err: error }, "Failed to transfer");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /wallet/transactions
router.get(
  "/wallet/transactions",
  validate({ schema: transactionsQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { page, limit, category, from_date, to_date } = req.query as any;

      const conditions = [
        eq(schema.transactions.userId, userId),
        isNull(schema.transactions.deletedAt),
      ];

      if (category) {
        conditions.push(eq(schema.transactions.category, category));
      }
      if (from_date) {
        conditions.push(sql`${schema.transactions.occurredAt} >= ${new Date(from_date)}`);
      }
      if (to_date) {
        conditions.push(sql`${schema.transactions.occurredAt} <= ${new Date(to_date)}`);
      }

      const offset = (page - 1) * limit;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.transactions)
        .where(and(...conditions));

      const transactions = await db
        .select()
        .from(schema.transactions)
        .where(and(...conditions))
        .orderBy(sql`${schema.transactions.occurredAt} DESC`)
        .limit(limit)
        .offset(offset);

      res.json({
        transactions,
        total: countResult?.count ?? 0,
        page,
        limit,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to list transactions");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
