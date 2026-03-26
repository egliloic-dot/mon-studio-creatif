import { motion, AnimatePresence } from 'framer-motion'

interface DropZoneProps {
  isDragging: boolean
}

export function DropZone({ isDragging }: DropZoneProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          style={{
            background: 'rgba(124, 58, 237, 0.08)',
            border: '2px dashed rgba(124, 58, 237, 0.6)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass px-8 py-6 rounded-2xl flex flex-col items-center gap-3"
          >
            <div className="text-4xl">🖼️</div>
            <p className="text-studio-accent font-semibold text-sm">Dépose ton image ici</p>
            <p className="text-studio-muted text-xs">JPEG ou PNG</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
