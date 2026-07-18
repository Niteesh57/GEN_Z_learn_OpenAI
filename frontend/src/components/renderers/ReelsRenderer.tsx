import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ReelStep } from '../../types/chat';

interface ReelsRendererProps { data: any; }

const TEMPLATE_IDS = Array.from({ length: 30 }, (_, index) => index);
const TEXT_EFFECTS = [
  'typewriter', 'word-blur', 'slide-reveal', 'pop-up', 'cinematic-fade', 'ticker', 'number-counter', 'anagram',
  'terminal-slider', 'letter-burst', 'underline', 'scramble', 'jello', 'shimmer', 'hand-drawn', 'liquid',
] as const;
const REELS_NATURAL_VOICE_NAMES = /Microsoft (Ava|Andrew|Emma|Brian|Jenny|Guy|Aria|Leah|Luke|William Multilingual|Natasha|William) Online \(Natural\)/i;

const shuffle = <T,>(values: T[]): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};

const voiceUserName = (voice?: SpeechSynthesisVoice) => voice?.name
  .replace(/^Microsoft\s+/i, '')
  .replace(/\s+Online\s*\(Natural\).*$/i, '')
  .trim() || 'Narrator';

const assignVoices = (voices: SpeechSynthesisVoice[], count: number) => {
  if (!voices.length) return Array<SpeechSynthesisVoice | undefined>(count).fill(undefined);
  let pool: SpeechSynthesisVoice[] = [];
  return Array.from({ length: count }, () => {
    if (!pool.length) pool = shuffle(voices);
    return pool.pop();
  });
};

export default function ReelsRenderer({ data }: ReelsRendererProps) {
  const title = typeof data?.content?.title === 'string' ? data.content.title : 'Learning Reels';
  const reels = (Array.isArray(data?.content?.reels) ? data.content.reels : []) as ReelStep[];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const narrationRun = useRef(0);
  const templateOrder = useMemo(() => shuffle(TEMPLATE_IDS), []);

  const goTo = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(reels.length - 1, index));
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: safeIndex * feed.clientHeight, behavior: 'smooth' });
    setCurrentIndex(safeIndex);
  }, [reels.length]);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices().filter((voice) => REELS_NATURAL_VOICE_NAMES.test(voice.name));
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const reelVoices = useMemo(() => assignVoices(voices, reels.length), [reels.length, voices]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let settleTimer: number | null = null;
    const handleScroll = () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const nextIndex = Math.round(feed.scrollTop / Math.max(feed.clientHeight, 1));
        setCurrentIndex(Math.max(0, Math.min(reels.length - 1, nextIndex)));
      }, 80);
    };
    feed.addEventListener('scroll', handleScroll, { passive: true });
    return () => { feed.removeEventListener('scroll', handleScroll); if (settleTimer) window.clearTimeout(settleTimer); };
  }, [reels.length]);

  useEffect(() => {
    const reel = reels[currentIndex];
    const run = narrationRun.current + 1;
    narrationRun.current = run;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (!autoPlay || !reel) return;

    const moveNext = () => {
      if (narrationRun.current !== run || currentIndex >= reels.length - 1) return;
      window.setTimeout(() => { if (narrationRun.current === run) goTo(currentIndex + 1); }, 650);
    };
    const beginTimer = window.setTimeout(() => {
      if (narrationRun.current !== run) return;
      const voice = reelVoices[currentIndex];
      if (!voice) {
        window.setTimeout(moveNext, 5200);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(reel.voiceover || `${reel.hook} ${reel.body}`);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 1.02;
      utterance.pitch = 1;
      utterance.onstart = () => { if (narrationRun.current === run) setIsSpeaking(true); };
      utterance.onend = () => { if (narrationRun.current === run) { setIsSpeaking(false); moveNext(); } };
      utterance.onerror = () => { if (narrationRun.current === run) { setIsSpeaking(false); moveNext(); } };
      window.speechSynthesis.speak(utterance);
    }, 900);
    return () => { narrationRun.current += 1; window.clearTimeout(beginTimer); window.speechSynthesis.cancel(); };
  }, [autoPlay, currentIndex, goTo, reelVoices, reels]);

  if (!reels.length) return <div className="reels-empty">No Reel lesson is available yet. Start a new Reels session with a topic.</div>;

  const narratorName = voiceUserName(reelVoices[currentIndex]);

  return <div className="reels-shell">
    <header className="reels-topbar"><div><span className="material-symbols-outlined">smart_display</span><p>KNOWLEDGE REELS</p><strong>{title}</strong></div><div className="reels-controls"><span className={`reels-speaking ${isSpeaking ? 'is-active' : ''}`}><i /><i /><i />{isSpeaking ? `Narrating: ${narratorName}` : autoPlay ? `Next voice: ${narratorName}` : 'Paused'}</span><button type="button" onClick={() => setAutoPlay((value) => !value)}>{autoPlay ? <span className="material-symbols-outlined">pause</span> : <span className="material-symbols-outlined">play_arrow</span>}{autoPlay ? 'Pause' : 'Play'}</button></div></header>
    <div className="reels-stage">
      <aside className="reels-progress" aria-label="Reel progress">{reels.map((reel, index) => <button type="button" key={reel.step} onClick={() => goTo(index)} aria-label={`Go to reel ${reel.step}`} className={index === currentIndex ? 'is-active' : index < currentIndex ? 'is-seen' : ''}>{String(reel.step).padStart(2, '0')}</button>)}</aside>
      <div ref={feedRef} className="reels-feed">{reels.map((reel, index) => {
        const template = templateOrder[index % templateOrder.length];
        const textEffect = TEXT_EFFECTS[template % TEXT_EFFECTS.length];
        const titleWords = reel.title.split(/\s+/).filter(Boolean);
        const useWordAnimation = textEffect === 'word-blur' || textEffect === 'pop-up';
        return <section key={reel.step} className={`reel-slide ${index === currentIndex ? 'is-active' : ''}`}><motion.article initial={{ opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ amount: .55, once: false }} transition={{ type: 'spring', stiffness: 220, damping: 25 }} className={`reel-card reel-template-${template} reel-motion-${textEffect}`}>
          <span className="reel-orb reel-orb-a" /><span className="reel-orb reel-orb-b" /><span className="reel-grid" />
          <header><span>STEP <b className="reel-step-number">{String(reel.step).padStart(2, '0')}</b></span><span className="material-symbols-outlined">volume_up</span></header>
          <div className="reel-copy"><p className="reel-hook">{reel.hook}</p><h2 className="reel-title" data-title={reel.title}>{useWordAnimation ? titleWords.map((word, wordIndex) => <span key={`${word}-${wordIndex}`} className="reel-title-word" style={{ animationDelay: `${wordIndex * 80}ms` }}>{word}{wordIndex < titleWords.length - 1 ? ' ' : ''}</span>) : reel.title}</h2><p className="reel-body">{reel.body}</p></div>
          <footer><span className="material-symbols-outlined">lightbulb</span><p>{reel.takeaway}</p><span className="reel-narrator"><span className="material-symbols-outlined">record_voice_over</span>{voiceUserName(reelVoices[index])}</span></footer>
          <div className="reel-template-mark">{String(template + 1).padStart(2, '0')}</div>
        </motion.article></section>;
      })}</div>
      <div className="reels-side-actions"><button type="button" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} aria-label="Previous reel"><span className="material-symbols-outlined">keyboard_arrow_up</span></button><strong>{currentIndex + 1}<small>/{reels.length}</small></strong><button type="button" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === reels.length - 1} aria-label="Next reel"><span className="material-symbols-outlined">keyboard_arrow_down</span></button></div>
    </div>
    <footer className="reels-footer">Swipe or scroll through the series. Each Reel adds one new step to the lesson.</footer>
  </div>;
}
