import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, Send, User, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { Ticket, TicketDetail, BiletDetay } from '../api';
import { useAppContext } from '../context/AppContext';
import { formatShowDateForUi } from '../lib/formatShowDate';

interface TicketDetailPanelProps {
    ticket: Ticket | null;
    onClose: () => void;
    onRefresh: () => void;
}

const TicketDetailPanel: React.FC<TicketDetailPanelProps> = ({ ticket, onClose, onRefresh }) => {
    const { pin } = useAppContext();
    const [detail, setDetail] = useState<TicketDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (ticket && pin) {
            fetchDetail();
        } else {
            setDetail(null);
        }
    }, [ticket, pin]);

    const fetchDetail = async () => {
        if (!ticket || !pin) return;
        setLoading(true);
        try {
            const result = await api.getTicket(ticket.row, pin);
            if (result.success) {
                setDetail(result.ticket);
            }
        } catch (err) {
            console.error('Fetch detail failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string, params: any = {}) => {
        if (!ticket || !pin) return;
        setProcessing(action);
        try {
            let result;
            if (action === 'checkIn') {
                result = await api.manualCheckIn(ticket.row, params.biletNo, pin);
            } else if (action === 'checkInAll') {
                result = await api.manualCheckInAll(ticket.row, pin);
            } else if (action === 'updatePayment') {
                result = await api.updatePayment(ticket.row, params.status, pin);
            } else if (action === 'resendQr') {
                result = await api.resendQr(ticket.row, pin);
            }

            if (result?.success) {
                await fetchDetail();
                onRefresh();
            } else {
                alert(result?.error || 'İşlem başarısız');
            }
        } catch (err) {
            alert('Sistem hatası');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <AnimatePresence>
            {ticket && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-bg-primary shadow-2xl z-[101] flex flex-col border-l border-accent-gold/20"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border-light bg-white flex justify-between items-center">
                            <h2 className="text-2xl">Müşteri Detayları</h2>
                            <button onClick={onClose} className="p-2 hover:bg-bg-primary rounded-full transition-colors text-text-muted">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {loading && !detail ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-text-muted text-sm">Yükleniyor...</p>
                                </div>
                            ) : detail ? (
                                <>
                                    {/* Info Section */}
                                    <section className="space-y-4">
                                        <InfoItem icon={<User size={18} />} label="Ad Soyad" value={detail.adSoyad} />
                                        <InfoItem icon={<Mail size={18} />} label="E-posta" value={detail.mail} />
                                        <InfoItem icon={<Phone size={18} />} label="Telefon" value={detail.telefon} />
                                        <InfoItem icon={<Calendar size={18} />} label="Etkinlik Tarihi" value={formatShowDateForUi(detail.hangiGun)} />
                                    </section>

                                    {/* Status Section */}
                                    <section className="bg-white p-5 rounded-soft border border-border-light shadow-sm space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Ödeme Durumu</span>
                                            <button
                                                disabled={processing === 'updatePayment'}
                                                onClick={() => handleAction('updatePayment', { status: !detail.odemeOnay })}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${detail.odemeOnay ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}
                                            >
                                                {processing === 'updatePayment' ? 'GÜNCELLENİYOR...' : (detail.odemeOnay ? 'ÖDEME ONAYLI' : 'ÖDEME BEKLEYEN')}
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-border-light">
                                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">E-posta Gönderimi</span>
                                            <button
                                                disabled={processing === 'resendQr' || !detail.odemeOnay}
                                                onClick={() => handleAction('resendQr')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-soft text-[10px] font-bold uppercase transition-all shadow-sm ${detail.odemeOnay ? 'bg-primary text-white hover:bg-primary/90' : 'bg-bg-primary text-text-muted cursor-not-allowed grayscale'}`}
                                            >
                                                <Send size={12} /> {processing === 'resendQr' ? 'GÖNDERİLİYOR...' : 'QR TEKRAR GÖNDER'}
                                            </button>
                                        </div>
                                    </section>

                                    {/* Individual Tickets */}
                                    <section className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <h3 className="text-xl">Biletler ({detail.kisiSayisi})</h3>
                                            <button
                                                disabled={processing === 'checkInAll' || detail.kalanBilet === 0 || !detail.odemeOnay}
                                                onClick={() => handleAction('checkInAll')}
                                                className="text-[10px] font-extrabold text-accent-gold hover:text-accent-gold/80 disabled:opacity-50 underline underline-offset-4 tracking-wider"
                                            >
                                                TÜMÜNE GİRİŞ YAP
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {detail.biletler.map((b) => (
                                                <BiletItem
                                                    key={b.biletNo}
                                                    bilet={b}
                                                    disabled={!detail.odemeOnay || processing === 'checkIn'}
                                                    onCheckIn={() => handleAction('checkIn', { biletNo: b.biletNo })}
                                                />
                                            ))}
                                        </div>
                                    </section>

                                    {/* Activity Log */}
                                    <section className="space-y-3">
                                        <h3 className="text-xl">İşlem Geçmişi</h3>
                                        <div className="bg-bg-primary/50 text-[11px] font-mono p-4 rounded-soft border border-border-light whitespace-pre-line leading-relaxed text-text-muted">
                                            {detail.log || 'Henüz işlem yapılmadı.'}
                                        </div>
                                    </section>
                                </>
                            ) : (
                                <div className="text-center p-10 text-text-muted italic flex flex-col items-center gap-4">
                                    <AlertCircle size={40} className="text-accent/20" />
                                    <span>Bilet bilgisi yüklenemedi.</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const InfoItem = ({ icon, label, value }: any) => (
    <div className="flex gap-4 p-4 rounded-soft bg-white border border-border-light shadow-sm">
        <div className="p-3 bg-primary/5 rounded-lg text-primary">{icon}</div>
        <div className="min-w-0">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{label}</div>
            <div className="text-sm font-semibold text-primary truncate">{value}</div>
        </div>
    </div>
);

const BiletItem = ({ bilet, onCheckIn, disabled }: { bilet: BiletDetay; onCheckIn: () => void; disabled: boolean }) => (
    <div className={`p-4 rounded-soft border flex items-center justify-between transition-all ${bilet.kullanildi ? 'bg-success/5 border-success/20 opacity-70 grayscale-[0.5]' : 'bg-white border-border-light shadow-sm'}`}>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${bilet.kullanildi ? 'bg-success text-white' : 'bg-bg-primary text-text-muted'}`}>
                {bilet.kullanildi ? <CheckCircle size={16} /> : <Clock size={16} />}
            </div>
            <div>
                <div className="font-bold text-primary text-sm tracking-tight">Bilet #{bilet.biletNo}</div>
                <div className="text-[9px] font-mono text-text-muted truncate max-w-[150px]">
                    {bilet.kullanildi ? 'KULLANILDI' : (bilet.qrId || 'BEKLEMEDE')}
                </div>
            </div>
        </div>
        {!bilet.kullanildi && (
            <button
                disabled={disabled}
                onClick={onCheckIn}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/10 tracking-widest"
            >
                GİRİŞ YAP
            </button>
        )}
    </div>
);

export default TicketDetailPanel;
