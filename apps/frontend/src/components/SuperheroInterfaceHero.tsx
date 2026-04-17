import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles, Stars, useCursor } from "@react-three/drei";
import { motion } from "framer-motion";
import { Crosshair, Play, Radar, Shield, Swords, Zap } from "lucide-react";
import type { Group } from "three";

export type HeroSectionTarget = "overview" | "modes" | "play";

type SuperheroInterfaceHeroProps = {
  activeSection: HeroSectionTarget;
  onSelectSection: (section: HeroSectionTarget) => void;
  onOpenDirective: () => void;
};

type HeroReaction = "idle" | "overview" | "modes" | "play" | "flyby-left" | "flyby-right";

type HotspotName = "head" | "chest" | "arm";

const hotspotMeta: Record<
  HotspotName,
  {
    title: string;
    subtitle: string;
    target: HeroSectionTarget;
    icon: typeof Radar;
    accent: string;
  }
> = {
  head: {
    title: "How To Play",
    subtitle: "Tap the helmet to reveal gameplay guidance.",
    target: "play",
    icon: Radar,
    accent: "text-accent"
  },
  chest: {
    title: "Mission Brief",
    subtitle: "Tap the core chest plate for the overview and launch path.",
    target: "overview",
    icon: Shield,
    accent: "text-neon-yellow"
  },
  arm: {
    title: "Game Modes",
    subtitle: "Tap the gauntlet to jump toward Debug Arena and Misinfo Sim.",
    target: "modes",
    icon: Swords,
    accent: "text-primary"
  }
};

function FlybyObjects({ onFlyby }: { onFlyby: (direction: "left" | "right") => void }) {
  const ufoRef = useRef<Group>(null);
  const cometRef = useRef<Group>(null);
  const shuttleRef = useRef<Group>(null);
  const lastSignal = useRef({ ufo: 0, comet: 0, shuttle: 0 });

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (ufoRef.current) {
      const x = Math.sin(t * 0.22) * 8.5;
      ufoRef.current.position.set(x, 2.7 + Math.sin(t * 0.7) * 0.4, -3.4 + Math.cos(t * 0.35) * 0.6);
      ufoRef.current.rotation.y += 0.02;

      if (Math.abs(x) < 0.2 && t - lastSignal.current.ufo > 8) {
        lastSignal.current.ufo = t;
        onFlyby(x > 0 ? "right" : "left");
      }
    }

    if (cometRef.current) {
      const loop = (t * 0.18) % 1;
      const x = 9 - loop * 18;
      const y = 3.6 - loop * 2.8;
      cometRef.current.position.set(x, y, -5.5);
      cometRef.current.rotation.z = -0.5;

      if (Math.abs(x) < 0.35 && t - lastSignal.current.comet > 9) {
        lastSignal.current.comet = t;
        onFlyby("left");
      }
    }

    if (shuttleRef.current) {
      const loop = (t * 0.14 + 0.5) % 1;
      const x = -8 + loop * 16;
      shuttleRef.current.position.set(x, -0.6 + Math.sin(t * 0.8) * 0.25, -4.2);
      shuttleRef.current.rotation.z = Math.sin(t * 0.8) * 0.1;

      if (Math.abs(x) < 0.25 && t - lastSignal.current.shuttle > 10) {
        lastSignal.current.shuttle = t;
        onFlyby("right");
      }
    }
  });

  return (
    <>
      <group ref={ufoRef}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#d9faff" emissive="#30C9E8" emissiveIntensity={1.2} metalness={0.55} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.6, 0.9, 0.18, 40]} />
          <meshStandardMaterial color="#080E1A" emissive="#30C9E8" emissiveIntensity={0.35} metalness={0.9} roughness={0.15} />
        </mesh>
        <Sparkles count={8} scale={[1.4, 0.8, 1.4]} size={2.2} speed={0.4} color="#30C9E8" />
      </group>

      <group ref={cometRef}>
        <mesh>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#F5C451" emissive="#F5C451" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.7, 0.18, 0]}>
          <coneGeometry args={[0.18, 1.8, 18]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.85} transparent opacity={0.55} />
        </mesh>
      </group>

      <group ref={shuttleRef}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.22, 1, 10]} />
          <meshStandardMaterial color="#E8308C" emissive="#E8308C" emissiveIntensity={0.6} metalness={0.65} roughness={0.2} />
        </mesh>
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.65, 0.1, 0.25]} />
          <meshStandardMaterial color="#f8fafc" emissive="#30C9E8" emissiveIntensity={0.4} metalness={0.8} roughness={0.15} />
        </mesh>
      </group>
    </>
  );
}

function SuperheroFigure({
  activeHotspot,
  onHoverHotspot,
  onSelectHotspot,
  reaction,
  heroAccent
}: {
  activeHotspot: HotspotName | null;
  onHoverHotspot: (hotspot: HotspotName | null) => void;
  onSelectHotspot: (hotspot: HotspotName) => void;
  reaction: HeroReaction;
  heroAccent: HeroSectionTarget;
}) {
  const rootRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const chestRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const capeRef = useRef<Group>(null);

  useCursor(Boolean(activeHotspot));

  const accentColor = heroAccent === "modes" ? "#30C9E8" : heroAccent === "play" ? "#E8308C" : "#F5C451";

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 2.1) * 0.025;
    const sway = Math.sin(t * 0.9) * 0.12;

    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 1.1) * 0.12;
      rootRef.current.rotation.y = sway * 0.4;
    }

    if (chestRef.current) {
      chestRef.current.scale.setScalar(breathe + (reaction === "overview" ? 0.08 : 0));
    }

    if (headRef.current) {
      const targetY =
        reaction === "flyby-left" ? 0.5 : reaction === "flyby-right" ? -0.5 : reaction === "play" ? 0.2 : sway * 0.15;
      const targetX = reaction === "play" ? -0.22 : Math.sin(t * 1.4) * 0.04;

      headRef.current.rotation.y += (targetY - headRef.current.rotation.y) * 0.08;
      headRef.current.rotation.x += (targetX - headRef.current.rotation.x) * 0.08;
    }

    if (leftArmRef.current) {
      const targetZ = reaction === "flyby-left" ? 0.8 : reaction === "play" ? 0.35 : Math.sin(t * 1.2) * 0.08;
      leftArmRef.current.rotation.z += (targetZ - leftArmRef.current.rotation.z) * 0.08;
      leftArmRef.current.rotation.x = Math.cos(t * 0.8) * 0.04;
    }

    if (rightArmRef.current) {
      const targetZ = reaction === "modes" ? -0.9 : reaction === "overview" ? -0.28 : -Math.sin(t * 1.1) * 0.08;
      const targetX = reaction === "modes" ? -0.2 : 0;
      rightArmRef.current.rotation.z += (targetZ - rightArmRef.current.rotation.z) * 0.08;
      rightArmRef.current.rotation.x += (targetX - rightArmRef.current.rotation.x) * 0.08;
    }

    if (capeRef.current) {
      capeRef.current.rotation.x = Math.PI + Math.sin(t * 1.8) * 0.06;
      capeRef.current.rotation.z = Math.sin(t * 0.8) * 0.05;
    }
  });

  const hotspotOpacity = (hotspot: HotspotName) => (activeHotspot === hotspot ? 0.45 : 0.14);
  const hotspotScale = (hotspot: HotspotName) => (activeHotspot === hotspot ? 1.08 : 1);

  return (
    <group ref={rootRef} position={[0, -3.1, 0]} scale={1.1}>
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.22}>
        <group ref={capeRef} position={[0, 1.85, -0.38]} rotation={[Math.PI, 0, 0]}>
          <mesh>
            <coneGeometry args={[1.3, 3.8, 6, 1, true]} />
            <meshStandardMaterial color="#080E1A" emissive="#E8308C" emissiveIntensity={0.24} metalness={0.45} roughness={0.45} side={2} />
          </mesh>
        </group>

        <mesh position={[0, -2.35, 0]} rotation={[0, 0.18, 0]}>
          <cylinderGeometry args={[1.65, 2.1, 0.42, 42]} />
          <meshStandardMaterial color="#09111D" emissive="#30C9E8" emissiveIntensity={0.18} metalness={0.85} roughness={0.22} />
        </mesh>

        <mesh position={[0, -2.08, 0]}>
          <torusGeometry args={[1.95, 0.08, 24, 120]} />
          <meshStandardMaterial color="#30C9E8" emissive="#30C9E8" emissiveIntensity={0.8} metalness={0.82} roughness={0.14} />
        </mesh>

        <group position={[0, 1.95, 0]}>
          <group ref={headRef}>
            <mesh
              onPointerOver={() => onHoverHotspot("head")}
              onPointerOut={() => onHoverHotspot(null)}
              onClick={() => onSelectHotspot("head")}
              scale={hotspotScale("head")}
            >
              <sphereGeometry args={[0.52, 30, 30]} />
              <meshStandardMaterial color="#0D1526" emissive={accentColor} emissiveIntensity={hotspotOpacity("head")} metalness={0.78} roughness={0.22} />
            </mesh>
            <mesh position={[0, -0.03, 0.43]}>
              <boxGeometry args={[0.64, 0.18, 0.12]} />
              <meshStandardMaterial color="#d7f7ff" emissive="#30C9E8" emissiveIntensity={0.9} metalness={0.45} roughness={0.12} />
            </mesh>
            <mesh position={[0, 0.45, 0]} rotation={[0.1, 0, 0]}>
              <torusGeometry args={[0.34, 0.045, 18, 80]} />
              <meshStandardMaterial color="#F5C451" emissive="#F5C451" emissiveIntensity={0.7} metalness={0.85} roughness={0.18} />
            </mesh>
          </group>
        </group>

        <mesh position={[0, 1.18, 0]}>
          <cylinderGeometry args={[0.17, 0.22, 0.28, 16]} />
          <meshStandardMaterial color="#0D1526" emissive="#1E293B" emissiveIntensity={0.35} metalness={0.75} roughness={0.24} />
        </mesh>

        <group ref={chestRef} position={[0, 0.6, 0]}>
          <mesh
            onPointerOver={() => onHoverHotspot("chest")}
            onPointerOut={() => onHoverHotspot(null)}
            onClick={() => onSelectHotspot("chest")}
            scale={hotspotScale("chest")}
          >
            <octahedronGeometry args={[0.92, 0]} />
            <meshStandardMaterial color="#111C31" emissive={accentColor} emissiveIntensity={hotspotOpacity("chest") + 0.14} metalness={0.82} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.58]}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color="#F5C451" emissive="#F5C451" emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[0, -0.9, 0]}>
            <boxGeometry args={[1.25, 0.95, 0.55]} />
            <meshStandardMaterial color="#0D1526" emissive="#30C9E8" emissiveIntensity={0.16} metalness={0.85} roughness={0.2} />
          </mesh>
        </group>

        <group position={[-0.94, 0.95, 0]} ref={leftArmRef}>
          <mesh position={[0, 0.28, 0]} rotation={[0, 0, 0.25]}>
            <capsuleGeometry args={[0.16, 0.9, 8, 16]} />
            <meshStandardMaterial color="#111C31" emissive="#1E293B" emissiveIntensity={0.22} metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[-0.18, -0.58, 0]} rotation={[0, 0, 0.12]}>
            <capsuleGeometry args={[0.14, 0.88, 8, 16]} />
            <meshStandardMaterial color="#0D1526" emissive="#E8308C" emissiveIntensity={0.14} metalness={0.82} roughness={0.18} />
          </mesh>
          <mesh position={[-0.3, -1.2, 0]}>
            <sphereGeometry args={[0.18, 18, 18]} />
            <meshStandardMaterial color="#d8f7ff" emissive="#30C9E8" emissiveIntensity={0.55} />
          </mesh>
        </group>

        <group position={[0.94, 0.95, 0]} ref={rightArmRef}>
          <mesh position={[0, 0.28, 0]} rotation={[0, 0, -0.25]}>
            <capsuleGeometry args={[0.16, 0.9, 8, 16]} />
            <meshStandardMaterial color="#111C31" emissive="#1E293B" emissiveIntensity={0.22} metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh
            position={[0.18, -0.58, 0]}
            rotation={[0, 0, -0.12]}
            onPointerOver={() => onHoverHotspot("arm")}
            onPointerOut={() => onHoverHotspot(null)}
            onClick={() => onSelectHotspot("arm")}
            scale={hotspotScale("arm")}
          >
            <capsuleGeometry args={[0.14, 0.88, 8, 16]} />
            <meshStandardMaterial color="#0D1526" emissive={accentColor} emissiveIntensity={hotspotOpacity("arm") + 0.1} metalness={0.86} roughness={0.16} />
          </mesh>
          <mesh position={[0.33, -1.22, 0]}>
            <sphereGeometry args={[0.22, 18, 18]} />
            <meshStandardMaterial color="#30C9E8" emissive="#30C9E8" emissiveIntensity={0.9} />
          </mesh>
        </group>

        <group position={[-0.42, -1.1, 0]}>
          <mesh position={[0, -0.42, 0]} rotation={[0, 0, 0.05]}>
            <capsuleGeometry args={[0.2, 1.25, 8, 18]} />
            <meshStandardMaterial color="#111C31" emissive="#1E293B" emissiveIntensity={0.18} metalness={0.85} roughness={0.22} />
          </mesh>
          <mesh position={[0.06, -1.35, 0.1]}>
            <boxGeometry args={[0.42, 0.18, 0.72]} />
            <meshStandardMaterial color="#0A0F1D" emissive="#30C9E8" emissiveIntensity={0.18} metalness={0.8} roughness={0.16} />
          </mesh>
        </group>

        <group position={[0.42, -1.1, 0]}>
          <mesh position={[0, -0.42, 0]} rotation={[0, 0, -0.05]}>
            <capsuleGeometry args={[0.2, 1.25, 8, 18]} />
            <meshStandardMaterial color="#111C31" emissive="#1E293B" emissiveIntensity={0.18} metalness={0.85} roughness={0.22} />
          </mesh>
          <mesh position={[-0.06, -1.35, 0.1]}>
            <boxGeometry args={[0.42, 0.18, 0.72]} />
            <meshStandardMaterial color="#0A0F1D" emissive="#30C9E8" emissiveIntensity={0.18} metalness={0.8} roughness={0.16} />
          </mesh>
        </group>

        <mesh position={[0, 0.92, 0.75]} rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[0.45, 0.03, 16, 80]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.65} transparent opacity={0.8} />
        </mesh>
      </Float>
    </group>
  );
}

const SuperheroInterfaceHero = ({ activeSection, onSelectSection, onOpenDirective }: SuperheroInterfaceHeroProps) => {
  const [activeHotspot, setActiveHotspot] = useState<HotspotName | null>(null);
  const [reaction, setReaction] = useState<HeroReaction>("idle");
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [pointerTilt, setPointerTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const image = new Image();
    image.onload = () => setHeroImageLoaded(true);
    image.onerror = () => setHeroImageLoaded(false);
    image.src = "/hero-reference.png";
  }, []);

  useEffect(() => {
    if (activeHotspot) {
      const mappedReaction = hotspotMeta[activeHotspot].target;
      setReaction(mappedReaction);
      return;
    }

    setReaction("idle");
  }, [activeHotspot]);

  const activeMeta = useMemo(() => {
    if (activeHotspot) {
      return hotspotMeta[activeHotspot];
    }

    return Object.values(hotspotMeta).find((entry) => entry.target === activeSection) ?? hotspotMeta.chest;
  }, [activeHotspot, activeSection]);

  const handleSelectHotspot = (hotspot: HotspotName) => {
    const target = hotspotMeta[hotspot].target;
    setReaction(target);
    onSelectSection(target);
  };

  const handleFlyby = (direction: "left" | "right") => {
    setReaction(direction === "left" ? "flyby-left" : "flyby-right");
    window.clearTimeout((handleFlyby as unknown as { timer?: number }).timer);
    (handleFlyby as unknown as { timer?: number }).timer = window.setTimeout(() => {
      setReaction(activeHotspot ? hotspotMeta[activeHotspot].target : "idle");
    }, 1400);
  };

  const renderPortraitHotspots = () => (
    <>
      <button
        aria-label="Open how to play"
        onMouseEnter={() => setActiveHotspot("head")}
        onMouseLeave={() => setActiveHotspot(null)}
        onClick={() => handleSelectHotspot("head")}
        className={`absolute left-1/2 top-[17%] z-20 h-[18%] w-[34%] -translate-x-1/2 rounded-[45%] transition-all ${
          activeHotspot === "head" || activeSection === "play"
            ? "bg-accent/20 ring-2 ring-accent/60"
            : "bg-transparent hover:bg-accent/12 hover:ring-2 hover:ring-accent/40"
        }`}
      />
      <button
        aria-label="Open mission overview"
        onMouseEnter={() => setActiveHotspot("chest")}
        onMouseLeave={() => setActiveHotspot(null)}
        onClick={() => handleSelectHotspot("chest")}
        className={`absolute left-1/2 top-[40%] z-20 h-[20%] w-[26%] -translate-x-1/2 rounded-[35%] transition-all ${
          activeHotspot === "chest" || activeSection === "overview"
            ? "bg-neon-yellow/18 ring-2 ring-neon-yellow/55"
            : "bg-transparent hover:bg-neon-yellow/12 hover:ring-2 hover:ring-neon-yellow/40"
        }`}
      />
      <button
        aria-label="Open game modes"
        onMouseEnter={() => setActiveHotspot("arm")}
        onMouseLeave={() => setActiveHotspot(null)}
        onClick={() => handleSelectHotspot("arm")}
        className={`absolute right-[20%] top-[47%] z-20 h-[18%] w-[18%] rounded-[40%] transition-all ${
          activeHotspot === "arm" || activeSection === "modes"
            ? "bg-primary/18 ring-2 ring-primary/60"
            : "bg-transparent hover:bg-primary/12 hover:ring-2 hover:ring-primary/40"
        }`}
      />
    </>
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(48,201,232,0.18),transparent_38%),radial-gradient(circle_at_50%_18%,rgba(232,48,140,0.14),transparent_28%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-[2.2rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(4,9,20,0.92),rgba(4,10,19,0.96)),radial-gradient(circle_at_top,rgba(48,201,232,0.14),transparent_35%)] shadow-[0_0_120px_rgba(48,201,232,0.16)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(48,201,232,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(48,201,232,0.06)_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

        <div className="pointer-events-none absolute left-6 top-6 z-20 rounded-full border border-primary/20 bg-background/40 px-4 py-2 font-mono text-[10px] tracking-[0.34em] text-primary backdrop-blur-md">
          HERO INTERFACE // BODY NAVIGATION ONLINE
        </div>

        <div className="pointer-events-none absolute right-6 top-6 z-20 hidden max-w-[260px] rounded-2xl border border-accent/20 bg-background/35 px-4 py-4 backdrop-blur-md md:block">
          <p className="font-mono text-[10px] tracking-[0.24em] text-accent">LIVE REACTION FEED</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The guardian notices flybys, changes pose, and lets users trigger sections by interacting with distinct armor zones.
          </p>
        </div>

        <div className="relative z-10 grid min-h-[860px] items-end lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative h-[680px] lg:h-[calc(100vh-7rem)] lg:min-h-[860px]">
            {heroImageLoaded ? (
              <div
                className="relative flex h-full min-h-[680px] items-center justify-center overflow-hidden px-4 pb-10 pt-24 lg:min-h-[860px]"
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                  setPointerTilt({ x, y });
                }}
                onMouseLeave={() => setPointerTilt({ x: 0, y: 0 })}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.12),transparent_18%),radial-gradient(circle_at_50%_52%,rgba(245,196,81,0.14),transparent_22%),radial-gradient(circle_at_50%_88%,rgba(48,201,232,0.12),transparent_24%)]" />
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotateZ: [0, 0.4, -0.4, 0]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative z-10 flex h-full w-full items-center justify-center"
                  style={{
                    transform: `perspective(1600px) rotateY(${pointerTilt.x * 10}deg) rotateX(${pointerTilt.y * -8}deg)`
                  }}
                >
                  <div className="relative w-full max-w-[560px]">
                    <div className="pointer-events-none absolute inset-x-[23%] top-[19%] z-10 flex justify-between px-[10%]">
                      <motion.div
                        animate={{ opacity: [0.6, 1, 0.7], scale: [1, 1.07, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        className="h-5 w-5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95),0_0_45px_rgba(34,211,238,0.65)]"
                      />
                      <motion.div
                        animate={{ opacity: [0.6, 1, 0.7], scale: [1, 1.07, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.08 }}
                        className="h-5 w-5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95),0_0_45px_rgba(34,211,238,0.65)]"
                      />
                    </div>

                    <motion.div
                      animate={{
                        scaleY: [1, 1, 0.08, 1, 1]
                      }}
                      transition={{ duration: 4.8, repeat: Infinity, times: [0, 0.42, 0.46, 0.52, 1] }}
                      className="pointer-events-none absolute inset-x-[22%] top-[19.2%] z-20 flex justify-between px-[10.5%] origin-center"
                    >
                      <div className="h-[3px] w-8 rounded-full bg-slate-900/55" />
                      <div className="h-[3px] w-8 rounded-full bg-slate-900/55" />
                    </motion.div>

                    {renderPortraitHotspots()}

                    <motion.img
                      src="/hero-reference.png"
                      alt="CodeContagion hero"
                      className="relative z-0 mx-auto block h-auto max-h-[min(70vh,720px)] w-auto max-w-full object-contain object-center drop-shadow-[0_30px_70px_rgba(0,0,0,0.45)]"
                      animate={{
                        filter:
                          activeSection === "modes"
                            ? "drop-shadow(0 0 18px rgba(48,201,232,0.38))"
                            : activeSection === "play"
                              ? "drop-shadow(0 0 18px rgba(232,48,140,0.32))"
                              : "drop-shadow(0 0 18px rgba(245,196,81,0.28))"
                      }}
                    />

                    <div className="pointer-events-none absolute inset-x-[18%] bottom-[3%] h-10 rounded-full bg-black/20 blur-2xl" />
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <Canvas className="!h-full !w-full" camera={{ position: [0, 0.25, 10.8], fov: 26 }}>
                  <color attach="background" args={["#030712"]} />
                  <fog attach="fog" args={["#030712", 8, 18]} />
                  <ambientLight intensity={1.25} />
                  <directionalLight position={[4, 8, 6]} intensity={2.2} color="#e0f2fe" />
                  <pointLight position={[-4, 1, 2]} intensity={22} color="#30C9E8" distance={10} />
                  <pointLight position={[5, 3, -3]} intensity={14} color="#E8308C" distance={12} />
                  <spotLight position={[0, 7, 5]} angle={0.35} intensity={40} penumbra={0.8} color="#F5C451" />
                  <Stars radius={40} depth={40} count={1200} factor={3.4} saturation={0} fade speed={0.6} />
                  <Sparkles count={90} scale={[10, 7, 8]} size={3.4} speed={0.45} color="#30C9E8" />
                  <Sparkles count={55} scale={[9, 6, 8]} size={4.2} speed={0.38} color="#E8308C" />
                  <FlybyObjects onFlyby={handleFlyby} />
                  <SuperheroFigure
                    activeHotspot={activeHotspot}
                    onHoverHotspot={setActiveHotspot}
                    onSelectHotspot={handleSelectHotspot}
                    reaction={reaction}
                    heroAccent={activeSection}
                  />
                  <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    minAzimuthAngle={-Math.PI / 2.5}
                    maxAzimuthAngle={Math.PI / 2.5}
                    minPolarAngle={Math.PI / 2.65}
                    maxPolarAngle={Math.PI / 1.95}
                    autoRotate
                    autoRotateSpeed={0.75}
                  />
                </Canvas>
              </>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/45 to-transparent" />
          </div>

          <div className="relative z-20 px-5 pb-8 pt-6 md:px-8 md:pb-10 lg:px-0 lg:pr-8">
            <motion.div
              key={activeMeta.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-[1.8rem] border border-primary/20 bg-background/45 p-6 backdrop-blur-xl shadow-[0_0_60px_rgba(48,201,232,0.1)]"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                  <activeMeta.icon className={`h-6 w-6 ${activeMeta.accent}`} />
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.28em] text-primary">ACTIVE BODY LINK</p>
                  <h1 className="mt-1 font-display text-3xl leading-none text-foreground md:text-4xl">CodeContagion Guardian</h1>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border/30 bg-background/35 p-4">
                <p className={`font-mono text-[10px] tracking-[0.26em] ${activeMeta.accent}`}>{activeMeta.title.toUpperCase()}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{activeMeta.subtitle}</p>
                {!heroImageLoaded ? (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground/80">
                    To use your exact reference hero on the homepage, place the image at `apps/frontend/public/hero-reference.png`.
                  </p>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {([
                  ["head", "Head", "How To Play"],
                  ["chest", "Chest", "Mission Overview"],
                  ["arm", "Gauntlet", "Game Modes"]
                ] as const).map(([key, label, text]) => (
                  <button
                    key={key}
                    onMouseEnter={() => setActiveHotspot(key)}
                    onMouseLeave={() => setActiveHotspot(null)}
                    onClick={() => handleSelectHotspot(key)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                      activeHotspot === key || activeSection === hotspotMeta[key].target
                        ? "border-primary/45 bg-primary/10 shadow-[0_0_35px_rgba(48,201,232,0.12)]"
                        : "border-border/25 bg-background/25 hover:border-primary/30 hover:bg-background/40"
                    }`}
                  >
                    <p className="font-mono text-[10px] tracking-[0.22em] text-primary">{label}</p>
                    <p className="mt-2 text-sm text-foreground">{text}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    setReaction("overview");
                    onOpenDirective();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 font-mono text-xs font-bold tracking-[0.22em] text-primary-foreground transition-all hover:brightness-110 glow-cyan"
                >
                  <Zap className="h-4 w-4" />
                  ENTER DIRECTIVE
                </button>
                <button
                  onClick={() => onSelectSection("modes")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 px-5 py-4 font-mono text-xs tracking-[0.22em] text-primary transition-all hover:bg-primary/10"
                >
                  <Crosshair className="h-4 w-4" />
                  SCAN MODES
                </button>
                <button
                  onClick={() => onSelectSection("play")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-5 py-4 font-mono text-xs tracking-[0.22em] text-accent transition-all hover:bg-accent/10"
                >
                  <Play className="h-4 w-4" />
                  HOW IT MOVES
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperheroInterfaceHero;
