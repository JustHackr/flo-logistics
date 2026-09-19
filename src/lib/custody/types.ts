export const CUSTODY_EVENT_TYPES = [
  "ORDER_CREATED", "PARCEL_CREATED", "PARCEL_PACKED", "PARCEL_SEALED",
  "WAREHOUSE_RELEASE", "DRIVER_ACCEPTED", "VEHICLE_LOADED", "VEHICLE_DEPARTED",
  "HUB_ARRIVAL", "HUB_RECEIVED", "ROUTE_ASSIGNED", "OUT_FOR_DELIVERY",
  "DELIVERY_ATTEMPT", "DELIVERED", "RETURN_REQUESTED", "RETURN_PICKED_UP",
  "RETURN_RECEIVED", "INSPECTION_COMPLETED", "DISPOSITION_APPROVED",
] as const;

export type CustodyEventType = (typeof CUSTODY_EVENT_TYPES)[number];
export type CustodyDataSource = "LIVE" | "SYNTHETIC" | "FALLBACK" | "MANUAL";
export type ValidationStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "SUSPICIOUS" | "MISSING" | "CONFLICTING" | "MANUAL_REVIEW";
export type CustodyRiskLevel = "TRUSTED" | "VERIFIED" | "REVIEW" | "CRITICAL";
export type CustodyAnomalyStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "ESCALATED";

export type CustodyEventInput = {
  externalParcelId: string;
  eventType: CustodyEventType | string;
  externalEventId: string;
  sourceSystem: string;
  source?: string;
  dataSource: CustodyDataSource;
  fromActor?: ActorInput;
  toActor?: ActorInput;
  actorUserId?: string;
  hubCode?: string;
  lat?: number;
  lng?: number;
  scanMethod?: string;
  correlationId?: string;
  observedAt: Date;
  payload?: Record<string, unknown>;
  evidence?: EvidenceInput[];
};

export type ActorInput = {
  actorType: string;
  externalId: string;
  name: string;
  hubCode?: string;
  vehicleCode?: string;
};

export type EvidenceInput = {
  evidenceType: string;
  reference: string;
  metadata?: Record<string, unknown>;
  capturedAt?: Date;
};

export type EventCheck = { key: string; label: string; passed: boolean; detail: string };

export type CustodyEventView = {
  id: string;
  eventType: string;
  externalEventId: string;
  sourceSystem: string;
  source: string | null;
  dataSource: CustodyDataSource;
  fromActor: ActorView | null;
  toActor: ActorView | null;
  hubCode: string | null;
  lat: number | null;
  lng: number | null;
  scanMethod: string | null;
  correlationId: string | null;
  validationStatus: ValidationStatus;
  validation: EventCheck[];
  confidenceDelta: number;
  observedAt: string;
  receivedAt: string;
  evidence: EvidenceView[];
};

export type ActorView = { id: string; actorType: string; externalId: string; name: string; hubCode: string | null; vehicleCode: string | null };
export type EvidenceView = { id: string; evidenceType: string; reference: string; metadata: Record<string, unknown>; capturedAt: string | null };

export type AnomalyView = {
  id: string;
  kind: string;
  severity: string;
  status: CustodyAnomalyStatus;
  reason: string;
  explanation: string;
  sourceEventIds: string[];
  candidateCustodianIds: string[];
  recommendedAction: string;
  dataSource: CustodyDataSource;
  createdAt: string;
  resolvedAt: string | null;
};

export type ResponsibilityWindow = {
  lastKnownGood: { eventId: string; label: string; location: string; observedAt: string } | null;
  firstKnownBad: { eventId: string; label: string; location: string; observedAt: string } | null;
  from: string | null;
  to: string | null;
  candidateCustodians: ActorView[];
  candidateLocations: string[];
  missingEvidence: string[];
  confidence: number;
  statement: string;
};

export type CustodyParcelView = {
  id: string;
  externalParcelId: string;
  orderId: string | null;
  externalOrderId: string | null;
  returnCaseId: string | null;
  externalReturnId: string | null;
  barcode: string | null;
  qrPayload: string | null;
  sku: string | null;
  serialNumber: string | null;
  originHub: string | null;
  destinationHub: string | null;
  currentState: string;
  currentLocation: string | null;
  currentCustodian: ActorView | null;
  confidenceScore: number;
  riskLevel: CustodyRiskLevel;
  dataSource: CustodyDataSource;
  updatedAt: string;
  events: CustodyEventView[];
  anomalies: AnomalyView[];
  evidence: EvidenceView[];
  responsibilityWindow: ResponsibilityWindow;
};

export type CustodyGraph = {
  nodes: ActorView[];
  edges: Array<{ eventId: string; from: ActorView | null; to: ActorView | null; eventType: string; observedAt: string; hubCode: string | null; validationStatus: ValidationStatus; confidenceDelta: number }>;
};
