import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameLevel } from '../../../types/chat';
import { useGraphicsEra } from '../../../hooks/useGraphicsEra';

interface Props { level: GameLevel; onWin: () => void; }
type RawEdge = { from_node: string; to_node: string; correct: boolean; label: string };
type Edge = RawEdge & { connected: boolean };
const pairKey = (first: string, second: string) => [first, second].sort().join('\u0000');

export default function CircuitConnectGame({ level, onWin }: Props) {
  const era = useGraphicsEra();
  const rawItems = level.items as RawEdge[];
  const nodeIds = useMemo(() => Array.from(new Set(rawItems.flatMap((edge) => [edge.from_node, edge.to_node]))), [rawItems]);
  const positions = useMemo(() => Object.fromEntries(nodeIds.map((id, index) => {
    const angle = (index / nodeIds.length) * Math.PI * 2 - Math.PI / 2;
    return [id, { x: 50 + 35 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) }];
  })) as Record<string, { x: number; y: number }>, [nodeIds]);
  const [edges, setEdges] = useState<Edge[]>(() => rawItems.map((edge) => ({ ...edge, connected: false })));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [wrongEdge, setWrongEdge] = useState<string | null>(null);
  const [message, setMessage] = useState('Select two nodes to test a connection.');
  const completedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const correctEdges = edges.filter((edge) => edge.correct && edge.connected).length;
  const totalCorrect = edges.filter((edge) => edge.correct).length;

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  if (!nodeIds.length || !totalCorrect) return <p className="p-6 text-center font-mono text-sm">This circuit round needs new game data.</p>;
  const clearTimer = () => { if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null; };
  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setMessage('Circuit complete!');
    timerRef.current = window.setTimeout(onWin, 800);
  };
  const connect = (first: string, second: string) => {
    const key = pairKey(first, second);
    const edge = edges.find((candidate) => pairKey(candidate.from_node, candidate.to_node) === key);
    if (!edge) {
      setWrongEdge(key);
      setMessage('No wire belongs between those nodes. Try a different pairing.');
      clearTimer();
      timerRef.current = window.setTimeout(() => setWrongEdge(null), 800);
      return;
    }
    if (edge.connected) { setMessage('That connection is already active.'); return; }
    if (!edge.correct) {
      setWrongEdge(key);
      setMessage(edge.label || 'That wire does not complete the circuit.');
      clearTimer();
      timerRef.current = window.setTimeout(() => setWrongEdge(null), 900);
      return;
    }
    const updated = edges.map((candidate) => pairKey(candidate.from_node, candidate.to_node) === key ? { ...candidate, connected: true } : candidate);
    setEdges(updated);
    setMessage(`Connected: ${edge.label}`);
    if (updated.filter((candidate) => candidate.correct).every((candidate) => candidate.connected)) finish();
  };
  const handleNodeClick = (nodeId: string) => {
    if (completedRef.current) return;
    if (!selectedNode) { setSelectedNode(nodeId); setMessage(`Selected ${nodeId}. Choose a second node.`); return; }
    if (selectedNode === nodeId) { setSelectedNode(null); setMessage('Selection cleared.'); return; }
    connect(selectedNode, nodeId);
    setSelectedNode(null);
  };
  const revealNext = () => {
    if (completedRef.current) return;
    const next = edges.find((edge) => edge.correct && !edge.connected);
    if (!next) return;
    const updated = edges.map((edge) => edge === next ? { ...edge, connected: true } : edge);
    setEdges(updated);
    setSelectedNode(null);
    setMessage(`Hint connected: ${next.label}`);
    if (updated.filter((edge) => edge.correct).every((edge) => edge.connected)) finish();
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]"><span>CONNECTED: <b>{correctEdges}</b> / {totalCorrect}</span><button type="button" onClick={revealNext} disabled={completedRef.current} className="text-[11px] font-bold text-[#ff4d85] disabled:opacity-40">[REVEAL NEXT WIRE]</button></div>
      <div className={`relative min-h-[300px] flex-1 overflow-hidden rounded-xl border ${era === '2026s' ? 'border-white/10 bg-[#0b0615]' : era === '2000s' ? 'win95-sunken bg-white' : 'border-[#1a1a1a] bg-black/40'}`}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full">{edges.map((edge, index) => {
          const from = positions[edge.from_node]; const to = positions[edge.to_node]; if (!from || !to) return null;
          const isWrong = wrongEdge === pairKey(edge.from_node, edge.to_node);
          return <line key={`${edge.from_node}-${edge.to_node}-${index}`} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} stroke={edge.connected ? 'var(--game-accent, var(--theme-primary))' : isWrong ? '#ef4444' : '#3b3b3b'} strokeWidth={edge.connected ? 3 : 1} strokeDasharray={edge.connected ? 'none' : '4 5'} opacity={edge.connected ? 1 : .45} />;
        })}</svg>
        {nodeIds.map((nodeId) => { const position = positions[nodeId]; const short = nodeId.length > 7 ? `${nodeId.slice(0, 7)}…` : nodeId; return <motion.button key={nodeId} type="button" title={nodeId} whileHover={{ scale: 1.08 }} whileTap={{ scale: .95 }} onClick={() => handleNodeClick(nodeId)} className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-center text-[11px] font-bold transition-all ${selectedNode === nodeId ? 'border-yellow-400 bg-yellow-400/20 text-yellow-200' : era === '2026s' ? 'border-[#a855f7]/60 bg-[#a855f7]/10 text-[#d8b4fe]' : era === '2000s' ? 'win95-raised border-[#000080] text-[#000080]' : 'border-primary-fixed-dim/40 bg-primary-fixed-dim/5 text-primary-fixed-dim'}`} style={{ left: `${position.x}%`, top: `${position.y}%` }}>{short}</motion.button>; })}
      </div>
      <p className={`min-h-5 text-center text-[12px] ${wrongEdge ? 'text-red-300' : 'text-on-surface-variant'}`}>{message}</p>
      <div className="flex flex-wrap justify-center gap-2">{edges.filter((edge) => edge.correct).map((edge, index) => <span key={`${edge.label}-${index}`} className={`rounded border px-2 py-1 text-[10px] ${edge.connected ? 'border-green-400 bg-green-900/20 text-green-300' : 'border-[#2a2a2a] text-on-surface-variant/70'}`}>{edge.connected ? `${edge.from_node} ↔ ${edge.to_node}` : `Find: ${edge.label}`}</span>)}</div>
      <p className="text-center text-[11px] opacity-55">Connect the matching concepts. The guide reveals each relationship only after it is solved.</p>
    </div>
  );
}
