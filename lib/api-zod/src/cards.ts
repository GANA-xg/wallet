import { z } from "zod";

const cardNetworkEnum = z.enum(["visa", "mastercard", "rupay"]);

export const createCardSchema = z.object({
  encrypted_number: z.string().min(1, "encrypted_number is required"),
  last4: z.string().length(4, "last4 must be exactly 4 characters"),
  holder_name: z.string().min(1, "holder_name is required"),
  expiry_month: z.number().int().min(1).max(12),
  expiry_year: z.number().int().min(2020).max(2040),
  network: cardNetworkEnum,
  bank_name: z.string().optional(),
  gradient_colors: z.any().optional(),
  is_frozen: z.boolean().optional(),
});

export const updateCardSchema = z.object({
  holder_name: z.string().optional(),
  expiry_month: z.number().int().min(1).max(12).optional(),
  expiry_year: z.number().int().min(2020).max(2040).optional(),
  bank_name: z.string().optional(),
  gradient_colors: z.any().optional(),
  is_frozen: z.boolean().optional(),
});

export const cardIdParamSchema = z.object({
  id: z.string().uuid("Invalid card ID"),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
