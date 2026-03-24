import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Bluetooth, AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import type { WifiSignal, BleDevice, ThreatLevel } from "@/lib/mockData";
import { timeSince } from "@/lib/mockData";

function ThreatBadge({ level }: { level: ThreatLevel }) {
  const cls = level === "red" ? "status-red" : level === "yellow" ? "status-yellow" : "status-green";
  const Icon = level === "red" ? ShieldAlert : level === "yellow" ? AlertTriangle : Shield;
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      <Icon size={12} />
      <span className="uppercase text-[10px]">{level}</span>
    </span>
  );
}

function RssiBar({ rssi }: { rssi: number }) {
  const strength = Math.min(100, Math.max(0, ((rssi + 90) / 60) * 100));
  const color = strength > 60 ? "bg-primary" : strength > 30 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${strength}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{rssi}dBm</span>
    </div>
  );
}

interface WifiTableProps {
  signals: WifiSignal[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WifiTable({ signals, selectedId, onSelect }: WifiTableProps) {
  return (
    <div className="cyber-panel overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 relative z-10">
        <Wifi size={14} className="text-primary" />
        <span className="text-xs text-primary tracking-widest">PASSIVE Wi-Fi RADAR</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{signals.length} nodes</span>
      </div>
      <div className="overflow-x-auto relative z-10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="data-cell text-left">STATUS</th>
              <th className="data-cell text-left">SSID</th>
              <th className="data-cell text-left hidden sm:table-cell">BSSID</th>
              <th className="data-cell text-left hidden md:table-cell">FREQ</th>
              <th className="data-cell text-left">RSSI</th>
              <th className="data-cell text-left hidden lg:table-cell">MFG</th>
              <th className="data-cell text-left hidden md:table-cell">FIRST SEEN</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {signals.map((s) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, backgroundColor: "hsl(120 100% 50% / 0.05)" }}
                  animate={{ opacity: 1, backgroundColor: selectedId === s.id ? "hsl(120 100% 50% / 0.08)" : "transparent" }}
                  exit={{ opacity: 0 }}
                  onClick={() => onSelect(s.id)}
                  className="cursor-pointer hover:bg-secondary transition-colors"
                >
                  <td className="data-cell"><ThreatBadge level={s.threatLevel} /></td>
                  <td className="data-cell text-secondary-foreground">{s.ssid}</td>
                  <td className="data-cell text-muted-foreground hidden sm:table-cell font-mono">{s.bssid}</td>
                  <td className="data-cell text-muted-foreground hidden md:table-cell">{s.frequency}</td>
                  <td className="data-cell"><RssiBar rssi={s.rssi} /></td>
                  <td className="data-cell text-muted-foreground hidden lg:table-cell">{s.manufacturer}</td>
                  <td className="data-cell text-muted-foreground hidden md:table-cell">{timeSince(s.firstSeen)}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface BleTableProps {
  devices: BleDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function BleTable({ devices, selectedId, onSelect }: BleTableProps) {
  return (
    <div className="cyber-panel overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 relative z-10">
        <Bluetooth size={14} className="text-primary" />
        <span className="text-xs text-primary tracking-widest">BLE TRACKER LAYER</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{devices.length} devices</span>
      </div>
      <div className="overflow-x-auto relative z-10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="data-cell text-left">STATUS</th>
              <th className="data-cell text-left">NAME</th>
              <th className="data-cell text-left hidden sm:table-cell">MAC</th>
              <th className="data-cell text-left">RSSI</th>
              <th className="data-cell text-left hidden md:table-cell">TYPE</th>
              <th className="data-cell text-left hidden lg:table-cell">MFG</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {devices.map((d) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, backgroundColor: selectedId === d.id ? "hsl(120 100% 50% / 0.08)" : "transparent" }}
                  exit={{ opacity: 0 }}
                  onClick={() => onSelect(d.id)}
                  className={`cursor-pointer hover:bg-secondary transition-colors ${d.isTracker ? "border-l-2 border-l-destructive" : ""}`}
                >
                  <td className="data-cell"><ThreatBadge level={d.threatLevel} /></td>
                  <td className="data-cell text-secondary-foreground">{d.name}</td>
                  <td className="data-cell text-muted-foreground hidden sm:table-cell font-mono">{d.mac}</td>
                  <td className="data-cell"><RssiBar rssi={d.rssi} /></td>
                  <td className="data-cell hidden md:table-cell">
                    <span className={d.isTracker ? "status-red" : "text-muted-foreground"}>
                      {d.isTracker ? "⚠ TRACKER" : d.type}
                    </span>
                  </td>
                  <td className="data-cell text-muted-foreground hidden lg:table-cell">{d.manufacturer}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
