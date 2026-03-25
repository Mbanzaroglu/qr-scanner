import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertCircle, Smartphone, Keyboard, RefreshCw, Mail } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatShowDateForUi } from '../lib/formatShowDate';

interface ScannerViewProps {
    onScan: (data: string) => void;
    /** Manuel sekme: e-posta ile arama + doğrulama (kamera kullanılmaz) */
    onManualEmailLookup: (email: string) => void;
    isProcessing: boolean;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onScan, onManualEmailLookup, isProcessing }) => {
    const { selectedDate, setSelectedDate, eventConfig } = useAppContext();
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [emailInput, setEmailInput] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /** Parent her render'da yeni fonksiyon verse bile kamera effect'i yeniden başlamasın */
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;
    const isProcessingRef = useRef(isProcessing);
    isProcessingRef.current = isProcessing;
    const modeRef = useRef(mode);
    modeRef.current = mode;

    /**
     * Kamera: layout sonrası çalıştır (video ref hazır olsun). getUserMedia sonrası ref bazen null kalıyordu.
     */
    useLayoutEffect(() => {
        let animationFrameId = 0;
        let stream: MediaStream | null = null;
        let cancelled = false;

        const stopTracks = () => {
            stream?.getTracks().forEach((track) => track.stop());
            stream = null;
        };

        const waitForVideoEl = async (): Promise<HTMLVideoElement | null> => {
            for (let i = 0; i < 45; i++) {
                if (cancelled || modeRef.current !== 'camera') return null;
                const el = videoRef.current;
                if (el) return el;
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            }
            return null;
        };

        const openCamera = async (): Promise<MediaStream> => {
            const md = navigator.mediaDevices;
            if (!md?.getUserMedia) {
                throw new Error('no-api');
            }
            try {
                return await md.getUserMedia({
                    audio: false,
                    video: { facingMode: { ideal: 'environment' } },
                });
            } catch {
                try {
                    return await md.getUserMedia({
                        audio: false,
                        video: { facingMode: 'user' },
                    });
                } catch {
                    return await md.getUserMedia({ audio: false, video: true });
                }
            }
        };

        const startCamera = async () => {
            if (modeRef.current !== 'camera') return;
            setCameraError(null);

            try {
                const media = await openCamera();
                if (cancelled || modeRef.current !== 'camera') {
                    media.getTracks().forEach((t) => t.stop());
                    return;
                }
                stream = media;

                const video = await waitForVideoEl();
                if (!video || cancelled || modeRef.current !== 'camera') {
                    stopTracks();
                    if (!cancelled && modeRef.current === 'camera') {
                        setCameraError(
                            'Kamera önizlemesi başlatılamadı. Sayfayı yenileyin veya başka sekmeye geçip KAMERA’ya dönün.'
                        );
                    }
                    return;
                }

                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.muted = true;
                video.srcObject = stream;
                await video.play().catch(() => {
                    /* iOS ilk play reddi */
                });

                const tick = () => {
                    if (cancelled) return;
                    const v = videoRef.current;
                    const canvas = canvasRef.current;
                    if (
                        v &&
                        canvas &&
                        v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
                        v.videoWidth > 0 &&
                        v.videoHeight > 0
                    ) {
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        if (ctx) {
                            canvas.width = v.videoWidth;
                            canvas.height = v.videoHeight;
                            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'dontInvert',
                            });
                            if (code && !isProcessingRef.current) {
                                onScanRef.current(code.data);
                            }
                        }
                    }
                    animationFrameId = requestAnimationFrame(tick);
                };
                animationFrameId = requestAnimationFrame(tick);
            } catch {
                if (!cancelled) {
                    setCameraError(
                        'Kameraya erişilemedi. Tarayıcı iznini kontrol edin; adres çubuğunda HTTPS veya localhost olmalı.'
                    );
                }
            }
        };

        if (mode === 'camera') {
            startCamera();
        }

        return () => {
            cancelled = true;
            cancelAnimationFrame(animationFrameId);
            stopTracks();
            const v = videoRef.current;
            if (v) v.srcObject = null;
        };
    }, [mode]);

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = emailInput.trim();
        if (trimmed) {
            onManualEmailLookup(trimmed);
            setEmailInput('');
        }
    };

    useEffect(() => {
        if (!eventConfig) return;
        if (selectedDate === null) {
            setSelectedDate(eventConfig.gun1.token);
        }
    }, [eventConfig, selectedDate, setSelectedDate]);

    return (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2 md:gap-4">
            {/* Üst kontroller — shrink-0; kamera alanı kalan tüm yüksekliği alır */}
            <div className="flex shrink-0 flex-col gap-2 md:gap-4">
                <div className="flex items-center justify-between max-md:py-0.5">
                    <div className="flex items-center gap-2 text-primary">
                        <Camera size={18} className="md:h-5 md:w-5" />
                        <span className="font-playfair text-base font-bold md:text-lg">Hızlı Tarama</span>
                    </div>
                </div>

                <div className="flex rounded-soft border border-border-light bg-white/80 p-1 shadow-sm backdrop-blur-md">
                    {eventConfig ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(eventConfig.gun1.token)}
                                className={`flex-1 whitespace-nowrap py-2 text-[10px] font-black uppercase tracking-widest rounded-soft transition-all ${selectedDate === eventConfig.gun1.token ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-primary'}`}
                            >
                                {formatShowDateForUi(eventConfig.gun1.tabLabel)}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(eventConfig.gun2.token)}
                                className={`flex-1 whitespace-nowrap py-2 text-[10px] font-black uppercase tracking-widest rounded-soft transition-all ${selectedDate === eventConfig.gun2.token ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-primary'}`}
                            >
                                {formatShowDateForUi(eventConfig.gun2.tabLabel)}
                            </button>
                        </>
                    ) : (
                        <div className="flex-1 py-2 text-center text-[10px] text-text-muted">Günler yükleniyor…</div>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 rounded-soft border border-border-light bg-white/50 p-1 shadow-sm backdrop-blur-sm">
                <button
                    onClick={() => setMode('camera')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest rounded-soft transition-all ${mode === 'camera' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-primary'}`}
                >
                    <Smartphone size={14} /> KAMERA
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest rounded-soft transition-all ${mode === 'manual' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-primary'}`}
                >
                    <Keyboard size={14} /> E-POSTA
                </button>
            </div>

            <div className="card relative flex min-h-[12rem] flex-1 flex-col items-center justify-center overflow-hidden border-border-elegant bg-black max-md:rounded-lg">
                {mode === 'camera' ? (
                    <>
                        {cameraError ? (
                            <div className="text-white text-center p-8 space-y-4 z-20">
                                <AlertCircle size={40} className="mx-auto text-accent" />
                                <p className="text-sm">{cameraError}</p>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    className="absolute inset-0 z-0 h-full w-full object-cover"
                                    muted
                                    playsInline
                                    autoPlay
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-3 md:p-10">
                                    <div className="relative aspect-[3/4] w-[min(100%,min(92vw,22rem))] max-h-full md:aspect-square md:max-h-[min(100%,280px)] md:max-w-[280px]">
                                        <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent-gold rounded-tl-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
                                        <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent-gold rounded-tr-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
                                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent-gold rounded-bl-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
                                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent-gold rounded-br-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />

                                        <motion.div
                                            animate={{ top: ['10%', '90%', '10%'] }}
                                            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                            className="absolute left-0 right-0 z-10 h-0.5 bg-accent shadow-[0_0_15px_rgba(196,30,58,0.8)]"
                                        />
                                    </div>
                                </div>
                                <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 text-center">
                                    <span className="inline-block bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md rounded-full border border-white/10">
                                        QR Kodu Hizalayın
                                    </span>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 z-20 flex min-h-0 flex-col items-center justify-center space-y-3 overflow-hidden bg-bg-primary p-4 md:space-y-6 md:p-8">
                        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-light bg-primary/5 text-primary shadow-sm">
                            <Mail size={32} />
                        </div>
                        <h3 className="text-xl">E-posta ile sorgula</h3>
                        <p className="max-w-sm text-center text-xs text-text-muted">
                            Kayıtlı e-postayı girin. Biletler numaralı listelenir; girişi her bilet için ayrı onaylayın
                            (sorgu tek başına okutma sayılmaz).
                        </p>
                        <form onSubmit={handleEmailSubmit} className="w-full max-w-sm space-y-4">
                            <input
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="ornek@mail.com"
                                className="w-full rounded-soft border-2 border-border-light bg-white p-4 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5"
                            />
                            <button
                                type="submit"
                                disabled={!emailInput.trim() || isProcessing}
                                className="w-full rounded-soft bg-primary py-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                BİLETİ SORGULA
                            </button>
                        </form>
                    </div>
                )}

                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-primary/95 p-10 text-center backdrop-blur-md"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                    className="h-16 w-16 rounded-full border-4 border-white/20 border-t-accent-gold"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 flex items-center justify-center text-accent-gold"
                                >
                                    <RefreshCw size={24} />
                                </motion.div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-bold uppercase tracking-widest text-white">SORGULANIYOR</h4>
                                <p className="text-[10px] font-medium tracking-tight text-white/50">
                                    Lütfen bekleyin, kayıt kontrol ediliyor…
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ScannerView;
