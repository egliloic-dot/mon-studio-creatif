import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Props ───────────────────────────────────────────── */

export interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (format: 'png' | 'jpg' | 'pdf', quality: number) => Promise<void>
  page: { width: number; height: number; fill: string }
  layerCount: number
  thumbnail?: string | null
}

/* ─── Helpers ─────────────────────────────────────────── */

function SpinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'expSpin 0.72s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83"/>
    </svg>
  )
}

/* ─── Format config ───────────────────────────────────── */

const FORMATS = [
  {
    id: 'png'  as const,
    label: 'PNG',
    subtitle: 'Haute qualité',
    note: 'Transparence supportée · Web & design',
    btnBg: '#2563eb',
    btnHover: '#1d4ed8',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    id: 'jpg'  as const,
    label: 'JPEG',
    subtitle: 'Fichier léger',
    note: 'Compressé · Idéal pour les photos',
    btnBg: '#16a34a',
    btnHover: '#15803d',
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
  {
    id: 'pdf'  as const,
    label: 'PDF',
    subtitle: 'Impression',
    note: 'Format A4 · Prêt à imprimer',
    btnBg: '#dc2626',
    btnHover: '#b91c1c',
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
]

/* ─── FormatCard ──────────────────────────────────────── */

function FormatCard({ fmt, loading, jpegQuality, onQualityChange, onDownload }: {
  fmt: typeof FORMATS[number]
  loading: boolean
  jpegQuality?: number
  onQualityChange?: (v: number) => void
  onDownload: () => void
}) {
  const [btnHov, setBtnHov] = useState(false)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      padding: '20px 14px 16px',
      background: '#ffffff',
      border: '1.5px solid #e5e7eb',
      borderRadius: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: fmt.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: fmt.iconColor,
      }}>
        {fmt.icon}
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
          {fmt.label}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 600, color: fmt.btnBg }}>
          {fmt.subtitle}
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
          {fmt.note}
        </p>
      </div>

      {/* JPEG quality slider */}
      {jpegQuality !== undefined && onQualityChange && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Qualité</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: fmt.btnBg }}>{jpegQuality}%</span>
          </div>
          <input
            type="range" min={80} max={100} step={1} value={jpegQuality}
            onChange={e => onQualityChange(Number(e.target.value))}
            style={{
              width: '100%', height: 4, borderRadius: 2, cursor: 'pointer',
              accentColor: fmt.btnBg, outline: 'none', border: 'none',
              background: `linear-gradient(to right, ${fmt.btnBg} ${(jpegQuality - 80) / 20 * 100}%, #d1d5db ${(jpegQuality - 80) / 20 * 100}%)`,
              WebkitAppearance: 'none', appearance: 'none',
            }}
          />
        </div>
      )}

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={loading}
        onMouseEnter={() => setBtnHov(true)}
        onMouseLeave={() => setBtnHov(false)}
        style={{
          width: '100%', padding: '11px 0', marginTop: 'auto',
          borderRadius: 10, border: 'none',
          background: loading ? '#e5e7eb' : btnHov ? fmt.btnHover : fmt.btnBg,
          color: loading ? '#9ca3af' : '#ffffff',
          fontSize: 13, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'background 0.15s',
          boxShadow: loading ? 'none' : btnHov ? `0 4px 16px ${fmt.btnBg}55` : `0 2px 8px ${fmt.btnBg}33`,
        }}
      >
        {loading ? (
          <><SpinIcon /> Génération…</>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Télécharger
          </>
        )}
      </button>
    </div>
  )
}

/* ─── ExportModal ─────────────────────────────────────── */

export function ExportModal({ isOpen, onClose, onExport, page, layerCount, thumbnail }: ExportModalProps) {
  const [jpegQuality, setJpegQuality] = useState(92)
  const [loading, setLoading] = useState<'png' | 'jpg' | 'pdf' | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const handleDownload = async (format: 'png' | 'jpg' | 'pdf') => {
    if (loading) return
    setLoading(format)
    setErrMsg(null)
    try {
      await onExport(format, jpegQuality / 100)
      // Laisser la modale ouverte 600 ms pour que l'utilisateur voie la confirmation
      setTimeout(() => setLoading(null), 600)
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Erreur inconnue lors de l\'export.')
      setLoading(null)
    }
  }

  /* ── Thumbnail : object-fit contain simulé ── */
  /* On calcule les dimensions exactes pour que TOUTE la page soit visible */
  const { tw, th } = useMemo(() => {
    const containerW = 260, containerH = 150
    const ratio = page.width / page.height
    const scale = Math.min(containerW / page.width, containerH / page.height)
    return { tw: Math.round(page.width * scale), th: Math.round(page.height * scale) }
  }, [page.width, page.height])

  return createPortal(
    <>
      <style>{`@keyframes expSpin { to { transform: rotate(360deg) } }`}</style>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="em-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 10000,
              }}
            />

            {/* Centering wrapper — position fixe, flexbox, jamais de transform ici */}
            {/* Le motion.div intérieur gère uniquement l'animation (scale/y)         */}
            <div
              key="em-center"
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                pointerEvents: 'none', // laisse passer les clics sur le backdrop
              }}
            >
            <motion.div
              key="em-modal"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                pointerEvents: 'auto', // réactive les clics sur la modale elle-même
                width: 620,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: 20,
                border: '1.5px solid #e5e7eb',
                boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              {/* ── Header ── */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '24px 24px 18px',
                borderBottom: '1.5px solid #f3f4f6',
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em' }}>
                    Exporter la création
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', fontWeight: 400 }}>
                    Choisissez un format pour télécharger votre artboard
                  </p>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: '#f3f4f6', border: '1.5px solid #e5e7eb',
                    cursor: 'pointer', color: '#6b7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#e5e7eb'
                    el.style.color = '#111827'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#f3f4f6'
                    el.style.color = '#6b7280'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* ── Prévisualisation ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '16px 24px',
                background: '#f9fafb',
                borderBottom: '1.5px solid #f3f4f6',
              }}>
                {/* Thumbnail contain — TOUTE la page est visible */}
                <div style={{
                  width: 260, height: 150, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#f3f4f6',
                  borderRadius: 10,
                  border: '1.5px solid #e5e7eb',
                  overflow: 'hidden',
                }}>
                  {/* Aperçu réel du Stage Konva */}
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt="Aperçu"
                      style={{
                        width: tw, height: th,
                        objectFit: 'contain',
                        borderRadius: 4,
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                        display: 'block',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: tw, height: th,
                      background: page.fill || '#ffffff',
                      borderRadius: 4, border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                      flexShrink: 0, position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
                        backgroundSize: '20% 20%',
                      }}/>
                      {layerCount > 0 && (
                        <div style={{
                          position: 'absolute', bottom: 4, right: 4,
                          background: 'rgba(0,0,0,0.45)', borderRadius: 4,
                          padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#fff',
                        }}>
                          {layerCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.015em' }}>
                    {page.width} × {page.height} px
                  </p>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Fond</span>
                      <span style={{
                        display: 'inline-block', width: 14, height: 14, borderRadius: 3,
                        background: page.fill, border: '1.5px solid #d1d5db', flexShrink: 0,
                      }}/>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', fontWeight: 600 }}>
                        {page.fill}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {layerCount} calque{layerCount !== 1 ? 's' : ''} à exporter
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bandeau d'erreur ── */}
              {errMsg && (
                <div style={{
                  margin: '0 24px',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: 10,
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errMsg}
                </div>
              )}

              {/* ── Format cards ── */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                padding: '20px 24px 24px',
                background: '#f9fafb',
              }}>
                {FORMATS.map(fmt => (
                  <FormatCard
                    key={fmt.id}
                    fmt={fmt}
                    loading={loading === fmt.id}
                    jpegQuality={fmt.id === 'jpg' ? jpegQuality : undefined}
                    onQualityChange={fmt.id === 'jpg' ? setJpegQuality : undefined}
                    onDownload={() => handleDownload(fmt.id)}
                  />
                ))}
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
