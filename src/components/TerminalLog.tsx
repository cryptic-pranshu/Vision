import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LogEntry } from "@/lib/mockData";

interface TerminalLogProps {
  logs: LogEntry[];
}

function levelColor(level: LogEntry["level"]): string {
  switch (level) {
    case "ALERT": return "status-red";
    case "WARNING": return "status-yellow";
    case "SYSTEM": return "status-green";
    default: return "text-muted-foreground";
  }
}

export default function TerminalLog({ logs }: TerminalLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="cyber-panel h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 relative z-10">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-primary tracking-widest">TERMINAL</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1 text-xs relative z-10 max-h-[300px]">
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2"
            >
              <span className="text-muted-foreground shrink-0">
                {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className={`shrink-0 ${levelColor(log.level)}`}>[{log.level}]</span>
              <span className="text-secondary-foreground">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
