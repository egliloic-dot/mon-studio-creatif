// Konva filter type: function bound to a Konva.Node, receives ImageData
type KonvaFilter = (this: { attrs: Record<string, number> }, imageData: ImageData) => void

/**
 * Exposure — multiplicative brightness (2^n curve, photo-realistic feel).
 * Reads `this.attrs.exposure` set by react-konva props.
 * Range: -1 → 1  (mapped from UI -100 → 100 by dividing by 100)
 */
export const ExposureFilter: KonvaFilter = function (this: { attrs: Record<string, number> }, imageData: ImageData) {
  const exposure: number = this.attrs.exposure ?? 0
  if (exposure === 0) return
  const factor = Math.pow(2, exposure)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, data[i]     * factor))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor))
  }
}

/**
 * Temperature — shifts red/blue channels in opposite directions.
 * Warm (+): more red, less blue.
 * Cool  (−): less red, more blue.
 * Reads `this.attrs.temperature` — UI range -100 → 100.
 */
export const TemperatureFilter: KonvaFilter = function (this: { attrs: Record<string, number> }, imageData: ImageData) {
  const temp: number = this.attrs.temperature ?? 0
  if (temp === 0) return
  const rShift = temp * 0.7
  const bShift = -temp * 0.7
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, data[i]     + rShift))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + bShift))
  }
}
