# FLO Chain of Custody

The custody feature is a relational graph over immutable parcel observations. It is intentionally not a blockchain or a separate graph database: `CustodyParcel` is the parcel, `CustodyActor` is a person/system/vehicle/hub, `CustodyEvent` is a time-stamped observation, and the graph edges are reconstructed from each event's `fromActorId` and `toActorId`.

## What a judge can see

Open `/custody` and choose **Run custody demo**. The synthetic journey is:

`OMS → WMS JKT-01 → Matthew → VAN-03 → arrival at JKT-02 → damaged inspection → linked return`

FLO deliberately omits the destination hub receiving event. The page then shows a `CUSTODY_MISSING_HANDOFF` anomaly, a condition conflict, a confidence score, evidence references, and a candidate review window. It says “requires review,” never “this person is responsible.” **Reset** removes the replayed events, anomalies, investigations, and Control Tower exceptions for the synthetic parcel.

Every event carries `LIVE`, `SYNTHETIC`, `FALLBACK`, or `MANUAL` provenance. The fixture provider is used when no Blibli custody endpoint is configured. `BlibliOmsCustodyProvider`, `BlibliWmsCustodyProvider`, and `ManualCustodyProvider` are server-side extension points for later webhooks or polling.

## Operational flow

1. An OMS/WMS, QR/barcode scan, or operator creates an event.
2. FLO upserts the parcel and actors, validates identity, hub, custodian, timestamp, location, OMS/WMS agreement, previous handoff, and duplicate status.
3. The event is idempotent on `sourceSystem + externalEventId`.
4. The anomaly engine checks missing handoffs, wrong hubs, duplicate/replayed scans, conflicts, and outbound/inbound condition changes.
5. The confidence engine produces a transparent score and positive/negative signals.
6. A responsibility service compares the last known good event with the first known bad event and lists candidate custodians/locations.
7. High-risk findings create persistent Control Tower exceptions. Ops can acknowledge, resolve, open the custody graph, or create an investigation.

Returns Intelligence bridges verified return scans and completed inspections into the original outbound graph when a `CustodyParcel` is linked to the `ReturnCase`.

## Local run

```powershell
git checkout GoldenBough
npm install
npx prisma migrate deploy
npm run db:seed:demo
npm run dev
```

Sign in with `ops@flo.demo` / `demo1234`, then visit `http://localhost:3000/custody`. No external credentials are required for the synthetic demo. The APIs are under `/api/custody`; mutations enforce server-side role checks.

