# لجنة النساء — متابعة المهام

Production task tracker for the women's committee (لجنة النساء) of حسينية الحاج عبدالله الحسين الأمير — كيفان, used during the nights of Muharram. Two roles: supervisor (خادمة الحسين) and member/servant (خادمة).

Rebuilt from the design handoff prototype in `_site_import/task-tracker/design_handoff_task_tracker/` (kept for reference) into a real Next.js + SQLite app.

## Stack
- Next.js 14 (App Router), JavaScript
- SQLite via `better-sqlite3` (file at `data/kifan.sqlite`, gitignored)
- Auth: username/password, bcrypt-hashed, session via httpOnly cookie containing a signed JWT (`jose`)
- Design tokens and component CSS ported verbatim from the prototype's `app.css`
- Self-hosted Vazirmatn fonts (`public/fonts/`)

## Running locally
```
npm install
npm run seed   # creates data/kifan.sqlite and seeds committees/users/tasks/comments
npm run dev
```
Visit http://localhost:3000.

### Seeded test credentials (password `1234` for all)
| username | role | committee |
|---|---|---|
| fatima | supervisor | — |
| zahra | servant | الاستقبال |
| maryam | servant | الضيافة |
| batool | servant | المجلس |
| ruqaya | servant | التنظيم |
| sara | servant | الإعلام |
| zainab | servant (pending — for testing activation) | — |

## Environment variables
- `JWT_SECRET` — secret used to sign session JWTs. Set a long random value in production (a dev default is used if unset — do not rely on it in production).

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run seed` — (re)seed the SQLite database (wipes and recreates seed rows)

## Deploying
This is a light, single-organization deployment — no need for heavy infra:
- Recommended: a small VPS (or a platform like Railway / Render / Fly.io with a persistent volume) running `npm run build && npm run start` under PM2, with the `data/` directory on persistent disk.
- Avoid Vercel for this app unless paired with a remote DB like Turso — Vercel's serverless filesystem is not persistent, so the SQLite file would not survive between deployments/requests reliably.
- Back up `data/kifan.sqlite` periodically (it's the entire database).
- Set `JWT_SECRET` to a strong random value and run behind HTTPS so the session cookie's `secure` flag is meaningful.

## Known gaps / TODOs
- No realtime push; the supervisor dashboard fetches fresh data on tab loads and after actions, but does not poll automatically (README's "nice-to-have" SSE/polling not implemented).
- Single fixed "active night" (night 3) — there's no UI yet for the supervisor to switch which night's task list is being managed; `app/api/nights` lists all 10 nights but the UI always targets the active one.
- No automated tests.
