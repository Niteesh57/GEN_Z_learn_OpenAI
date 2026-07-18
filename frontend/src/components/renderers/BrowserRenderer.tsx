import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BrowserScreen, BrowserField } from '../../types/chat';
import { useGraphicsEra } from '../../hooks/useGraphicsEra';

interface BrowserRendererProps {
  data: any;
}

// ─── Era-aware class helpers ──────────────────────────────────────────────────

function eraChrome(era: string) {
  if (era === '2026s') return 'bg-[#0b0615] border border-white/10 rounded-2xl overflow-hidden shadow-2xl';
  if (era === '2000s') return 'win95-raised overflow-hidden';
  return 'bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden';
}

function eraAddressBar(era: string) {
  if (era === '2026s') return 'bg-white/5 border border-white/10 text-white/70 rounded-lg px-3 py-1.5 text-[12px] font-mono flex-1';
  if (era === '2000s') return 'win95-sunken-field bg-white text-[#000080] px-2 py-1 text-[11px] font-mono flex-1';
  return 'bg-[#111] border border-[#2a2a2a] text-primary-fixed-dim/70 px-3 py-1 text-[12px] font-mono flex-1';
}

function eraSidebar(era: string) {
  if (era === '2026s') return 'bg-white/5 border-r border-white/10 w-44';
  if (era === '2000s') return 'bg-[#efeded] border-r border-[#808080] w-40';
  return 'bg-[#0e0e0e] border-r border-[#1a1a1a] w-44';
}

function eraContent(era: string) {
  if (era === '2026s') return 'bg-[#0b0615] flex-1 overflow-y-auto p-6';
  if (era === '2000s') return 'bg-white flex-1 overflow-y-auto p-5';
  return 'bg-[#000] flex-1 overflow-y-auto p-6';
}

function eraFieldLabel(era: string) {
  if (era === '2026s') return 'text-white/60 text-[12px] mb-1 block';
  if (era === '2000s') return 'text-[#000080] text-[11px] font-bold mb-1 block font-mono';
  return 'text-on-surface-variant text-[11px] mb-1 block font-mono';
}

function eraInput(era: string, isCorrect: boolean) {
  const base = 'w-full px-3 py-2 text-[13px] font-mono outline-none transition-all ';
  if (era === '2026s') return base + (isCorrect ? 'bg-white/10 border border-[#a855f7]/60 text-white rounded-lg' : 'bg-white/5 border border-white/20 text-white/70 rounded-lg focus:border-[#a855f7]/40');
  if (era === '2000s') return base + 'win95-sunken-field bg-white text-black border-none';
  return base + (isCorrect ? 'bg-black border border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black border border-[#2a2a2a] text-white focus:border-primary-fixed-dim/50');
}

function eraSelect(era: string) {
  if (era === '2026s') return 'w-full px-3 py-2 text-[13px] font-mono bg-white/5 border border-white/20 text-white rounded-lg outline-none cursor-pointer';
  if (era === '2000s') return 'w-full px-2 py-1 text-[12px] font-mono bg-white border border-[#808080] text-black win95-sunken cursor-pointer';
  return 'w-full px-3 py-2 text-[13px] font-mono bg-black border border-[#2a2a2a] text-white outline-none cursor-pointer';
}

function eraNextBtn(era: string) {
  if (era === '2026s') return 'px-6 py-2.5 rounded-xl font-bold text-[13px] bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white shadow-lg hover:shadow-[#a855f7]/40 transition-all hover:-translate-y-0.5 active:translate-y-0';
  if (era === '2000s') return 'px-6 py-1.5 font-bold text-[12px] win95-raised bg-[#efeded] text-[#000080] hover:bg-[#e0e0e0] active:win95-sunken font-mono';
  return 'px-6 py-2 border border-primary-fixed-dim text-primary-fixed-dim font-mono font-bold text-[12px] hover:bg-primary-fixed-dim/10 transition-colors active:bg-primary-fixed-dim/20';
}

// ─── Field Renderer ────────────────────────────────────────────────────────────

function FieldComponent({
  field,
  value,
  onChange,
  submitted,
  era,
}: {
  field: BrowserField;
  value: string;
  onChange: (v: string) => void;
  submitted: boolean;
  era: string;
}) {
  const isCorrect =
    submitted &&
    ((field.type === 'select' || field.type === 'radio') && value === field.correct);

  const isWrong =
    submitted &&
    (field.type === 'select' || field.type === 'radio') &&
    !!value && value !== field.correct;

  return (
    <div className="mb-5">
      <label className={eraFieldLabel(era)}>{field.label}</label>

      {field.type === 'text' && (
        <>
          <input
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={eraInput(era, false)}
          />
          {field.hint && (
            <p className="text-[10px] mt-1 opacity-50 font-mono">{field.hint}</p>
          )}
        </>
      )}

      {field.type === 'select' && (
        <>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={eraSelect(era)}
          >
            <option value="">-- Select --</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {submitted && value && (
            <p className={`text-[11px] mt-1 font-mono ${isCorrect ? 'text-green-400' : isWrong ? 'text-red-400' : ''}`}>
              {isCorrect ? `✓ ${field.explanation}` : isWrong ? `✗ Correct: ${field.correct}` : ''}
            </p>
          )}
        </>
      )}

      {field.type === 'radio' && (
        <div className="space-y-2 mt-1">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name={field.label}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-[var(--theme-primary)]"
              />
              <span className={`text-[13px] font-mono ${
                submitted && opt === field.correct ? 'text-green-400 font-bold' :
                submitted && value === opt && opt !== field.correct ? 'text-red-400 line-through' :
                era === '2000s' ? 'text-[#000080]' : 'text-on-surface'
              }`}>
                {opt}
              </span>
            </label>
          ))}
        </div>
      )}

      {field.type === 'checkbox' && (
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="accent-[var(--theme-primary)] w-4 h-4"
          />
          <span className="text-[13px] font-mono">{field.label}</span>
        </label>
      )}

      {field.type === 'toggle' && (
        <button
          type="button"
          onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          className={`flex items-center gap-3 mt-1 px-3 py-2 rounded-lg border transition-all ${
            value === 'true'
              ? 'border-primary-fixed-dim bg-primary-fixed-dim/10'
              : 'border-[#2a2a2a] bg-transparent'
          }`}
        >
          <span className={`w-10 h-5 rounded-full relative transition-colors ${value === 'true' ? 'bg-primary-fixed-dim' : 'bg-[#2a2a2a]'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value === 'true' ? 'left-5' : 'left-0.5'}`} />
          </span>
          <span className="text-[13px] font-mono">{field.label}</span>
        </button>
      )}
    </div>
  );
}

// ─── Main BrowserRenderer ─────────────────────────────────────────────────────

const BrowserRenderer = ({ data }: BrowserRendererProps) => {
  const era = useGraphicsEra();
  const screens: BrowserScreen[] = data.content?.screens || [];
  const [screenIndex, setScreenIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (screens.length === 0) {
    return (
      <div className="p-8 text-red-500 font-mono">
        [ ERROR: NO BROWSER SCREENS LOADED ]
      </div>
    );
  }

  const screen = screens[screenIndex];

  const hasErrors = submitted && !screen.fields.every((f) => {
    if (f.type === 'select' || f.type === 'radio') {
      return fieldValues[f.label] === f.correct;
    }
    return true;
  });

  const handleFieldChange = (label: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [label]: value }));
    setSubmitted(false);
  };

  const handleNext = () => {
    setSubmitted(true);
    // Check required selects/radios
    const requiredCorrect = screen.fields.every((f) => {
      if (f.type === 'select' || f.type === 'radio') {
        return fieldValues[f.label] === f.correct;
      }
      return true;
    });

    if (!requiredCorrect) return; // keep showing errors

    setTimeout(() => {
      if (screenIndex < screens.length - 1) {
        setScreenIndex((i) => i + 1);
        setFieldValues({});
        setSubmitted(false);
      } else {
        setCompleted(true);
      }
    }, 600);
  };

  const handleRestart = () => {
    setScreenIndex(0);
    setFieldValues({});
    setSubmitted(false);
    setCompleted(false);
  };

  // ── Completion Screen ──
  if (completed) {
    return (
      <div className={`h-full flex flex-col items-center justify-center font-mono p-8 ${era === '2000s' ? 'bg-[#efeded]' : 'bg-[#000]'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full text-center p-8 ${
            era === '2026s' ? 'glass-panel rounded-2xl' :
            era === '2000s' ? 'win95-raised p-6' :
            'bevel-raised bg-surface-container border border-[#2a2a2a]'
          }`}
        >
          <div className="text-5xl mb-4">🌐</div>
          <h3 className="font-bold text-xl font-label-caps text-primary-fixed-dim mb-2 tracking-widest">
            SETUP COMPLETE
          </h3>
          <p className="text-on-surface-variant text-[13px] mb-6 leading-relaxed">
            All configuration steps completed successfully.
          </p>
          <button
            onClick={handleRestart}
            className={eraNextBtn(era)}
            type="button"
          >
            RESTART WALKTHROUGH
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Nav dots ──
  const NavDot = ({ active, done }: { active: boolean; done: boolean }) => (
    <span
      className={`inline-block w-2 h-2 rounded-full transition-all ${
        done ? 'bg-green-400' : active ? 'bg-primary-fixed-dim scale-125' : 'bg-[#2a2a2a]'
      }`}
    />
  );

  return (
    <div className={`h-full flex flex-col font-mono ${era === '1990s' ? 'bg-[#000]' : ''}`}>
      {/* ── Browser Chrome ── */}
      <div className={`flex-1 flex flex-col ${eraChrome(era)} m-4`}>

        {/* Title Bar / Tab bar */}
        <div className={`flex items-center gap-2 px-3 py-2 shrink-0 ${
          era === '2026s' ? 'bg-white/5 border-b border-white/10' :
          era === '2000s' ? 'title-bar' :
          'bg-[#111] border-b border-[#1a1a1a]'
        }`}>
          {/* Traffic lights (1990s / 2026s) */}
          {era !== '2000s' && (
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
            </div>
          )}
          {/* Win95 nav buttons */}
          {era === '2000s' && (
            <div className="flex gap-1 shrink-0">
              <button type="button" className="win95-raised px-2 py-0.5 text-[10px] text-white font-bold">◄</button>
              <button type="button" className="win95-raised px-2 py-0.5 text-[10px] text-white font-bold">►</button>
              <button type="button" className="win95-raised px-2 py-0.5 text-[10px] text-white font-bold">↻</button>
            </div>
          )}
          {/* Address bar */}
          <div className={eraAddressBar(era)}>
            🔒 {screen.url}
          </div>
          {/* Step progress */}
          <div className="flex gap-1 shrink-0 items-center">
            {screens.map((_, i) => (
              <NavDot key={i} active={i === screenIndex} done={i < screenIndex} />
            ))}
          </div>
        </div>

        {/* Browser Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className={`${eraSidebar(era)} flex flex-col py-3 shrink-0`}>
            <div className={`px-3 mb-3 text-[10px] font-bold opacity-50 uppercase tracking-widest ${era === '2000s' ? 'text-[#000080]' : 'text-on-surface-variant'}`}>
              Navigation
            </div>
            {screen.sidebar_items.map((item) => (
              <div
                key={item}
                className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${
                  item === screen.active_sidebar
                    ? era === '2026s' ? 'bg-white/10 text-white font-bold border-l-2 border-[#a855f7]'
                      : era === '2000s' ? 'bg-[#000080] text-white font-bold'
                      : 'bg-primary-fixed-dim/10 text-primary-fixed-dim font-bold border-l-2 border-primary-fixed-dim'
                    : era === '2000s' ? 'text-[#000080] hover:bg-[#e0e0e0]'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className={eraContent(era)}>
            {/* Screen tip */}
            <AnimatePresence mode="wait">
              <motion.div
                key={screenIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {screen.screen_tip && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-[12px] font-mono ${
                    era === '2026s' ? 'bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#d8b4fe]' :
                    era === '2000s' ? 'bg-[#e0e0ff] border border-[#000080] text-[#000080]' :
                    'bg-primary-fixed-dim/5 border border-primary-fixed-dim/20 text-primary-fixed-dim/80'
                  }`}>
                    💡 {screen.screen_tip}
                  </div>
                )}

                <h2 className={`font-bold text-[18px] mb-1 font-label-caps ${
                  era === '2026s' ? 'text-white' : era === '2000s' ? 'text-[#000080]' : 'text-primary-fixed-dim'
                }`}>
                  {screen.heading}
                </h2>
                <p className="text-[11px] opacity-50 mb-6 font-mono">
                  Step {screenIndex + 1} of {screens.length} — {screen.page_title}
                </p>

                {/* Form Fields */}
                <div className="space-y-1 max-w-lg">
                  {screen.fields.map((field) => (
                    <FieldComponent
                      key={field.label}
                      field={field}
                      value={fieldValues[field.label] || ''}
                      onChange={(v) => handleFieldChange(field.label, v)}
                      submitted={submitted}
                      era={era}
                    />
                  ))}
                </div>

                {/* Validation error */}
                {hasErrors && (
                  <p className="text-red-400 text-[12px] font-mono mt-2">
                    ✗ Fix the highlighted fields before proceeding.
                  </p>
                )}

                {/* Next button */}
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={handleNext}
                    className={eraNextBtn(era)}
                  >
                    {screen.next_button}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserRenderer;
