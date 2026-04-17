import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const TEXTURE_BASE = "https://unpkg.com/three-globe@2.31.1/example/img/";

function AtmosphereShader() {
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
          vec3 atmosphereColor = mix(vec3(0.3, 0.6, 1.0), vec3(0.1, 0.3, 1.0), intensity);
          gl_FragColor = vec4(atmosphereColor, intensity * 0.6);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[2, 64, 64]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  );
}

function CloudLayer() {
  const cloudRef = useRef<THREE.Mesh>(null);
  const cloudTexture = useTexture(`${TEXTURE_BASE}earth-water.png`);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <mesh ref={cloudRef} scale={[2.03, 2.03, 2.03]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={cloudTexture}
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function Earth({ infected }: { infected: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const [dayMap, bumpMap, specMap] = useTexture([
    `${TEXTURE_BASE}earth-blue-marble.jpg`,
    `${TEXTURE_BASE}earth-topology.png`,
    `${TEXTURE_BASE}earth-water.png`,
  ]);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhongMaterial
          map={dayMap}
          bumpMap={bumpMap}
          bumpScale={0.05}
          specularMap={specMap}
          specular={new THREE.Color(infected ? "#331111" : "#333333")}
          shininess={25}
          emissive={infected ? "#1a0008" : "#000510"}
          emissiveIntensity={0.4}
        />
      </mesh>

      <CloudLayer />
      <AtmosphereShader />

      <pointLight
        position={[0, 0, 0]}
        intensity={infected ? 0.8 : 0.3}
        color={infected ? "#ff1744" : "#4488ff"}
        distance={5}
      />
    </group>
  );
}
