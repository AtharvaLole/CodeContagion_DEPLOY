import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function TypewriterText({
  text,
  delay = 0,
  speed = 40,
}: {
  text: string;
  delay?: number;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return (
    <>
      {displayed}
      <span className="animate-pulse">_</span>
    </>
  );
}

export default function HUDOverlay({
  destroyed,
  loading,
}: {
  destroyed: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#050510" }}>
        <div className="text-center font-mono">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-sm tracking-[0.3em]"
            style={{ color: "#00f0ff" }}
          >
            INITIALIZING SIMULATION...
          </motion.div>
          <div className="mx-auto h-0.5 w-48 overflow-hidden rounded" style={{ background: "#00f0ff20" }}>
            <motion.div
              className="h-full rounded"
              style={{ background: "#00f0ff" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-30 scanline-overlay" />

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="fixed top-6 left-6 z-40 font-mono"
      >
        <div className="mb-1 text-xs tracking-[0.4em]" style={{ color: "#00f0ff80" }}>
          SYSTEM // ACTIVE
        </div>
        <div className="text-lg font-bold tracking-[0.2em]" style={{ color: "#00f0ff", textShadow: "0 0 20px #00f0ff60, 0 0 40px #00f0ff30" }}>
          CODECONTAGION
        </div>
        <div className="mt-1 text-xs tracking-[0.3em]" style={{ color: "#ff174480" }}>
          MISINFO SIMULATION
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="fixed top-6 right-6 z-40 font-mono text-right"
      >
        <div className="text-xs tracking-[0.2em]" style={{ color: destroyed ? "#00ff8880" : "#ff174480" }}>
          {destroyed ? "STATUS: SECURED" : "STATUS: OUTBREAK DETECTED"}
        </div>
        <div className="mt-1 text-xs tracking-[0.2em]" style={{ color: "#00f0ff40" }}>
          THREAT LEVEL: {destroyed ? "NEUTRALIZED" : "CRITICAL"}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!destroyed && (
          <motion.div
            key="alert"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.05 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="fixed inset-x-0 bottom-12 z-40 flex justify-center px-4"
          >
            <div className="hud-panel relative w-[min(90vw,540px)] px-8 py-5 text-center font-mono">
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2" style={{ borderColor: "#00f0ff" }} />
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2" style={{ borderColor: "#00f0ff" }} />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2" style={{ borderColor: "#00f0ff" }} />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2" style={{ borderColor: "#00f0ff" }} />

              <div className="mb-3 text-xs tracking-[0.3em]" style={{ color: "#ff1744" }}>
                WARNING DIGITAL OUTBREAK DETECTED
              </div>
              <div className="text-sm tracking-[0.15em] leading-relaxed" style={{ color: "#00f0ff", textShadow: "0 0 10px #00f0ff40" }}>
                <TypewriterText
                  text="CLICK THE VIRUS TO DESTROY IT AND ENTER CODE CONTAGION"
                  delay={1800}
                  speed={35}
                />
              </div>
              <div className="mt-3 text-xs tracking-[0.2em]" style={{ color: "#ffffff30" }}>
                NEUTRALIZE THE INFECTION
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="fixed bottom-4 left-4 right-4 z-30 flex justify-between font-mono text-xs pointer-events-none"
        style={{ color: "#00f0ff20" }}
      >
        <span>LAT: 28.6139 | LON: 77.2090</span>
        <span>NODES: 35 | ACTIVE THREATS: {destroyed ? "0" : "SCANNING..."}</span>
        <span>SYS: OPERATIONAL</span>
      </motion.div>
    </>
  );
}
