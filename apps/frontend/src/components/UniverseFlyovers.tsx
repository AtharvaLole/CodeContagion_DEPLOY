import { motion } from "framer-motion";

const flyovers = [
  {
    id: "ufo-alpha",
    top: "18%",
    duration: 24,
    delay: 0,
    scale: 0.95,
    bodyClass:
      "h-8 w-20 rounded-full border border-primary/30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(48,201,232,0.85)_35%,rgba(4,9,20,0.2)_80%)] shadow-[0_0_40px_rgba(48,201,232,0.25)]",
    trailClass: "h-px w-20 bg-gradient-to-r from-primary/0 via-primary/70 to-primary/0"
  },
  {
    id: "meteor-gold",
    top: "34%",
    duration: 18,
    delay: 4,
    scale: 0.8,
    bodyClass:
      "h-4 w-4 rounded-full bg-neon-yellow shadow-[0_0_28px_rgba(245,196,81,0.55)]",
    trailClass: "h-[2px] w-28 rotate-[-18deg] bg-gradient-to-r from-white/0 via-neon-yellow to-white/0"
  },
  {
    id: "jet-pink",
    top: "56%",
    duration: 22,
    delay: 2,
    scale: 0.9,
    bodyClass:
      "h-5 w-16 skew-x-[-24deg] rounded-sm border border-accent/30 bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(232,48,140,0.9),rgba(48,201,232,0.7))] shadow-[0_0_32px_rgba(232,48,140,0.3)]",
    trailClass: "h-px w-24 bg-gradient-to-r from-accent/0 via-accent/80 to-accent/0"
  },
  {
    id: "planet-blue",
    top: "72%",
    duration: 38,
    delay: 6,
    scale: 1.1,
    bodyClass:
      "h-14 w-14 rounded-full border border-primary/20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),rgba(48,201,232,0.65)_34%,rgba(14,23,44,0.9)_72%)] shadow-[0_0_38px_rgba(48,201,232,0.22)]",
    trailClass: "hidden"
  }
] as const;

const UniverseFlyovers = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {flyovers.map((item, index) => (
        <motion.div
          key={item.id}
          className="absolute left-[-18vw] z-[1]"
          style={{ top: item.top }}
          initial={{ x: "-5vw", y: 0, opacity: 0 }}
          animate={{
            x: ["0vw", "48vw", "112vw"],
            y: [0, index % 2 === 0 ? -26 : 18, index % 2 === 0 ? 26 : -12],
            opacity: [0, 0.9, 0.9, 0]
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 1.5 + index * 0.4
          }}
        >
          <div className="flex items-center gap-3" style={{ transform: `scale(${item.scale})` }}>
            <div className={item.trailClass} />
            <div className={item.bodyClass} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default UniverseFlyovers;
