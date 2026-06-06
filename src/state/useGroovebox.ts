import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import type {
  DrumVoiceId,
  EffectSettings,
  GrooveboxState,
  MixerSettings,
  SynthTrack,
} from '../audio/types'
import { createInitialState } from './initialState'
import { soundById, kitByName } from '../audio/drumSamples'

/**
 * Owns the single AudioEngine instance and the React-side pattern state.
 * The engine reads the latest state through a ref each scheduling tick;
 * mixer/effect/param edits are also pushed to the engine imperatively so
 * they take effect immediately rather than on the next step.
 */
export function useGroovebox() {
  const [state, setState] = useState<GrooveboxState>(createInitialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const engineRef = useRef<AudioEngine | null>(null)
  if (engineRef.current === null) {
    const engine = new AudioEngine()
    engine.getState = () => stateRef.current
    engine.onStep = (step) => setState((s) => (s.currentStep === step ? s : { ...s, currentStep: step }))
    engineRef.current = engine
  }
  const engine = engineRef.current

  useEffect(() => () => engine.dispose(), [engine])

  // Preload the drum tracks' default samples (falls back to synth until ready).
  useEffect(() => {
    for (const d of stateRef.current.drums) {
      const snd = soundById(d.sound)
      if (snd) void engine.loadSample(snd.url)
    }
  }, [engine])

  const togglePlay = useCallback(() => {
    setState((s) => {
      if (s.playing) {
        engine.stop()
        return { ...s, playing: false, currentStep: -1 }
      }
      void engine.start()
      return { ...s, playing: true }
    })
  }, [engine])

  const setBpm = useCallback((bpm: number) => {
    setState((s) => ({ ...s, bpm: Math.round(bpm) }))
  }, [])

  const setSwing = useCallback((swing: number) => {
    setState((s) => ({ ...s, swing }))
  }, [])

  const setMasterVolume = useCallback(
    (v: number) => {
      engine.setMasterVolume(v)
      setState((s) => ({ ...s, masterVolume: v }))
    },
    [engine],
  )

  const toggleDrumStep = useCallback((id: DrumVoiceId, step: number) => {
    setState((s) => ({
      ...s,
      drums: s.drums.map((d) =>
        d.id === id ? { ...d, steps: d.steps.map((on, i) => (i === step ? !on : on)) } : d,
      ),
    }))
  }, [])

  const setSynthStep = useCallback((step: number, note: number) => {
    setState((s) => ({
      ...s,
      synth: { ...s.synth, steps: s.synth.steps.map((n, i) => (i === step ? note : n)) },
    }))
  }, [])

  const setDrumSound = useCallback(
    (id: DrumVoiceId, soundId: string) => {
      const snd = soundById(soundId)
      if (snd) void engine.loadSample(snd.url)
      setState((s) => ({
        ...s,
        drums: s.drums.map((d) => (d.id === id ? { ...d, sound: soundId } : d)),
      }))
    },
    [engine],
  )

  const setKit = useCallback(
    (kitName: string) => {
      const kit = kitByName(kitName)
      if (!kit) return
      for (const id of Object.values(kit.sounds)) {
        const snd = soundById(id)
        if (snd) void engine.loadSample(snd.url)
      }
      setState((s) => ({
        ...s,
        drums: s.drums.map((d) => ({ ...d, sound: kit.sounds[d.id] ?? d.sound })),
      }))
    },
    [engine],
  )

  const setDrumMixer = useCallback(
    (id: DrumVoiceId, patch: Partial<MixerSettings>) => {
      setState((s) => {
        const drums = s.drums.map((d) =>
          d.id === id ? { ...d, mixer: { ...d.mixer, ...patch } } : d,
        )
        engine.setChannelMixer(id, drums.find((d) => d.id === id)!.mixer)
        return { ...s, drums }
      })
    },
    [engine],
  )

  const setSynthMixer = useCallback(
    (patch: Partial<MixerSettings>) => {
      setState((s) => {
        const mixer = { ...s.synth.mixer, ...patch }
        engine.setChannelMixer('synth', mixer)
        return { ...s, synth: { ...s.synth, mixer } }
      })
    },
    [engine],
  )

  const setSynthParam = useCallback(
    <K extends keyof SynthTrack>(key: K, value: SynthTrack[K]) => {
      setState((s) => ({ ...s, synth: { ...s.synth, [key]: value } }))
    },
    [],
  )

  const setEffect = useCallback(
    (patch: Partial<EffectSettings>) => {
      setState((s) => {
        const effects = { ...s.effects, ...patch }
        engine.setEffects(effects)
        return { ...s, effects }
      })
    },
    [engine],
  )

  const clearDrums = useCallback(() => {
    setState((s) => ({
      ...s,
      drums: s.drums.map((d) => ({ ...d, steps: d.steps.map(() => false) })),
    }))
  }, [])

  const clearSynth = useCallback(() => {
    setState((s) => ({ ...s, synth: { ...s.synth, steps: s.synth.steps.map(() => -1) } }))
  }, [])

  const previewSynth = useCallback((midi: number) => engine.previewSynth(midi), [engine])
  const previewDrum = useCallback((id: DrumVoiceId) => engine.previewDrum(id), [engine])

  return {
    state,
    actions: {
      togglePlay,
      setBpm,
      setSwing,
      setMasterVolume,
      toggleDrumStep,
      setSynthStep,
      setDrumSound,
      setKit,
      setDrumMixer,
      setSynthMixer,
      setSynthParam,
      setEffect,
      clearDrums,
      clearSynth,
      previewSynth,
      previewDrum,
    },
  }
}

export type GrooveboxActions = ReturnType<typeof useGroovebox>['actions']
