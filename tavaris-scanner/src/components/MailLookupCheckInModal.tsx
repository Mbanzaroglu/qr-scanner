import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { TicketDetail, BiletDetay } from '../api';
import { useAppContext } from '../context/AppContext';
import { formatShowDateForUi } from '../lib/formatShowDate';

interface MailLookupCheckInModalProps {
    row: number | null;
    onClose: () => void;
    /** Her başarılı girişten sonra (istatistik tazele) */
    onCheckInSuccess: () => void;
    /** Son okutmalar listesi (opsiyonel) */
    onGuestCheckIn?: (adSoyad: string) => void;
}

/**
 * E-posta sorgusu sonrası: verifyQR çağrılmaz; biletler numaralı listelenir, tek tek manualCheckIn.
 */
const MailLookupCheckInModal: React.FC<MailLookupCheckInModalProps> = ({
    row,
    onClose,
    onCheckInSuccess,
    onGuestCheckIn,
}) => {
    const { pin } = useAppContext();
    const [detail, setDetail] = useState<TicketDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [processingBilet, setProcessingBilet] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const loadDetail = useCallback(async () => {
        if (!row || !pin) return;
        setLoading(true);
        setFeedback(null);
        try {
            const res = await api.getTicket(row, pin);
            if (res.success && res.ticket) {
                setDetail(res.ticket);
            } else {
                setDetail(null);
                setFeedback(res.error || 'Kayıt yüklenemedi.');
            }
        } catch {
            setDetail(null);
            setFeedback('Bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    }, [row, pin]);

    useEffect(() => {
        if (row && pin) {
            loadDetail();
        } else {
            setDetail(null);
            setFeedback(null);
        }
    }, [row, pin, loadDetail]);

    const handleCheckIn = async (biletNo: number) => {
        if (!row || !pin || !detail?.odemeOnay) return;
        const adSoyadSnapshot = detail.adSoyad;
        setProcessingBilet(biletNo);
        setFeedback(null);
        try {
            const result = await api.manualCheckIn(row, biletNo, pin);
            if (result.success) {
                setFeedback(result.message || `Bilet #${biletNo} giriş onaylandı.`);
                onGuestCheckIn?.(adSoyadSnapshot);
                await loadDetail();
                onCheckInSuccess();
            } else {
                setFeedback(result.error || 'İşlem başarısız.');
            }
        } catch {
            setFeedback('Sistem hatası.');
        } finally {
            setProcessingBilet(null);
        }
    };

    if (row === null) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 pb-24 md:pb-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-primary/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    className="relative flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-elegant border border-border-light bg-white shadow-2xl"
                >
                    <div className="flex shrink-0 items-center justify-between border-b border-border-light bg-bg-primary px-5 py-4">
                        <h2 className="font-playfair text-lg text-primary">E-posta ile giriş</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-text-muted transition-colors hover:bg-white"
                            aria-label="Kapat"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        {loading && !detail ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-12">
                                <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                                <p className="text-sm text-text-muted">Biletler yükleniyor…</p>
                            </div>
                        ) : detail ? (
                            <div className="space-y-5">
                                <div className="space-y-2 rounded-soft border border-border-light bg-white p-4 text-sm shadow-sm">
                                    <Row icon={<User size={16} />} label="Ad Soyad" value={detail.adSoyad} />
                                    <Row icon={<Mail size={16} />} label="E-posta" value={detail.mail} />
                                    <Row icon={<Phone size={16} />} label="Telefon" value={detail.telefon} />
                                    <Row icon={<Calendar size={16} />} label="Tarih" value={formatShowDateForUi(detail.hangiGun)} />
                                </div>

                                {!detail.odemeOnay && (
                                    <div className="flex items-start gap-2 rounded-soft border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                                        <AlertCircle className="mt-0.5 shrink-0" size={18} />
                                        <span>Ödeme onayı yok; giriş yapılamaz.</span>
                                    </div>
                                )}

                                <div>
                                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                                        Biletler ({detail.kisiSayisi} kişi)
                                    </h3>
                                    <p className="mb-3 text-xs text-text-muted">
                                        Her bilet için ayrı &quot;Giriş onayla&quot; kullanın; sorgu tek başına okutma sayılmaz.
                                    </p>
                                    <ul className="space-y-2">
                                        {detail.biletler.map((b: BiletDetay) => (
                                            <li
                                                key={b.biletNo}
                                                className={`flex items-center justify-between gap-3 rounded-soft border p-3 ${
                                                    b.kullanildi
                                                        ? 'border-success/25 bg-success/5 opacity-80'
                                                        : 'border-border-light bg-white shadow-sm'
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div
                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                            b.kullanildi ? 'bg-success text-white' : 'bg-bg-primary text-text-muted'
                                                        }`}
                                                    >
                                                        {b.kullanildi ? <CheckCircle size={18} /> : <Clock size={18} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-primary">Bilet #{b.biletNo}</div>
                                                        <div className="truncate font-mono text-[10px] text-text-muted">
                                                            {b.kullanildi ? 'Giriş yapıldı' : 'Bekliyor'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!b.kullanildi && (
                                                    <button
                                                        type="button"
                                                        disabled={!detail.odemeOnay || processingBilet !== null}
                                                        onClick={() => handleCheckIn(b.biletNo)}
                                                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary/90 disabled:opacity-40"
                                                    >
                                                        {processingBilet === b.biletNo ? '…' : 'Giriş onayla'}
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {feedback && (
                                    <p className="rounded-soft border border-border-light bg-bg-primary px-3 py-2 text-center text-xs text-primary">
                                        {feedback}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-10 text-center text-text-muted">
                                <AlertCircle size={36} className="text-accent/40" />
                                <p className="text-sm">{feedback || 'Kayıt bulunamadı.'}</p>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-border-light bg-bg-primary p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded-soft bg-primary py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/15"
                        >
                            Kapat
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const Row = ({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) => (
    <div className="flex gap-3 border-b border-border-light/60 py-2 last:border-0 last:pb-0 first:pt-0">
        <span className="text-primary">{icon}</span>
        <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{label}</div>
            <div className="truncate font-medium text-primary">{value || '—'}</div>
        </div>
    </div>
);

export default MailLookupCheckInModal;
