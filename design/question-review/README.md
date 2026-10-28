# Training Question Review

Published at https://claude.ai/artifact/HCbXKhtyrMGraNQQaCmCrr (db: `reviews/<ID>` = status, `notes` = comments).

Rebuild after content changes (WCE prototype running on :3430):
1. `node dump.mjs > steps.json` (dumps every step from this repo via jiti)
2. `python3 build_sheet.py steps.json <sheet.xlsx> rows.json` (needs openpyxl; writes the xlsx and rows.json)
3. `node shots.mjs` (headless Chrome walks each lesson; Default and Right previews) → shots/, shots.json
4. drop answer shots for kinds without auto-answer, then `python3 build_page.py rows.json shots.json` → index.html
5. republish index.html (as question-review.html) with the shots/ files.
Question IDs are positional (BS-001…); if lessons change order, ids shift and stored reviews must be remapped.

28 Oct rebuild (branch feat/pilot-paywall): shots.mjs now seeds the intro as done and paywall group A (so no primer or paywall covers a lesson) and resets the preview to Default in the same tick as Continue (the player grades a step on load when the preview is Right). Answer shots for kinds without auto-answer still show "Correct!" over an unanswered widget: drop every `-a` shot that wasn't in the previous shots.json (16 on 28 Oct). "prompt not found" on candle-scrub is harmless: learn steps show the course title, not the prompt.
