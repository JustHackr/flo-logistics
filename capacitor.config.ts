import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "xyz.nxtdev.flo",
  appName: "FLO",
  webDir: "public",
  server: {
    url: "https://radr.nxtdev.xyz/flo-logistics/app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
