import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Square, Download, Eye, Menu } from "lucide-react";
import SatelliteRadar from "@/components/SatelliteRadar";
import TerminalLog from "@/components/TerminalLog";
import { WifiTable, BleTable } from "@/components/SignalTable";
import StatusBar from "@/components/StatusBar";
import DetailPanel from "@/components/DetailPanel";
import { useAlertSound } from "@/hooks/useAlertSound";
import {
  generateBaselineData, generateAnomalyWifi, generateAnomalyBle,
  type WifiSignal, type BleDevice, type LogEntry
} from "@/lib/mockData";

const BASELINE_DURATION = 15000;
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
  const [exportOpen, setExportOpen] = useState(false);
  const intervalsRef = useRef<number[]>([]);
  const playAlert = useAlertSound();

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), level, message }]);
  }, []);

  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const triggerRedAlert = useCallback(() => {
    setHasRedAlert(true);
    playAlert();
  }, [playAlert]);

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

    const progressId = window.setInterval(() => {
      setBaselineProgress((prev) => {
        if (prev >= 100) { clearInterval(progressId); return 100; }
        return prev + (100 / (BASELINE_DURATION / 500));
      });
    }, 500);
    intervalsRef.current.push(progressId);

    const baselineTimeout = window.setTimeout(() => {
      setIsBaselineComplete(true);
      setBaselineProgress(100);
      addLog("SYSTEM", "Baseline mapping complete.");
      addLog("SYSTEM", "Entering watch mode — anomaly detection active.");

      const anomalyId = window.setInterval(() => {
        if (Math.random() > 0.4) {
          const newWifi = generateAnomalyWifi();
          setWifiSignals((prev) => [...prev, newWifi]);
          if (newWifi.threatLevel === "red") {
            addLog("ALERT", `⚠ RED NODE: MAC-hopping detected — ${newWifi.bssid}`);
            triggerRedAlert();
          } else {
            addLog("WARNING", `New node detected: ${newWifi.ssid} [${newWifi.bssid}]`);
          }
        }
        if (Math.random() > 0.6) {
          const newBle = generateAnomalyBle();
          setBleDevices((prev) => [...prev, newBle]);
          if (newBle.isTracker) {
            addLog("ALERT", `⚠ TRACKER DETECTED: ${newBle.name} [${newBle.mac}]`);
            triggerRedAlert();
          } else {
            addLog("INFO", `BLE anomaly: ${newBle.name}`);
          }
        }
      }, SCAN_INTERVAL);
      intervalsRef.current.push(anomalyId);
    }, BASELINE_DURATION);
    intervalsRef.current.push(baselineTimeout as unknown as number);
  }, [addLog, clearIntervals, triggerRedAlert]);

  const stopScan = useCallback(() => {
    clearIntervals();
    setIsScanning(false);
    addLog("SYSTEM", "Scan terminated by operator.");
  }, [clearIntervals, addLog]);

  const exportSession = useCallback((format: "json" | "txt") => {
    const data = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalWifiNodes: wifiSignals.length,
        totalBleDevices: bleDevices.length,
        totalLogs: logs.length,
        threatCount: wifiSignals.filter(s => s.threatLevel === "red").length + bleDevices.filter(d => d.threatLevel === "red").length,
      },
      wifiSignals,
      bleDevices,
      logs: logs.map(l => ({
        ...l,
        timestampISO: new Date(l.timestamp).toISOString(),
      })),
    };

    let content: string;
    let mime: string;
    let ext: string;

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
      mime = "application/json";
      ext = "json";
    } else {
      const header = `VISION Session Export — ${data.exportedAt}\nWi-Fi Nodes: ${data.summary.totalWifiNodes} | BLE Devices: ${data.summary.totalBleDevices} | Threats: ${data.summary.threatCount}\n${"=".repeat(80)}\n\n`;
      const logLines = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message}`).join("\n");
      const wifiSection = `\n\n${"=".repeat(80)}\nWi-Fi NODES\n${"=".repeat(80)}\n` +
        wifiSignals.map(s => `${s.threatLevel.toUpperCase()} | ${s.ssid} | ${s.bssid} | ${s.frequency} | Ch${s.channel} | ${s.rssi}dBm | ${s.manufacturer}`).join("\n");
      const bleSection = `\n\n${"=".repeat(80)}\nBLE DEVICES\n${"=".repeat(80)}\n` +
        bleDevices.map(d => `${d.threatLevel.toUpperCase()} | ${d.name} | ${d.mac} | ${d.rssi}dBm | ${d.type} | ${d.manufacturer}${d.isTracker ? " | ⚠ TRACKER" : ""}`).join("\n");
      content = header + logLines + wifiSection + bleSection;
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
    setExportOpen(false);
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

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!exportOpen) return;
    const handler = () => setExportOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [exportOpen]);

  const threatCount = wifiSignals.filter((s) => s.threatLevel === "red").length +
    bleDevices.filter((d) => d.threatLevel === "red").length;

  return (
    <div className={`min-h-screen bg-background relative ${hasRedAlert ? "glow-border-danger" : ""}`}>
      <div className="fixed inset-0 scanline-overlay pointer-events-none z-50" />

      {/* Header */}
      <header className="border-b border-border px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Eye className="text-primary shrink-0" size={18} />
          <h1 className="text-primary text-xs sm:text-base tracking-[0.2em] sm:tracking-[0.3em] glow-text-strong font-semibold truncate">
            VISION
          </h1>
          <span className="text-[10px] text-muted-foreground hidden md:inline">
            PASSIVE SIGNAL INTELLIGENCE ENGINE v1.0
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isScanning ? (
            <button
              onClick={startScan}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-primary text-primary-foreground text-[10px] sm:text-xs tracking-wider hover:opacity-90 transition-opacity rounded-sm"
            >
              <Play size={10} />
              <span className="hidden sm:inline">INITIATE VISION</span>
              <span className="sm:hidden">START</span>
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-destructive text-destructive-foreground text-[10px] sm:text-xs tracking-wider hover:opacity-90 transition-opacity rounded-sm"
            >
              <Square size={10} />
              <span className="hidden sm:inline">TERMINATE</span>
              <span className="sm:hidden">STOP</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setExportOpen(!exportOpen); }}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-border text-[10px] sm:text-xs text-muted-foreground tracking-wider hover:text-primary hover:border-primary transition-colors rounded-sm"
            >
              <Download size={10} />
              <span className="hidden sm:inline">EXPORT</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 flex flex-col bg-card border border-border rounded-sm z-30 min-w-[140px]">
                <button onClick={() => exportSession("json")} className="px-4 py-2.5 text-xs text-secondary-foreground hover:bg-secondary transition-colors text-left">
                  Export JSON
                </button>
                <button onClick={() => exportSession("txt")} className="px-4 py-2.5 text-xs text-secondary-foreground hover:bg-secondary transition-colors text-left">
                  Export TXT
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="px-3 sm:px-4 py-2 relative z-10">
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
      <main className="px-3 sm:px-4 pb-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* Left: Radar + Terminal */}
          <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 sm:gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="sm:w-1/2 lg:w-full"
              >
                <SatelliteRadar
                  wifiSignals={wifiSignals}
                  bleDevices={bleDevices}
                  isScanning={isScanning}
                  selectedId={selectedId}
                  onBlipClick={setSelectedId}
                />
              </motion.div>
              <div className="sm:w-1/2 lg:w-full">
                <TerminalLog logs={logs} />
              </div>
            </div>
          </div>

          {/* Right: Data Tables */}
          <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-4">
            <WifiTable signals={wifiSignals} selectedId={selectedId} onSelect={setSelectedId} />
            <BleTable devices={bleDevices} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>
      </main>

      {/* Detail Panel */}
      <DetailPanel
        wifiSignals={wifiSignals}
        bleDevices={bleDevices}
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
