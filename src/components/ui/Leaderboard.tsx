import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Loader2, User } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';

interface LeaderboardProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LeaderboardEntry {
    rank: number;
    player: string;
    score: number;
    gameId: string;
}

export function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
    const { user } = usePrivy();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboard();
        }
    }, [isOpen]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            // Fetch top 10 scores from Supabase
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            const ranked: LeaderboardEntry[] = data.map((entry: any, i: number) => ({
                rank: i + 1,
                player: entry.operator,
                score: entry.score,
                gameId: 'cumulative'
            }));

            setEntries(ranked);
        } catch (e) {
            console.error("Leaderboard fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transform"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <h2 className="text-lg font-bold text-white font-mono tracking-wider">ELITE_OPERATORS</h2>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="min-h-[300px] max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500 gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                                    <span className="text-xs font-mono">SYNCING WITH DATABASE...</span>
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500 gap-2">
                                    <User className="w-12 h-12 opacity-20" />
                                    <span className="text-sm font-mono">NO RECORDS FOUND</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm font-mono">
                                    <thead className="bg-zinc-900/50 text-zinc-500 sticky top-0">
                                        <tr>
                                            <th className="p-4 w-16 text-center">RANK</th>
                                            <th className="p-4">OPERATOR</th>
                                            <th className="p-4 text-right">SCORE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {entries.map((entry) => {
                                            const isCurrentUser = user?.wallet?.address?.toLowerCase() === entry.player.toLowerCase();
                                            return (
                                                <tr
                                                    key={entry.rank}
                                                    className={cn(
                                                        "transition-colors",
                                                        isCurrentUser ? "bg-cyan-900/20 hover:bg-cyan-900/30" : "hover:bg-zinc-800/50"
                                                    )}
                                                >
                                                    <td className="p-4 text-center">
                                                        {entry.rank === 1 && <span className="text-yellow-400 text-lg">🥇</span>}
                                                        {entry.rank === 2 && <span className="text-zinc-300 text-lg">🥈</span>}
                                                        {entry.rank === 3 && <span className="text-orange-400 text-lg">🥉</span>}
                                                        {entry.rank > 3 && <span className="text-zinc-600 font-bold">#{entry.rank}</span>}
                                                    </td>
                                                    <td className={cn("p-4", isCurrentUser ? "text-cyan-400 font-bold" : "text-zinc-300")}>
                                                        {entry.player.slice(0, 6)}...{entry.player.slice(-4)}
                                                        {isCurrentUser && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">YOU</span>}
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-zinc-100">
                                                        {entry.score.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
