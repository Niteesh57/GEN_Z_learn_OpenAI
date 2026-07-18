import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BrowserField, BrowserScreen } from '../../types/chat';

interface BrowserRendererProps { data: any; }

type DockApp = 'safari' | 'arc' | 'trello' | 'dribbble' | 'code' | 'layouts';

const DOCK_APPS: Array<{ id: DockApp; label: string; icon: string; color: string }> = [
  { id: 'safari', label: 'Safari', icon: 'language', color: '#38bdf8' },
  { id: 'arc', label: 'Arc', icon: 'browse_activity', color: '#a78bfa' },
  { id: 'trello', label: 'Trello', icon: 'view_kanban', color: '#60a5fa' },
  { id: 'dribbble', label: 'Dribbble', icon: 'palette', color: '#f472b6' },
  { id: 'code', label: 'Command Code', icon: 'terminal', color: '#34d399' },
  { id: 'layouts', label: 'UI Layouts', icon: 'dashboard_customize', color: '#fbbf24' },
];

function FieldComponent({ field, value, onChange, submitted }: { field: BrowserField; value: string; onChange: (value: string) => void; submitted: boolean }) {
  const isChoice = field.type === 'select' || field.type === 'radio';
  const isCorrect = submitted && isChoice && value === field.correct;
  const isWrong = submitted && isChoice && Boolean(value) && value !== field.correct;

  return <div className="mac-field">
    <label>{field.label}</label>
    {field.type === 'text' && <><input type="text" placeholder={field.placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="mac-field-input" />{field.hint && <p className="mac-field-hint">{field.hint}</p>}</>}
    {field.type === 'select' && <><select value={value} onChange={(event) => onChange(event.target.value)} className={`mac-field-input ${isCorrect ? 'is-correct' : isWrong ? 'is-wrong' : ''}`}><option value="">Select an option</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>{submitted && value && <p className={`mac-field-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>{isCorrect ? `Correct: ${field.explanation ?? 'Great choice.'}` : `Try again — correct answer: ${field.correct}`}</p>}</>}
    {field.type === 'radio' && <div className="mac-radio-group">{field.options?.map((option) => <label key={option} className={`mac-radio-option ${submitted && option === field.correct ? 'is-correct' : submitted && value === option ? 'is-wrong' : ''}`}><input type="radio" name={field.label} checked={value === option} onChange={() => onChange(option)} /><span>{option}</span></label>)}</div>}
    {field.type === 'checkbox' && <label className="mac-check-option"><input type="checkbox" checked={value === 'true'} onChange={(event) => onChange(event.target.checked ? 'true' : 'false')} /><span>{field.label}</span></label>}
    {field.type === 'toggle' && <button type="button" onClick={() => onChange(value === 'true' ? 'false' : 'true')} className={`mac-toggle ${value === 'true' ? 'is-on' : ''}`}><span /><b>{value === 'true' ? 'Enabled' : 'Disabled'}</b></button>}
  </div>;
}

function AppPreview({ app }: { app: DockApp }) {
  const copy: Record<Exclude<DockApp, 'safari'>, { eyebrow: string; heading: string; body: string }> = {
    arc: { eyebrow: 'ARC WORKSPACE', heading: 'Spaces for focused learning', body: 'Switch back to Safari from the dock to continue the interactive walkthrough.' },
    trello: { eyebrow: 'TRELLO BOARD', heading: 'Learning plan is ready', body: 'To do, in progress, and review cards keep each lesson organised.' },
    dribbble: { eyebrow: 'DRIBBBLE GALLERY', heading: 'Visual inspiration', body: 'Save ideas and examples that make the concept memorable.' },
    code: { eyebrow: 'COMMAND CODE', heading: 'Learning shell online', body: 'Use the browser lab to practise choices before moving to the terminal.' },
    layouts: { eyebrow: 'UI LAYOUTS', heading: 'Interface patterns', body: 'A collection of clear, friendly layouts for your learning flow.' },
  };
  const details = copy[app as Exclude<DockApp, 'safari'>];
  return <motion.div key={app} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mac-app-preview"><span>{details.eyebrow}</span><h2>{details.heading}</h2><p>{details.body}</p><div className="mac-preview-cards"><i /><i /><i /></div></motion.div>;
}

const BrowserRenderer = ({ data }: BrowserRendererProps) => {
  const screens: BrowserScreen[] = data.content?.screens || [];
  const [screenIndex, setScreenIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeApp, setActiveApp] = useState<DockApp>('safari');

  if (!screens.length) return <div className="mac-error">No browser walkthrough is available for this lesson.</div>;
  const screen = screens[screenIndex];
  const hasErrors = submitted && !screen.fields.every((field) => field.type !== 'select' && field.type !== 'radio' || fieldValues[field.label] === field.correct);
  const activeDockApp = DOCK_APPS.find((app) => app.id === activeApp) ?? DOCK_APPS[0];

  const updateValue = (label: string, value: string) => { setFieldValues((previous) => ({ ...previous, [label]: value })); setSubmitted(false); };
  const handleNext = () => {
    setSubmitted(true);
    if (!screen.fields.every((field) => field.type !== 'select' && field.type !== 'radio' || fieldValues[field.label] === field.correct)) return;
    window.setTimeout(() => {
      if (screenIndex < screens.length - 1) { setScreenIndex((value) => value + 1); setFieldValues({}); setSubmitted(false); }
      else setCompleted(true);
    }, 430);
  };
  const selectDockApp = (app: DockApp) => { setActiveApp(app); setMinimized(false); };
  const restart = () => { setScreenIndex(0); setFieldValues({}); setSubmitted(false); setCompleted(false); setActiveApp('safari'); setMinimized(false); };

  return <div className="mac-genie-workspace">
    <div className="mac-menu-bar"><span className="mac-menu-links">File&nbsp;&nbsp; Edit&nbsp;&nbsp; View&nbsp;&nbsp; Window&nbsp;&nbsp; Help</span><span className="mac-menu-right">Browser Lab · {screenIndex + 1}/{screens.length}</span></div>
    <div className="mac-window-zone">
      <motion.section className="mac-app-window" animate={minimized ? { opacity: 0, scaleX: 0.16, scaleY: 0.08, y: 260, borderRadius: 28, filter: 'blur(2px)' } : { opacity: 1, scaleX: 1, scaleY: 1, y: 0, borderRadius: 18, filter: 'blur(0px)' }} transition={{ type: 'spring', stiffness: 260, damping: 27, mass: .85 }} style={{ transformOrigin: '50% 100%' }}>
        <div className="mac-title-bar"><div className="mac-traffic-lights"><button type="button" onClick={() => setMinimized(true)} aria-label="Close window" className="mac-light mac-red" /><button type="button" onClick={() => setMinimized(true)} aria-label="Minimize window" className="mac-light mac-yellow" /><button type="button" onClick={() => setMinimized(false)} aria-label="Expand window" className="mac-light mac-green" /></div><strong><span className="material-symbols-outlined">{activeDockApp.icon}</span>{activeDockApp.label}</strong><span className="mac-window-step">LEARNING LAB</span></div>
        <div className="mac-browser-toolbar"><button type="button" onClick={() => setScreenIndex((index) => Math.max(0, index - 1))} disabled={screenIndex === 0 || activeApp !== 'safari'}><span className="material-symbols-outlined">arrow_back</span></button><button type="button" onClick={() => setScreenIndex((index) => Math.min(screens.length - 1, index + 1))} disabled={activeApp !== 'safari'}><span className="material-symbols-outlined">arrow_forward</span></button><div className="mac-address"><span className="material-symbols-outlined">lock</span>{activeApp === 'safari' ? screen.url : `app:///${activeApp}`}</div><button type="button" className="mac-share"><span className="material-symbols-outlined">ios_share</span></button></div>
        {activeApp === 'safari' ? <div className="mac-browser-body"><aside className="mac-browser-sidebar"><p>FAVORITES</p>{screen.sidebar_items.map((item) => <button key={item} type="button" className={item === screen.active_sidebar ? 'is-active' : ''}><span className="material-symbols-outlined">{item === screen.active_sidebar ? 'radio_button_checked' : 'circle'}</span>{item}</button>)}</aside><main className="mac-browser-content"><AnimatePresence mode="wait">{completed ? <motion.div key="complete" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} className="mac-complete"><span className="material-symbols-outlined">task_alt</span><h2>Setup complete</h2><p>You finished every step in this browser lab.</p><button type="button" onClick={restart}>Restart walkthrough</button></motion.div> : <motion.div key={screenIndex} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .22 }}><div className="mac-tip"><span className="material-symbols-outlined">lightbulb</span>{screen.screen_tip || 'Complete the form to continue.'}</div><p className="mac-content-eyebrow">STEP {screenIndex + 1} OF {screens.length} · {screen.page_title}</p><h2>{screen.heading}</h2><div className="mac-fields">{screen.fields.map((field) => <FieldComponent key={field.label} field={field} value={fieldValues[field.label] || ''} onChange={(value) => updateValue(field.label, value)} submitted={submitted} />)}</div>{hasErrors && <p className="mac-error-copy">Complete the highlighted choice before continuing.</p>}<button type="button" onClick={handleNext} className="mac-next-button">{screen.next_button}<span className="material-symbols-outlined">arrow_forward</span></button></motion.div>}</AnimatePresence></main></div> : <div className="mac-app-body"><AppPreview app={activeApp} /></div>}
      </motion.section>
    </div>
    <div className="mac-dock" aria-label="Application dock">{DOCK_APPS.map((app) => <button key={app.id} type="button" title={app.label} onClick={() => selectDockApp(app.id)} className={`mac-dock-icon ${activeApp === app.id && !minimized ? 'is-active' : ''}`} style={{ '--dock-color': app.color } as React.CSSProperties}><span className="material-symbols-outlined">{app.icon}</span><small>{app.label}</small></button>)}</div>
  </div>;
};

export default BrowserRenderer;
