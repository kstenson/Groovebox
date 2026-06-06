// Fully synthesized voices — no samples, so the app has zero audio assets
// and works completely offline. Each trigger schedules its own short-lived
// nodes at a precise AudioContext time and lets them garbage-collect after
// the envelope finishes.

import type { DrumVoiceId, OscWaveform } from './types'
import { midiToFreq } from '../theory'

/** Cached white-noise buffer, lazily created per context. */
const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>()

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffers.set(ctx, buf)
  }
  return buf
}

function noiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = getNoiseBuffer(ctx)
  src.loop = true
  return src
}

function triggerKick(ctx: AudioContext, dest: AudioNode, t: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.12)
  gain.gain.setValueAtTime(1, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.connect(gain).connect(dest)
  osc.start(t)
  osc.stop(t + 0.45)
}

function triggerSnare(ctx: AudioContext, dest: AudioNode, t: number) {
  // Noise component
  const noise = noiseSource(ctx)
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 1500
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.8, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  noise.connect(noiseFilter).connect(noiseGain).connect(dest)
  noise.start(t)
  noise.stop(t + 0.2)

  // Tonal body
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(180, t)
  oscGain.gain.setValueAtTime(0.5, t)
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  osc.connect(oscGain).connect(dest)
  osc.start(t)
  osc.stop(t + 0.13)
}

function triggerClap(ctx: AudioContext, dest: AudioNode, t: number) {
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1100
  filter.Q.value = 1.2
  filter.connect(dest)

  // Three quick noise bursts give the characteristic "clap" texture.
  const offsets = [0, 0.012, 0.024]
  for (const off of offsets) {
    const noise = noiseSource(ctx)
    const gain = ctx.createGain()
    const start = t + off
    gain.gain.setValueAtTime(0.7, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07)
    noise.connect(gain).connect(filter)
    noise.start(start)
    noise.stop(start + 0.08)
  }
}

function triggerHat(ctx: AudioContext, dest: AudioNode, t: number, open: boolean) {
  const noise = noiseSource(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000
  const gain = ctx.createGain()
  const decay = open ? 0.3 : 0.05
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + decay)
  noise.connect(filter).connect(gain).connect(dest)
  noise.start(t)
  noise.stop(t + decay + 0.02)
}

export function triggerDrum(id: DrumVoiceId, ctx: AudioContext, dest: AudioNode, t: number) {
  switch (id) {
    case 'kick':
      return triggerKick(ctx, dest, t)
    case 'snare':
      return triggerSnare(ctx, dest, t)
    case 'clap':
      return triggerClap(ctx, dest, t)
    case 'closedHat':
      return triggerHat(ctx, dest, t, false)
    case 'openHat':
      return triggerHat(ctx, dest, t, true)
  }
}

export interface SynthParams {
  waveform: OscWaveform
  cutoff: number
  resonance: number
  attack: number
  decay: number
  sustain: number
  release: number
}

/** Trigger a single synth note for `duration` seconds starting at time `t`. */
export function triggerSynth(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  midi: number,
  duration: number,
  p: SynthParams,
) {
  const osc = ctx.createOscillator()
  const filter = ctx.createBiquadFilter()
  const amp = ctx.createGain()

  osc.type = p.waveform
  osc.frequency.setValueAtTime(midiToFreq(midi), t)

  filter.type = 'lowpass'
  filter.frequency.value = p.cutoff
  filter.Q.value = p.resonance

  // ADSR amplitude envelope.
  const peak = 0.8
  const sustainLevel = peak * p.sustain
  const releaseStart = t + duration
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.linearRampToValueAtTime(peak, t + p.attack)
  amp.gain.linearRampToValueAtTime(sustainLevel, t + p.attack + p.decay)
  amp.gain.setValueAtTime(Math.max(sustainLevel, 0.0001), releaseStart)
  amp.gain.exponentialRampToValueAtTime(0.0001, releaseStart + p.release)

  osc.connect(filter).connect(amp).connect(dest)
  osc.start(t)
  osc.stop(releaseStart + p.release + 0.02)
}
