import { z } from "zod";

export const createBudgetSchema = z.object({
  category: z.string().min(1, "category is required"),
  limit_paise: z.number().int().positive("limit_paise must be positive"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM format").optional(),
});

export const updateBudgetSchema = z.object({
  limit_paise: z.number().int().positive("limit_paise must be positive"),
});

export const budgetIdParamSchema = z.object({
  id: z.string().uuid("Invalid budget ID"),
});

export const budgetsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM format").optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
