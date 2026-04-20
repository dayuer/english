import React, { useEffect, useRef, useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { colors } from '../../theme';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  highlight: boolean;
}

interface NeuralCanvasProps {
  width: number;
  height: number;
  particleCount?: number;
  connectionDistance?: number;
}

export function NeuralCanvas({
  width,
  height,
  particleCount = 25,
  connectionDistance = 100,
}: NeuralCanvasProps) {
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const [frame, setFrame] = useState(0);

  // Initialize particles once
  useEffect(() => {
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      r: Math.random() * 2 + 1,
      highlight: i < 4,
    }));

    let lastTime = 0;
    const animate = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const dt = Math.min((time - lastTime) / 16, 3); // normalize to ~60fps, cap at 3x
      lastTime = time;

      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0 || p.x > width) { p.vx *= -1; p.x = Math.max(0, Math.min(width, p.x)); }
        if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = Math.max(0, Math.min(height, p.y)); }
      }

      setFrame((f) => (f + 1) % 10000);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, particleCount]);

  const particles = particlesRef.current;

  // Build connections
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < connectionDistance) {
        const both = a.highlight && b.highlight;
        const alpha = (1 - dist / connectionDistance) * (both ? 0.4 : 0.08);
        lines.push(
          <Line
            key={`l-${i}-${j}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={both ? colors.primary : colors.outlineVariant}
            strokeOpacity={alpha}
            strokeWidth={both ? 1.5 : 0.5}
          />
        );
      }
    }
  }

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <G>
        {lines}
        {particles.map((p, i) => (
          <Circle
            key={`n-${i}`}
            cx={p.x} cy={p.y} r={p.r}
            fill={p.highlight ? colors.primary : colors.outlineVariant}
            fillOpacity={p.highlight ? 0.8 : 1}
          />
        ))}
      </G>
    </Svg>
  );
}
