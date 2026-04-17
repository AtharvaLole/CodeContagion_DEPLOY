import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import Earth from "./Earth";
import NetworkNodes from "./NetworkNodes";
import RobotCreature from "./RobotCreature";
import Explosion from "./Explosion";
import WarpEffect from "./WarpEffect";

function CameraShake({ active }: { active: boolean }) {
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!active) {
      startTime.current = null;
      return;
    }

    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    if (elapsed > 2) return;

    const intensity = Math.max(0, 1 - elapsed / 2) * 0.4;
    state.camera.position.x = Math.sin(elapsed * 35) * intensity;
    state.camera.position.y = Math.cos(elapsed * 30) * intensity * 0.7;
  });

  return null;
}

function DustParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 800;

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = 0 * brightness;
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
      <pointsMaterial
        size={0.025}
        vertexColors
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function SpaceScene({
  onDestroy,
  destroyed,
}: {
  onDestroy: () => void;
  destroyed: boolean;
}) {
  const [exploding, setExploding] = useState(false);
  const [warping, setWarping] = useState(false);
  const [robotPos] = useState(new THREE.Vector3(3.2, 0, 0));

  const handleRobotClick = useCallback(() => {
    setExploding(true);

    setTimeout(() => {
      setWarping(true);
    }, 1200);

    setTimeout(() => {
      onDestroy();
    }, 800);
  }, [onDestroy]);

  return (
    <div className="fixed inset-0 z-10">
      <Canvas
        camera={{ position: [0, 1, 7], fov: 55 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
          <directionalLight position={[-3, -1, -3]} intensity={0.3} color="#4488ff" />

          <Stars
            radius={100}
            depth={100}
            count={8000}
            factor={4}
            saturation={0.3}
            fade
            speed={warping ? 12 : 0.3}
          />

          <DustParticles />
          <Earth infected={!destroyed} />
          <NetworkNodes destroyed={destroyed} />
          <RobotCreature onClick={handleRobotClick} destroyed={destroyed} />
          <Explosion position={robotPos} active={exploding} />
          <WarpEffect active={warping} />
          <CameraShake active={exploding} />
        </Suspense>
      </Canvas>

      {exploding && (
        <div
          className="fixed inset-0 z-20 pointer-events-none"
          style={{
            animation: "flash-overlay 2s ease-out forwards",
          }}
        />
      )}
    </div>
  );
}
