import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameTemplate, GameLevel } from '../../types/chat';
import { useGraphicsEra } from '../../hooks/useGraphicsEra';
import CatchDropGame from './games/CatchDropGame';
import MemoryFlipGame from './games/MemoryFlipGame';
import SequenceSortGame from './games/SequenceSortGame';
import WordDecodeGame from './games/WordDecodeGame';
import SpaceShooterGame from './games/SpaceShooterGame';
import BinaryJumpGame from './games/BinaryJumpGame';
import MazeEscapeGame from './games/MazeEscapeGame';
import CircuitConnectGame from './games/CircuitConnectGame';
import { normalizeGameLevels } from './games/gameData';

interface GameRendererProps { data: any; }

const isGameTemplate = (value: unknown): value is GameTemplate =>
  typeof value === 'string' && value in TEMPLATE_NAMES;

const TEMPLATE_ICONS: Record<GameTemplate, string> = {
  CATCH_DROP: '🎯',
  WORD_DECODE: '🔐',
  MAZE_ESCAPE: '🗺️',
  MEMORY_FLIP: '🃏',
  SEQUENCE_SORT: '📋',
  BINARY_JUMP: '⬆️',
  SPACE_SHOOTER: '🚀',
  CIRCUIT_CONNECT: '⚡',
};

const TEMPLATE_NAMES: Record<GameTemplate, string> = {
  CATCH_DROP: 'CATCH_DROP',
  WORD_DECODE: 'WORD_DECODE',
  MAZE_ESCAPE: 'MAZE_ESCAPE',
  MEMORY_FLIP: 'MEMORY_FLIP',
  SEQUENCE_SORT: 'SEQUENCE_SORT',
  BINARY_JUMP: 'BINARY_JUMP',
  SPACE_SHOOTER: 'SPACE_SHOOTER',
  CIRCUIT_CONNECT: 'CIRCUIT_CONNECT',
};

const GameRenderer = ({ data }: GameRendererProps) => {
  const era = useGraphicsEra();
  const template: GameTemplate = isGameTemplate(data.content?.game_template)
    ? data.content.game_template
    : 'CATCH_DROP';
  const instructions: string = data.content?.instructions || '';
  const levels: GameLevel[] = normalizeGameLevels(template, data.content?.levels);
  const gameThemeClass = `game-theme-${template.toLowerCase().replace('_', '-')}`;

  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<'play' | 'reveal'>('play');
  const [allDone, setAllDone] = useState(false);

  if (levels.length === 0) {
    return (
      <div className="genz-game-shell flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md border border-red-400/60 bg-black/30 p-6">
          <p className="text-[11px] font-bold tracking-[0.16em] text-red-300">GAME DATA NEEDS A REBUILD</p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/80">
            This lesson did not include enough playable questions. Start a new lesson with a specific topic to generate a complete game.
          </p>
        </div>
      </div>
    );
  }

  const level = levels[levelIndex];

  const handleLevelWin = () => {
    setPhase('reveal');
  };

  const handleNextLevel = () => {
    if (levelIndex < levels.length - 1) {
      setLevelIndex(i => i + 1);
      setPhase('play');
    } else {
      setAllDone(true);
    }
  };

  // Era-based shell classes
  const shellCls = era === '2026s'
    ? `genz-game-shell ${gameThemeClass} h-full flex flex-col bg-[#080310] font-mono text-white`
    : era === '2000s'
    ? `genz-game-shell ${gameThemeClass} h-full flex flex-col bg-[#efeded] font-mono text-[#000080] win95-raised`
    : `genz-game-shell ${gameThemeClass} h-full flex flex-col bg-black font-mono text-on-surface`;

  const headerCls = era === '2026s'
    ? 'genz-game-header px-5 py-3 border-b border-white/10 flex items-center justify-between shrink-0'
    : era === '2000s'
    ? 'genz-game-header px-4 py-2 border-b border-[#808080] bg-[#efeded] flex items-center justify-between shrink-0'
    : 'genz-game-header px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between shrink-0';

  // ── All done ──
  if (allDone) {
    return (
      <div className={`${shellCls} items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full text-center p-8 mx-4 ${
            era === '2026s' ? 'glass-panel rounded-2xl' :
            era === '2000s' ? 'win95-raised' :
            'bevel-raised bg-surface-container border border-[#2a2a2a]'
          }`}
        >
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="font-bold text-xl font-label-caps text-primary-fixed-dim mb-2 tracking-widest">
            GAME COMPLETE
          </h3>
          <p className="text-on-surface-variant text-[13px] mb-2 leading-relaxed">
            All {levels.length} level{levels.length > 1 ? 's' : ''} conquered.
          </p>
          <button
            type="button"
            onClick={() => { setLevelIndex(0); setPhase('play'); setAllDone(false); }}
            className={`mt-4 px-6 py-2 font-bold text-[12px] border border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed-dim/10 transition-colors`}
          >
            PLAY AGAIN
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Concept reveal screen ──
  if (phase === 'reveal') {
    return (
      <div className={`${shellCls} items-center justify-center p-6`}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-lg w-full ${
            era === '2026s' ? 'glass-panel rounded-2xl p-8' :
            era === '2000s' ? 'win95-raised p-6' :
            'bevel-raised bg-surface-container border border-primary-fixed-dim/20 p-8'
          }`}
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="font-bold text-[16px] font-label-caps text-primary-fixed-dim tracking-widest">
              LEVEL {levelIndex + 1} COMPLETE — CONCEPT UNLOCKED
            </h3>
          </div>

          <div className={`mb-2 text-[10px] font-bold opacity-50 uppercase tracking-widest`}>
            {level.concept_title}
          </div>
          <p className={`text-[14px] leading-relaxed mb-8 ${
            era === '2026s' ? 'text-white/90' : era === '2000s' ? 'text-[#000080]' : 'text-on-surface'
          }`}>
            {level.concept_explanation}
          </p>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={handleNextLevel}
              className={`px-6 py-2.5 font-bold text-[13px] transition-all ${
                era === '2026s'
                  ? 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white rounded-xl hover:-translate-y-0.5 shadow-lg'
                  : era === '2000s'
                  ? 'win95-raised text-[#000080] px-8'
                  : 'border border-primary-fixed-dim text-primary-fixed-dim hover:bg-primary-fixed-dim/10'
              }`}
            >
              {levelIndex < levels.length - 1 ? `NEXT LEVEL (${levelIndex + 2}/${levels.length}) →` : 'FINISH GAME →'}
            </button>
          </div>

          {/* Level dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {levels.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${
                i < levelIndex ? 'bg-green-400' :
                i === levelIndex ? 'bg-primary-fixed-dim' :
                'bg-[#2a2a2a]'
              }`} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Game play screen ──
  return (
    <div className={shellCls}>
      {/* Header */}
      <div className={headerCls}>
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{TEMPLATE_ICONS[template]}</span>
          <span className="text-[11px] font-bold font-label-caps opacity-70">
            {TEMPLATE_NAMES[template]} // LEVEL {levelIndex + 1}/{levels.length}
          </span>
        </div>
        <div className="text-[11px] opacity-50 truncate max-w-[200px]">{level.concept_title}</div>
      </div>

      {/* Instructions banner */}
      {instructions && (
        <div className={`genz-game-instructions px-5 py-2 text-[12px] font-mono shrink-0 ${
          era === '2026s' ? 'bg-[#a855f7]/10 text-[#d8b4fe]' :
          era === '2000s' ? 'bg-[#e0e0ff] text-[#000080]' :
          'bg-primary-fixed-dim/5 text-primary-fixed-dim/80'
        }`}>
          📢 {instructions}
        </div>
      )}

      {/* Game content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${template}-${levelIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            {template === 'CATCH_DROP' && <CatchDropGame level={level} onWin={handleLevelWin} />}
            {template === 'MEMORY_FLIP' && <MemoryFlipGame level={level} onWin={handleLevelWin} />}
            {template === 'SEQUENCE_SORT' && <SequenceSortGame level={level} onWin={handleLevelWin} />}
            {template === 'WORD_DECODE' && <WordDecodeGame level={level} onWin={handleLevelWin} />}
            {template === 'SPACE_SHOOTER' && <SpaceShooterGame level={level} onWin={handleLevelWin} />}
            {template === 'BINARY_JUMP' && <BinaryJumpGame level={level} onWin={handleLevelWin} />}
            {template === 'MAZE_ESCAPE' && <MazeEscapeGame level={level} onWin={handleLevelWin} />}
            {template === 'CIRCUIT_CONNECT' && <CircuitConnectGame level={level} onWin={handleLevelWin} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameRenderer;
