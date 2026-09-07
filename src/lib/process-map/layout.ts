/**
 * Shared auto-layout helper for React Flow canvases (process-map + designer).
 *
 * Goals:
 *  - Honor any node that already has an explicit `position` (the hand-curated
 *    FLO process-map nodes). Pass it through unchanged.
 *  - For nodes without a position, place them in a tidy grid keyed by
 *    `(column, lane)` so neighbouring nodes never overlap horizontally or
 *    vertically, and unknown lanes always get a unique Y band.
 *  - Wrap to a new Y row when the current row would exceed `canvasMaxX`.
 */

export type ColumnKind = "input" | "process" | "output" | "system";

export type BoxedNode = {
  id: string;
  /** Pre-computed position. When both x and y are present we keep it. */
  position?: { x: number; y: number };
  /** Visual width in px (default 240). */
  width?: number;
  /** Visual height in px (default 180). */
  height?: number;
  /** Swimlane / category — used to derive the Y band. */
  lane?: string;
  /** Visual column — used to derive the X coordinate. */
  column?: ColumnKind | string;
};

export type LayoutOptions = {
  columnX?: Partial<Record<ColumnKind, number>>;
  gapX?: number;
  gapY?: number;
  canvasMaxX?: number;
  /** Default width for nodes that don't specify one. */
  defaultWidth?: number;
  /** Default height for nodes that don't specify one. */
  defaultHeight?: number;
};

const DEFAULT_COLUMN_X: Record<ColumnKind, number> = {
  input: 40,
  process: 470,
  output: 900,
  system: 700,
};

const DEFAULT_OPTIONS = {
  columnX: DEFAULT_COLUMN_X,
  gapX: 280,
  gapY: 160,
  canvasMaxX: 1480,
  defaultWidth: 240,
  defaultHeight: 180,
} as const;

export type LayoutResult = { id: string; x: number; y: number };

/**
 * Pure function: given a list of nodes, return a list of `{id, x, y}` placements.
 *
 * The output order is the input order — callers can zip it back to the nodes.
 *
 * Algorithm:
 *   1. Resolve the effective X for each column (default or override).
 *   2. Group nodes by lane (preserving the order in which lanes first appear).
 *   3. Within a lane, sort nodes by column priority (input → process → output → system).
 *   4. Walk each lane left-to-right, tracking the rightmost edge of the current row.
 *      When the next node would exceed `canvasMaxX`, advance the row's Y by
 *      `gapY` and reset the row's rightmost edge.
 *   5. Nodes with a pre-set `position` keep it (callers can use them to override
 *      the algorithm).
 */
export function autoLayout<T extends BoxedNode>(
  nodes: T[],
  options: LayoutOptions = {},
): LayoutResult[] {
  const columnX = { ...DEFAULT_COLUMN_X, ...(options.columnX ?? {}) };
  const gapX = options.gapX ?? DEFAULT_OPTIONS.gapX;
  const gapY = options.gapY ?? DEFAULT_OPTIONS.gapY;
  const canvasMaxX = options.canvasMaxX ?? DEFAULT_OPTIONS.canvasMaxX;
  const defaultWidth = options.defaultWidth ?? DEFAULT_OPTIONS.defaultWidth;
  const defaultHeight =
    options.defaultHeight ?? DEFAULT_OPTIONS.defaultHeight;

  const columnPriority: Record<string, number> = {
    input: 0,
    process: 1,
    output: 2,
    system: 3,
  };

  // Step 1: split nodes into "has position" and "needs auto-position".
  const pinned: LayoutResult[] = [];
  const auto: T[] = [];
  for (const n of nodes) {
    if (n.position && typeof n.position.x === "number" &&
        typeof n.position.y === "number") {
      pinned.push({ id: n.id, x: n.position.x, y: n.position.y });
    } else {
      auto.push(n);
    }
  }

  // Step 2: group auto nodes by lane, preserving first-appearance order.
  const laneOrder: string[] = [];
  const laneMap = new Map<string, T[]>();
  for (const n of auto) {
    const lane = (n.lane ?? "core").trim() || "core";
    if (!laneMap.has(lane)) {
      laneOrder.push(lane);
      laneMap.set(lane, []);
    }
    laneMap.get(lane)!.push(n);
  }

  // Step 3+4: lay out each lane left-to-right with row wrapping.
  const autoPlacements: LayoutResult[] = [];
  const heightByLane = new Map<string, number>();

  for (const lane of laneOrder) {
    const items = laneMap.get(lane)!;
    // Sort by column priority so that input/process/output read L→R.
    items.sort((a, b) => {
      const ca = columnPriority[(a.column ?? "process") as string] ?? 1;
      const cb = columnPriority[(b.column ?? "process") as string] ?? 1;
      return ca - cb;
    });

    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    for (const node of items) {
      const width = node.width ?? defaultWidth;
      const height = node.height ?? defaultHeight;
      const column = (node.column ?? "process") as ColumnKind;
      const x = columnX[column] ?? columnX.process;

      // Wrap to a new row when adding this node would exceed the canvas width.
      if (cursorX > 0 && cursorX + width > canvasMaxX) {
        cursorX = 0;
        cursorY += rowHeight + gapY;
        rowHeight = 0;
      }

      autoPlacements.push({ id: node.id, x, y: cursorY });
      cursorX = Math.max(cursorX, x + width) + gapX - columnX.process;
      rowHeight = Math.max(rowHeight, height);
    }

    heightByLane.set(lane, cursorY + rowHeight);
  }

  // Each lane gets its own Y band: shift each lane's placements down by the
  // total height of the lanes that come before it. This guarantees that two
  // nodes from different lanes never share a Y, even when both lanes have
  // wrapped to multiple rows.
  const bandOffsetY: number[] = [];
  let offset = 0;
  for (const lane of laneOrder) {
    bandOffsetY.push(offset);
    offset += (heightByLane.get(lane) ?? 0) + gapY;
  }

  const adjusted = autoPlacements.map((p, i) => {
    // Find which lane this placement belongs to. We track placement counts
    // per lane so we can apply the right offset.
    return { id: p.id, x: p.x, y: p.y };
  });

  // Re-walk lanes to apply the per-lane band offset.
  const result: LayoutResult[] = [...pinned];
  let autoIndex = 0;
  for (let li = 0; li < laneOrder.length; li += 1) {
    const lane = laneOrder[li];
    const items = laneMap.get(lane)!;
    const bandOffset = bandOffsetY[li];
    for (let idx = 0; idx < items.length; idx += 1) {
      const placement = adjusted[autoIndex + idx];
      result.push({ id: placement.id, x: placement.x, y: placement.y + bandOffset });
    }
    autoIndex += items.length;
  }

  return result;
}

/**
 * Returns the index→placement map keyed by node id, suitable for zipping
 * back into a list of nodes.
 */
export function layoutById(nodes: BoxedNode[], options?: LayoutOptions): Map<string, LayoutResult> {
  const placements = autoLayout(nodes, options);
  const map = new Map<string, LayoutResult>();
  for (const p of placements) {
    map.set(p.id, p);
  }
  return map;
}
