import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Binary, ArrowRight, Shield, Zap, Swords, Heart, CheckCircle, Move, TriangleAlert } from 'lucide-react';

import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

// ==========================================
// TRUE COMPONENTS
// ==========================================

const TutorialCard = ({
    type,
    value,
    label,
    icon: Icon,
    color,
    rarity = 'COMMON'
}: {
    type: string;
    value?: number | string;
    label: string;
    icon: any;
    color: string;
    rarity?: 'COMMON' | 'LEGENDARY';
}) => {
    const isLegendary = rarity === 'LEGENDARY';
    const borderColor = isLegendary ? 'border-yellow-400' : `border-${color}-500`;
    const textColor = isLegendary ? 'text-yellow-400' : `text-${color}-400`;
    const glow = isLegendary ? 'shadow-[0_0_15px_rgba(250,204,21,0.3)]' : `shadow-[0_0_10px_var(--shadow-color)]`;

    return (
        <div
            className={cn(
                "relative w-20 h-28 rounded-lg bg-zinc-900 border-2 flex flex-col items-center justify-between p-2 shadow-lg transition-all",
                borderColor,
                glow
            )}
            style={{
                '--shadow-color': isLegendary ? '#facc15' :
                    color === 'red' ? 'rgba(239, 68, 68, 0.5)' :
                        color === 'cyan' ? 'rgba(34, 211, 238, 0.5)' :
                            color === 'yellow' ? 'rgba(234, 179, 8, 0.5)' :
                                color === 'green' ? 'rgba(74, 222, 128, 0.5)' :
                                    'rgba(113, 113, 122, 0.5)'
            } as React.CSSProperties}
        >
            {/* Hex Badge */}
            <div className={cn(
                "absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-mono font-bold bg-zinc-950 border rounded",
                borderColor,
                textColor
            )}>
                {isLegendary ? 'FF' : '0A'}
            </div>

            <div className={cn("text-[8px] font-mono font-bold tracking-tighter opacity-80", textColor)}>
                {type}
            </div>

            <div className={cn("flex flex-col items-center gap-1", textColor)}>
                <Icon className="w-6 h-6" />
                {value && <div className="text-lg font-bold leading-none font-mono">{value}</div>}
            </div>

            <div className={cn("text-[7px] font-mono font-bold text-center leading-tight uppercase", textColor)}>
                {label}
            </div>
        </div>
    );
};

const TutorialNode = ({
    type,
    hp,
    label,
    color = "red"
}: {
    type: string;
    hp?: number;
    label: string;
    color?: string;
}) => (
    <div className={cn(
        "relative w-20 h-20 rounded-lg bg-zinc-900 border-2 flex flex-col items-center justify-center gap-1 shadow-lg",
        `border-${color}-500`,
        `shadow-${color}-500/20`
    )}>
        <div className={cn(
            "absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-zinc-950 border text-[8px] font-mono rounded whitespace-nowrap",
            `border-${color}-500 text-${color}-500`
        )}>
            {type}
        </div>

        {hp !== undefined && (
            <div className="text-2xl font-bold font-mono text-white">
                {hp}<span className="text-[10px] text-zinc-500 ml-0.5">HP</span>
            </div>
        )}

        <div className={cn("text-[8px] font-mono tracking-widest uppercase", `text-${color}-500`)}>
            {label}
        </div>
    </div>
);

// ==========================================
// SLIDES DATA
// ==========================================

interface SlideData {
    title: string;
    visual: React.ReactNode;
    text: React.ReactNode;
}

const SLIDES: SlideData[] = [
    {
        title: "The Core Loop",
        visual: (
            <div className="flex items-center gap-4">
                <TutorialCard type="ATTACK" value={15} label="DATA SHARD" color="red" icon={Swords} />
                <ArrowRight className="w-6 h-6 text-zinc-600 animate-pulse" />
                <TutorialNode type="ENEMY" hp={20} label="FIREWALL" color="red" />
            </div>
        ),
        text: (
            <span>
                Drag <span className="text-red-400 font-bold">ATTACK</span> cards (Swords) to <span className="text-red-400 font-bold">Enemy Nodes</span>.
                <br /><span className="text-zinc-500 text-sm">Reduce their HP to 0 to breach the firewall.</span>
            </span>
        )
    },
    {
        title: "Survival",
        visual: (
            <div className="flex items-center gap-4">
                <TutorialCard type="DEFEND" value={10} label="ENCRYPTION" color="cyan" icon={Shield} />
                <ArrowRight className="w-6 h-6 text-zinc-600 animate-pulse" />
                <TutorialNode type="PLAYER" label="YOU" color="cyan" />
            </div>
        ),
        text: (
            <span>
                Drag <span className="text-cyan-400 font-bold">DEFEND</span> cards (Shields) to <span className="text-cyan-400 font-bold">Your Node (P)</span>.
                <br /><span className="text-zinc-500 text-sm">You need Shield to survive incoming attacks.</span>
            </span>
        )
    },
    {
        title: "The Arsenal",
        visual: (
            <div className="grid grid-cols-3 gap-3 scale-90">
                <TutorialCard type="CRIT" label="BREACH" color="yellow" icon={Zap} />
                <TutorialCard type="HEAL" label="REPAIR" color="green" icon={Heart} />
                <TutorialCard type="JUNK" label="CORRUPT" color="zinc" icon={X} />
            </div>
        ),
        text: (
            <span>
                Know your tools. <span className="text-yellow-400 font-bold">CRIT</span> breaks heavy armor.
                <br /><span className="text-zinc-400 font-bold">CORRUPT</span> cards jam your hand—route them to Trash.
            </span>
        )
    },
    {
        title: "Power Levels",
        visual: (
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500">COMMON</span>
                    <TutorialCard type="ATK" value={15} label="SHARD" color="red" icon={Swords} />
                </div>
                <div className="w-px h-24 bg-zinc-800" />
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-yellow-500 font-bold animate-pulse">LEGENDARY</span>
                    <TutorialCard type="ATK" value={30} label="OMEGA" color="red" icon={Swords} rarity="LEGENDARY" />
                </div>
            </div>
        ),
        text: (
            <span>
                Watch the Border Color. <span className="text-yellow-400 font-bold">Gold (Legendary)</span> cards deal <span className="text-yellow-400 font-bold">Double Damage</span>.
                <br /><span className="text-zinc-500 text-sm">Use them for massive combos.</span>
            </span>
        )
    },
    {
        title: "Living Grid",
        visual: (
            <div className="flex items-center gap-6">
                <div className="relative">
                    <TutorialNode type="ENEMY" label="ROAMER" color="red" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-zinc-500 font-bold text-xs animate-bounce">
                        ↑
                    </div>
                </div>
                <div className="flex flex-col gap-2 scale-75 opacity-50">
                    <div className="flex justify-center"><div className="w-8 h-8 border border-zinc-700 rounded bg-zinc-800" /></div>
                    <div className="flex gap-2">
                        <div className="w-8 h-8 border border-zinc-700 rounded bg-zinc-800" />
                        <div className="w-8 h-8 border border-red-500/30 rounded bg-red-900/10 flex items-center justify-center"><Move className="w-4 h-4 text-red-500" /></div>
                        <div className="w-8 h-8 border border-zinc-700 rounded bg-zinc-800" />
                    </div>
                    <div className="flex justify-center"><div className="w-8 h-8 border border-zinc-700 rounded bg-zinc-800" /></div>
                </div>
            </div>
        ),
        text: (
            <span>
                <strong className="text-white block mb-1">Dynamic Movement</strong>
                Enemies are not static. At the end of every turn, the <span className="text-cyan-400 font-bold">Blockchain Hash</span> determines their next move. Don't get cornered.
            </span>
        )
    },
    {
        title: "Danger Close",
        visual: (
            <div className="flex flex-col gap-4 w-full px-4">
                {/* Bad Scenario */}
                <div className="flex items-center justify-between bg-red-900/10 border border-red-500/20 p-2 rounded">
                    <div className="flex gap-1">
                        <TutorialNode type="YOU" label="PLAYER" color="cyan" />
                        <TutorialNode type="OPP" label="ENEMY" color="red" />
                    </div>
                    <div className="flex items-center gap-1 text-red-400 font-bold text-xs uppercase animate-pulse">
                        <TriangleAlert className="w-4 h-4" />
                        CRITICAL (150%)
                    </div>
                </div>
                {/* Good Scenario */}
                <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-2 rounded opacity-75">
                    <div className="flex gap-1">
                        <TutorialNode type="YOU" label="PLAYER" color="cyan" />
                        <div className="w-16 flex items-center justify-center text-zinc-600 text-[10px] dashes">3 TILES</div>
                        <TutorialNode type="OPP" label="ENEMY" color="red" />
                    </div>
                    <div className="text-zinc-500 font-bold text-xs uppercase">
                        NORMAL (100%)
                    </div>
                </div>
            </div>
        ),
        text: (
            <span>
                <strong className="text-white block mb-1">Proximity Threat</strong>
                <span className="text-red-400 font-bold">Distance matters.</span> Enemies deal <span className="text-red-400 font-bold">+50% Damage</span> when adjacent to you. Destroy them before they get close.
            </span>
        )
    },

    {
        title: "The Entropy",
        visual: (
            <div className="w-full max-w-[200px] bg-zinc-950 p-4 rounded border border-zinc-800 flex flex-col items-center text-center gap-3">
                <Binary className="w-12 h-12 text-zinc-600" />
                <div className="space-y-1">
                    <div className="h-1 w-full bg-zinc-800 rounded overflow-hidden">
                        <div className="h-full w-1/2 bg-cyan-500/50" />
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">SEED: 0x7f3...9a1</div>
                </div>
            </div>
        ),
        text: (
            <ul className="text-left space-y-2 text-sm text-zinc-400 list-disc pl-4">
                <li>Every turn is generated from a <span className="text-zinc-200">blockchain hash</span>.</li>
                <li><span className="text-cyan-400">Cyan</span> = Type, <span className="text-yellow-400">Gold</span> = Rarity.</li>
                <li>Verify it in the Console.</li>
            </ul>
        )
    },
    {
        title: "Verify Fairness",
        visual: (
            <div className="flex flex-col items-center gap-3 w-full max-w-[240px]">
                <div className="w-full bg-black p-3 rounded border border-zinc-800 font-mono text-[10px] text-zinc-500 break-all">
                    0x8a72b...3f9c
                </div>
                <div className="flex items-center gap-2 text-green-400 bg-green-900/20 px-3 py-1.5 rounded-full border border-green-900/50">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider">VERIFIED MATCH</span>
                </div>
            </div>
        ),
        text: (
            <span>
                Don't trust us? Copy your <span className="text-white font-bold">Level Seed</span> at the end of the game and paste it into the
                <span className="text-cyan-400 font-bold ml-1">Provably Fair Verifier</span>.
            </span>
        )
    }
];

// ==========================================
// MAIN COMPONENT
// ==========================================

interface HowToPlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HowToPlay({ isOpen, onClose }: HowToPlayProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const next = () => setCurrentSlide((p) => (p + 1) % SLIDES.length);
    const prev = () => setCurrentSlide((p) => (p - 1 + SLIDES.length) % SLIDES.length);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
                            <h2 className="text-sm font-bold text-zinc-300 font-mono tracking-wider uppercase">
                                Mission Briefing <span className="text-cyan-500">//{currentSlide + 1}</span>
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area - Scrollable */}
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentSlide}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-center gap-8 w-full my-auto"
                                >
                                    {/* Visual Section */}
                                    <div className="bg-black/40 p-6 rounded-xl border border-zinc-800/50 w-full flex items-center justify-center min-h-[160px]">
                                        {SLIDES[currentSlide].visual}
                                    </div>

                                    {/* Text Section */}
                                    <div className="space-y-2 max-w-sm">
                                        <h3 className="text-xl font-bold tracking-tight text-white mb-2">
                                            {SLIDES[currentSlide].title}
                                        </h3>
                                        <div className="text-zinc-400 leading-relaxed text-sm">
                                            {SLIDES[currentSlide].text}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer / Nav */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-950/30 flex flex-col gap-4 shrink-0">
                            {/* Navigation */}
                            <div className="flex items-center justify-between w-full">
                                <button
                                    onClick={prev}
                                    className="p-2 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex gap-2">
                                    {SLIDES.map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "h-1 rounded-full transition-all duration-300",
                                                i === currentSlide ? "bg-cyan-500 w-8" : "bg-zinc-800 w-2"
                                            )}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={next}
                                    className="p-2 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Don't Show Again */}
                            <div className="flex justify-center">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    localStorage.setItem('missionx_hide_tutorial', 'true');
                                                } else {
                                                    localStorage.removeItem('missionx_hide_tutorial');
                                                }
                                            }}
                                            defaultChecked={!!localStorage.getItem('missionx_hide_tutorial')}
                                        />
                                        <div className="w-4 h-4 border border-zinc-700 rounded bg-zinc-900 peer-checked:bg-cyan-500/20 peer-checked:border-cyan-500/50 transition-all" />
                                        <div className="absolute inset-0 flex items-center justify-center text-cyan-500 opacity-0 peer-checked:opacity-100 transition-opacity">
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors">
                                        DON'T SHOW THIS AGAIN
                                    </span>
                                </label>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
