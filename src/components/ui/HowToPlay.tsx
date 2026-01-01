import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Swords, Skull, Binary } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface HowToPlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const SLIDES = [
    {
        title: "The Goal",
        content: "Breach the Firewall by routing packets to destroy Nodes. Don't run out of HP.",
        icon: "🎯",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10"
    },
    {
        title: "The Stream",
        content: "Match Card Colors to Node Sockets. Use [CRIT] cards to break Shields.",
        icon: "🌊",
        color: "text-blue-400",
        bg: "bg-blue-500/10"
    },
    {
        title: "The Entropy",
        content: "Every turn is generated from the Blockchain Hash. Watch the Console.",
        icon: "🎲",
        color: "text-purple-400",
        bg: "bg-purple-500/10"
    },
    {
        title: "Anomalies",
        content: "Watch out for System Anomalies (Red = Storm, Green = Heal). Gold Cards are Legendary.",
        icon: "⚠️",
        color: "text-yellow-400",
        bg: "bg-yellow-500/10"
    },
    {
        title: "The Arsenal",
        content: [
            { label: "[ATTACK] (Red)", desc: "Damages Target (15-30 DMG)." },
            { label: "[DEFENSE] (Blue)", desc: "Adds Player Shield. Blocks incoming DMG." },
            { label: "[CRIT] (Yellow)", desc: "Breaks Enemy Shields & Cracks 'Zero-Day Caches'." },
            { label: "[CORRUPT] (Grey)", desc: "Useless Data. Route to 'Disposal' node to clear hand." }
        ],
        icon: <Swords className="w-10 h-10" />,
        color: "text-red-400",
        bg: "bg-red-500/10"
    },
    {
        title: "The Threat",
        content: [
            { label: "DRONE", desc: "Weak. Low DMG. Spams attacks." },
            { label: "SENTINEL", desc: "Heavy Hitter. Charges up for 3 turns then fires." },
            { label: "FIREWALL", desc: "High HP Tank. Must be destroyed to progress." },
            { label: "CACHE", desc: "Golden Loot Box. Immune to normal DMG. Requires [CRIT]." }
        ],
        icon: <Skull className="w-10 h-10" />,
        color: "text-orange-400",
        bg: "bg-orange-500/10"
    },
    {
        title: "The Source Code",
        content: [
            { label: "The Hash is DNA", desc: "The code at the top of your screen is the Keccak256 hash that generated this specific turn." },
            { label: "Color Coded", desc: "CYAN Bytes = Card Type. GOLD Bytes = Rarity. RED Byte = Anomalies." },
            { label: "Verify It", desc: "Copy your Level Seed and use the 'Provably Fair' tool to audit the math yourself." }
        ],
        icon: <Binary className="w-10 h-10" />,
        color: "text-green-400",
        bg: "bg-green-500/10"
    }
];

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
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                            <h2 className="text-lg font-bold text-white font-mono tracking-wider">How To Play</h2>
                            <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentSlide}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-inner", SLIDES[currentSlide].bg)}>
                                        {SLIDES[currentSlide].icon}
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className={cn("text-2xl font-bold tracking-tight", SLIDES[currentSlide].color)}>
                                            {SLIDES[currentSlide].title}
                                        </h3>
                                        <div className="text-zinc-400 leading-relaxed text-lg max-w-sm text-center">
                                            {Array.isArray(SLIDES[currentSlide].content) ? (
                                                <ul className="text-left space-y-3 text-sm">
                                                    {(SLIDES[currentSlide].content as any[]).map((item, idx) => (
                                                        <li key={idx} className="flex flex-col">
                                                            <span className={cn("font-bold text-xs uppercase tracking-wider", SLIDES[currentSlide].color)}>
                                                                {item.label}
                                                            </span>
                                                            <span className="text-zinc-500">{item.desc}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                SLIDES[currentSlide].content
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Navigation */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                            <button
                                onClick={prev}
                                className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <div className="flex gap-2">
                                {SLIDES.map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            i === currentSlide ? "bg-cyan-400 w-6" : "bg-zinc-700"
                                        )}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={next}
                                className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
