/**
 * @typedef {Object} CanvasState
 * @property {number} scale
 * @property {number} offsetX
 * @property {number} offsetY
 */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * @param {number} minScale
 * @param {number} maxScale
 */
export function normalizeScaleRange(minScale = 0.6, maxScale = 1.6) {
  const safeMin = Number.isFinite(minScale) ? minScale : 0.6;
  const safeMax = Number.isFinite(maxScale) ? maxScale : 1.6;
  if (safeMin <= safeMax) {
    return { minScale: safeMin, maxScale: safeMax };
  }
  return { minScale: safeMax, maxScale: safeMin };
}

/**
 * @param {number} scale
 * @param {number} minScale
 * @param {number} maxScale
 */
export function clampScale(scale, minScale, maxScale) {
  const { minScale: minValue, maxScale: maxValue } = normalizeScaleRange(minScale, maxScale);
  return clamp(scale, minValue, maxValue);
}

/**
 * @param {{ width: number; height: number }} viewport
 * @param {number} scale
 * @param {number} basePanRatio
 */
export function getPanLimits(viewport, scale, basePanRatio = 0.25) {
  const width = Number.isFinite(viewport.width) ? viewport.width : 0;
  const height = Number.isFinite(viewport.height) ? viewport.height : 0;
  const ratio = Number.isFinite(basePanRatio) ? basePanRatio : 0.25;
  const basePan = Math.min(width, height) * ratio;
  const extraX = (width * Math.max(0, scale - 1)) / 2;
  const extraY = (height * Math.max(0, scale - 1)) / 2;
  return {
    maxX: Math.max(0, basePan + extraX),
    maxY: Math.max(0, basePan + extraY),
  };
}

/**
 * @param {{ offsetX: number; offsetY: number }} offsets
 * @param {{ maxX: number; maxY: number }} limits
 */
export function clampOffsets(offsets, limits) {
  const maxX = Number.isFinite(limits.maxX) ? limits.maxX : 0;
  const maxY = Number.isFinite(limits.maxY) ? limits.maxY : 0;
  return {
    offsetX: clamp(offsets.offsetX, -maxX, maxX),
    offsetY: clamp(offsets.offsetY, -maxY, maxY),
  };
}

/**
 * @returns {CanvasState}
 */
export function createCanvasState() {
  return { scale: 1, offsetX: 0, offsetY: 0 };
}

/**
 * @returns {CanvasState}
 */
export function resetCanvasState() {
  return createCanvasState();
}
