import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/auth";

export interface AuthUser {
  userId: string;
  sessionId: string;
  deviceId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }

  req.user = {
    userId: payload.sub,
    sessionId: payload.sid,
    deviceId: payload.did,
  };

  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (payload) {
    req.user = {
      userId: payload.sub,
      sessionId: payload.sid,
      deviceId: payload.did,
    };
  }

  next();
}
