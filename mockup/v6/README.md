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
| Sound | generative pad (Am F C G, 7s each) + ticks, whoosh, chime, puff, "yes" swell. Synthesized, no files. Mute button top-left, remembered. Unlocks on the first touchend/click and keeps retrying until the context runs; a looping silent `<audio>` keeps iOS playing with the silent switch on | `sound.js` |
| Words | title and story arrive word by word out of a blur | `app.js` `reveal()` |
| Way on | a quiet line at the bottom says the gesture in her words ("החליקי למעלה" on touch, "גללי" on a desk) beside a gold chevron that breathes upward, no box. Until her first gesture the text is ivory and the chevron glows; then it dims to ivory-soft. Hidden on the widget step and under the avatar's gate | `app.js` `showHint()` |
| Time under the finger | the calendar always runs by itself (2.6s). On touch screens a finger can take over mid-run: touch pauses, drag moves the days, release lets it continue. Force on desktop with `?scrub=1` | `app.js` `travel()` |
| Candles | the first prototype's CSS cake (striped candles, pink and gold tiers). Blow into the mic (RMS > 0.11 for 4 frames) or tap a candle. Flames glow and flicker. When the last flame is out, `photos/yom-huledet.mp3` plays (Eden, "Yom Huledet", the final chorus, ~21s) and the scene moves on when it ends | `widgets.js` `candles()` |
| Songs | one shared `<audio>`: `Sound.song(src)` plays a file (bed ducks, site mute applies), `Sound.songStop()` fades it when a scene is left. `Sound.start()` primes it with a muted play of the silent clip inside the first gesture, so iOS lets it play later outside one. The credits roll under `photos/yom-huledet-2.mp3` (the first chorus, 22s, short fades) looping until she leaves | `sound.js` |
| Confetti | 140–160 pieces fall across the whole screen, 3–6s | `app.js` `confetti()` |
| Wish lyrics | chapter 6 story step: the avatar video `photos/6.mp4` plays with its voice and the wish scrolls line by line, one line per caption cue, at the cue's start; `photos/6.srt` is parsed at load, so a re-exported SRT updates the lines with no code change; the avatar rises while speaking; music ducks. The mp4 is 9:16 with white letterbox bars, so the video is clipped to its 16:9 middle and zoomed 1.35x while speaking. The avatar always waits for her tap on a gate button ("check the phone is not on silent"), then starts with its voice. Site mute also mutes the video. While the avatar speaks the music and shimmer are fully silent | `app.js` `lyrics()` |

## Beats

Intro: ring heartbeat on the last line, then a gold flash, dust burst and a chord on "ואת אמרת לי כן".
Chapter open: photo bursts out of its calendar cell (scale 1.35 + blur → sharp), a light leak sweeps,
then the text layer rises. Step 2 only gets a glass surface for the widget.

## Live

GitHub Pages: https://natanger97.github.io/season-two/v6/ (repo `NatanGer97/season-two`, public, pages are `noindex`).
Publish an update from the worktree:

```bash
git push origin "$(git subtree split --prefix mockup -q):refs/heads/gh-pages" --force
```

## Phone testing

Mic and gyroscope need HTTPS (or localhost). On a real phone serve over HTTPS (Vercel preview,
or `ngrok`/`cloudflared` tunnel). Sound starts on the first tap.

Serve `mockup/` on :5177 (`linor-v4` in `.claude/launch.json`), open `/v6/`.
Photos: drop `mockup/photos/0.jpg` … `6.jpg` (one per scene). `mockup/v5/photos` and `mockup/v6/photos` link there.
Debug: `?scene=N&step=M`, `?scene=N&cal`, `?scrub=1`.
