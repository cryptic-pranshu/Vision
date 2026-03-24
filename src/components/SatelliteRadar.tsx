import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { WifiSignal, BleDevice, ThreatLevel } from "@/lib/mockData";

interface RadarBlip {
  id: string;
  x: number;
  y: number;
  threatLevel: ThreatLevel;
  rssi: number;
  label: string;
}

interface SatelliteRadarProps {
  wifiSignals: WifiSignal[];
  bleDevices: BleDevice[];
  isScanning: boolean;
  selectedId: string | null;
  onBlipClick: (id: string) => void;
}

function rssiToDistance(rssi: number): number {
  // Map RSSI (-30 to -90) to distance from center (0.1 to 0.9)
  const normalized = Math.min(1, Math.max(0, (Math.abs(rssi) - 30) / 60));
  return 0.1 + normalized * 0.8;
}

function getThreatColor(level: ThreatLevel): string {
  if (level === "red") return "#ff3333";
  if (level === "yellow") return "#ffaa00";
  return "#00FF41";
}

export default function SatelliteRadar({ wifiSignals, bleDevices, isScanning, selectedId, onBlipClick }: SatelliteRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const blips: RadarBlip[] = [
    ...wifiSignals.map((s, i) => ({
      id: s.id,
      x: Math.cos((i * 2.4 + 0.5) * Math.PI) * rssiToDistance(s.rssi),
      y: Math.sin((i * 2.4 + 0.5) * Math.PI) * rssiToDistance(s.rssi),
      threatLevel: s.threatLevel,
      rssi: s.rssi,
      label: s.ssid,
    })),
    ...bleDevices.map((d, i) => ({
      id: d.id,
      x: Math.cos((i * 3.1 + 1.2) * Math.PI) * rssiToDistance(d.rssi),
      y: Math.sin((i * 3.1 + 1.2) * Math.PI) * rssiToDistance(d.rssi),
      threatLevel: d.threatLevel,
      rssi: d.rssi,
      label: d.name,
    })),
  ];

  return (
    <div ref={containerRef} className="cyber-panel aspect-square w-full max-w-[400px] mx-auto relative">
      <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full relative z-10">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="hsl(120 100% 50% / 0.1)" strokeWidth="0.005" />
        ))}
        {/* Cross lines */}
        <line x1="-1" y1="0" x2="1" y2="0" stroke="hsl(120 100% 50% / 0.08)" strokeWidth="0.003" />
        <line x1="0" y1="-1" x2="0" y2="1" stroke="hsl(120 100% 50% / 0.08)" strokeWidth="0.003" />
        <line x1="-0.707" y1="-0.707" x2="0.707" y2="0.707" stroke="hsl(120 100% 50% / 0.05)" strokeWidth="0.003" />
        <line x1="-0.707" y1="0.707" x2="0.707" y2="-0.707" stroke="hsl(120 100% 50% / 0.05)" strokeWidth="0.003" />

        {/* Sweep arm */}
        {isScanning && (
          <g>
            <defs>
              <linearGradient id="sweepGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0.95" y2="0">
                <stop offset="0%" stopColor="hsl(120 100% 50% / 0.05)" />
                <stop offset="60%" stopColor="hsl(120 100% 50% / 0.15)" />
                <stop offset="100%" stopColor="hsl(120 100% 50% / 0.5)" />
              </linearGradient>
            </defs>
            <g style={{ animation: "radar-sweep 3s linear infinite", transformOrigin: "center" }}>
              {/* Trailing cone (~30 degrees behind the sweep line) */}
              <path d="M0,0 L1,0 A1,1 0 0,0 0.866,-0.5 Z" fill="url(#sweepGrad)" opacity="0.4" />
              {/* Main sweep line */}
              <line x1="0" y1="0" x2="0.98" y2="0" stroke="#00FF41" strokeWidth="0.006" opacity="0.9" />
            </g>
          </g>
        )}

        {/* Center dot */}
        <circle cx="0" cy="0" r="0.02" fill="#00FF41" opacity="0.9">
          {isScanning && <animate attributeName="r" values="0.02;0.035;0.02" dur="2s" repeatCount="indefinite" />}
        </circle>

        {/* Blips */}
        {blips.map((blip) => (
          <g
            key={blip.id}
            onClick={() => onBlipClick(blip.id)}
            className="cursor-pointer"
            style={{ animation: "blip-appear 0.5s ease-out forwards" }}
          >
            <circle
              cx={blip.x}
              cy={blip.y}
              r={selectedId === blip.id ? 0.04 : 0.025}
              fill={getThreatColor(blip.threatLevel)}
              opacity={selectedId === blip.id ? 1 : 0.8}
            >
              <animate
                attributeName="opacity"
                values={blip.threatLevel === "red" ? "0.4;1;0.4" : "0.6;0.9;0.6"}
                dur={blip.threatLevel === "red" ? "0.8s" : "2s"}
                repeatCount="indefinite"
              />
            </circle>
            {selectedId === blip.id && (
              <circle
                cx={blip.x}
                cy={blip.y}
                r="0.06"
                fill="none"
                stroke={getThreatColor(blip.threatLevel)}
                strokeWidth="0.005"
                opacity="0.5"
              >
                <animate attributeName="r" values="0.04;0.08;0.04" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
      </svg>

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay z-20" />

      {/* Corner decorations */}
      <div className="absolute top-1 left-1 w-4 h-4 border-t border-l border-primary opacity-40 z-20" />
      <div className="absolute top-1 right-1 w-4 h-4 border-t border-r border-primary opacity-40 z-20" />
      <div className="absolute bottom-1 left-1 w-4 h-4 border-b border-l border-primary opacity-40 z-20" />
      <div className="absolute bottom-1 right-1 w-4 h-4 border-b border-r border-primary opacity-40 z-20" />

      {/* Status label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-primary opacity-60 tracking-[0.3em] z-20">
        {isScanning ? "SCANNING" : "STANDBY"}
      </div>
    </div>
  );
}
