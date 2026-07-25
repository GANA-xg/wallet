import { z } from "zod";

export const spendingBreakdownQuerySchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).optional().default("month"),
  custom_from: z.string().optional(),
  custom_to: z.string().optional(),
});

export const dailySpendingQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM format").optional(),
});

export const statementQuerySchema = z.object({
  from: z.string().min(1, "from is required"),
  to: z.string().min(1, "to is required"),
  format: z.enum(["json", "csv"]).optional().default("json"),
  type: z.enum(["all", "credit", "debit"]).optional().default("all"),
});

export type SpendingBreakdownQueryInput = z.infer<typeof spendingBreakdownQuerySchema>;
export type DailySpendingQueryInput = z.infer<typeof dailySpendingQuerySchema>;
export type StatementQueryInput = z.infer<typeof statementQuerySchema>;
