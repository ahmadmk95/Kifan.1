import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import db from './db';

const COOKIE_NAME = 'mwk_session';

// Session signing key: JWT_SECRET when the server sets one, otherwise a random
// key generated once and kept in the database — never a guessable default,
// since sessions now guard editing of a publicly visible plan.
let secretKey = null;
function secret() {
  if (secretKey) return secretKey;
  let value = process.env.JWT_SECRET;
  if (!value) {
    const get = () => db.prepare("SELECT value FROM app_meta WHERE key = 'jwt_secret'").get()?.value;
    value = get();
    if (!value) {
      db.prepare("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('jwt_secret', ?)").run(crypto.randomBytes(48).toString('hex'));
      value = get();
    }
  }
  secretKey = new TextEncoder().encode(value);
  return secretKey;
}

// Sign-in lockout: after MAX_FAILS wrong passwords in a row the account is
// locked for LOCK_MINUTES (an admin can unlock it sooner from المستخدمون).
export const MAX_FAILS = 5;
export const LOCK_MINUTES = 15;

export function lockedMinutes(user) {
  if (!user?.locked_until) return 0;
  const ms = new Date(user.locked_until).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

// Check a password against the account, counting failures toward the lockout.
// Returns { ok } or { ok: false, locked: minutes, left: attempts remaining }.
export function checkPassword(user, password) {
  const locked = lockedMinutes(user);
  if (locked) return { ok: false, locked };
  const pw = String(password ?? '');
  // Accept the password exactly as typed, or with stray whitespace from
  // autocomplete removed — the exact match is tried first.
  const ok = bcrypt.compareSync(pw, user.password_hash) || (pw.trim() !== pw && bcrypt.compareSync(pw.trim(), user.password_hash));
  if (ok) {
    if (user.failed_logins || user.locked_until) {
      db.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').run(user.id);
    }
    return { ok: true };
  }
  const fails = (user.failed_logins || 0) + 1;
  if (fails >= MAX_FAILS) {
    const until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
    db.prepare('UPDATE users SET failed_logins = 0, locked_until = ? WHERE id = ?').run(until, user.id);
    return { ok: false, locked: LOCK_MINUTES, left: 0 };
  }
  db.prepare('UPDATE users SET failed_logins = ? WHERE id = ?').run(fails, user.id);
  return { ok: false, locked: 0, left: MAX_FAILS - fails };
}

export function lockMessage(minutes) {
  return `تم قفل الحساب مؤقتاً بعد ${MAX_FAILS} محاولات خاطئة. حاول بعد ${minutes} دقيقة، أو اطلب من المدير فتحه.`;
}

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
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
    const { payload } = await jwtVerify(token, secret());
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) || null;
  } catch {
    return null;
  }
}

// Authority model:
//   admin                       → full access (everything)
//   member + access=viewer      → supervisor: sees everything, edits nothing,
//                                 may only approve/reject new users
//   member + access=fridge      → لجنة التغذية: الثلاجة، دار الجيل، الطلبات، الطبخ
//
// The اللجان and المحاسبة sections were removed. Members still stored with
// access=committees / access=accounting have no section left: they land on
// /no-access until an admin gives them a current authority.
export function isAdmin(user) {
  return !!user && user.role === 'admin' && user.status !== 'pending';
}
export function isViewer(user) {
  return !!user && user.status !== 'pending' && user.role !== 'admin' && user.access === 'viewer';
}
// Read access to the admin area (hub, users list).
export function canViewAdmin(user) {
  return isAdmin(user) || isViewer(user);
}
// Write access to the central fridge (ثلاجة) inventory.
export function canFridge(user) {
  return !!user && user.status !== 'pending' && (user.role === 'admin' || user.access === 'fridge');
}
// May mark orders as prepared (تم التجهيز): admins, or التغذية members granted it.
export function canPrepareOrders(user) {
  return canFridge(user) && (user.role === 'admin' || !!user.can_prepare);
}
// Read access to the fridge (includes the supervisor).
export function canFridgeView(user) {
  return canFridge(user) || isViewer(user);
}

// Viewing the Arbaeen plan (/plan): any signed-in, approved user.
export function canViewPlan(user) {
  return !!user && user.status !== 'pending';
}
// May edit the Arbaeen feeding & purchasing plan (/plan).
export function canEditPlan(user) {
  return !!user && user.status !== 'pending' && (user.role === 'admin' || !!user.plan_edit);
}

// Where a user should land / be sent when they hit an area they can't use.
// A signed-in user with no section left goes to /no-access — never back to
// /login, which would auto-sign them in again and loop.
export function landingFor(user) {
  if (!user) return '/login';
  if (canViewAdmin(user)) return '/admin';
  if (canFridge(user)) return '/admin/fridge';
  if (canViewPlan(user)) return '/plan';
  return '/no-access';
}

// Map the admin-facing authority choice to (role, access). Only the current
// authorities are accepted; anything else falls back to the fridge section.
export function authorityToRole(authority) {
  if (authority === 'admin') return { role: 'admin', access: null };
  if (authority === 'viewer') return { role: 'member', access: 'viewer' };
  return { role: 'member', access: 'fridge' };
}
// The user's authority for the admin UI. Legacy values are reported as-is so
// the users page can flag accounts that still need a new authority.
export function authorityOf(user) {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.access === 'viewer') return 'viewer';
  if (user.access === 'fridge') return 'fridge';
  return user.access || 'none'; // 'committees' / 'accounting' = removed sections
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, username: u.username, role: u.role, access: u.access, status: u.status, can_prepare: u.can_prepare ? 1 : 0, plan_edit: u.plan_edit ? 1 : 0 };
}
