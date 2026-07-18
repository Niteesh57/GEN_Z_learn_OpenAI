import { useEffect, useRef, useState } from 'react';
import type { GameLevel } from '../../../types/chat';
import { shuffle } from './gameData';

interface Props { level: GameLevel; onWin: () => void; }
type Card = { id: number; content: string; pairId: number; isTerm: boolean };

export default function MemoryFlipGame({ level, onWin }: Props) {
  const pairs = level.items as { term: string; definition: string }[];
  const [cards] = useState<Card[]>(() => shuffle(pairs.flatMap((pair, index) => [
    { id: index * 2, content: pair.term, pairId: index, isTerm: true },
    { id: index * 2 + 1, content: pair.definition, pairId: index, isTerm: false },
  ])));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [moves, setMoves] = useState(0);
  const completeTimer = useRef<number | null>(null);
  const wonRef = useRef(false);

  const finishIfComplete = (next: number[]) => {
    if (!wonRef.current && next.length === cards.length) {
      wonRef.current = true;
      window.setTimeout(onWin, 500);
    }
  };

  const resolvePair = (first: Card, second: Card, delay: number) => {
    setChecking(true);
    completeTimer.current = window.setTimeout(() => {
      if (first.pairId === second.pairId && first.isTerm !== second.isTerm) {
        setMatched((previous) => {
          const next = Array.from(new Set([...previous, first.id, second.id]));
          finishIfComplete(next);
          return next;
        });
      }
      setFlipped([]);
      setChecking(false);
      completeTimer.current = null;
    }, delay);
  };

  useEffect(() => () => { if (completeTimer.current) window.clearTimeout(completeTimer.current); }, []);

  const handleFlip = (id: number) => {
    if (checking || flipped.includes(id) || matched.includes(id)) return;
    const next = [...flipped, id];
    setFlipped(next);
    if (next.length === 2) {
      const first = cards.find((card) => card.id === next[0]);
      const second = cards.find((card) => card.id === next[1]);
      if (!first || !second) return;
      setMoves((value) => value + 1);
      resolvePair(first, second, 750);
    }
  };

  const revealPair = () => {
    if (checking || wonRef.current) return;
    const first = cards.find((card) => !matched.includes(card.id));
    const second = first && cards.find((card) => card.pairId === first.pairId && card.id !== first.id);
    if (!first || !second) return;
    setMoves((value) => value + 1);
    setFlipped([first.id, second.id]);
    resolvePair(first, second, 1100);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]"><div className="flex gap-4"><span>PAIRS: <b>{matched.length / 2}</b> / {pairs.length}</span><span>MOVES: {moves}</span></div><button type="button" onClick={revealPair} disabled={checking || wonRef.current} className="text-[11px] text-primary-fixed-dim disabled:opacity-40">[SHOW A PAIR]</button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => {
          const visible = flipped.includes(card.id) || matched.includes(card.id);
          const complete = matched.includes(card.id);
          return <button key={card.id} type="button" disabled={checking || complete} onClick={() => handleFlip(card.id)} aria-label={visible ? card.content : 'Hidden memory card'} className="relative aspect-[3/2] min-h-20 rounded-lg text-center text-[11px] font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-default">
            <span className={`absolute inset-0 flex items-center justify-center rounded-lg border p-2 ${visible ? complete ? 'border-green-400 bg-green-900/20 text-green-200' : 'border-primary-fixed-dim bg-primary-fixed-dim/15 text-primary-fixed-dim' : 'border-[#2a2a2a] bg-surface-container text-[22px] text-primary-fixed-dim'}`}>{visible ? card.content : '?'}</span>
          </button>;
        })}
      </div>
      <p className="mt-auto text-center text-[11px] opacity-65">Match each term to its definition. The board supports mouse, touch, and keyboard play.</p>
    </div>
  );
}
