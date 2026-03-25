import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Square, Eye } from "lucide-react";
import SatelliteRadar from "@/components/SatelliteRadar";
import TerminalLog from "@/components/TerminalLog";
import { WifiTable, BleTable } from "@/components/SignalTable";
import StatusBar from "@/components/StatusBar";
import DetailPanel from "@/components/DetailPanel";
import { useAlertSound } from "@/hooks/useAlertSound";
import { type WifiSignal, type BleDevice, type LogEntry } from "@/lib/mockData";

export default function Index() {
  const [isScanning, setIsScanning] = useState(false);
  const [isBaselineComplete, setIsBaselineComplete] = useState(false);
  const [baselineProgress, setBaselineProgress] = useState(0);
  const [wifiSignals, setWifiSignals] = useState<WifiSignal[]>([]);
  const [bleDevices, setBleDevices] = useState<BleDevice[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasRedAlert, setHasRedAlert] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const playAlert = useAlertSound();

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), level, message }]);
  }, []);

  const triggerRedAlert = useCallback(() => {
    setHasRedAlert(true);
    playAlert();
  }, [playAlert]);

  useEffect(() => {
    if (!isScanning) {
      if (socketRef.current) socketRef.current.close();
      return;
    }

    const socket = new WebSocket('ws://127.0.0.1:5000/ws');
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setIsBaselineComplete(!data.stats.mapping);
      setBaselineProgress(data.stats.mapping ? 50 : 100);

      // --- DEDUPLICATION LOGIC ---
      // We use a Map to ensure each MAC address (ID) is unique in the UI
      const wifiMap = new Map();
      data.nodes.filter((n: any) => n.type === "wifi").forEach((n: any) => {
        // Only keep the entry if it's new or has a stronger signal than the existing one
        if (!wifiMap.has(n.id) || n.rssi > wifiMap.get(n.id).rssi) {
          wifiMap.set(n.id, {
            bssid: n.id,
            ssid: n.ssid,
            rssi: n.rssi,
            threatLevel: n.status,
            frequency: "2.4GHz",
            channel: 1,
            manufacturer: n.mfg || "Unknown",
          });
        }
      });

      const bleMap = new Map();
      data.nodes.filter((n: any) => n.type === "ble").forEach((n: any) => {
        if (!bleMap.has(n.id) || n.rssi > bleMap.get(n.id).rssi) {
          bleMap.set(n.id, {
            mac: n.id,
            name: n.ssid,
            rssi: n.rssi,
            threatLevel: n.status,
            type: "BLE",
            manufacturer: n.mfg || "Unknown",
            isTracker: n.status === "red",
          });
        }
      });

      setWifiSignals(Array.from(wifiMap.values()));
      setBleDevices(Array.from(bleMap.values()));

      if (data.stats.threats > 0 && !hasRedAlert) {
        addLog("ALERT", `⚠ ANOMALY DETECTED: ${data.stats.threats} unidentified nodes.`);
        triggerRedAlert();
      }
    };

    return () => socket.close();
  }, [isScanning, addLog, triggerRedAlert, hasRedAlert]);

  const startScan = useCallback(() => {
    setIsScanning(true);
    setStartTime(Date.now());
    setWifiSignals([]);
    setBleDevices([]);
    setLogs([]);
    setHasRedAlert(false);
    addLog("SYSTEM", "Passive Sensors Engaged...");
  }, [addLog]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (socketRef.current) socketRef.current.close();
    addLog("SYSTEM", "Scan terminated by operator.");
  }, [addLog]);

  const [uptime, setUptime] = useState("00:00:00");
  useEffect(() => {
    if (!isScanning || !startTime) return;
    const id = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setUptime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(id);
  }, [isScanning, startTime]);

  const threatCount = wifiSignals.filter((s) => s.threatLevel === "red").length +
    bleDevices.filter((d) => d.threatLevel === "red").length;

  return (
    <div className={`min-h-screen bg-background relative ${hasRedAlert ? "glow-border-danger" : ""}`}>
      <div className="fixed inset-0 scanline-overlay pointer-events-none z-50" />
      <header className="border-b border-border px-4 py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Eye className="text-primary" size={18} />
          <h1 className="text-primary tracking-[0.3em] glow-text-strong font-semibold">VISION</h1>
        </div>
        {!isScanning ? (
          <button onClick={startScan} className="px-4 py-1.5 bg-primary text-primary-foreground text-xs rounded-sm">INITIATE VISION</button>
        ) : (
          <button onClick={stopScan} className="px-4 py-1.5 bg-destructive text-destructive-foreground text-xs rounded-sm">TERMINATE</button>
        )}
      </header>
      <div className="px-4 py-2 relative z-10">
        <StatusBar isScanning={isScanning} isBaselineComplete={isBaselineComplete} baselineProgress={baselineProgress} totalNodes={wifiSignals.length + bleDevices.length} threatCount={threatCount} uptime={uptime} />
      </div>
      <main className="px-4 pb-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 flex flex-col gap-4">
            <SatelliteRadar wifiSignals={wifiSignals} bleDevices={bleDevices} isScanning={isScanning} selectedId={selectedId} onBlipClick={setSelectedId} />
            <TerminalLog logs={logs} />
          </div>
          <div className="lg:col-span-8 flex flex-col gap-4">
            <WifiTable signals={wifiSignals} selectedId={selectedId} onSelect={setSelectedId} />
            <BleTable devices={bleDevices} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>
      </main>
      <DetailPanel wifiSignals={wifiSignals} bleDevices={bleDevices} selectedId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}