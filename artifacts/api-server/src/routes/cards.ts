import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createCardSchema,
  updateCardSchema,
  cardIdParamSchema,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth);

function toCardJson(card: typeof schema.cards.$inferSelect) {
  return {
    id: card.id,
    user_id: card.userId,
    last4: card.last4,
    holder_name: card.holderName,
    expiry_month: card.expiryMonth,
    expiry_year: card.expiryYear,
    network: card.network,
    bank_name: card.bankName,
    gradient_colors: card.gradientColors,
    is_frozen: card.isFrozen,
    created_at: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
    updated_at: card.updatedAt instanceof Date ? card.updatedAt.toISOString() : card.updatedAt,
  };
}

router.get("/cards", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const allCards = await db.query.cards.findMany({
      where: and(
        eq(schema.cards.userId, userId),
        isNull(schema.cards.deletedAt),
      ),
    });

    res.json({ cards: allCards.map(toCardJson) });
  } catch (error) {
    logger.error({ err: error }, "Failed to list cards");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/cards/:id",
  validate({ schema: cardIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const cardId = req.params.id as string;

      const card = await db.query.cards.findFirst({
        where: and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, userId),
          isNull(schema.cards.deletedAt),
        ),
      });

      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      res.json({ card: toCardJson(card) });
    } catch (error) {
      logger.error({ err: error }, "Failed to get card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/cards",
  validate({ schema: createCardSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const body = req.body;

      const now = new Date();

      const [newCard] = await db
        .insert(schema.cards)
        .values({
          userId,
          encryptedNumber: body.encrypted_number,
          last4: body.last4,
          holderName: body.holder_name,
          expiryMonth: body.expiry_month,
          expiryYear: body.expiry_year,
          network: body.network,
          bankName: body.bank_name ?? null,
          gradientColors: body.gradient_colors ?? null,
          isFrozen: body.is_frozen ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ card: toCardJson(newCard) });
    } catch (error) {
      logger.error({ err: error }, "Failed to create card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/cards/:id",
  validate({ schema: cardIdParamSchema, source: "params" }, { schema: updateCardSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const cardId = req.params.id as string;
      const updates = req.body;

      const existing = await db.query.cards.findFirst({
        where: and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, userId),
          isNull(schema.cards.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const setPayload: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.holder_name !== undefined) setPayload.holderName = updates.holder_name;
      if (updates.expiry_month !== undefined) setPayload.expiryMonth = updates.expiry_month;
      if (updates.expiry_year !== undefined) setPayload.expiryYear = updates.expiry_year;
      if (updates.bank_name !== undefined) setPayload.bankName = updates.bank_name;
      if (updates.gradient_colors !== undefined) setPayload.gradientColors = updates.gradient_colors;
      if (updates.is_frozen !== undefined) setPayload.isFrozen = updates.is_frozen;

      const [updated] = await db
        .update(schema.cards)
        .set(setPayload)
        .where(eq(schema.cards.id, cardId))
        .returning();

      res.json({ card: toCardJson(updated) });
    } catch (error) {
      logger.error({ err: error }, "Failed to update card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/cards/:id",
  validate({ schema: cardIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const deviceId = req.user!.deviceId;
      const cardId = req.params.id as string;

      const existing = await db.query.cards.findFirst({
        where: and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, userId),
          isNull(schema.cards.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const now = new Date();

      await db
        .update(schema.cards)
        .set({ deletedAt: now })
        .where(eq(schema.cards.id, cardId));

      // Audit log
      await db.insert(schema.auditLogs).values({
        userId,
        deviceId,
        action: "card.deleted",
        ipAddress: req.ip ?? null,
        metadata: { card_id: cardId, last4: existing.last4 },
        createdAt: now,
      });

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/cards/:id/freeze",
  validate({ schema: cardIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const deviceId = req.user!.deviceId;
      const cardId = req.params.id as string;

      const existing = await db.query.cards.findFirst({
        where: and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, userId),
          isNull(schema.cards.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const now = new Date();

      const [updated] = await db
        .update(schema.cards)
        .set({ isFrozen: true, updatedAt: now })
        .where(eq(schema.cards.id, cardId))
        .returning();

      // Audit log
      await db.insert(schema.auditLogs).values({
        userId,
        deviceId,
        action: "card.frozen",
        ipAddress: req.ip ?? null,
        metadata: { card_id: cardId, last4: existing.last4 },
        createdAt: now,
      });

      res.json({ card: toCardJson(updated) });
    } catch (error) {
      logger.error({ err: error }, "Failed to freeze card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/cards/:id/unfreeze",
  validate({ schema: cardIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const deviceId = req.user!.deviceId;
      const cardId = req.params.id as string;

      const existing = await db.query.cards.findFirst({
        where: and(
          eq(schema.cards.id, cardId),
          eq(schema.cards.userId, userId),
          isNull(schema.cards.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const now = new Date();

      const [updated] = await db
        .update(schema.cards)
        .set({ isFrozen: false, updatedAt: now })
        .where(eq(schema.cards.id, cardId))
        .returning();

      // Audit log
      await db.insert(schema.auditLogs).values({
        userId,
        deviceId,
        action: "card.unfrozen",
        ipAddress: req.ip ?? null,
        metadata: { card_id: cardId, last4: existing.last4 },
        createdAt: now,
      });

      res.json({ card: toCardJson(updated) });
    } catch (error) {
      logger.error({ err: error }, "Failed to unfreeze card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
