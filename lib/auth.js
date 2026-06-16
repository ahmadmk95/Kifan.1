import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

const COOKIE_NAME = 'kfn_session';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user || user.status !== 'active') return null;
    return user;
  } catch {
    return null;
  }
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    title: u.title,
    committee_id: u.committee_id,
    status: u.status,
    initials: u.initials,
  };
}
