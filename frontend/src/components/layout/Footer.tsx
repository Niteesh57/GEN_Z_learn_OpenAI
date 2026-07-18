import React from 'react';
import { useClock } from '../../hooks/useClock';

interface FooterProps {
  graphicsEra?: '1990s' | '2000s' | '2026s';
}

export const Footer: React.FC<FooterProps> = ({ graphicsEra = '1990s' }) => {
  const clock = useClock();

  if (graphicsEra === '2000s') {
    return (
      <footer className="h-6 win95-raised flex items-center justify-between px-2 shrink-0 border-t border-[#808080] font-mono select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 win95-sunken px-2 h-4">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] text-on-surface uppercase leading-none font-bold">READY</span>
          </div>
          <div className="win95-sunken px-2 h-4 flex items-center">
            <span className="text-[10px] text-on-surface uppercase leading-none">Thread: 0x4012</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="win95-sunken px-2 h-4 flex items-center">
            <span className="text-[10px] text-on-surface uppercase leading-none">
              [ SYSTEM TIMESTAMP: <span>{clock || '00:00:00'}</span> ]
            </span>
          </div>
          <div className="win95-sunken px-2 h-4 flex items-center w-24">
            <span className="text-[10px] text-on-surface uppercase leading-none">v1.0.4-STABLE</span>
          </div>
        </div>
      </footer>
    );
  }

  if (graphicsEra === '2026s') {
    return (
      <footer className="genz-status-footer h-10 flex items-center justify-between px-6 shrink-0 font-sans select-none">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] text-[#1f1b10] font-semibold font-label-caps tracking-wider">SYSTEM NOMINAL</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#6b644d]">
          <span>PORT: 8000</span>
          <span>•</span>
          <span>{clock || '00:00:00'}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="h-12 bg-surface-container-low border-t border-[#2a2a2a] flex items-center justify-between px-6 shrink-0 relative z-10 font-mono">
      <div className="flex items-center gap-4">
        <div className="w-3 h-3 rounded-full bg-primary-fixed-dim shadow-[0_0_5px_var(--theme-primary)] pulse-glow"></div>
        <span className="text-[10px] font-label-caps text-on-surface-variant">READY</span>
      </div>
      <div className="text-[10px] font-label-caps text-on-surface-variant">
        [ SYSTEM TIMESTAMP: <span id="clock">{clock || '00:00:00'}</span> ]
      </div>
    </footer>
  );
};

export default Footer;
