import { z } from "zod";

const notificationTypeEnum = z.enum(["payment", "security", "reward", "info"]);

export const notificationIdParamSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

export const notificationsQuerySchema = z.object({
  unread_only: z.enum(["true", "false"]).optional(),
  type: notificationTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>;
