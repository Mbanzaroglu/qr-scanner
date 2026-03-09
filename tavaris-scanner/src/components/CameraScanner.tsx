import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { Camera } from 'lucide-react';

interface CameraScannerProps {
    onScan: (data: string) => void;
    isProcessing: boolean;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, isProcessing }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let animationFrameId: number;

        const scanFrame = () => {
            if (!videoRef.current || !canvasRef.current || isProcessing) {
                animationFrameId = requestAnimationFrame(scanFrame);
                return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code && code.data) {
                    onScan(code.data);
                }
            }
            animationFrameId = requestAnimationFrame(scanFrame);
        };

        if (isActive) {
            animationFrameId = requestAnimationFrame(scanFrame);
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [isActive, isProcessing, onScan]);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsActive(true);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
            setIsActive(false);
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="flex flex-col gap-3">
            <div className="relative bg-black rounded-md aspect-4/3 overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                <canvas ref={canvasRef} className="hidden" />

                {isActive && !isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[200px] h-[200px] relative">
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-[30px] h-[30px] border-l-3 border-t-3 border-accent-gold rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-[30px] h-[30px] border-r-3 border-t-3 border-accent-gold rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-[30px] h-[30px] border-l-3 border-b-3 border-accent-gold rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-[30px] h-[30px] border-r-3 border-b-3 border-accent-gold rounded-br-lg" />
                            {/* Scan Line */}
                            <div className="absolute left-[10px] right-[10px] h-0.5 bg-linear-to-r from-transparent via-accent-gold to-transparent animate-[scanLine_2s_ease-in-out_infinite]" />
                        </div>
                    </div>
                )}

                {!isActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-[#1a1a2e] to-[#16213e] text-white">
                        <Camera className="w-12 h-12 mb-3 opacity-80" />
                        <span className="text-sm opacity-70">
                            {error ? 'Kamera başlatılamadı' : 'Kamera başlatılmadı'}
                        </span>
                        {error && <small className="mt-1 text-accent-red/80 px-4 text-center">{error}</small>}
                    </div>
                )}
            </div>

            <div className={`text-center py-2 px-3 text-[13px] flex items-center justify-center gap-2 ${isActive ? 'text-success' : 'text-text-secondary'}`}>
                {isActive ? (
                    <>
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span>Kamera aktif - QR kodu gösterin</span>
                    </>
                ) : (
                    <span>Başlatmak için aşağıdaki butona tıklayın</span>
                )}
            </div>

            {!isActive ? (
                <button onClick={startCamera} className="btn btn-primary w-full">
                    <Camera className="w-5 h-5" />
                    <span>KAMERAYI BAŞLAT</span>
                </button>
            ) : (
                <button onClick={stopCamera} className="btn bg-bg-secondary text-accent-blue border-2 border-accent-blue w-full hover:bg-accent-blue hover:text-white">
                    <span>KAMERAYI DURDUR</span>
                </button>
            )}
        </div>
    );
};

export default CameraScanner;
