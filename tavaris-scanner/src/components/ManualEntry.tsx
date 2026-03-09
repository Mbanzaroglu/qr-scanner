import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';

interface ManualEntryProps {
    onVerify: (data: string) => void;
    isProcessing: boolean;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onVerify, isProcessing }) => {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (input.trim()) {
            onVerify(input.trim());
            setInput('');
        }
    };

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-bg-secondary rounded-lg p-4">
                <div className="text-[13px] font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <span>📋</span>
                    <span>Manuel QR Girişi</span>
                </div>
                <ol className="text-[13px] text-text-secondary space-y-2">
                    <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-accent-blue text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                        <span>Bilet üzerindeki QR kodu taratın</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 bg-accent-blue text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                        <span>Çıkan metni kopyalayıp aşağıya yapıştırın</span>
                    </li>
                </ol>
            </div>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full p-4 font-mono text-[13px] bg-bg-primary border-2 border-border-light rounded-md text-text-primary resize-none h-24 focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_4px_rgba(26,68,128,0.1)] transition-all"
                placeholder="QR kod içeriğini buraya yapıştırın..."
                disabled={isProcessing}
            />

            <button
                onClick={handleSubmit}
                disabled={isProcessing || !input.trim()}
                className="btn btn-primary w-full"
            >
                <ClipboardCheck className="w-5 h-5" />
                <span>{isProcessing ? 'KONTROL EDİLİYOR...' : 'KONTROL ET'}</span>
            </button>
        </div>
    );
};

export default ManualEntry;
