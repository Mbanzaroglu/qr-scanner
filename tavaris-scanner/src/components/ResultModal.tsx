import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Clock, X, Phone, User, Ticket as TicketIcon } from 'lucide-react';
import type { VerifyResult } from '../api';

interface ResultModalProps {
    result: VerifyResult | null;
    onClose: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ result, onClose }) => {
    if (!result) return null;

    const config = {
        ok: {
            icon: <CheckCircle className="text-success" size={64} />,
            color: 'border-success',
            bg: 'bg-success/5',
            badge: 'bg-success text-white'
        },
        used: {
            icon: <XCircle className="text-accent" size={64} />,
            color: 'border-accent',
            bg: 'bg-accent/5',
            badge: 'bg-accent text-white'
        },
        invalid: {
            icon: <AlertCircle className="text-accent" size={64} />,
            color: 'border-accent',
            bg: 'bg-accent/5',
            badge: 'bg-accent text-white'
        },
        pending: {
            icon: <Clock className="text-warning" size={64} />,
            color: 'border-warning',
            bg: 'bg-warning/5',
            badge: 'bg-warning text-white'
        },
        wrong_date: {
            icon: <AlertCircle className="text-warning" size={64} />,
            color: 'border-warning',
            bg: 'bg-warning/5',
            badge: 'bg-warning text-white'
        },
        error: {
            icon: <AlertCircle className="text-accent" size={64} />,
            color: 'border-accent',
            bg: 'bg-accent/5',
            badge: 'bg-accent text-white'
        }
    }[result.status] || {
        icon: <AlertCircle size={64} />,
        color: 'border-primary',
        bg: 'bg-primary/5',
        badge: 'bg-primary text-white'
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 pb-24 md:pb-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-primary/40 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className={`relative w-full max-w-sm bg-white rounded-elegant shadow-2xl border-t-[8px] ${config.color} overflow-hidden`}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-text-muted hover:bg-bg-primary rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 flex flex-col items-center text-center space-y-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                            className={`p-6 rounded-full ${config.bg} relative`}
                        >
                            {config.icon}
                            {result.status === 'ok' && (
                                <motion.div
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 rounded-full border-2 border-success/30"
                                />
                            )}
                        </motion.div>

                        <div className="space-y-2">
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.badge}`}>
                                {result.title}
                            </span>
                            <h3 className="text-2xl pt-2">{result.message}</h3>
                        </div>

                        {result.adSoyad && (
                            <div className="w-full bg-bg-primary rounded-soft p-5 border border-border-light space-y-3">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-white rounded-lg border border-border-light text-primary shadow-sm">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none">Müşteri</div>
                                        <div className="font-bold text-primary truncate leading-tight uppercase font-playfair tracking-tight">{result.adSoyad}</div>
                                    </div>
                                </div>

                                <div className="flex gap-4 border-t border-border-light/50 pt-3">
                                    <div className="flex items-center gap-2 text-text-secondary text-xs">
                                        <Phone size={12} className="text-text-muted" /> {result.telefon}
                                    </div>
                                    <div className="flex items-center gap-2 text-text-secondary text-xs">
                                        <TicketIcon size={12} className="text-text-muted" /> {result.okutulan}/{result.toplam} Bilet
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className={`w-full py-4 rounded-soft font-bold text-white shadow-xl transition-all ${result.status === 'ok' ? 'bg-success shadow-success/20' : 'bg-primary shadow-primary/20'}`}
                        >
                            TAMAM
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ResultModal;
