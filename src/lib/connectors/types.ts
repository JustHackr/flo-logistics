export interface ConnectorSyncResult {
  success: boolean;
  message: string;
}

export interface DataConnectorStrategy {
  testConnection(): Promise<ConnectorSyncResult>;
  syncVehicles(): Promise<ConnectorSyncResult>;
  syncTelemetry(): Promise<ConnectorSyncResult>;
}

export class NotImplementedConnector implements DataConnectorStrategy {
  constructor(private readonly connectorName: string) {}

  async testConnection(): Promise<ConnectorSyncResult> {
    return {
      success: false,
      message: `Connection testing for "${this.connectorName}" is not implemented yet.`,
    };
  }

  async syncVehicles(): Promise<ConnectorSyncResult> {
    return {
      success: false,
      message: `Vehicle sync for "${this.connectorName}" is not implemented yet.`,
    };
  }

  async syncTelemetry(): Promise<ConnectorSyncResult> {
    return {
      success: false,
      message: `Telemetry sync for "${this.connectorName}" is not implemented yet.`,
    };
  }
}
