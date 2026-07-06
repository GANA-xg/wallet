import { Router, type IRouter, type Request, type Response } from "express";

interface CardRecord {
  id: string;
  userId: string;
  cardNetwork: "visa" | "mastercard" | "rupay" | "amex" | "discover" | "unknown";
  issuer: string | null;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  nickname: string;
  theme: { gradientColors: string[] };
  frozen: boolean;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

const cards: CardRecord[] = [];

const router: IRouter = Router();

router.get("/cards", (_req: Request, res: Response) => {
  res.json({ cards });
});

router.get("/cards/:id", (req: Request, res: Response) => {
  const card = cards.find((c) => c.id === req.params["id"]);
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  res.json({ card });
});

router.post("/cards", (req: Request, res: Response) => {
  const body = req.body as Partial<CardRecord>;

  if (!body.cardNetwork || !body.lastFour || !body.expiryMonth || !body.expiryYear) {
    res.status(400).json({ error: "Missing required fields: cardNetwork, lastFour, expiryMonth, expiryYear" });
    return;
  }

  const now = new Date().toISOString();
  const newCard: CardRecord = {
    id: body.id ?? `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: body.userId ?? "api",
    cardNetwork: body.cardNetwork,
    issuer: body.issuer ?? null,
    lastFour: body.lastFour,
    expiryMonth: body.expiryMonth,
    expiryYear: body.expiryYear,
    nickname: body.nickname ?? `${body.cardNetwork.charAt(0).toUpperCase() + body.cardNetwork.slice(1)} •••• ${body.lastFour}`,
    theme: body.theme ?? { gradientColors: ["#2a2a2a", "#222222"] },
    frozen: body.frozen ?? false,
    balance: body.balance ?? 0,
    createdAt: body.createdAt ?? now,
    updatedAt: now,
  };

  cards.unshift(newCard);
  res.status(201).json({ card: newCard });
});

router.patch("/cards/:id", (req: Request, res: Response) => {
  const idx = cards.findIndex((c) => c.id === req.params["id"]);
  if (idx === -1) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const updates = req.body as Partial<CardRecord>;
  cards[idx] = { ...cards[idx], ...updates, updatedAt: new Date().toISOString() };
  res.json({ card: cards[idx] });
});

router.delete("/cards/:id", (req: Request, res: Response) => {
  const idx = cards.findIndex((c) => c.id === req.params["id"]);
  if (idx === -1) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const removed = cards.splice(idx, 1)[0];
  res.json({ card: removed });
});

router.post("/cards/:id/freeze", (req: Request, res: Response) => {
  const idx = cards.findIndex((c) => c.id === req.params["id"]);
  if (idx === -1) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  cards[idx] = { ...cards[idx], frozen: true, updatedAt: new Date().toISOString() };
  res.json({ card: cards[idx] });
});

router.post("/cards/:id/unfreeze", (req: Request, res: Response) => {
  const idx = cards.findIndex((c) => c.id === req.params["id"]);
  if (idx === -1) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  cards[idx] = { ...cards[idx], frozen: false, updatedAt: new Date().toISOString() };
  res.json({ card: cards[idx] });
});

export default router;
