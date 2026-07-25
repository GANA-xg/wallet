import { z } from "zod";

const ticketTypeEnum = z.enum(["flight", "train", "bus", "movie", "event"]);
const ticketStatusEnum = z.enum(["upcoming", "completed", "cancelled"]);

export const createTicketSchema = z.object({
  type: ticketTypeEnum,
  pnr: z.string().min(1).optional(),
  title: z.string().min(1, "title is required"),
  origin: z.string().optional(),
  destination: z.string().optional(),
  travel_date: z.string().min(1, "travel_date is required"),
  seat: z.string().optional(),
  qr_payload: z.string().min(1, "qr_payload is required"),
  status: ticketStatusEnum.optional(),
});

export const updateTicketStatusSchema = z.object({
  status: ticketStatusEnum,
});

export const ticketIdParamSchema = z.object({
  id: z.string().uuid("Invalid ticket ID"),
});

export const ticketsQuerySchema = z.object({
  status: ticketStatusEnum.optional(),
  type: ticketTypeEnum.optional(),
});

export const pnrParamSchema = z.object({
  pnr: z.string().min(1, "PNR is required"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
