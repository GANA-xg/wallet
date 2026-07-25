import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  otp: z.string().min(1, "OTP is required"),
  device_fingerprint: z.string().min(1, "device_fingerprint is required"),
  push_token: z.string().optional(),
});

export const registerSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  otp: z.string().min(1, "OTP is required"),
  name: z.string().min(1, "Name is required"),
  device_fingerprint: z.string().min(1, "device_fingerprint is required"),
  push_token: z.string().optional(),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
});

export const registerDeviceSchema = z.object({
  device_name: z.string().optional(),
  device_fingerprint: z.string().min(1, "device_fingerprint is required"),
  push_token: z.string().optional(),
});

export const revokeSessionSchema = z.object({
  session_id: z.string().uuid("Invalid session ID").min(1, "session_id is required"),
});

export const deviceIdParamSchema = z.object({
  id: z.string().uuid("Invalid device ID"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;