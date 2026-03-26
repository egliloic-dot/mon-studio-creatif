import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import type { Layer, BlendMode } from '../types/canvas'

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply',    label: 'Multiplier' },
  { value: 'screen',      label: 'Écran' },
  { value: 'overlay',     label: 'Incrustation' },
  { value: 'darken',      label: 'Obscurcir' },
  { value: 'lighten',     label: 'Éclaircir' },
]

/* ─── Props ──────────────────────────────────────────────────────── */

interface LayersPanelProps {
  layers: Layer[]
  activeLayerId: string | null
  onSelectLayer: (id: string) => void
  onToggleVisibility: (id: string) => void
  onChangeOpacity: (id: string, opacity: number) => void
  onCommitOpacity: (id: string, opacity: number) => void
  onChangeBlendMode: (id: string, blendMode: BlendMode) => void
  onDeleteLayer: (id: string) => void
  onReorderLayers: (newLayers: Layer[]) => void
  onRenameLayer: (id: string, name: string) => void
}

interface LayerRowProps {
  layer: Layer
  isActive: boolean
  isEditing: boolean
  editValue: string
  onSelect: () => void
  onStartEdit: () => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onToggleVisibility: () => void
  onChangeOpacity: (v: number) => void
  onCommitOpacity: (v: number) => void
  onChangeBlendMode: (v: BlendMode) => void
  onDelete: () => void
}

/* ─── Icons ──────────────────────────────────────────────────────── */

function GripIcon() {
  return (
    <svg width="9" height="13" viewBox="0 0 9 13" fill="currentColor">
      <circle cx="2" cy="1.5" r="1.5" /><circle cx="7" cy="1.5" r="1.5" />
      <circle cx="2" cy="6.5" r="1.5" /><circle cx="7" cy="6.5" r="1.5" />
      <circle cx="2" cy="11.5" r="1.5" /><circle cx="7" cy="11.5" r="1.5" />
    </svg>
  )
}

function EyeOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

/* ─── LayerRow ───────────────────────────────────────────────────── */
/* Must be its own component so each row gets its own useDragControls */

function LayerRow({
  layer, isActive, isEditing, editValue,
  onSelect, onStartEdit, onEditChange, onEditCommit, onEditCancel,
  onToggleVisibility, onChangeOpacity, onCommitOpacity, onChangeBlendMode, onDelete,
}: LayerRowProps) {
  const controls = useDragControls()
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus + select-all when entering edit mode
  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  return (
    <Reorder.Item
      as="div"
      value={layer}
      dragControls={controls}
      dragListener={false}
      whileDrag={{
        opacity: 0.9,
        scale: 1.015,
        zIndex: 50,
        boxShadow: '0 6px 28px rgba(0,0,0,0.75)',
        background: 'rgba(124,58,237,0.2)',
      }}
      style={{ position: 'relative', userSelect: 'none' }}
    >
      {/* Left accent bar */}
      <motion.div
        animate={{
          background: isActive ? 'rgba(124,58,237,0.7)' : 'rgba(255,255,255,0)',
        }}
        transition={{ duration: 0.15 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 }}
      />

      {/* ── Main row ── */}
      <div
        className="flex items-center gap-1 cursor-pointer"
        style={{
          height: 36,
          paddingLeft: 6,
          paddingRight: 6,
          background: isActive ? 'rgba(124,58,237,0.08)' : 'transparent',
          transition: 'background 0.15s ease',
        }}
        onClick={isEditing ? undefined : onSelect}
      >
        {/* Grip handle — initiates drag */}
        <div
          onPointerDown={e => { e.stopPropagation(); controls.start(e) }}
          className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded"
          style={{ color: 'rgba(255,255,255,0.18)', cursor: 'grab', touchAction: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
          title="Glisser pour réorganiser"
        >
          <GripIcon />
        </div>

        {/* Layer type badge */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: 16 }}
        >
          {layer.type === 'text' ? (
            <span className="text-[10px] font-bold leading-none" style={{ color: 'rgba(167,139,250,0.65)' }}>T</span>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>

        {/* Eye toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggleVisibility() }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: layer.visible ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.13)' }}
          title={layer.visible ? 'Masquer' : 'Afficher'}
        >
          {layer.visible ? <EyeOpen /> : <EyeClosed />}
        </button>

        {/* Name — span OR inline input */}
        <div className="flex-1 min-w-0 px-0.5">
          {isEditing ? (
            <input
              ref={inputRef}
              autoFocus
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onClick={e => e.stopPropagation()}
              onBlur={onEditCommit}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter')  onEditCommit()
                if (e.key === 'Escape') onEditCancel()
              }}
              className="w-full bg-transparent text-[11px] font-medium outline-none"
              style={{
                color: 'rgba(255,255,255,0.92)',
                borderBottom: '1px solid rgba(124,58,237,0.7)',
                padding: '1px 2px',
                caretColor: '#a78bfa',
              }}
            />
          ) : (
            <span
              className="block text-[11px] font-medium truncate"
              style={{ color: isActive ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.38)' }}
              onDoubleClick={e => { e.stopPropagation(); onStartEdit() }}
              title="Double-clic pour renommer"
            >
              {layer.name}
            </span>
          )}
        </div>

        {/* Opacity % */}
        <span
          className="text-[10px] font-mono tabular-nums flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.2)', minWidth: 26, textAlign: 'right' }}
        >
          {Math.round(layer.opacity * 100)}%
        </span>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ml-0.5"
          style={{ color: 'rgba(255,255,255,0.15)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
          title="Supprimer le calque"
        >
          <TrashIcon />
        </button>
      </div>

      {/* ── Blend mode + Opacity (active layer only) ── */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col overflow-hidden"
            style={{
              paddingLeft: 10,
              paddingRight: 8,
              paddingBottom: 8,
              paddingTop: 4,
              background: 'rgba(124,58,237,0.05)',
              gap: 6,
            }}
          >
            {/* Blend mode row */}
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] uppercase tracking-wider flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.22)', width: 30 }}
              >
                Fusion
              </span>
              <div className="relative flex-1">
                <select
                  value={layer.blendMode}
                  onChange={e => onChangeBlendMode(e.target.value as BlendMode)}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-[10px] font-medium rounded-md outline-none appearance-none cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    padding: '3px 22px 3px 7px',
                    WebkitAppearance: 'none',
                  }}
                >
                  {BLEND_MODES.map(m => (
                    <option key={m.value} value={m.value} style={{ background: '#111', color: '#fff' }}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {/* Custom chevron */}
                <svg
                  width="8" height="8" viewBox="0 0 10 10" fill="none"
                  className="absolute pointer-events-none"
                  style={{ right: 6, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}
                >
                  <path d="M5 7L1 3h8L5 7z" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Opacity row */}
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] uppercase tracking-wider flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.22)', width: 30 }}
              >
                Opac.
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(layer.opacity * 100)}
                onChange={e => onChangeOpacity(Number(e.target.value) / 100)}
                onPointerUp={e => onCommitOpacity(Number((e.target as HTMLInputElement).value) / 100)}
                onClick={e => e.stopPropagation()}
                className="layer-opacity-range flex-1"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

/* ─── LayersPanel ────────────────────────────────────────────────── */

export function LayersPanel({
  layers, activeLayerId,
  onSelectLayer, onToggleVisibility, onChangeOpacity, onCommitOpacity, onChangeBlendMode, onDeleteLayer,
  onReorderLayers, onRenameLayer,
}: LayersPanelProps) {
  const [collapsed, setCollapsed]   = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')

  // Display reverse stack order: top of canvas stack first in the list
  const displayLayers = [...layers].reverse()

  const handleReorder = (newDisplay: ImageLayer[]) => {
    // Convert display order back to canvas order (bottom→top) for App state
    onReorderLayers([...newDisplay].reverse())
  }

  const startEdit = (layer: ImageLayer) => {
    setEditingId(layer.id)
    setEditValue(layer.name)
  }

  const commitEdit = (id: string) => {
    const trimmed = editValue.trim()
    if (trimmed) onRenameLayer(id, trimmed)
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-4 z-20 rounded-2xl"
      style={{
        bottom: 60,
        width: 240,
        background: 'rgba(8,8,8,0.72)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 12px 56px rgba(0,0,0,0.75), inset 0 0 0 0.5px rgba(255,255,255,0.04)',
        // overflow: visible so dragged items aren't clipped by the panel border-radius
        overflow: 'visible',
      }}
    >
      {/* ── Header (clips to top rounded corners) ── */}
      <div
        className="flex items-center px-4"
        style={{
          height: 44,
          borderBottom: collapsed || layers.length === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: layers.length === 0 || collapsed ? '16px' : '16px 16px 0 0',
          background: 'rgba(8,8,8,0.72)',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 group"
          title={collapsed ? 'Développer' : 'Réduire'}
        >
          <motion.svg
            animate={{ rotate: collapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            className="text-white/25 group-hover:text-white/50 transition-colors"
          >
            <path d="M5 7L1 3h8L5 7z" fill="currentColor" />
          </motion.svg>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Calques
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {layers.length}
          </span>
        </button>
      </div>

      {/* ── List (collapse animation, clips to bottom rounded corners) ── */}
      <motion.div
        animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{
          overflow: 'hidden',
          borderRadius: '0 0 16px 16px',
          background: 'rgba(8,8,8,0.72)',
        }}
      >
        {layers.length === 0 ? (
          <p className="text-center py-5 text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Aucun calque
          </p>
        ) : (
          <Reorder.Group
            as="div"
            axis="y"
            values={displayLayers}
            onReorder={handleReorder}
            style={{ maxHeight: 300, overflowY: 'auto', overflowX: 'hidden' }}
          >
            {displayLayers.map(layer => (
              <LayerRow
                key={layer.id}
                layer={layer}
                isActive={layer.id === activeLayerId}
                isEditing={editingId === layer.id}
                editValue={editValue}
                onSelect={() => onSelectLayer(layer.id)}
                onStartEdit={() => startEdit(layer)}
                onEditChange={setEditValue}
                onEditCommit={() => commitEdit(layer.id)}
                onEditCancel={cancelEdit}
                onToggleVisibility={() => onToggleVisibility(layer.id)}
                onChangeOpacity={v => onChangeOpacity(layer.id, v)}
                onCommitOpacity={v => onCommitOpacity(layer.id, v)}
                onChangeBlendMode={v => onChangeBlendMode(layer.id, v)}
                onDelete={() => onDeleteLayer(layer.id)}
              />
            ))}
          </Reorder.Group>
        )}
      </motion.div>
    </motion.div>
  )
}
