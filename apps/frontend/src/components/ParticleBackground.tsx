import { useEffect, useRef } from "react";

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; speed: number; char: string; opacity: number }[] = [];
    const chars = "01アイウエオカキクケコ{}[]<>/\\|";

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 2,
        char: chars[Math.floor(Math.random() * chars.length)],
        opacity: 0.1 + Math.random() * 0.3,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "14px 'JetBrains Mono', monospace";

      particles.forEach((p) => {
        ctx.fillStyle = `hsla(186, 100%, 50%, ${p.opacity})`;
        ctx.fillText(p.char, p.x, p.y);
        p.y += p.speed;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.char = chars[Math.floor(Math.random() * chars.length)];
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default ParticleBackground;
