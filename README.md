# موكب أمير المؤمنين (ع) — دليل تعليمات الموكب

Committees work-manual website for **موكب أمير المؤمنين (ع)** (est. ١٣٨٤هـ / ١٩٦٤م, serving Arbaeen pilgrims). The site presents the group's work manual organized by **لجان (committees)**:

- **Public site** (`/`): landing page listing public committees → each committee's detail page with rich content (text, lists, tables, images).
- **Private area** (`/private`): the same structure, login-gated, showing private committees as well.
- **Admin CMS** (`/admin`): committees CRUD with a rich-text editor that accepts **paste directly from Microsoft Word** (headings, bold, bullet/numbered lists, **tables**, and image upload), plus user-account management.

The whole site is Arabic, RTL. Built from the design handoff in `_site_import/mawkab_design_handoff/` (kept for reference).

## Stack
- Next.js 14 (App Router), JavaScript
- SQLite via `better-sqlite3` (file at `data/mawkab.sqlite`, gitignored)
- Auth: username/password, bcrypt-hashed, session via httpOnly cookie holding a signed JWT (`jose`)
- Rich-text editor: **CKEditor 5** (open-source GPL build) with PasteFromOffice + Table + Image upload
- Server-side HTML sanitization (`sanitize-html`) — pasted Word markup is stripped to clean semantic HTML and styled by the site's own tokens
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

**Change this password immediately** after first login (Admin → المستخدمون → كلمة المرور), and create individual accounts for other authorized users (role `member` for private-area access, `admin` for CMS access). The database starts with **no committees** — the owner creates each لجنة and authors its content through the admin editor.

## Design tokens
Defined in `app/globals.css`:
```
--mawkab-yellow #FEF33E   --mawkab-red #D70C00   --mawkab-green #157201
--mawkab-paper  #FAF7EC   --mawkab-ink #201C10
--mawkab-red-dark #A80900 --mawkab-green-dark #0E4F01 --mawkab-yellow-soft #FFFBD6
--mawkab-border #E4DEC8   --mawkab-muted #8A8163
```
Never recolor the logo (`public/logo.png`); keep clear space ≥ ¼ of its diameter; minimum 48px digital.

## Content model
```
Committee { id, name, slug, sort, visibility: 'public'|'private'|'both', content_html, updated_at }
User      { id, name, username, password_hash, role: 'admin'|'member', created_at }
```
- `public` committees appear on the public site; `private` only in the login-gated area; `both` in both.
- Slugs are generated from the name (Arabic-safe) and used in the URL (`/c/<slug>`, `/private/c/<slug>`).

## Authoring content (paste from Word)
In the committee editor, paste directly from a Word document. CKEditor's PasteFromOffice keeps headings, bold, bullet/numbered lists, and tables. On save, the HTML is sanitized server-side: only semantic tags are kept (`h2–h4`, `p`, `strong/em`, lists, tables, `img`, `a`), all inline Word styling and scripts are stripped, and images are restricted to uploads served from this site. The clean HTML is then styled by the design tokens on render.

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
- No committee drag-reordering UI yet — ordering is via the numeric «الترتيب» field.
- No self-service password reset — an admin resets passwords from the users page.
