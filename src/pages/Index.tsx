import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Square, Download, Eye } from "lucide-react";
import SatelliteRadar from "@/components/SatelliteRadar";
import TerminalLog from "@/components/TerminalLog";
import { WifiTable, BleTable } from "@/components/SignalTable";
import StatusBar from "@/components/StatusBar";
import {
  generateBaselineData, generateAnomalyWifi, generateAnomalyBle,
  type WifiSignal, type BleDevice, type LogEntry
} from "@/lib/mockData";

const BASELINE_DURATION = 15000; // 15s for demo (60s in prod)
const SCAN_INTERVAL = 3000;

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
  const intervalsRef = useRef<number[]>([]);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), level, message }]);
  }, []);

  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const startScan = useCallback(() => {
    setIsScanning(true);
    setIsBaselineComplete(false);
    setBaselineProgress(0);
    setWifiSignals([]);
    setBleDevices([]);
    setLogs([]);
    setSelectedId(null);
    setHasRedAlert(false);
    setStartTime(Date.now());

    addLog("SYSTEM", "Passive Sensors Engaged...");
    addLog("SYSTEM", "Initializing Wi-Fi monitor mode...");
    addLog("SYSTEM", "BLE advertising scanner active...");
    addLog("SYSTEM", "Mapping Baseline...");

    // Populate baseline gradually
    const baselineData = generateBaselineData();
    let wifiIdx = 0;
    let bleIdx = 0;

    const populateId = window.setInterval(() => {
      if (wifiIdx < baselineData.wifi.length) {
        const sig = baselineData.wifi[wifiIdx++];
        setWifiSignals((prev) => [...prev, sig]);
        addLog("INFO", `Wi-Fi node detected: ${sig.ssid} [${sig.bssid}]`);
      }
      if (bleIdx < baselineData.ble.length) {
        const dev = baselineData.ble[bleIdx++];
        setBleDevices((prev) => [...prev, dev]);
        addLog("INFO", `BLE device detected: ${dev.name} [${dev.mac}]`);
      }
      if (wifiIdx >= baselineData.wifi.length && bleIdx >= baselineData.ble.length) {
        clearInterval(populateId);
      }
    }, 1500);
    intervalsRef.current.push(populateId);

    // Baseline progress
    const progressId = window.setInterval(() => {
      setBaselineProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressId);
          return 100;
        }
        return prev + (100 / (BASELINE_DURATION / 500));
      });
    }, 500);
    intervalsRef.current.push(progressId);

    // Baseline complete
    const baselineTimeout = window.setTimeout(() => {
      setIsBaselineComplete(true);
      setBaselineProgress(100);
      addLog("SYSTEM", "Baseline mapping complete.");
      addLog("SYSTEM", "Entering watch mode — anomaly detection active.");

      // Anomaly injection
      const anomalyId = window.setInterval(() => {
        if (Math.random() > 0.4) {
          const newWifi = generateAnomalyWifi();
          setWifiSignals((prev) => [...prev, newWifi]);
          if (newWifi.threatLevel === "red") {
            addLog("ALERT", `⚠ RED NODE: MAC-hopping detected — ${newWifi.bssid}`);
            setHasRedAlert(true);
          } else {
            addLog("WARNING", `New node detected: ${newWifi.ssid} [${newWifi.bssid}]`);
          }
        }
        if (Math.random() > 0.6) {
          const newBle = generateAnomalyBle();
          setBleDevices((prev) => [...prev, newBle]);
          if (newBle.isTracker) {
            addLog("ALERT", `⚠ TRACKER DETECTED: ${newBle.name} [${newBle.mac}]`);
            setHasRedAlert(true);
          } else {
            addLog("INFO", `BLE anomaly: ${newBle.name}`);
          }
        }
      }, SCAN_INTERVAL);
      intervalsRef.current.push(anomalyId);
    }, BASELINE_DURATION);
    intervalsRef.current.push(baselineTimeout as unknown as number);
  }, [addLog, clearIntervals]);

  const stopScan = useCallback(() => {
    clearIntervals();
    setIsScanning(false);
    addLog("SYSTEM", "Scan terminated by operator.");
  }, [clearIntervals, addLog]);

  const exportSession = useCallback((format: "json" | "txt") => {
    const data = { wifiSignals, bleDevices, logs, exportedAt: new Date().toISOString() };
    let content: string;
    let mime: string;
    let ext: string;

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
      mime = "application/json";
      ext = "json";
    } else {
      content = logs.map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message}`).join("\n");
      mime = "text/plain";
      ext = "txt";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vision-session-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("SYSTEM", `Session exported as .${ext}`);
  }, [wifiSignals, bleDevices, logs, addLog]);

  // Uptime ticker
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

  useEffect(() => {
    return () => clearIntervals();
  }, [clearIntervals]);

  const threatCount = wifiSignals.filter((s) => s.threatLevel === "red").length +
    bleDevices.filter((d) => d.threatLevel === "red").length;

  return (
    <div className={`min-h-screen bg-background relative ${hasRedAlert ? "glow-border-danger" : ""}`}>
      {/* Full-page scanline */}
      <div className="fixed inset-0 scanline-overlay pointer-events-none z-50" />

      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Eye className="text-primary" size={20} />
          <h1 className="text-primary text-sm sm:text-base tracking-[0.3em] glow-text-strong font-semibold">
            VISION
          </h1>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            PASSIVE SIGNAL INTELLIGENCE ENGINE v1.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isScanning ? (
            <button
              onClick={startScan}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs tracking-wider hover:opacity-90 transition-opacity rounded-sm"
            >
              <Play size={12} />
              INITIATE VISION
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="flex items-center gap-2 px-3 py-1.5 bg-destructive text-destructive-foreground text-xs tracking-wider hover:opacity-90 transition-opacity rounded-sm"
            >
              <Square size={12} />
              TERMINATE
            </button>
          )}

          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 border border-border text-xs text-muted-foreground tracking-wider hover:text-primary hover:border-primary transition-colors rounded-sm">
              <Download size={12} />
              EXPORT
            </button>
            <div className="hidden group-hover:flex absolute right-0 top-full mt-1 flex-col bg-card border border-border rounded-sm z-30">
              <button onClick={() => exportSession("json")} className="px-4 py-2 text-xs text-secondary-foreground hover:bg-secondary transition-colors text-left">
                Export JSON
              </button>
              <button onClick={() => exportSession("txt")} className="px-4 py-2 text-xs text-secondary-foreground hover:bg-secondary transition-colors text-left">
                Export TXT
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="px-4 py-2 relative z-10">
        <StatusBar
          isScanning={isScanning}
          isBaselineComplete={isBaselineComplete}
          baselineProgress={baselineProgress}
          totalNodes={wifiSignals.length + bleDevices.length}
          threatCount={threatCount}
          uptime={uptime}
        />
      </div>

      {/* Main Grid */}
      <main className="px-4 pb-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Radar + Terminal */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <SatelliteRadar
                wifiSignals={wifiSignals}
                bleDevices={bleDevices}
                isScanning={isScanning}
                selectedId={selectedId}
                onBlipClick={setSelectedId}
              />
            </motion.div>
            <TerminalLog logs={logs} />
          </div>

          {/* Right: Data Tables */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <WifiTable signals={wifiSignals} selectedId={selectedId} onSelect={setSelectedId} />
            <BleTable devices={bleDevices} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>
      </main>
    </div>
  );
}
