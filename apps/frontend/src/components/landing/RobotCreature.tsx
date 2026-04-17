import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function RoboArm({ index, total, side }: { index: number; total: number; side: number }) {
  const upperRef = useRef<THREE.Group>(null);
  const lowerRef = useRef<THREE.Group>(null);
  const clawRef = useRef<THREE.Group>(null);
  const angle = (index / total) * Math.PI * 2 + side * 0.3;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (upperRef.current) {
      upperRef.current.rotation.z = Math.sin(t * 1.2 + index * 1.5) * 0.3 + 0.4;
      upperRef.current.rotation.x = Math.cos(t * 0.8 + index) * 0.15;
    }
    if (lowerRef.current) {
      lowerRef.current.rotation.z = Math.sin(t * 1.8 + index * 2) * 0.25 - 0.3;
    }
    if (clawRef.current) {
      const open = Math.sin(t * 3 + index) * 0.2;
      clawRef.current.rotation.z = open;
    }
  });

  const dir = new THREE.Vector3(
    Math.cos(angle),
    Math.sin(angle) * 0.6,
    Math.sin(angle) * 0.4
  ).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    dir
  );

  return (
    <group quaternion={quat} position={[dir.x * 0.32, dir.y * 0.32, dir.z * 0.32]}>
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#444" emissive="#ff4400" emissiveIntensity={0.5} metalness={1} roughness={0.2} toneMapped={false} />
      </mesh>
      <group ref={upperRef}>
        <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.025, 0.14, 6]} />
          <meshStandardMaterial color="#333" metalness={1} roughness={0.15} />
        </mesh>
        <mesh position={[0.06, 0.025, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 4]} />
          <meshStandardMaterial color="#666" metalness={1} roughness={0.1} emissive="#ff1744" emissiveIntensity={0.3} toneMapped={false} />
        </mesh>
        <group position={[0.15, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#555" metalness={1} roughness={0.15} />
          </mesh>
          <group ref={lowerRef}>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.015, 0.02, 0.1, 6]} />
              <meshStandardMaterial color="#2a2a2a" metalness={1} roughness={0.2} />
            </mesh>
            <group ref={clawRef} position={[0.12, 0, 0]}>
              <mesh position={[0.02, 0.01, 0]} rotation={[0, 0, 0.3]}>
                <boxGeometry args={[0.04, 0.008, 0.008]} />
                <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={2} metalness={0.9} roughness={0.1} toneMapped={false} />
              </mesh>
              <mesh position={[0.02, -0.01, 0]} rotation={[0, 0, -0.3]}>
                <boxGeometry args={[0.04, 0.008, 0.008]} />
                <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={2} metalness={0.9} roughness={0.1} toneMapped={false} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function ParticleTrail({ parentPos }: { parentPos: React.RefObject<THREE.Vector3 | null> }) {
  const ref = useRef<THREE.Points>(null);
  const count = 80;
  const { positions, lifetimes } = useMemo(
    () => ({
      positions: new Float32Array(count * 3),
      lifetimes: new Float32Array(count).fill(0),
    }),
    []
  );

  useFrame((state, delta) => {
    if (!ref.current || !parentPos.current) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      lifetimes[i] -= delta;
      if (lifetimes[i] <= 0) {
        const pp = parentPos.current;
        arr[i * 3] = pp.x + (Math.random() - 0.5) * 0.3;
        arr[i * 3 + 1] = pp.y + (Math.random() - 0.5) * 0.3;
        arr[i * 3 + 2] = pp.z + (Math.random() - 0.5) * 0.3;
        lifetimes[i] = 0.3 + Math.random() * 1;
      } else {
        arr[i * 3] += (Math.random() - 0.5) * delta * 0.4;
        arr[i * 3 + 1] += delta * 0.2;
        arr[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.4;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    (ref.current.material as THREE.PointsMaterial).opacity =
      0.4 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ff4400" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

export default function RobotCreature({
  onClick,
  destroyed,
}: {
  onClick: () => void;
  destroyed: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);
  const headRef = useRef<THREE.Mesh>(null);
  const visorRef = useRef<THREE.Mesh>(null);
  const antennaRef = useRef<THREE.Group>(null);
  const posRef = useRef<THREE.Vector3 | null>(new THREE.Vector3(3.2, 0, 0));

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
      if (posRef.current) posRef.current.set(x, y, z);
    }

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 1.5) * 0.08;
      headRef.current.rotation.z = Math.cos(t * 1.2) * 0.05;
    }

    if (visorRef.current) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 4 + Math.sin(t * 5) * 2;
    }

    if (antennaRef.current) {
      antennaRef.current.rotation.z = Math.sin(t * 4) * 0.1;
      antennaRef.current.rotation.x = Math.cos(t * 3) * 0.05;
    }
  });

  if (destroyed) return <ParticleTrail parentPos={posRef} />;

  return (
    <>
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
            scale={hovered ? 1.2 : 1}
          >
            <group ref={headRef} position={[0, 0.22, 0]}>
              <mesh>
                <boxGeometry args={[0.22, 0.16, 0.18]} />
                <meshStandardMaterial color="#1a1a2e" metalness={1} roughness={0.12} />
              </mesh>
              <mesh position={[0, 0, 0.091]}>
                <boxGeometry args={[0.2, 0.14, 0.005]} />
                <meshStandardMaterial color="#111" metalness={1} roughness={0.1} />
              </mesh>
              <mesh ref={visorRef} position={[0, 0.01, 0.095]}>
                <boxGeometry args={[0.16, 0.03, 0.005]} />
                <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={5} toneMapped={false} />
              </mesh>
              <mesh position={[-0.04, -0.03, 0.095]}>
                <circleGeometry args={[0.01, 8]} />
                <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={3} toneMapped={false} />
              </mesh>
              <mesh position={[0.04, -0.03, 0.095]}>
                <circleGeometry args={[0.01, 8]} />
                <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={3} toneMapped={false} />
              </mesh>
              <group ref={antennaRef} position={[0, 0.08, 0]}>
                <mesh position={[0, 0.06, 0]}>
                  <cylinderGeometry args={[0.005, 0.008, 0.12, 4]} />
                  <meshStandardMaterial color="#444" metalness={1} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                  <sphereGeometry args={[0.015, 8, 8]} />
                  <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={6} toneMapped={false} />
                </mesh>
              </group>
              <mesh position={[0.115, 0, 0]}>
                <boxGeometry args={[0.01, 0.12, 0.14]} />
                <meshStandardMaterial color="#2a2a3e" metalness={0.9} roughness={0.2} emissive="#9c27b0" emissiveIntensity={0.2} toneMapped={false} />
              </mesh>
              <mesh position={[-0.115, 0, 0]}>
                <boxGeometry args={[0.01, 0.12, 0.14]} />
                <meshStandardMaterial color="#2a2a3e" metalness={0.9} roughness={0.2} emissive="#9c27b0" emissiveIntensity={0.2} toneMapped={false} />
              </mesh>
            </group>

            <group position={[0, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.28, 0.24, 0.2]} />
                <meshStandardMaterial color="#16162a" metalness={1} roughness={0.15} />
              </mesh>
              <mesh position={[0, 0.02, 0.101]}>
                <boxGeometry args={[0.22, 0.18, 0.005]} />
                <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
              </mesh>
              <mesh position={[0, 0.02, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
                <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={4} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0.02, 0.105]}>
                <torusGeometry args={[0.05, 0.005, 8, 16]} />
                <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={2} toneMapped={false} />
              </mesh>
              {[-0.06, 0.06].map((x, i) => (
                <mesh key={`circuit-${i}`} position={[x, -0.06, 0.102]}>
                  <boxGeometry args={[0.003, 0.08, 0.003]} />
                  <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={2} toneMapped={false} />
                </mesh>
              ))}
              <mesh position={[-0.06, -0.04, -0.105]}>
                <cylinderGeometry args={[0.025, 0.03, 0.04, 8]} />
                <meshStandardMaterial color="#333" metalness={1} roughness={0.1} emissive="#4400ff" emissiveIntensity={0.5} toneMapped={false} />
              </mesh>
              <mesh position={[0.06, -0.04, -0.105]}>
                <cylinderGeometry args={[0.025, 0.03, 0.04, 8]} />
                <meshStandardMaterial color="#333" metalness={1} roughness={0.1} emissive="#4400ff" emissiveIntensity={0.5} toneMapped={false} />
              </mesh>
            </group>

            <mesh position={[0, -0.16, 0]}>
              <boxGeometry args={[0.2, 0.08, 0.16]} />
              <meshStandardMaterial color="#111125" metalness={1} roughness={0.15} />
            </mesh>

            {Array.from({ length: 6 }).map((_, i) => (
              <RoboArm key={`arm-${i}`} index={i} total={6} side={i % 2} />
            ))}

            <mesh position={[0.18, 0.1, 0]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.06, 0.1, 0.12]} />
              <meshStandardMaterial color="#1e1e35" metalness={1} roughness={0.12} emissive="#ff1744" emissiveIntensity={0.15} toneMapped={false} />
            </mesh>
            <mesh position={[-0.18, 0.1, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.06, 0.1, 0.12]} />
              <meshStandardMaterial color="#1e1e35" metalness={1} roughness={0.12} emissive="#ff1744" emissiveIntensity={0.15} toneMapped={false} />
            </mesh>

            <mesh scale={2.2}>
              <octahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial
                color="#ff1744"
                transparent
                opacity={0.03}
                wireframe
                toneMapped={false}
                emissive="#ff1744"
                emissiveIntensity={0.8}
              />
            </mesh>

            <pointLight intensity={hovered ? 8 : 4} color="#ff1744" distance={4} />
            <pointLight intensity={2} color="#ff4400" distance={3} position={[0, 0.2, 0.2]} />
          </group>
        </Float>
      </group>
      <ParticleTrail parentPos={posRef} />
    </>
  );
}
