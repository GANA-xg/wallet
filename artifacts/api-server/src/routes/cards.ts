import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
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

function paramId(req: Request): string {
  const id = paramId(req);
  return Array.isArray(id) ? id[0] : id;
}

function toCardJson(card: typeof schema.cards.$inferSelect) {
  return {
    ...card,
    frozen: Boolean(card.frozen),
    theme: (() => {
      try {
        return JSON.parse(card.theme);
      } catch {
        return { gradientColors: ["#2a2a2a", "#222222"] };
      }
    })(),
  };
}

router.get("/cards", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const allCards = await db.query.cards.findMany();
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
      const card = await db.query.cards.findFirst({
        where: eq(schema.cards.id, paramId(req)),
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
      const body = req.body;

      const now = new Date();
      const themeStr = body.theme
        ? JSON.stringify(body.theme)
        : '{"gradientColors":["#2a2a2a","#222222"]}';

      const [newCard] = await db
        .insert(schema.cards)
        .values({
          id: body.id ?? `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: body.userId ?? "api",
          cardNetwork: body.cardNetwork,
          issuer: body.issuer ?? null,
          lastFour: body.lastFour,
          expiryMonth: body.expiryMonth,
          expiryYear: body.expiryYear,
          nickname:
            body.nickname ??
            `${body.cardNetwork.charAt(0).toUpperCase() + body.cardNetwork.slice(1)} •••• ${body.lastFour}`,
          theme: themeStr,
          frozen: body.frozen ? 1 : 0,
          balance: body.balance ?? 0,
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
      const cardId = paramId(req);
      const updates = req.body;

      const existing = await db.query.cards.findFirst({
        where: eq(schema.cards.id, cardId),
      });
      if (!existing) {
        res.status(404).json({ error: "Card not found" });
        return;
      }

      const setPayload: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.cardNetwork !== undefined) setPayload.cardNetwork = updates.cardNetwork;
      if (updates.issuer !== undefined) setPayload.issuer = updates.issuer;
      if (updates.lastFour !== undefined) setPayload.lastFour = updates.lastFour;
      if (updates.expiryMonth !== undefined) setPayload.expiryMonth = updates.expiryMonth;
      if (updates.expiryYear !== undefined) setPayload.expiryYear = updates.expiryYear;
      if (updates.nickname !== undefined) setPayload.nickname = updates.nickname;
      if (updates.theme !== undefined) setPayload.theme = JSON.stringify(updates.theme);
      if (updates.frozen !== undefined) setPayload.frozen = updates.frozen ? 1 : 0;
      if (updates.balance !== undefined) setPayload.balance = updates.balance;

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
      const cardId = paramId(req);

      const [removed] = await db
        .delete(schema.cards)
        .where(eq(schema.cards.id, cardId))
        .returning();

      if (!removed) {
        res.status(404).json({ error: "Card not found" });
        return;
      }
      res.json({ card: toCardJson(removed) });
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
      const cardId = paramId(req);

      const [updated] = await db
        .update(schema.cards)
        .set({ frozen: 1, updatedAt: new Date() })
        .where(eq(schema.cards.id, cardId))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Card not found" });
        return;
      }
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
      const cardId = paramId(req);

      const [updated] = await db
        .update(schema.cards)
        .set({ frozen: 0, updatedAt: new Date() })
        .where(eq(schema.cards.id, cardId))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Card not found" });
        return;
      }
      res.json({ card: toCardJson(updated) });
    } catch (error) {
      logger.error({ err: error }, "Failed to unfreeze card");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
