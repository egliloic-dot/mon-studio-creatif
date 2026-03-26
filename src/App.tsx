import { useState, useRef, useCallback, useEffect } from 'react'
import Konva from 'konva'
import { motion, AnimatePresence } from 'framer-motion'
import { CanvasStage } from './components/CanvasStage'
import { Toolbar } from './components/Toolbar'
import { RightPanel } from './components/RightPanel'
import { ZoomIndicator } from './components/ZoomIndicator'
import { DropZone } from './components/DropZone'
import { CropOverlay } from './components/CropOverlay'
import { UndoRedoBar } from './components/UndoRedoBar'
import type { CropRect } from './components/CropOverlay'
import { useCanvasTransform } from './hooks/useCanvasTransform'
import { useHistory } from './hooks/useHistory'
import { TopBar } from './components/TopBar'
import { ExportModal } from './components/ExportModal'
import type { Layer, ImageLayer, TextLayer, DrawLayer, ShapeLayer, Adjustments, BlendMode, Tool } from './types/canvas'
import { DEFAULT_ADJUSTMENTS, DEFAULT_TEXT_LAYER } from './types/canvas'

/* ── localStorage persistence ────────────────────────────────────── */

const STORAGE_KEY = 'pixel-modern-scene-v1'

function getInitialLayers(): Layer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const { layers } = JSON.parse(raw) as { layers: Layer[] }
    if (!Array.isArray(layers)) return []
    // Ensure all layers have required fields (backward compat)
    return layers.map(l => ({ locked: false, scaleX: 1, scaleY: 1, rotation: 0, ...l }))
  } catch {
    return []
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const stageRef      = useRef<Konva.Stage>(null)
  const layersRef      = useRef<Layer[]>([])  // live mirror for unmount cleanup
  const clipboardRef   = useRef<Layer | null>(null)
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [size, setSize]                       = useState({ width: window.innerWidth, height: window.innerHeight })
  const [activeTool, setActiveTool]           = useState<Tool>('select')
  const [selectedIds, setSelectedIds]         = useState<string[]>([])
  const [hoveredLayerId, setHoveredLayerId]   = useState<string | null>(null)
  const [isDragging, setIsDragging]           = useState(false)
  const [brushColor, setBrushColor]           = useState('#000000')
  const [brushSize, setBrushSize]             = useState(5)
  const [page, setPage] = useState({ width: 1080, height: 1080, fill: '#ffffff' })
  const [toastMsg, setToastMsg]               = useState<string | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportThumbnail, setExportThumbnail] = useState<string | null>(null)

  // Single-select helpers (derived)
  const activeLayerId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedIdsRef = useRef<string[]>([])
  selectedIdsRef.current = selectedIds
  const pageRef = useRef({ width: 1080, height: 1080, fill: '#ffffff' })
  pageRef.current = page

  // useState lazy-init ensures getInitialLayers() runs exactly once
  const [savedLayers] = useState<Layer[]>(getInitialLayers)
  const {
    layers, liveUpdate, push: _pushHistory, undo, redo, jumpTo,
    canUndo, canRedo,
    pastSnapshots, currentSnapshot: histCurrentSnapshot, pastCount,
  } = useHistory(savedLayers)

  layersRef.current = layers  // always up to date

  const activeLayer = layers.find(l => l.id === activeLayerId) ?? null
  const cropActive  = activeTool === 'crop' && activeLayer?.type === 'image'

  const {
    transform, isPanning, isPanningVisual,
    handleWheel, startPan, updatePan, endPan,
    fitToScreen, resetView,
  } = useCanvasTransform()

  // Always-current transform ref (for use inside stable callbacks)
  const transformRef = useRef(transform)
  transformRef.current = transform

  /** Captures a small thumbnail of the current artboard state. */
  const captureStageSnapshot = useCallback((): string | null => {
    const stage = stageRef.current
    if (!stage) return null
    const sc = transformRef.current.scale
    const pg = pageRef.current
    try {
      stage.getLayers().forEach(l => l.batchDraw())
      return stage.toDataURL({
        x: transformRef.current.x,
        y: transformRef.current.y,
        width:  pg.width  * sc,
        height: pg.height * sc,
        pixelRatio: Math.min(0.15 / sc, 0.5),
      })
    } catch {
      return null
    }
  }, [])

  /** Commit layers to history, automatically capturing a snapshot first. */
  const commitLayers = useCallback((next: Layer[]) => {
    const snap = captureStageSnapshot()
    _pushHistory(next, snap)
  }, [_pushHistory, captureStageSnapshot])

  // Track container size
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setSize({ width: e.contentRect.width, height: e.contentRect.height })
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Revoke all image Object URLs on unmount
  useEffect(() => () => {
    layersRef.current.forEach(l => {
      if (l.type === 'image' && l.src.startsWith('blob:')) URL.revokeObjectURL(l.src)
    })
  }, [])

  // Center view on page on mount
  useEffect(() => {
    fitToScreen(page.width, page.height, window.innerWidth, window.innerHeight)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced save to localStorage (1.5 s after last change)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const serialized = await Promise.all(layers.map(async layer => {
          if (layer.type !== 'image' || layer.src.startsWith('data:')) return layer
          try {
            const res  = await fetch(layer.src)
            const blob = await res.blob()
            const dataUrl = await new Promise<string>(resolve => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            return { ...layer, src: dataUrl }
          } catch { return layer }
        }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ layers: serialized }))
      } catch {
        // localStorage full or disabled — fail silently
      }
    }, 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [layers])

  /* ── Image loading ─────────────────────────────────────────────── */

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(jpeg|png)/)) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const isFirst = layersRef.current.length === 0
      const imgCount = layersRef.current.filter(l => l.type === 'image').length
      const newLayer: ImageLayer = {
        type: 'image',
        id: crypto.randomUUID(),
        name: `Calque ${imgCount + 1}`,
        src: url,
        x: 0, y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        blendMode: 'source-over',
      }
      commitLayers([...layersRef.current, newLayer])
      setSelectedIds([newLayer.id])
      setActiveTool('select')
      if (isFirst) fitToScreen(img.naturalWidth, img.naturalHeight, size.width, size.height)
    }
    img.src = url
  }, [fitToScreen, size])

  /* ── Tool change — text tool creates a layer immediately ────────── */

  const handleToolChange = useCallback((tool: Tool) => {
    if (tool === 'crop' && activeLayer?.type !== 'image') return
    setActiveTool(tool)
  }, [activeLayer])

  /* ── Text preset creation ───────────────────────────────────────── */

  const handleAddText = useCallback(() => {
    const x = Math.round((size.width  / 2 - transform.x) / transform.scale)
    const y = Math.round((size.height / 2 - transform.y) / transform.scale)
    const textCount = layersRef.current.filter(l => l.type === 'text').length
    const newLayer: TextLayer = {
      ...DEFAULT_TEXT_LAYER,
      id: crypto.randomUUID(),
      name: `Texte ${textCount + 1}`,
      x, y,
    }
    commitLayers([...layersRef.current, newLayer])
    setSelectedIds([newLayer.id])
    setActiveTool('select')
  }, [size, transform, commitLayers])

  /* ── Brush stroke complete ──────────────────────────────────────── */

  const handleStrokeComplete = useCallback((points: number[]) => {
    const drawCount = layersRef.current.filter(l => l.type === 'draw').length
    const newLayer: DrawLayer = {
      type:        'draw',
      id:          crypto.randomUUID(),
      name:        `Dessin ${drawCount + 1}`,
      x:           0,
      y:           0,
      scaleX:      1,
      scaleY:      1,
      rotation:    0,
      points,
      stroke:      brushColor,
      strokeWidth: brushSize,
      opacity:     1,
      visible:     true,
      locked:      false,
      blendMode:   'source-over',
      tension:     0.5,
    }
    commitLayers([...layersRef.current, newLayer])
    setSelectedIds([newLayer.id])
  }, [brushColor, brushSize, commitLayers])

  /* ── Shape creation ────────────────────────────────────────────── */

  const handleAddShape = useCallback((shapeType: 'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'heart') => {
    const pg = pageRef.current
    const cx = pg.width  / 2
    const cy = pg.height / 2
    const S  = 160
    const shapeCount = layersRef.current.filter(l => l.type === 'shape').length
    // circle, triangle, star are center-based; rect, arrow, heart are top-left based
    const isCentered = shapeType === 'circle' || shapeType === 'triangle' || shapeType === 'star'
    const name = shapeType === 'rect'     ? `Rectangle ${shapeCount + 1}`
               : shapeType === 'circle'   ? `Cercle ${shapeCount + 1}`
               : shapeType === 'triangle' ? `Triangle ${shapeCount + 1}`
               : shapeType === 'star'     ? `Étoile ${shapeCount + 1}`
               : shapeType === 'arrow'    ? `Flèche ${shapeCount + 1}`
               :                           `Cœur ${shapeCount + 1}`
    const newLayer: ShapeLayer = {
      type:        'shape',
      id:          crypto.randomUUID(),
      name,
      shapeType,
      x:           isCentered ? cx : cx - S / 2,
      y:           isCentered ? cy : cy - S / 2,
      width:       S,
      height:      S,
      rotation:    0,
      scaleX:      1,
      scaleY:      1,
      fill:        '#7c3aed',
      stroke:      'transparent',
      strokeWidth: 0,
      opacity:     1,
      visible:     true,
      locked:      false,
      blendMode:   'source-over',
    }
    commitLayers([...layersRef.current, newLayer])
    setSelectedIds([newLayer.id])
    setActiveTool('select')
  }, [commitLayers])

  /* ── Per-layer adjustments (image layers only) ─────────────────── */

  /* ── Adjustments — live during drag, commit on release ─────────── */

  const handleAdjustmentsChange = useCallback((next: Adjustments) => {
    liveUpdate(layersRef.current.map(l =>
      l.id === activeLayerId && l.type === 'image' ? { ...l, adjustments: next } : l
    ))
  }, [activeLayerId, liveUpdate])

  const handleAdjustmentsCommit = useCallback((next: Adjustments) => {
    commitLayers(layersRef.current.map(l =>
      l.id === activeLayerId && l.type === 'image' ? { ...l, adjustments: next } : l
    ))
  }, [activeLayerId, commitLayers])

  /* ── Generic layer update (drag end, transform end, text props) ── */

  const handleLayerUpdate = useCallback((id: string, updates: Record<string, unknown>) => {
    commitLayers(layersRef.current.map(l => l.id === id ? { ...l, ...updates } as Layer : l))
  }, [commitLayers])

  /* ── Live layer update (no history — used by TopBar sliders) ─────── */

  const handleLiveLayerUpdate = useCallback((id: string, updates: Record<string, unknown>) => {
    liveUpdate(layersRef.current.map(l => l.id === id ? { ...l, ...updates } as Layer : l))
  }, [liveUpdate])

  /* ── Layer management ──────────────────────────────────────────── */

  const handleToggleVisibility = useCallback((id: string) => {
    commitLayers(layersRef.current.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [commitLayers])

  const handleChangeOpacity = useCallback((id: string, opacity: number) => {
    liveUpdate(layersRef.current.map(l => l.id === id ? { ...l, opacity } : l))
  }, [liveUpdate])

  const handleCommitOpacity = useCallback((id: string, opacity: number) => {
    commitLayers(layersRef.current.map(l => l.id === id ? { ...l, opacity } : l))
  }, [commitLayers])

  const handleChangeBlendMode = useCallback((id: string, blendMode: BlendMode) => {
    commitLayers(layersRef.current.map(l => l.id === id ? { ...l, blendMode } : l))
  }, [commitLayers])

  const handleDeleteLayer = useCallback((id?: string) => {
    // If called with a specific id, delete just that one.
    // If called without (or from keyboard Delete), delete all currently selected.
    const idsToDelete = id ? [id] : selectedIdsRef.current
    if (idsToDelete.length === 0) return
    const remaining = layersRef.current.filter(l => !idsToDelete.includes(l.id))
    commitLayers(remaining)
    setSelectedIds(prev => {
      const next = prev.filter(x => !idsToDelete.includes(x))
      if (next.length > 0) return next
      return remaining.length > 0 ? [remaining[remaining.length - 1].id] : []
    })
  }, [commitLayers])

  const handleReorderLayers = useCallback((newLayers: Layer[]) => {
    commitLayers(newLayers)
  }, [commitLayers])

  const handleRenameLayer = useCallback((id: string, name: string) => {
    commitLayers(layersRef.current.map(l => l.id === id ? { ...l, name } : l))
  }, [commitLayers])

  const handleLockLayer = useCallback((id: string) => {
    commitLayers(layersRef.current.map(l => l.id === id ? { ...l, locked: !l.locked } : l))
  }, [commitLayers])

  const handleMoveLayerUp = useCallback((id: string) => {
    const ls = layersRef.current
    const idx = ls.findIndex(l => l.id === id)
    if (idx >= ls.length - 1) return
    const next = [...ls]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    commitLayers(next)
  }, [commitLayers])

  const handleMoveLayerDown = useCallback((id: string) => {
    const ls = layersRef.current
    const idx = ls.findIndex(l => l.id === id)
    if (idx <= 0) return
    const next = [...ls]
    ;[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
    commitLayers(next)
  }, [commitLayers])

  /* ── Tout effacer ──────────────────────────────────────────────── */

  const handleClearAll = useCallback(() => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir tout effacer ? Cette action est irréversible.')
    if (!confirmed) return
    commitLayers([])
    setSelectedIds([])
  }, [commitLayers])

  /* ── Undo / Redo ────────────────────────────────────────────────── */

  const handleUndo = useCallback(() => {
    const prev = undo()
    if (prev) setSelectedIds(ids => ids.filter(id => prev.some(l => l.id === id)))
  }, [undo])

  const handleRedo = useCallback(() => {
    const next = redo()
    if (next) setSelectedIds(ids => ids.filter(id => next.some(l => l.id === id)))
  }, [redo])

  const handleJumpTo = useCallback((stepsBack: number) => {
    const prev = jumpTo(stepsBack)
    if (prev) {
      setSelectedIds(ids => ids.filter(id => prev.some(l => l.id === id)))
      requestAnimationFrame(() => {
        stageRef.current?.getLayers().forEach(l => l.batchDraw())
      })
    }
  }, [jumpTo])

  /* ── Multi-select handlers ─────────────────────────────────────── */

  const handleSelectLayer = useCallback((id: string, addToSelection = false) => {
    setSelectedIds(prev => {
      if (addToSelection) {
        return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      }
      return [id]
    })
  }, [])

  const handleSelectLayers = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const handleMultiLayerUpdate = useCallback((
    updates: { id: string; x: number; y: number; scaleX?: number; scaleY?: number; rotation?: number }[]
  ) => {
    commitLayers(layersRef.current.map(l => {
      const upd = updates.find(u => u.id === l.id)
      return upd ? { ...l, ...upd } as Layer : l
    }))
  }, [commitLayers])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod      = e.ctrlKey || e.metaKey
      const key      = e.key.toLowerCase()
      const activeEl = document.activeElement
      const tag      = activeEl?.tagName ?? ''
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl as HTMLElement | null)?.isContentEditable === true

      // Delete / Backspace — remove all selected layers (skip when typing)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping && selectedIdsRef.current.length > 0) {
        e.preventDefault()
        handleDeleteLayer()
        return
      }

      // Ctrl+C — copy active layer
      if (mod && key === 'c' && !isTyping && activeLayerId) {
        const layer = layersRef.current.find(l => l.id === activeLayerId)
        if (layer) clipboardRef.current = layer
        return
      }

      // Ctrl+V — paste (duplicate with +20px offset)
      if (mod && key === 'v' && !isTyping) {
        const clip = clipboardRef.current
        if (!clip) return
        e.preventDefault()
        const pasted: Layer = {
          ...clip,
          id:   crypto.randomUUID(),
          name: clip.name + ' copie',
          x:    clip.x + 20,
          y:    clip.y + 20,
        }
        commitLayers([...layersRef.current, pasted])
        setSelectedIds([pasted.id])
        return
      }

      // Ctrl+Z / Ctrl+Shift+Z — undo / redo (allowed even while typing)
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else            handleUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeLayerId, handleUndo, handleRedo, handleDeleteLayer, commitLayers, selectedIds])

  /* ── Toast ─────────────────────────────────────────────────────── */

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  /* ── Export ────────────────────────────────────────────────────── */

  const handleExport = useCallback(async (format: 'png' | 'jpg' | 'pdf', quality = 0.92): Promise<void> => {
    const stage = stageRef.current
    if (!stage) throw new Error('Stage Konva non disponible.')

    const pg = pageRef.current
    const W  = pg.width
    const H  = pg.height
    const sc = transform.scale

    // Garde-fou mémoire
    if (W * H * 4 > 200_000_000) {
      throw new Error(
        `Artboard trop grand pour l'export (${Math.round(W * H * 4 / 1_000_000)} MP). ` +
        `Réduisez les dimensions dans le menu Format.`
      )
    }

    // ── 1. Vider et masquer tous les Transformers (cadres de sélection)
    const konvaTransformers = stage.find('Transformer') as Konva.Transformer[]
    konvaTransformers.forEach(tr => {
      tr.nodes([])       // équivalent de transformerRef.current.nodes([])
      tr.visible(false)
    })
    stage.batchDraw()    // demande un redraw au navigateur

    // ── 2. Délai 100ms — laisse le navigateur effacer visuellement
    //    les cadres avant la capture (setTimeout garanti)
    await new Promise<void>(resolve => setTimeout(resolve, 100))

    // ── 3. Capture de l'artboard (cadres absents du canvas à ce stade)
    const dataUrl = stage.toDataURL({
      x: transform.x,
      y: transform.y,
      width:  W * sc,
      height: H * sc,
      pixelRatio: 2 / sc,
    })

    const dl = (url: string, name: string) => {
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
    }

    // ── 4. Génération et téléchargement du fichier ────────────────────
    //    La restauration a lieu dans le bloc `finally`, APRÈS le download.
    try {
      if (format === 'png') {
        dl(dataUrl, 'mon-design.png')
        showToast('PNG exporté ✓')

      } else if (format === 'jpg') {
        // Compositer sur fond blanc pour JPEG (pas de canal alpha)
        const img = new Image()
        img.src = dataUrl
        await new Promise<void>(r => { img.onload = () => r() })
        const c = document.createElement('canvas')
        c.width  = W * 2
        c.height = H * 2
        const ctx = c.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0)
        dl(c.toDataURL('image/jpeg', quality), 'mon-design.jpg')
        c.width = 0; c.height = 0
        showToast('JPEG exporté ✓')

      } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf')
        const orientation = W >= H ? 'landscape' : 'portrait'
        const pdf = new jsPDF({ orientation, unit: 'px', format: [W, H] })
        pdf.addImage(dataUrl, 'PNG', 0, 0, W, H)
        pdf.save('design.pdf')
        showToast('PDF exporté ✓')
      }
    } finally {
      // ── 5. Restauration des Transformers APRÈS le téléchargement ─────
      //    Toujours exécuté, même en cas d'erreur.
      konvaTransformers.forEach(tr => tr.visible(true))
      stage.batchDraw()
    }
  }, [showToast, transform])

  /* ── Crop (image layers only) ──────────────────────────────────── */

  const applyCrop = useCallback((cropRect: CropRect) => {
    if (!activeLayer || activeLayer.type !== 'image') return

    const el = new window.Image()
    el.onload = () => {
      const w = Math.max(1, Math.round(cropRect.w))
      const h = Math.max(1, Math.round(cropRect.h))

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(el, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, w, h)

      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        commitLayers(layersRef.current.map(l =>
          l.id === activeLayer.id && l.type === 'image'
            ? { ...l, src: url, x: 0, y: 0, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 }
            : l
        ))
        fitToScreen(w, h, size.width, size.height)
        setActiveTool('select')
      }, 'image/png')
    }
    el.src = activeLayer.src
  }, [activeLayer, fitToScreen, size])

  const cancelCrop = useCallback(() => setActiveTool('select'), [])

  /* ── File drop / drag ──────────────────────────────────────────── */

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadImageFile(file)
  }, [loadImageFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImageFile(file)
    e.target.value = ''
  }, [loadImageFile])

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-studio-bg select-none overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Canvas */}
      <CanvasStage
        layers={layers}
        activeLayerId={activeLayerId}
        selectedIds={selectedIds}
        page={page}
        width={size.width}
        height={size.height}
        transform={transform}
        isPanningVisual={isPanningVisual}
        cropActive={cropActive}
        stageRef={stageRef}
        onWheel={handleWheel}
        onPanStart={startPan}
        onPanUpdate={updatePan}
        onPanEnd={endPan}
        isPanning={isPanning}
        onLayerUpdate={handleLayerUpdate}
        onSelectLayer={handleSelectLayer}
        onSelectLayers={handleSelectLayers}
        onDeselectAll={() => setSelectedIds([])}
        onMultiLayerUpdate={handleMultiLayerUpdate}
        activeTool={activeTool}
        brushColor={brushColor}
        brushSize={brushSize}
        onStrokeComplete={handleStrokeComplete}
        hoveredLayerId={hoveredLayerId}
      />

      {/* Crop overlay — image layers only */}
      <AnimatePresence>
        {cropActive && activeLayer?.type === 'image' && (
          <CropOverlay
            key="crop"
            image={activeLayer}
            transform={transform}
            containerWidth={size.width}
            containerHeight={size.height}
            onConfirm={applyCrop}
            onCancel={cancelCrop}
            onWheel={handleWheel}
          />
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onOpenFile={() => fileInputRef.current?.click()}
        onExportOpen={() => {
          const stage = stageRef.current
          if (stage) {
            const sc = transform.scale
            const pg = pageRef.current
            stage.getLayers().forEach(l => l.batchDraw())
            try {
              const thumb = stage.toDataURL({
                x: transform.x, y: transform.y,
                width: pg.width * sc, height: pg.height * sc,
                pixelRatio: Math.min(0.3 / sc, 1),
              })
              setExportThumbnail(thumb)
            } catch { setExportThumbnail(null) }
          }
          setExportModalOpen(true)
        }}
        onAddShape={handleAddShape}
        onAddText={handleAddText}
        onClearAll={handleClearAll}
      />

      {/* Contextual top bar */}
      <TopBar
        activeLayer={activeLayer}
        selectedCount={selectedIds.length}
        page={page}
        onPageChange={setPage}
        onUpdate={handleLayerUpdate}
        onLiveUpdate={handleLiveLayerUpdate}
      />

      {/* Undo / Redo bar */}
      <UndoRedoBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onJumpTo={handleJumpTo}
        pastSnapshots={pastSnapshots}
        currentSnapshot={histCurrentSnapshot}
        pastCount={pastCount}
      />

      {/* Unified right panel — hidden during crop */}
      {!cropActive && (
        <RightPanel
          layers={layers}
          activeLayerId={activeLayerId}
          activeTool={activeTool}
          onSelectLayer={id => handleSelectLayer(id, false)}
          onToggleVisibility={handleToggleVisibility}
          onChangeOpacity={handleChangeOpacity}
          onCommitOpacity={handleCommitOpacity}
          onChangeBlendMode={handleChangeBlendMode}
          onDeleteLayer={handleDeleteLayer}
          onReorderLayers={handleReorderLayers}
          onRenameLayer={handleRenameLayer}
          onLockLayer={handleLockLayer}
          onMoveLayerUp={handleMoveLayerUp}
          onMoveLayerDown={handleMoveLayerDown}
          onHoverLayer={setHoveredLayerId}
          onChangeAdjustments={handleAdjustmentsChange}
          onCommitAdjustments={handleAdjustmentsCommit}
          onChangeText={updates => activeLayer ? handleLayerUpdate(activeLayer.id, updates as Record<string, unknown>) : undefined}
          onLiveChangeText={updates => activeLayer ? liveUpdate(layersRef.current.map(l => l.id === activeLayer.id ? { ...l, ...updates } as Layer : l)) : undefined}
          brushColor={brushColor}
          brushSize={brushSize}
          onBrushColorChange={setBrushColor}
          onBrushSizeChange={setBrushSize}
          onDrawLayerUpdate={(updates) => activeLayer ? handleLayerUpdate(activeLayer.id, updates as Record<string, unknown>) : undefined}
        />
      )}

      {/* Zoom indicator — shows image dimensions for image layers */}
      {!cropActive && (
        <ZoomIndicator
          scale={transform.scale}
          image={activeLayer?.type === 'image'
            ? { width: activeLayer.width, height: activeLayer.height }
            : null}
          stageSize={size}
          onReset={resetView}
        />
      )}

      <DropZone isDragging={isDragging} />

      {/* Export toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: 'rgba(22,22,26,0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,58,237,0.15)',
              color: '#c4b5fd',
              fontSize: 13,
              fontWeight: 600,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        page={page}
        layerCount={layers.length}
        thumbnail={exportThumbnail}
      />
    </div>
  )
}
