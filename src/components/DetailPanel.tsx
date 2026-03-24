import { X, Wifi, Bluetooth, Shield, ShieldAlert, AlertTriangle, Clock, Radio, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WifiSignal, BleDevice } from "@/lib/mockData";
import { timeSince } from "@/lib/mockData";

interface DetailPanelProps {
  wifiSignals: WifiSignal[];
  bleDevices: BleDevice[];
  selectedId: string | null;
  onClose: () => void;
}

function ThreatBadgeLarge({ level }: { level: "green" | "yellow" | "red" }) {
  const cls = level === "red" ? "status-red" : level === "yellow" ? "status-yellow" : "status-green";
  const Icon = level === "red" ? ShieldAlert : level === "yellow" ? AlertTriangle : Shield;
  const label = level === "red" ? "HIGH THREAT" : level === "yellow" ? "ANOMALY" : "BASELINE";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cls}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
      <span className="text-[10px] text-muted-foreground tracking-wider uppercase">{label}</span>
      <span className="text-xs text-secondary-foreground font-mono">{value}</span>
    </div>
  );
}

export default function DetailPanel({ wifiSignals, bleDevices, selectedId, onClose }: DetailPanelProps) {
  const wifi = wifiSignals.find((s) => s.id === selectedId);
  const ble = bleDevices.find((d) => d.id === selectedId);
  const item = wifi || ble;

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Mobile overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-card border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {wifi ? <Wifi size={14} className="text-primary" /> : <Bluetooth size={14} className="text-primary" />}
                <span className="text-xs text-primary tracking-widest">
                  {wifi ? "Wi-Fi NODE" : "BLE DEVICE"}
                </span>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Threat Level */}
              <div className="cyber-panel p-3 flex items-center justify-center">
                <ThreatBadgeLarge level={item.threatLevel} />
              </div>

              {/* Identity */}
              <div>
                <h3 className="text-[10px] text-primary tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Fingerprint size={10} /> IDENTITY
                </h3>
                <div className="space-y-0">
                  {wifi && (
                    <>
                      <Field label="SSID" value={wifi.ssid} />
                      <Field label="BSSID" value={wifi.bssid} />
                      <Field label="Channel" value={wifi.channel} />
                      <Field label="Frequency" value={wifi.frequency} />
                      <Field label="Missed Cycles" value={wifi.missedCycles} />
                      <Field label="Baseline" value={wifi.isBaseline ? "YES" : "NO"} />
                    </>
                  )}
                  {ble && (
                    <>
                      <Field label="Name" value={ble.name} />
                      <Field label="MAC" value={ble.mac} />
                      <Field label="Type" value={ble.type.toUpperCase()} />
                      <Field label="Tracker" value={ble.isTracker ? "⚠ YES" : "NO"} />
                    </>
                  )}
                </div>
              </div>

              {/* Signal */}
              <div>
                <h3 className="text-[10px] text-primary tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Radio size={10} /> SIGNAL
                </h3>
                <Field label="RSSI" value={`${item.rssi} dBm`} />
                <Field label="Manufacturer" value={item.manufacturer} />
                <div className="mt-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Signal Strength</div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.rssi > -50 ? "bg-primary" : item.rssi > -70 ? "bg-warning" : "bg-destructive"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, ((item.rssi + 90) / 60) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div>
                <h3 className="text-[10px] text-primary tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Clock size={10} /> TIMING
                </h3>
                <Field label="First Seen" value={timeSince(item.firstSeen) + " ago"} />
                <Field label="Last Seen" value={timeSince(item.lastSeen) + " ago"} />
                <Field
                  label="First Seen (abs)"
                  value={new Date(item.firstSeen).toLocaleTimeString("en-US", { hour12: false })}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
