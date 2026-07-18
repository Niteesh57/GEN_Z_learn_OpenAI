import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameLevel } from '../../../types/chat';
import { useGraphicsEra } from '../../../hooks/useGraphicsEra';
import { shuffle } from './gameData';

interface Props { level: GameLevel; onWin: () => void; }
type Choice = { choice_label: string; is_correct_path: boolean; explanation: string };
type Gate = { correct: Choice; options: Choice[] };

export default function MazeEscapeGame({ level, onWin }: Props) {
  const era = useGraphicsEra();
  const choices = level.items as Choice[];
  const gates = useMemo<Gate[]>(() => {
    const correct = choices.filter((choice) => choice.is_correct_path).slice(0, 4);
    const decoys = choices.filter((choice) => !choice.is_correct_path);
    return correct.map((answer, index) => ({ correct: answer, options: shuffle([answer, ...decoys.slice(index % Math.max(1, decoys.length), (index % Math.max(1, decoys.length)) + 2)]) }));
  }, [choices]);
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'right' | 'wrong'; text: string } | null>(null);
  const [won, setWon] = useState(false);
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const gate = gates[step];

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  if (!gate) return <p className="p-6 text-center font-mono text-sm">This maze round needs new game data.</p>;
  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setWon(true);
    timerRef.current = window.setTimeout(onWin, 800);
  };
  const choose = (choice: Choice) => {
    if (feedback || won) return;
    if (!choice.is_correct_path) {
      setFeedback({ type: 'wrong', text: choice.explanation || 'That path leads to a dead end.' });
      timerRef.current = window.setTimeout(() => setFeedback(null), 900);
      return;
    }
    setPath((previous) => [...previous, choice.explanation]);
    setFeedback({ type: 'right', text: choice.explanation });
    timerRef.current = window.setTimeout(() => {
      if (step + 1 >= gates.length) finish();
      else { setStep((value) => value + 1); setFeedback(null); }
    }, 600);
  };

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col gap-5 p-6 font-mono">
      <div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1">{gates.map((_, index) => <span key={index} className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${index < step ? 'bg-green-400 text-black' : index === step ? 'bg-primary-fixed-dim text-on-primary' : 'bg-[#2a2a2a]'}`}>{index < step ? '✓' : index + 1}</span>)}</div><span className="ml-1 text-[11px] opacity-60">GATE {step + 1} OF {gates.length}</span><button type="button" onClick={() => choose(gate.correct)} disabled={Boolean(feedback) || won} className="ml-auto text-[11px] font-bold text-[#ff4d85] disabled:opacity-40">[REVEAL PATH]</button></div>
      <div className={`relative rounded-xl border p-5 ${era === '2026s' ? 'border-white/10 bg-[#0b0615]' : era === '2000s' ? 'win95-sunken bg-white' : 'border-[#1a1a1a] bg-black/30'}`}>
        <p className="mb-4 text-center text-[10px] uppercase tracking-widest opacity-60">Choose the safe route</p>
        <div className="flex flex-wrap justify-center gap-3">{gate.options.map((choice) => <motion.button key={choice.choice_label} type="button" whileHover={!feedback ? { scale: 1.03 } : {}} whileTap={!feedback ? { scale: .97 } : {}} disabled={Boolean(feedback) || won} onClick={() => choose(choice)} className={`min-w-[130px] flex-1 rounded-lg border px-4 py-5 text-[13px] font-bold transition-all disabled:cursor-not-allowed ${feedback?.type === 'wrong' && !choice.is_correct_path ? 'border-red-500 bg-red-900/20 text-red-300' : era === '2026s' ? 'border-[#a855f7]/30 bg-[#a855f7]/5 text-[#d8b4fe] hover:bg-[#a855f7]/15' : era === '2000s' ? 'win95-raised text-[#000080] hover:bg-[#e0e0ff]' : 'border-[#2a2a2a] text-on-surface hover:border-primary-fixed-dim hover:text-primary-fixed-dim'}`}>{choice.choice_label}</motion.button>)}</div>
      </div>
      {feedback && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center text-[12px] font-bold ${feedback.type === 'right' ? 'text-green-400' : 'text-red-300'}`}>{feedback.type === 'right' ? 'SAFE ROUTE: ' : 'DEAD END: '}{feedback.text}</motion.p>}
      {path.length > 0 && <div className="space-y-1"><p className="text-[10px] uppercase tracking-widest opacity-55">Safe route</p>{path.map((entry, index) => <p key={`${entry}-${index}`} className="text-[12px] text-green-400">✓ {entry}</p>)}</div>}
      {won && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[14px] font-bold text-green-400">MAZE ESCAPED!</motion.p>}
      <p className="mt-auto text-center text-[11px] opacity-55">Wrong paths explain why they fail; they never reset your progress.</p>
    </div>
  );
}
