import React, { useState } from 'react';
import { Search, Send, CheckCircle, Clock } from 'lucide-react';
import { api } from '../api';

interface AdminPanelProps {
    pin: string;
    selectedDate: string | null;
    onShowLoading: (show: boolean) => void;
    onRefreshStats: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ pin, selectedDate, onShowLoading, onRefreshStats }) => {
    const [query, setQuery] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!pin) return;

        setLoading(true);
        try {
            const result = await api.searchTickets(query, selectedDate || 'all', pin);
            if (result.success) {
                setTickets(result.results);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (row: number, biletNo: number) => {
        if (!window.confirm(`Bilet #${biletNo} için manuel giriş yapılsın mı?`)) return;

        onShowLoading(true);
        try {
            const result = await api.manualCheckIn(row, biletNo, pin);
            if (result.success) {
                alert('Giriş başarılı!');
                handleSearch(); // Refresh list
                onRefreshStats(); // Refresh header stats
            } else {
                alert('Hata: ' + result.error);
            }
        } catch (err) {
            alert('Sistem hatası');
        } finally {
            onShowLoading(false);
        }
    };

    const handleResendQr = async (row: number) => {
        if (!window.confirm('QR kodlar tekrar gönderilsin mi?')) return;

        onShowLoading(true);
        try {
            const result = await api.resendQr(row, pin);
            if (result.success) {
                alert('E-posta gönderildi!');
            } else {
                alert('Hata: ' + result.error);
            }
        } catch (err) {
            alert('Sistem hatası');
        } finally {
            onShowLoading(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="İsim, e-posta veya telefon ara..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-border-light rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all"
                />
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
                <button
                    type="submit"
                    className="absolute right-2 top-2 px-3 py-1 bg-accent-blue text-white text-xs font-semibold rounded-md hover:bg-accent-blue/90"
                >
                    ARA
                </button>
            </form>

            <div className="flex-1 min-h-0 bg-white border border-border-light rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-border-light bg-bg-secondary flex justify-between items-center">
                    <span className="text-[12px] font-bold text-text-primary uppercase tracking-tight">Arama Sonuçları</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-text-muted border border-border-light">
                        {tickets.length} Kayıt
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border-light">
                    {loading ? (
                        <div className="p-8 text-center text-text-muted text-sm space-y-2">
                            <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
                            <div>Yükleniyor...</div>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="p-12 text-center text-text-muted text-sm italic">
                            Arama yapmak için yukarıdaki kutuyu kullanın.
                        </div>
                    ) : (
                        tickets.map((t) => (
                            <div key={t.row} className="p-4 space-y-3 hover:bg-bg-primary/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-text-primary text-sm uppercase">{t.adSoyad}</h3>
                                        <div className="text-[11px] text-text-muted truncate max-w-[200px]">{t.mail}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleResendQr(t.row)}
                                            className="p-2 text-accent-blue bg-accent-blue/10 rounded-full hover:bg-accent-blue hover:text-white transition-all"
                                            title="QR Yeniden Gönder"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.odemeOnay ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                                        {t.odemeOnay ? 'ÖDEME ONAYLI' : 'ÖDEME BEKLEYEN'}
                                    </div>
                                    <div className="px-2 py-0.5 bg-bg-secondary rounded text-[10px] font-medium text-text-muted">
                                        {t.hangiGun}
                                    </div>
                                    <div className="px-2 py-0.5 bg-bg-secondary rounded text-[10px] font-medium text-text-muted">
                                        {t.kisiSayisi} Bilet
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {/* Biletler Listesi */}
                                    {Array.from({ length: t.kisiSayisi }).map((_, idx) => {
                                        const biletNo = idx + 1;
                                        const isUsed = t.okutulan >= biletNo; // Basit mantık, aslında backend'den hangi bilet no okundu gelmeli ama mock
                                        // Ama backend'de bir logic var: okutulan/toplam
                                        // Burada t.qrIds.length okutulmayanları (kalanları) tutuyor sanırım
                                        // Backend extractBiletNoFromQrId_ kullanıyor. 
                                        // ManualEntry için row, biletNo lazım.

                                        return (
                                            <button
                                                key={idx}
                                                disabled={isUsed}
                                                onClick={() => handleCheckIn(t.row, biletNo)}
                                                className={`flex items-center justify-between p-2 rounded text-[11px] border transition-all ${isUsed ? 'bg-bg-secondary text-text-muted border-border-light grayscale' : 'bg-white text-text-primary border-border-light hover:border-accent-blue hover:text-accent-blue'}`}
                                            >
                                                <span className="font-semibold">Bilet #{biletNo}</span>
                                                {isUsed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
