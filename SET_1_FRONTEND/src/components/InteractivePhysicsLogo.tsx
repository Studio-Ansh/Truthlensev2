import { useEffect, useRef, useState } from "react";

interface Particle {
  // 3D coordinates
  x3d: number;
  y3d: number;
  z3d: number;
  // Current screen coordinates
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  angleOffset: number;
  speedFactor: number;
  type: "dome" | "visor" | "orbit";
}

export default function InteractivePhysicsLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const mouseRef = useRef({ x: -1000, y: -1000, px: -1000, py: -1000, isDown: false, radius: 110 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 1800;

    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      canvas.width = rect?.width || 500;
      canvas.height = rect?.height || 500;
    };

    // Generate beautiful 3D coordinates for a cosmic astronaut helmet/sphere
    const generate3DCoords = () => {
      const newParticles: Particle[] = [];

      for (let i = 0; i < particleCount; i++) {
        let x3d = 0;
        let y3d = 0;
        let z3d = 0;
        let type: "dome" | "visor" | "orbit" = "dome";

        const randVal = Math.random();

        if (randVal < 0.45) {
          // --- Astronaut Helmet Dome (Sphere) ---
          type = "dome";
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1); // Spherical distribution
          const r = 1.0;
          x3d = r * Math.sin(phi) * Math.cos(theta);
          y3d = r * Math.cos(phi);
          z3d = r * Math.sin(phi) * Math.sin(theta);
          
          // Flatten bottom slightly like a helmet neckline
          if (y3d > 0.8) {
            y3d = 0.8;
          }
        } else if (randVal < 0.75) {
          // --- Reflective Visor Shield ---
          type = "visor";
          // Create wide curved arc on the front of the helmet
          const theta = (Math.random() - 0.5) * 1.8; // Visor horizontal sweep
          const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.8; // Visor vertical sweep
          const r = 1.05; // Slightly larger radius for the visor
          x3d = r * Math.sin(phi) * Math.cos(theta);
          y3d = r * Math.cos(phi) - 0.1; // Offset upward
          z3d = r * Math.sin(phi) * Math.sin(theta) + 0.15; // Push forward
        } else {
          // --- Concentric Orbital Ring ---
          type = "orbit";
          const angle = Math.random() * Math.PI * 2;
          const r = 1.35 + Math.random() * 0.1;
          // Angled orbital plane
          x3d = Math.cos(angle) * r;
          y3d = Math.sin(angle) * r * 0.35 + (Math.random() - 0.5) * 0.05;
          z3d = Math.sin(angle) * r * 0.9;
        }

        // Palette inspired by Cosmos Studio and Truthlens warm monochromatic look
        const colorRand = Math.random();
        let color = "#F4F4F0"; // Alabaster White
        if (type === "visor") {
          color = colorRand < 0.7 ? "#C5A880" : "#FFFFFF"; // Gold metallic visor highlights
        } else if (type === "orbit") {
          color = colorRand < 0.5 ? "rgba(197, 168, 128, 0.4)" : "rgba(244, 244, 240, 0.35)"; // Delicate glowing orbital dust
        } else {
          color = colorRand < 0.45 ? "#C5A880" : colorRand < 0.85 ? "#8E939E" : "#FFFFFF";
        }

        newParticles.push({
          x3d,
          y3d,
          z3d,
          x: canvas.width / 2 + (Math.random() - 0.5) * 200,
          y: canvas.height / 2 + (Math.random() - 0.5) * 200,
          vx: 0,
          vy: 0,
          color,
          size: type === "visor" ? Math.random() * 2.2 + 0.9 : Math.random() * 1.5 + 0.6,
          alpha: type === "orbit" ? Math.random() * 0.4 + 0.2 : Math.random() * 0.7 + 0.3,
          angleOffset: Math.random() * Math.PI * 2,
          speedFactor: 0.85 + Math.random() * 0.3,
          type,
        });
      }

      particles = newParticles;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.px = mouseRef.current.x;
      mouseRef.current.py = mouseRef.current.y;
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const onMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      mouseRef.current.isDown = false;
      setHovered(false);
    };

    const onMouseEnter = () => {
      setHovered(true);
    };

    const onMouseDown = () => {
      mouseRef.current.isDown = true;
    };

    const onMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("mouseenter", onMouseEnter);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);

    resize();
    generate3DCoords();

    let rotationY = 0;
    let rotationX = 0;
    let time = 0;

    const update = () => {
      time += 0.01;
      ctx.fillStyle = "rgba(5, 5, 5, 0.22)"; // Trail fluid ghosting effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) * 0.32;

      // Render futuristic grid layout background lines behind the astronaut helmet
      ctx.strokeStyle = "rgba(197, 168, 128, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.35, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating grid indicators on orbit rings
      ctx.strokeStyle = "rgba(244, 244, 240, 0.03)";
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.6, time * 0.2, time * 0.2 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      // Smooth rotate globe in 3D Space
      rotationY += 0.007;
      // Add slight vertical tilt rotation based on mouse hover
      const targetRotX = mouseRef.current.y > 0 ? (mouseRef.current.y - cy) * 0.0006 : 0;
      rotationX += (targetRotX - rotationX) * 0.05;

      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mRadius = mouseRef.current.radius;
      const isDown = mouseRef.current.isDown;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 3D rotation math
        // Rotate around Y axis
        let x1 = p.x3d * cosY - p.z3d * sinY;
        let z1 = p.z3d * cosY + p.x3d * sinY;

        // Rotate around X axis
        let y2 = p.y3d * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y3d * sinX;

        // Simple projection perspective
        const distance = 2.4;
        const scaleFactor = distance / (distance + z2);

        // Calculate target 3D screen position
        const tx = cx + x1 * scale * scaleFactor;
        const ty = cy + y2 * scale * scaleFactor;

        // Apply steering force towards projected 3D target coordinates
        let dx = tx - p.x;
        let dy = ty - p.y;

        p.vx += dx * 0.012 * p.speedFactor;
        p.vy += dy * 0.012 * p.speedFactor;

        // Mouse physics disruption field
        if (mx > -500) {
          const mdx = p.x - mx;
          const mdy = p.y - my;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (dist < mRadius) {
            const force = (mRadius - dist) / mRadius;
            
            // Repulsion
            const pushX = (mdx / dist) * force * 5.5;
            const pushY = (mdy / dist) * force * 5.5;

            p.vx += pushX;
            p.vy += pushY;

            // Fluid vortex whirlpool when clicking
            if (isDown) {
              const angle = Math.atan2(mdy, mdx) + Math.PI / 2;
              p.vx += Math.cos(angle) * force * 6;
              p.vy += Math.sin(angle) * force * 6;
            }
          }
        }

        // Apply viscous drag
        p.vx *= 0.89;
        p.vy *= 0.89;

        // Update physics positions
        p.x += p.vx;
        p.y += p.vy;

        // Skip rendering points completely behind the sphere structure to build high-end depth simulation
        if (z2 > 1.1 && p.type === "dome") continue;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + scaleFactor * 0.4), 0, Math.PI * 2);

        // Pulsing highlights
        const pulse = 0.8 + 0.2 * Math.sin(time * 2.5 + p.angleOffset);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * pulse * scaleFactor;
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("mouseenter", onMouseEnter);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hovered]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[380px] md:h-[500px] flex items-center justify-center cursor-crosshair group select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Interactive HUD labels around the container */}
      <div className="absolute top-4 right-4 pointer-events-none text-[10px] font-mono text-sand/40 text-right">
        <div>[ TRUTHLENS_COSMIC_DOME ]</div>
        <div>AXIS_Y: REVOLVING</div>
        <div>RENDER: 3D_MATRIX</div>
      </div>

      <div className="absolute bottom-4 left-4 pointer-events-none text-[10px] font-mono text-alabaster/30">
        <div>ORBITAL SPHERICAL RESOLUTION</div>
        <div className="flex gap-1 mt-1">
          <div className="w-1 h-3 bg-sand animate-pulse"></div>
          <div className="w-1 h-3 bg-sand/80"></div>
          <div className="w-1 h-3 bg-sand/50"></div>
          <div className="w-1 h-3 bg-sand/20"></div>
          <div className="w-1 h-3 bg-white/10"></div>
        </div>
      </div>

      {/* Center dynamic core feedback text */}
      <div className="absolute flex flex-col items-center justify-center pointer-events-none z-10">
        <div className={`w-24 h-24 rounded-full border border-sand/20 flex items-center justify-center transition-all duration-700 ${hovered ? "scale-110 border-sand/50 box-glow-sand" : "scale-100"}`}>
          <div className={`w-14 h-14 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 ${hovered ? "rotate-90 border-sand/40" : ""}`}>
            <div className="w-4 h-4 rounded-full bg-sand/30 animate-ping"></div>
          </div>
        </div>
        <span className="text-[9px] font-mono tracking-[0.3em] text-sand/60 mt-4 uppercase animate-pulse">
          {hovered ? "EXPLODE SPHERE" : "INTERACTIVE 3D CORE"}
        </span>
      </div>
    </div>
  );
}
