import React, { useEffect, useState } from 'react';

interface HeaderProps {
    isOnline: boolean;
}

const Header: React.FC<HeaderProps> = ({ isOnline }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <header className="relative p-5 text-center overflow-hidden bg-linear-to-br from-accent-blue to-[#2a5490]">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_60%)] animate-[headerShine_8s_ease-in-out_infinite]" />

            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-white/80 bg-white/15 rounded-full backdrop-blur-md z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#4caf50] animate-[pulse_2s_ease-in-out_infinite]' : 'bg-error'}`} />
                <span>{isOnline ? 'Bağlı' : 'Çevrimdışı'}</span>
            </div>

            <div className="relative z-10">
                <div className="font-inter text-[10px] font-semibold tracking-[6px] text-accent-gold uppercase mb-1">Ankara</div>
                <h1 className="font-playfair text-4xl font-medium text-white tracking-[3px] drop-shadow-md">Tavariş</h1>
                <div className="text-[11px] font-medium tracking-[4px] text-white/70 uppercase mt-1">Bilet Kontrol Sistemi</div>
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-white/60">
                    <span>{formatDate(time)}</span>
                    <span className="w-1 h-1 rounded-full bg-accent-gold" />
                    <span>{formatTime(time)}</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
