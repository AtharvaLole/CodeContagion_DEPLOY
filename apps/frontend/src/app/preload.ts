const routeLoaders = [
  () => import("@/pages/DashboardHome"),
  () => import("@/pages/DebugArenaSolo"),
  () => import("@/pages/DebugArenaDuo"),
  () => import("@/pages/EchoTrace"),
  () => import("@/pages/MisinfoModeHub"),
  () => import("@/pages/MisinfoSolo"),
  () => import("@/pages/MisinfoMultiplayer"),
  () => import("@/pages/LeaderboardScreen"),
  () => import("@/pages/ProfileScreen"),
  () => import("@/pages/LoginScreen")
];

export const introExperienceLoader = () => import("@/components/landing/IntroSequenceExact");

const introTextureUrls = [
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png",
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png"
];

const SESSION_KEY = "codecontagion:landing-session-ready";

function runWhenIdle(task: () => void) {
  if (typeof window === "undefined") {
    return;
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(() => task());
    return;
  }

  window.setTimeout(task, 150);
}

export function hasCompletedLandingSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(SESSION_KEY) === "true";
}

export function markLandingSessionComplete() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SESSION_KEY, "true");
}

export function warmApplicationShell() {
  if (typeof window === "undefined") {
    return;
  }

  // Warm route chunks during the landing sequence so the first session feels instant
  // once the intro hands control to the rest of the app.
  runWhenIdle(() => {
    routeLoaders.forEach((loadRoute) => {
      void loadRoute();
    });
  });
}

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = url;

    if (image.complete) {
      resolve();
      return;
    }

    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

function ensurePreconnect(url: string) {
  if (typeof document === "undefined") {
    return;
  }

  const origin = new URL(url).origin;
  const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
  if (existing) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

export async function warmIntroExperience() {
  if (typeof window === "undefined") {
    return;
  }

  introTextureUrls.forEach((url) => ensurePreconnect(url));

  // Pull the intro chunk and its heaviest texture assets into the browser cache
  // before we mount the cinematic 3D scene.
  await Promise.allSettled([
    introExperienceLoader(),
    ...introTextureUrls.map((url) => preloadImage(url))
  ]);
}
