import { z } from "zod";

const recurringIntervalEnum = z.enum(["monthly", "weekly", "yearly"]);

export const createReservedSchema = z.object({
  label: z.string().min(1, "label is required"),
  amount_paise: z.number().int().positive("amount_paise must be positive"),
  category: z.string().min(1, "category is required"),
  due_date: z.string().min(1, "due_date is required"),
  is_recurring: z.boolean(),
  interval: recurringIntervalEnum.optional(),
}).refine(
  (data) => !data.is_recurring || data.interval !== undefined,
  { message: "interval is required when is_recurring is true", path: ["interval"] },
);

export const reservedIdParamSchema = z.object({
  id: z.string().uuid("Invalid reserved amount ID"),
});

export type CreateReservedInput = z.infer<typeof createReservedSchema>;
