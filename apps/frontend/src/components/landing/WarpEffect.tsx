import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function WarpStreaks({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const streakCount = 300;

  const streaks = useMemo(() => {
    return Array.from({ length: streakCount }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 4;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -10 - Math.random() * 40,
        speed: 20 + Math.random() * 50,
        length: 0.5 + Math.random() * 3,
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

      const stretch = Math.min(1 + elapsed * 2, 8);
      line.scale.set(1, 1, streak.length * stretch);

      const mat = line.material as THREE.MeshBasicMaterial;
      const dist = Math.abs(wrappedZ);
      mat.opacity = Math.max(0, Math.min(1, 1 - dist / 50)) * Math.min(1, elapsed * 2);
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

function VoidTunnel({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);

  const tunnelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float rings = sin(vPosition.z * 2.0 + uTime * 8.0) * 0.5 + 0.5;
          rings *= sin(vPosition.z * 0.5 + uTime * 3.0) * 0.5 + 0.5;
          float edge = smoothstep(0.3, 1.0, dist);
          vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 1.0, 1.0), rings * 0.5);
          float alpha = edge * rings * uIntensity * 0.4;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (!active || !ref.current) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startRef.current;

    tunnelMaterial.uniforms.uTime.value = elapsed;
    tunnelMaterial.uniforms.uIntensity.value = Math.min(1, elapsed * 0.8);

    ref.current.position.z = -20 + elapsed * 5;
  });

  if (!active) return null;

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[5, 3, 50, 32, 20, true]} />
      <primitive object={tunnelMaterial} attach="material" />
    </mesh>
  );
}

export default function WarpEffect({ active }: { active: boolean }) {
  return (
    <>
      <WarpStreaks active={active} />
      <VoidTunnel active={active} />
    </>
  );
}
