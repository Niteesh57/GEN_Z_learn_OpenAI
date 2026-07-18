import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameLevel } from '../../../types/chat';

interface Props {
  level: GameLevel;
  onWin: () => void;
}

interface Alien {
  id: number;
  x: number;
  y: number;
  label: string;
  order: number;
  width: number;
  alive: boolean;
}

interface Laser {
  id: number;
  x: number;
  y: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  frame: number;
}

interface OrderedItem { order: number; label: string; }

export default function SpaceShooterGame({ level, onWin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const stateRef = useRef({
    rocketX: 400,
    rocketY: 520,
    lasers: [] as Laser[],
    aliens: [] as Alien[],
    explosions: [] as Explosion[],
    health: 3,
    score: 0,
    gameOver: false,
    won: false,
    keys: {} as Record<string, boolean>,
    lastFired: 0,
    laserIdNext: 0,
    explosionIdNext: 0,
    expectedOrder: 1,
  });

  const [health, setHealth] = useState(3);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [currentTarget, setCurrentTarget] = useState('');
  const activeRef = useRef(false);
  const completeRef = useRef(false);
  const completeTimer = useRef<number | null>(null);

  const W = canvasWidth;
  const H = 560;

  const initGame = useCallback(() => {
    if (completeTimer.current) window.clearTimeout(completeTimer.current);
    completeRef.current = false;
    const items = [...(level.items as OrderedItem[] || [])]
      .filter((item) => Number.isFinite(item.order) && typeof item.label === 'string')
      .sort((a, b) => a.order - b.order);
    const FONT_SIZE = 12;
    const PADDING = 14;

    // Measure label widths for alien boxes
    const ctx = canvasRef.current?.getContext('2d');
    
    const aliens: Alien[] = items.map((item, i) => {
      const label = item.label.replace(/\s+/g, ' ').trim().slice(0, 40);
      let labelWidth = label.length * (FONT_SIZE * 0.6) + PADDING * 2;
      if (ctx) {
        ctx.font = `bold ${FONT_SIZE}px monospace`;
        labelWidth = ctx.measureText(label).width + PADDING * 2;
      }
      // Space out aliens in 3 distinct horizontal lanes (lanes 0, 1, 2) and stagger heights to prevent any overlapping
      const lane = i % 3;
      return {
        id: i,
        x: (W / 4) * (lane + 1), // lane 0: 25%, lane 1: 50%, lane 2: 75%
        y: 60 + lane * 70,       // lane 0: 60, lane 1: 130, lane 2: 200
        label,
        order: item.order,
        width: Math.min(Math.max(116, labelWidth), Math.max(116, W * 0.28)),
        alive: true,
      };
    });

    const s = stateRef.current;
    s.aliens = aliens;
    s.lasers = [];
    s.explosions = [];
    s.health = 3;
    s.score = 0;
    s.gameOver = false;
    s.won = false;
    s.rocketX = W / 2;
    s.expectedOrder = items.length > 0 ? (items[0].order || 1) : 1;
    
    setHealth(3);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setCurrentTarget(aliens[0]?.label || '');
  }, [level]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleRevealAnswer = () => {
    const s = stateRef.current;
    if (s.gameOver || s.won) return;

    // Find the correct target alien
    const targetAlien = s.aliens.find(a => a.alive && a.order === s.expectedOrder);
    if (!targetAlien) return;

    // Auto complete this target
    targetAlien.alive = false;
    s.score++;
    s.explosions.push({ id: s.explosionIdNext++, x: targetAlien.x, y: targetAlien.y, frame: 0 });
    setScore(s.score);

    const nextAlien = s.aliens
      .filter(a => a.alive && a.order > s.expectedOrder)
      .sort((a, b) => a.order - b.order)[0];

    if (nextAlien) {
      s.expectedOrder = nextAlien.order;
      setCurrentTarget(nextAlien.label);
    } else {
      if (s.aliens.every(a => !a.alive)) {
        s.won = true;
        setWon(true);
        if (!completeRef.current) {
          completeRef.current = true;
          completeTimer.current = window.setTimeout(onWin, 1200);
        }
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width);
        if (newWidth > 0) {
          setCanvasWidth(newWidth);
        }
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => () => { if (completeTimer.current) window.clearTimeout(completeTimer.current); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      stateRef.current.keys[e.code] = true;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!activeRef.current || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      stateRef.current.keys[e.code] = false;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let lastTime = 0;

    // Star field
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.3 + 0.1,
    }));

    const draw = (ts: number) => {
      const dt = Math.min(ts - lastTime, 50);
      lastTime = ts;
      const s = stateRef.current;

      if (s.gameOver || s.won) {
        raf = requestAnimationFrame(draw);
        return;
      }

      // ── Update ──────────────────────────────────────────────
      // Move stars
      stars.forEach(star => { star.y += star.speed; if (star.y > H) star.y = 0; });

      // Keep rocket within bounds during resize
      s.rocketX = Math.max(30, Math.min(W - 30, s.rocketX));

      // Rocket movement
      const speed = 0.45 * dt;
      if (s.keys['ArrowLeft'] || s.keys['KeyA']) s.rocketX = Math.max(30, s.rocketX - speed);
      if (s.keys['ArrowRight'] || s.keys['KeyD']) s.rocketX = Math.min(W - 30, s.rocketX + speed);

      // Shoot
      if ((s.keys['Space'] || s.keys['ArrowUp']) && ts - s.lastFired > 250) {
        s.lasers.push({ id: s.laserIdNext++, x: s.rocketX, y: s.rocketY - 20 });
        s.lastFired = ts;
      }

      // Move lasers
      s.lasers = s.lasers.filter(l => {
        l.y -= 0.7 * dt;
        return l.y > -10;
      });

      // Alien falling
      s.aliens.forEach(a => {
        const lane = a.id % 3;
        a.x = (W / 4) * (lane + 1); // update position dynamically to support resizes
        const isActive = a.alive && a.order < s.expectedOrder + 3;
        if (isActive) {
          a.y += 0.015 * dt; // Very slowly drift down
        }
      });

      // Collision: laser hits alien
      for (let li = s.lasers.length - 1; li >= 0; li--) {
        const laser = s.lasers[li];
        for (const alien of s.aliens) {
          const isActive = alien.alive && alien.order < s.expectedOrder + 3;
          if (!isActive) continue;
          const hw = alien.width / 2;
          if (
            laser.x > alien.x - hw &&
            laser.x < alien.x + hw &&
            laser.y > alien.y - 20 &&
            laser.y < alien.y + 20
          ) {
            s.lasers.splice(li, 1);
            if (alien.order === s.expectedOrder) {
              // Correct hit!
              alien.alive = false;
              s.score++;
              s.explosions.push({ id: s.explosionIdNext++, x: alien.x, y: alien.y, frame: 0 });
              setScore(s.score);

              const nextAlien = s.aliens
                .filter(a => a.alive && a.order > s.expectedOrder)
                .sort((a, b) => a.order - b.order)[0];

              if (nextAlien) {
                s.expectedOrder = nextAlien.order;
                setCurrentTarget(nextAlien.label);
              } else {
                // All dead!
                if (s.aliens.every(a => !a.alive)) {
                  s.won = true;
                  setWon(true);
                  if (!completeRef.current) {
                    completeRef.current = true;
                    completeTimer.current = window.setTimeout(onWin, 1200);
                  }
                }
              }
            } else {
              // Wrong hit — lose HP
              s.health = Math.max(0, s.health - 1);
              setHealth(s.health);
              if (s.health <= 0) {
                s.gameOver = true;
                setGameOver(true);
              }
            }
            break;
          }
        }
      }

      // Alien reaches bottom → lose HP
      for (const alien of s.aliens) {
        const isActive = alien.alive && alien.order < s.expectedOrder + 3;
        if (isActive && alien.y > H - 60) {
          alien.alive = false;
          alien.y = H + 100; // move off
          s.health = Math.max(0, s.health - 1);
          setHealth(s.health);
          if (s.health <= 0) {
            s.gameOver = true;
            setGameOver(true);
          }
          // skip that alien, pick next target in order
          const nextAlien = s.aliens
            .filter(a => a.alive && a.order > s.expectedOrder)
            .sort((a, b) => a.order - b.order)[0];
          if (nextAlien) {
            s.expectedOrder = nextAlien.order;
            setCurrentTarget(nextAlien.label);
          } else {
            s.gameOver = true;
            setGameOver(true);
            setCurrentTarget('');
          }
        }
      }

      // Update explosions
      s.explosions = s.explosions.filter(e => { e.frame += 0.12 * dt; return e.frame < 10; });

      // ── Draw ──────────────────────────────────────────────
      // Background
      ctx.fillStyle = '#020212';
      ctx.fillRect(0, 0, W, H);

      // Stars
      stars.forEach(star => {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + star.r * 0.3})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground line
      ctx.strokeStyle = '#0a3a0a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - 50);
      ctx.lineTo(W, H - 50);
      ctx.stroke();

      // Aliens
      ctx.font = 'bold 12px monospace';
      s.aliens.forEach(alien => {
        const isActive = alien.alive && alien.order < s.expectedOrder + 3;
        if (!isActive) return;
        const hw = alien.width / 2;
        const isTarget = alien.order === s.expectedOrder;

        // Alien body box
        if (isTarget) {
          ctx.fillStyle = 'rgba(255, 0, 85, 0.18)';
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2;
          // Pulsating glow
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = 'rgba(0, 80, 180, 0.18)';
          ctx.strokeStyle = '#0066ff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.roundRect(alien.x - hw, alien.y - 18, alien.width, 36, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Alien "legs" / pixel art accents
        ctx.strokeStyle = isTarget ? '#ff0055' : '#0066ff';
        ctx.lineWidth = 1;
        for (let leg = 0; leg < 3; leg++) {
          const lx = alien.x - hw + 12 + leg * (hw * 0.6);
          ctx.beginPath();
          ctx.moveTo(lx, alien.y + 18);
          ctx.lineTo(lx - 4, alien.y + 26);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lx, alien.y + 18);
          ctx.lineTo(lx + 4, alien.y + 26);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = isTarget ? '#ff6699' : '#88aaff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayLabel = alien.label.length > 32 ? `${alien.label.slice(0, 31)}…` : alien.label;
        ctx.fillText(displayLabel, alien.x, alien.y);

        // Target indicator arrow
        if (isTarget) {
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.moveTo(alien.x, alien.y - 26);
          ctx.lineTo(alien.x - 6, alien.y - 36);
          ctx.lineTo(alien.x + 6, alien.y - 36);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Explosions
      s.explosions.forEach(exp => {
        const alpha = 1 - exp.frame / 10;
        const radius = exp.frame * 6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Lasers
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#00ffcc';
      s.lasers.forEach(l => {
        ctx.fillRect(l.x - 2, l.y - 10, 4, 18);
      });
      ctx.shadowBlur = 0;

      // Rocket (player)
      const rx = s.rocketX;
      const ry = s.rocketY;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      
      // Rocket body
      ctx.fillStyle = '#00e639';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 22);          // nose
      ctx.lineTo(rx - 14, ry + 10);    // left base
      ctx.lineTo(rx + 14, ry + 10);    // right base
      ctx.closePath();
      ctx.fill();

      // Rocket fins
      ctx.fillStyle = '#00aa44';
      ctx.beginPath();
      ctx.moveTo(rx - 14, ry + 10);
      ctx.lineTo(rx - 22, ry + 20);
      ctx.lineTo(rx - 8, ry + 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rx + 14, ry + 10);
      ctx.lineTo(rx + 22, ry + 20);
      ctx.lineTo(rx + 8, ry + 10);
      ctx.closePath();
      ctx.fill();

      // Exhaust flame (animated)
      const flameH = 8 + Math.sin(ts / 80) * 5;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(rx - 7, ry + 10);
      ctx.lineTo(rx, ry + 10 + flameH);
      ctx.lineTo(rx + 7, ry + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffee00';
      ctx.beginPath();
      ctx.moveTo(rx - 4, ry + 10);
      ctx.lineTo(rx, ry + 10 + flameH * 0.6);
      ctx.lineTo(rx + 4, ry + 10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(ts => { lastTime = ts; raf = requestAnimationFrame(draw); });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onWin, W]);

  const moveRocketToPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || gameOver || won) return;
    stateRef.current.rocketX = Math.max(30, Math.min(W - 30, ((event.clientX - rect.left) / rect.width) * W));
  };

  const fireLaser = () => {
    const s = stateRef.current;
    const now = performance.now();
    if (s.gameOver || s.won || now - s.lastFired < 180) return;
    s.lasers.push({ id: s.laserIdNext++, x: s.rocketX, y: s.rocketY - 20 });
    s.lastFired = now;
  };

  return (
    <div
      className="flex flex-col h-full bg-[#020212] font-mono select-none"
      tabIndex={0}
      style={{ outline: 'none' }}
      role="application"
      aria-label="Space shooter learning game"
      onFocus={() => { activeRef.current = true; }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          activeRef.current = false;
          stateRef.current.keys = {};
        }
      }}
      onPointerDown={(event) => event.currentTarget.focus()}
    >
      {/* HUD */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#050520] border-b border-[#0a0a3a] shrink-0 text-[12px]">
        <div className="flex gap-6 items-center">
          <span className="text-white">HP: {Array(health).fill('❤️').join('')}{Array(Math.max(0, 3 - health)).fill('🖤').join('')}</span>
          <span className="text-[#00e639]">SCORE: {score}</span>
        </div>
        <div className="max-w-[48%] truncate text-[#ffaa00] font-bold text-[13px] tracking-wider">
          TARGET → <span className="text-[#ff6699]" title={currentTarget}>{currentTarget || '—'}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[#444] text-[11px] hidden sm:block">[←][→] MOVE &nbsp; [SPACE] SHOOT</div>
          <button type="button" onClick={handleRevealAnswer} className="text-[11px] text-[#ff0055] opacity-70 hover:opacity-100 font-bold transition-opacity">
            [REVEAL]
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div 
        ref={containerRef}
        onPointerMove={moveRocketToPointer}
        onClick={fireLaser}
        className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center bg-[#020212] w-full touch-none"
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="max-h-full"
          style={{ imageRendering: 'pixelated', display: 'block', width: `${W}px` }}
        />

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="text-[#ff0055] text-[28px] font-bold mb-2 tracking-widest animate-pulse">GAME OVER</div>
            <div className="text-[#888] text-[13px] mb-6">Score: {score}</div>
            <button
              onClick={() => { initGame(); }}
              className="px-8 py-3 border-2 border-[#ff0055] text-[#ff0055] hover:bg-[#ff0055]/20 text-[13px] font-bold tracking-wider transition-colors"
            >
              ↺ RETRY LEVEL
            </button>
          </div>
        )}

        {/* Win overlay */}
        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="text-[#00ff88] text-[28px] font-bold mb-2 tracking-widest">SECTOR CLEARED</div>
            <div className="text-[#888] text-[13px] mb-6">All targets eliminated. Score: {score}</div>
            <button type="button" onClick={onWin} className="border border-[#00ff88] px-7 py-2 text-[12px] font-bold text-[#00ff88]">CONTINUE</button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-[#0a0a3a] px-3 py-2 text-[11px] text-[#88aaff] sm:hidden">
        <button type="button" onClick={() => { stateRef.current.rocketX = Math.max(30, stateRef.current.rocketX - 42); }} className="border border-[#0066ff] px-4 py-2">LEFT</button>
        <button type="button" onClick={fireLaser} className="border border-[#00e639] px-4 py-2">SHOOT</button>
        <button type="button" onClick={() => { stateRef.current.rocketX = Math.min(W - 30, stateRef.current.rocketX + 42); }} className="border border-[#0066ff] px-4 py-2">RIGHT</button>
      </div>
    </div>
  );
}
