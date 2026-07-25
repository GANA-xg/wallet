import { z } from "zod";

const transactionInputSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(["credit", "debit"]),
  category: z.string(),
  description: z.string(),
  date: z.string(),
  status: z.string(),
  merchant: z.string(),
});

const budgetInputSchema = z.object({
  id: z.string(),
  category: z.string(),
  limit: z.number(),
  spent: z.number(),
});

const reservedAmountInputSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
  category: z.string(),
  dueDate: z.string().optional(),
  recurring: z.boolean(),
});

export const insightsRequestSchema = z.object({
  transactions: z.array(transactionInputSchema),
  budgets: z.array(budgetInputSchema).optional().default([]),
  reservedAmounts: z.array(reservedAmountInputSchema).optional().default([]),
  balance: z.number({ required_error: "balance is required and must be a number" }),
  upiLite: z.number().optional(),
  month: z.string().optional(),
  year: z.number().int().optional(),
});

export const forecastQuerySchema = z.object({
  days: z.coerce.number().refine((n) => [7, 30, 60].includes(n), {
    message: "days must be 7, 30, or 60",
  }).default(30),
});

export const merchantParamSchema = z.object({
  merchantName: z.string().min(1).max(100),
});

export type InsightsRequestInput = z.infer<typeof insightsRequestSchema>;
export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;
