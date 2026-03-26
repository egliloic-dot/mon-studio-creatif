import { motion } from 'framer-motion'
import type { Layer, TextLayer, Adjustments, BlendMode, Tool } from '../types/canvas'
import { LayersList } from './LayersList'
import { AdjustmentPanels } from './AdjustmentPanels'

/* ── Props ───────────────────────────────────────────────────────── */

export interface RightPanelProps {
  layers: Layer[]
  activeLayerId: string | null
  activeTool: Tool
  onSelectLayer: (id: string) => void
  onToggleVisibility: (id: string) => void
  onChangeOpacity: (id: string, opacity: number) => void
  onCommitOpacity: (id: string, opacity: number) => void
  onChangeBlendMode: (id: string, blendMode: BlendMode) => void
  onDeleteLayer: (id: string) => void
  onReorderLayers: (newLayers: Layer[]) => void
  onRenameLayer: (id: string, name: string) => void
  onLockLayer: (id: string) => void
  onMoveLayerUp: (id: string) => void
  onMoveLayerDown: (id: string) => void
  onHoverLayer: (id: string | null) => void
  onChangeAdjustments: (next: Adjustments) => void
  onCommitAdjustments: (next: Adjustments) => void
  onChangeText: (updates: Partial<TextLayer>) => void
  onLiveChangeText?: (updates: Partial<TextLayer>) => void
  brushColor: string
  brushSize: number
  onBrushColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onDrawLayerUpdate: (updates: Record<string, unknown>) => void
}

/* ── RightPanel ──────────────────────────────────────────────────── */

export function RightPanel({
  layers, activeLayerId, activeTool,
  onSelectLayer, onToggleVisibility, onChangeOpacity, onCommitOpacity,
  onChangeBlendMode, onDeleteLayer, onReorderLayers, onRenameLayer,
  onLockLayer, onMoveLayerUp, onMoveLayerDown, onHoverLayer,
  onChangeAdjustments, onCommitAdjustments, onChangeText, onLiveChangeText,
  brushColor, brushSize, onBrushColorChange, onBrushSizeChange, onDrawLayerUpdate,
}: RightPanelProps) {
  const activeLayer = layers.find(l => l.id === activeLayerId) ?? null

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-4 top-4 z-20 rounded-2xl"
      style={{
        width: 280,
        maxHeight: 'calc(100dvh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(12,12,14,0.84)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 2px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      {/* ── Layers list (always visible) ── */}
      <LayersList
        layers={layers}
        activeLayerId={activeLayerId}
        onSelectLayer={onSelectLayer}
        onToggleVisibility={onToggleVisibility}
        onChangeOpacity={onChangeOpacity}
        onCommitOpacity={onCommitOpacity}
        onChangeBlendMode={onChangeBlendMode}
        onDeleteLayer={onDeleteLayer}
        onReorderLayers={onReorderLayers}
        onRenameLayer={onRenameLayer}
        onLockLayer={onLockLayer}
        onMoveLayerUp={onMoveLayerUp}
        onMoveLayerDown={onMoveLayerDown}
        onHoverLayer={onHoverLayer}
      />

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {/* ── Adjustments (placeholder when nothing selected) ── */}
      <AdjustmentPanels
        activeLayer={activeLayer}
        activeTool={activeTool}
        onChangeAdjustments={onChangeAdjustments}
        onCommitAdjustments={onCommitAdjustments}
        onChangeText={onChangeText}
        onLiveChangeText={onLiveChangeText}
        brushColor={brushColor}
        brushSize={brushSize}
        onBrushColorChange={onBrushColorChange}
        onBrushSizeChange={onBrushSizeChange}
        onDrawLayerUpdate={onDrawLayerUpdate}
      />
    </motion.div>
  )
}
