import type { connectorTypes } from "@/lib/schemas/connector";

export const CONNECTOR_TYPE_REGISTRY: Record<
  (typeof connectorTypes)[number],
  {
    label: string;
    description: string;
    adapterClass: string;
    configFields: Array<{
      key: string;
      label: string;
      type: "text" | "password" | "number" | "url";
      placeholder?: string;
    }>;
  }
> = {
  iot: {
    label: "IoT Sensor Hub",
    description: "Ingest odometer and engine telemetry from IoT devices.",
    adapterClass: "IoTConnector",
    configFields: [
      { key: "endpointUrl", label: "MQTT / Gateway URL", type: "url", placeholder: "mqtt://gateway.example.com" },
      { key: "apiKey", label: "Device API Key", type: "password" },
      { key: "pollingIntervalMinutes", label: "Polling Interval (minutes)", type: "number", placeholder: "15" },
    ],
  },
  rest_api: {
    label: "REST API",
    description: "Pull fleet data from an external REST API endpoint.",
    adapterClass: "RestApiConnector",
    configFields: [
      { key: "endpointUrl", label: "API Endpoint URL", type: "url", placeholder: "https://api.fleet.example.com/v1" },
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "pollingIntervalMinutes", label: "Polling Interval (minutes)", type: "number", placeholder: "60" },
    ],
  },
  webhook: {
    label: "Webhook",
    description: "Receive push updates from external systems via webhook.",
    adapterClass: "WebhookConnector",
    configFields: [
      { key: "endpointUrl", label: "Webhook URL", type: "url", placeholder: "https://your-app.example.com/api/webhooks/fleet" },
      { key: "webhookSecret", label: "Webhook Secret", type: "password" },
    ],
  },
  telematics: {
    label: "Fleet Telematics",
    description: "Connect to fleet telematics providers for live vehicle data.",
    adapterClass: "TelematicsConnector",
    configFields: [
      { key: "endpointUrl", label: "Telematics Provider URL", type: "url", placeholder: "https://telematics.example.com" },
      { key: "apiKey", label: "Provider API Key", type: "password" },
      { key: "pollingIntervalMinutes", label: "Sync Interval (minutes)", type: "number", placeholder: "30" },
    ],
  },
  csv_scheduled: {
    label: "Scheduled CSV",
    description: "Automatically import fleet data from a scheduled CSV drop.",
    adapterClass: "ScheduledCsvConnector",
    configFields: [
      { key: "endpointUrl", label: "CSV Source URL", type: "url", placeholder: "https://storage.example.com/fleet-export.csv" },
      { key: "pollingIntervalMinutes", label: "Import Interval (minutes)", type: "number", placeholder: "1440" },
    ],
  },
  oms: {
    label: "Order Management System (OMS)",
    description: "Sync orders, fulfillment status, and delivery events from your OMS.",
    adapterClass: "OmsConnector",
    configFields: [
      { key: "endpointUrl", label: "OMS API URL", type: "url", placeholder: "https://oms.example.com/api/v1" },
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "pollingIntervalMinutes", label: "Sync Interval (minutes)", type: "number", placeholder: "15" },
    ],
  },
  wms: {
    label: "Warehouse Management System (WMS)",
    description: "Sync inventory, pick lists, and warehouse operations from your WMS.",
    adapterClass: "WmsConnector",
    configFields: [
      { key: "endpointUrl", label: "WMS API URL", type: "url", placeholder: "https://wms.example.com/api/v1" },
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "pollingIntervalMinutes", label: "Sync Interval (minutes)", type: "number", placeholder: "30" },
    ],
  },
};
