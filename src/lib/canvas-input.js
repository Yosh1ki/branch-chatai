/**
 * @param {{ isMetaPressed: boolean; isSelectableTarget: boolean }} input
 */
export function getPointerDragBehavior({ isMetaPressed, isSelectableTarget }) {
  if (isMetaPressed) {
    return { allowDrag: true, allowSelection: false };
  }
  if (isSelectableTarget) {
    return { allowDrag: false, allowSelection: true };
  }
  return { allowDrag: false, allowSelection: false };
}

/**
 * @param {{ isCtrlPressed: boolean }} input
 */
export function getWheelBehavior({ isCtrlPressed }) {
  return { mode: isCtrlPressed ? "zoom" : "pan" };
}
