# Kifan design system (best-effort scaffold)

This directory is a static, standalone preview of the app's design language —
built from `app/styles/app.css` and the real component markup in `components/`
so it can be reviewed or synced to a Claude Design project independently of
the Next.js app.

**Note on provenance:** this was scaffolded without access to the actual
`/design-sync` skill (it wasn't enabled in the session that built this), so
the conventions below are a best-effort reading of the `DesignSync` tool's
own description, not a verified spec. Treat the structure as a reasonable
starting point rather than a guaranteed match for what that skill would
produce.

## Structure

```
design-system/
  assets/           shared stylesheet, self-hosted Vazirmatn fonts, logo
  previews/         one static HTML file per component/screen group
  _ds_manifest.json generated — do not hand-edit, run `npm run design:check`
```

## Card marker convention

Each file in `previews/` starts with plain HTML comments the checker parses:

```html
<!-- @dsCard group="Components" -->
<!-- @dsName بطاقة المهمة -->
<!-- @dsSubtitle Open, done, with note, with claimors -->
<!-- @dsViewport width=420 height=760 -->
```

Only `@dsCard` (with a `group="..."` attribute) is required; `@dsName` falls
back to the filename and `@dsViewport` falls back to `width:420` if omitted.
Markers must be contiguous at the very top of the file.

## Regenerating the manifest

```
npm run design:check
```

Scans `previews/*.html`, rebuilds `_ds_manifest.json`, and fails (non-zero
exit) if a file is missing its `@dsCard` marker or looks like an empty stub.

## Syncing to claude.ai/design

Pushing this directory to a Claude Design project requires the `DesignSync`
tool's `/design-login` authorization, which isn't available in every
environment (e.g. it failed here in this remote session). From an
authorized session: `list_projects` (or `create_project`) → `finalize_plan`
with `design-system/**` in `writes` → `write_files`.
