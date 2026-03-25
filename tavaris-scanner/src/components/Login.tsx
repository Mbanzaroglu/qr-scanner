import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Theater, Lock, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface LoginProps {
    onLogin: (pin: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
    const { eventConfig, loadEventConfig, appBrandName, eventTitle } = useAppContext();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadEventConfig();
    }, [loadEventConfig]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulating a small delay for premium feel
        setTimeout(() => {
            if (pin === '4321') {
                onLogin(pin);
            } else {
                setError(true);
                setPin('');
                setTimeout(() => setError(false), 1000);
            }
            setIsSubmitting(false);
        }, 600);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 border-[40px] border-primary rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 border-[20px] border-accent-gold rounded-full translate-x-1/2 translate-y-1/2" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-10 space-y-4">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="w-24 h-24 bg-primary rounded-3xl mx-auto flex items-center justify-center text-accent-gold shadow-2xl relative"
                    >
                        <Theater size={48} />
                        <motion.div
                            animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="absolute inset-0 border-2 border-accent-gold rounded-3xl"
                        />
                    </motion.div>
                    <div className="space-y-1">
                        <h1 className="text-4xl">{eventTitle}</h1>
                        <p className="text-primary/80 font-semibold text-sm px-2">
                            {eventConfig?.venue
                                ? `${eventConfig.venue}${eventConfig.cityBadge ? ` · ${eventConfig.cityBadge}` : ''}`
                                : appBrandName !== eventTitle
                                  ? appBrandName
                                  : 'Etkinlik yükleniyor…'}
                        </p>
                        <p className="text-text-muted font-bold uppercase tracking-[0.3em] text-[10px]">Görevli Girişi</p>
                    </div>
                </div>

                <div className="card p-10 space-y-8 relative z-10 border-border-elegant shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Giriş Şifresi</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    className={`w-full bg-bg-primary border-2 rounded-soft p-5 text-center text-3xl tracking-[1em] font-bold focus:outline-none transition-all shadow-inner ${error ? 'border-accent text-accent animate-shake' : 'border-border-light focus:border-primary focus:ring-4 focus:ring-primary/5 text-primary'}`}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-bold text-accent uppercase tracking-wider"
                                    >
                                        Hatalı Şifre!
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={pin.length < 4 || isSubmitting}
                            className="w-full btn-primary flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>GİRİŞ YAP <ShieldCheck size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 p-4 bg-bg-primary rounded-soft border border-border-light text-text-muted italic text-[11px] leading-relaxed">
                        <Lock size={24} className="opacity-50 shrink-0" />
                        Bu panel sadece yetkili {eventTitle} görevlileri içindir. Lütfen şifrenizi kimseyle paylaşmayın.
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
