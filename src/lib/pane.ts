export const PANE_KEY = 'mybr-pane-w';
export const PANE_DEFAULT = 300;
export const PANE_MIN = 240;
export const PANE_MAX = 560;

/** 사이드바 너비를 허용 범위 안의 정수로 맞춘다. 숫자가 아니면 기본값을 쓴다. */
export function clampPaneWidth(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) ? Math.min(PANE_MAX, Math.max(PANE_MIN, Math.round(n))) : PANE_DEFAULT;
}

export const HISTORY_KEY = 'mybr-history-h';
export const HISTORY_MIN = 160;
/** 그래프가 최소한 이만큼은 남도록 패널 높이의 위쪽 한계를 둔다. */
export const HISTORY_GRAPH_MIN = 200;

/** History 패널 높이를 허용 범위 안의 정수로 맞춘다. 숫자가 아니면 null(기본 CSS 값)을 돌려준다. */
export function clampHistoryHeight(value: unknown, viewport: number): number | null {
  const n = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(n)) return null;
  const max = Math.max(HISTORY_MIN, Math.round(viewport) - HISTORY_GRAPH_MIN);
  return Math.min(max, Math.max(HISTORY_MIN, Math.round(n)));
}
