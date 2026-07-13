import crypto from "node:crypto";

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production. " +
      "Set it to a long, random string (openssl rand -hex 32). " +
      "This secret is used to sign and verify access tokens.",
    );
  }
  // Safe dev fallback — never used in production
  return "dev-jwt-secret-do-not-use-in-prod";
})();
const ACCESS_TOKEN_TTL = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface JwtPayload {
  sub: string;
  sid: string;
  did: string | null;
  iat: number;
  exp: number;
}

export function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64url");
}

export function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function signJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL / 1000,
  };

  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(fullPayload)));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getAccessTokenTtl(): number {
  return ACCESS_TOKEN_TTL;
}

export function getRefreshTokenTtl(): number {
  return REFRESH_TOKEN_TTL;
}

export function getSessionTtl(): number {
  return SESSION_TTL;
}
