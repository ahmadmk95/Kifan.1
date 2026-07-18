import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

const COOKIE_NAME = 'mwk_session';
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
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) || null;
  } catch {
    return null;
  }
}

// Authority model:
//   admin                       → full access (everything)
//   member + access=committees  → view the لجان (private committee area) only
//   member + access=accounting  → the accounting section only
export function isAdmin(user) {
  return !!user && user.role === 'admin' && user.status !== 'pending';
}
export function canCommittees(user) {
  return !!user && user.status !== 'pending' && (user.role === 'admin' || user.access === 'committees');
}
export function canAccounting(user) {
  return !!user && user.status !== 'pending' && (user.role === 'admin' || user.access === 'accounting');
}

// Where a user should land / be sent when they hit an area they can't use.
export function landingFor(user) {
  if (isAdmin(user)) return '/admin';
  if (canAccounting(user)) return '/admin/accounting';
  if (canCommittees(user)) return '/private';
  return '/login';
}

// Map the admin-facing authority choice to (role, access).
export function authorityToRole(authority) {
  if (authority === 'admin') return { role: 'admin', access: null };
  if (authority === 'accounting') return { role: 'member', access: 'accounting' };
  return { role: 'member', access: 'committees' };
}
export function authorityOf(user) {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  return user.access === 'accounting' ? 'accounting' : 'committees';
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, username: u.username, role: u.role, access: u.access, status: u.status };
}
