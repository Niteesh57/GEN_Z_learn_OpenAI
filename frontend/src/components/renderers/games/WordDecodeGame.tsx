import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameLevel } from '../../../types/chat';
import { useGraphicsEra } from '../../../hooks/useGraphicsEra';
import { clampTime } from './gameData';

interface Props { level: GameLevel; onWin: () => void; }
type Word = { answer: string; clues: string[] };
type Phase = 'idle' | 'correct' | 'incorrect' | 'timed-out' | 'revealed';

const normalise = (value: string) => value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export default function WordDecodeGame({ level, onWin }: Props) {
  const era = useGraphicsEra();
  const items = level.items as Word[];
  const roundTime = clampTime(level.time_limit_seconds);
  const [itemIndex, setItemIndex] = useState(0);
  const [clueIndex, setClueIndex] = useState(0);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundTime);
  const transitionTimer = useRef<number | null>(null);
  const completeRef = useRef(false);
  const current = items[itemIndex];

  useEffect(() => () => {
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
  }, []);

  useEffect(() => {
    if (phase !== 'idle') return;
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          setPhase('timed-out');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [itemIndex, phase]);

  if (!current) return <p className="p-6 text-center font-mono text-sm">This word round needs new game data.</p>;

  const clearTransition = () => {
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
  };

  const nextWord = () => {
    clearTransition();
    if (itemIndex >= items.length - 1) {
      if (!completeRef.current) {
        completeRef.current = true;
        onWin();
      }
      return;
    }
    setItemIndex((index) => index + 1);
    setClueIndex(0);
    setInput('');
    setTimeLeft(roundTime);
    setPhase('idle');
  };

  const scheduleNext = () => {
    clearTransition();
    transitionTimer.current = window.setTimeout(nextWord, 900);
  };

  const retry = () => {
    clearTransition();
    setInput('');
    setClueIndex(0);
    setTimeLeft(roundTime);
    setPhase('idle');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== 'idle' || !normalise(input)) return;
    if (normalise(input) === normalise(current.answer)) {
      setScore((total) => total + Math.max(1, current.clues.length - clueIndex));
      setPhase('correct');
      scheduleNext();
      return;
    }
    setPhase('incorrect');
    clearTransition();
    transitionTimer.current = window.setTimeout(() => setPhase('idle'), 650);
  };

  const revealAnswer = () => {
    if (phase !== 'idle') return;
    setInput(current.answer);
    setPhase('revealed');
    scheduleNext();
  };

  const scrambled = phase === 'revealed'
    ? current.answer
    : current.answer.split('').map((character, index) => (
      character === ' ' || index % 3 === 1 ? character : '_'
    )).join('');
  const locked = phase !== 'idle';
  const status = phase === 'correct' ? 'Correct — next word loading.'
    : phase === 'incorrect' ? 'Not quite. Check the clues and try again.'
    : phase === 'timed-out' ? 'Time is up. Retry this word or reveal it.'
    : phase === 'revealed' ? `Answer: ${current.answer}` : null;

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col gap-5 p-6 font-mono">
      <div className="flex flex-wrap justify-between gap-2 text-[12px]">
        <span>WORD <b>{itemIndex + 1}</b> / {items.length}</span>
        <span>SCORE: {score}</span>
        <span className={timeLeft <= 10 ? 'font-bold text-red-400' : ''}>TIME: {timeLeft}s</span>
      </div>
      <div className={`break-all rounded-xl border py-4 text-center text-[clamp(1.2rem,4vw,1.75rem)] font-bold tracking-[0.24em] ${
        era === '2026s' ? 'border-[#a855f7]/30 bg-[#a855f7]/10 text-[#d8b4fe]' :
        era === '2000s' ? 'border-[#000080] bg-[#e0e0ff] text-[#000080]' :
        'border-primary-fixed-dim/30 bg-surface-container text-primary-fixed-dim'
      }`}>{scrambled}</div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-55">Clues</p>
        {current.clues.slice(0, clueIndex + 1).map((clue, index) => <motion.p key={`${clue}-${index}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-[13px]"><span className="font-bold text-primary-fixed-dim">#{index + 1}</span>{clue}</motion.p>)}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your answer…" autoComplete="off" autoFocus disabled={locked} className={`min-w-0 flex-1 rounded border px-4 py-2.5 font-mono text-[14px] outline-none transition-colors ${
          phase === 'correct' ? 'border-green-400 bg-green-900/10 text-green-300' :
          phase === 'incorrect' || phase === 'timed-out' ? 'border-red-400 bg-red-900/10 text-red-200' :
          era === '2000s' ? 'win95-sunken-field bg-white text-black' : 'border-[#2a2a2a] bg-black/20 text-on-surface focus:border-primary-fixed-dim'
        }`} />
        <button type="submit" disabled={locked || !input.trim()} className="rounded border border-primary-fixed-dim px-4 py-2 text-[12px] font-bold text-primary-fixed-dim transition-colors hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-40">SUBMIT</button>
      </form>
      {status && <p className={`text-center text-[12px] font-bold ${phase === 'correct' ? 'text-green-400' : phase === 'incorrect' || phase === 'timed-out' ? 'text-red-300' : 'text-primary-fixed-dim'}`}>{status}</p>}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px]">
        {phase === 'idle' && clueIndex < current.clues.length - 1 && <button type="button" onClick={() => setClueIndex((index) => index + 1)} className="opacity-70 underline hover:opacity-100">Reveal another clue</button>}
        {phase === 'timed-out' && <button type="button" onClick={retry} className="font-bold text-primary-fixed-dim underline">TRY AGAIN</button>}
        {(phase === 'idle' || phase === 'timed-out') && <button type="button" onClick={revealAnswer} className="font-bold text-[#ff4d85] hover:opacity-80">[REVEAL ANSWER]</button>}
      </div>
      <p className="mt-auto text-center text-[11px] opacity-55">Use the clues to decode the term. Punctuation and letter case do not affect an answer.</p>
    </div>
  );
}
