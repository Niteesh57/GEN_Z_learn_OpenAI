export interface Panel {
  image_description: string;
  dialogue: string;
}

export interface Puzzle {
  context: string;
  question: string;
  answer: string;
  hint: string;
}

export interface Entity {
  name: string;
  type: string;
}

// ─── Browser Simulator Types ──────────────────────────────────────────────────

export interface BrowserField {
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'toggle';
  label: string;
  // text fields
  placeholder?: string;
  hint?: string;
  correct_value?: string | null;
  // select / radio
  options?: string[];
  correct?: string;
  explanation?: string;
  // checkbox / toggle
  correct_checked?: boolean;
  correct_on?: boolean;
}

export interface BrowserScreen {
  url: string;
  page_title: string;
  sidebar_items: string[];
  active_sidebar: string;
  heading: string;
  screen_tip: string;
  fields: BrowserField[];
  next_button: string;
}

// ─── Game Types ───────────────────────────────────────────────────────────────

export type GameTemplate =
  | 'CATCH_DROP'
  | 'WORD_DECODE'
  | 'MAZE_ESCAPE'
  | 'MEMORY_FLIP'
  | 'SEQUENCE_SORT'
  | 'BINARY_JUMP'
  | 'SPACE_SHOOTER'
  | 'CIRCUIT_CONNECT';

export interface GameItem {
  // CATCH_DROP
  label?: string;
  correct?: boolean;
  // MEMORY_FLIP
  term?: string;
  definition?: string;
  // SEQUENCE_SORT / SPACE_SHOOTER
  order?: number;
  // BINARY_JUMP
  question?: string;
  platform_label?: string;
  // WORD_DECODE
  answer?: string;
  clues?: string[];
  // MAZE_ESCAPE
  choice_label?: string;
  is_correct_path?: boolean;
  explanation?: string;
  // CIRCUIT_CONNECT
  from_node?: string;
  to_node?: string;
}

export interface GameLevel {
  concept_title: string;
  concept_explanation: string;
  question?: string;
  choices?: string[];
  correct_answer?: string;
  items: GameItem[];
  win_score: number;
  time_limit_seconds: number;
}

// ─── Codebook / Algorithm Visualizer Types ────────────────────────────────────

// ─── Core Experience Types ────────────────────────────────────────────────────

export interface Experience {
  medium: 'COMIC' | 'BROWSER' | 'GAME' | 'MEME' | 'REELS';
  template: string;
  title: string;
  description: string;
  content: {
    // Existing
    panels?: Panel[];
    puzzles?: Puzzle[];
    entities?: Entity[];
    mechanics?: string;
    // Browser
    browser_title?: string;
    screens?: BrowserScreen[];
    // Game
    game_template?: GameTemplate;
    instructions?: string;
    levels?: GameLevel[];
    // Reels
    title?: string;
    concept?: string;
    reels?: ReelStep[];
  };
}

export interface ReelStep {
  step: number;
  title: string;
  hook: string;
  body: string;
  takeaway: string;
  voiceover: string;
}

export interface ChatInteraction {
  concept: string;
  experience: Experience;
  timestamp: string;
}

export interface Session {
  id: string;
  name: string;
  category: string;
  interactions: ChatInteraction[];
}

export type ThemeColor = 'green' | 'amber' | 'blue' | 'rose';
