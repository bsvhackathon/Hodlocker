'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
// Remove the Russo_One import if it's not used elsewhere in this file
// import { Russo_One } from 'next/font/google'; 

// Remove the unused constant definition
/*
const russoOne = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-russo-one",
});
*/

// --- Configuration Constants ---
const PARTICLE_SIZE = 1.5;    // Size of each particle square
const MOUSE_RADIUS = 10;      // Interaction radius around the mouse (Reduced from 60)
const REPULSION_STRENGTH = 15; // How strongly particles are pushed away (Reduced from 40)
const RETURN_FORCE = 0.03;    // How strongly particles return home (smaller = slower return)
const FRICTION = 0.90;        // Damping factor (0.8-0.98 are common values)
const SAMPLING_RATE = 2;      // Lower = more particles (e.g., 2), Higher = fewer (e.g., 5). Adjust for performance.
const CANVAS_PADDING = 10;    // Padding around the text area in the canvas

interface InteractiveLogoProps {
  href: string;
  text: string;
  className?: string;   // Keep for link styling (gradient, etc.) but not for canvas font/color
  fontSize: number;     // e.g., 30 (in pixels)
  fontFamily: string;   // e.g., "'Russo One', sans-serif" - Use the actual font-family string
  color: string;        // e.g., '#FFFFFF', 'rgb(255, 255, 255)' - A single color for particles
}

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  color: string; // Keep color if needed, though using the prop color is simpler
}

const InteractiveLogo = ({
  href,
  text,
  className,
  fontSize,
  fontFamily,
  color,
}: InteractiveLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -10000, y: -10000 }); // Start mouse way off screen

  const initializeParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Optimization hint
    if (!ctx) return;

    // --- 1. Measure Text & Set Canvas Size ---
    ctx.font = `${fontSize}px ${fontFamily}`;
    const textMetrics = ctx.measureText(text);
    const textWidth = Math.ceil(textMetrics.width);
    const textHeight = fontSize; // Approximate height based on font size

    // Adjust canvas size slightly larger than text
    const canvasWidth = textWidth + CANVAS_PADDING * 2;
    const canvasHeight = textHeight + CANVAS_PADDING * 2; // Use fontSize as proxy for height
    canvas.width = canvasWidth * window.devicePixelRatio; // Adjust for screen density
    canvas.height = canvasHeight * window.devicePixelRatio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio); // Scale context

    // --- 2. Draw Text ---
    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Use logical width/height
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top'; // Align to top-left for easier coord calculations
    // Draw text centered within padding
    const textX = CANVAS_PADDING;
    const textY = CANVAS_PADDING; // Adjust if textBaseline changes
    ctx.fillText(text, textX, textY);

    // --- 3. Get Pixel Data ---
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Use physical width/height
    const data = imageData.data;
    particlesRef.current = []; // Clear existing particles

    // --- 4. Create Particles from Pixels ---
    // Iterate with sampling rate to reduce particle count
    for (let y = 0; y < canvas.height; y += SAMPLING_RATE) {
      for (let x = 0; x < canvas.width; x += SAMPLING_RATE) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3]; // Alpha channel

        // Only create particles for visible pixels
        if (alpha > 128) { // Threshold alpha value (0-255)
          const particleColor = `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${alpha / 255})`;

          particlesRef.current.push({
            // Convert canvas pixel coords back to logical coords
            x: x / window.devicePixelRatio,
            y: y / window.devicePixelRatio,
            homeX: x / window.devicePixelRatio,
            homeY: y / window.devicePixelRatio,
            vx: 0,
            vy: 0,
            color: color, // Use the passed 'color' prop for uniform particle color
            // color: particleColor, // Optionally use sampled color from text
          });
        }
      }
    }
     ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the temporary text drawing
     console.log(`Initialized ${particlesRef.current.length} particles.`);

  }, [text, fontSize, fontFamily, color]); // Dependencies for initialization

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = particlesRef.current;
    const mouse = mouseRef.current;
    const canvasWidth = canvas.width / window.devicePixelRatio; // Logical width
    const canvasHeight = canvas.height / window.devicePixelRatio; // Logical height

    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Use logical width/height for clearing

    particles.forEach(p => {
      // --- Interaction ---
      const dxMouse = p.x - mouse.x;
      const dyMouse = p.y - mouse.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      const forceDirectionX = dxMouse / distMouse;
      const forceDirectionY = dyMouse / distMouse;

      // Repulsion from mouse
      if (distMouse < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - distMouse) / MOUSE_RADIUS * REPULSION_STRENGTH;
        p.vx += forceDirectionX * force;
        p.vy += forceDirectionY * force;
      }

      // --- Return Force ---
      const dxHome = p.homeX - p.x;
      const dyHome = p.homeY - p.y;
      // Add force pulling particle back to its home position
      p.vx += dxHome * RETURN_FORCE;
      p.vy += dyHome * RETURN_FORCE;

      // --- Physics ---
      p.vx *= FRICTION; // Apply friction
      p.vy *= FRICTION; // Apply friction
      p.x += p.vx;      // Update position
      p.y += p.vy;      // Update position

      // --- Drawing ---
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - PARTICLE_SIZE / 2, p.y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
    });

    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, []); // No changing dependencies for the animation loop itself

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Convert mouse coords to logical canvas coords
      mouseRef.current.x = (event.clientX - rect.left);
      mouseRef.current.y = (event.clientY - rect.top);
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -10000; // Move mouse way off canvas
      mouseRef.current.y = -10000;
    };

    // Initialize and start animation
    initializeParticles();
    // Prevent starting multiple loops if dependencies change rapidly
    if (animationFrameIdRef.current === null) {
         animationFrameIdRef.current = requestAnimationFrame(animate);
    }


    // Add event listeners
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // --- Cleanup ---
    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null; // Reset ref on cleanup
      }
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
       console.log("Cleaned up InteractiveLogo effect.");
    };
    // Rerun effect if initialization dependencies change
  }, [initializeParticles, animate]);

  return (
    // Container div is important for accurate mouse coordinate calculations relative to the canvas
    <div ref={containerRef} className="relative inline-block align-middle">
      <Link href={href} className={`block ${className || ''}`} aria-label={text}>
        {/* Canvas replaces the text visually */}
        <canvas ref={canvasRef} className="block align-middle"></canvas>
        {/* Keep original text accessible for SEO and screen readers */}
        <span className="sr-only">{text}</span>
      </Link>
    </div>
  );
};

export default InteractiveLogo; 