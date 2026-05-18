import { useMemo } from "react";

interface Star {
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
}

function StarIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-gold drop-shadow-[0_0_6px_oklch(0.85_0.16_88/0.8)]"
    >
      <path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z" />
    </svg>
  );
}

function NoteIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-gold/70"
    >
      <path d="M9 17V5l10-2v12" />
      <circle cx="6" cy="17" r="3" />
      <circle cx="16" cy="15" r="3" />
    </svg>
  );
}

export function StarField({ density = 40 }: { density?: number }) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: density }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 10 + 6,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
    }));
  }, [density]);

  const notes = useMemo(() => {
    return Array.from({ length: 8 }).map(() => ({
      left: `${Math.random() * 100}%`,
      size: 14 + Math.random() * 14,
      delay: `${Math.random() * 12}s`,
      duration: `${10 + Math.random() * 8}s`,
    }));
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle"
          style={{
            top: s.top,
            left: s.left,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        >
          <StarIcon size={s.size} />
        </span>
      ))}
      {notes.map((n, i) => (
        <span
          key={`n-${i}`}
          className="absolute animate-float-note"
          style={{
            left: n.left,
            bottom: 0,
            animationDelay: n.delay,
            animationDuration: n.duration,
          }}
        >
          <NoteIcon size={n.size} />
        </span>
      ))}
    </div>
  );
}
