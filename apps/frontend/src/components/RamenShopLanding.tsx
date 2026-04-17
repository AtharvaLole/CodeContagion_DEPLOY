import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF, useKTX2 } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { appRoutes } from "@/app/routes";

type ClickRoute = {
  meshName: string;
  route: string;
};

const routeMeshes: ClickRoute[] = [
  { meshName: "arcadeScreen", route: appRoutes.debugArena },
  { meshName: "vendingMachineScreen", route: appRoutes.misinfoSim },
  { meshName: "sideScreen", route: appRoutes.login },
  { meshName: "bigScreen", route: appRoutes.dashboard },
  { meshName: "littleTVScreen", route: appRoutes.leaderboard },
];

const hiddenMeshes = new Set([
  "jesseZhouJoined",
  "jZhouBlack",
  "jZhouPink",
  "projectsRed",
  "projectsWhite",
  "articlesRed",
  "articlesWhite",
  "aboutMeBlack",
  "aboutMeBlue",
  "creditsBlack",
  "creditsOrange",
  "chinese",
  // known text/logo meshes that are safe to hide
  "jesseRamen",
  "jesseRamenBlack",
  "jesseRamenBlue",
  "jesseRamenPink",
  "jesseRamenWhite",
  "ramenz",
  "ramenzBlack",
  "ramenzGreen",
  "ramenzPink",
  "ramenzWhite",
]);

const transitionVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const transitionFragmentShader = `
uniform float progress;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform float rotationQuarterTurns;
varying vec2 vUv;

vec2 rotateUv(vec2 uv, float quarterTurns) {
  if (quarterTurns < 0.5) return uv;
  if (quarterTurns < 1.5) return vec2(uv.y, 1.0 - uv.x);
  if (quarterTurns < 2.5) return vec2(1.0 - uv.x, 1.0 - uv.y);
  return vec2(1.0 - uv.y, uv.x);
}

void main() {
  vec2 uv = rotateUv(vUv, rotationQuarterTurns);
  vec4 t1 = texture2D(texture1, uv);
  vec4 t2 = texture2D(texture2, uv);
  vec4 base = mix(t1, t2, progress);

  float edge = 1.0 - distance(vUv, vec2(0.5));
  float glow = smoothstep(0.18, 0.9, edge) * 0.22;
  vec3 boosted = min(base.rgb * 1.18 + glow * vec3(0.16, 0.34, 0.45), vec3(1.0));

  gl_FragColor = vec4(boosted, base.a);
}
`;

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
}

function makeBasic(texture: THREE.Texture) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    transparent: true,
  });
}

function makeColor(color: string) {
  return new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
  });
}

function makeMatcap(texture: THREE.Texture, side: THREE.Side = THREE.FrontSide) {
  return new THREE.MeshMatcapMaterial({
    matcap: texture,
    side,
  });
}

function makeTransitionMaterial(
  texture1: THREE.Texture,
  texture2: THREE.Texture,
  rotationQuarterTurns = 0
) {
  return new THREE.ShaderMaterial({
    side: THREE.FrontSide,
    transparent: false,
    uniforms: {
      texture1: { value: texture1 },
      texture2: { value: texture2 },
      progress: { value: 0 },
      rotationQuarterTurns: { value: rotationQuarterTurns },
    },
    vertexShader: transitionVertexShader,
    fragmentShader: transitionFragmentShader,
  });
}

function createScreenTexture(
  width: number,
  height: number,
  title: string,
  subtitle: string,
  accent = "#22d3ee",
  secondary = "#f472b6"
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const texture = new THREE.CanvasTexture(canvas);
    configureTexture(texture);
    return texture;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.5, "#0b1220");
  gradient.addColorStop(1, "#111827");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const insetX = Math.floor(width * 0.18);
  const insetY = Math.floor(height * 0.18);
  const innerW = width - insetX * 2;
  const innerH = height - insetY * 2;

  ctx.fillStyle = "#020617";
  ctx.fillRect(insetX, insetY, innerW, innerH);

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(3, Math.floor(width * 0.008));
  ctx.strokeRect(insetX + 8, insetY + 8, innerW - 16, innerH - 16);

  ctx.strokeStyle = secondary;
  ctx.lineWidth = Math.max(2, Math.floor(width * 0.004));
  ctx.strokeRect(insetX + 22, insetY + 22, innerW - 44, innerH - 44);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleSize = Math.floor(innerH * 0.15);
  const brandSize = Math.floor(innerH * 0.085);
  const subtitleSize = Math.floor(innerH * 0.05);

  ctx.fillStyle = "#f8fafc";
  ctx.font = `bold ${titleSize}px Arial`;

  const words = title.split(" ");
  if (words.length >= 2) {
    const first = words.slice(0, -1).join(" ");
    const last = words[words.length - 1];
    ctx.fillText(first, width / 2, insetY + innerH * 0.34);
    ctx.fillText(last, width / 2, insetY + innerH * 0.48);
  } else {
    ctx.fillText(title, width / 2, insetY + innerH * 0.42);
  }

  ctx.fillStyle = accent;
  ctx.font = `bold ${brandSize}px Arial`;
  ctx.fillText("CODECONTAGION", width / 2, insetY + innerH * 0.64);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `${subtitleSize}px Arial`;
  ctx.fillText(subtitle, width / 2, insetY + innerH * 0.79);

  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

function createCompactScreenTexture(
  width: number,
  height: number,
  title: string,
  subtitle: string,
  accent = "#22d3ee",
  secondary = "#f472b6"
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const texture = new THREE.CanvasTexture(canvas);
    configureTexture(texture);
    return texture;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.55, "#0f172a");
  gradient.addColorStop(1, "#111827");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const padX = Math.floor(width * 0.08);
  const padY = Math.floor(height * 0.12);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
  ctx.fillRect(padX, padY, innerW, innerH);

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, Math.floor(width * 0.01));
  ctx.strokeRect(padX + 6, padY + 6, innerW - 12, innerH - 12);

  ctx.strokeStyle = secondary;
  ctx.lineWidth = Math.max(1, Math.floor(width * 0.005));
  ctx.strokeRect(padX + 16, padY + 16, innerW - 32, innerH - 32);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleSize = Math.max(30, Math.floor(height * 0.18));
  const subtitleSize = Math.max(18, Math.floor(height * 0.09));
  const brandSize = Math.max(15, Math.floor(height * 0.07));

  ctx.fillStyle = "#f8fafc";
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.fillText(title, width / 2, height * 0.42);

  ctx.fillStyle = accent;
  ctx.font = `bold ${brandSize}px Arial`;
  ctx.fillText("CODECONTAGION", width / 2, height * 0.62);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `${subtitleSize}px Arial`;
  ctx.fillText(subtitle, width / 2, height * 0.76);

  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

function RamenScene() {
  const navigate = useNavigate();
  const groupRef = useRef<THREE.Group>(null);

  const clickStateRef = useRef<Record<string, number>>({
    arcadeScreen: 0,
    vendingMachineScreen: 0,
    sideScreen: 0,
    bigScreen: 0,
    littleTVScreen: 0,
    tallScreen: 0,
    tvScreen: 0,
    smallScreen1: 0,
    smallScreen2: 0,
    smallScreen3: 0,
    smallScreen4: 0,
    smallScreen5: 0,
  });

  const { scene } = useGLTF(
    "/ramen-shop/models/ramenShop/glTF/ramenShop.gltf",
    "/draco/gltf/"
  );

  const bakedPng = useLoader(THREE.TextureLoader, [
    "/ramen-shop/textures/baked/ramenShopBaked1024.png",
    "/ramen-shop/textures/baked/machinesBaked1024.png",
    "/ramen-shop/textures/baked/floorBaked1024.png",
    "/ramen-shop/textures/baked/miscBaked1024.png",
  ]);

  const [ramenPng, machinesPng, floorPng, miscPng] = bakedPng;

  const [shopFrontTex, shopSideTex] = useLoader(THREE.TextureLoader, [
    "/codecontagion/debug_cafe_sign.png",
    "/codecontagion/cafe_vertical_sign.png",
  ]);

  const matcaps = useKTX2(
    {
      dish: "/ramen-shop/textures/matcaps/dishMatCap.ktx2",
      fan: "/ramen-shop/textures/matcaps/fanMatCap.ktx2",
    },
    "/basis/"
  );

  const brandedTextures = useMemo(() => {
    return {
      arcadeIdle: createScreenTexture(1024, 1024, "DEBUG MODE", "Tap to open", "#22d3ee", "#f472b6"),
      arcadeOpen: createScreenTexture(1024, 1024, "DEBUG ARENA", "Second tap to enter", "#f472b6", "#f59e0b"),

      vendingIdle: createScreenTexture(1024, 1024, "MISINFO SIM", "Tap to load", "#4ade80", "#22d3ee"),
      vendingOpen: createScreenTexture(1024, 1024, "SIM READY", "Second tap to enter", "#f59e0b", "#fb7185"),

      sideIdle: createScreenTexture(1024, 1024, "ACCESS", "Authenticate", "#a78bfa", "#22d3ee"),
      sideOpen: createScreenTexture(1024, 1024, "LOGIN READY", "Second tap to continue", "#22d3ee", "#f472b6"),

      bigIdle: createScreenTexture(1024, 1024, "DASHBOARD", "System overview", "#22d3ee", "#4ade80"),
      bigOpen: createScreenTexture(1024, 1024, "ANALYTICS READY", "Second tap to open", "#4ade80", "#f59e0b"),

      littleIdle: createScreenTexture(1024, 1024, "LEADERBOARD", "Live ranks", "#f59e0b", "#fb7185"),
      littleOpen: createScreenTexture(1024, 1024, "SCORES READY", "Second tap to open", "#fb7185", "#f472b6"),

      small1Idle: createCompactScreenTexture(512, 512, "FAKE NEWS", "5G birds hacked satellites", "#22d3ee", "#f472b6"),
      small1Open: createCompactScreenTexture(512, 512, "VERIFY", "Cross-check sources now", "#f472b6", "#22d3ee"),

      small2Idle: createCompactScreenTexture(512, 512, "BUG ALERT", "Null pointer in auth flow", "#4ade80", "#f59e0b"),
      small2Open: createCompactScreenTexture(512, 512, "PATCH READY", "Trace, fix, submit", "#f59e0b", "#4ade80"),

      small3Idle: createCompactScreenTexture(512, 512, "ROOM CHAT", "Squad up to solve together", "#a78bfa", "#f472b6"),
      small3Open: createCompactScreenTexture(512, 512, "TEAM LIVE", "Host controls the round", "#f472b6", "#a78bfa"),

      small4Idle: createCompactScreenTexture(512, 512, "TREND SPIKE", "Three nodes spreading panic", "#22d3ee", "#4ade80"),
      small4Open: createCompactScreenTexture(512, 512, "CONTAINMENT", "Quarantine with evidence", "#4ade80", "#22d3ee"),

      small5Idle: createCompactScreenTexture(512, 512, "CODE LAB", "Compile clues, not chaos", "#f59e0b", "#f472b6"),
      small5Open: createCompactScreenTexture(512, 512, "DEBUG CAFE", "Arcade route armed", "#f472b6", "#f59e0b"),

      tallIdle: createCompactScreenTexture(640, 1024, "DEBUG CAFE", "CodeContagion control point", "#22d3ee", "#4ade80"),
      tallOpen: createCompactScreenTexture(640, 1024, "HOW TO PLAY", "Inspect, decide, submit", "#4ade80", "#22d3ee"),

      tvIdle: createCompactScreenTexture(1024, 640, "BREAKING", "Deepfake CEO sparks market panic", "#fb7185", "#f59e0b"),
      tvOpen: createCompactScreenTexture(1024, 640, "FACT CHECK", "Source trail flagged as fake", "#22d3ee", "#fb7185"),
    };
  }, []);

  const preparedScene = useMemo(() => {
    [ramenPng, machinesPng, floorPng, miscPng, shopFrontTex, shopSideTex].forEach(configureTexture);
    Object.values(matcaps).forEach(configureTexture);
    Object.values(brandedTextures).forEach(configureTexture);

    const cloned = scene.clone(true);

    const materials = {
      ramen: makeBasic(ramenPng),
      machines: makeBasic(machinesPng),
      floor: makeBasic(floorPng),
      misc: makeBasic(miscPng),

      graphics: makeColor("#0b1120"),

      small1: makeTransitionMaterial(brandedTextures.small1Idle, brandedTextures.small1Open),
      small2: makeTransitionMaterial(brandedTextures.small2Idle, brandedTextures.small2Open),
      small3: makeTransitionMaterial(brandedTextures.small3Idle, brandedTextures.small3Open),
      small4: makeTransitionMaterial(brandedTextures.small4Idle, brandedTextures.small4Open),
      small5: makeTransitionMaterial(brandedTextures.small5Idle, brandedTextures.small5Open),
      tallScreen: makeTransitionMaterial(brandedTextures.tallIdle, brandedTextures.tallOpen, 1),
      tvScreen: makeTransitionMaterial(brandedTextures.tvIdle, brandedTextures.tvOpen, 1),

      fanMatcap: makeMatcap(matcaps.fan),
      dishMatcap: makeMatcap(matcaps.dish, THREE.DoubleSide),

      arcadeScreen: makeTransitionMaterial(brandedTextures.arcadeIdle, brandedTextures.arcadeOpen),
      vendingScreen: makeTransitionMaterial(brandedTextures.vendingIdle, brandedTextures.vendingOpen),
      sideScreen: makeTransitionMaterial(brandedTextures.sideIdle, brandedTextures.sideOpen, 1),
      bigScreen: makeTransitionMaterial(brandedTextures.bigIdle, brandedTextures.bigOpen, 1),
      littleTV: makeTransitionMaterial(brandedTextures.littleIdle, brandedTextures.littleOpen, 1),

      white: makeColor("#ffffff"),
      black: makeColor("#020617"),
      red: makeColor("#fb7185"),
      pink: makeColor("#f472b6"),
      blue: makeColor("#22d3ee"),
      orange: makeColor("#f59e0b"),
      green: makeColor("#4ade80"),
      neonBlue: makeColor("#38bdf8"),
      neonPink: makeColor("#f472b6"),
      neonYellow: makeColor("#fde047"),
      neonGreen: makeColor("#4ade80"),
      poleLight: makeColor("#e879f9"),
      redLED: makeColor("#fb7185"),
      greenLED: makeColor("#4ade80"),
    };

    cloned.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
      child.receiveShadow = true;

      if (hiddenMeshes.has(child.name)) {
        child.visible = false;
        return;
      }

      switch (child.name) {
        case "ramenShopJoined":
          child.material = materials.ramen;
          break;
        case "machinesJoined":
          child.material = materials.machines;
          break;
        case "floor":
          child.material = materials.floor;
          break;
        case "miscJoined":
          child.material = materials.misc;
          break;
        case "graphicsJoined":
          child.material = materials.graphics;
          break;

        case "fan1":
        case "fan2":
          child.material = materials.fanMatcap;
          break;

        case "dish":
        case "dishStand":
          child.material = materials.dishMatcap;
          break;

        case "arcadeScreen":
          child.material = materials.arcadeScreen;
          break;
        case "vendingMachineScreen":
          child.material = materials.vendingScreen;
          break;
        case "sideScreen":
          child.material = materials.sideScreen;
          break;
        case "bigScreen":
          child.material = materials.bigScreen;
          break;
        case "littleTVScreen":
          child.material = materials.littleTV;
          break;
        case "tallScreen":
          child.material = materials.tallScreen;
          break;
        case "tvScreen":
          child.material = materials.tvScreen;
          break;

        case "smallScreen1":
          child.material = materials.small1;
          break;
        case "smallScreen2":
          child.material = materials.small2;
          break;
        case "smallScreen3":
          child.material = materials.small3;
          break;
        case "smallScreen4":
          child.material = materials.small4;
          break;
        case "smallScreen5":
          child.material = materials.small5;
          break;

        case "whiteButton":
        case "vendingMachineLight":
        case "lampLights":
          child.material = materials.white;
          break;

        case "redLED":
        case "arcadeToken":
          child.material = materials.redLED;
          break;

        case "greenLED":
          child.material = materials.greenLED;
          break;

        case "blueLights":
          child.material = materials.blue;
          break;

        case "yellowRightLight":
          child.material = materials.orange;
          break;

        case "greenSignSquare":
          child.material = materials.green;
          break;

        case "neonBlue":
        case "portalLight":
        case "storageLight":
        case "arcadeRim":
          child.material = materials.neonBlue;
          break;

        case "neonPink":
          child.material = materials.neonPink;
          break;

        case "neonYellow":
          child.material = materials.neonYellow;
          break;

        case "neonGreen":
          child.material = materials.neonGreen;
          break;

        case "poleLight":
          child.material = materials.poleLight;
          break;

        default:
          break;
      }
    });

    return cloned;
  }, [scene, ramenPng, machinesPng, floorPng, miscPng, matcaps, brandedTextures, shopFrontTex, shopSideTex]);

  const routeMap = useMemo(
    () => new Map(routeMeshes.map((item) => [item.meshName, item.route])),
    []
  );

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;

    const fan1 = preparedScene.getObjectByName("fan1");
    const fan2 = preparedScene.getObjectByName("fan2");
    const dish = preparedScene.getObjectByName("dish");
    const dishStand = preparedScene.getObjectByName("dishStand");

    if (fan1) fan1.rotation.y = -elapsed * 3;
    if (fan2) fan2.rotation.y = -elapsed * 3;
    if (dish) dish.rotation.y = Math.sin(elapsed * 0.5) * 0.4 - Math.PI * 0.2;
    if (dishStand) dishStand.rotation.y = Math.sin(elapsed * 0.5) * 0.2;

    if (groupRef.current) {
      groupRef.current.position.y = -2.9 + Math.sin(elapsed * 0.45) * 0.03;
    }

    const animateScreen = (name: string, idlePulse = false, speed = 1) => {
      const obj = preparedScene.getObjectByName(name);
      if (!(obj instanceof THREE.Mesh)) return;

      const material = obj.material as THREE.ShaderMaterial;
      if (!material.uniforms?.progress) return;

      const open = clickStateRef.current[name] ?? 0;
      const current = material.uniforms.progress.value as number;
      const target = open ? 1 : idlePulse ? (Math.sin(elapsed * speed) + 1) * 0.08 : 0;

      material.uniforms.progress.value = THREE.MathUtils.lerp(current, target, delta * 5);
    };

    animateScreen("arcadeScreen", false);
    animateScreen("vendingMachineScreen", false);
    animateScreen("sideScreen", true, 0.9);
    animateScreen("bigScreen", true, 0.6);
    animateScreen("littleTVScreen", true, 1.2);
    animateScreen("tallScreen", true, 0.75);
    animateScreen("tvScreen", true, 0.95);
    animateScreen("smallScreen1", true, 0.8);
    animateScreen("smallScreen2", true, 1.0);
    animateScreen("smallScreen3", true, 0.7);
    animateScreen("smallScreen4", true, 1.1);
    animateScreen("smallScreen5", true, 0.9);
  });

  return (
    <group ref={groupRef} position={[0, -2.9, 0]} rotation={[0.01, -0.58, 0]} scale={1.22}>
      <primitive
        object={preparedScene}
        onPointerDown={(event) => {
          const meshName = event.object.name;
          const route = routeMap.get(meshName);
          if (!route) return;

          event.stopPropagation();

          const isOpen = clickStateRef.current[meshName] === 1;

          if (!isOpen) {
            clickStateRef.current[meshName] = 1;
            return;
          }

          navigate(route);
        }}
      />

      {/* Front shop sign overlay */}
      <mesh position={[-4.55, 0.9, 3.2]} rotation={[0, 1.0, 0]}>
        <planeGeometry args={[3.25, 1.02]} />
        <meshBasicMaterial map={shopFrontTex} transparent toneMapped={false} />
      </mesh>

      {/* Side vertical sign overlay */}
      <mesh position={[-7.35, 2.1, 1.35]} rotation={[0, 2.57, 0]}>
        <planeGeometry args={[0.95, 2.55]} />
        <meshBasicMaterial map={shopSideTex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function RamenShopLanding() {
  useEffect(() => {
    useGLTF.preload("/ramen-shop/models/ramenShop/glTF/ramenShop.gltf", "/draco/gltf/");
  }, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-[#020617]">
      <Canvas
        camera={{ position: [15, 7, 16], fov: 36, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        shadows
      >
        <color attach="background" args={["#020617"]} />

        <ambientLight intensity={2.1} />
        <hemisphereLight intensity={1.6} color="#eff6ff" groundColor="#0f172a" />
        <directionalLight position={[8, 12, 7]} intensity={3.2} castShadow />
        <pointLight position={[2.8, 5.8, 4.8]} intensity={22} distance={22} color="#22d3ee" />
        <pointLight position={[-3.6, 4.5, -1.6]} intensity={16} distance={20} color="#f472b6" />
        <pointLight position={[0.2, 6.4, -4.8]} intensity={14} distance={18} color="#facc15" />
        <pointLight position={[-7.5, 3.2, 4.5]} intensity={9} distance={24} color="#60a5fa" />
        <pointLight position={[6.5, 2.8, -5.5]} intensity={8} distance={22} color="#4ade80" />
        <pointLight position={[0.8, 3.8, 3.2]} intensity={10} distance={10} color="#22d3ee" />
        <pointLight position={[-1.8, 4.6, 2.2]} intensity={8} distance={9} color="#f472b6" />
        <pointLight position={[0.4, 5.6, 0.8]} intensity={7} distance={8} color="#67e8f9" />

        <RamenScene />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.08}
          zoomSpeed={1.35}
          rotateSpeed={0.75}
          target={[0, 0.8, 0]}
          minDistance={4.8}
          maxDistance={32}
          minPolarAngle={0.55}
          maxPolarAngle={1.5}
          minAzimuthAngle={-1.6}
          maxAzimuthAngle={0.95}
        />
      </Canvas>
    </div>
  );
}