import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls, Sparkles } from "@react-three/drei";
import type { Group } from "three";

const ringColors = ["#30C9E8", "#E8308C", "#F5C451", "#30E849"];

function ContainmentCore() {
  const rootRef = useRef<Group>(null);
  const shellRef = useRef<Group>(null);

  const orbitNodes = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        const radius = 2.45 + (index % 3) * 0.22;
        const elevation = index % 2 === 0 ? 0.7 : -0.65;

        return {
          id: index,
          position: [Math.cos(angle) * radius, elevation, Math.sin(angle) * radius] as [number, number, number],
          line: [
            [0, 0, 0],
            [Math.cos(angle) * radius, elevation, Math.sin(angle) * radius]
          ] as [number, number, number][],
          color: ringColors[index % ringColors.length]
        };
      }),
    []
  );

  useFrame((state, delta) => {
    if (rootRef.current) {
      rootRef.current.rotation.y += delta * 0.25;
      rootRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
    }

    if (shellRef.current) {
      shellRef.current.rotation.x += delta * 0.18;
      shellRef.current.rotation.z -= delta * 0.12;
    }
  });

  return (
    <group ref={rootRef} scale={1.1}>
      <mesh rotation={[0.45, 0.3, 0]}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial color="#0B1120" emissive="#30C9E8" emissiveIntensity={0.65} metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh rotation={[0.1, 0.6, 0.2]}>
        <torusKnotGeometry args={[1.15, 0.12, 180, 24, 2, 5]} />
        <meshStandardMaterial color="#E8308C" emissive="#E8308C" emissiveIntensity={0.55} metalness={0.6} roughness={0.25} />
      </mesh>

      <group ref={shellRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.85, 0.05, 24, 160]} />
          <meshStandardMaterial color="#30C9E8" emissive="#30C9E8" emissiveIntensity={1} metalness={0.85} roughness={0.18} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2.8, 0.4]}>
          <torusGeometry args={[2.35, 0.035, 20, 160]} />
          <meshStandardMaterial color="#F5C451" emissive="#F5C451" emissiveIntensity={0.8} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, 0.5, 0.2]}>
          <torusGeometry args={[2.75, 0.028, 20, 160]} />
          <meshStandardMaterial color="#30E849" emissive="#30E849" emissiveIntensity={0.5} metalness={0.75} roughness={0.24} />
        </mesh>
      </group>

      {orbitNodes.map((node) => (
        <group key={node.id}>
          <Line points={node.line} color={node.color} lineWidth={1.2} transparent opacity={0.7} />
          <Float speed={1.6 + node.id * 0.06} rotationIntensity={0.4} floatIntensity={0.35}>
            <mesh position={node.position}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={1.2} metalness={0.25} roughness={0.15} />
            </mesh>
          </Float>
        </group>
      ))}

      <mesh position={[0, -1.75, 0]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.55, 1.25, 0.85, 6]} />
        <meshStandardMaterial color="#0A0F1D" emissive="#111827" emissiveIntensity={0.4} metalness={0.9} roughness={0.24} />
      </mesh>

      <mesh position={[0, -2.08, 0]}>
        <cylinderGeometry args={[1.5, 1.65, 0.15, 32]} />
        <meshStandardMaterial color="#30C9E8" emissive="#30C9E8" emissiveIntensity={0.5} metalness={0.85} roughness={0.12} />
      </mesh>

      <Sparkles count={75} scale={[7.5, 5.5, 7.5]} size={3} speed={0.6} color="#30C9E8" />
      <Sparkles count={35} scale={[5.5, 4.5, 5.5]} size={4} speed={0.4} color="#E8308C" />
    </group>
  );
}

const ContainmentHeroModel = () => {
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top,rgba(48,201,232,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(232,48,140,0.14),transparent_32%),linear-gradient(135deg,rgba(4,9,20,0.96),rgba(7,14,28,0.92))] shadow-[0_0_90px_rgba(48,201,232,0.12)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(48,201,232,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(48,201,232,0.08)_1px,transparent_1px)] bg-[size:42px_42px] opacity-30" />
      <div className="absolute left-5 top-5 z-10 rounded-full border border-primary/20 bg-background/40 px-3 py-1 font-mono text-[10px] tracking-[0.28em] text-primary backdrop-blur-md">
        THREAT ENGINE // 360 INTERACTIVE
      </div>
      <div className="absolute bottom-5 right-5 z-10 max-w-[220px] rounded-2xl border border-accent/20 bg-background/35 px-4 py-3 backdrop-blur-md">
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent">MODEL BRIEF</p>
        <p className="mt-2 text-xs text-muted-foreground">
          A containment core merging a bug-vault and misinformation network shell, built to represent both CodeContagion modes in one system.
        </p>
      </div>
      <Canvas camera={{ position: [0, 0.8, 7.2], fov: 48 }}>
        <color attach="background" args={["#030712"]} />
        <fog attach="fog" args={["#030712", 8, 14]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 6, 4]} intensity={2.4} color="#dffafe" />
        <pointLight position={[-4, 2, -2]} intensity={28} color="#30C9E8" distance={10} />
        <pointLight position={[4, -1, 2]} intensity={16} color="#E8308C" distance={8} />
        <ContainmentCore />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3.4}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate
          autoRotateSpeed={1.4}
        />
      </Canvas>
    </div>
  );
};

export default ContainmentHeroModel;
