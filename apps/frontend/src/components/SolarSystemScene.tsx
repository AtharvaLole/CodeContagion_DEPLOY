import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";

export type LandingMode = "idle" | "explore" | "flying" | "revealed";
export type LandingPanel = "overview" | "modes" | "play" | "leaderboard" | "launch";

type SolarSystemSceneProps = {
  mode: LandingMode;
  activePanel: LandingPanel;
  onCrashComplete: () => void;
};

const panelFocusMap: Record<LandingPanel, THREE.Vector3> = {
  overview: new THREE.Vector3(0, 0, 0),
  modes: new THREE.Vector3(8, 0, -4),
  play: new THREE.Vector3(-10, 0, -10),
  leaderboard: new THREE.Vector3(14, 0, 12),
  launch: new THREE.Vector3(-16, 0, 15)
};

const lerp = (current: number, target: number, alpha: number) => current + (target - current) * alpha;

function Planet({
  radius,
  size,
  color,
  speed,
  y = 0,
  offset = 0,
  emissive,
  hasRing = false
}: {
  radius: number;
  size: number;
  color: string;
  speed: number;
  y?: number;
  offset?: number;
  emissive?: string;
  hasRing?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;
    if (groupRef.current) {
      groupRef.current.position.set(Math.cos(t) * radius, y + Math.sin(t * 0.6) * 0.25, Math.sin(t) * radius);
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.004;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={0.15} metalness={0.15} roughness={0.85} />
      </mesh>
      {hasRing ? (
        <mesh rotation={[Math.PI / 2.5, 0.4, 0]}>
          <torusGeometry args={[size * 1.7, size * 0.12, 20, 120]} />
          <meshStandardMaterial color="#f8e7b6" emissive="#f8e7b6" emissiveIntensity={0.15} transparent opacity={0.72} />
        </mesh>
      ) : null}
    </group>
  );
}

function OrbitRing({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.03, 12, 180]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} />
    </mesh>
  );
}

function AsteroidBelt() {
  const groupRef = useRef<Group>(null);
  const asteroids = useMemo(
    () =>
      Array.from({ length: 70 }, (_, index) => {
        const angle = (index / 70) * Math.PI * 2;
        const radius = 19 + (index % 6) * 0.45;
        return {
          position: [Math.cos(angle) * radius, ((index % 5) - 2) * 0.15, Math.sin(angle) * radius] as [number, number, number],
          scale: 0.08 + (index % 4) * 0.03
        };
      }),
    []
  );

  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.035;
    }
  });

  return (
    <group ref={groupRef}>
      {asteroids.map((asteroid, index) => (
        <mesh key={index} position={asteroid.position} scale={asteroid.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#72645e" emissive="#2b2523" emissiveIntensity={0.2} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function MovingProps() {
  const mothershipRef = useRef<Group>(null);
  const ufoRef = useRef<Group>(null);
  const cometRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (mothershipRef.current) {
      mothershipRef.current.position.set(-18 + Math.sin(t * 0.16) * 6, 6 + Math.sin(t * 0.42) * 0.9, -22 + Math.cos(t * 0.18) * 3);
      mothershipRef.current.rotation.y += 0.006;
    }

    if (ufoRef.current) {
      ufoRef.current.position.set(22 - ((t * 2.4) % 44), 2 + Math.sin(t * 1.3) * 1.2, -12);
      ufoRef.current.rotation.y += 0.03;
    }

    if (cometRef.current) {
      const loop = (t * 0.12) % 1;
      cometRef.current.position.set(30 - loop * 60, 14 - loop * 12, -25);
    }
  });

  return (
    <>
      <group ref={mothershipRef}>
        <mesh>
          <cylinderGeometry args={[1.4, 2.1, 0.55, 40]} />
          <meshStandardMaterial color="#0e1728" emissive="#30C9E8" emissiveIntensity={0.25} metalness={0.75} roughness={0.16} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <sphereGeometry args={[0.65, 24, 24]} />
          <meshStandardMaterial color="#dffaff" emissive="#30C9E8" emissiveIntensity={0.8} transparent opacity={0.92} />
        </mesh>
      </group>

      <group ref={ufoRef}>
        <mesh>
          <sphereGeometry args={[0.38, 20, 20]} />
          <meshStandardMaterial color="#c8fbff" emissive="#30C9E8" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.8, 1.2, 0.18, 40]} />
          <meshStandardMaterial color="#111827" emissive="#E8308C" emissiveIntensity={0.2} metalness={0.9} roughness={0.12} />
        </mesh>
      </group>

      <group ref={cometRef}>
        <mesh>
          <sphereGeometry args={[0.22, 18, 18]} />
          <meshStandardMaterial color="#f5c451" emissive="#f5c451" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[1.5, 0.3, 0]} rotation={[0, 0, -0.22]}>
          <coneGeometry args={[0.28, 3.4, 16]} />
          <meshStandardMaterial color="#f9fafb" emissive="#f9fafb" emissiveIntensity={0.65} transparent opacity={0.45} />
        </mesh>
      </group>
    </>
  );
}

function Jet({ mode, onCrashComplete }: { mode: LandingMode; onCrashComplete: () => void }) {
  const groupRef = useRef<Group>(null);
  const crashRef = useRef<Group>(null);
  const triggeredRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    triggeredRef.current = false;
    startTimeRef.current = null;
  }, [mode]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (startTimeRef.current === null && mode === "flying") {
      startTimeRef.current = t;
    }

    const elapsed = startTimeRef.current === null ? 0 : t - startTimeRef.current;

    if (groupRef.current) {
      if (mode === "idle") {
        groupRef.current.position.set(0, 0, 6.5);
        groupRef.current.rotation.set(0, Math.PI, 0);
      } else if (mode === "explore") {
        groupRef.current.position.set(6 + Math.sin(t * 0.8) * 1.2, 1.1 + Math.sin(t * 1.3) * 0.4, 4 + Math.cos(t * 0.9) * 1.4);
        groupRef.current.rotation.set(0.08, Math.PI * 0.65, Math.sin(t * 1.4) * 0.08);
      } else if (mode === "flying") {
        const progress = Math.min(elapsed / 5.2, 1);
        const x = THREE.MathUtils.lerp(0, 22, progress);
        const y = THREE.MathUtils.lerp(0, -4.8, progress) + Math.sin(progress * Math.PI * 3) * 1.1;
        const z = THREE.MathUtils.lerp(6.5, -20, progress);
        groupRef.current.position.set(x, y, z);
        groupRef.current.rotation.set(0.25 + progress * 0.8, Math.PI - progress * 1.1, -progress * 1.25);

        if (progress >= 1 && !triggeredRef.current) {
          triggeredRef.current = true;
          onCrashComplete();
        }
      } else {
        groupRef.current.position.set(20, -5, -20);
        groupRef.current.rotation.set(1.2, 1.9, -1.2);
      }
    }

    if (crashRef.current) {
      const visible = mode === "flying" && elapsed > 4.7;
      crashRef.current.visible = visible || mode === "revealed";
      if (visible || mode === "revealed") {
        crashRef.current.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
        crashRef.current.rotation.y += 0.04;
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh>
          <coneGeometry args={[0.38, 2.4, 16]} />
          <meshStandardMaterial color="#f5c451" emissive="#f5c451" emissiveIntensity={0.18} metalness={0.62} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0, -0.95]}>
          <cylinderGeometry args={[0.18, 0.28, 1.15, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.18} metalness={0.68} roughness={0.16} />
        </mesh>
        <mesh position={[0.55, 0, -0.2]} rotation={[0, 0, Math.PI / 9]}>
          <boxGeometry args={[1.2, 0.08, 0.45]} />
          <meshStandardMaterial color="#0f172a" emissive="#30C9E8" emissiveIntensity={0.18} metalness={0.92} roughness={0.1} />
        </mesh>
        <mesh position={[-0.55, 0, -0.2]} rotation={[0, 0, -Math.PI / 9]}>
          <boxGeometry args={[1.2, 0.08, 0.45]} />
          <meshStandardMaterial color="#0f172a" emissive="#30C9E8" emissiveIntensity={0.18} metalness={0.92} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0, 1.15]}>
          <coneGeometry args={[0.14, 0.8, 12]} />
          <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.95} transparent opacity={0.9} />
        </mesh>
      </group>

      <group ref={crashRef} visible={false} position={[22, -5.2, -20]}>
        <mesh>
          <sphereGeometry args={[1.1, 20, 20]} />
          <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={1.3} transparent opacity={0.8} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.8, 0.22, 16, 50]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.8} transparent opacity={0.68} />
        </mesh>
        <Sparkles count={24} scale={[4, 3, 4]} size={5} speed={1.6} color="#fb923c" />
      </group>
    </>
  );
}

function SceneController({ mode, activePanel }: { mode: LandingMode; activePanel: LandingPanel }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    const focus = panelFocusMap[activePanel];
    let targetPosition = new THREE.Vector3(0, 0.5, 11);
    let lookAt = new THREE.Vector3(0, 0, 0);

    if (mode === "explore") {
      targetPosition = new THREE.Vector3(0, 9, 34);
      lookAt = new THREE.Vector3(0, 0, 0);
    }

    if (mode === "flying") {
      targetPosition = new THREE.Vector3(5, 4, 12);
      lookAt = new THREE.Vector3(8, -1, -10);
    }

    if (mode === "revealed") {
      targetPosition = new THREE.Vector3(focus.x + 8, 6, focus.z + 16);
      lookAt = focus.clone();
    }

    camera.position.x = lerp(camera.position.x, targetPosition.x, 0.04);
    camera.position.y = lerp(camera.position.y, targetPosition.y, 0.04);
    camera.position.z = lerp(camera.position.z, targetPosition.z, 0.04);
    camera.lookAt(lookAt);

    if (controlsRef.current) {
      controlsRef.current.enabled = mode === "explore";
      controlsRef.current.target.lerp(lookAt, 0.06);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={mode === "explore"}
      minDistance={14}
      maxDistance={48}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.7}
      autoRotate={mode === "idle"}
      autoRotateSpeed={0.35}
    />
  );
}

function PanelBeacon({ position, label, active }: { position: [number, number, number]; label: string; active: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 2.6, 12]} />
        <meshBasicMaterial color={active ? "#30C9E8" : "#94a3b8"} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={active ? "#30C9E8" : "#94a3b8"} emissive={active ? "#30C9E8" : "#64748b"} emissiveIntensity={0.65} />
      </mesh>
      <Html center position={[0, 2.05, 0]} distanceFactor={11}>
        <div className="rounded-full border border-primary/20 bg-background/70 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-primary backdrop-blur-md">
          {label}
        </div>
      </Html>
    </group>
  );
}

function SceneWorld({ mode, activePanel, onCrashComplete }: SolarSystemSceneProps) {
  return (
    <>
      <color attach="background" args={["#02040b"]} />
      <fog attach="fog" args={["#02040b", 30, 120]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[18, 15, 10]} intensity={1.8} color="#fff1cc" />
      <pointLight position={[-2, 0, 0]} intensity={220} color="#ffb84d" distance={120} />
      <pointLight position={[16, 8, 12]} intensity={18} color="#30C9E8" distance={40} />
      <Stars radius={180} depth={90} count={5000} factor={4.2} saturation={0} fade speed={0.5} />
      <Sparkles count={180} scale={[120, 60, 120]} size={4} speed={0.25} color="#ffffff" />
      <Sparkles count={80} scale={[80, 40, 80]} size={6} speed={0.18} color="#30C9E8" />

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[3.8, 48, 48]} />
        <meshStandardMaterial color="#ffb84d" emissive="#ff8c1a" emissiveIntensity={1.1} />
      </mesh>

      <OrbitRing radius={8} color="#4b5563" />
      <OrbitRing radius={11.5} color="#4b5563" />
      <OrbitRing radius={15.5} color="#4b5563" />
      <OrbitRing radius={20.5} color="#4b5563" />
      <OrbitRing radius={28} color="#4b5563" />
      <OrbitRing radius={36} color="#4b5563" />

      <Planet radius={8} size={0.48} color="#c08457" speed={0.7} offset={0.2} />
      <Planet radius={11.5} size={0.72} color="#e8c27d" speed={0.58} offset={1.4} />
      <Planet radius={15.5} size={0.88} color="#3b82f6" emissive="#3b82f6" speed={0.46} offset={2.1} />
      <Planet radius={20.5} size={0.68} color="#ef4444" speed={0.38} offset={0.9} />
      <Planet radius={28} size={1.8} color="#d6ad6d" speed={0.26} offset={1.2} />
      <Planet radius={36} size={1.45} color="#e2d6ae" speed={0.18} offset={2.7} hasRing />

      <AsteroidBelt />
      <MovingProps />
      <Jet mode={mode} onCrashComplete={onCrashComplete} />

      {mode === "revealed" ? (
        <>
          <PanelBeacon position={[0, 4.8, 0]} label="OVERVIEW" active={activePanel === "overview"} />
          <PanelBeacon position={[8, 4.8, -4]} label="MODES" active={activePanel === "modes"} />
          <PanelBeacon position={[-10, 4.2, -10]} label="PLAY" active={activePanel === "play"} />
          <PanelBeacon position={[14, 4.4, 12]} label="RANK" active={activePanel === "leaderboard"} />
          <PanelBeacon position={[-16, 4.8, 15]} label="LAUNCH" active={activePanel === "launch"} />
        </>
      ) : null}

      <SceneController mode={mode} activePanel={activePanel} />
    </>
  );
}

const SolarSystemScene = ({ mode, activePanel, onCrashComplete }: SolarSystemSceneProps) => {
  return (
    <Canvas className="!h-full !w-full" camera={{ position: [0, 0.5, 11], fov: 48 }}>
      <SceneWorld mode={mode} activePanel={activePanel} onCrashComplete={onCrashComplete} />
    </Canvas>
  );
};

export default SolarSystemScene;
