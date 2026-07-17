# Handoff: موقع موكب أمير المؤمنين (ع) — Mawkab Committees Website

## Overview
Build a full-stack website for **موكب أمير المؤمنين (ع)** (a Hussaini procession/service group, est. 1384هـ / 1964م, serving Arbaeen pilgrims). The site presents the group's work manual organized by **لجان (committees)**:

- **Public frontend**: landing page listing all committees; clicking a committee opens its detail page (rich content: text, tables, images).
- **Private area**: same structure but with the full/private version of the manual, accessible only to authorized (logged-in) users.
- **Admin backend**: a CMS page where the site owner can add/edit/delete a لجنة and author its content with a **rich-text editor that must support pasting directly from Microsoft Word** — preserving headings, bold, bullet/numbered lists, and **tables**, plus image upload.

The whole site is **Arabic, RTL** (`<html dir="rtl" lang="ar">`).

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look, structure, and content. They are NOT production code. Recreate them in your chosen stack (e.g. Next.js + a database, or Laravel, etc.) using the design tokens below. If no environment exists yet, a sensible default: **Next.js (App Router) + SQLite/Postgres + Tiptap editor + NextAuth**, deployed anywhere.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and section styling in the reference files are final. Match them closely.

## Design Tokens (from the brand guidelines — دليل الهوية.dc.html)

```css
:root {
  /* Colors */
  --mawkab-yellow: #FEF33E;   /* أصفر الراية — hero/banner backgrounds, footer */
  --mawkab-red:    #D70C00;   /* أحمر — headings accents, primary buttons, section numbers */
  --mawkab-green:  #157201;   /* أخضر — links, sub-headings (H3), icons */
  --mawkab-paper:  #FAF7EC;   /* page background */
  --mawkab-ink:    #201C10;   /* body text */
  --mawkab-red-dark:    #A80900;  /* red hover */
  --mawkab-green-dark:  #0E4F01;  /* green hover */
  --mawkab-yellow-soft: #FFFBD6;  /* table header rows, badges */
  --mawkab-border: #E4DEC8;       /* card & table borders */
  --mawkab-muted:  #8A8163;       /* secondary text */

  /* Fonts (Google Fonts) */
  --font-heading: 'Amiri', serif;               /* weights 400, 700 */
  --font-body: 'IBM Plex Sans Arabic', system-ui, sans-serif; /* 300–700 */
}
html { direction: rtl; }
body { font-family: var(--font-body); color: var(--mawkab-ink); background: var(--mawkab-paper); }
h1, h2, h3 { font-family: var(--font-heading); }
a { color: var(--mawkab-green); text-decoration: none; }
a:hover { color: var(--mawkab-red); }
::selection { background: var(--mawkab-yellow); }
```

Font import: `https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap`

Color usage ratio: paper ~55%, yellow ~25%, red ~12%, green ~8%. Never recolor the logo; keep clear space ≥ ¼ of its diameter; minimum size 48px digital.

## Logo
`assets/logo.png` — circular yellow badge with green dome and red Diwani calligraphy. Use as-is on yellow, light, or dark backgrounds. In headers render at 40–44px; on hero/cover at 200–300px with a soft drop shadow `0 18px 36px rgba(139,120,0,0.35)`.

## Screens / Views

### 1. Public landing — قائمة اللجان
- **Sticky header** (blur backdrop, `rgba(250,247,236,0.94)`, bottom border `--mawkab-border`): logo 42px + two-line title (Amiri 700 20px «موكب أمير المؤمنين (ع)» / 12.5px muted subtitle «دليل تعليمات العمل — زيارة الأربعين ٢٠٢٦»). Left side: nav links + «دخول المخوّلين» (login).
- **Hero**: full-width `--mawkab-yellow` band, centered: logo 200px, H1 Amiri 700 52px «دليل تعليمات الموكب», subtitle 19px/600.
- **Committee grid** (max-width 980–1120px, centered): one card per لجنة. Card: white bg, 1px `--mawkab-border`, radius 14px, padding ~28px; Arabic-Indic index numeral (Amiri 700, red) + committee name (Amiri 700, ~24px); hover: border-color red or slight shadow lift. Entire card clickable → detail page.
- **Footer**: yellow band, logo 38px + name (Amiri 700 19px), left side small 14px label.

### 2. Committee detail page — صفحة اللجنة
- Same header/footer.
- Title block: Arabic-Indic number (red, Amiri) + committee name (Amiri 700 31px), separated from content by a **3px solid `--mawkab-yellow` bottom border** (padding-bottom 14px).
- Content card: white, border `--mawkab-border`, radius 14px, padding 34px 38px, vertical gap 16px. Renders the committee's rich content:
  - **H3 sub-headings**: Amiri 700 25px, color `--mawkab-green`.
  - **Body**: 16px, line-height 2.1. Bold paragraphs: 17px/700.
  - **Lists**: flex column, gap 8px, 16px, line-height 1.95, RTL padding (padding-right 24px).
  - **Tables**: full width, collapsed 1px `--mawkab-border` cells, padding 10px 14px, 15px text, `text-align: right`; **first row** is header: `--mawkab-yellow-soft` background + bold. Wrap in horizontally scrollable div on mobile.
  - **Images**: max-width 100%, radius 12px.
- «الفهرس/رجوع» link back to the grid.

### 3. Login + private area
- Login card (see `دليل تعليمات الموكب (خاص).dc.html` lock screen): centered white card radius 16px, shadow `0 24px 60px rgba(60,50,10,0.12)`, logo 110px, title Amiri 700 26px, pill badge «نسخة خاصة — للمخوّلين فقط» (`--mawkab-yellow-soft` bg, dark-red text 13.5px/600), password/username inputs (paper bg, border `--mawkab-border`, focus border green, radius 10px), primary button full-width red → dark red on hover, radius 10px, 16.5px/700. Error text: red 14px/600 «كلمة المرور غير صحيحة».
- After login, authorized users see the **private** committees (same layouts as public). Each committee record has a visibility flag: `public` / `private` / both — the public site shows public content; logged-in users see everything.
- Use real server-side auth (sessions/JWT). The HTML prototype's client-side password is a mock only.

### 4. Admin backend — إدارة اللجان
Simple authenticated admin area (Arabic, RTL, same design tokens):
- **Committees list**: table/list of all لجان with order, name, visibility (عام/خاص), edit + delete actions, and «إضافة لجنة» primary red button.
- **Committee editor**:
  - Fields: الاسم (text), الترتيب (number), الظهور (عام / خاص / كلاهما), المحتوى (rich text).
  - **Rich text editor requirements (critical)**: the owner will **copy-paste from Word**. The editor MUST accept pasted Word content and preserve: headings, bold, bullet & numbered lists, **tables** (this manual has 65 tables), and pasted/uploaded **images**. Recommended: **Tiptap** (with Table, Image extensions + a Word-paste cleaner) or CKEditor 5 (has best Word paste support out of the box). Sanitize pasted HTML; map it to the site's styles on render (don't store inline Word styling — store clean semantic HTML and style it with the tokens above).
  - Image uploads stored on server/object storage; drag-drop or paste into the editor.
  - Reorderable committees (drag or numeric order field).

## Interactions & Behavior
- Committee cards: hover lift/border-red, cursor pointer, whole card is the link.
- Smooth scroll; `scroll-margin-top: 96px` on anchored sections (sticky header height).
- All numbers shown to users in **Arabic-Indic numerals** (٠١٢٣٤٥٦٧٨٩) where the design does.
- Mobile responsive: grid collapses to 1 column; tables scroll horizontally; header collapses gracefully.

## Data Model (suggested)
```
Committee { id, name, slug, order, visibility: 'public'|'private'|'both', contentHtml, updatedAt }
User { id, username, passwordHash, role: 'admin'|'member' }
Image { id, committeeId?, url }
```

## Seed Content
**Start with an EMPTY database — do not seed any committees.** The owner will create every لجنة and paste its content through the admin editor. The bundled manual pages are **visual references only** (card style, heading treatment, table/list styling) — do not import their text.

Empty states are required:
- Public grid with no committees: centered logo + message «سيتم نشر اللجان قريبًا إن شاء الله» in the brand style.
- Admin list with no committees: message + prominent «إضافة لجنة» button.

## Assets
- `assets/logo.png` — official logo (transparent-cornered circular crop, ~830px).
- Reference pages: `دليل الهوية.dc.html` (brand guidelines), `دليل تعليمات الموكب.dc.html` (public), `دليل تعليمات الموكب (خاص).dc.html` (private + lock screen design).

## Files in this bundle
- `README.md` — this document
- `assets/logo.png`
- `دليل الهوية.dc.html` — brand guidelines page
- `دليل تعليمات الموكب.dc.html` — public manual design (style reference only)
- `دليل تعليمات الموكب (خاص).dc.html` — private manual design + lock screen (style reference only)
- `support.js` — runtime for previewing the .dc.html files in a browser (open the .dc.html files directly to view them); not needed in production
