# موكب أمير المؤمنين (ع) — دليل تعليمات الموكب

Internal website for **موكب أمير المؤمنين (ع)** (est. ١٣٨٤هـ / ١٩٦٤م, serving Arbaeen pilgrims):

- **Public site** (`/`): a logo splash with links to sign in or register.
- **لجنة التغذية** (`/admin/fridge`, `/admin/dargeel`, `/admin/orders`, `/admin/recipes`): inventory, orders and cooking recipes.
- **Admin** (`/admin`): menu of the sections above plus user-account management.

The whole site is Arabic, RTL. Built from the design handoff in `_site_import/mawkab_design_handoff/` (kept for reference).

## Stack
- Next.js 14 (App Router), JavaScript
- SQLite via `better-sqlite3` (file at `data/mawkab.sqlite`, gitignored)
- Auth: username/password, bcrypt-hashed, session via httpOnly cookie holding a signed JWT (`jose`)
- Fonts: Amiri (headings) + IBM Plex Sans Arabic (body), self-served via `next/font/google`
- Uploaded images stored under `data/uploads/` and served via `/api/uploads/<name>` (gitignored)

## Running locally
```
npm install
npm run dev
```
Visit http://localhost:3000. The database and a single admin account are created automatically on first run — no seed step.

### Seeded admin account
On an empty database the app creates one admin:

| username | password | role |
|---|---|---|
| `admin` | `Mawkab1384` | admin |

**Change this password immediately** after first login (Admin → المستخدمون → كلمة المرور), and create individual accounts for other authorized users (`لجنة التغذية` for the fridge sections, `مشرف` for read-only supervision, `مدير كامل` for full access).

## Design tokens
Defined in `app/globals.css`:
```
--mawkab-yellow #FEF33E   --mawkab-red #D70C00   --mawkab-green #157201
--mawkab-paper  #FAF7EC   --mawkab-ink #201C10
--mawkab-red-dark #A80900 --mawkab-green-dark #0E4F01 --mawkab-yellow-soft #FFFBD6
--mawkab-border #E4DEC8   --mawkab-muted #8A8163
```
Never recolor the logo (`public/logo.png`); keep clear space ≥ ¼ of its diameter; minimum 48px digital.

## Environment variables
- `JWT_SECRET` — secret used to sign session JWTs. Set a long random value in production (a dev default is used if unset — do not rely on it in production).
- `DATA_DIR` — optional; directory for `mawkab.sqlite` and `uploads/` (defaults to `./data`).

## Deploying
Light, single-organization deployment:
- Recommended: a small VPS (or Railway / Render / Fly.io with a persistent volume) running `npm run build && npm run start` under PM2, with the `data/` directory on persistent disk.
- Avoid Vercel unless paired with a remote DB (e.g. Turso) and object storage — its serverless filesystem is not persistent, so neither the SQLite file nor `data/uploads/` would survive between deployments.
- Back up `data/mawkab.sqlite` **and** `data/uploads/` periodically.
- Set `JWT_SECRET` to a strong random value and run behind HTTPS so the session cookie's `secure` flag is meaningful.

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production build

## Known gaps / TODOs
- No automated tests.
- No self-service password reset — an admin resets passwords from the users page.
