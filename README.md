# Groovebox

A browser-based **groovebox** — a drum machine, synth, step sequencer, mixer and
effects rack — built entirely on the **Web Audio API**. It's a pure frontend app:
there is **no backend**, no accounts, no network calls, and no audio assets to
download. Every sound is synthesized in real time, so it works fully offline.

## Features

- **Drum step sequencer** — 16-step grid with five synthesized voices
  (kick, snare, clap, closed & open hi-hat). Click steps to build a beat.
- **Synth track** — a piano-roll style sequencer with selectable scale and root,
  a subtractive synth voice (saw/square/triangle/sine), low-pass filter
  (cutoff + resonance) and a full ADSR amplitude envelope.
- **Mixer & FX** — per-track volume fader, pan, mute and post-fader sends to a
  feedback **delay** and a convolution **reverb**, plus a master volume.
- **Transport** — play/stop, tempo (60–180 BPM) and swing.
- **Tight timing** — a look-ahead scheduler clocks events against the audio
  hardware clock for sample-accurate playback.

## Getting started

```bash
npm install
npm run dev      # start the dev server (Vite)
```

Then open the printed local URL. Click **Play** (the browser starts audio only
after a user gesture) and start sequencing.

### Build for production

```bash
npm run build    # type-check + bundle to dist/
npm run preview  # preview the production build locally
```

The build uses a relative base path, so `dist/` can be dropped onto any static
host (GitHub Pages, Netlify, an S3 bucket, a plain file server, …).

## How it works

- `src/audio/AudioEngine.ts` — owns the `AudioContext`, the mixer/effects graph,
  and the look-ahead scheduler. It's framework-agnostic.
- `src/audio/voices.ts` — the synthesized drum and synth voices (no samples).
- `src/state/useGroovebox.ts` — a React hook holding the pattern state and
  wiring UI actions to the engine. Pattern data is read by the scheduler each
  step; mixer/FX changes are pushed to the audio graph immediately.
- `src/components/*` — the Transport, DrumSequencer, SynthSequencer and Mixer UI.

## Tips

- Drag knobs **vertically** to adjust; hold **Shift** for fine control.
- Click a drum track name or a piano-roll note to **audition** the sound.
