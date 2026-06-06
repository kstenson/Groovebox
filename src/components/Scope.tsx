import { useEffect, useRef } from 'react'

interface ScopeProps {
  /** Returns the analyser to read, or null before audio has started. */
  getAnalyser: () => AnalyserNode | null
  colors?: [string, string, string]
}

/** A gradient oscilloscope drawn from an AnalyserNode's time-domain data. */
export function Scope({ getAnalyser, colors = ['#3da5ff', '#4cd07d', '#ff7a3d'] }: ScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Centre line.
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      const analyser = getAnalyser()
      if (!analyser) return
      const buf = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(buf)

      const grad = ctx.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0, colors[0])
      grad.addColorStop(0.5, colors[1])
      grad.addColorStop(1, colors[2])
      ctx.strokeStyle = grad
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let i = 0; i < buf.length; i++) {
        const x = (i / (buf.length - 1)) * width
        const y = (buf[i] / 255) * height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [getAnalyser, colors])

  return <canvas ref={canvasRef} width={640} height={220} />
}
