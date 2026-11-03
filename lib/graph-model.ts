export type Resolution = "high" | "medium" | "low";

export type Tier = { id: string; label: string };
export type TimeIncrement = { id: string; label: string };

export type GraphState = {
  title: string;
  tiers: Tier[];
  times: TimeIncrement[];
  points: Record<string, string | null>;
};

export type EditTarget =
  | { type: "title" }
  | { type: "time"; id: string }
  | { type: "tier"; id: string };

export const STORAGE_KEY = "performance-graph.v1";
export const MIN_AXIS_COUNT = 2;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function createSample(): GraphState {
  const tiers: Tier[] = [
    { id: "tier-baseline", label: "Baseline" },
    { id: "tier-developing", label: "Developing" },
    { id: "tier-steady", label: "Steady" },
    { id: "tier-strong", label: "Strong" },
    { id: "tier-peak", label: "Peak" },
  ];
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const curve = [
    "tier-developing",
    "tier-steady",
    "tier-strong",
    "tier-peak",
    "tier-strong",
    "tier-developing",
    "tier-steady",
    "tier-peak",
  ];
  const times = labels.map((label, index) => ({
    id: `time-${index + 1}`,
    label,
  }));
  const points: Record<string, string | null> = {};
  times.forEach((time, index) => {
    points[time.id] = curve[index] ?? null;
  });
  return { title: "Performance", tiers, times, points };
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function nextTimeLabel(times: TimeIncrement[]): string {
  const last = times[times.length - 1]?.label.trim() ?? "";
  const monthIndex = MONTHS.findIndex(
    (month) => month.toLowerCase() === last.toLowerCase(),
  );
  if (monthIndex >= 0) return MONTHS[(monthIndex + 1) % MONTHS.length];
  const numbered = last.match(/^(.*?)(\d+)\s*$/);
  if (numbered) return `${numbered[1]}${Number(numbered[2]) + 1}`;
  return "New";
}

export function addTime(state: GraphState): { state: GraphState; id: string } {
  const id = createId("time");
  const middle = state.tiers[Math.floor((state.tiers.length - 1) / 2)];
  return {
    id,
    state: {
      ...state,
      times: [...state.times, { id, label: nextTimeLabel(state.times) }],
      points: { ...state.points, [id]: middle?.id ?? null },
    },
  };
}

export function addTier(state: GraphState): { state: GraphState; id: string } {
  const id = createId("tier");
  return {
    id,
    state: {
      ...state,
      tiers: [...state.tiers, { id, label: "New tier" }],
    },
  };
}

export function renameTime(
  state: GraphState,
  id: string,
  label: string,
): GraphState {
  return {
    ...state,
    times: state.times.map((time) =>
      time.id === id ? { ...time, label } : time,
    ),
  };
}

export function renameTier(
  state: GraphState,
  id: string,
  label: string,
): GraphState {
  return {
    ...state,
    tiers: state.tiers.map((tier) =>
      tier.id === id ? { ...tier, label } : tier,
    ),
  };
}

export function removeTime(state: GraphState, id: string): GraphState {
  if (state.times.length <= MIN_AXIS_COUNT) return state;
  if (!state.times.some((time) => time.id === id)) return state;
  const points = { ...state.points };
  delete points[id];
  return {
    ...state,
    times: state.times.filter((time) => time.id !== id),
    points,
  };
}

export function removeTier(state: GraphState, id: string): GraphState {
  if (state.tiers.length <= MIN_AXIS_COUNT) return state;
  const index = state.tiers.findIndex((tier) => tier.id === id);
  if (index < 0) return state;
  const fallback = state.tiers[index - 1] ?? state.tiers[index + 1];
  const tiers = state.tiers.filter((tier) => tier.id !== id);
  const points: Record<string, string | null> = {};
  for (const [timeId, tierId] of Object.entries(state.points)) {
    points[timeId] = tierId === id ? (fallback?.id ?? null) : tierId;
  }
  return { ...state, tiers, points };
}

export function setPoint(
  state: GraphState,
  timeId: string,
  tierId: string | null,
): GraphState {
  if (!state.times.some((time) => time.id === timeId)) return state;
  if (tierId && !state.tiers.some((tier) => tier.id === tierId)) return state;
  if (state.points[timeId] === tierId) return state;
  return { ...state, points: { ...state.points, [timeId]: tierId } };
}

export function allPointsCleared(state: GraphState): boolean {
  return state.times.every((time) => !state.points[time.id]);
}

export function tierIndex(state: GraphState, tierId: string | null): number {
  if (!tierId) return -1;
  return state.tiers.findIndex((tier) => tier.id === tierId);
}

export type ChartMetrics = {
  columnWidth: number;
  plotWidth: number;
  bandHeight: number;
  plotHeight: number;
  showVerticalGrid: boolean;
  gridOpacity: number;
  bandOpacity: number;
  pointRadius: number;
  strokeWidth: number;
};

export function chartMetrics(
  resolution: Resolution,
  timeCount: number,
  tierCount: number,
  availableWidth: number,
): ChartMetrics {
  const times = Math.max(timeCount, 1);
  const tiers = Math.max(tierCount, 1);
  const width = Math.max(availableWidth, 160);

  let columnWidth = 72;
  let plotWidth = columnWidth * times;
  let bandHeight = 56;
  let showVerticalGrid = true;
  let gridOpacity = 0.45;
  let bandOpacity = 1;
  let strokeWidth = 1.75;

  if (resolution === "high") {
    columnWidth = 72;
    plotWidth = columnWidth * times;
    bandHeight = 64;
    showVerticalGrid = true;
    gridOpacity = 0.85;
    bandOpacity = 1;
  } else if (resolution === "medium") {
    const fitted = width / times;
    bandHeight = 56;
    showVerticalGrid = true;
    gridOpacity = 0.28;
    bandOpacity = 0.8;
    if (fitted >= 68 && fitted <= 120) {
      columnWidth = fitted;
      plotWidth = width;
    } else if (fitted > 120) {
      columnWidth = 120;
      plotWidth = columnWidth * times;
    } else {
      columnWidth = 72;
      plotWidth = columnWidth * times;
    }
  } else {
    columnWidth = width / times;
    plotWidth = width;
    bandHeight = 48;
    showVerticalGrid = false;
    gridOpacity = 0;
    bandOpacity = 0.28;
    strokeWidth = 2.25;
  }

  const pointRadius = Math.max(3.5, Math.min(6.5, columnWidth * 0.14));

  return {
    columnWidth,
    plotWidth,
    bandHeight,
    plotHeight: bandHeight * tiers,
    showVerticalGrid,
    gridOpacity,
    bandOpacity,
    pointRadius,
    strokeWidth,
  };
}

export function timeLabelVisible(
  index: number,
  count: number,
  resolution: Resolution,
  columnWidth: number,
): boolean {
  if (count <= 1 || resolution === "high") return true;
  const stride =
    resolution === "low"
      ? Math.max(count <= 4 ? 1 : 2, Math.ceil(96 / Math.max(columnWidth, 1)))
      : columnWidth >= 80
        ? 1
        : columnWidth >= 52
          ? 2
          : 3;
  if (stride <= 1) return true;
  if (index === 0 || index === count - 1) return true;
  return index % stride === 0;
}

export function pointPosition(
  timeIndex: number,
  tierIndexValue: number,
  metrics: ChartMetrics,
): { x: number; y: number } {
  const x = (timeIndex + 0.5) * metrics.columnWidth;
  const y =
    tierIndexValue < 0
      ? metrics.plotHeight / 2
      : metrics.plotHeight - (tierIndexValue + 0.5) * metrics.bandHeight;
  return { x, y: Number.isFinite(y) ? y : metrics.plotHeight / 2 };
}

export function tierIdAtY(
  clientY: number,
  plotTop: number,
  metrics: ChartMetrics,
  tiers: Tier[],
): string | null {
  if (tiers.length === 0) return null;
  const fromTop = Math.floor((clientY - plotTop) / metrics.bandHeight);
  const clamped = Math.max(0, Math.min(tiers.length - 1, fromTop));
  return tiers[tiers.length - 1 - clamped]?.id ?? null;
}

export function linePaths(
  state: GraphState,
  metrics: ChartMetrics,
): string[] {
  const paths: string[] = [];
  let command = "";
  state.times.forEach((time, index) => {
    const placed = tierIndex(state, state.points[time.id] ?? null);
    if (placed < 0) {
      if (command) paths.push(command);
      command = "";
      return;
    }
    const { x, y } = pointPosition(index, placed, metrics);
    command += command ? ` L ${x} ${y}` : `M ${x} ${y}`;
  });
  if (command) paths.push(command);
  return paths;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAxisItem(value: unknown): value is { id: string; label: string } {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.label === "string"
  );
}

export function sanitizeGraph(value: unknown): GraphState | null {
  if (!isRecord(value)) return null;
  if (typeof value.title !== "string") return null;
  if (!Array.isArray(value.tiers) || !Array.isArray(value.times)) return null;
  const tiers = value.tiers.filter(isAxisItem).map((tier) => ({
    id: tier.id,
    label: tier.label.trim() || "Untitled",
  }));
  const times = value.times.filter(isAxisItem).map((time) => ({
    id: time.id,
    label: time.label.trim() || "Untitled",
  }));
  if (tiers.length < MIN_AXIS_COUNT || times.length < MIN_AXIS_COUNT) {
    return null;
  }
  const tierIds = new Set(tiers.map((tier) => tier.id));
  const rawPoints = isRecord(value.points) ? value.points : {};
  const points: Record<string, string | null> = {};
  for (const time of times) {
    const point = rawPoints[time.id];
    points[time.id] = typeof point === "string" && tierIds.has(point) ? point : null;
  }
  return {
    title: value.title.trim() || "Performance",
    tiers,
    times,
    points,
  };
}

const GRAPH_CHANGE_EVENT = "performance-graph-change";
const serverGraph = createSample();
let cachedGraph: GraphState | null = null;

export function subscribeGraph(onChange: () => void): () => void {
  const onLocal = () => onChange();
  const onStorage = () => {
    cachedGraph = null;
    onChange();
  };
  window.addEventListener(GRAPH_CHANGE_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(GRAPH_CHANGE_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

export function getGraphSnapshot(): GraphState {
  if (!cachedGraph) cachedGraph = loadGraph() ?? serverGraph;
  return cachedGraph;
}

export function getServerGraphSnapshot(): GraphState {
  return serverGraph;
}

export function updateGraph(next: GraphState): void {
  if (next === cachedGraph) return;
  cachedGraph = next;
  saveGraph(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GRAPH_CHANGE_EVENT));
  }
}

export function loadGraph(): GraphState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeGraph(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGraph(state: GraphState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is a convenience. The in-memory chart still works.
  }
}
