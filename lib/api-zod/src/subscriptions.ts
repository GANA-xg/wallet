import { z } from "zod";

const subscriptionStatusEnum = z.enum(["active", "cancelled_by_user", "ignored", "all"]);
const subscriptionCadenceEnum = z.enum(["monthly", "yearly"]);
const updateStatusEnum = z.enum(["active", "cancelled_by_user", "ignored"]);

export const subscriptionsQuerySchema = z.object({
  status: subscriptionStatusEnum.optional().default("active"),
  cadence: subscriptionCadenceEnum.optional(),
});

export const updateSubscriptionStatusSchema = z.object({
  status: updateStatusEnum,
});

export const subscriptionIdParamSchema = z.object({
  id: z.string().uuid("Invalid subscription ID"),
});

export type SubscriptionsQueryInput = z.infer<typeof subscriptionsQuerySchema>;
export type UpdateSubscriptionStatusInput = z.infer<typeof updateSubscriptionStatusSchema>;
