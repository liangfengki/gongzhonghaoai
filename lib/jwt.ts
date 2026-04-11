import { SignJWT, jwtVerify } from 'jose';

const getSecret = () => {
  const secretString = process.env.JWT_SECRET || '01agent-jwt-secret-key-2024-muka-ai-very-long-random-string-fallback';
  return new TextEncoder().encode(secretString);
};

export interface JWTPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export async function createJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
