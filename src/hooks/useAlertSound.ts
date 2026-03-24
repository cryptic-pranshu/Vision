import { useCallback, useRef } from "react";

export function useAlertSound() {
  const lastPlayedRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAlert = useCallback(() => {
    const now = Date.now();
    // Throttle to once every 3 seconds
    if (now - lastPlayedRef.current < 3000) return;
    lastPlayedRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      // Two-tone alert beep
      [0, 0.15].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = i === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.12);
      });

      // Browser notification
      if (Notification.permission === "granted") {
        new Notification("⚠ VISION: Red Threat Detected", {
          body: "A high-priority threat has been identified.",
          icon: "/placeholder.svg",
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {
      // Audio context may not be available
    }
  }, []);

  return playAlert;
}
