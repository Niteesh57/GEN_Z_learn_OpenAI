import React from 'react';
import { RetroButton } from '../ui/RetroButton';

interface ChatInputProps {
  concept: string;
  setConcept: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  variant?: 'large' | 'compact';
}

export const ChatInput: React.FC<ChatInputProps> = ({
  concept,
  setConcept,
  onSubmit,
  loading,
  variant = 'large',
}) => {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (concept.trim() && !loading) {
        onSubmit({ preventDefault: () => {} } as React.FormEvent);
      }
    }
  };

  if (variant === 'compact') {
    return (
      <div className="w-full max-w-2xl flex flex-col gap-2 font-mono">
        <form onSubmit={onSubmit} className="w-full">
          <div className="bevel-sunken chat-input-pill rounded-full bg-surface-container-lowest py-2 px-4 flex items-center gap-3 focus-within:border-primary-fixed-dim/40 transition-colors border border-transparent">
            {/* Mock Add Icon */}
            <button
              type="button"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-primary-fixed-dim cursor-pointer text-[16px] transition-colors font-bold select-none shrink-0"
            >
              +
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-grow bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-[#1f1b10] placeholder:text-[#766b50] placeholder:opacity-100 text-[13px] p-0"
              placeholder="Ask anything..."
            />

            {/* Matrix animation when typing */}
            {concept.length > 0 && (
              <div className="p-1 text-primary-fixed-dim shrink-0 flex items-center justify-center w-[26px] h-[26px]">
                <div className="flex gap-[2px] h-[16px] overflow-hidden text-[9px] font-mono select-none leading-none opacity-85">
                  <div className="matrix-column-1 flex flex-col">
                    <span>1</span><span>0</span><span>1</span><span>0</span>
                  </div>
                  <div className="matrix-column-2 flex flex-col">
                    <span>0</span><span>1</span><span>0</span><span>1</span>
                  </div>
                  <div className="matrix-column-3 flex flex-col">
                    <span>1</span><span>1</span><span>0</span><span>0</span>
                  </div>
                </div>
              </div>
            )}

            {/* Exec/Send Button */}
            <button
              type="submit"
              disabled={loading || !concept.trim()}
              className="w-7 h-7 rounded-full bg-primary-fixed-dim text-on-primary-fixed flex items-center justify-center cursor-pointer transition-transform duration-75 select-none disabled:opacity-30 disabled:cursor-not-allowed text-[16px] hover:brightness-110 active:scale-95 shrink-0"
            >
              {loading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">
                  sync
                </span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">
                  arrow_upward
                </span>
              )}
            </button>
          </div>
        </form>

      </div>
    );
  }

  // Large rendering (Original welcome screen input)
  return (
    <div className="w-full max-w-3xl flex flex-col gap-6 fade-in-slide font-mono">
      <form onSubmit={onSubmit} className="relative w-full">
        <div className="bevel-sunken chat-input-large-panel bg-surface-container-lowest p-4 md:p-6 shadow-inner border border-transparent focus-within:border-primary-fixed-dim/50 transition-colors group">
          <textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-[#1f1b10] font-body-lg text-body-lg placeholder:text-[#766b50] placeholder:opacity-100 resize-none h-24 outline-none border-0"
            placeholder="Type your command or question here... (e.g. OAuth, Kubernetes, ThreadPoolExecutor)"
          />
          <div className="flex justify-between items-center mt-2 border-t border-[#1a1a1a] pt-4">
            {concept.length > 0 && (
              <div className="flex gap-2 items-center">
                <div className="p-2 text-primary-fixed-dim flex items-center justify-center w-[36px] h-[36px]" title="Keyboard Matrix Active">
                  <div className="flex gap-[3px] h-[20px] overflow-hidden text-[11px] font-mono select-none leading-none opacity-90">
                    <div className="matrix-column-1 flex flex-col">
                      <span>1</span><span>0</span><span>1</span><span>0</span>
                    </div>
                    <div className="matrix-column-2 flex flex-col">
                      <span>0</span><span>1</span><span>0</span><span>1</span>
                    </div>
                    <div className="matrix-column-3 flex flex-col">
                      <span>1</span><span>1</span><span>0</span><span>0</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <RetroButton
              type="submit"
              disabled={loading || !concept.trim()}
              pulseGlow={!loading && concept.trim().length > 0}
            >
              {loading ? (
                <>
                  FORGING
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    sync
                  </span>
                </>
              ) : (
                <>
                  EXECUTE
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </>
              )}
            </RetroButton>
          </div>
        </div>
      </form>

    </div>
  );
};

export default ChatInput;
