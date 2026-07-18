import type { GameItem, GameLevel, GameTemplate } from '../../../types/chat';

const MAX_LEVELS = 4;

const text = (value: unknown, max = 80): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const numberInRange = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
};

const rawItems = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];

const baseLevel = (raw: Record<string, unknown>, items: GameItem[], winScore: number): GameLevel => ({
  concept_title: text(raw.concept_title, 70) || 'Practice round',
  concept_explanation: text(raw.concept_explanation, 360) || 'Use the game controls to practise this concept.',
  items,
  win_score: winScore,
  time_limit_seconds: numberInRange(raw.time_limit_seconds, 45, 20, 90),
});

const unique = <T>(items: T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item).toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const normalizeLevel = (template: GameTemplate, raw: Record<string, unknown>): GameLevel | null => {
  const items = rawItems(raw.items);

  if (template === 'CATCH_DROP') {
    const playable = unique(items.map((item) => ({ label: text(item.label, 42), correct: item.correct }))
      .filter((item): item is { label: string; correct: boolean } => Boolean(item.label) && typeof item.correct === 'boolean'), (item) => item.label)
      .slice(0, 12);
    const correctCount = playable.filter((item) => item.correct).length;
    if (playable.length < 4 || correctCount === 0 || correctCount === playable.length) return null;
    return baseLevel(raw, playable, numberInRange(raw.win_score, Math.min(4, correctCount), 1, correctCount));
  }

  if (template === 'MEMORY_FLIP') {
    const playable = unique(items.map((item) => ({ term: text(item.term, 46), definition: text(item.definition, 82) }))
      .filter((item) => item.term && item.definition && item.term.toLowerCase() !== item.definition.toLowerCase()), (item) => item.term)
      .slice(0, 6);
    if (playable.length < 2) return null;
    return baseLevel(raw, playable, playable.length);
  }

  if (template === 'SEQUENCE_SORT' || template === 'SPACE_SHOOTER') {
    const usable = unique(items.map((item) => ({ order: numberInRange(item.order, 0, 1, 99), label: text(item.label, 56) }))
      .filter((item) => item.order > 0 && item.label), (item) => `${item.order}:${item.label}`)
      .sort((a, b) => a.order - b.order)
      .slice(0, 7)
      .map((item, index) => ({ ...item, order: index + 1 }));
    if (usable.length < 2) return null;
    return baseLevel(raw, usable, usable.length);
  }

  if (template === 'WORD_DECODE') {
    const playable = unique(items.map((item) => ({
      answer: text(item.answer, 32),
      clues: unique((Array.isArray(item.clues) ? item.clues : []).map((clue) => text(clue, 110)).filter(Boolean), (clue) => clue).slice(0, 3),
    })).filter((item) => item.answer && item.clues.length > 0), (item) => item.answer).slice(0, 5);
    if (playable.length === 0) return null;
    return baseLevel(raw, playable, playable.length);
  }

  if (template === 'BINARY_JUMP') {
    const playable = unique(items.map((item) => ({
      question: text(item.question, 150),
      platform_label: text(item.platform_label, 5).toLowerCase() === 'true' ? 'True' : text(item.platform_label, 5).toLowerCase() === 'false' ? 'False' : '',
      correct: item.correct,
    })).filter((item): item is { question: string; platform_label: string; correct: boolean } => Boolean(item.question && item.platform_label) && typeof item.correct === 'boolean'), (item) => item.question).slice(0, 6);
    if (playable.length === 0) return null;
    return baseLevel(raw, playable, playable.length);
  }

  if (template === 'MAZE_ESCAPE') {
    const playable = unique(items.map((item) => ({
      choice_label: text(item.choice_label, 54),
      is_correct_path: item.is_correct_path,
      explanation: text(item.explanation, 180),
    })).filter((item): item is { choice_label: string; is_correct_path: boolean; explanation: string } => Boolean(item.choice_label && item.explanation) && typeof item.is_correct_path === 'boolean'), (item) => item.choice_label).slice(0, 8);
    if (!playable.some((item) => item.is_correct_path) || !playable.some((item) => !item.is_correct_path)) return null;
    return baseLevel(raw, playable, Math.max(1, playable.filter((item) => item.is_correct_path).length));
  }

  const playable = unique(items.map((item) => ({
    from_node: text(item.from_node, 24),
    to_node: text(item.to_node, 24),
    correct: item.correct,
    label: text(item.label, 46),
  })).filter((item): item is { from_node: string; to_node: string; correct: boolean; label: string } => Boolean(item.from_node && item.to_node && item.label) && item.from_node !== item.to_node && typeof item.correct === 'boolean'), (item) => [item.from_node, item.to_node].sort().join('|')).slice(0, 9);
  if (!playable.some((item) => item.correct)) return null;
  return baseLevel(raw, playable, playable.filter((item) => item.correct).length);
};

export const normalizeGameLevels = (template: GameTemplate, value: unknown): GameLevel[] =>
  (Array.isArray(value) ? value : [])
    .filter((level): level is Record<string, unknown> => Boolean(level) && typeof level === 'object')
    .slice(0, MAX_LEVELS)
    .map((level) => normalizeLevel(template, level))
    .filter((level): level is GameLevel => level !== null);

export const clampTime = (value: number | undefined): number => numberInRange(value, 45, 20, 90);

export const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};
