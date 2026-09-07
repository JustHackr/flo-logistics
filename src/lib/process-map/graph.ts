/**
 * Hand-curated visualisation of FLO's real e-commerce logistics pipeline.
 *
 * Each node cites the source code that implements it (`sourceFiles`) plus
 * helper metadata. Anything live (counts, last fetched) is keyed via
 * `liveStatKey` and surfaced by `src/lib/process-map/live-stats.ts`.
 *
 * The positions are hand-picked (3 columns × 4 lanes) so no auto-layout
 * library is required and the diagram reads predictably regardless of
 * dynamic content.
 */

export type NodeKind = "input" | "process" | "output";

export type Lane =
  | "fleet"
  | "routing"
  | "warehouse"
  | "assistant"
  | "platform";

export type ProcessNodeDef = {
  id: string;
  kind: NodeKind;
  lane: Lane;
  /** i18n key under `processMap.nodes.*` */
  titleKey: string;
  /** i18n key for one-line summary */
  summaryKey: string;
  /** Position on the canvas (px). */
  position: { x: number; y: number };
  /** Lucide icon name — see `nodeIcons` in process-map-client. */
  icon:
    | "Truck"
    | "Package"
    | "Fuel"
    | "Route"
    | "Brain"
    | "Calculator"
    | "Wrench"
    | "Camera"
    | "Activity"
    | "User"
    | "Workflow"
    | "Warehouse"
    | "Plug"
    | "Sparkles";
  /** Technical detail — not translated; this is engineering reference. */
  detail: {
    /** Concrete things that flow in (model fields, env vars, external feeds). */
    inputs: string[];
    /** Bullet list of the procedure; one bullet per concrete step. */
    process: string[];
    /** Concrete things that flow out (downstream nodes, persisted rows, files). */
    outputs: string[];
    /** Source files backing this node. Tested against disk — keep in sync. */
    sourceFiles: string[];
    /** Prisma models written or read by this node. */
    models?: string[];
    /** Public API routes (server-side) that exercise this. */
    apiRoutes?: string[];
    /** Top-level UI pages that render its results. */
    uiRoutes?: string[];
    /** Optional live stat key looked up in live-stats.ts */
    liveStatKey?: keyof LiveStats;
  };
};

/** LiveStat shape kept in sync with `src/lib/process-map/live-stats.ts`. */
export type LiveStats = {
  /** "12 RECEIVED / 3 ON_ROUTE / 1 DELIVERED / 6 PREPARING" */
  ordersByStatus: string;
  /** "28 vehicles, 3 high risk, 1 medium" */
  fleetHealth: string;
  /** "1 IN_PROGRESS / 0 PLANNED / 12 COMPLETED" */
  routes: string;
  /** "2h ago" */
  fuelAge: string;
  /** "5" */
  driverCount: string;
  /** "5" */
  connectors: string;
};

export type ProcessEdge = {
  id: string;
  source: string;
  target: string;
  /** Optional short label for the dataflow. */
  label?: string;
};

const LANE_Y: Record<Lane, number> = {
  fleet: 0,
  routing: 170,
  warehouse: 340,
  assistant: 510,
  platform: 680,
};

/** X positions (three columns: input / process / output). */
const COL_X = { input: 40, process: 470, output: 900 } as const;

const laneY = (lane: Lane): number => LANE_Y[lane];

export const PROCESS_NODES: ProcessNodeDef[] = [
  /* ============================== Inputs ============================== */
  {
    id: "input-orders",
    kind: "input",
    lane: "platform",
    titleKey: "orders",
    summaryKey: "ordersSummary",
    icon: "Package",
    position: { x: COL_X.input, y: laneY("platform") },
    detail: {
      inputs: [
        "Blibli OMS CSV exports (planned)",
        "Manual CSV import at /routing/orders",
        "Validation: Jakarta Jabodetabek bbox + StopAccess enum",
      ],
      process: [
        "Zod schema validates row-by-row",
        "Inside-bounds check rejects orders outside Greater Jakarta",
        "Each accepted row creates an Order + initial OrderStatusEvent",
        "Status starts as RECEIVED — enters the routing pipeline",
      ],
      outputs: [
        "Order row with lat/lng/status (RECEIVED)",
        "OrderStatusEvent(RECEIVED, timestamp)",
        "Downstream chunking → optimizer → driver matching",
      ],
      sourceFiles: [
        "src/app/api/routing/orders/route.ts",
        "src/app/api/routing/orders/import/route.ts",
        "src/lib/schemas/order.ts",
      ],
      models: ["Order", "OrderStatusEvent"],
      apiRoutes: ["POST /api/routing/orders/import"],
      uiRoutes: ["/routing/orders"],
      liveStatKey: "ordersByStatus",
    },
  },
  {
    id: "input-vehicles",
    kind: "input",
    lane: "fleet",
    titleKey: "vehicles",
    summaryKey: "vehiclesSummary",
    icon: "Truck",
    position: { x: COL_X.input, y: laneY("fleet") },
    detail: {
      inputs: [
        "Manual fleet roster (28 demo vehicles)",
        "Planned IoT + telematics CSV via DataConnector rows",
        "VehicleType (motorcycle|van) and EngineType (gasoline|diesel|ev)",
      ],
      process: [
        "Vehicle.create / update rows track odometer and lifetime",
        "enrichVehicle() assigns a current VQI + risk badge",
        "Maintenance windows computed from interval + last service",
      ],
      outputs: [
        "Vehicle rows with maintenance schedule",
        "VQI scores used by maintenance predictor + driver matching",
        "Feed maintenance dashboard + plan page availability",
      ],
      sourceFiles: [
        "src/app/api/vehicles/route.ts",
        "src/app/api/vehicles/import/route.ts",
        "src/lib/vehicle-service.ts",
      ],
      models: ["Vehicle", "DataConnector"],
      uiRoutes: ["/vehicles", "/dashboard"],
      liveStatKey: "fleetHealth",
    },
  },
  {
    id: "input-drivers",
    kind: "input",
    lane: "fleet",
    titleKey: "drivers",
    summaryKey: "driversSummary",
    icon: "User",
    position: { x: COL_X.input + 280, y: laneY("fleet") },
    detail: {
      inputs: [
        "Manual driver roster (5 demo drivers)",
        "Each Driver belongs to exactly one Vehicle",
        "Demo: Bima, Andi, Joko, Siti, Rina",
      ],
      process: [
        "Driver.createMany seeds name, phone, license",
        "Driver.vehicle relation (Restrict on delete)",
        "rankDriversByVqi ranks drivers per vehicle",
      ],
      outputs: [
        "Driver rows used by driver-matching process",
        "Visibility on /routing/drivers page",
      ],
      sourceFiles: [
        "prisma/seed.ts",
        "src/lib/routing/driver-matching.ts",
      ],
      models: ["Driver"],
      uiRoutes: ["/routing/drivers"],
      liveStatKey: "driverCount",
    },
  },
  {
    id: "input-fuel",
    kind: "input",
    lane: "fleet",
    titleKey: "fuelPrices",
    summaryKey: "fuelPricesSummary",
    icon: "Fuel",
    position: { x: COL_X.input + 560, y: laneY("fleet") },
    detail: {
      inputs: [
        "Public Pertamina fuel-price page",
        "refreshFuelPricesFromPertamina on build + on reseed",
      ],
      process: [
        "Fetches HTML and parses price-per-litre tables",
        "Persists FuelPriceSnapshot + FuelPriceItem rows",
        "Backend falls back to bundled snapshot if offline",
      ],
      outputs: [
        "Cost engine: IDR/km for gasoline/diesel/EV",
        "Naive-baseline fuel comparison for ROI panel",
        "Card on /system/gas-price",
      ],
      sourceFiles: [
        "src/lib/fuel-price-service.ts",
        "src/lib/routing/fuel-prices.ts",
      ],
      models: ["FuelPriceSnapshot", "FuelPriceItem"],
      uiRoutes: ["/system/gas-price"],
      liveStatKey: "fuelAge",
    },
  },
  {
    id: "input-traffic",
    kind: "input",
    lane: "routing",
    titleKey: "trafficProfile",
    summaryKey: "trafficProfileSummary",
    icon: "Route",
    position: { x: COL_X.input, y: laneY("routing") },
    detail: {
      inputs: [
        "Departure time (Asia/Jakarta)",
        "OSRM table distances (when reachable)",
        "Google Distance Matrix (opt-in via GOOGLE_MAPS_API_KEY)",
      ],
      process: [
        "getJakartaHour() + getJakartaTrafficMultiplier()",
        "calibrateJakartaDurationMin() applies OSRM_URBAN_CALIBRATION_FACTOR = 2.1",
        "JAKARTA_ROAD_DISTANCE_FACTOR = 1.42 for fallback",
        "Traffic-aware ETA per stop",
      ],
      outputs: [
        "Per-leg duration/distance estimates",
        "ETA per RouteStop",
        "Arrival-time Slack feeds DTI scoring",
      ],
      sourceFiles: [
        "src/lib/routing/traffic.ts",
        "src/lib/routing/estimator.ts",
        "src/lib/routing/jakarta.ts",
      ],
      uiRoutes: ["/routing/plan", "/routing/dashboard"],
    },
  },
  {
    id: "input-camera",
    kind: "input",
    lane: "warehouse",
    titleKey: "dockCamera",
    summaryKey: "dockCameraSummary",
    icon: "Camera",
    position: { x: COL_X.input, y: laneY("warehouse") },
    detail: {
      inputs: [
        "Live webcam frames via getUserMedia (browser-only)",
        "Static sample frames for /computer-vision/tour",
      ],
      process: [
        "camera-stream.ts crops + resizes frames client-side",
        "Send each frame to foreground-detector + box-detector",
      ],
      outputs: [
        "Foreground mask (motion map)",
        "Box bounding boxes fed into object-tracker + box-passage-counter",
      ],
      sourceFiles: [
        "src/lib/computer-vision/camera-stream.ts",
        "src/lib/computer-vision/foreground-detector.ts",
        "src/lib/computer-vision/box-detector.ts",
      ],
      uiRoutes: [
        "/computer-vision/tour",
        "/computer-vision/load-detection",
        "/computer-vision/hub-congestion-detection",
      ],
    },
  },
  {
    id: "input-connectors",
    kind: "input",
    lane: "platform",
    titleKey: "dataConnectors",
    summaryKey: "dataConnectorsSummary",
    icon: "Plug",
    position: { x: COL_X.input + 280, y: laneY("platform") },
    detail: {
      inputs: [
        "Five planned connectors: IoT, Telematics, Nightly CSV, OMS, WMS",
        "All `status=planned` in seed",
      ],
      process: [
        "Connectors table describes endpoints + polling windows",
        "vehicle.dataSource links Vehicle rows back to a Connector",
      ],
      outputs: [
        "Roadmap for live telemetry import",
        "Visibility on /connectors (future tab)",
      ],
      sourceFiles: ["prisma/seed.ts"],
      models: ["DataConnector"],
      uiRoutes: ["/connectors"],
      liveStatKey: "connectors",
    },
  },

  /* ============================== Processes ============================== */
  {
    id: "proc-vqi",
    kind: "process",
    lane: "fleet",
    titleKey: "vqi",
    summaryKey: "vqiSummary",
    icon: "Wrench",
    position: { x: COL_X.process, y: laneY("fleet") },
    detail: {
      inputs: [
        "Vehicle(odometer, expectedLifetimeKm, vehicleAgeYears)",
        "EngineType-driven cost + odometer modifiers",
      ],
      process: [
        "calculateVqi() — weighted score with PLANNING_PENALTY_PER_DAY = 0.5",
        "ENGINE_ODOMETER_MODIFIERS / ENGINE_COST_MODIFIERS per engine type",
        "RISK_THRESHOLDS buckets into low / medium / high",
      ],
      outputs: [
        "Risk badge per vehicle",
        "Feed into driver ranking via rankDriversByVqi",
        "Maintenance predictor dashboard at /dashboard",
      ],
      sourceFiles: [
        "src/lib/vqi.ts",
        "src/lib/predictor.ts",
        "src/lib/vehicle-service.ts",
      ],
      models: ["Vehicle"],
      uiRoutes: ["/dashboard"],
    },
  },
  {
    id: "proc-chunking",
    kind: "process",
    lane: "routing",
    titleKey: "chunking",
    summaryKey: "chunkingSummary",
    icon: "Calculator",
    position: { x: COL_X.process, y: laneY("routing") },
    detail: {
      inputs: [
        "RECEIVED orders from input-orders",
        "Available vehicles + drivers",
        "DEFAULT_MAX_STOPS_PER_ROUTE = 15",
      ],
      process: [
        "assignOrdersToVehicleChunks() groups orders into chunks",
        "StopAccess restrictions filter motorcycle vs car",
        "One chunk → one future RoutePlan",
      ],
      outputs: [
        "Chunk lists passed into the optimizer",
        "Visible in /routing/plan as 'selected N stops'",
      ],
      sourceFiles: ["src/lib/routing/assignment.ts"],
      models: ["Order"],
      uiRoutes: ["/routing/plan"],
    },
  },
  {
    id: "proc-driver-match",
    kind: "process",
    lane: "fleet",
    titleKey: "driverMatching",
    summaryKey: "driverMatchingSummary",
    icon: "User",
    position: { x: COL_X.process + 280, y: laneY("fleet") },
    detail: {
      inputs: [
        "Available drivers (each tied to a Vehicle)",
        "Vehicle VQI from proc-vqi",
      ],
      process: [
        "rankDriversByVqi() sorts drivers within a vehicle scope",
        "pickBestDriverFromRanking() chooses top of the list",
      ],
      outputs: [
        "Driver id used on the new RoutePlan",
        "Surface in driver list with maintenance risk badge",
      ],
      sourceFiles: ["src/lib/routing/driver-matching.ts"],
      models: ["Driver", "RoutePlan"],
    },
  },
  {
    id: "proc-optimizer",
    kind: "process",
    lane: "routing",
    titleKey: "optimizer",
    summaryKey: "optimizerSummary",
    icon: "Workflow",
    position: { x: COL_X.process + 140, y: laneY("routing") + 130 },
    detail: {
      inputs: [
        "Chunk from chunking process",
        "Traffic profile (ETA calibration)",
        "Road distances (OSRM / Google)",
        "Warehouse origin (Blok M Square)",
      ],
      process: [
        "optimizeRoundTripByNearestNeighbor() orders stops by proximity",
        "Per-leg distance + duration → totalDistanceKm + totalDurationMin",
        "estimatedEmissionsKg = ENGINE_FACTOR × distance",
      ],
      outputs: [
        "RoutePlan(warehouse, driver, totals)",
        "RouteStop[] ordered by sequence, with ETA",
        "Plan drawn on /routing/plan",
      ],
      sourceFiles: [
        "src/lib/routing/optimizer.ts",
        "src/lib/routing/emissions.ts",
      ],
      models: ["RoutePlan", "RouteStop"],
      uiRoutes: ["/routing/plan"],
    },
  },
  {
    id: "proc-dti",
    kind: "process",
    lane: "routing",
    titleKey: "dti",
    summaryKey: "dtiSummary",
    icon: "Activity",
    position: { x: COL_X.process + 560, y: laneY("routing") },
    detail: {
      inputs: [
        "Delivered stop: planned ETA vs actual deliveredAt",
      ],
      process: [
        "calculateDti() — slack vs SLA threshold × DTI_PENALTY_PER_MIN = 0.5",
        "aggregateDti() — average across stops for the route",
      ],
      outputs: [
        "Route DTI score on reports",
        "Per-stop DTI on delivery reports CSV",
      ],
      sourceFiles: ["src/lib/routing/dti.ts"],
      uiRoutes: ["/routing/reports", "/reports"],
    },
  },
  {
    id: "proc-cfi",
    kind: "process",
    lane: "routing",
    titleKey: "cfi",
    summaryKey: "cfiSummary",
    icon: "Calculator",
    position: { x: COL_X.process + 840, y: laneY("routing") },
    detail: {
      inputs: [
        "RouteStop sequence + per-leg distance",
        "Vehicle EngineType (factor from CO2_KG_PER_KM)",
      ],
      process: [
        "calculateCfi() sums route emissions",
        "allocateStopEmissions() distributes kg proportionally per stop",
      ],
      outputs: [
        "Route CO₂ column in /routing/reports",
        "Per-shipment kg on /reports CSV",
      ],
      sourceFiles: ["src/lib/routing/cfi.ts", "src/lib/routing/emissions.ts"],
      uiRoutes: ["/routing/reports", "/reports"],
    },
  },
  {
    id: "proc-fuelcost",
    kind: "process",
    lane: "fleet",
    titleKey: "fuelCost",
    summaryKey: "fuelCostSummary",
    icon: "Fuel",
    position: { x: COL_X.process + 560, y: laneY("fleet") },
    detail: {
      inputs: [
        "Per-leg distance + vehicle EngineType",
        "FUEL_CONSUMPTION_KM_PER_LITER or EV_KWH_PER_KM",
        "Live FuelPriceItem prices (IDR/litre)",
      ],
      process: [
        "calculateTripFuelCost() per trip",
        "estimateNaiveBaselineDistanceKm() — 1.25× optimized distance",
        "calculateTripFuelSavings() — vs naive baseline",
      ],
      outputs: [
        "Total IDR + savings vs naive",
        "Feeds /routing/dashboard + /reports",
      ],
      sourceFiles: ["src/lib/routing/fuel-cost.ts"],
      uiRoutes: ["/routing/dashboard", "/reports"],
    },
  },
  {
    id: "proc-cv",
    kind: "process",
    lane: "warehouse",
    titleKey: "computerVision",
    summaryKey: "computerVisionSummary",
    icon: "Camera",
    position: { x: COL_X.process, y: laneY("warehouse") },
    detail: {
      inputs: [
        "Camera frames from input-camera",
      ],
      process: [
        "foreground-detector outputs a motion mask",
        "box-detector returns bounding boxes per frame",
        "object-tracker links boxes across frames",
        "box-passage-counter() tallies inbound vs outbound bags",
      ],
      outputs: [
        "load-session-report.ts summary for /computer-vision/load-detection",
        "hub-session-report.ts summary for /computer-vision/hub-congestion-detection",
        "Client-only: persisted in localStorage",
      ],
      sourceFiles: [
        "src/lib/computer-vision/object-tracker.ts",
        "src/lib/computer-vision/box-passage-counter.ts",
        "src/lib/computer-vision/load-session-report.ts",
        "src/lib/computer-vision/hub-session-report.ts",
      ],
      uiRoutes: [
        "/computer-vision/load-detection",
        "/computer-vision/hub-congestion-detection",
        "/computer-vision/tour",
      ],
    },
  },
  {
    id: "proc-ai",
    kind: "process",
    lane: "assistant",
    titleKey: "aiAssistant",
    summaryKey: "aiAssistantSummary",
    icon: "Brain",
    position: { x: COL_X.process, y: laneY("assistant") },
    detail: {
      inputs: [
        "User chat question",
        "Live master overview snapshot (getMasterOverview)",
        "Optional AI provider credentials (env only)",
      ],
      process: [
        "Sovereign by default — in-process ai-chat helper reads SQLite",
        "If AI_ALLOW_EXTERNAL=true, delegates via ai-llm.ts to provider",
        "ai-chat-prompts.ts builds the system prompt + JSON context",
      ],
      outputs: [
        "Streaming chat answer at /ai/chat",
        "Privacy posture page at /sovereign-ai",
        "Per-role page accessible only when signed in",
      ],
      sourceFiles: [
        "src/lib/ai-chat.ts",
        "src/lib/ai-llm.ts",
        "src/lib/ai-chat-prompts.ts",
        "src/lib/master-overview.ts",
      ],
      apiRoutes: ["POST /api/ai/chat"],
      uiRoutes: ["/ai/chat", "/sovereign-ai"],
    },
  },

  /* ============================== Outputs ============================== */
  {
    id: "out-routeplan",
    kind: "output",
    lane: "routing",
    titleKey: "routePlan",
    summaryKey: "routePlanSummary",
    icon: "Route",
    position: { x: COL_X.output, y: laneY("routing") },
    detail: {
      inputs: ["All routing processes converging"],
      process: [
        "RoutePlan row created with status=PLANNED",
        "Total distance / duration / emissions persisted",
      ],
      outputs: [
        "Visualized plan on /routing/plan",
        "Status changes: PLANNED → IN_PROGRESS → COMPLETED",
        "Feeds reports",
      ],
      sourceFiles: ["prisma/schema.prisma"],
      models: ["RoutePlan"],
      uiRoutes: ["/routing/plan", "/routing/dashboard"],
      liveStatKey: "routes",
    },
  },
  {
    id: "out-deliveries",
    kind: "output",
    lane: "routing",
    titleKey: "deliveries",
    summaryKey: "deliveriesSummary",
    icon: "Package",
    position: { x: COL_X.output + 280, y: laneY("routing") },
    detail: {
      inputs: ["Order.status transitions: PREPARING → ON_ROUTE → DELIVERED"],
      process: [
        "Each transition writes an OrderStatusEvent",
        "ReceivedAt / preparingAt / onRouteAt / etaAt / deliveredAt",
      ],
      outputs: [
        "Per-order timeline shown on /routing/orders",
        "DTI + CFI for delivered orders",
      ],
      sourceFiles: ["prisma/schema.prisma"],
      models: ["Order", "OrderStatusEvent"],
      uiRoutes: ["/routing/orders"],
      liveStatKey: "ordersByStatus",
    },
  },
  {
    id: "out-reports",
    kind: "output",
    lane: "routing",
    titleKey: "reports",
    summaryKey: "reportsSummary",
    icon: "Activity",
    position: { x: COL_X.output, y: laneY("routing") + 170 },
    detail: {
      inputs: ["DTI, CFI, fuel cost, route totals"],
      process: [
        "aggregations from cfi.ts, dti.ts, fuel-cost.ts",
        "Exposed via /api/reports + /api/routing/reports",
      ],
      outputs: [
        "CSV downloads from /reports and /routing/reports",
        "Charts on master dashboard /dashboard",
      ],
      sourceFiles: [
        "src/app/api/reports/route.ts",
        "src/app/api/routing/reports/route.ts",
        "src/lib/routing-reports.ts",
      ],
      apiRoutes: ["GET /api/reports", "GET /api/routing/reports"],
      uiRoutes: ["/reports", "/routing/reports"],
    },
  },
  {
    id: "out-maintenance",
    kind: "output",
    lane: "fleet",
    titleKey: "maintenance",
    summaryKey: "maintenanceSummary",
    icon: "Wrench",
    position: { x: COL_X.output, y: laneY("fleet") },
    detail: {
      inputs: ["VQI scores + maintenance windows"],
      process: ["rule-based predictor flags high-risk vehicles"],
      outputs: [
        "Sortable maintenance table on /dashboard",
        "Feeds driver-matching risk awareness",
      ],
      sourceFiles: [
        "src/lib/predictor.ts",
        "src/lib/vehicle-service.ts",
      ],
      models: ["Vehicle"],
      uiRoutes: ["/dashboard"],
      liveStatKey: "fleetHealth",
    },
  },
  {
    id: "out-cv-reports",
    kind: "output",
    lane: "warehouse",
    titleKey: "cvReports",
    summaryKey: "cvReportsSummary",
    icon: "Warehouse",
    position: { x: COL_X.output, y: laneY("warehouse") },
    detail: {
      inputs: ["box-passage-counter tallies, motion masks"],
      process: [
        "load-session-report.ts and hub-session-report.ts summarise sessions",
        "session-report-history.ts keeps roll-up in localStorage",
      ],
      outputs: [
        "Reports panel under each CV page",
        "Persist locally so warehouse can audit catch-up",
      ],
      sourceFiles: [
        "src/lib/computer-vision/load-session-report.ts",
        "src/lib/computer-vision/hub-session-report.ts",
        "src/lib/computer-vision/session-report-history.ts",
      ],
      uiRoutes: [
        "/computer-vision/load-detection",
        "/computer-vision/hub-congestion-detection",
      ],
    },
  },
  {
    id: "out-ai-answers",
    kind: "output",
    lane: "assistant",
    titleKey: "aiAnswers",
    summaryKey: "aiAnswersSummary",
    icon: "Sparkles",
    position: { x: COL_X.output, y: laneY("assistant") },
    detail: {
      inputs: ["ai-assistant process output"],
      process: [
        "Sovereign or external LLM response",
        "Saved into ai-chat-history (browser localStorage)",
      ],
      outputs: [
        "Streaming chat at /ai/chat",
        "Saved conversations per device",
      ],
      sourceFiles: ["src/lib/ai-chat-history.ts"],
      uiRoutes: ["/ai/chat"],
    },
  },
] as const;

export const PROCESS_EDGES: ProcessEdge[] = [
  { id: "e-orders-chunk", source: "input-orders", target: "proc-chunking" },
  {
    id: "e-vehicles-vqi",
    source: "input-vehicles",
    target: "proc-vqi",
  },
  {
    id: "e-drivers-match",
    source: "input-drivers",
    target: "proc-driver-match",
  },
  {
    id: "e-fuel-fuelcost",
    source: "input-fuel",
    target: "proc-fuelcost",
  },
  {
    id: "e-traffic-opt",
    source: "input-traffic",
    target: "proc-optimizer",
    label: "ETA calibration",
  },
  {
    id: "e-camera-cv",
    source: "input-camera",
    target: "proc-cv",
  },
  {
    id: "e-vqi-match",
    source: "proc-vqi",
    target: "proc-driver-match",
  },
  {
    id: "e-chunk-opt",
    source: "proc-chunking",
    target: "proc-optimizer",
  },
  {
    id: "e-opt-routeplan",
    source: "proc-optimizer",
    target: "out-routeplan",
  },
  {
    id: "e-opt-deliveries",
    source: "proc-optimizer",
    target: "out-deliveries",
  },
  {
    id: "e-routeplan-dti",
    source: "out-routeplan",
    target: "proc-dti",
  },
  {
    id: "e-routeplan-cfi",
    source: "out-routeplan",
    target: "proc-cfi",
  },
  {
    id: "e-dti-reports",
    source: "proc-dti",
    target: "out-reports",
  },
  {
    id: "e-cfi-reports",
    source: "proc-cfi",
    target: "out-reports",
  },
  {
    id: "e-fuelcost-dashboard",
    source: "proc-fuelcost",
    target: "out-reports",
  },
  {
    id: "e-vqi-maintenance",
    source: "proc-vqi",
    target: "out-maintenance",
  },
  {
    id: "e-cv-reports",
    source: "proc-cv",
    target: "out-cv-reports",
  },
  {
    id: "e-reports-ai",
    source: "out-reports",
    target: "proc-ai",
    label: "context",
  },
  {
    id: "e-ai-answers",
    source: "proc-ai",
    target: "out-ai-answers",
  },
  {
    id: "e-deliveries-status",
    source: "out-deliveries",
    target: "out-routeplan",
    label: "OrderStatus events",
  },
];
