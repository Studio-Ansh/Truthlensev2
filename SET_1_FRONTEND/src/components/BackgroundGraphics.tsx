import React, { useEffect, useRef, useState } from "react";

interface FloatingHUDNode {
  x: number;
  y: number;
  label: string;
  value: string;
  driftX: number;
  driftY: number;
  size: number;
}

export default function BackgroundGraphics() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, radius: 110 });
  const [hudActive, setHudActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rAFId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize floating telemetry nodes in background
    const hudNodes: FloatingHUDNode[] = [];
    const nodeLabels = [
      { label: "C2PA_BLOCK_0x98A", value: "SIGNATURE_VALID" },
      { label: "CMOS_FORENSIC_X7", value: "NOISE_CORR: 0.94" },
      { label: "VIT_PATCH_RESIDUAL", value: "FREQ: 24.5kHz" },
      { label: "BAYES_JOINT_WEIGHTS", value: "ENTROPY: 0.12H" },
      { label: "LSTM_TEMPORAL_GATE", value: "DELTA: 1.2ms" },
      { label: "SPATIAL_ANALYZE_RECEPTOR", value: "GRID: 12x12" },
      { label: "METADATA_DECODE_01", value: "EXIF_INTEGRITY: 100%" },
      { label: "TRUTHLENS_CORE_NODE", value: "PORT_BIND_3000" }
    ];

    nodeLabels.forEach((item) => {
      hudNodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        label: item.label,
        value: item.value,
        driftX: (Math.random() - 0.5) * 0.3,
        driftY: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 4 + 2
      });
    });

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      if (!hudActive) setHudActive(true);
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = -1000;
      mouseRef.current.targetY = -1000;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    let time = 0;

    const animate = () => {
      time += 0.01;
      
      // Lerp mouse for ultra-smooth trailing magnifying lens effect
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1;

      // Dark monochromatic Cosmos-style background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // --- 1. Draw Core Micro-Dot Grid ---
      const gridSpacing = 40;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const lensRad = mouseRef.current.radius;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSpacing) {
        for (let y = 0; y < height; y += gridSpacing) {
          // Calculate distance to magnifier lens
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let drawX = x;
          let drawY = y;
          let dotSize = 1;
          let dotColor = "rgba(255, 255, 255, 0.05)";

          if (mx > -200 && dist < lensRad) {
            // --- Magnifying Glass Lens Distortion Effect ---
            // Push points outward from the lens center to simulate refraction magnification!
            const force = (lensRad - dist) / lensRad;
            // Shift coordinates slightly outwards
            drawX = x - (dx / dist) * force * 15;
            drawY = y - (dy / dist) * force * 15;
            
            // Inside magnifier lens: higher contrast sand colored dots
            dotSize = 2;
            dotColor = `rgba(197, 168, 128, ${0.15 + force * 0.45})`;
          } else {
            // Subtle pulse for ambient feel
            const pulse = Math.sin(time + (x + y) * 0.005) * 0.5 + 0.5;
            dotColor = `rgba(255, 255, 255, ${0.02 + pulse * 0.04})`;
          }

          ctx.fillStyle = dotColor;
          ctx.fillRect(drawX - dotSize / 2, drawY - dotSize / 2, dotSize, dotSize);
        }
      }

      // --- 2. Update & Render Floating Background Telemetry Nodes ---
      hudNodes.forEach((node) => {
        // Apply drift
        node.x += node.driftX;
        node.y += node.driftY;

        // Wrap around bounds
        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        const dx = node.x - mx;
        const dy = node.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let isInsideLens = false;
        let scale = 1.0;
        let opacity = 0.15;
        let color = "#8E939E"; // Slate Muted

        if (mx > -200 && dist < lensRad) {
          isInsideLens = true;
          const force = (lensRad - dist) / lensRad;
          scale = 1.0 + force * 0.4;
          opacity = 0.3 + force * 0.6;
          color = "#C5A880"; // Warm sand highlights inside magnifier
        } else {
          // Ambient pulse opacity
          opacity = 0.1 + Math.sin(time + node.x * 0.01) * 0.08;
        }

        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.scale(scale, scale);

        // Draw crosshair node target point
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(0, 0, node.size, 0, Math.PI * 2);
        ctx.stroke();

        // Connect tiny diagnostic vector if inside lens
        if (isInsideLens) {
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#C5A880";
          ctx.fill();

          // Text label overlay revealed by the magnifying lens
          ctx.font = "9px monospace";
          ctx.fillStyle = "#F4F4F0";
          ctx.fillText(`[${node.label}]`, node.size + 6, -3);
          ctx.fillStyle = "#C5A880";
          ctx.fillText(`val: ${node.value}`, node.size + 6, 8);

          // Render micro wireline connecting center of lens to node
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-dx / scale, -dy / scale);
          ctx.strokeStyle = "rgba(197, 168, 128, 0.05)";
          ctx.stroke();
        } else {
          // Distant tiny indicator
          ctx.font = "8px monospace";
          ctx.fillStyle = color;
          ctx.fillText(`[${node.label.slice(0, 6)}..]`, node.size + 4, 3);
        }

        ctx.restore();
      });

      // --- 3. Draw Advanced Magnifying Lens Overlay HUD (Cosmos Studio Style) ---
      if (mx > -200) {
        ctx.globalAlpha = 1.0;
        
        // Render magnifying lens container border
        ctx.strokeStyle = "rgba(197, 168, 128, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, lensRad, 0, Math.PI * 2);
        ctx.stroke();

        // Subtle shaded inner shadow layer inside magnifier glass
        const grad = ctx.createRadialGradient(mx, my, lensRad * 0.6, mx, my, lensRad);
        grad.addColorStop(0, "rgba(197, 168, 128, 0.0)");
        grad.addColorStop(1, "rgba(197, 168, 128, 0.08)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, lensRad, 0, Math.PI * 2);
        ctx.fill();

        // Rotating outer calibration ring
        ctx.strokeStyle = "rgba(197, 168, 128, 0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.arc(mx, my, lensRad + 8, time * 0.5, time * 0.5 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Center crosshair inside magnifying glass
        ctx.strokeStyle = "rgba(197, 168, 128, 0.3)";
        ctx.lineWidth = 0.75;
        
        ctx.beginPath();
        // horizontal crosshair ticks
        ctx.moveTo(mx - 15, my);
        ctx.lineTo(mx - 4, my);
        ctx.moveTo(mx + 4, my);
        ctx.lineTo(mx + 15, my);
        // vertical crosshair ticks
        ctx.moveTo(mx, my - 15);
        ctx.lineTo(mx, my - 4);
        ctx.moveTo(mx, my + 4);
        ctx.lineTo(mx, my + 15);
        ctx.stroke();

        // Technical HUD tags on lens borders
        ctx.fillStyle = "#C5A880";
        ctx.font = "8px monospace";
        ctx.fillText("LENS_ZOOM: 2.5X", mx + lensRad - 10, my - 15);
        ctx.fillText(`X:${Math.round(mx)} Y:${Math.round(my)}`, mx - lensRad + 10, my + lensRad + 15);
        ctx.fillStyle = "#F4F4F0";
        ctx.fillText("SYS.FORENSIC_SCOPE", mx - 45, my - lensRad - 10);
      }

      ctx.globalAlpha = 1.0;
      rAFId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rAFId);
    };
  }, [hudActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
