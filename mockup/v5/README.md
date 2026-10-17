# v5 · Velvet box

Rebrand from scratch (17.10.2026) after v4 felt hard and too fast. One material system for the
whole gift, no genre switching:

- **Velvet stage**: deep warm base with one soft tinted light from above. The tint changes per
  chapter (`tint` in `data.js`, animated through the registered `--tint` property, 1.8s).
- **Ivory cards**: photo print (26px radius, deep shadow) and the story card (30px radius, pull bar).
- **Champagne gold**: ring, stamps, step bars, accents. Darker gold `#8C6A32` for text on ivory.
- **Type**: Noto Serif Hebrew 300/400 for display and story, IBM Plex Sans Hebrew for labels.

## Motion (slow on purpose)

| Beat | v4 | v5 |
|------|----|----|
| Calendar run | 1.4s | 2.6s, ease-out quartic |
| Photo floods from cell | 0.5s | 1.0s |
| Story card rises | 0.45s | 0.95s |
| Text stagger | 60ms / 420ms | 140ms / 800ms, 150ms lead |
| Step FLIP | 0.45s | 0.9s |
| Auto-advance after a punch | 2.6s | 4.6s (7s after candles) |
| Sparkles / confetti | 1.4–2.1s | 2.4–4.2s |

A full scene-to-scene move is about 6s. Trim `run(to, ms = 2600)` in `app.js` if that feels long.

Serve `mockup/` on :5177 (`linor-v4` in `.claude/launch.json`) and open `/v5/`.
Debug: `?scene=N&step=M`, `?scene=N&cal`. Test hook `window.__state()`.
Still placeholders: photos (`photos/<scene>/main.jpg`), handwriting, blessing, key date, gift.
