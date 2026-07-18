import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemeBlock {
  type: "text" | "meme";
  content?: string;
  image_url?: string;
  title?: string;
  url?: string;
  image_caption?: string;
}

interface MemeArticle {
  title: string;
  blocks: MemeBlock[];
}

interface MemeRendererProps {
  data: any;
}

export default function MemeRenderer({ data }: MemeRendererProps) {
  const article = data?.content as MemeArticle;
  const [visibleBlocks, setVisibleBlocks] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      if (allVoices.length > 0 && !selectedVoiceName) {
        const enVoices = allVoices.filter(v => v.lang.startsWith('en'));
        const stableVoices = enVoices.filter(v => !v.name.includes('Online'));
        const defaultVoice = allVoices.find(v => v.name.includes('William'))
          || stableVoices.find(v => v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Hazel') || v.name.includes('Google') || v.name.includes('Mark')) 
          || stableVoices[0] 
          || enVoices[0] 
          || allVoices[0];
        if (defaultVoice) {
          setSelectedVoiceName(defaultVoice.name);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceName]);

  useEffect(() => {
    if (!article?.blocks || !autoPlay || voices.length === 0) {
      window.speechSynthesis.cancel();
      return;
    }

    if (visibleBlocks >= article.blocks.length) return;

    const currentBlock = article.blocks[visibleBlocks - 1];

    if (currentBlock.type === 'text') {
      window.speechSynthesis.cancel();
      
      // Strip HTML tags for speech
      const cleanText = (currentBlock.content || "").replace(/<[^>]*>?/gm, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;
      
      const voiceToUse = voices.find(v => v.name === selectedVoiceName) || voices.find(v => v.lang.startsWith('en'));
      
      if (voiceToUse) {
        utterance.voice = voiceToUse;
        utterance.lang = voiceToUse.lang;
        console.log('[TTS] Speaking using voice:', voiceToUse.name, 'lang:', voiceToUse.lang);
      }

      utterance.onend = () => {
        utteranceRef.current = null;
        setVisibleBlocks(prev => prev + 1);
      };
      
      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        utteranceRef.current = null;
        setTimeout(() => setVisibleBlocks(prev => prev + 1), 2000);
      };

      setTimeout(() => window.speechSynthesis.speak(utterance), 50);
      
    } else {
      // It's a meme block. Wait 3 seconds then proceed.
      const timer = setTimeout(() => {
        setVisibleBlocks(prev => prev + 1);
      }, 4000); // 4 seconds to enjoy the meme
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [visibleBlocks, autoPlay, article, voices, selectedVoiceName]);

  useEffect(() => {
    // Scroll to bottom when a new block appears
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleBlocks]);

  if (!article?.blocks) return null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#fff',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid #333',
        background: 'linear-gradient(90deg, #2b1055, #7597de)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', flex: 1, minWidth: '200px' }}>
          {article.title || "Meme Time"}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {voices.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', opacity: 0.8 }}>record_voice_over</span>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  outline: 'none',
                  maxWidth: '250px'
                }}
              >
                {voices
                  .filter(v => v.lang.startsWith('en'))
                  .map((v) => (
                    <option key={v.name} value={v.name} style={{ background: '#1a1a1a', color: '#fff' }}>
                      {v.name} {v.localService ? '(Local)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <button 
            onClick={() => setAutoPlay(!autoPlay)}
            style={{
              background: autoPlay ? '#e53935' : '#4caf50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '24px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}
          >
            <span className="material-symbols-outlined">
              {autoPlay ? 'pause' : 'play_arrow'}
            </span>
            {autoPlay ? 'PAUSE STORY' : 'PLAY STORY'}
          </button>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          scrollBehavior: 'smooth'
        }}
      >
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <AnimatePresence>
            {article.blocks.slice(0, visibleBlocks).map((block, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                style={{ width: '100%' }}
              >
                {block.type === 'text' ? (
                  <div style={{
                    padding: '24px',
                    background: '#2d2d2d',
                    borderRadius: '16px',
                    fontSize: '18px',
                    lineHeight: '1.6',
                    borderLeft: '4px solid #7597de',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                  }} dangerouslySetInnerHTML={{ __html: block.content || "" }} />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#fff',
                    color: '#000',
                    padding: '16px',
                    paddingBottom: '32px',
                    borderRadius: '4px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                    transform: `rotate(${i % 2 === 0 ? 1 : -1}deg)`,
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02) rotate(0deg)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = `scale(1) rotate(${i % 2 === 0 ? 1 : -1}deg)`}
                  onClick={() => window.open(block.url, '_blank')}
                  >
                    <img 
                      src={block.image_url} 
                      alt={block.title} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '500px', 
                        objectFit: 'contain',
                        border: '1px solid #ddd' 
                      }} 
                    />
                    <div style={{ 
                      marginTop: '16px', 
                      fontFamily: "'Comic Sans MS', cursive, sans-serif",
                      fontSize: '20px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      {block.title}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {visibleBlocks < article.blocks.length && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#7597de' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
