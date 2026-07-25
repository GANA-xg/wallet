import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createTicketSchema,
  updateTicketStatusSchema,
  ticketIdParamSchema,
  ticketsQuerySchema,
  pnrParamSchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

// GET /tickets
router.get(
  "/tickets",
  validate({ schema: ticketsQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { status, type } = req.query as any;

      const conditions = [
        eq(schema.tickets.userId, userId),
        isNull(schema.tickets.deletedAt),
      ];

      if (status) {
        conditions.push(eq(schema.tickets.status, status));
      }
      if (type) {
        conditions.push(eq(schema.tickets.type, type));
      }

      const tickets = await db
        .select()
        .from(schema.tickets)
        .where(and(...conditions))
        .orderBy(desc(schema.tickets.travelDate));

      res.json({ tickets });
    } catch (error) {
      logger.error({ err: error }, "Failed to list tickets");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /tickets/:id
router.get(
  "/tickets/:id",
  validate({ schema: ticketIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const ticketId = req.params.id as string;

      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(schema.tickets.id, ticketId),
          eq(schema.tickets.userId, userId),
          isNull(schema.tickets.deletedAt),
        ),
      });

      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      res.json({ ticket });
    } catch (error) {
      logger.error({ err: error }, "Failed to get ticket");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /tickets
router.post(
  "/tickets",
  validate({ schema: createTicketSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { type, pnr, title, origin, destination, travel_date, seat, qr_payload, status } = req.body;

      const now = new Date();

      const [ticket] = await db
        .insert(schema.tickets)
        .values({
          userId,
          type,
          pnr: pnr ?? null,
          title,
          origin: origin ?? null,
          destination: destination ?? null,
          travelDate: new Date(travel_date),
          seat: seat ?? null,
          qrPayload: qr_payload,
          status: status ?? "upcoming",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ ticket });
    } catch (error) {
      logger.error({ err: error }, "Failed to create ticket");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// PATCH /tickets/:id/status
router.patch(
  "/tickets/:id/status",
  validate({ schema: ticketIdParamSchema, source: "params" }, { schema: updateTicketStatusSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const ticketId = req.params.id as string;
      const { status } = req.body;

      const existing = await db.query.tickets.findFirst({
        where: and(
          eq(schema.tickets.id, ticketId),
          eq(schema.tickets.userId, userId),
          isNull(schema.tickets.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      const [updated] = await db
        .update(schema.tickets)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.tickets.id, ticketId))
        .returning();

      res.json({ ticket: updated });
    } catch (error) {
      logger.error({ err: error }, "Failed to update ticket status");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /tickets/:id
router.delete(
  "/tickets/:id",
  validate({ schema: ticketIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const ticketId = req.params.id as string;

      const existing = await db.query.tickets.findFirst({
        where: and(
          eq(schema.tickets.id, ticketId),
          eq(schema.tickets.userId, userId),
          isNull(schema.tickets.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      await db
        .update(schema.tickets)
        .set({ deletedAt: new Date() })
        .where(eq(schema.tickets.id, ticketId));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete ticket");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /tickets/pnr/:pnr
router.get(
  "/tickets/pnr/:pnr",
  validate({ schema: pnrParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const pnr = req.params.pnr as string;

      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(schema.tickets.userId, userId),
          eq(schema.tickets.pnr, pnr),
          isNull(schema.tickets.deletedAt),
        ),
      });

      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      res.json({ ticket });
    } catch (error) {
      logger.error({ err: error }, "Failed to lookup ticket by PNR");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
