// OUI prefix to manufacturer lookup
const OUI_DATABASE: Record<string, string> = {
  "AA:BB:CC": "Apple Inc.",
  "DE:AD:BE": "Tesla Motors",
  "11:22:33": "Cisco Systems",
  "44:55:66": "Samsung Electronics",
  "77:88:99": "Google LLC",
  "AB:CD:EF": "Intel Corporation",
  "FE:DC:BA": "Huawei Technologies",
  "12:34:56": "Microsoft Corp.",
  "78:9A:BC": "Amazon Devices",
  "A1:B2:C3": "Qualcomm",
  "D4:E5:F6": "Broadcom Inc.",
  "FA:CE:00": "Tile Inc.",
  "B1:0B:00": "Sony Corp.",
};

export function resolveManufacturer(mac: string): string {
  const prefix = mac.substring(0, 8).toUpperCase();
  return OUI_DATABASE[prefix] || "Unknown";
}

export type ThreatLevel = "green" | "yellow" | "red";

export interface WifiSignal {
  id: string;
  ssid: string;
  bssid: string;
  frequency: "2.4GHz" | "5GHz";
  rssi: number;
  channel: number;
  manufacturer: string;
  threatLevel: ThreatLevel;
  firstSeen: number;
  lastSeen: number;
  missedCycles: number;
  isBaseline: boolean;
}

export interface BleDevice {
  id: string;
  name: string;
  mac: string;
  rssi: number;
  manufacturer: string;
  type: "generic" | "tracker" | "peripheral" | "beacon";
  threatLevel: ThreatLevel;
  firstSeen: number;
  lastSeen: number;
  isTracker: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: "SYSTEM" | "ALERT" | "INFO" | "WARNING";
  message: string;
}

const SSID_POOL = [
  "HomeNetwork_5G", "NETGEAR-2.4", "TP-Link_A8F2", "xfinitywifi",
  "FBI_Surveillance_Van", "Linksys00192", "ATT-WIFI-8821", "CiscoMeraki",
  "TeslaGuest", "GoogleStarbucks", "AmazonEcho_Setup", "HiddenNetwork",
  "5G_Tower_Node_7", "DIRECT-roku-291"
];

const BLE_NAMES = [
  "AirTag_192F", "Tile_Mate_X", "Galaxy Buds Pro", "AirPods_Max",
  "Fitbit Charge 5", "Mi Band 7", "[TV] Samsung", "JBL Flip 6",
  "Unknown BLE Device", "iBeacon_Store", "Eddystone_A3"
];

function randomMac(): string {
  const prefixes = Object.keys(OUI_DATABASE);
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
  ).join(":");
  return `${prefix}:${suffix}`;
}

let wifiCounter = 0;
let bleCounter = 0;

export function generateWifiSignal(isBaseline: boolean): WifiSignal {
  const mac = randomMac();
  const rssi = -(Math.floor(Math.random() * 60) + 30);
  const freq = Math.random() > 0.4 ? "2.4GHz" : "5GHz" as const;
  const now = Date.now();

  return {
    id: `wifi-${++wifiCounter}`,
    ssid: SSID_POOL[Math.floor(Math.random() * SSID_POOL.length)],
    bssid: mac,
    frequency: freq,
    rssi,
    channel: freq === "2.4GHz" ? Math.floor(Math.random() * 13) + 1 : Math.floor(Math.random() * 8) * 4 + 36,
    manufacturer: resolveManufacturer(mac),
    threatLevel: isBaseline ? "green" : "yellow",
    firstSeen: now,
    lastSeen: now,
    missedCycles: 0,
    isBaseline,
  };
}

export function generateBleDevice(isBaseline: boolean): BleDevice {
  const mac = randomMac();
  const name = BLE_NAMES[Math.floor(Math.random() * BLE_NAMES.length)];
  const isTracker = name.includes("AirTag") || name.includes("Tile");
  const now = Date.now();

  return {
    id: `ble-${++bleCounter}`,
    name,
    mac,
    rssi: -(Math.floor(Math.random() * 50) + 40),
    manufacturer: resolveManufacturer(mac),
    type: isTracker ? "tracker" : "generic",
    threatLevel: isTracker && !isBaseline ? "red" : isBaseline ? "green" : "yellow",
    firstSeen: now,
    lastSeen: now,
    isTracker,
  };
}

export function generateBaselineData(): { wifi: WifiSignal[]; ble: BleDevice[] } {
  const wifi = Array.from({ length: 6 + Math.floor(Math.random() * 4) }, () => generateWifiSignal(true));
  const ble = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => generateBleDevice(true));
  return { wifi, ble };
}

export function generateAnomalyWifi(): WifiSignal {
  const signal = generateWifiSignal(false);
  // 20% chance of MAC hopping (red threat)
  if (Math.random() < 0.2) {
    signal.threatLevel = "red";
    signal.ssid = "HIDDEN";
  }
  return signal;
}

export function generateAnomalyBle(): BleDevice {
  return generateBleDevice(false);
}

export function timeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
