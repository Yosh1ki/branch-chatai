const BRANCHES = ["left", "main", "right"];

/**
 * @typedef {"left" | "main" | "right"} BranchSelection
 */

/**
 * @typedef {Object} ChatScreenState
 * @property {BranchSelection} selectedBranch
 * @property {boolean} isMenuOpen
 */

/**
 * @param {unknown} value
 * @returns {BranchSelection}
 */
export function normalizeBranch(value) {
  return BRANCHES.includes(value) ? value : "main";
}

/**
 * @param {BranchSelection} current
 * @param {unknown} next
 * @returns {BranchSelection}
 */
export function selectBranch(current, next) {
  const normalized = normalizeBranch(next);
  return normalized ?? current;
}

/**
 * @param {boolean} isOpen
 * @returns {boolean}
 */
export function toggleMenu(isOpen) {
  return !isOpen;
}

/**
 * @param {string} text
 * @param {{ writeText: (text: string) => Promise<void> } | null | undefined} clipboard
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(
  text,
  clipboard = globalThis?.navigator?.clipboard
) {
  if (typeof text !== "string" || text.length === 0) {
    return false;
  }

  if (!clipboard || typeof clipboard.writeText !== "function") {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {BranchSelection | undefined} initialBranch
 * @returns {ChatScreenState}
 */
export function createChatScreenState(initialBranch = "main") {
  return {
    selectedBranch: normalizeBranch(initialBranch),
    isMenuOpen: false,
  };
}
