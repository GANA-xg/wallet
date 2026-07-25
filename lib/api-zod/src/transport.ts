import { z } from "zod";

const transportPassTypeEnum = z.enum(["metro", "bus", "monthly", "student"]);

export const createPassSchema = z.object({
  type: transportPassTypeEnum,
  card_number: z.string().min(1, "card_number is required"),
  balance_paise: z.number().int().min(0, "balance_paise must be >= 0"),
  city: z.string().min(1, "city is required"),
  expires_at: z.string().min(1, "expires_at is required"),
});

export const topupPassSchema = z.object({
  amount_paise: z.number().int().positive("amount_paise must be positive").max(50000_00, "Maximum topup is ₹50,000"),
});

export const passIdParamSchema = z.object({
  id: z.string().uuid("Invalid pass ID"),
});

export type CreatePassInput = z.infer<typeof createPassSchema>;
export type TopupPassInput = z.infer<typeof topupPassSchema>;
