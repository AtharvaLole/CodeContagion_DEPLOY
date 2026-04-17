import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Bot, Network, RadioTower, ShieldAlert, Users } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import { appRoutes } from "@/app/routes";

const modeCards = [
  {
    title: "Solo Containment",
    subtitle: "Single-player outbreak response",
    description:
      "Investigate suspicious nodes, deploy irreversible actions, manage panic, and submit your final containment strategy before the network collapses.",
    bullets: [
      "Start a fresh dynamic network every round",
      "Inspect nodes with AI forensics support",
      "Submit once your containment plan is final"
    ],
    icon: ShieldAlert,
    route: appRoutes.misinfoSimSolo,
    cta: "ENTER SOLO MODE",
    accent: "text-primary",
    panelClass: "border-primary/30 bg-primary/10"
  },
  {
    title: "Multiplayer Command",
    subtitle: "Real-time collaborative containment",
    description:
      "Create or join a live room with up to four players, coordinate through the room chat, and let the host submit the final containment call.",
    bullets: [
      "Room-code based cooperative sessions",
      "Shared real-time node updates and timer flow",
      "Host-controlled final submission and scoring"
    ],
    icon: Users,
    route: appRoutes.misinfoSimMultiplayer,
    cta: "ENTER MULTIPLAYER",
    accent: "text-accent",
    panelClass: "border-accent/30 bg-accent/10"
  }
] as const;

export default function MisinfoModeHub() {
  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />

      <main className="mx-auto flex max-w-7xl flex-col px-4 pb-14 pt-24">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <GlassPanel className="overflow-hidden p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(48,201,232,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(232,48,140,0.16),transparent_34%)]" />
            <div className="relative">
              <div className="flex items-center gap-3 text-primary">
                <Network className="h-5 w-5" />
                <p className="font-mono text-xs tracking-[0.28em]">MISINFO SIMULATOR</p>
              </div>

              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight text-foreground md:text-5xl">
                Choose the containment lane for the next misinformation outbreak.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Trace infected channels, inspect suspicious narratives, lock decisions in place, and control the spread
                before the panic threshold takes over the system.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={appRoutes.misinfoSimSolo}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-mono text-xs tracking-[0.2em] text-primary-foreground transition-all hover:brightness-110"
                >
                  <ShieldAlert className="h-4 w-4" />
                  START SOLO
                </Link>
                <Link
                  to={appRoutes.misinfoSimMultiplayer}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-5 py-3 font-mono text-xs tracking-[0.2em] text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Users className="h-4 w-4" />
                  START MULTIPLAYER
                </Link>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-8">
            <p className="font-mono text-xs tracking-[0.24em] text-neon-yellow">MISSION FLOW</p>
            <div className="mt-5 space-y-4">
              {[
                {
                  icon: RadioTower,
                  title: "Outbreak detection",
                  text: "Every round begins with a fresh network state and a new misinformation pattern."
                },
                {
                  icon: Bot,
                  title: "Forensic analysis",
                  text: "Inspect nodes, review AI intel, and identify which accounts should be contained first."
                },
                {
                  icon: Activity,
                  title: "Irreversible decisions",
                  text: "Actions lock in once used, so the final containment path has to be deliberate."
                }
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/30 bg-surface-1/50 p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-primary" />
                    <p className="font-display text-lg text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {modeCards.map((mode) => (
            <GlassPanel key={mode.title} className={`p-8 ${mode.panelClass}`}>
              <div className="flex items-center gap-3">
                <mode.icon className={`h-5 w-5 ${mode.accent}`} />
                <p className={`font-mono text-xs tracking-[0.22em] ${mode.accent}`}>{mode.subtitle}</p>
              </div>

              <h2 className="mt-5 font-display text-3xl text-foreground">{mode.title}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{mode.description}</p>

              <div className="mt-6 space-y-3">
                {mode.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-xl border border-border/20 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
                    {bullet}
                  </div>
                ))}
              </div>

              <Link
                to={mode.route}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background/70 px-5 py-3 font-mono text-xs tracking-[0.18em] text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              >
                {mode.cta}
              </Link>
            </GlassPanel>
          ))}
        </section>

        <section className="mt-8">
          <GlassPanel className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-xs tracking-[0.24em] text-muted-foreground">NAVIGATION</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Return to the main landing page or jump straight into the simulation route you want to test.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={appRoutes.home}
                className="inline-flex items-center gap-2 rounded-lg border border-border/30 px-4 py-3 font-mono text-xs tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                BACK TO HOME
              </Link>
              <Link
                to={appRoutes.dashboard}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
              >
                OPEN DASHBOARD
              </Link>
            </div>
          </GlassPanel>
        </section>
      </main>
    </div>
  );
}
