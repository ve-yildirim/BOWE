# Bend-over with Emre (BOWE)

A custom mobility routine app for iPhone, built as an installable web app (PWA).

- 260+ exercises with search and filters; add or edit moves in the app
- Guided player with a countdown ring, voice cues, beeps and automatic side switching
- Streaks, weekly stats and a 5-week calendar
- Works offline; history stays on your device

## Exercise database

All exercises and the starter routines live in [`data/starter.json`](data/starter.json).
Every device loads this file, so changes to it show up everywhere.
Edits made inside the app are saved on that device only (use Export/Import to move them).

## Install on iPhone

1. Open the GitHub Pages link in **Safari**
2. Tap **Share → Add to Home Screen**

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

When you change app files, bump `VERSION` in `sw.js` so installed copies update.
