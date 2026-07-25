import { z } from "zod";

const rewardTypeEnum = z.enum(["points", "coupon", "cashback", "offer"]);

export const createRewardSchema = z.object({
  type: rewardTypeEnum,
  brand: z.string().min(1, "brand is required"),
  value: z.record(z.unknown()).refine((v) => v !== null && v !== undefined, "value must be a non-null object"),
  code: z.string().optional(),
  expires_at: z.string().optional(),
});

export const rewardIdParamSchema = z.object({
  id: z.string().uuid("Invalid reward ID"),
});

export const rewardsQuerySchema = z.object({
  type: rewardTypeEnum.optional(),
  active_only: z.enum(["true", "false"]).optional(),
});

export type CreateRewardInput = z.infer<typeof createRewardSchema>;
