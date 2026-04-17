import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NodeData {
  position: THREE.Vector3;
  infected: boolean;
  infectedAt: number;
}

function generateNodes(count: number): NodeData[] {
  const nodes: NodeData[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const r = 2.15;
    nodes.push({
      position: new THREE.Vector3(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi)
      ),
      infected: false,
      infectedAt: 0,
    });
  }
  return nodes;
}

function generateEdges(nodes: NodeData[]): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = nodes[i].position.distanceTo(nodes[j].position);
      if (dist < 1.8) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

function EdgePulse({
  start,
  end,
  infected,
  edgeIndex,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  infected: boolean;
  edgeIndex: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const phase = (t * 0.8 + edgeIndex * 0.37) % 1;
    const pos = new THREE.Vector3().lerpVectors(start, end, phase);
    ref.current.position.copy(pos);

    const pulse = 0.015 + Math.sin(t * 6 + edgeIndex) * 0.005;
    ref.current.scale.setScalar(pulse / 0.015);

    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.4 + Math.sin(phase * Math.PI) * 0.6;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.015, 8, 8]} />
      <meshStandardMaterial
        color={infected ? "#ff1744" : "#00f0ff"}
        emissive={infected ? "#ff1744" : "#00f0ff"}
        emissiveIntensity={infected ? 5 : 3}
        transparent
        opacity={0.8}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function NetworkNodes({
  onInfectionProgress,
  destroyed,
}: {
  onInfectionProgress?: (pct: number) => void;
  destroyed: boolean;
}) {
  const nodeCount = 35;
  const nodesRef = useRef(generateNodes(nodeCount));
  const [nodes, setNodes] = useState<NodeData[]>(() => nodesRef.current);
  const edges = useMemo(() => generateEdges(nodesRef.current), []);
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => {
    if (destroyed) {
      setNodes((prev) =>
        prev.map((n) => ({ ...n, infected: false, infectedAt: 0 }))
      );
      return;
    }

    const timer1 = setTimeout(() => {
      setNodes((prev) => {
        const next = [...prev];
        next[0] = { ...next[0], infected: true, infectedAt: Date.now() };
        return next;
      });
    }, 2000);

    const spreadInterval = setInterval(() => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        const infectedIndices = next
          .map((n, i) => (n.infected ? i : -1))
          .filter((i) => i >= 0);

        if (infectedIndices.length >= nodeCount) return prev;

        const shuffled = [...infectedIndices].sort(() => Math.random() - 0.5);
        for (const idx of shuffled) {
          const neighbors = edges
            .filter(([a, b]) => a === idx || b === idx)
            .map(([a, b]) => (a === idx ? b : a))
            .filter((n) => !next[n].infected);

          if (neighbors.length > 0) {
            const target = neighbors[Math.floor(Math.random() * neighbors.length)];
            next[target] = { ...next[target], infected: true, infectedAt: Date.now() };
            break;
          }
        }

        const infectedCount = next.filter((n) => n.infected).length;
        onInfectionProgress?.(infectedCount / nodeCount);
        return next;
      });
    }, 1000);

    return () => {
      clearTimeout(timer1);
      clearInterval(spreadInterval);
    };
  }, [destroyed, edges, nodeCount, onInfectionProgress]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }

    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh || !nodes[i]) return;
      if (nodes[i].infected) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4 + i * 0.5) * 0.4;
        mesh.scale.setScalar(pulse);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 6 + i) * 1.5;
      } else {
        mesh.scale.setScalar(1);
      }
    });
  });

  const edgeLines = useMemo(() => {
    return edges.map(([a, b]) => {
      const points = [nodesRef.current[a].position, nodesRef.current[b].position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return { geometry, a, b };
    });
  }, [edges]);

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <group key={`node-${i}`}>
          <mesh
            position={node.position}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial
              color={node.infected ? "#ff1744" : "#00f0ff"}
              emissive={node.infected ? "#ff1744" : "#00f0ff"}
              emissiveIntensity={node.infected ? 3 : 1}
              toneMapped={false}
            />
          </mesh>
          {node.infected && (
            <mesh position={node.position}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial
                color="#ff1744"
                emissive="#ff1744"
                emissiveIntensity={2}
                transparent
                opacity={0.2}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          )}
          <pointLight
            position={node.position}
            intensity={node.infected ? 0.5 : 0.06}
            color={node.infected ? "#ff1744" : "#00f0ff"}
            distance={0.6}
          />
        </group>
      ))}

      {edgeLines.map(({ geometry, a, b }, i) => {
        const aInf = nodes[a]?.infected;
        const bInf = nodes[b]?.infected;
        const bothInf = aInf && bInf;
        const anyInf = aInf || bInf;

        const material = new THREE.LineBasicMaterial({
          color: bothInf ? "#ff1744" : anyInf ? "#ff6b00" : "#00f0ff",
          transparent: true,
          opacity: bothInf ? 0.6 : anyInf ? 0.3 : 0.12,
        });
        const lineObj = new THREE.Line(geometry, material);

        return <primitive key={`edge-${i}`} object={lineObj} />;
      })}

      {edgeLines.map(({ a, b }, i) => {
        const aInf = nodes[a]?.infected;
        const bInf = nodes[b]?.infected;
        const anyInf = aInf || bInf;
        if (i % 3 !== 0) return null;
        return (
          <EdgePulse
            key={`pulse-${i}`}
            start={nodesRef.current[a].position}
            end={nodesRef.current[b].position}
            infected={anyInf || false}
            edgeIndex={i}
          />
        );
      })}
    </group>
  );
}
