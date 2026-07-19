import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GiphyGif, GiphyGuide, GiphyLessonBlock } from '../../types/chat';

interface GiphyLearningContent {
  concept?: string;
  guide?: GiphyGuide;
  gifs?: GiphyGif[];
  blocks?: GiphyLessonBlock[];
  message?: string;
}

interface GiphyLearningRendererProps {
  data: { title?: string; content?: GiphyLearningContent };
}

const preferredGuideVoice = (voices: SpeechSynthesisVoice[]) => {
  const voiceNames = [/Microsoft Andrew Online \(Natural\)/i, /Microsoft Brian Online \(Natural\)/i, /Microsoft Guy Online \(Natural\)/i, /Microsoft William Online \(Natural\)/i];
  return voiceNames.map((pattern) => voices.find((voice) => pattern.test(voice.name))).find(Boolean)
    || voices.find((voice) => voice.lang.startsWith('en') && /male|david|mark|daniel/i.test(voice.name))
    || voices.find((voice) => voice.lang.startsWith('en'))
    || voices[0];
};

export default function GiphyLearningRenderer({ data }: GiphyLearningRendererProps) {
  const content = data?.content ?? {};
  const guide = content.guide ?? { name: 'Alex', role: 'Visual learning guide' };
  const gifs = Array.isArray(content.gifs) ? content.gifs : [];
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];
  const gifById = useMemo(() => new Map(gifs.map((gif) => [gif.id, gif])), [gifs]);
  const [visibleBlocks, setVisibleBlocks] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const storyRef = useRef<HTMLDivElement>(null);
  const narrationRun = useRef(0);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    storyRef.current?.scrollTo({ top: storyRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleBlocks]);

  useEffect(() => {
    const block = blocks[visibleBlocks - 1];
    const run = narrationRun.current + 1;
    narrationRun.current = run;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (!autoPlay || !block || visibleBlocks >= blocks.length) return;

    const continueStory = (delay: number) => window.setTimeout(() => {
      if (narrationRun.current === run) setVisibleBlocks((current) => Math.min(current + 1, blocks.length));
    }, delay);

    if (block.type === 'gif') {
      const timer = continueStory(3800);
      return () => { narrationRun.current += 1; window.clearTimeout(timer); };
    }

    const text = block.content?.trim();
    const voice = preferredGuideVoice(voices);
    if (!text || !voice) {
      const timer = continueStory(2400);
      return () => { narrationRun.current += 1; window.clearTimeout(timer); };
    }

    const startTimer = window.setTimeout(() => {
      if (narrationRun.current !== run) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 1.01;
      utterance.onstart = () => { if (narrationRun.current === run) setIsSpeaking(true); };
      utterance.onend = () => { if (narrationRun.current === run) { setIsSpeaking(false); continueStory(500); } };
      utterance.onerror = () => { if (narrationRun.current === run) { setIsSpeaking(false); continueStory(900); } };
      window.speechSynthesis.speak(utterance);
    }, 420);
    return () => { narrationRun.current += 1; window.clearTimeout(startTimer); window.speechSynthesis.cancel(); };
  }, [autoPlay, blocks, visibleBlocks, voices]);

  if (!blocks.length || gifs.length === 0) {
    return <section className="giphy-learning-shell giphy-learning-empty"><span className="material-symbols-outlined">gif_box</span><p>GIF LEARNING</p><h2>Alex is ready to explain with visual cues.</h2><small>{content.message || 'Try the lesson again in a moment.'}</small></section>;
  }

  const shownBlocks = blocks.slice(0, visibleBlocks);
  return <section className="giphy-learning-shell giphy-guided-story">
    <header className="giphy-learning-header">
      <div className="giphy-guide-title"><span className="material-symbols-outlined">face_6</span><p>{guide.name.toUpperCase()} // {guide.role.toUpperCase()}</p><h2>{data.title || `GIF Learning: ${content.concept || 'your topic'}`}</h2></div>
      <button type="button" onClick={() => setAutoPlay((value) => !value)} className="giphy-narration-toggle"><span className={`giphy-speaking ${isSpeaking ? 'is-active' : ''}`}><i /><i /><i /></span>{autoPlay ? 'Pause Alex' : 'Play Alex'}</button>
    </header>
    <div ref={storyRef} className="giphy-story-feed" aria-live="polite">
      {shownBlocks.map((block, index) => {
        if (block.type === 'gif') {
          const gif = block.gif_id ? gifById.get(block.gif_id) : undefined;
          return gif ? <motion.figure key={`${gif.id}-${index}`} className="giphy-inline-visual" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 210, damping: 22 }}><img src={gif.image_url} alt={gif.alt_text || gif.title} /><figcaption><span className="material-symbols-outlined">auto_awesome</span> Visual cue</figcaption></motion.figure> : null;
        }
        return <motion.article key={`guide-${index}`} className="giphy-guide-message" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}><div className="giphy-guide-avatar"><span className="material-symbols-outlined">face_6</span></div><div><small>{guide.name.toUpperCase()}</small><p>{block.content}</p></div></motion.article>;
      })}
    </div>
    <footer className="giphy-learning-footer"><span className="material-symbols-outlined">tips_and_updates</span> Follow Alex’s explanation and use every visual cue as part of the same learning story.</footer>
  </section>;
}
