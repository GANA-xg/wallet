import { z } from "zod";

const transactionSourceEnum = z.enum(["upi_app", "card", "upi_lite", "nfc"]);

export const topupSchema = z.object({
  amount_paise: z.number().int().positive("amount_paise must be positive").max(100000_00, "Maximum topup is ₹1,00,000"),
  source: transactionSourceEnum,
});

export const transferSchema = z.object({
  to_upi_id: z.string().min(1, "to_upi_id is required"),
  amount_paise: z.number().int().positive("amount_paise must be positive"),
  note: z.string().optional(),
  idempotency_key: z.string().min(1, "idempotency_key is required"),
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export type TopupInput = z.infer<typeof topupSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type TransactionsQueryInput = z.infer<typeof transactionsQuerySchema>;
