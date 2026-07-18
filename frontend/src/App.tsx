import React, { useEffect, useRef, useState } from 'react';
import type { ChatInteraction, GameTemplate, Session } from './types/chat';
import { generateExperience } from './services/api';
import Sidebar from './components/layout/Sidebar';
import WelcomeScreen from './components/chat/WelcomeScreen';
import ChatInput from './components/chat/ChatInput';
import ComicRenderer from './components/renderers/ComicRenderer';
import BrowserRenderer from './components/renderers/BrowserRenderer';
import GameRenderer from './components/renderers/GameRenderer';
import MemeRenderer from './components/renderers/MemeRenderer';
import ReelsRenderer from './components/renderers/ReelsRenderer';
import IntroScreen from './components/ui/IntroScreen';

type GameChoice = 'AUTO' | GameTemplate;

const GAME_CHOICES: Array<{ id: GameChoice; icon: string; title: string; detail: string }> = [
  { id: 'AUTO', icon: 'auto_awesome', title: 'Auto pick', detail: 'Choose the best match' },
  { id: 'CATCH_DROP', icon: 'filter_alt', title: 'Catch Drop', detail: 'Sort facts and decoys' },
  { id: 'WORD_DECODE', icon: 'key', title: 'Word Decode', detail: 'Solve terms from clues' },
  { id: 'MAZE_ESCAPE', icon: 'route', title: 'Maze Escape', detail: 'Choose safe decisions' },
  { id: 'MEMORY_FLIP', icon: 'style', title: 'Memory Flip', detail: 'Match terms and meanings' },
  { id: 'SEQUENCE_SORT', icon: 'format_list_numbered', title: 'Sequence Sort', detail: 'Order the steps' },
  { id: 'BINARY_JUMP', icon: 'swap_vert', title: 'Binary Jump', detail: 'Answer true or false' },
  { id: 'SPACE_SHOOTER', icon: 'rocket_launch', title: 'Space Shooter', detail: 'Shoot steps in order' },
  { id: 'CIRCUIT_CONNECT', icon: 'hub', title: 'Circuit Connect', detail: 'Link related concepts' },
];

function GameTemplatePicker({ selected, onSelect }: { selected: GameChoice; onSelect: (value: GameChoice) => void }) {
  return (
    <section className="game-template-picker" aria-label="Choose a game type">
      <div className="game-template-picker-heading"><span>CHOOSE YOUR GAME</span><small>{selected === 'AUTO' ? 'Auto pick is active' : `Selected: ${GAME_CHOICES.find((choice) => choice.id === selected)?.title}`}</small></div>
      <div className="game-template-grid">
        {GAME_CHOICES.map((choice) => <button key={choice.id} type="button" aria-pressed={selected === choice.id} onClick={() => onSelect(choice.id)} className={`game-template-option game-template-${choice.id.toLowerCase().replace('_', '-')} ${selected === choice.id ? 'is-selected' : ''}`}>
          <span className="material-symbols-outlined">{choice.icon}</span><strong>{choice.title}</strong><small>{choice.detail}</small>
        </button>)}
      </div>
    </section>
  );
}

function GameTemplateDialog({ selected, onSelect, onClose }: { selected: GameChoice; onSelect: (value: GameChoice) => void; onClose: () => void }) {
  return (
    <div className="game-template-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="game-template-dialog" role="dialog" aria-modal="true" aria-labelledby="game-picker-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="game-template-close" onClick={onClose} aria-label="Close game picker">×</button>
        <p id="game-picker-title" className="game-template-dialog-kicker">GAME MODE SELECTOR</p>
        <GameTemplatePicker selected={selected} onSelect={(value) => { onSelect(value); onClose(); }} />
      </div>
    </div>
  );
}

function GameModeTrigger({ selected, onClick }: { selected: GameChoice; onClick: () => void }) {
  const current = GAME_CHOICES.find((choice) => choice.id === selected) ?? GAME_CHOICES[0];
  return <button type="button" onClick={onClick} className={`game-mode-trigger game-template-${current.id.toLowerCase().replace('_', '-')}`}><span className="material-symbols-outlined">{current.icon}</span><span><small>GAME MODE</small><strong>{current.title}</strong></span><span className="material-symbols-outlined game-mode-trigger-arrow">expand_more</span></button>;
}

const MODE_SHOWCASE = [
  { id: 'reels', icon: 'play_circle', label: 'REELS', caption: 'fast ideas' },
  { id: 'comics', icon: 'auto_stories', label: 'COMICS', caption: 'visual stories' },
  { id: 'games', icon: 'sports_esports', label: 'GAMES', caption: 'learn by play' },
  { id: 'browser', icon: 'web', label: 'BROWSER', caption: 'guided clicks' },
  { id: 'memes', icon: 'sentiment_very_satisfied', label: 'MEMES', caption: 'quick laughs' },
];

function ModeShowcase() {
  return <div className="mode-showcase" aria-label="Learning modes: Reels, Comics, Games, Browser, and Memes">
    <div className="mode-showcase-stage">
      <div className="mode-showcase-ring" />
      <div className="mode-showcase-core"><span className="material-symbols-outlined">bolt</span><small>EXPLORE</small></div>
      {MODE_SHOWCASE.map((mode) => <div key={mode.id} className={`mode-showcase-card mode-showcase-${mode.id}`}><span className="material-symbols-outlined">{mode.icon}</span><strong>{mode.label}</strong><small>{mode.caption}</small></div>)}
      <span className="mode-showcase-spark mode-showcase-spark-a">✦</span><span className="mode-showcase-spark mode-showcase-spark-b">✦</span><span className="mode-showcase-spark mode-showcase-spark-c">✦</span>
    </div>
  </div>;
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedInteractionIndex, setExpandedInteractionIndex] = useState<number | null>(null);
  const [gameTemplate, setGameTemplate] = useState<GameChoice>('AUTO');
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.className = 'genz-app';
    const introTimer = window.setTimeout(() => setShowIntro(false), 5000);
    try {
      const storedSessions = localStorage.getItem('kf_sessions');
      if (storedSessions) setSessions(JSON.parse(storedSessions));
    } catch (error) {
      console.error('Unable to load saved sessions:', error);
    }
    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (sessions.length) localStorage.setItem('kf_sessions', JSON.stringify(sessions));
    else localStorage.removeItem('kf_sessions');
  }, [sessions]);

  const activeSession = sessions.find((session) => session.id === currentSessionId);
  const interactions = activeSession?.interactions ?? [];
  const featureClass = `feature-${(activeFolder ?? 'home').toLowerCase().replace('_', '-')}`;

  useEffect(() => {
    // Do not return the result of a browser API from an effect: some polyfills
    // return a non-cleanup value, which React attempts to call on unmount.
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interactions.length, expandedInteractionIndex]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!concept.trim() || loading || !activeFolder) return;
    setLoading(true);
    try {
      const experience = await generateExperience(concept, activeFolder, activeFolder === 'GAME' && gameTemplate !== 'AUTO' ? gameTemplate : undefined);
      const interaction: ChatInteraction = { concept: concept.trim(), experience, timestamp: new Date().toLocaleTimeString() };
      if (!currentSessionId) {
        const title = experience.title || concept.trim();
        const newSession: Session = { id: Date.now().toString(), name: title.length > 25 ? `${title.slice(0, 25)}...` : title, category: activeFolder, interactions: [interaction] };
        setSessions((previous) => [newSession, ...previous]);
        setCurrentSessionId(newSession.id);
        setExpandedInteractionIndex(0);
      } else {
        setSessions((previous) => previous.map((session) => session.id === currentSessionId ? { ...session, interactions: [...session.interactions, interaction] } : session));
        setExpandedInteractionIndex(interactions.length);
      }
      setConcept('');
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Could not create the learning experience. Please check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderExperience = (interaction: ChatInteraction) => {
    const data = interaction.experience;
    switch (data.medium) {
      case 'COMIC': return <ComicRenderer data={{ ...data, concept: interaction.concept }} />;
      case 'BROWSER': return <BrowserRenderer data={data} />;
      case 'GAME': return <GameRenderer data={data} />;
      case 'MEME': return <MemeRenderer data={data} />;
      case 'REELS': return <ReelsRenderer data={data} />;
      default: return <div className="p-6 text-red-700">This learning format is unavailable.</div>;
    }
  };

  if (showIntro) return <IntroScreen />;

  return (
    <div className={`genz-shell ${featureClass}`}>
      <Sidebar
        sessions={sessions.filter((session) => session.category === activeFolder)} currentSessionId={currentSessionId} activeFolder={activeFolder}
        onSelectFolder={(folder) => { setActiveFolder(folder); setCurrentSessionId(null); setConcept(''); setExpandedInteractionIndex(null); setGameTemplate('AUTO'); setGamePickerOpen(folder === 'GAME'); }}
        onSelectSession={(id) => { setCurrentSessionId(id); setExpandedInteractionIndex(null); }}
        onDeleteSession={(id) => setSessions((previous) => previous.filter((session) => session.id !== id))}
        onNewChat={() => { setCurrentSessionId(null); setConcept(''); setExpandedInteractionIndex(null); }}
      />
      <main className="genz-main">
        {!activeFolder ? (
          <section className="empty-state mode-empty-state"><ModeShowcase /><h2>Choose your learning mode</h2><p>Pick a colorful mode from the sidebar to start creating an interactive lesson.</p></section>
        ) : interactions.length === 0 ? (
          <section className="welcome-panel"><WelcomeScreen />{activeFolder === 'GAME' && <GameModeTrigger selected={gameTemplate} onClick={() => setGamePickerOpen(true)} />}<ChatInput concept={concept} setConcept={setConcept} onSubmit={handleSearch} loading={loading} /></section>
        ) : (
          <section className="lesson-log">
            <div className="lesson-scroll">
              {interactions.map((interaction, index) => {
                const expanded = index === (expandedInteractionIndex ?? interactions.length - 1);
                return <article key={`${interaction.timestamp}-${index}`} className="lesson-card">
                  <div className="lesson-card-title"><span>{interaction.experience.medium.replace('_', ' ')}</span><strong>{interaction.experience.title}</strong><small>{interaction.timestamp}</small></div>
                  {expanded ? <div className="experience-canvas">{renderExperience(interaction)}</div> : <button className="collapsed-card" type="button" onClick={() => setExpandedInteractionIndex(index)}>Open {interaction.experience.title} →</button>}
                </article>;
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="lesson-input">{activeFolder === 'GAME' && <GameModeTrigger selected={gameTemplate} onClick={() => setGamePickerOpen(true)} />}<ChatInput concept={concept} setConcept={setConcept} onSubmit={handleSearch} loading={loading} variant="compact" /></div>
          </section>
        )}
      </main>
      {activeFolder === 'GAME' && gamePickerOpen && <GameTemplateDialog selected={gameTemplate} onSelect={setGameTemplate} onClose={() => setGamePickerOpen(false)} />}
    </div>
  );
}

export default App;
