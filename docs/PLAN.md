# خطة الأربعين 2027 — Feeding & Purchasing Plan

A section of this site at **`/plan`** (signed-in users only) that replaces the Excel workbook
«خطة التغذية والمشتريات». There is **one master dataset** in the database. Every
branch page is generated from it on each request, and open pages refresh
themselves within ~8 seconds of any change, so an edit in the master shows up
everywhere.

## Pages

All pages need a signed-in, approved account. Visitors who aren't signed in
are sent to the login and brought back to the same page afterwards.

| URL | Page | Who |
|---|---|---|
| `/plan` | Home: stats, today's day, links, day chips, export | all users |
| `/plan/master` | **الجدول الكامل**: everything, inline editing | all users view · editors edit |
| `/plan/tasks` | الخطة: tasks / notes log | all users (read-only) |
| `/plan/internal` | الجدول الداخلي: daily feeding plan | all users (read-only) |
| `/plan/external` | الخارجي: external procession, all days in one table | all users (read-only) |
| `/plan/appetizers` | المقبلات: meal items categorised as appetizer/salad/soup or dessert/fruit | all users (read-only) |
| `/plan/produce` | الفواكه والخضروات: fruit & vegetables in 3 batches | all users (read-only) |
| `/plan/supplies` | المستلزمات والمشتريات: buffet, kitchen tools, cleaning, food (grouped by supplier) | all users (read-only) |
| `/plan/day/<id>` | Cook's day sheet: print or open on a phone | all users |
| `/plan/history` | Audit log | editors |
| `/plan/trash` | Trash (soft-deleted records) | editors |
| `/plan/backups` | Snapshots, import, export | editors · restore/import = admin |

Search and filters (day, meal, cook, status) are on the master and internal
pages. The other pages have search plus the filters that make sense there.

## Data model

Defined once in `lib/plan/model.js` (fields, labels, types). SQLite tables are
created automatically by `lib/plan/store.js`. See `docs/plan-schema.sql`.

- `plan_tasks`: number, date, priority, note/task, section, deadline, status
- `plan_days`: day number, Hijri date, Gregorian date, headcount, title note
  - `plan_meal_items` (per day): meal (breakfast/lunch/dinner), item, quantity, preparation/cooking method, cook, notes, status, **category** (main / side / appetizer / dessert). The appetizers page is every item whose category is *appetizer* or *dessert*.
  - `plan_day_notes` (per day): text, person responsible / status, status
  - `plan_external` (per day): meal, main-dish quantity, rice/bread quantity, notes, status
- `plan_fruit`: item, total quantity, unit, *perishable* flag, notes, status. Batch quantities are **computed**: long-lasting fruit is ordered in full in batch 1, and perishable fruit is split into thirds.
- `plan_veg`: batch (1–3), item, price, quantity, notes, status
- `plan_supplies`: list (buffet / tools / cleaning / food), supplier, group, item, price, unit, quantity, notes, available now / need to buy, status
- `plan_audit`: every create/edit/delete/restore: timestamp, editor, record, field, old value, new value
- `plan_snapshots`: whole-plan backups (gzip JSON)

Every table has `deleted_at`. Deleting is a soft delete, and deleted rows appear
in the Trash.

## Editing & security

- Viewing needs a signed-in, approved account (any user). The data API and the
  Excel/CSV export also refuse anonymous requests. Editing needs permission:
  **admins always**, and any other user an admin ticks as «يعدّل خطة الأربعين»
  in **الإدارة → المستخدمون**. Each editor has their own name, so the history
  shows who changed what.
- Passwords are bcrypt-hashed on the server; nothing secret is in the frontend.
- **Lockout:** 5 wrong passwords in a row lock the account for 15 minutes. An
  admin can unlock it immediately (المستخدمون → «فتح الحساب»), and setting a new
  password also unlocks it.
- **Change password:** any user at `/account/password` (also linked in the plan
  header and the admin hub).
- Sessions are signed with `JWT_SECRET` if it is set. Otherwise the app
  generates a random key once and keeps it in the database, so there is never a
  guessable default.

## History & recovery

- **Record history:** the 🕘 button on any row lists its past versions (who,
  when, field: old → new), with **استرجاع هذه النسخة** next to each.
- **Trash:** 🗑 moves a record to the Trash, where it can be restored from
  `/plan/trash`. Deleting a day hides its meals, notes and external entries;
  restoring the day brings them back.
- **Snapshots:** one automatic snapshot per day, taken on the first visit of the
  day (Baghdad time), so it also works on a server that sleeps. Automatic
  snapshots are kept 60 days; manual ones are kept until deleted. «إنشاء نسخة
  احتياطية الآن» makes a manual one. Admins can restore the whole plan to any
  snapshot, which asks for the password again plus a confirmation, and takes a
  snapshot of the current state first so a restore can be undone. Each snapshot
  can also be downloaded as Excel.
- **Full database file:** the whole SQLite file is also copied daily to
  `data/backups/` (last 14 days kept) for disaster recovery.

## Loading the initial data from the Excel workbook

1. Sign in as an admin and open **`/plan/backups`** (tab «النسخ الاحتياطية»).
2. Under **استيراد من Excel**, choose the workbook
   (`خطة التغذية والمشتريات … 2027.xlsx`). The app reads the sheet
   «الجدول الكامل» and shows what it found (for the current workbook: 16 days,
   402 meal items, 38 day notes, 15 external entries, 28 tasks, 15 fruits,
   61 vegetable rows, 241 supply rows).
3. Click **استيراد واستبدال الخطة الحالية**, tick the confirmation, enter your
   password, and confirm.

No reformatting of the workbook is needed. The importer handles the titles,
merged cells and sub-tables, including the food purchase tables whose columns
shift and the supplier titles above them. Notes on how it maps things:
- Gregorian dates like `10/7` are read as 2027.
- Meal items are categorised using the workbook's own «جدول المقبلات», with
  keyword matching as a fallback. The category can be changed per item in the
  master.
- The sheet's second copy of day 14's notes and its appetizer table aren't
  imported separately; they duplicate data that is already imported.
- The standing note above the food list («حمزه لازم يطلع على قوائم المشتريات…»)
  becomes a task.

**Round trip:** «تنزيل الخطة كاملة (Excel)» exports one clean sheet per table
(with an «المعرّف» id column). That file can be edited in Excel and imported
back the same way; the importer detects which format it is.

## Hosting

The site runs on **Render** as before, with nothing new to set up:

- The database is the existing SQLite file on the service's persistent disk
  (`DATA_DIR`), so the plan, audit log, snapshots and daily DB copies all live
  on that disk.
- Environment: `JWT_SECRET` (recommended; a long random value), `DATA_DIR`
  (the disk mount path). No other keys are needed for the plan.
- Deploys happen automatically when `main` changes.

Vercel + Supabase would need the data layer rewritten, because Vercel has no
persistent disk for SQLite. The site already has hosting and a database, so
this build keeps both.

## Local development

```
npm install
npm run dev
```
Open http://localhost:3000/plan, sign in as an admin, and import the workbook
at `/plan/backups`.
