import { motion, AnimatePresence } from 'framer-motion'

interface ZoomIndicatorProps {
  scale: number
  image: { width: number; height: number } | null
  stageSize: { width: number; height: number }
  onReset: (iw: number, ih: number, sw: number, sh: number) => void
}

export function ZoomIndicator({ scale, image, stageSize, onReset }: ZoomIndicatorProps) {
  const pct = Math.round(scale * 100)

  const handleReset = () => {
    if (image) onReset(image.width, image.height, stageSize.width, stageSize.height)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="glass absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-xl overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
    >
      {/* Zoom level */}
      <div className="px-3 py-2 text-xs font-mono text-studio-muted tabular-nums min-w-[52px] text-center">
        {pct}%
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-studio-border" />

      {/* Reset View button */}
      <AnimatePresence>
        {image && (
          <motion.button
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ backgroundColor: 'rgba(124, 58, 237, 0.15)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="px-3 py-2 text-xs text-studio-muted hover:text-studio-accent transition-colors whitespace-nowrap"
            title="Recentrer l'image"
          >
            Reset View
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
