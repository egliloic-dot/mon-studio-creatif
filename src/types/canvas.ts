export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'

export interface Adjustments {
  exposure: number    // -100 → 100
  contrast: number    // -100 → 100
  saturation: number  // -100 → 100
  temperature: number // -100 (cool) → 100 (warm)
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  exposure: 0, contrast: 0, saturation: 0, temperature: 0,
}

/* ─── Image layer ────────────────────────────────────────────────── */

export interface ImageLayer {
  type: 'image'
  id: string
  name: string
  src: string
  x: number
  y: number
  width: number
  height: number
  rotation: number    // degrees (default 0)
  scaleX: number      // (default 1)
  scaleY: number      // (default 1)
  opacity: number     // 0–1
  visible: boolean
  locked: boolean
  adjustments: Adjustments
  blendMode: BlendMode
}

/* ─── Text layer ─────────────────────────────────────────────────── */

export interface TextLayer {
  type: 'text'
  id: string
  name: string
  text: string
  x: number
  y: number
  fontSize: number       // canvas pixels
  fontFamily: string
  fontStyle: string      // '' | 'bold' | 'italic' | 'bold italic'
  fill: string           // CSS hex color
  align: 'left' | 'center' | 'right'
  opacity: number        // 0–1
  visible: boolean
  locked: boolean
  rotation: number       // degrees
  scaleX: number
  scaleY: number
  width: number          // measured after mount (0 = auto)
  height: number
  blendMode: BlendMode
}

export const DEFAULT_TEXT_LAYER: Omit<TextLayer, 'id' | 'name' | 'x' | 'y'> = {
  type: 'text',
  text: 'Nouveau texte',
  fontSize: 52,
  fontFamily: 'Arial',
  fontStyle: '',
  fill: '#ffffff',
  align: 'left',
  opacity: 1,
  visible: true,
  locked: false,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  width: 0,
  height: 0,
  blendMode: 'source-over',
}

/* ─── Draw layer ──────────────────────────────────────────────────── */

export interface DrawLayer {
  type:        'draw'
  id:          string
  name:        string
  x:           number      // position offset
  y:           number
  scaleX:      number      // (default 1)
  scaleY:      number      // (default 1)
  rotation:    number      // degrees (default 0)
  points:      number[]    // flat [x1, y1, x2, y2, …] in canvas coords
  stroke:      string      // hex colour
  strokeWidth: number      // canvas pixels
  opacity:     number      // 0–1
  visible:     boolean
  locked:      boolean
  blendMode:   BlendMode
  tension:     number      // 0.5 = smooth catmull-rom
}

/* ─── Shape layer ─────────────────────────────────────────────────── */

export interface ShapeLayer {
  type:        'shape'
  id:          string
  name:        string
  shapeType:   'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'heart'
  x:           number      // Konva node x (top-left for rect, center for circle/triangle)
  y:           number
  width:       number      // logical size
  height:      number
  rotation:    number
  scaleX:      number
  scaleY:      number
  fill:        string      // CSS color or 'transparent'
  stroke:      string      // CSS color
  strokeWidth: number
  opacity:     number
  visible:     boolean
  locked:      boolean
  blendMode:   BlendMode
}

/* ─── Union ──────────────────────────────────────────────────────── */

export type Layer = ImageLayer | TextLayer | DrawLayer | ShapeLayer

export type Tool = 'select' | 'crop' | 'brush'
