import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameLevel } from '../../../types/chat';
import { shuffle } from './gameData';

interface Props { level: GameLevel; onWin: () => void; }
type Step = { order: number; label: string };

export default function SequenceSortGame({ level, onWin }: Props) {
  const ordered = [...(level.items as Step[])].sort((a, b) => a.order - b.order);
  const [bank, setBank] = useState<Step[]>(() => shuffle(ordered));
  const [placed, setPlaced] = useState<Step[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const feedbackTimer = useRef<number | null>(null);
  const completedRef = useRef(false);

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setWon(true);
    window.setTimeout(onWin, 650);
  };

  const addToSequence = (item: Step) => {
    if (won) return;
    const expected = ordered[placed.length];
    if (!expected) return;
    if (item.order !== expected.order) {
      setWrong(item.order);
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setWrong(null), 650);
      return;
    }
    const next = [...placed, item];
    setPlaced(next);
    setBank((previous) => previous.filter((entry) => entry.order !== item.order));
    if (next.length === ordered.length) complete();
  };

  const undoLast = (item: Step) => {
    if (won || placed[placed.length - 1]?.order !== item.order) return;
    setPlaced((previous) => previous.slice(0, -1));
    setBank((previous) => shuffle([...previous, item]));
  };

  const revealNext = () => {
    if (won) return;
    const expected = ordered[placed.length];
    const candidate = expected && bank.find((item) => item.order === expected.order);
    if (candidate) addToSequence(candidate);
  };

  return (
    <div className="flex h-full flex-col gap-5 p-4 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]"><p className="opacity-75">Tap each step in the correct order.</p><button type="button" onClick={revealNext} disabled={won} className="text-[11px] text-primary-fixed-dim disabled:opacity-40">[PLACE NEXT STEP]</button></div>
      <div className="flex flex-col gap-2">
        {ordered.map((slot, index) => {
          const placedItem = placed[index];
          const canUndo = placedItem && index === placed.length - 1 && !won;
          return <motion.button key={slot.order} type="button" disabled={!canUndo} onClick={() => placedItem && undoLast(placedItem)} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className={`flex items-center gap-3 rounded border px-4 py-2.5 text-left text-[13px] transition-all ${placedItem ? 'border-primary-fixed-dim bg-primary-fixed-dim/10 text-primary-fixed-dim' : 'border-[#2a2a2a] bg-black/10 text-on-surface-variant'} ${canUndo ? 'cursor-pointer hover:bg-primary-fixed-dim/20' : ''}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${placedItem ? 'bg-primary-fixed-dim text-on-primary' : 'bg-[#1a1a1a]'}`}>{index + 1}</span><span className="flex-1">{placedItem?.label ?? '— choose a step below —'}</span>{canUndo && <span className="text-[10px] opacity-70">tap to undo</span>}</motion.button>;
        })}
      </div>
      <div className="border-t border-[#2a2a2a] pt-4"><p className="mb-2 text-center text-[10px] opacity-55">STEP BANK</p><div className="flex flex-wrap justify-center gap-2"><AnimatePresence>{bank.map((item) => <motion.button key={item.order} type="button" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: wrong === item.order ? [1, .35, 1] : 1, scale: wrong === item.order ? [.98, 1.03, 1] : 1 }} exit={{ opacity: 0, scale: .9 }} onClick={() => addToSequence(item)} className={`rounded border px-4 py-2 text-[12px] font-bold transition-colors ${wrong === item.order ? 'border-red-500 bg-red-900/20 text-red-300' : 'border-primary-fixed-dim bg-primary-fixed-dim/10 text-primary-fixed-dim hover:bg-primary-fixed-dim/20'}`}>{item.label}</motion.button>)}</AnimatePresence></div></div>
      {won && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[14px] font-bold text-green-400">SEQUENCE COMPLETE</motion.p>}
      <p className="text-center text-[11px] opacity-60">You can undo only the latest choice, so the sequence always stays solvable.</p>
    </div>
  );
}
