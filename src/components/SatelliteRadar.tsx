import { motion } from "framer-motion";
import { type WifiSignal, type BleDevice } from "@/lib/mockData";

interface SatelliteRadarProps {
  wifiSignals: WifiSignal[];
  bleDevices: BleDevice[];
  isScanning: boolean;
  selectedId: string | null;
  onBlipClick: (id: string) => void;
}

export default function SatelliteRadar({
  wifiSignals,
  bleDevices,
  isScanning,
  selectedId,
  onBlipClick,
}: SatelliteRadarProps) {
  // Safe extraction of nodes to prevent crashes
  const allNodes = [...(wifiSignals || []), ...(bleDevices || [])];

  return (
    <div className="relative aspect-square w-full max-w-[400px] mx-auto bg-[#050505] rounded-full border-2 border-primary/20 overflow-hidden shadow-[0_0_30px_rgba(0,255,65,0.05)]">
      
      {/* 1. MAP GRID (The "Background") */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="absolute w-full h-[1px] bg-primary" />
        <div className="absolute h-full w-[1px] bg-primary" />
        {[0.25, 0.5, 0.75].map((scale) => (
          <div
            key={scale}
            className="absolute border border-primary rounded-full"
            style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
          />
        ))}
      </div>

      {/* 2. THE CINEMATIC 360° SWEEP */}
      {isScanning && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            // Clean conic gradient centered in the circle
            background: "conic-gradient(from 0deg at 50% 50%, rgba(0, 255, 65, 0.2) 0deg, transparent 90deg)"
          }}
        >
          {/* The Leading "Scanning" Line */}
          <div className="absolute top-0 left-1/2 w-[2px] h-1/2 bg-primary shadow-[0_0_15px_#00FF41]" />
        </motion.div>
      )}

      {/* 3. SIGNAL BLIPS (Entities) */}
      <div className="absolute inset-0 z-20">
        {allNodes.map((node) => {
          // Fallback values to prevent NaN crashes
          const rssi = node.rssi || -100;
          const id = node.id || "00:00";
          
          // Math: Convert RSSI to distance (Center = -30dBm, Edge = -90dBm)
          const distance = Math.min(Math.max((rssi + 30) * -1.2, 5), 45);
          
          // Math: Generate a persistent angle based on the MAC address
          const hash = id.split(':').reduce((acc, part) => acc + parseInt(part, 16), 0);
          const angle = hash % 360;
          
          const x = 50 + distance * Math.cos((angle * Math.PI) / 180);
          const y = 50 + distance * Math.sin((angle * Math.PI) / 180);

          return (
            <motion.button
              key={id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => onBlipClick(id)}
              className={`absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white/20
                ${node.threatLevel === 'red' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 
                  node.threatLevel === 'yellow' ? 'bg-yellow-500 shadow-[0_0_10px_#f59e0b]' : 
                  'bg-primary shadow-[0_0_10px_#00FF41]'}
                ${selectedId === id ? 'ring-2 ring-white scale-150 z-30' : 'z-20'}
              `}
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          );
        })}
      </div>

      {/* 4. OVERLAY SCANLINE */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,black_100%)] opacity-40 pointer-events-none" />
    </div>
  );
}