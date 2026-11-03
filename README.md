# Bend-over with Emre (BOWE)

A custom mobility routine app for iPhone, built as an installable web app (PWA).

- Build your own routines from a library of mobility moves, or add your own moves
- Guided player with a countdown ring, voice cues, beeps and automatic side switching
- Streaks, weekly stats and a 5-week calendar
- Works offline; all data stays on your device

## Install on iPhone

1. Open the GitHub Pages link in **Safari**
2. Tap **Share → Add to Home Screen**

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

When you change app files, bump `VERSION` in `sw.js` so installed copies update.
