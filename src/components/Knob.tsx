import { useCallback, useRef } from 'react'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  /** Optional formatter for the readout. */
  format?: (v: number) => string
  onChange: (v: number) => void
  size?: number
}

const ANGLE_MIN = -135
const ANGLE_MAX = 135

/** A draggable rotary knob. Drag up/down to change; double-click logs value. */
export function Knob({ label, value, min, max, format, onChange, size = 46 }: KnobProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null)

  const norm = (value - min) / (max - min)
  const angle = ANGLE_MIN + norm * (ANGLE_MAX - ANGLE_MIN)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      dragRef.current = { startY: e.clientY, startValue: value }
    },
    [value],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      // Full range over ~200px of vertical travel; Shift for fine control.
      const span = max - min
      const sensitivity = e.shiftKey ? 600 : 200
      const delta = ((drag.startY - e.clientY) / sensitivity) * span
      const next = Math.min(max, Math.max(min, drag.startValue + delta))
      onChange(next)
    },
    [max, min, onChange],
  )

  const endDrag = useCallback(() => {
    dragRef.current = null
  }, [])

  const readout = format ? format(value) : value.toFixed(2)

  return (
    <div className="knob" style={{ width: size + 16 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="knob-dial"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <circle cx="50" cy="50" r="42" className="knob-body" />
        <circle
          cx="50"
          cy="50"
          r="42"
          className="knob-track"
          pathLength={100}
          strokeDasharray={`${norm * 75} 100`}
          transform="rotate(135 50 50)"
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="14"
          className="knob-pointer"
          transform={`rotate(${angle} 50 50)`}
        />
      </svg>
      <span className="knob-label">{label}</span>
      <span className="knob-value">{readout}</span>
    </div>
  )
}
