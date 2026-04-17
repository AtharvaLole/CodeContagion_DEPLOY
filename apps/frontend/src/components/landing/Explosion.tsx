import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ShockwaveRing({ position, active }: { position: THREE.Vector3; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);

  useFrame((state) => {
    if (!active || !ref.current) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startRef.current;
    const scale = 1 + elapsed * 8;
    ref.current.scale.set(scale, scale, scale);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = Math.max(0, 0.8 - elapsed * 0.6);
  });

  if (!active) return null;

  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.3, 0.02, 8, 64]} />
      <meshStandardMaterial
        color="#ff6b00"
        emissive="#ff1744"
        emissiveIntensity={5}
        transparent
        opacity={0.8}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function Explosion({
  position,
  active,
}: {
  position: THREE.Vector3;
  active: boolean;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);
  const particleCount = 400;

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 8;
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i3 + 2] = Math.cos(phi) * speed;

      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i3] = 1;
        colors[i3 + 1] = 0.09;
        colors[i3 + 2] = 0.27;
      } else if (colorChoice < 0.5) {
        colors[i3] = 1;
        colors[i3 + 1] = 0.42;
        colors[i3 + 2] = 0;
      } else if (colorChoice < 0.7) {
        colors[i3] = 0.61;
        colors[i3 + 1] = 0.15;
        colors[i3 + 2] = 0.69;
      } else {
        colors[i3] = 1;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 0.2;
      }
    }
    return { positions, velocities, colors };
  }, []);

  useFrame((state) => {
    if (!active || !particlesRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const posAttr = particlesRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const drag = Math.exp(-elapsed * 0.5);
      posArray[i3] = position.x + velocities[i3] * elapsed * drag;
      posArray[i3 + 1] = position.y + velocities[i3 + 1] * elapsed * drag - elapsed * elapsed * 0.3;
      posArray[i3 + 2] = position.z + velocities[i3 + 2] * elapsed * drag;
    }

    posAttr.needsUpdate = true;

    const mat = particlesRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - elapsed / 2.5);
    mat.size = Math.max(0.01, 0.15 * (1 - elapsed / 3));
  });

  if (!active) return null;

  return (
    <>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={particleCount} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} count={particleCount} />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <ShockwaveRing position={position} active={active} />
    </>
  );
}
