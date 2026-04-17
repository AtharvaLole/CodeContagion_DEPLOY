import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "p";
  glitchIntensity?: "low" | "medium" | "high";
}

const GlitchText = ({ text, className = "", as: Tag = "h1", glitchIntensity = "medium" }: GlitchTextProps) => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, glitchIntensity === "high" ? 2000 : glitchIntensity === "medium" ? 4000 : 6000);
    return () => clearInterval(interval);
  }, [glitchIntensity]);

  return (
    <motion.div
      className="relative inline-block"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Tag className={`relative ${className}`}>
        {text}
        {isGlitching && (
          <>
            <span
              className="absolute inset-0 text-neon-cyan opacity-70"
              style={{ clipPath: "inset(20% 0 30% 0)", transform: "translate(-2px, 0)" }}
              aria-hidden
            >
              {text}
            </span>
            <span
              className="absolute inset-0 text-neon-pink opacity-70"
              style={{ clipPath: "inset(50% 0 10% 0)", transform: "translate(2px, 0)" }}
              aria-hidden
            >
              {text}
            </span>
          </>
        )}
      </Tag>
    </motion.div>
  );
};

export default GlitchText;
