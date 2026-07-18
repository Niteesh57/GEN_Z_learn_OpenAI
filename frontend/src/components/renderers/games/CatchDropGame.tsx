import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameLevel } from '../../../types/chat';
import { clampTime } from './gameData';

interface Props { level: GameLevel; onWin: () => void; }

interface FallingItem {
  id: number;
  label: string;
  correct: boolean;
  x: number;
  y: number;
  speed: number;
}

const MAX_STRIKES = 3;
const MAX_HINTS = 2;

export default function CatchDropGame({ level, onWin }: Props) {
  const pool = level.items as { label: string; correct: boolean }[];
  const target = Math.min(level.win_score, pool.filter((item) => item.correct).length);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [catcherX, setCatcherX] = useState(50);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [timeLeft, setTimeLeft] = useState(clampTime(level.time_limit_seconds));
  const [hints, setHints] = useState(0);
  const nextId = useRef(0);
  const frameRef = useRef(0);
  const lastSpawn = useRef(0);
  const lastFrame = useRef(0);
  const catcherXRef = useRef(50);
  const scoreRef = useRef(0);
  const strikesRef = useRef(0);
  const processedRef = useRef(new Set<number>());
  const containerRef = useRef<HTMLDivElement>(null);

  const moveCatcher = useCallback((value: number) => {
    const next = Math.max(8, Math.min(92, value));
    catcherXRef.current = next;
    setCatcherX(next);
  }, []);

  const addScore = useCallback((amount: number) => {
    scoreRef.current = Math.min(target, scoreRef.current + amount);
    setScore(scoreRef.current);
    if (scoreRef.current >= target) setWon(true);
  }, [target]);

  const addStrike = useCallback((amount = 1) => {
    strikesRef.current = Math.min(MAX_STRIKES, strikesRef.current + amount);
    setStrikes(strikesRef.current);
    if (strikesRef.current >= MAX_STRIKES) setGameOver(true);
  }, []);

  const spawnItem = useCallback(() => {
    const source = pool[Math.floor(Math.random() * pool.length)];
    if (!source) return;
    setItems((previous) => [...previous, {
      id: nextId.current++, label: source.label, correct: source.correct,
      x: Math.random() * 80 + 10, y: -6, speed: 12 + Math.random() * 8,
    }]);
  }, [pool]);

  useEffect(() => {
    if (won || gameOver) return;
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          setGameOver(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameOver, won]);

  useEffect(() => {
    if (won || gameOver) return;
    const loop = (timestamp: number) => {
      const elapsed = lastFrame.current ? Math.min(timestamp - lastFrame.current, 50) : 16;
      lastFrame.current = timestamp;
      if (timestamp - lastSpawn.current > 900) {
        spawnItem();
        lastSpawn.current = timestamp;
      }
      setItems((previous) => {
        if (previous.length === 0) return previous;
        let changed = false;
        const next: FallingItem[] = [];
        previous.forEach((item) => {
          const moved = { ...item, y: item.y + item.speed * (elapsed / 1000) };
          const caught = moved.y >= 82 && moved.y <= 93 && Math.abs(moved.x - catcherXRef.current) < 12;
          if (caught) {
            changed = true;
            if (!processedRef.current.has(moved.id)) {
              processedRef.current.add(moved.id);
              if (moved.correct) addScore(1);
              else addStrike();
            }
            return;
          }
          if (moved.y > 102) {
            changed = true;
            if (!processedRef.current.has(moved.id)) {
              processedRef.current.add(moved.id);
              if (moved.correct) addStrike();
            }
            return;
          }
          next.push(moved);
        });
        return changed || next.length !== previous.length ? next : next;
      });
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [addScore, addStrike, gameOver, spawnItem, won]);

  const reset = () => {
    nextId.current = 0;
    lastSpawn.current = 0;
    lastFrame.current = 0;
    scoreRef.current = 0;
    strikesRef.current = 0;
    processedRef.current.clear();
    setScore(0); setStrikes(0); setItems([]); setHints(0); setWon(false); setGameOver(false);
    setTimeLeft(clampTime(level.time_limit_seconds));
    moveCatcher(50);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    moveCatcher(((event.clientX - rect.left) / rect.width) * 100);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      event.preventDefault(); moveCatcher(catcherXRef.current - 7);
    }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      event.preventDefault(); moveCatcher(catcherXRef.current + 7);
    }
  };

  const useHint = () => {
    if (won || gameOver || hints >= MAX_HINTS) return;
    setHints((value) => value + 1);
    setItems((previous) => [...previous, {
      id: nextId.current++, label: 'HINT: correct item', correct: true,
      x: catcherXRef.current, y: 78, speed: 4,
    }]);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex flex-wrap gap-4"><span>SCORE: <b>{score}</b> / {target}</span><span>TIME: {timeLeft}s</span><span>STRIKES: {strikes}/{MAX_STRIKES}</span></div>
        <button type="button" onClick={useHint} disabled={won || gameOver || hints >= MAX_HINTS} className="text-[11px] text-primary-fixed-dim disabled:opacity-40">[HINT {MAX_HINTS - hints}]</button>
      </div>
      <div ref={containerRef} tabIndex={0} role="application" aria-label="Catch correct answers" onPointerDown={(event) => event.currentTarget.focus()} onPointerMove={handlePointerMove} onKeyDown={handleKeyDown} className="relative h-[420px] w-full select-none overflow-hidden border border-[#1a1a1a] bg-black cursor-crosshair">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 25%, var(--game-wash), transparent 48%)' }} />
        {items.map((item) => <div key={item.id} className={`absolute max-w-[42%] rounded border px-3 py-1 text-center text-[12px] font-bold ${item.correct ? 'border-primary-fixed-dim bg-primary-fixed-dim/10 text-primary-fixed-dim' : 'border-red-500 bg-red-900/20 text-red-300'}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)' }}>{item.label}</div>)}
        <div className="absolute bottom-[8%] h-3 w-[22%] rounded-full" style={{ left: `${catcherX}%`, transform: 'translateX(-50%)', background: 'var(--game-accent)', boxShadow: '0 0 14px var(--game-accent)' }} />
        {(won || gameOver) && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center"><p className="mb-2 text-[24px] font-bold">{won ? 'ROUND CLEARED' : 'ROUND OVER'}</p><p className="mb-5 text-[13px] text-white/70">{won ? 'Great catching.' : `Score: ${score}/${target}`}</p>{won ? <button type="button" onClick={onWin} className="border border-primary-fixed-dim px-6 py-2 font-bold text-primary-fixed-dim">REVEAL CONCEPT →</button> : <button type="button" onClick={reset} className="border border-red-400 px-6 py-2 font-bold text-red-300">TRY AGAIN</button>}</div>}
      </div>
      <p className="text-center text-[11px] opacity-65">Move with your pointer or A/D and arrow keys. Catch correct answers; avoid decoys and missed answers.</p>
    </div>
  );
}
