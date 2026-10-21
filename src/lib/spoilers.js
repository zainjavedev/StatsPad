/* Scores are always shown; there is no spoiler mode. Kept as a tiny shim so the pages that ask for it need no branches. */
const shown = {all: true, revealed: () => true};
export const useSpoilers = () => shown;
export const setShowScores = () => {};
export const revealGame = () => {};
