import React from 'react';
import type { Stats as StatsType } from '../api';

interface StatsGridProps {
    stats: StatsType | null;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="relative p-3.5 text-center card group">
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-success" />
                <div className="text-lg mb-1.5 text-success">✓</div>
                <div className="font-playfair text-3xl font-semibold text-success leading-none">
                    {stats?.used ?? '-'}
                </div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1.5">Giriş</div>
            </div>

            <div className="relative p-3.5 text-center card group">
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
                <div className="text-lg mb-1.5 text-accent-blue">🎫</div>
                <div className="font-playfair text-3xl font-semibold text-accent-blue leading-none">
                    {stats?.total ?? '-'}
                </div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1.5">Onaylı</div>
            </div>

            <div className="relative p-3.5 text-center card group">
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-red" />
                <div className="text-lg mb-1.5 text-accent-red">⏳</div>
                <div className="font-playfair text-3xl font-semibold text-accent-red leading-none">
                    {stats?.remaining ?? '-'}
                </div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1.5">Kalan</div>
            </div>
        </div>
    );
};

export default StatsGrid;
