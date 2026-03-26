import { useState, useRef, useCallback } from 'react'
import type { Layer } from '../types/canvas'

const MAX_HISTORY = 15

export function useHistory(initial: Layer[]) {
  const [layers, setLayersState] = useState<Layer[]>(initial)

  const past      = useRef<Layer[][]>([])
  const future    = useRef<Layer[][]>([])
  const committed = useRef<Layer[]>(initial)

  // Parallel snapshot arrays (data URLs, null when not yet captured)
  const pastSnapshots    = useRef<(string | null)[]>([])
  const futureSnapshots  = useRef<(string | null)[]>([])
  const currentSnapshot  = useRef<string | null>(null)

  const [, setTick] = useState(0)
  const bump = useCallback(() => setTick(t => t + 1), [])

  /** Live display update — no history change. */
  const liveUpdate = useCallback((next: Layer[]) => {
    setLayersState(next)
  }, [])

  /**
   * Commit: push current committed state (+ its snapshot) to past,
   * record next as new committed. snapshot should be a capture of the
   * CURRENT stage state (taken just before this call).
   */
  const push = useCallback((next: Layer[], snapshot: string | null = null) => {
    past.current          = [...past.current, committed.current].slice(-MAX_HISTORY)
    pastSnapshots.current = [...pastSnapshots.current, snapshot].slice(-MAX_HISTORY)
    future.current        = []
    futureSnapshots.current = []
    committed.current     = next
    currentSnapshot.current = null  // unknown until next capture
    setLayersState(next)
    bump()
  }, [bump])

  /** Undo: restore the previous committed snapshot. */
  const undo = useCallback((): Layer[] | null => {
    if (past.current.length === 0) return null
    const prev      = past.current[past.current.length - 1]
    const prevSnap  = pastSnapshots.current[pastSnapshots.current.length - 1] ?? null

    // Move current → front of future (with its snapshot)
    future.current          = [committed.current, ...future.current]
    futureSnapshots.current = [currentSnapshot.current, ...futureSnapshots.current]

    // Pop from past
    past.current          = past.current.slice(0, -1)
    pastSnapshots.current = pastSnapshots.current.slice(0, -1)

    committed.current       = prev
    currentSnapshot.current = prevSnap
    setLayersState(prev)
    bump()
    return prev
  }, [bump])

  /** Redo: restore the next committed snapshot. */
  const redo = useCallback((): Layer[] | null => {
    if (future.current.length === 0) return null
    const next     = future.current[0]
    const nextSnap = futureSnapshots.current[0] ?? null

    // Move current → back of past (with its snapshot)
    past.current          = [...past.current, committed.current].slice(-MAX_HISTORY)
    pastSnapshots.current = [...pastSnapshots.current, currentSnapshot.current].slice(-MAX_HISTORY)

    // Pop from future
    future.current          = future.current.slice(1)
    futureSnapshots.current = futureSnapshots.current.slice(1)

    committed.current       = next
    currentSnapshot.current = nextSnap
    setLayersState(next)
    bump()
    return next
  }, [bump])

  /**
   * Jump directly to a past state (stepsBack steps before current).
   * stepsBack=1 is equivalent to undo(); stepsBack=N restores past[length-N].
   */
  const jumpTo = useCallback((stepsBack: number): Layer[] | null => {
    if (stepsBack <= 0 || stepsBack > past.current.length) return null

    const targetIdx  = past.current.length - stepsBack
    const target     = past.current[targetIdx]
    const targetSnap = pastSnapshots.current[targetIdx] ?? null

    // Build new future: [past[targetIdx+1..last], current, ...old future]
    const betweenStates = past.current.slice(targetIdx + 1)
    const betweenSnaps  = pastSnapshots.current.slice(targetIdx + 1)

    future.current          = [...betweenStates, committed.current, ...future.current]
    futureSnapshots.current = [...betweenSnaps, currentSnapshot.current, ...futureSnapshots.current]

    past.current          = past.current.slice(0, targetIdx)
    pastSnapshots.current = pastSnapshots.current.slice(0, targetIdx)

    committed.current       = target
    currentSnapshot.current = targetSnap
    setLayersState(target)
    bump()
    return target
  }, [bump])

  return {
    layers,
    liveUpdate,
    push,
    undo,
    redo,
    jumpTo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    // History dropdown data (read after re-render via bump)
    pastSnapshots:   pastSnapshots.current,
    currentSnapshot: currentSnapshot.current,
    pastCount:       past.current.length,
  }
}
