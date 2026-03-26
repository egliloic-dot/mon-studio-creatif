import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import type { Layer, BlendMode } from '../types/canvas'

/* ── Blend mode options ──────────────────────────────────────────── */

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply',    label: 'Multiplier' },
  { value: 'screen',      label: 'Écran' },
  { value: 'overlay',     label: 'Incrustation' },
  { value: 'darken',      label: 'Obscurcir' },
  { value: 'lighten',     label: 'Éclaircir' },
]

/* ── Icons ───────────────────────────────────────────────────────── */

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

function LockClosed() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function LockOpen() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
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

function ChevronUp() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/* ── LayerRow ─────────────────────────────────────────────────────── */

interface LayerRowProps {
  layer: Layer
  isActive: boolean
  isEditing: boolean
  editValue: string
  isFirst: boolean  // top of display (highest z-order)
  isLast: boolean   // bottom of display (lowest z-order)
  onSelect: () => void
  onStartEdit: () => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onChangeOpacity: (v: number) => void
  onCommitOpacity: (v: number) => void
  onChangeBlendMode: (v: BlendMode) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onHover: () => void
  onUnhover: () => void
}

function LayerRow({
  layer, isActive, isEditing, editValue, isFirst, isLast,
  onSelect, onStartEdit, onEditChange, onEditCommit, onEditCancel,
  onToggleVisibility, onToggleLock, onChangeOpacity, onCommitOpacity,
  onChangeBlendMode, onDelete, onMoveUp, onMoveDown, onHover, onUnhover,
}: LayerRowProps) {
  const controls = useDragControls()
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const isLocked = layer.locked

  return (
    <Reorder.Item
      as="div"
      value={layer}
      dragControls={controls}
      dragListener={false}
      whileDrag={{ opacity: 0.9, scale: 1.015, zIndex: 50, boxShadow: '0 6px 28px rgba(0,0,0,0.75)', background: 'rgba(124,58,237,0.2)' }}
      style={{ position: 'relative', userSelect: 'none' }}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
    >
      {/* Left accent bar */}
      <motion.div
        animate={{
          background: isActive ? 'rgba(139,92,246,0.95)' : 'rgba(255,255,255,0)',
          width: isActive ? 3 : 2,
        }}
        transition={{ duration: 0.18 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: '0 2px 2px 0' }}
      />

      {/* Main row */}
      <div
        className="flex items-center gap-1 cursor-pointer"
        style={{
          height: 36, paddingLeft: 6, paddingRight: 4,
          background: isActive
            ? 'rgba(109,70,220,0.16)'
            : isLocked ? 'rgba(255,200,50,0.03)' : 'transparent',
          boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.1)' : 'none',
          transition: 'background 0.18s ease, box-shadow 0.18s ease',
          opacity: isLocked ? 0.72 : 1,
        }}
        onClick={isEditing || isLocked ? undefined : onSelect}
      >
        {/* Grip */}
        <div
          onPointerDown={e => { if (!isLocked) { e.stopPropagation(); controls.start(e) } }}
          className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded"
          style={{ color: 'rgba(255,255,255,0.18)', cursor: isLocked ? 'default' : 'grab', touchAction: 'none' }}
          onMouseEnter={e => { if (!isLocked) (e.currentTarget.style.color = 'rgba(255,255,255,0.5)') }}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
          title={isLocked ? 'Calque verrouillé' : 'Glisser pour réorganiser'}
        >
          <GripIcon />
        </div>

        {/* Type badge */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 14 }}>
          {layer.type === 'text' ? (
            <span className="text-[10px] font-bold leading-none" style={{ color: 'rgba(167,139,250,0.65)' }}>T</span>
          ) : layer.type === 'draw' ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          ) : layer.type === 'shape' ? (
            layer.shapeType === 'circle' ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.65)" strokeWidth="2.2">
                <circle cx="12" cy="12" r="8" />
              </svg>
            ) : layer.shapeType === 'triangle' ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4L21 19H3L12 4z" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            )
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>

        {/* Eye */}
        <button
          onClick={e => { e.stopPropagation(); onToggleVisibility() }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: layer.visible ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.13)' }}
          title={layer.visible ? 'Masquer' : 'Afficher'}
        >
          {layer.visible ? <EyeOpen /> : <EyeClosed />}
        </button>

        {/* Lock */}
        <button
          onClick={e => { e.stopPropagation(); onToggleLock() }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: isLocked ? 'rgba(250,204,21,0.75)' : 'rgba(255,255,255,0.18)' }}
          title={isLocked ? 'Déverrouiller' : 'Verrouiller'}
        >
          {isLocked ? <LockClosed /> : <LockOpen />}
        </button>

        {/* Name */}
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
              style={{ color: 'rgba(255,255,255,0.92)', borderBottom: '1px solid rgba(124,58,237,0.7)', padding: '1px 2px', caretColor: '#a78bfa' }}
            />
          ) : (
            <span
              className="block text-[11px] truncate"
              style={{
                color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.40)',
                fontWeight: isActive ? 600 : 500,
                transition: 'color 0.15s, font-weight 0.15s',
              }}
              onDoubleClick={e => { if (!isLocked) { e.stopPropagation(); onStartEdit() } }}
              title={isLocked ? layer.name : 'Double-clic pour renommer'}
            >
              {layer.name}
            </span>
          )}
        </div>

        {/* Up / Down arrows */}
        <div className="flex-shrink-0 flex flex-col" style={{ gap: 1 }}>
          <button
            onClick={e => { e.stopPropagation(); onMoveUp() }}
            disabled={isFirst}
            className="w-5 h-4 flex items-center justify-center rounded transition-colors"
            style={{ color: isFirst ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)', cursor: isFirst ? 'default' : 'pointer' }}
            onMouseEnter={e => { if (!isFirst) (e.currentTarget.style.color = 'rgba(167,139,250,0.85)') }}
            onMouseLeave={e => (e.currentTarget.style.color = isFirst ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)')}
            title="Monter (devant)"
          >
            <ChevronUp />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onMoveDown() }}
            disabled={isLast}
            className="w-5 h-4 flex items-center justify-center rounded transition-colors"
            style={{ color: isLast ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)', cursor: isLast ? 'default' : 'pointer' }}
            onMouseEnter={e => { if (!isLast) (e.currentTarget.style.color = 'rgba(167,139,250,0.85)') }}
            onMouseLeave={e => (e.currentTarget.style.color = isLast ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)')}
            title="Descendre (derrière)"
          >
            <ChevronDown />
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: 'rgba(255,255,255,0.15)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
          title="Supprimer le calque"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Expanded section: blend mode + opacity (active layer only) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col overflow-hidden"
            style={{ paddingLeft: 10, paddingRight: 8, paddingBottom: 8, paddingTop: 4, background: 'rgba(109,70,220,0.1)', gap: 6 }}
          >
            {/* Blend mode */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider flex-shrink-0" style={{ color: 'rgba(255,255,255,0.22)', width: 30 }}>
                Fusion
              </span>
              <div className="relative flex-1">
                <select
                  value={layer.blendMode}
                  onChange={e => onChangeBlendMode(e.target.value as BlendMode)}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-[10px] font-medium rounded-md outline-none appearance-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '3px 22px 3px 7px', WebkitAppearance: 'none' }}
                >
                  {BLEND_MODES.map(m => (
                    <option key={m.value} value={m.value} style={{ background: '#111', color: '#fff' }}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="absolute pointer-events-none" style={{ right: 6, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}>
                  <path d="M5 7L1 3h8L5 7z" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Opacity slider */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider flex-shrink-0" style={{ color: 'rgba(255,255,255,0.22)', width: 30 }}>
                Opac.
              </span>
              <input
                type="range" min={0} max={100} step={1}
                value={Math.round(layer.opacity * 100)}
                onChange={e => onChangeOpacity(Number(e.target.value) / 100)}
                onPointerUp={e => onCommitOpacity(Number((e.target as HTMLInputElement).value) / 100)}
                onClick={e => e.stopPropagation()}
                className="layer-opacity-range flex-1"
              />
              <span className="text-[10px] font-mono tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)', minWidth: 26, textAlign: 'right' }}>
                {Math.round(layer.opacity * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

/* ── LayersList ──────────────────────────────────────────────────── */

export interface LayersListProps {
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
  onLockLayer: (id: string) => void
  onMoveLayerUp: (id: string) => void
  onMoveLayerDown: (id: string) => void
  onHoverLayer: (id: string | null) => void
}

export function LayersList({
  layers, activeLayerId,
  onSelectLayer, onToggleVisibility, onChangeOpacity, onCommitOpacity,
  onChangeBlendMode, onDeleteLayer, onReorderLayers, onRenameLayer,
  onLockLayer, onMoveLayerUp, onMoveLayerDown, onHoverLayer,
}: LayersListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Display order: highest z-order (last in array) shown at top
  const displayLayers = [...layers].reverse()

  const handleReorder = (newDisplay: Layer[]) => onReorderLayers([...newDisplay].reverse())
  const startEdit  = (layer: Layer) => { setEditingId(layer.id); setEditValue(layer.name) }
  const commitEdit = (id: string)   => { const t = editValue.trim(); if (t) onRenameLayer(id, t); setEditingId(null) }
  const cancelEdit = ()             => setEditingId(null)

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4" style={{ height: 44, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="5" rx="1" />
          <rect x="2" y="14" width="20" height="5" rx="1" />
          <rect x="2" y="2" width="20" height="3" rx="1" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Calques
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {layers.length}
        </span>
      </div>

      {/* List */}
      {layers.length === 0 ? (
        <p className="text-center py-4 text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Aucun calque
        </p>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={displayLayers}
          onReorder={handleReorder}
          style={{ maxHeight: 260, overflowY: 'auto', overflowX: 'hidden' }}
          onMouseLeave={() => onHoverLayer(null)}
        >
          {displayLayers.map((layer, displayIdx) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              isActive={layer.id === activeLayerId}
              isEditing={editingId === layer.id}
              editValue={editValue}
              isFirst={displayIdx === 0}
              isLast={displayIdx === displayLayers.length - 1}
              onSelect={() => onSelectLayer(layer.id)}
              onStartEdit={() => startEdit(layer)}
              onEditChange={setEditValue}
              onEditCommit={() => commitEdit(layer.id)}
              onEditCancel={cancelEdit}
              onToggleVisibility={() => onToggleVisibility(layer.id)}
              onToggleLock={() => onLockLayer(layer.id)}
              onChangeOpacity={v => onChangeOpacity(layer.id, v)}
              onCommitOpacity={v => onCommitOpacity(layer.id, v)}
              onChangeBlendMode={v => onChangeBlendMode(layer.id, v)}
              onDelete={() => onDeleteLayer(layer.id)}
              onMoveUp={() => onMoveLayerUp(layer.id)}
              onMoveDown={() => onMoveLayerDown(layer.id)}
              onHover={() => onHoverLayer(layer.id)}
              onUnhover={() => onHoverLayer(null)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}
