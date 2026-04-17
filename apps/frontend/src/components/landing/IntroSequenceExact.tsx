import { useCallback, useEffect, useState } from "react";
import SpaceScene from "./SpaceScene";
import HUDOverlay from "./HUDOverlay";

export default function IntroSequenceExact({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(true);
  const [destroyed, setDestroyed] = useState(false);
  const [fadeToBlack, setFadeToBlack] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!destroyed) return;
    const fadeTimer = setTimeout(() => setFadeToBlack(true), 2000);
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [destroyed, onComplete]);

  const handleDestroy = useCallback(() => setDestroyed(true), []);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #0a1628 0%, #050510 50%, #000005 100%)" }}
    >
      {!loading && <SpaceScene onDestroy={handleDestroy} destroyed={destroyed} />}
      <HUDOverlay destroyed={destroyed} loading={loading} />

      {fadeToBlack && (
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{
            background: "#000000",
            animation: "fade-to-black 1.2s ease-in forwards",
          }}
        />
      )}
    </div>
  );
}
