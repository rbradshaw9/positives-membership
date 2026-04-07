# Launch Content Ops

**Purpose:** Safe workflow for filling the Level 1 launch runway in Supabase from a structured plan file.\
**Mode:** Dry-run by default. Live writes require `--write`.

---

## 1. What this solves

Use this workflow when you need to:

- create missing `monthly_practice` rows
- create future `daily_audio`, `weekly_principle`, and `monthly_theme` rows
- patch existing weekly or monthly rows with missing audio or updated copy
- rerun the launch audit after a batch publish

This is the recommended operator path for the April 7, 2026 launch hardening work.

---

## 2. Files

- Script: [apply-launch-content-plan.mjs](/Users/ryanbradshaw/AntiGravity/positives-membership/scripts/apply-launch-content-plan.mjs)
- Example plan: [launch-content-plan.example.json](/Users/ryanbradshaw/AntiGravity/positives-membership/scripts/launch-content-plan.example.json)
- Launch-window template: [launch-content-plan.l1-window.template.json](/Users/ryanbradshaw/AntiGravity/positives-membership/scripts/launch-content-plan.l1-window.template.json)
- Weekly audio-fix template: [launch-content-plan.weekly-audio-fixes.template.json](/Users/ryanbradshaw/AntiGravity/positives-membership/scripts/launch-content-plan.weekly-audio-fixes.template.json)

Package script:

```bash
npm run content:launch -- --help
```

---

## 3. Workflow

### Step 1: copy the example plan

```bash
cp scripts/launch-content-plan.example.json /tmp/launch-content-plan.json
```

Fill in the real months, daily titles, weekly titles, monthly themes, descriptions, prompts, and audio URLs or S3 keys.

For the actual launch hardening work, you can start from:

```bash
cp scripts/launch-content-plan.l1-window.template.json /tmp/launch-runway.json
cp scripts/launch-content-plan.weekly-audio-fixes.template.json /tmp/weekly-audio-fixes.json
```

### Step 2: dry-run first

```bash
npm run content:launch -- --plan /tmp/launch-content-plan.json
```

This prints what would be created or updated without writing anything.

### Step 3: apply creates

For net-new rows only:

```bash
npm run content:launch -- --plan /tmp/launch-content-plan.json --write
```

### Step 4: patch existing rows when needed

If you need to modify already-existing weekly or monthly rows, such as fixing missing audio:

```bash
npm run content:launch -- --plan /tmp/launch-content-plan.json --write --allow-update
```

### Step 5: rerun the launch audit

```bash
npm run content:launch -- --plan /tmp/launch-content-plan.json --write --allow-update --audit
```

Or manually:

```bash
npm run audit:launch
```

---

## 4. Plan format

Root keys:

- `months`
- `monthly_themes`
- `weekly_principles`
- `daily_audios`

### Month entry

```json
{
  "month_year": "2026-05",
  "status": "published",
  "description": "May launch month",
  "admin_notes": "Optional operator note"
}
```

### Monthly theme entry

```json
{
  "month_year": "2026-05",
  "title": "The real theme title",
  "status": "published",
  "excerpt": "Optional excerpt",
  "body": "Optional body",
  "reflection_prompt": "Optional prompt"
}
```

### Weekly principle entry

```json
{
  "week_start": "2026-05-04",
  "month_year": "2026-05",
  "title": "The real weekly title",
  "status": "published",
  "excerpt": "Optional excerpt",
  "reflection_prompt": "Optional prompt",
  "castos_episode_url": "https://example.com/audio.mp3"
}
```

### Daily audio entry

```json
{
  "publish_date": "2026-05-04",
  "month_year": "2026-05",
  "title": "The real daily title",
  "status": "published",
  "excerpt": "Optional excerpt",
  "reflection_prompt": "Optional prompt",
  "duration_seconds": 420,
  "castos_episode_url": "https://example.com/audio.mp3"
}
```

---

## 5. Matching rules

The script is idempotent by slot.

- `daily_audio` rows match by `publish_date`
- `weekly_principle` rows match by `week_start`
- `monthly_theme` rows match by `month_year`
- `monthly_practice` rows match by `month_year`

If a slot already exists:

- without `--allow-update`, the script skips it
- with `--allow-update`, the script updates the existing row instead of creating a duplicate

This is what makes it safe for fixing the 8 published weeklies that currently lack audio.

---

## 6. Recommended launch sequence

1. Fill `months` for `2026-05` and `2026-06`.
2. Fill `monthly_themes` for `2026-05` and `2026-06`.
3. Fill `weekly_principles` for every Monday through `2026-06-01`.
4. Fill `daily_audios` for every day through `2026-06-01`.
5. Dry-run the plan.
6. Write the plan.
7. Rerun the launch audit.
8. Repeat until the audit returns zero blockers.

---

## 7. Quick verification commands

```bash
npx supabase db query --linked "select month_year, status from monthly_practice order by month_year;" --output table
npx supabase db query --linked \"select publish_date, title from content where type = 'daily_audio' and status = 'published' order by publish_date desc limit 20;\" --output table
npx supabase db query --linked \"select week_start, title, castos_episode_url, s3_audio_key from content where type = 'weekly_principle' and status = 'published' order by week_start desc;\" --output table
```

---

## 8. Safety rules

- Always run the dry-run first.
- Do not bulk-edit production content without a saved plan file.
- Use `--allow-update` only when you intentionally mean to patch existing rows.
- Rerun `npm run audit:launch` after every material content batch.
