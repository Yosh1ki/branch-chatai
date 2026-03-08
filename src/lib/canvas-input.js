/**
 * @param {{ isMetaPressed: boolean; isInteractiveTarget: boolean; pointerType?: string }} input
 */
export function getPointerDragBehavior({
  isMetaPressed,
  isInteractiveTarget,
  pointerType,
}) {
  if (isMetaPressed) {
    return { allowDrag: true, allowSelection: false };
  }
  if (isInteractiveTarget) {
    return { allowDrag: false, allowSelection: true };
  }
  const isTouchLikePointer = pointerType === "touch" || pointerType === "pen";
  return { allowDrag: isTouchLikePointer, allowSelection: false };
}

/**
 * @param {{ isCtrlPressed: boolean }} input
 */
export function getWheelBehavior({ isCtrlPressed }) {
  return { mode: isCtrlPressed ? "zoom" : "pan" };
}
