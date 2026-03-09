import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertCircle, Smartphone, Keyboard, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface ScannerViewProps {
    onScan: (data: string) => void;
    isProcessing: boolean;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onScan, isProcessing }) => {
    const { selectedDate, setSelectedDate } = useAppContext();
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    // ... [previous imports and effects remain same, just adding context and tabs]
    const [manualInput, setManualInput] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let animationFrameId: number;
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            if (mode !== 'camera') return;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                setCameraError('Kameraya erişilemedi. Lütfen izinleri kontrol edin.');
            }
        };

        const tick = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: 'dontInvert',
                        });

                        if (code && !isProcessing) {
                            onScan(code.data);
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mode, isProcessing, onScan]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput.trim()) {
            onScan(manualInput.trim());
            setManualInput('');
        }
    };

    useEffect(() => {
        if (selectedDate === null) {
            setSelectedDate('6');
        }
    }, [selectedDate, setSelectedDate]);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header & Date Selection */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <Camera size={20} />
                        <span className="font-playfair font-bold text-lg">Hızlı Tarama</span>
                    </div>
                </div>

                <div className="flex bg-white/80 p-1 rounded-soft border border-border-light backdrop-blur-md shadow-sm">
                    <button
                        onClick={() => setSelectedDate('6')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-soft transition-all ${selectedDate === '6' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-primary'}`}
                    >
                        6 Mart
                    </button>
                    <button
                        onClick={() => setSelectedDate('9')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-soft transition-all ${selectedDate === '9' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-primary'}`}
                    >
                        9 Mart
                    </button>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-white/50 p-1 rounded-soft border border-border-light backdrop-blur-sm shadow-sm">
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
                    <Keyboard size={14} /> MANUEL
                </button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 min-h-0 card relative bg-black flex flex-col items-center justify-center overflow-hidden border-border-elegant">
                {mode === 'camera' ? (
                    <>
                        {cameraError ? (
                            <div className="text-white text-center p-8 space-y-4">
                                <AlertCircle size={40} className="mx-auto text-accent" />
                                <p className="text-sm">{cameraError}</p>
                            </div>
                        ) : (
                            <>
                                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Overlay / Frame */}
                                <div className="absolute inset-0 flex items-center justify-center p-10">
                                    <div className="relative w-full aspect-square max-w-[280px]">
                                        {/* Corners */}
                                        <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent-gold rounded-tl-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
                                        <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent-gold rounded-tr-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
                                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent-gold rounded-bl-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />
                                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent-gold rounded-br-2xl shadow-[0_0_15px_rgba(212,168,83,0.5)]" />

                                        {/* Scan Line */}
                                        <motion.div
                                            animate={{ top: ['10%', '90%', '10%'] }}
                                            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                            className="absolute left-0 right-0 h-0.5 bg-accent shadow-[0_0_15px_rgba(196,30,58,0.8)] z-10"
                                        />
                                    </div>
                                </div>
                                <div className="absolute bottom-6 left-0 right-0 text-center">
                                    <span className="bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-bold tracking-[0.2em] px-4 py-2 rounded-full border border-white/10 uppercase">
                                        QR Kodu Hizalayın
                                    </span>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="bg-bg-primary absolute inset-0 flex flex-col p-8 items-center justify-center space-y-6">
                        <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-2 shadow-sm border border-border-light">
                            <Keyboard size={32} />
                        </div>
                        <h3 className="text-xl">Manuel Giriş</h3>
                        <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4">
                            <textarea
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="QR kodunun içeriğini buraya yapıştırın veya manuel girin..."
                                className="w-full bg-white border-2 border-border-light rounded-soft p-5 text-sm font-mono h-32 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm"
                            />
                            <button
                                type="submit"
                                disabled={!manualInput.trim() || isProcessing}
                                className="w-full bg-primary text-white font-bold py-4 rounded-soft hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all tracking-widest text-[11px] uppercase"
                            >
                                BİLETİ SORGULA
                            </button>
                        </form>
                    </div>
                )}

                {/* Processing Overlay */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 bg-primary/95 flex flex-col items-center justify-center text-center p-10 space-y-5 backdrop-blur-md"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                    className="w-16 h-16 border-4 border-white/20 border-t-accent-gold rounded-full"
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
                                <h4 className="text-white font-bold text-lg tracking-widest uppercase">SORGULANIYOR</h4>
                                <p className="text-white/50 text-[10px] font-medium tracking-tight">Lütfen bekleyin, veritabanı kontrol ediliyor...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ScannerView;
