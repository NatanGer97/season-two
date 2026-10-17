# v4 · Anthology posters

Mobile-first redesign of the e2e mockup (17.10.2026). Replaces the v3 dark-glass look.
The calendar stays the dark "TV" between episodes. Every episode opens as a poster in the
visual genre of its subject. Serve `mockup/` on :5177 (`linor-v4` in `.claude/launch.json`)
and open `/v4/`. Debug jumps: `?scene=N&step=M`, `?scene=N&cal` shows the calendar only.

## Genres

| # | Genre | Palette | Punch widget |
|---|-------|---------|--------------|
| intro+0 | cinema title card | black, ivory, gold | – |
| 1 | jeweler catalog | cream, ink, dark gold | ring gauge, visit counter, "בול" seal |
| 2 | lottery TV show | navy, LED red, yellow | scratch balls, result ticker |
| 3 | sports broadcast | pitch green, black scoreboard | taps score goals on the scoreboard, final whistle card |
| 4 | the contract | paper, ink, red stamp | countdown as notary stamp, "נחתם" |
| 5 | kitchen catalog | white, black, catalog yellow | customer rating poll, "פה אחד" sticker |
| 6 | birthday | candy pink, ivory, yellow | candles, paper confetti |
| end | trailer / credits / gift | black, gold | – |

## Unifiers (do not override per genre)

1. Title: Bellefair, right-aligned, max 2 lines. Eyebrow: Rubik 500 12px, `פרק X · date`.
2. 24px gutters, same 3-step bars, same hint line.
3. One ring per poster, in the genre's own role (seal, ball, scoreboard, stamp, avatar).
4. Poster floods out of its calendar cell (clip-path), the panel rises after it.
5. Motion: transform / opacity / clip-path only. Reduced motion collapses to fades.

## Files

- `index.html`, `v4.css` (shell), `posters.css` (one block per `[data-genre]`)
- `app.js` flow engine (calendar run, FLIP steps, gestures), `widgets.js` punches, `data.js` content
- Genre tokens: `--p-bg`, `--p-panel`, `--p-ink`, `--p-soft`, `--p-accent`, `--p-rule`, `--p-body`
- Fonts: Bellefair, Rubik, Karantina (scoreboard, LED, price), Frank Ruhl Libre (contract)

Still placeholders: photos (`photos/<scene>/main.jpg`), handwriting scans, the blessing, key date, gift details.
