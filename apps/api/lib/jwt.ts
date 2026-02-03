import { jwtVerify, SignJWT } from 'jose';

function getSecret() {
  const raw = process.env.BETTER_AUTH_SECRET || process.env.COOKIE_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error('Missing BETTER_AUTH_SECRET (or COOKIE_SECRET) for JWT signing');
  }
  return new TextEncoder().encode(raw);
}

export async function issueAccessToken(input: { userId: string; expiresInSeconds?: number }) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.expiresInSeconds ?? 60 * 60;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .setSubject(input.userId)
    .setIssuer(process.env.BETTER_AUTH_URL || 'http://localhost:3001')
    .setAudience('mianshihou-api')
    .sign(getSecret());

  return { token, expiresAt: new Date((now + ttl) * 1000) };
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
      audience: 'mianshihou-api',
    });
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    return userId ? { userId } : null;
  } catch {
    return null;
  }
}
