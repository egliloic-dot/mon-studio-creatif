import { useState, useCallback, useRef } from 'react'
import type { CanvasTransform } from '../types/canvas'

const MIN_SCALE = 0.1
const MAX_SCALE = 20

export function useCanvasTransform() {
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 })
  // Ref for hot-path checks (mousemove), state for cursor re-renders
  const isPanning = useRef(false)
  const [isPanningVisual, setIsPanningVisual] = useState(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  const handleWheel = useCallback((e: WheelEvent, stageEl: HTMLDivElement | null) => {
    e.preventDefault()
    if (!stageEl) return

    const rect = stageEl.getBoundingClientRect()
    const pointerX = e.clientX - rect.left
    const pointerY = e.clientY - rect.top

    setTransform(prev => {
      // Logarithmic zoom — feel constant regardless of scale level
      const factor = Math.pow(1.002, -e.deltaY)
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
      const ratio = newScale / prev.scale

      return {
        scale: newScale,
        x: pointerX - (pointerX - prev.x) * ratio,
        y: pointerY - (pointerY - prev.y) * ratio,
      }
    })
  }, [])

  const startPan = useCallback((x: number, y: number) => {
    isPanning.current = true
    setIsPanningVisual(true)
    lastPointer.current = { x, y }
  }, [])

  const updatePan = useCallback((x: number, y: number) => {
    if (!isPanning.current) return
    const dx = x - lastPointer.current.x
    const dy = y - lastPointer.current.y
    lastPointer.current = { x, y }
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const endPan = useCallback(() => {
    isPanning.current = false
    setIsPanningVisual(false)
  }, [])

  const fitToScreen = useCallback((imageW: number, imageH: number, stageW: number, stageH: number) => {
    const scale = Math.min(stageW / imageW, stageH / imageH) * 0.85
    setTransform({
      scale,
      x: (stageW - imageW * scale) / 2,
      y: (stageH - imageH * scale) / 2,
    })
  }, [])

  const resetView = useCallback((imageW: number, imageH: number, stageW: number, stageH: number) => {
    fitToScreen(imageW, imageH, stageW, stageH)
  }, [fitToScreen])

  return {
    transform,
    isPanning,
    isPanningVisual,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    fitToScreen,
    resetView,
  }
}
