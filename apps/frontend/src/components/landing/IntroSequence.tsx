import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars, useTexture } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

const TEXTURE_BASE = "https://unpkg.com/three-globe@2.31.1/example/img/";

function Earth({ infected }: { infected: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [dayMap, bumpMap, specMap] = useTexture([
    `${TEXTURE_BASE}earth-blue-marble.jpg`,
    `${TEXTURE_BASE}earth-topology.png`,
    `${TEXTURE_BASE}earth-water.png`,
  ]);

  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.02;
      const material = atmosphereRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 1.3) * 0.03;
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          bumpMap={bumpMap}
          bumpScale={0.06}
          specularMap={specMap}
          specular={new THREE.Color(infected ? "#7a2436" : "#6d93c7")}
          shininess={40}
          emissive={infected ? "#26000d" : "#021428"}
          emissiveIntensity={0.68}
        />
      </mesh>
      <mesh ref={atmosphereRef} scale={1.06}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshBasicMaterial
          color={infected ? "#ff335e" : "#2f9dff"}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        position={[0, 0, 0]}
        intensity={infected ? 1.25 : 0.55}
        color={infected ? "#ff1744" : "#56a8ff"}
        distance={6}
      />
    </group>
  );
}

function NetworkNodes({ destroyed }: { destroyed: boolean }) {
  const nodeCount = 28;
  const nodes = useMemo(() => {
    return Array.from({ length: nodeCount }).map((_, i) => {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const r = 2.18;
      return {
        position: new THREE.Vector3(
          r * Math.cos(theta) * Math.sin(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(phi)
        ),
        infected: i < 10,
      };
    });
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }

    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh || !nodes[i] || destroyed) return;
      if (nodes[i].infected) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4 + i * 0.5) * 0.3;
        mesh.scale.setScalar(pulse);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 6 + i) * 1.2;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <group key={i}>
          <mesh position={node.position} ref={(el) => (nodeRefs.current[i] = el)}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial
              color={node.infected ? "#ff1744" : "#00f0ff"}
              emissive={node.infected ? "#ff1744" : "#00f0ff"}
              emissiveIntensity={node.infected ? 3 : 1}
              toneMapped={false}
            />
          </mesh>
          {node.infected && !destroyed && (
            <mesh position={node.position}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={2} transparent opacity={0.2} toneMapped={false} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function VirusOrbiter({ onClick, destroyed }: { onClick: () => void; destroyed: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(3.2, 0, 0));

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = state.clock.elapsedTime;
    if (groupRef.current && !destroyed) {
      const angle = timeRef.current * 0.2;
      const r = 3.2;
      const x = r * Math.cos(angle);
      const y = Math.sin(timeRef.current * 0.35) * 0.5;
      const z = r * Math.sin(angle);
      groupRef.current.position.set(x, y, z);
      groupRef.current.lookAt(0, 0, 0);
      posRef.current.set(x, y, z);
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 1.8) * 0.08;
    }
  });

  if (destroyed) return null;

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.2}>
        <group
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "default";
          }}
          scale={hovered ? 1.14 : 1}
        >
          <mesh>
            <sphereGeometry args={[0.34, 28, 28]} />
            <meshStandardMaterial color="#361528" emissive="#ff1744" emissiveIntensity={1.2} metalness={0.72} roughness={0.16} />
          </mesh>
          <mesh position={[0.18, 0.05, 0]}>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial color="#47203f" emissive="#ff5e2f" emissiveIntensity={0.8} metalness={0.72} roughness={0.18} />
          </mesh>
          <mesh position={[-0.18, 0.08, 0.12]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fff5f5" emissive="#ff1744" emissiveIntensity={3.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.18, 0.08, -0.12]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fff5f5" emissive="#ff1744" emissiveIntensity={3.5} toneMapped={false} />
          </mesh>
          {[
            [0.02, 0.18, 0.28],
            [0.12, -0.04, 0.34],
            [0.02, 0.18, -0.28],
            [0.12, -0.04, -0.34],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0, 0, z > 0 ? 0.7 : -0.7]}>
              <capsuleGeometry args={[0.03, 0.46, 6, 10]} />
              <meshStandardMaterial color="#1f2937" emissive="#ff1744" emissiveIntensity={0.2} metalness={0.82} roughness={0.18} />
            </mesh>
          ))}
          <mesh scale={2.2}>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#ff1744" transparent opacity={0.08} wireframe emissive="#ff1744" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
          <pointLight intensity={hovered ? 10 : 5.5} color="#ff1744" distance={5} />
          <pointLight position={[0.4, 0.18, 0.4]} intensity={hovered ? 2.6 : 1.8} color="#ff9b7a" distance={2.6} />
        </group>
      </Float>
    </group>
  );
}

function Explosion({ position, active }: { position: THREE.Vector3; active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);
  const particleCount = 240;

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 6;
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i3 + 2] = Math.cos(phi) * speed;
      colors[i3] = 1;
      colors[i3 + 1] = Math.random() * 0.5;
      colors[i3 + 2] = Math.random() * 0.2;
    }
    return { positions, velocities, colors };
  }, []);

  useFrame((state) => {
    if (!active || !particlesRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const posAttr = particlesRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const drag = Math.exp(-elapsed * 0.5);
      posArray[i3] = position.x + velocities[i3] * elapsed * drag;
      posArray[i3 + 1] = position.y + velocities[i3 + 1] * elapsed * drag;
      posArray[i3 + 2] = position.z + velocities[i3 + 2] * elapsed * drag;
    }

    posAttr.needsUpdate = true;
    const mat = particlesRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - elapsed / 2.2);
    mat.size = Math.max(0.01, 0.12 * (1 - elapsed / 3));
  });

  if (!active) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={particleCount} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={particleCount} />
      </bufferGeometry>
      <pointsMaterial size={0.12} vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function WarpEffect({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const streakCount = 180;

  const streaks = useMemo(() => {
    return Array.from({ length: streakCount }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 4;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -10 - Math.random() * 40,
        speed: 20 + Math.random() * 40,
        length: 0.5 + Math.random() * 2.4,
      };
    });
  }, []);

  useFrame((state) => {
    if (!active || !meshRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTimeRef.current;

    meshRef.current.children.forEach((child, i) => {
      const streak = streaks[i];
      if (!streak) return;
      const line = child as THREE.Mesh;
      const z = streak.z + streak.speed * elapsed;
      const wrappedZ = ((z + 50) % 55) - 50;
      line.position.set(streak.x, streak.y, wrappedZ);
      line.scale.set(1, 1, streak.length * Math.min(1 + elapsed * 2, 8));
      const mat = line.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, Math.min(1, 1 - Math.abs(wrappedZ) / 50)) * Math.min(1, elapsed * 2);
    });
  });

  if (!active) return null;

  return (
    <group ref={meshRef}>
      {streaks.map((streak, i) => (
        <mesh key={i} position={[streak.x, streak.y, streak.z]}>
          <boxGeometry args={[0.015, 0.015, streak.length]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function CameraShake({ active }: { active: boolean }) {
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!active) {
      startTime.current = null;
      return;
    }

    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTime.current;
    if (elapsed > 2) return;

    const intensity = Math.max(0, 1 - elapsed / 2) * 0.35;
    state.camera.position.x = Math.sin(elapsed * 35) * intensity;
    state.camera.position.y = Math.cos(elapsed * 30) * intensity * 0.7;
  });

  return null;
}

function DustParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 500;
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0.94 * brightness;
      colors[i * 3 + 2] = 1 * brightness;
    }
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.008;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.025} vertexColors transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function SpaceScene({ onDestroy, destroyed }: { onDestroy: () => void; destroyed: boolean }) {
  const [exploding, setExploding] = useState(false);
  const [warping, setWarping] = useState(false);
  const virusPos = useRef(new THREE.Vector3(3.2, 0, 0));

  const handleDestroy = useCallback(() => {
    setExploding(true);
    setTimeout(() => setWarping(true), 1200);
    setTimeout(() => onDestroy(), 800);
  }, [onDestroy]);

  return (
    <div className="fixed inset-0 z-10">
      <Canvas
        camera={{ position: [0, 1, 7], fov: 55 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.95,
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#050914"]} />
          <fog attach="fog" args={["#050914", 10, 26]} />
          <ambientLight intensity={0.46} color="#8cc7ff" />
          <hemisphereLight intensity={0.72} color="#b9ecff" groundColor="#08111d" />
          <directionalLight position={[5, 3, 5]} intensity={1.8} color="#ffffff" />
          <directionalLight position={[-4, 1.5, -3]} intensity={0.8} color="#54a8ff" />
          <pointLight position={[0, 2.8, 4.8]} intensity={2.6} color="#dff8ff" distance={18} />
          <pointLight position={[-3.8, -1.2, 2.4]} intensity={1.2} color="#ff4a6e" distance={10} />

          <Stars radius={100} depth={100} count={8000} factor={4} saturation={0.3} fade speed={warping ? 12 : 0.3} />
          <DustParticles />
          <Earth infected={!destroyed} />
          <NetworkNodes destroyed={destroyed} />
          <VirusOrbiter onClick={handleDestroy} destroyed={destroyed} />
          <Explosion position={virusPos.current} active={exploding} />
          <WarpEffect active={warping} />
          <CameraShake active={exploding} />
        </Suspense>
      </Canvas>

      {exploding && (
        <div
          className="fixed inset-0 z-20 pointer-events-none"
          style={{ animation: "flash-overlay 2s ease-out forwards" }}
        />
      )}
    </div>
  );
}

function TypewriterText({ text, delay = 0, speed = 35 }: { text: string; delay?: number; speed?: number }) {
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

function HUDOverlay({ destroyed, loading }: { destroyed: boolean; loading: boolean }) {
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#050510" }}>
        <div className="text-center font-mono">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="mb-4 text-sm tracking-[0.3em]" style={{ color: "#00f0ff" }}>
            INITIALIZING SIMULATION...
          </motion.div>
          <div className="mx-auto h-0.5 w-48 overflow-hidden rounded" style={{ background: "#00f0ff20" }}>
            <motion.div className="h-full rounded" style={{ background: "#00f0ff" }} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "easeInOut" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="scanline-overlay fixed inset-0 z-30 pointer-events-none" />

      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.5 }} className="fixed left-6 top-6 z-40 font-mono">
        <div className="mb-1 text-xs tracking-[0.4em]" style={{ color: "#00f0ff80" }}>SYSTEM // ACTIVE</div>
        <div className="text-lg font-bold tracking-[0.2em]" style={{ color: "#00f0ff", textShadow: "0 0 20px #00f0ff60, 0 0 40px #00f0ff30" }}>
          CODECONTAGION
        </div>
        <div className="mt-1 text-xs tracking-[0.3em]" style={{ color: "#ff174480" }}>MISINFO SIMULATION</div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.8 }} className="fixed right-6 top-6 z-40 font-mono text-right">
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
            className="fixed bottom-12 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="hud-panel relative w-[min(90vw,540px)] px-8 py-5 text-center font-mono">
              <div className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2" style={{ borderColor: "#00f0ff" }} />
              <div className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2" style={{ borderColor: "#00f0ff" }} />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2" style={{ borderColor: "#00f0ff" }} />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2" style={{ borderColor: "#00f0ff" }} />

              <div className="mb-3 text-xs tracking-[0.3em]" style={{ color: "#ff1744" }}>
                WARNING DIGITAL OUTBREAK DETECTED
              </div>
              <div className="text-sm leading-relaxed tracking-[0.15em]" style={{ color: "#00f0ff", textShadow: "0 0 10px #00f0ff40" }}>
                <TypewriterText text="CLICK THE VIRUS TO DESTROY IT AND ENTER CODE CONTAGION" delay={1600} speed={32} />
              </div>
              <div className="mt-4 text-xs tracking-[0.24em]" style={{ color: "#ffffff26" }}>
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
        className="fixed bottom-4 left-4 right-4 z-30 flex justify-between font-mono text-[10px] pointer-events-none"
        style={{ color: "#00f0ff20" }}
      >
        <span>LAT: 28.6139 | LON: 77.2090</span>
        <span>NODES: 35 | ACTIVE THREATS: {destroyed ? "0" : "SCANNING..."}</span>
        <span>SYS: OPERATIONAL</span>
      </motion.div>
    </>
  );
}

export default function IntroSequence({ onComplete }: { onComplete: () => void }) {
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
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0a1628 0%, #050510 50%, #000005 100%)" }}>
      {!loading && <SpaceScene onDestroy={handleDestroy} destroyed={destroyed} />}
      <HUDOverlay destroyed={destroyed} loading={loading} />
      {fadeToBlack && <div className="fixed inset-0 z-50 pointer-events-none" style={{ background: "#000000", animation: "fade-to-black 1.2s ease-in forwards" }} />}
    </div>
  );
}
