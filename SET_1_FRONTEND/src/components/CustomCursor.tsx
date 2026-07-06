import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const mouse = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (hidden) setHidden(false);
    };

    const onMouseDown = () => setClicked(true);
    const onMouseUp = () => setClicked(false);

    const onMouseEnter = () => setHidden(false);
    const onMouseLeave = () => setHidden(true);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mouseleave", onMouseLeave);

    // Setup interactive hovers for links and buttons
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.closest("button") ||
          target.closest("a") ||
          target.classList.contains("interactive") ||
          target.closest(".interactive"))
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };
    window.addEventListener("mouseover", handleMouseOver);

    // Animation loop for smooth lag effect
    let rAFId: number;
    const animate = () => {
      // Direct placement for dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      }

      // Smooth interpolation for ring (lerp)
      const ease = 0.15;
      ring.x += (mouse.x - ring.x) * ease;
      ring.y += (mouse.y - ring.y) * ease;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      }

      rAFId = requestAnimationFrame(animate);
    };
    rAFId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mouseover", handleMouseOver);
      cancelAnimationFrame(rAFId);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      {/* Precision inner dot (no-transition parent handles instant tracking) */}
      <div
        ref={dotRef}
        id="cursor-dot"
        className="fixed top-0 left-0"
        style={{ willChange: "transform" }}
      >
        <div
          className={`h-[8px] w-[8px] -ml-[4px] -mt-[4px] rounded-full bg-sand transition-transform duration-200 ease-out ${
            clicked ? "scale-50" : hovered ? "scale-125" : "scale-100"
          }`}
        />
      </div>

      {/* Trailing outer ring (no-transition parent handles pure JS-lerped tracking) */}
      <div
        ref={ringRef}
        id="cursor-ring"
        className="fixed top-0 left-0"
        style={{ willChange: "transform" }}
      >
        <div
          className={`-ml-[18px] -mt-[18px] h-[36px] w-[36px] rounded-full border transition-all duration-300 ease-out ${
            clicked
              ? "border-alabaster bg-alabaster/10 scale-75"
              : hovered
              ? "border-sand bg-sand/10 scale-150 box-glow-sand"
              : "border-sand/40 bg-transparent"
          }`}
        />
      </div>
    </div>
  );
}
