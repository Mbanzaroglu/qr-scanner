import React from 'react';
import type { ScanResult } from '../api';

interface RecentScansProps {
    scans: Array<{ name: string; status: ScanResult['status']; time: string }>;
    onClear: () => void;
}

const RecentScans: React.FC<RecentScansProps> = ({ scans, onClear }) => {
    const getIcon = (status: ScanResult['status']) => {
        const icons = {
            ok: '✅',
            pending: '⏳',
            used: '⛔',
            invalid: '❌',
            wrong_date: '📅',
            error: '⚠️',
        };
        return (icons as any)[status] || '?';
    };

    return (
        <div className="mt-auto pt-4 border-t border-border-light">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">Son Okutulanlar</span>
                <button
                    onClick={onClear}
                    className="text-[11px] text-accent-blue font-medium hover:underline cursor-pointer"
                >
                    Temizle
                </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                {scans.length === 0 ? (
                    <div className="text-center py-5 text-text-muted text-[13px]">Henüz bilet okutulmadı</div>
                ) : (
                    scans.map((scan, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-bg-secondary rounded-sm text-[13px] animate-in fade-in slide-in-from-left-2">
                            <span className="text-base">{getIcon(scan.status)}</span>
                            <span className="flex-1 font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                                {scan.name}
                            </span>
                            <span className="text-[11px] text-text-muted">{scan.time}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RecentScans;
