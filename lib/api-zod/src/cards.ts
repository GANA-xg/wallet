import { z } from "zod";

const cardNetworkEnum = z.enum(["visa", "mastercard", "rupay", "amex", "discover", "unknown"]);

export const createCardSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  cardNetwork: cardNetworkEnum,
  issuer: z.string().nullable().optional(),
  lastFour: z.string().length(4, "lastFour must be exactly 4 characters"),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2020).max(2040),
  nickname: z.string().optional(),
  theme: z
    .object({
      gradientColors: z.array(z.string()),
    })
    .optional(),
  frozen: z.boolean().optional(),
  balance: z.number().int().min(0).optional(),
  createdAt: z.string().optional(),
});

export const updateCardSchema = z.object({
  userId: z.string().optional(),
  cardNetwork: cardNetworkEnum.optional(),
  issuer: z.string().nullable().optional(),
  lastFour: z.string().length(4).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2020).max(2040).optional(),
  nickname: z.string().optional(),
  theme: z
    .object({
      gradientColors: z.array(z.string()),
    })
    .optional(),
  frozen: z.boolean().optional(),
  balance: z.number().int().min(0).optional(),
});

export const cardIdParamSchema = z.object({
  id: z.string().min(1, "Card ID is required"),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
