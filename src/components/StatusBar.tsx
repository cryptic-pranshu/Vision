import { Radar, WifiOff, Clock, Shield } from "lucide-react";

interface StatusBarProps {
  isScanning: boolean;
  isBaselineComplete: boolean;
  baselineProgress: number;
  totalNodes: number;
  threatCount: number;
  uptime: string;
}

export default function StatusBar({
  isScanning, isBaselineComplete, baselineProgress, totalNodes, threatCount, uptime
}: StatusBarProps) {
  return (
    <div className="cyber-panel px-4 py-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs relative z-10">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isScanning ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
        <span className={isScanning ? "status-green" : "text-muted-foreground"}>
          {isScanning ? (isBaselineComplete ? "MONITORING" : `BASELINE ${Math.round(baselineProgress)}%`) : "STANDBY"}
        </span>
      </div>

      {!isBaselineComplete && isScanning && (
        <div className="flex-1 max-w-[200px]">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${baselineProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Radar size={12} />
        <span>{totalNodes} nodes</span>
      </div>

      <div className={`flex items-center gap-1.5 ${threatCount > 0 ? "status-red" : "text-muted-foreground"}`}>
        <Shield size={12} />
        <span>{threatCount} threats</span>
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
        <WifiOff size={12} />
        <span>OFFLINE</span>
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock size={12} />
        <span>{uptime}</span>
      </div>
    </div>
  );
}
