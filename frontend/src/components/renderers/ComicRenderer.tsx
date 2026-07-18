import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateComicPage } from '../../services/api';

const MAX_PAGES = 4;
const FEMALE_CHARACTERS = ['wonderwoman', 'minnie', 'kendall', 'eleven'];

const getVoiceForCharacter = (character: string, availableVoices: SpeechSynthesisVoice[]) => {
  if (availableVoices.length === 0) return null;
  if (!character) return availableVoices[0];
  
  const isFemale = FEMALE_CHARACTERS.includes(character.toLowerCase());

  if (isFemale) {
    const natasha = availableVoices.find(v => v.name.includes('Natasha'));
    if (natasha) return natasha;
    const aria = availableVoices.find(v => v.name.includes('Aria'));
    if (aria) return aria;
  } else {
    const william = availableVoices.find(v => v.name.includes('William'));
    if (william) return william;
    const roger = availableVoices.find(v => v.name.includes('Roger'));
    if (roger) return roger;
  }

  // Filter out unstable 'Online (Natural)' voices which frequently fail with synthesis-failed
  const localVoices = availableVoices.filter(v => v.localService === true && !v.name.includes('Online'));
  const voicesToUse = localVoices.length > 0 ? localVoices : availableVoices;

  const enVoices = voicesToUse.filter(v => v.lang.startsWith('en'));
  const voicesToSearch = enVoices.length > 0 ? enVoices : voicesToUse;

  if (isFemale) {
    return voicesToSearch.find(v => v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('female')) || voicesToSearch[0];
  } else {
    const maleVoices = voicesToSearch.filter(v => !v.name.toLowerCase().includes('zira') && !v.name.toLowerCase().includes('female'));
    if (maleVoices.length === 0) return voicesToSearch[0];
    const hash = character.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return maleVoices[hash % maleVoices.length];
  }
};


/* ─────────────────────────────────────────────────────────────────────────────
   Cluster metadata (matches backend CLUSTER_ROSTER)
──────────────────────────────────────────────────────────────────────────────*/
const CLUSTERS = [
  { id: 'dc_justice',      name: 'DC Justice',         emoji: '🦇', color: '#2b1055', accent: '#ffeb3b', description: 'Batman, Superman & more explaining tech' },
  { id: 'marvel_mashup',   name: 'Marvel Mashup',      emoji: '🕷️', color: '#ef233c', accent: '#fff',    description: 'Crossover heroes battle complex concepts' },
  { id: 'disney',          name: 'Disney Classic',     emoji: '🐭', color: '#e60000', accent: '#ffcc00', description: 'Mickey & friends make it friendly' },
  { id: 'tom_jerry',       name: 'Tom & Jerry',        emoji: '🐱', color: '#697d91', accent: '#f4d03f', description: 'Cat-and-mouse chaos explains algorithms' },
  { id: 'kick_buttowski',  name: 'Kick Buttowski',     emoji: '🛹', color: '#2c3e50', accent: '#f1c40f', description: 'Daredevil stunts = performance concepts' },
  { id: 'stranger_things', name: 'Stranger Things',    emoji: '💡', color: '#0b0b1a', accent: '#e50914', description: 'Hawkins mysteries = ML & AI secrets' },
  { id: 'ben10',           name: 'Ben 10 Omnitrix',    emoji: '👽', color: '#0b1c0b', accent: '#39ff14', description: 'Alien transformations = data structures' },
  { id: 'glitch_rider',    name: 'Glitch Rider',       emoji: '💻', color: '#0c0816', accent: '#00ffff', description: 'Cyberpunk pixel art for hackers' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   CSS Bundle loader — lazy-loads cluster CSS once per session
──────────────────────────────────────────────────────────────────────────────*/
const loadedBundles = new Set<string>();
function useClusterCSS(cssBundle: string | null) {
  useEffect(() => {
    if (!cssBundle || loadedBundles.has(cssBundle)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/comic-css/${cssBundle}`;
    link.id = `comic-css-${cssBundle}`;
    document.head.appendChild(link);
    loadedBundles.add(cssBundle);
  }, [cssBundle]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Cluster Selection Screen
──────────────────────────────────────────────────────────────────────────────*/
function ClusterSelector({ concept, onSelect }: { concept: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', background: '#08080f' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '28px' }}
      >
        <div style={{
          fontFamily: 'Impact, sans-serif',
          fontSize: '13px',
          letterSpacing: '4px',
          color: '#666',
          marginBottom: '8px',
          textTransform: 'uppercase'
        }}>
          📖 CHOOSE YOUR COMIC UNIVERSE
        </div>
        <div style={{
          fontFamily: "'Comic Sans MS', cursive",
          fontSize: '20px',
          color: '#fff',
          fontWeight: 'bold'
        }}>
          "{concept}"
        </div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '6px', fontFamily: 'monospace' }}>
          Select a universe — your story will be told in that style
        </div>
      </motion.div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '14px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {CLUSTERS.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(c.id)}
            style={{
              background: c.color,
              border: `3px solid ${c.accent}`,
              borderRadius: '12px',
              padding: '18px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: `0 0 20px ${c.accent}33, 4px 4px 0 #000`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Glow layer */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at 30% 30%, ${c.accent}20, transparent 70%)`,
              pointerEvents: 'none'
            }} />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{c.emoji}</div>
            <div style={{
              fontFamily: 'Impact, sans-serif',
              fontSize: '15px',
              color: c.accent,
              letterSpacing: '1px',
              marginBottom: '6px'
            }}>
              {c.name.toUpperCase()}
            </div>
            <div style={{
              fontFamily: "'Comic Sans MS', cursive",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: '1.4'
            }}>
              {c.description}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Comic Panel
──────────────────────────────────────────────────────────────────────────────*/
function ComicPanel({ panel, index, cluster, isActive }: { panel: any; index: number; cluster: string; isActive?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current && panel.html) {
      containerRef.current.innerHTML = panel.html;
    }
  }, [panel.html]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: isActive ? 1.02 : 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
      className={`comic-universe-${cluster}`}
      style={{ 
        borderRadius: '12px', overflow: 'hidden', minHeight: '320px',
        boxShadow: isActive ? '0 0 20px 5px rgba(255, 255, 255, 0.4)' : 'none',
        border: isActive ? '3px solid #fff' : 'none',
        zIndex: isActive ? 10 : 1
      }}
      ref={containerRef}
    />
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
   Loading screen shown while generating
──────────────────────────────────────────────────────────────────────────────*/
function ComicGenerating({ cluster }: { cluster: string }) {
  const meta = CLUSTERS.find(c => c.id === cluster) || CLUSTERS[0];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: meta.color, gap: '20px', padding: '40px'
    }}>
      <motion.div
        animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ fontSize: '64px' }}
      >
        {meta.emoji}
      </motion.div>
      <div style={{
        fontFamily: 'Impact, sans-serif', fontSize: '22px',
        color: meta.accent, letterSpacing: '3px', textTransform: 'uppercase',
        textShadow: `0 0 20px ${meta.accent}88`
      }}>
        GENERATING YOUR COMIC...
      </div>
      <div style={{
        fontFamily: "'Comic Sans MS', cursive",
        color: 'rgba(255,255,255,0.6)', fontSize: '14px', textAlign: 'center'
      }}>
        {meta.name} universe is assembling your story panel by panel...
      </div>
      {/* Animated dots */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.3 }}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: meta.accent }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main ComicRenderer
──────────────────────────────────────────────────────────────────────────────*/
const ComicRenderer = ({ data }: { data: any }) => {
  const content = data?.content;

  // State
  const [selectedCluster, setSelectedCluster] = useState<string | null>(
    content?.cluster && !content?.needs_selection ? content.cluster : null
  );
  const [allPages, setAllPages] = useState<any[][]>(
    content?.panels?.length > 0 ? [content.panels] : []
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isFinished, setIsFinished] = useState(content?.is_finished ?? false);
  const [cssBundle, setCssBundle] = useState<string | null>(content?.css_bundle || null);
  
  const [autoPlay, setAutoPlay] = useState(false);
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useClusterCSS(cssBundle);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      setVoices(synth.getVoices());
    };
    updateVoices();
    synth.onvoiceschanged = updateVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  // When data comes in from backend (after cluster selection triggers generation)
  useEffect(() => {
    if (content?.panels && allPages.length === 0) {
      setAllPages([content.panels]);
      setSelectedCluster(content.cluster);
      setCssBundle(content.css_bundle);
      setIsFinished(content.is_finished ?? false);
    }
  }, [content]);

  const handleClusterSelect = async (clusterId: string) => {
    setSelectedCluster(clusterId);
    setCssBundle(`${clusterId}.css`);
    setIsLoadingNext(true);
    try {
      const concept = data?.concept || '';
      const nextData = await generateComicPage(concept, clusterId, 1, "");
      if (nextData.panels?.length > 0) {
        setAllPages([nextData.panels]);
        setCurrentPage(0);
        setIsFinished(nextData.is_finished ?? false);
        if (nextData.css_bundle) setCssBundle(nextData.css_bundle);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      console.error('Initial comic generation failed:', err);
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handleNextPage = useCallback(async () => {
    if (allPages.length >= MAX_PAGES) {
      setIsFinished(true);
      return;
    }
    if (isLoadingNext || isFinished || !selectedCluster) return;
    setIsLoadingNext(true);
    try {
      const concept = data?.concept || '';
      const storySoFar = allPages.flat()
        .map((p: any) => p.dialogue)
        .join(' | ');

      const nextData = await generateComicPage(
        concept,
        selectedCluster,
        allPages.length + 1,
        storySoFar.slice(0, 800)
      );
      if (nextData.panels?.length > 0) {
        setAllPages(prev => {
          const newPages = [...prev, nextData.panels];
          if (newPages.length >= MAX_PAGES) setIsFinished(true);
          return newPages;
        });
        setCurrentPage(prev => prev + 1);
        setIsFinished(nextData.is_finished ?? false);
        if (nextData.css_bundle) setCssBundle(nextData.css_bundle);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      console.error('Comic page generation failed:', err);
    } finally {
      setIsLoadingNext(false);
    }
  }, [isLoadingNext, isFinished, selectedCluster, allPages, data]);

  const currentPanels = allPages[currentPage] || [];

  // AutoPlay effect
  useEffect(() => {
    if (!autoPlay || !currentPanels || currentPanels.length === 0 || isLoadingNext) {
      window.speechSynthesis.cancel();
      return;
    }

    const speakPanel = async () => {
      if (activePanelIndex >= currentPanels.length) {
        // Page is done. Wait a bit, then proceed.
        setTimeout(async () => {
          if (currentPage >= MAX_PAGES - 1) {
            setIsFinished(true);
            setAutoPlay(false);
          } else if (currentPage < allPages.length - 1) {
            setCurrentPage(p => p + 1);
            setActivePanelIndex(0);
          } else if (!isFinished) {
            await handleNextPage();
            setActivePanelIndex(0);
          } else {
            setAutoPlay(false);
          }
        }, 1000);
        return;
      }

      // Cancel any ongoing speech before starting a new one
      window.speechSynthesis.cancel();
      
      const panel = currentPanels[activePanelIndex];
      let cleanDialogue = (panel.dialogue || '').replace(/[*_]/g, '').trim();
      
      // Remove surrounding quotes if any
      if (cleanDialogue.startsWith('"') && cleanDialogue.endsWith('"')) {
        cleanDialogue = cleanDialogue.slice(1, -1);
      }
      
      const characterName = (panel.character || 'Narrator').replace(/[-_]/g, ' ').trim();
      
      // Strip prefix like "Batman: " or "Batman says: " or "Batman - " case-insensitively
      const escapedName = characterName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const prefixRegex = new RegExp(`^${escapedName}\\s*(?:says)?\\s*[:\\-]\\s*`, 'i');
      if (prefixRegex.test(cleanDialogue)) {
        cleanDialogue = cleanDialogue.replace(prefixRegex, '').trim();
      }
      
      // Remove surrounding quotes again if they were inside the prefix
      if (cleanDialogue.startsWith('"') && cleanDialogue.endsWith('"')) {
        cleanDialogue = cleanDialogue.slice(1, -1);
      }
      
      const text = `${characterName} says: ${cleanDialogue}`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      // PREVENT CHROME GARBAGE COLLECTION BUG
      utteranceRef.current = utterance;
      
      const voice = getVoiceForCharacter(panel.character || '', voices);
      if (voice) {
        utterance.voice = voice;
        console.log(`[TTS] Speaking as ${characterName} using voice: ${voice.name}`);
      }

      utterance.onend = () => {
        utteranceRef.current = null;
        setActivePanelIndex(prev => prev + 1);
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.error("Speech error", e);
        utteranceRef.current = null;
        // Wait 2 seconds before advancing to prevent rapid-fire error loops
        setTimeout(() => {
          setActivePanelIndex(prev => prev + 1);
        }, 2000);
      };

      // Slight delay to ensure cancel() has processed
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    };

    const timer = setTimeout(speakPanel, 500);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, [autoPlay, activePanelIndex, currentPage, allPages, isLoadingNext, isFinished, handleNextPage]);

  /* ── Cluster selector screen ──────────────────────────────────────────── */
  if (!selectedCluster && (!content?.panels || content?.needs_selection)) {
    return (
      <ClusterSelector
        concept={data?.concept || 'the concept'}
        onSelect={handleClusterSelect}
      />
    );
  }

  /* ── Loading while generating ─────────────────────────────────────────── */
  if (selectedCluster && allPages.length === 0) {
    return <ComicGenerating cluster={selectedCluster} />;
  }

  /* ── Comic panels error ───────────────────────────────────────────────── */
  if (!content && allPages.length === 0) {
    return (
      <div style={{ padding: '32px', color: '#ef233c', fontFamily: 'monospace' }}>
        [ ERROR: INVALID COMIC CORE MATRIX DATA ]
      </div>
    );
  }

  const cluster = selectedCluster || content?.cluster || 'dc_justice';
  const clusterMeta = CLUSTERS.find(c => c.id === cluster) || CLUSTERS[0];
  const maxReached = allPages.length >= MAX_PAGES;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#08080f', overflowY: 'auto' }}>

      {/* Title bar */}
      <div style={{
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: `2px solid ${clusterMeta.accent}33`,
        background: clusterMeta.color,
        flexShrink: 0
      }}>
        <span style={{ fontSize: '24px' }}>{clusterMeta.emoji}</span>
        <div>
          <div style={{
            fontFamily: 'Impact, sans-serif', fontSize: '16px',
            color: clusterMeta.accent, letterSpacing: '2px'
          }}>
            {(content?.title || clusterMeta.name).toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            PAGE {currentPage + 1} · {clusterMeta.name} Universe
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Page dots */}
          {allPages.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setCurrentPage(i)}
              whileHover={{ scale: 1.3 }}
              style={{
                width: i === currentPage ? '24px' : '10px',
                height: '10px',
                borderRadius: '5px',
                background: i === currentPage ? clusterMeta.accent : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Comic panels grid (2×2) */}
      <div style={{
        flex: 1, padding: '20px', display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '16px',
        minHeight: '0'
      }}>
        <AnimatePresence>
          {currentPanels.map((panel: any, i: number) => (
            <ComicPanel
              key={`${currentPage}-${i}`}
              panel={panel}
              index={i}
              cluster={cluster}
              isActive={autoPlay && i === activePanelIndex}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation bar */}
      <div style={{
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderTop: `2px solid ${clusterMeta.accent}22`,
        background: 'rgba(0,0,0,0.4)',
        flexShrink: 0
      }}>
        <motion.button
          onClick={() => { setAutoPlay(!autoPlay); setActivePanelIndex(0); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: autoPlay ? clusterMeta.accent : '#222',
            color: autoPlay ? '#000' : clusterMeta.accent,
            border: `3px solid ${clusterMeta.accent}`,
            borderRadius: '8px', padding: '10px 16px',
            fontFamily: 'Impact, sans-serif', fontSize: '14px', letterSpacing: '1px',
            cursor: 'pointer',
            boxShadow: `4px 4px 0 #000`,
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          {autoPlay ? '⏸ STOP AUTO' : '▶ AUTO PLAY'}
        </motion.button>

        <motion.button
          onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); setAutoPlay(false); }}
          disabled={currentPage === 0}
          whileHover={currentPage > 0 ? { scale: 1.05 } : {}}
          whileTap={currentPage > 0 ? { scale: 0.95 } : {}}
          style={{
            background: currentPage > 0 ? clusterMeta.color : '#222',
            color: currentPage > 0 ? clusterMeta.accent : '#444',
            border: `3px solid ${currentPage > 0 ? clusterMeta.accent : '#333'}`,
            borderRadius: '8px', padding: '10px 20px',
            fontFamily: 'Impact, sans-serif', fontSize: '14px', letterSpacing: '1px',
            cursor: currentPage > 0 ? 'pointer' : 'not-allowed',
            boxShadow: currentPage > 0 ? `4px 4px 0 #000` : 'none',
          }}
        >
          ◀ PREV
        </motion.button>

        <div style={{
          flex: 1, textAlign: 'center',
          fontFamily: 'Impact, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.4)', letterSpacing: '2px'
        }}>
          PAGE {currentPage + 1} OF {Math.max(allPages.length, MAX_PAGES)}
          {!isFinished && !maxReached && <span style={{ color: clusterMeta.accent, marginLeft: '8px' }}>• MORE STORY AVAILABLE</span>}
          {maxReached && <span style={{ color: '#ef233c', marginLeft: '8px' }}>• MAX PAGES REACHED</span>}
        </div>

        {currentPage < allPages.length - 1 ? (
          <motion.button
            onClick={() => { setCurrentPage(p => p + 1); setAutoPlay(false); }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              background: clusterMeta.color, color: clusterMeta.accent,
              border: `3px solid ${clusterMeta.accent}`, borderRadius: '8px',
              padding: '10px 20px', fontFamily: 'Impact, sans-serif',
              fontSize: '14px', letterSpacing: '1px', cursor: 'pointer',
              boxShadow: '4px 4px 0 #000',
            }}
          >
            NEXT ▶
          </motion.button>
        ) : (
          <motion.button
            onClick={handleNextPage}
            disabled={isFinished || isLoadingNext || maxReached}
            whileHover={!isFinished && !isLoadingNext && !maxReached ? { scale: 1.05 } : {}}
            whileTap={!isFinished && !isLoadingNext && !maxReached ? { scale: 0.95 } : {}}
            animate={isLoadingNext ? { opacity: [1, 0.5, 1] } : {}}
            transition={isLoadingNext ? { repeat: Infinity, duration: 1 } : {}}
            style={{
              background: isFinished || maxReached ? '#222' : clusterMeta.color,
              color: isFinished || maxReached ? '#444' : clusterMeta.accent,
              border: `3px solid ${isFinished || maxReached ? '#333' : clusterMeta.accent}`,
              borderRadius: '8px', padding: '10px 20px',
              fontFamily: 'Impact, sans-serif', fontSize: '14px', letterSpacing: '1px',
              cursor: isFinished || isLoadingNext || maxReached ? 'not-allowed' : 'pointer',
              boxShadow: !isFinished && !maxReached ? '4px 4px 0 #000' : 'none',
            }}
          >
            {isLoadingNext ? '⏳ GENERATING...' : (isFinished || maxReached) ? '✅ THE END' : 'NEXT PAGE ▶'}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default ComicRenderer;
