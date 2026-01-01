import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { LogOut, X } from 'lucide-react';


interface DisconnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DisconnectModal({ isOpen, onClose, onConfirm }: DisconnectModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-6"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                                <LogOut className="w-6 h-6 text-red-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white">Disconnect Wallet?</h3>

                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Are you sure you want to disconnect? Your current session progress will be saved, but you'll need to reconnect to continue.
                            </p>

                            <div className="flex items-center gap-3 w-full mt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className="flex-1 py-2.5 px-4 bg-red-600 border border-red-500 rounded-lg text-sm font-bold text-white hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
