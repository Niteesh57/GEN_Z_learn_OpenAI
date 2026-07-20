import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createReelNarration, generateComicPage } from '../../services/api';
import { narrationVoiceFor } from '../../constants/narrationVoices';
import '../../assets/comic-css/original-comics.css';

const MAX_PAGES = 4;


/* ─────────────────────────────────────────────────────────────────────────────
   Cluster metadata (matches backend CLUSTER_ROSTER)
──────────────────────────────────────────────────────────────────────────────*/
const CLUSTERS = [
  { id: 'byte_hero',          name: 'Byte Hero',          emoji: '⚡', color: '#3f2a9b', accent: '#ffe26e', description: 'HeroVerse learning power-ups' },
  { id: 'pixel_bot',          name: 'Pixel Bot',          emoji: '🤖', color: '#006d70', accent: '#9ff6e8', description: 'Robot Academy builds ideas' },
  { id: 'nova_alien',         name: 'Nova Alien',         emoji: '👾', color: '#54258b', accent: '#ffb3f2', description: 'Alien Adventures, one discovery at a time' },
  { id: 'fox_genius',         name: 'Fox Genius',         emoji: '🦊', color: '#a84122', accent: '#ffd69a', description: 'Fairy Tales and clever clues' },
  { id: 'professor_panda',    name: 'Professor Panda',    emoji: '🐼', color: '#0d5d49', accent: '#d1f7b5', description: 'Super Squad learning missions' },
  { id: 'wise_owl',           name: 'Wise Owl',           emoji: '🦉', color: '#704018', accent: '#ffdc99', description: 'Mystery Town evidence trails' },
  { id: 'captain_cloud',      name: 'Captain Cloud',      emoji: '🦾', color: '#145ca5', accent: '#bceeff', description: 'Space Explorers map the route' },
  { id: 'code_dragon',        name: 'Code Dragon',        emoji: '🐉', color: '#942347', accent: '#ffbdd2', description: 'Ninja Academy practice paths' },
  { id: 'hero_verse',         name: 'HeroVerse',          emoji: '🦸', color: '#3f2a9b', accent: '#ffe26e', description: 'Original hero-led learning' },
  { id: 'super_squad',        name: 'Super Squad',        emoji: '🌟', color: '#0d5d49', accent: '#d1f7b5', description: 'A team challenge for each lesson' },
  { id: 'fairy_tales',        name: 'Fairy Tales',        emoji: '🪄', color: '#9f3d7c', accent: '#ffd0ed', description: 'Story magic makes concepts memorable' },
  { id: 'cat_vs_mouse',       name: 'Cat vs Mouse',       emoji: '🐾', color: '#b94f27', accent: '#ffe0a3', description: 'A playful original puzzle chase' },
  { id: 'alien_morph',        name: 'Alien Morph',        emoji: '🛸', color: '#54258b', accent: '#ffb3f2', description: 'Transform a mystery into a clear answer' },
  { id: 'mystery_town',       name: 'Mystery Town',       emoji: '🔎', color: '#704018', accent: '#ffdc99', description: 'Trace the clues to learn why' },
  { id: 'stunt_rider',        name: 'Stunt Rider',        emoji: '🏍️', color: '#aa3918', accent: '#ffd19b', description: 'Fast, safe steps through tough topics' },
  { id: 'cyber_runner',       name: 'Cyber Runner',       emoji: '💠', color: '#006d70', accent: '#9ff6e8', description: 'Race through a clear data route' },
  { id: 'superhero_universe', name: 'Superhero Universe', emoji: '🦸', color: '#3f2a9b', accent: '#ffe26e', description: 'Original superhero study mission' },
  { id: 'fantasy_kingdom',    name: 'Fantasy Kingdom',    emoji: '🧙', color: '#9f3d7c', accent: '#ffd0ed', description: 'An original kingdom of ideas' },
  { id: 'robot_academy',      name: 'Robot Academy',      emoji: '🤖', color: '#006d70', accent: '#9ff6e8', description: 'Build knowledge block by block' },
  { id: 'alien_adventures',   name: 'Alien Adventures',   emoji: '👽', color: '#54258b', accent: '#ffb3f2', description: 'Explore a new learning planet' },
  { id: 'mystery_detectives', name: 'Mystery Detectives', emoji: '🕵️', color: '#704018', accent: '#ffdc99', description: 'Investigate the learning clues' },
  { id: 'pirate_legends',     name: 'Pirate Legends',     emoji: '🏴‍☠️', color: '#0d5d49', accent: '#d1f7b5', description: 'Navigate a knowledge treasure map' },
  { id: 'space_explorers',    name: 'Space Explorers',    emoji: '🚀', color: '#145ca5', accent: '#bceeff', description: 'Launch a guided learning voyage' },
  { id: 'ninja_academy',      name: 'Ninja Academy',      emoji: '⚔️', color: '#942347', accent: '#ffbdd2', description: 'Practice precise learning moves' },
];
const CLUSTER_IDS = new Set(CLUSTERS.map(cluster => cluster.id));

/* ─────────────────────────────────────────────────────────────────────────────
   CSS Bundle loader — lazy-loads cluster CSS once per session
──────────────────────────────────────────────────────────────────────────────*/
function useClusterCSS(_cssBundle: string | null) {
  // Original comic CSS is bundled with the renderer.  Keeping this hook lets
  // existing response payloads remain compatible without loading old bundles.
  useEffect(() => undefined, []);
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
          📖 CHOOSE YOUR ORIGINAL COMIC TEMPLATE
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
          Select a colourful template — your story will be told in that style
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
  const isSupportedContent = Boolean(content?.cluster && CLUSTER_IDS.has(content.cluster));

  // State
  const [selectedCluster, setSelectedCluster] = useState<string | null>(
    isSupportedContent && !content?.needs_selection ? content.cluster : null
  );
  const [allPages, setAllPages] = useState<any[][]>(
    isSupportedContent && content?.panels?.length > 0 ? [content.panels] : []
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isFinished, setIsFinished] = useState(content?.is_finished ?? false);
  const [cssBundle, setCssBundle] = useState<string | null>(content?.css_bundle || null);
  
  const [autoPlay, setAutoPlay] = useState(true);
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useClusterCSS(cssBundle);

  // When data comes in from backend (after cluster selection triggers generation)
  useEffect(() => {
    if (isSupportedContent && content?.panels && allPages.length === 0) {
      setAllPages([content.panels]);
      setSelectedCluster(content.cluster);
      setCssBundle(content.css_bundle);
      setIsFinished(content.is_finished ?? false);
    }
  }, [content, isSupportedContent, allPages.length]);

  const handleClusterSelect = async (clusterId: string) => {
    setSelectedCluster(clusterId);
    setCssBundle('original-comics.css');
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
      return;
    }

    let disposed = false;
    let audioUrl: string | null = null;
    const requestController = new AbortController();

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

      const panel = currentPanels[activePanelIndex];
      let cleanDialogue = (panel.dialogue || '').replace(/[*_]/g, '').trim();
      
      // Remove surrounding quotes if any
      if (cleanDialogue.startsWith('"') && cleanDialogue.endsWith('"')) {
        cleanDialogue = cleanDialogue.slice(1, -1);
      }
      
      const characterName = (panel.character_name || panel.character || 'Narrator').replace(/[-_]/g, ' ').trim();
      
      // Strip an optional narrator prefix such as "Byte Hero says: ".
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
      const characterGender = panel.character_gender === 'female' ? 'female' : 'male';
      const narrator = narrationVoiceFor(characterGender, panel.character || characterName);

      try {
        audioUrl = await createReelNarration(text, narrator.id, requestController.signal);
        if (disposed || !audioUrl) return;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          if (!disposed) setActivePanelIndex(prev => prev + 1);
        };
        audio.onerror = () => {
          if (!disposed) window.setTimeout(() => setActivePanelIndex(prev => prev + 1), 900);
        };
        await audio.play();
      } catch {
        if (!disposed && !requestController.signal.aborted) {
          window.setTimeout(() => setActivePanelIndex(prev => prev + 1), 900);
        }
      }
    };

    const timer = setTimeout(speakPanel, 500);

    return () => {
      disposed = true;
      requestController.abort();
      clearTimeout(timer);
      const audio = audioRef.current;
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audioRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [autoPlay, activePanelIndex, currentPage, allPages, isLoadingNext, isFinished, handleNextPage]);

  /* ── Cluster selector screen ──────────────────────────────────────────── */
  if (!selectedCluster && (!isSupportedContent || !content?.panels || content?.needs_selection)) {
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

  const cluster = selectedCluster || content?.cluster || 'byte_hero';
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
