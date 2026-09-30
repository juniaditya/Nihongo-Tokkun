# Nihongo Tokkun v1.5 patch

Changes:
- Browser Japanese TTS (`ja-JP`) for flashcards, quiz prompts, and Dokkai passages.
- `cara_baca` quiz TTS stays locked until the learner answers.
- Review Kotoba intercepts internal navigation when reviewed cards are unsaved.
- Review exit modal offers Cancel or Save & Exit; partial reviewed cards are persisted before navigation.
- Browser refresh/close gets a native unsaved-progress warning during Review Kotoba.
- Flashcard front/back fields are centered using a scoped late CSS override.
- Adds v1.5 regression tests.

No database migration and no new npm dependency are required.

Apply with PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\apply_v1_5.ps1
```

Or manually copy the `src/` folder over the project root.

Then run:

```powershell
cd C:\Users\junia\Documents\Nihongo-Tokkun-Next
npm.cmd test
npm.cmd run build
```
