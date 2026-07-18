import React from 'react';
import type { Session } from '../../types/chat';

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  activeFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
}

const CONCEPTS = [
  { id: 'REELS', label: 'Reels', icon: 'smart_display' },
  { id: 'GAME', label: 'Gaming', icon: 'sports_esports' },
  { id: 'COMIC', label: 'Comics', icon: 'auto_stories' },
  { id: 'BROWSER', label: 'Browser', icon: 'web' },
  { id: 'MEME', label: 'Meme', icon: 'sentiment_very_satisfied' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  activeFolder,
  onSelectFolder,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}) => {
  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-surface-container-low border-r border-[#080808] p-4 shrink-0 font-mono">
      {/* Brand Header */}
      <div className="mb-6 px-2 fade-in-slide flex flex-col gap-1">
        <div className="font-label-caps text-primary-fixed-dim tracking-widest flex items-center gap-2 text-[14px]">
          <span className="material-symbols-outlined text-[20px]">terminal</span>
          The way Gen_Z learn's
        </div>
      </div>

      {/* Sessions / Folders Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {!activeFolder ? (
          <>
            <div className="text-on-surface-variant font-label-caps text-[10px] px-2 mb-2 tracking-wider opacity-60">
              [ CONCEPT_FOLDERS ]
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {CONCEPTS.map((concept) => (
                <div
                  key={concept.id}
                  className="group flex items-center justify-between p-2 text-[12px] font-label-caps transition-all text-on-surface-variant hover:bg-surface-container-high hover:text-primary-fixed-dim cursor-pointer"
                  onClick={() => onSelectFolder(concept.id)}
                >
                  <span className="truncate pr-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">
                      {concept.icon}
                    </span>
                    {concept.label}
                  </span>
                  <span className="material-symbols-outlined text-[14px] opacity-50 group-hover:opacity-100 transition-opacity">
                    chevron_right
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => onSelectFolder(null)}
                className="w-full text-left text-on-surface-variant hover:text-primary-fixed-dim p-2 flex items-center gap-2 transition-colors cursor-pointer text-[11px] font-label-caps"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to Folders
              </button>
              <button
                onClick={onNewChat}
                className="w-full text-left font-bold text-primary-fixed-dim border-l-2 border-primary-fixed-dim bg-surface-container p-2 flex items-center gap-3 transition-all hover:brightness-110 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span className="text-[12px] font-label-caps">New Chat</span>
              </button>
            </div>

            <div className="text-on-surface-variant font-label-caps text-[10px] px-2 mb-2 tracking-wider opacity-60 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px]">folder_open</span>
              [ {CONCEPTS.find(c => c.id === activeFolder)?.label.toUpperCase()} SESSIONS ]
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {sessions.length === 0 ? (
                <div className="text-on-surface-variant/40 text-[10px] italic px-2 py-4">
                  EMPTY FOLDER
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.id === currentSessionId;
                  return (
                    <div
                      key={session.id}
                      className={`group flex items-center justify-between p-2 text-[12px] font-label-caps transition-all ${isActive
                        ? 'bg-surface-container text-primary-fixed-dim border-l-2 border-primary-fixed-dim'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary-fixed-dim cursor-pointer'
                        }`}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <span className="truncate pr-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">
                          chat_bubble_outline
                        </span>
                        {session.name || 'Untitled Generation'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 cursor-pointer transition-opacity"
                        title="Delete Session"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          delete
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

    </aside>
  );
};

export default Sidebar;
