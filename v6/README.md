# v6 · Alive

Built 17.10.2026 after v5 felt dead. Same velvet / ivory / champagne material as v5, but
everything moves, reacts and sounds. The photo is the screen.

## What is alive

| Layer | What it does | File |
|-------|--------------|------|
| Aurora | three blurred lights drift for 34–47s, tinted per chapter | `v6.css` `.aurora` |
| Gold dust | 70 canvas particles drift up, flow away from the finger, burst on stamps and "yes" | `alive.js` |
| Tilt | gyroscope moves photo and dust (`--px`, `--py`); desktop uses the pointer | `alive.js` |
| Haptics | tick per day while time moves, thump on stamps (Android; iOS web has none) | `alive.js` |
| Sound | generative pad (Am F C G, 7s each) + ticks, whoosh, chime, puff, "yes" swell. Synthesized, no files. Mute button top-left, remembered | `sound.js` |
| Words | title and story arrive word by word out of a blur | `app.js` `reveal()` |
| Time under the finger | on touch screens, after a chapter closes, dragging up runs the calendar; release past 28% snaps to the next chapter. Auto-run after 6s or on wheel/keys. Force on desktop with `?scrub=1` | `app.js` `scrub()` |
| Candles | blow into the mic (RMS > 0.11 for 4 frames) or tap. Flames glow and flicker | `widgets.js` |
| Confetti | 140–160 pieces fall across the whole screen, 3–6s | `app.js` `confetti()` |
| Wish lyrics | chapter 6 story step: the avatar video `photos/6.mp4` plays with its voice and the wish scrolls line by line, one line per caption cue, at the cue's start; `photos/6.srt` is parsed at load, so a re-exported SRT updates the lines with no code change; the avatar rises while speaking; music ducks. If the browser refuses sound, a one-tap button unmutes | `app.js` `lyrics()` |

## Beats

Intro: ring heartbeat on the last line, then a gold flash, dust burst and a chord on "ואת אמרת לי כן".
Chapter open: photo bursts out of its calendar cell (scale 1.35 + blur → sharp), a light leak sweeps,
then the text layer rises. Step 2 only gets a glass surface for the widget.

## Phone testing

Mic and gyroscope need HTTPS (or localhost). On a real phone serve over HTTPS (Vercel preview,
or `ngrok`/`cloudflared` tunnel). Sound starts on the first tap.

Serve `mockup/` on :5177 (`linor-v4` in `.claude/launch.json`), open `/v6/`.
Photos: drop `mockup/photos/0.jpg` … `6.jpg` (one per scene). `mockup/v5/photos` and `mockup/v6/photos` link there.
Debug: `?scene=N&step=M`, `?scene=N&cal`, `?scrub=1`.
