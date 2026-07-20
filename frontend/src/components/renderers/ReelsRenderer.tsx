import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ReelStep } from '../../types/chat';
import { createReelNarration } from '../../services/api';

interface ReelsRendererProps { data: any; }

const TEMPLATE_IDS = Array.from({ length: 30 }, (_, index) => index);
const TEXT_EFFECTS = [
  'typewriter', 'word-blur', 'slide-reveal', 'pop-up', 'cinematic-fade', 'ticker', 'number-counter', 'anagram',
  'terminal-slider', 'letter-burst', 'underline', 'scramble', 'jello', 'shimmer', 'hand-drawn', 'liquid',
] as const;
const REELS_NATURAL_VOICE_NAMES = /Microsoft (Ava|Andrew|Emma|Brian|Jenny|Guy|Aria|Leah|Luke|William Multilingual|Natasha|William) Online \(Natural\)/i;

interface ReelVoiceProfile {
  id: string;
  name: string;
  browserPattern: RegExp;
}

interface ReelNarrator extends ReelVoiceProfile {
  browserVoice?: SpeechSynthesisVoice;
}

// The names are real speaker names, not the regular-expression alternatives.
// The browser voice is used when it is available; otherwise the same named
// Microsoft Natural voice is requested from the app's narration endpoint.
const REEL_VOICE_PROFILES: ReelVoiceProfile[] = [
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava', browserPattern: /Microsoft Ava Online \(Natural\)/i },
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew', browserPattern: /Microsoft Andrew Online \(Natural\)/i },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma', browserPattern: /Microsoft Emma Online \(Natural\)/i },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian', browserPattern: /Microsoft Brian Online \(Natural\)/i },
  { id: 'en-US-JennyNeural', name: 'Jenny', browserPattern: /Microsoft Jenny Online \(Natural\)/i },
  { id: 'en-US-GuyNeural', name: 'Guy', browserPattern: /Microsoft Guy Online \(Natural\)/i },
  { id: 'en-US-AriaNeural', name: 'Aria', browserPattern: /Microsoft Aria Online \(Natural\)/i },
  { id: 'en-ZA-LeahNeural', name: 'Leah', browserPattern: /Microsoft Leah Online \(Natural\)/i },
  { id: 'en-ZA-LukeNeural', name: 'Luke', browserPattern: /Microsoft Luke Online \(Natural\)/i },
  { id: 'en-AU-WilliamMultilingualNeural', name: 'William Multilingual', browserPattern: /Microsoft William Multilingual Online \(Natural\)/i },
  { id: 'en-AU-NatashaNeural', name: 'Natasha', browserPattern: /Microsoft Natasha Online \(Natural\)/i },
  // Microsoft currently exposes the Australian William cloud voice as the
  // Multilingual variant.  It remains the fallback for the "William" profile.
  { id: 'en-AU-WilliamMultilingualNeural', name: 'William', browserPattern: /Microsoft William Online \(Natural\)/i },
];

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

const narratorName = (narrator?: ReelNarrator) => narrator?.browserVoice
  ? voiceUserName(narrator.browserVoice)
  : narrator?.name || 'Narrator';

const assignVoices = (voices: SpeechSynthesisVoice[], count: number) => {
  const narrators = REEL_VOICE_PROFILES.map((profile) => ({
    ...profile,
    browserVoice: voices.find((voice) => profile.browserPattern.test(voice.name)),
  }));
  let pool: ReelNarrator[] = [];
  return Array.from({ length: count }, () => {
    if (!pool.length) pool = shuffle(narrators);
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
  const [isPreparingNarration, setIsPreparingNarration] = useState(false);
  const [narrationError, setNarrationError] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    const synth = window.speechSynthesis;
    if (!synth) return undefined;

    let retryTimer: number | undefined;
    let attempts = 0;
    const loadVoices = () => {
      const available = synth.getVoices();
      const naturalVoices = available.filter((voice) => typeof voice.name === 'string' && REELS_NATURAL_VOICE_NAMES.test(voice.name));
      setVoices((previous) => {
        const previousIds = previous.map((voice) => `${voice.voiceURI}:${voice.name}`).join('|');
        const nextIds = naturalVoices.map((voice) => `${voice.voiceURI}:${voice.name}`).join('|');
        return previousIds === nextIds ? previous : naturalVoices;
      });

      if (naturalVoices.length && retryTimer !== undefined) {
        window.clearInterval(retryTimer);
        retryTimer = undefined;
      }
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    // Browsers do not all fire onvoiceschanged on first load, so retry briefly.
    retryTimer = window.setInterval(() => {
      attempts += 1;
      loadVoices();
      if (attempts >= 12 && retryTimer !== undefined) {
        window.clearInterval(retryTimer);
        retryTimer = undefined;
      }
    }, 500);
    return () => {
      if (retryTimer !== undefined) window.clearInterval(retryTimer);
      synth.onvoiceschanged = null;
      synth.cancel();
    };
  }, []);

  const reelNarrators = useMemo(() => assignVoices(voices, reels.length), [reels.length, voices]);

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
    const narrator = reelNarrators[currentIndex];
    const run = narrationRun.current + 1;
    narrationRun.current = run;
    const synth = window.speechSynthesis;
    synth?.cancel();
    setIsSpeaking(false);
    setIsPreparingNarration(false);
    if (!autoPlay || !reel || !narrator) return undefined;

    let disposed = false;
    let audioUrl: string | null = null;
    const requestController = new AbortController();
    const moveNext = () => {
      if (narrationRun.current !== run || currentIndex >= reels.length - 1) return;
      window.setTimeout(() => { if (narrationRun.current === run) goTo(currentIndex + 1); }, 650);
    };
    const failNarration = () => {
      if (disposed || narrationRun.current !== run) return;
      setIsPreparingNarration(false);
      setIsSpeaking(false);
      setNarrationError(true);
      setAutoPlay(false);
    };
    const playServerVoice = async () => {
      setNarrationError(false);
      setIsPreparingNarration(true);
      try {
        audioUrl = await createReelNarration(
          reel.voiceover || `${reel.hook} ${reel.body}`,
          narrator.id,
          requestController.signal,
        );
        if (disposed || narrationRun.current !== run || !audioUrl) return;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onplay = () => {
          if (!disposed && narrationRun.current === run) {
            setIsPreparingNarration(false);
            setIsSpeaking(true);
          }
        };
        audio.onended = () => {
          if (disposed || narrationRun.current !== run) return;
          setIsPreparingNarration(false);
          setIsSpeaking(false);
          moveNext();
        };
        audio.onerror = failNarration;
        await audio.play();
      } catch {
        if (!requestController.signal.aborted) failNarration();
      }
    };
    const beginTimer = window.setTimeout(() => {
      if (narrationRun.current !== run) return;
      if (!narrator.browserVoice || !synth) {
        void playServerVoice();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(reel.voiceover || `${reel.hook} ${reel.body}`);
      utterance.voice = narrator.browserVoice;
      utterance.lang = narrator.browserVoice.lang;
      utterance.rate = 1.02;
      utterance.pitch = 1;
      utterance.onstart = () => { if (narrationRun.current === run) setIsSpeaking(true); };
      utterance.onend = () => { if (narrationRun.current === run) { setIsSpeaking(false); moveNext(); } };
      utterance.onerror = () => { if (narrationRun.current === run) { setIsSpeaking(false); moveNext(); } };
      synth.speak(utterance);
    }, 900);
    return () => {
      disposed = true;
      narrationRun.current += 1;
      requestController.abort();
      window.clearTimeout(beginTimer);
      synth?.cancel();
      const audio = audioRef.current;
      if (audio) {
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audioRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [autoPlay, currentIndex, goTo, reelNarrators, reels]);

  if (!reels.length) return <div className="reels-empty">No Reel lesson is available yet. Start a new Reels session with a topic.</div>;

  const currentNarrator = reelNarrators[currentIndex];
  const currentNarratorName = narratorName(currentNarrator);

  return <div className="reels-shell">
    <header className="reels-topbar"><div><span className="material-symbols-outlined">smart_display</span><p>KNOWLEDGE REELS</p><strong>{title}</strong></div><div className="reels-controls"><span className={`reels-speaking ${isSpeaking ? 'is-active' : ''}`}><i /><i /><i />{isSpeaking ? `Narrating: ${currentNarratorName}` : isPreparingNarration ? `Preparing voice: ${currentNarratorName}` : narrationError ? `Voice unavailable: ${currentNarratorName}` : autoPlay ? `Selected voice: ${currentNarratorName}` : 'Paused'}</span><button type="button" onClick={() => setAutoPlay((value) => !value)}>{autoPlay ? <span className="material-symbols-outlined">pause</span> : <span className="material-symbols-outlined">play_arrow</span>}{autoPlay ? 'Pause' : 'Play'}</button></div></header>
    <div className="reels-stage">
      <aside className="reels-progress" aria-label="Reel progress">{reels.map((reel, index) => <button type="button" key={reel.step} onClick={() => goTo(index)} aria-label={`Go to reel ${reel.step}`} className={index === currentIndex ? 'is-active' : index < currentIndex ? 'is-seen' : ''}>{String(reel.step).padStart(2, '0')}</button>)}</aside>
      <div ref={feedRef} className="reels-feed">{reels.map((reel, index) => {
        const template = templateOrder[index % templateOrder.length];
        const textEffect = TEXT_EFFECTS[template % TEXT_EFFECTS.length];
        const titleWords = reel.title.split(/\s+/).filter(Boolean);
        const useWordAnimation = textEffect === 'word-blur' || textEffect === 'pop-up';
        return <section key={reel.step} className={`reel-slide ${index === currentIndex ? 'is-active' : ''}`}><motion.article initial={{ opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ amount: .55, once: false }} transition={{ type: 'spring', stiffness: 220, damping: 25 }} className={`reel-card reel-template-${template} reel-motion-${textEffect}`}>
          <span className="reel-orb reel-orb-a" /><span className="reel-orb reel-orb-b" /><span className="reel-grid" />
          <header><span>STEP <b className="reel-step-number">{String(reel.step).padStart(2, '0')}</b></span><span className="reel-voice-label"><span className="material-symbols-outlined">record_voice_over</span>VOICE: {narratorName(reelNarrators[index])}</span></header>
          <div className="reel-copy"><p className="reel-hook">{reel.hook}</p><h2 className="reel-title" data-title={reel.title}>{useWordAnimation ? titleWords.map((word, wordIndex) => <span key={`${word}-${wordIndex}`} className="reel-title-word" style={{ animationDelay: `${wordIndex * 80}ms` }}>{word}{wordIndex < titleWords.length - 1 ? ' ' : ''}</span>) : reel.title}</h2><p className="reel-body">{reel.body}</p></div>
          <footer><span className="material-symbols-outlined">lightbulb</span><p>{reel.takeaway}</p><span className="reel-narrator"><span className="material-symbols-outlined">record_voice_over</span>VOICE: {narratorName(reelNarrators[index])}</span></footer>
          <div className="reel-template-mark">{String(template + 1).padStart(2, '0')}</div>
        </motion.article></section>;
      })}</div>
      <div className="reels-side-actions"><button type="button" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} aria-label="Previous reel"><span className="material-symbols-outlined">keyboard_arrow_up</span></button><strong>{currentIndex + 1}<small>/{reels.length}</small></strong><button type="button" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === reels.length - 1} aria-label="Next reel"><span className="material-symbols-outlined">keyboard_arrow_down</span></button></div>
    </div>
    <footer className="reels-footer">Swipe or scroll through the series. Each Reel adds one new step to the lesson.</footer>
  </div>;
}
