# Handoff: لجنة النساء — Daily Task Tracker (Husseiniya Women's Committee)

## Overview
A daily task-tracking web app for the **women's committee (لجنة النساء)** of **حسينية الحاج عبدالله الحسين الأمير — كيفان (Kaifan, Kuwait)**, used during the nights of **Muharram (محرم ١٤٤٨ هـ / 2026)**.

Two roles:
- **خادمة الحسين (Supervisor)** — manages committees (لجان), reviews & activates registration requests, assigns each member to a committee, creates the daily task list, and monitors progress + comments across the whole committee.
- **خادمة (Servant / member)** — logs in, sees only **her own** checklist for the night, marks tasks done, and leaves comments/notes on tasks.

Account lifecycle: a new member **requests registration** → the supervisor **activates** the account and **assigns a committee** → the member can then log in and see assigned tasks.

The entire UI is **Arabic, right-to-left (RTL)**, mobile-first (phone-only — no desktop layout), with Eastern-Arabic numerals (٠١٢٣…).

---

## About the Design Files
The files in this bundle are **design references built in HTML/React (via in-browser Babel) with `localStorage` as a fake datastore.** They are prototypes that demonstrate the intended **look, copy, and behavior** — **not** production code to ship as-is.

The task is to **recreate these designs in a real, production codebase**: a proper frontend framework + a real backend with a database and authentication. The prototype has **no server, no real auth, and no shared data** (each browser has its own `localStorage`), so multiple users on different devices cannot currently see each other's data — **building that backend is the core of "finishing the website."**

Keep the visual design **pixel-faithful** (see Design Tokens + Screens) while replacing the data/auth layer with real infrastructure.

## Fidelity
**High-fidelity.** Final colors, typography (Vazirmatn), spacing, radii, shadows, copy, and interactions are all defined here and in `app.css`. Recreate the UI faithfully. The only things intentionally faked are auth and persistence.

---

## Recommended Production Architecture
The prototype is plain React + CSS. A clean target stack (adjust to team preference):

- **Frontend:** Next.js (App Router) or Vite + React, RTL-first. Keep `app.css` tokens nearly verbatim (they're framework-agnostic CSS custom properties). Self-host Vazirmatn (fonts included in `assets/fonts/`).
- **Backend:** Next.js API routes / Node (Express/Fastify) — REST is sufficient.
- **Database:** PostgreSQL (or SQLite for a small single-Husseiniya deployment).
- **Auth:** username + password. **Hash passwords with bcrypt/argon2** (prototype stores plaintext — DO NOT ship that). Session via httpOnly cookie or JWT. Add a "pending" account state gated behind supervisor activation.
- **Realtime (optional, nice-to-have):** the supervisor dashboard benefits from live updates as members check off tasks — poll every ~15s or use SSE/WebSocket.

### Suggested data model
```
User
  id            uuid pk
  name          text                 -- "زهراء الحسين"
  username      text unique          -- login handle, e.g. "zahra"
  password_hash text
  role          enum('supervisor','servant')
  title         text                 -- "خادمة الاستقبال" (derived: "خادمة " + committee.name)
  committee_id  uuid fk -> Committee (nullable)
  status        enum('pending','active')   -- new sign-ups start 'pending'
  created_at    timestamptz

Committee
  id      uuid pk
  name    text                 -- "الاستقبال"
  color   text                 -- "#BE9A3E"  (accent)
  soft    text                 -- "#F4EBD2"  (tint background for tags)
  sort    int

Night                          -- a Muharram night (the unit tasks belong to)
  id      uuid pk
  number  int                  -- 1..10 (10 = عاشوراء / Ashura)
  hijri   text                 -- "ليلة ٣ محرم ١٤٤٨ هـ"
  greg    text                 -- "الموافق ١٨ يونيو ٢٠٢٦"
  date    date

Task
  id            uuid pk
  night_id      uuid fk -> Night
  committee_id  uuid fk -> Committee
  assignee_id   uuid fk -> User
  title         text          -- "فتح الأبواب وتجهيز المدخل"
  time          text          -- "5:30 م"  (display string; could be a time column)
  place         text          -- "المدخل الرئيسي"
  note          text nullable -- highlighted note shown on the card
  done          bool default false
  created_at    timestamptz

Comment
  id        uuid pk
  task_id   uuid fk -> Task
  author_id uuid fk -> User
  text      text
  created_at timestamptz       -- displayed as "5:50 م"
```
Note: in the prototype `done` and `comments` are keyed per task in a `meta` map; in production attach `done` and `comments` to the Task row (scoped to its night). Tasks are **per-night** — the supervisor builds the list for each night (the prototype shows a single active night, `ACTIVE_NIGHT = 3`).

### Suggested API
```
POST /api/auth/register      { name, username, password }      -> creates pending user
POST /api/auth/login         { username, password }            -> session (rejects if pending)
POST /api/auth/logout
GET  /api/me                                                   -> current user

GET  /api/nights             -> list; GET /api/nights/active

# member
GET  /api/my-tasks?night=ID                                    -> tasks where assignee = me
PATCH /api/tasks/:id/done    { done }                          -> member toggles own task
POST /api/tasks/:id/comments { text }

# supervisor only
GET  /api/overview?night=ID                                    -> per-member progress + totals
GET  /api/tasks?night=ID                                       -> all tasks (grouped by committee)
POST /api/tasks              { night, committee, assignee, title, time, place, note }
GET  /api/committees ; POST /api/committees { name, color, soft } ; DELETE /api/committees/:id
GET  /api/requests           -> users where status = pending
POST /api/requests/:id/activate { committee_id }               -> status=active, set committee + title
DELETE /api/requests/:id     -> reject
GET  /api/comments?night=ID  -> feed of all comments
```
**Authorization:** members may only read/update tasks where they are the assignee; all committee/task/request/management endpoints are supervisor-only. When a committee is deleted, its tasks are deleted and its members revert to `pending` with `committee_id = null` (mirrors prototype `removeCommittee`).

---

## Screens / Views
RTL throughout. All numerals rendered Eastern-Arabic. Container is a centered **single phone column, max-width 480px** (login card max-width 540px). A maroon top bar is full-bleed; its inner content is capped to 480px.

### 1. Login (تسجيل الدخول)
- **Purpose:** existing member/supervisor signs in.
- **Layout:** centered card. Maroon gradient header with circular logo, title `لجنة النساء — متابعة المهام`, subtitle `حسينية الحاج عبدالله الحسين الأمير · كيفان · محرم ١٤٤٨ هـ`. A dashed gold ornament strip sits at the header's bottom edge. Body: a dua line `۞ اللهم اجعلني عندك وجيهاً بالحسين ۞` (maroon text, gold ۞ glyphs), then a pill **segmented toggle** [تسجيل الدخول | طلب تسجيل], then the form.
- **Form fields:** اسم المستخدم (username, LTR input), كلمة المرور (password, LTR input). Submit button `دخول` (full-width, maroon). Below: a hint line.
- **Errors (inline, red `.auth-msg.err`):** wrong credentials → `اسم المستخدم أو كلمة المرور غير صحيحة`; pending account → `حسابكِ بانتظار التفعيل من خادمة الحسين`.

### 2. Register request (طلب تسجيل)
- Same card, toggle switched to طلب تسجيل. Adds **الاسم الكامل** field above username. Submit `إرسال الطلب`.
- On success: green `.auth-msg.ok` → `تم إرسال طلبكِ — بانتظار تفعيله من خادمة الحسين`; form clears. Duplicate username → red `اسم المستخدم محجوز، اختاري اسماً آخر`. Empty fields → `يرجى تعبئة جميع الحقول`.

### 3. Member dashboard (لوحة الخادمة)
- **Top bar:** logo + `لجنة النساء / حسينية الأمير · كيفان`, member avatar (initial), `خروج` (logout) button.
- **Date row:** card with `ليلة ٣ محرم ١٤٤٨ هـ` / `الموافق ١٨ يونيو ٢٠٢٦`; horizontally-scrolling **nights strip** (1..10, active = maroon, past = gold outline, night 10 shows ★ عاشوراء).
- **Greeting:** `السلام عليكِ، {firstName} 🤍` + `{title} — وفّقكِ الله في خدمة عزاء الحسين عليه السلام`.
- **Summary card:** circular **progress ring** (gold→crimson gradient, % in Eastern-Arabic), heading (`تقدّم مهامكِ هذه الليلة` or, when all done, `أتممتِ كل مهامكِ — أحسنتِ`), and a stats row: منجزة / متبقية / الإجمالي.
- **Task groups:** tasks grouped by committee. Each group has a header (color dot + committee name + `{done} / {total}`), then **task cards**.
- **Empty state:** dove 🕊️ + `لم تُسند إليكِ مهام بعد — ستظهر هنا فور إضافتها`.

### 4. Supervisor — Overview (نظرة عامة)
- Greeting `لوحة المتابعة — {firstName}` + `متابعة أداء اللجان لليلة الثالثة من محرم · {n} خادمات · {n} لجان`.
- **Tabs** (scrolling pill bar): نظرة عامة · المهام · اللجان · الطلبات (with red count badge if pending) · التعليقات.
- Overview: committee-wide progress ring + totals (منجزة / متبقية), then **member cards** (one per servant): avatar, name, title, big % on the side, a green progress bar, and `✓ {done} منجزة` / `{rem} متبقية`.

### 5. Supervisor — All tasks (المهام)
- All tasks grouped by committee (same card style as member, but each card also shows the assignee: `♦ {name}`). A full-width gold **إضافة مهمة** button opens the Add-Task modal. Empty → 📋 `لا مهام بعد — أضيفي مهمة جديدة`.

### 6. Supervisor — Committees (اللجان)
- Full-width gold **إضافة لجنة** button. List of **committee rows**: color swatch, name, `{n} خادمات · {n} مهام`, and a trash icon-button (confirms: `حذف لجنة «{name}»؟ ستُحذف مهامها وتُلغى إسناد خادماتها.`).

### 7. Supervisor — Requests (الطلبات)
- One **request card** per pending user: avatar, name, `@username` (LTR), a gold `بانتظار التفعيل` pill, a committee `<select>` (`اختاري اللجنة…`), a green **تفعيل وإسناد** button (disabled until a committee is chosen), and a **رفض** button (confirms `رفض طلب {name}؟`). Empty → ✅ `لا طلبات تسجيل معلّقة حالياً`.

### 8. Supervisor — Comments (التعليقات)
- A feed of all comments across tasks: avatar + author + `على مهمة: {task title}` + comment text + time. Empty → 💬 `لا توجد تعليقات حتى الآن`.

### 9. Add Task modal (إضافة مهمة يومية)
- Maroon header + ×. Fields: عنوان المهمة; اللجنة `<select>`; الخادمة `<select>` (filtered to members of the chosen committee — if none, shows red note `لا خادمات في هذه اللجنة بعد — فعّلي حساباً وأسنديه إليها`); الوقت; المكان; ملاحظة (optional). Footer: `إضافة المهمة` (disabled until title+time+place+assignee filled) + `إلغاء`.

### 10. Add Committee modal (إضافة لجنة جديدة)
- Fields: اسم اللجنة; **اللون المميّز** — a row of color swatches (palette below); selected swatch gets a dark ring. Footer: `إضافة اللجنة` (disabled until name) + `إلغاء`.

### Task card (shared component — exact spec)
- White card, 1px `--line` border, `--r-md` (14px) radius, `--shadow-sm`. Left: a **28×28 checkbox** (8px radius, 2px border; when done → green fill + white check). Body: title (15px/600), a meta row (clock + time, pin + place, optionally `♦ assignee`), and an optional **note chip** (gold-soft bg, gold-deep text). Right column: a **committee tag** (`soft` bg, `color` text, pill) and a **comment toggle** (`💬 {count}` or `تعليق`; gold tint when it has comments).
- **Done state:** card bg `#FAFBF8`, border `#DDE7DC`, title turns muted + strikethrough (gold strike).
- **Comments panel** (expands below on toggle): list of comments (avatar + bubble with author/time/text), or `لا توجد تعليقات بعد — أضيفي ملاحظة أو استفساراً`; then an input (`اكتبي تعليقاً...`) + `إرسال` (Enter submits; disabled when empty).

---

## Interactions & Behavior
- **Login** → on success, route to member or supervisor dashboard by role. Pending accounts are blocked with a message.
- **Toggle task done** → optimistic flip of the checkbox; recompute the progress ring/stats. Members only toggle their own tasks; supervisor can toggle any (in prototype). Decide in production whether supervisor toggling is allowed.
- **Add comment** → appends to the task's comment list with author = current user and a `h:mm ص/م` timestamp; comment button count updates and tints gold.
- **Tabs** (supervisor) → client-side switch; active tab is maroon pill. Requests tab shows a red numeric badge = pending count.
- **Activate request** → choose committee, click تفعيل وإسناد → user becomes active, gets `committee_id` and `title = "خادمة " + committee.name`, disappears from Requests.
- **Reject request** → confirm → delete user.
- **Add task** → validates, appends to night's tasks, returns to المهام tab.
- **Add committee** → appends committee with chosen name+color, returns to اللجان tab.
- **Delete committee** → confirm → deletes committee + its tasks; its members revert to pending/unassigned.
- **Logout** → clears session, returns to login.

### Animations / transitions
- Modal overlay: `fade .2s`; modal: `pop .22s ease` (translateY(14px)+scale(.98) → none).
- Buttons/cards: `transition: .15s–.18s` on background/border/transform. Cards lift slightly on hover (desktop), `:active { transform: scale(.98/.99) }` on touch.
- Progress ring stroke animates via `stroke-dashoffset .6s ease`; progress bars `width .5s`.
- Honor `prefers-reduced-motion`.

### Responsive
Phone-first and phone-only. Layout is a fixed centered column (≤480px) so it renders identically on phone and desktop. Tab bar and nights strip scroll horizontally. On very small phones (≤430px) the top-bar name/title block (`.tb-meta`) is hidden. Touch targets ≥ ~44px where practical.

---

## State Management
Prototype state (replace with server data + client cache like React Query/SWR):
- `session` — current user id (prototype: `localStorage['kfn_session_v2']`).
- `data` — `{ users[], committees[], tasks[], meta{ [taskId]: { done, comments[] } } }` (prototype: `localStorage['kfn_data_v2']`).
- Derived per render: a user's tasks (filter by `assignee`), per-committee grouping, done/total counts, overall progress, pending list, flattened comment feed.
- Supervisor tab state and modal open/close are local UI state.

In production: server is the source of truth; keep `done`/`comments` on the Task; scope everything by `night_id`.

---

## Design Tokens
All defined as CSS custom properties in `app.css` (`:root`). Recreate verbatim.

**Colors**
```
--cream      #F4EFE6     page background (with subtle radial highlights)
--cream-2    #ECE4D6     progress track / hover fills
--card       #FFFFFF
--ink        #1C1714     primary text
--ink-soft   #5B5249     secondary text
--muted      #90836F     tertiary/meta text
--line       #E5DCCB     borders/dividers
--maroon     #3A0D15     darkest brand (top bar, active pills)
--maroon-2   #6E1322     primary action / headings accent
--crimson    #9E1B32     alerts / "remaining" / badges
--gold       #BE9A3E     primary accent / ornaments
--gold-deep  #9C7E2E     gold text on tint
--gold-soft  #EFE2BF     gold tint backgrounds
--green      #3F7A52     done / success
```
Header gradients: `linear-gradient(160deg,#46101A,#2C0A10)` (top bar), `linear-gradient(160deg,#4A0F18,#2C0A10)` (login header). Gold ornament strip: `repeating-linear-gradient(90deg, var(--gold) 0 12px, transparent 12px 20px)`.

**Typography** — `Vazirmatn` for everything (display + body). Weights used: 300/400/500/600/700. Sizes (px): page titles/h2 ~21–23, card/section headings 16–17, body 14–15, meta 12–13, pills/labels 11.5–13.5. Eastern-Arabic numerals via a `toAr()` helper; numeric spans use `font-feature-settings:"tnum"`.

**Spacing / radius / shadow**
```
--r-lg 20px   --r-md 14px   --r-sm 10px
--shadow-sm  0 1px 2px rgba(40,20,10,.06), 0 2px 8px rgba(40,20,10,.05)
--shadow-md  0 6px 24px rgba(58,13,21,.10), 0 2px 8px rgba(58,13,21,.06)
```
Common padding: cards 14–20px; main column padding 18px 16px; gaps 9–14px.

**Avatar palette** (deterministic by user id; supervisor fixed to the first):
```
#6E1322→#9E1B32, #9C7E2E→#BE9A3E, #2F6B45→#3F7A52, #6E1322→#B4283E,
#3C5366→#4A6072, #574073→#6B4E86, #8A4A1B→#B5651D, #235454→#2F6B6B
```
**Committee palette** (for new committees — `{color, soft}` pairs):
```
#BE9A3E/#F4EBD2  #3F7A52/#E2EFE6  #9E1B32/#F6E2E5  #4A6072/#E5EAEF
#6B4E86/#ECE5F2  #B5651D/#F4E6D6  #2F6B6B/#DDEDED
```

---

## Assets
- **Logo:** `assets/logo.png` — the Husseiniya emblem, pre-cropped to a transparent circle. Used in the login header (104px), top bar (46px), and PDF cover. Replace only if the committee provides an updated mark.
- **Fonts:** `assets/fonts/Vazirmatn-*.ttf` (Light/Regular/Medium/SemiBold/Bold) — open source (SIL OFL). Self-host; `@font-face` rules are in `fonts.css`. No external CDN needed.
- **Icons:** inline stroke SVGs defined in `components.jsx` (`Icon.clock`, `Icon.pin`, `Icon.note`, `Icon.chat`, `Icon.plus`) — 2px stroke, `currentColor`. A few status glyphs use Unicode (۞ ★ ♦ ✓) and a small number of emoji (🤍 🕊️ 📋 💬 ✅) in greetings/empty states. The check mark in the checkbox is an inline `<polyline>` SVG.

---

## Files (in this bundle)
- `index.html` — app shell: loads fonts/React/Babel, mounts `app.jsx`. (Prototype uses in-browser Babel — production should compile.)
- `app.css` — **all design tokens + every component style.** The closest thing to a spec; port these values.
- `fonts.css` — `@font-face` for Vazirmatn (self-hosted).
- `app.jsx` — all React components & logic: `App`, `AuthScreen`, `TopBar`, `DateRow`, `MemberView`, `SupervisorView`, `TaskCard`, `RequestCard`, `AddTaskModal`, `AddCommitteeModal`, plus state/handlers (`toggle`, `comment`, `addTask`, `addCommittee`, `removeCommittee`, `register`, `activate`, `reject`).
- `components.jsx` — shared bits: `Avatar`, `ProgressRing`, `CheckMark`, `Icon`, avatar-color helper.
- `data.js` — seed data + the `toAr()` Eastern-Arabic numeral helper. Shows the exact shape of users/committees/tasks/comments and realistic sample content (committees: الاستقبال/الضيافة/المجلس/التنظيم/الإعلام; sample tasks per committee).
- `assets/logo.png`, `assets/fonts/*` — assets described above.
- `print.html` / `print.css` / `print.jsx` — a print/PDF "page guide" build (renders every screen as phone mockups for review). Not part of the product; ignore for implementation unless a printable review doc is wanted.

## Critical do-not-miss
1. **Hash passwords** and gate `pending` accounts server-side — never trust the client.
2. **Authorization:** members only touch their own tasks; management endpoints are supervisor-only.
3. **RTL + Arabic numerals** everywhere; keep `dir="rtl"` and the `toAr()` formatting.
4. **Per-night scoping:** tasks/progress belong to a Night; the supervisor authors each night's list.
5. Keep the visual system exact (tokens above). The brand is solemn/مهيب — maroon + gold, restrained ornament, no playful gradients.
