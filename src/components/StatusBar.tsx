import { Radar, Clock, Shield } from "lucide-react";

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
    <div className="cyber-panel px-2 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 text-[10px] sm:text-xs relative z-10">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${isScanning ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
        <span className={isScanning ? "status-green" : "text-muted-foreground"}>
          {isScanning ? (isBaselineComplete ? "MONITORING" : `BASELINE ${Math.round(baselineProgress)}%`) : "STANDBY"}
        </span>
      </div>

      {!isBaselineComplete && isScanning && (
        <div className="flex-1 min-w-[60px] max-w-[200px]">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${baselineProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
        <Radar size={11} />
        <span>{totalNodes}</span>
        <span className="hidden sm:inline">nodes</span>
      </div>

      <div className={`flex items-center gap-1 sm:gap-1.5 ${threatCount > 0 ? "status-red" : "text-muted-foreground"}`}>
        <Shield size={11} />
        <span>{threatCount}</span>
        <span className="hidden sm:inline">threats</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground ml-auto">
        <Clock size={11} />
        <span>{uptime}</span>
      </div>
    </div>
  );
}
