import { create } from "zustand";
import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/store";

type PlayerState = {
  current: Track | null;
  isPlaying: boolean;
  play: (t: Track) => void;
  toggle: () => void;
  close: () => void;
};

export const usePlayer = create<PlayerState>((set) => ({
  current: null,
  isPlaying: false,
  play: (t) => set({ current: t, isPlaying: true }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  close: () => set({ current: null, isPlaying: false }),
}));

export function Player() {
  const { current, isPlaying, toggle, close } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setProgress(0);
    const el = audioRef.current;
    if (!el || !current) return;
    el.currentTime = 0;
    if (isPlaying) el.play().catch(() => {});
  }, [current?.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [isPlaying]);

  if (!current) return null;
  const hasAudio = !!current.audio;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-[rgba(10,15,28,0.92)] border-t border-gold/30">
      {hasAudio && (
        <audio
          ref={audioRef}
          src={current.audio}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            if (a.duration) setProgress((a.currentTime / a.duration) * 100);
          }}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onEnded={() => { setProgress(0); usePlayer.setState({ isPlaying: false }); }}
        />
      )}
      <div className="container mx-auto max-w-7xl px-6 h-20 flex items-center gap-5">
        <img src={current.cover} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-gold/30" />
        <div className="min-w-0 w-48">
          <p className="font-display text-canvas truncate">{current.title}</p>
          <p className="text-mist/70 text-xs truncate">{current.artist}</p>
        </div>
        <button onClick={toggle} className="h-12 w-12 rounded-full bg-gold text-cobalt grid place-items-center shadow-[0_0_25px_rgba(212,175,55,0.55)] cursor-pointer hover:scale-105 transition">
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-mist/60 text-xs tabular-nums">{fmtSec((progress / 100) * (dur || parseDur(current.duration)))}</span>
          <div className="relative flex-1 h-1.5 rounded-full bg-[rgba(253,251,247,0.1)] overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold-deep rounded-full shadow-[0_0_10px_rgba(212,175,55,0.65)]" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-mist/60 text-xs tabular-nums">{current.duration}</span>
        </div>
        <button onClick={close} className="h-9 w-9 grid place-items-center rounded-full text-mist hover:text-gold hover:bg-gold/10 transition cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function parseDur(s: string) {
  const [m, sec] = s.split(":").map(Number);
  return (m || 0) * 60 + (sec || 0);
}
function fmtSec(total: number) {
  const t = Math.max(0, Math.floor(total));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
