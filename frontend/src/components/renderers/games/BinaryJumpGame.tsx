import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameLevel } from '../../../types/chat';
import { useGraphicsEra } from '../../../hooks/useGraphicsEra';

interface Props { level: GameLevel; onWin: () => void; }
type Question = { question: string; platform_label: 'True' | 'False'; correct: boolean };

export default function BinaryJumpGame({ level, onWin }: Props) {
  const era = useGraphicsEra();
  const questions = level.items as Question[];
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'idle' | 'right' | 'wrong'>('idle');
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const current = questions[index];

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  if (!current) return <p className="p-6 text-center font-mono text-sm">This jump round needs new game data.</p>;

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const correctLabel = current.correct ? current.platform_label : current.platform_label === 'True' ? 'False' : 'True';
  const advance = () => {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      setResult('idle');
    } else if (!completedRef.current) {
      completedRef.current = true;
      onWin();
    }
  };
  const choose = (label: 'True' | 'False', assisted = false) => {
    if (result !== 'idle') return;
    clearTimer();
    if (label !== correctLabel) {
      setResult('wrong');
      timerRef.current = window.setTimeout(() => setResult('idle'), 800);
      return;
    }
    if (!assisted) setScore((value) => value + 1);
    setResult('right');
    timerRef.current = window.setTimeout(advance, 700);
  };

  return (
    <div className="flex h-full flex-col items-center gap-7 p-6 font-mono">
      <div className="flex gap-1">{questions.map((_, itemIndex) => <span key={itemIndex} className={`h-3 w-3 rounded-full transition-all ${itemIndex < index ? 'bg-green-400' : itemIndex === index ? 'scale-125 bg-primary-fixed-dim' : 'bg-[#2a2a2a]'}`} />)}</div>
      <div className="flex w-full max-w-lg items-center justify-between gap-3 text-[12px]"><p className="opacity-70">SCORE: {score} / {questions.length}</p><button type="button" onClick={() => choose(correctLabel, true)} disabled={result !== 'idle'} className="text-[11px] font-bold text-[#ff4d85] disabled:opacity-40">[REVEAL ANSWER]</button></div>
      <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`w-full max-w-lg rounded-xl border px-6 py-5 text-center text-[15px] font-bold ${era === '2026s' ? 'border-white/10 bg-white/5 text-white' : era === '2000s' ? 'win95-raised bg-[#efeded] text-[#000080]' : 'border-[#2a2a2a] bg-surface-container text-on-surface'}`}>{current.question}</motion.div>
      <div className="flex w-full max-w-sm gap-6 justify-center">{(['True', 'False'] as const).map((label) => {
        const isCorrect = label === correctLabel;
        const stateClass = result === 'idle' ? (era === '2026s' ? 'border-[#a855f7]/40 bg-[#a855f7]/10 text-[#d8b4fe] hover:bg-[#a855f7]/20' : era === '2000s' ? 'win95-raised text-[#000080] hover:bg-[#e0e0ff]' : 'border-primary-fixed-dim/30 bg-surface-container text-primary-fixed-dim hover:bg-primary-fixed-dim/10') : result === 'right' && isCorrect ? 'border-green-400 bg-green-600/20 text-green-300' : result === 'wrong' && !isCorrect ? 'border-red-400 bg-red-600/20 text-red-300' : 'border-[#2a2a2a] opacity-40';
        return <motion.button key={label} type="button" whileHover={result === 'idle' ? { y: -5, scale: 1.04 } : {}} whileTap={result === 'idle' ? { scale: .96 } : {}} disabled={result !== 'idle'} onClick={() => choose(label)} className={`flex-1 rounded-xl border-2 py-8 text-[16px] font-bold transition-all disabled:cursor-not-allowed ${stateClass}`}>{label.toUpperCase()}</motion.button>;
      })}</div>
      {result !== 'idle' && <motion.p initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} className={`text-[14px] font-bold ${result === 'right' ? 'text-green-400' : 'text-red-400'}`}>{result === 'right' ? 'CORRECT!' : `TRY AGAIN — ${current.question}`}</motion.p>}
      <p className="mt-auto text-center text-[11px] opacity-55">Choose True or False. A wrong jump lets you retry the same statement.</p>
    </div>
  );
}
