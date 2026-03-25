import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check } from 'lucide-react';
import { api } from '../api';
import type { Ticket } from '../api';
import { useAppContext } from '../context/AppContext';
import { compactShowTabLabel } from '../lib/showTabLabel';

interface TicketsProps {
    onViewDetail: (ticket: Ticket) => void;
    onShowLoading: (show: boolean) => void;
}

const Tickets = ({ onViewDetail }: TicketsProps) => {
    const { pin, selectedDate, setSelectedDate, eventConfig } = useAppContext();
    const [query, setQuery] = useState('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [loading, setLoading] = useState(false);

    const fetchTickets = useCallback(async () => {
        if (!pin) return;
        setLoading(true);
        try {
            const dateStr = selectedDate || 'all';
            const result = await api.searchTickets(query, dateStr, pin);
            if (result.success) {
                setTickets(result.results);
            }
        } catch (err) {
            console.error('Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [pin, selectedDate, query]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTickets();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchTickets]);

    useEffect(() => {
        let result = [...tickets];
        if (filterStatus === 'paid') result = result.filter(t => t.odemeOnay);
        else if (filterStatus === 'unpaid') result = result.filter(t => !t.odemeOnay);
        setFilteredTickets(result);
    }, [tickets, filterStatus]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 flex flex-col min-h-full pb-10"
        >
            <div className="flex flex-col items-center gap-6">
                <h1 className="text-3xl md:text-4xl text-primary text-center">Bilet Listesi</h1>

                {/* Date Tabs - Centered & Fitted */}
                <div className="flex bg-white/80 p-1.5 rounded-soft border border-border-light backdrop-blur-md shadow-sm w-full max-w-md mx-auto">
                    <DateTab label="Tümü" active={selectedDate === null} onClick={() => setSelectedDate(null)} />
                    {eventConfig ? (
                        <>
                            <DateTab
                                label={compactShowTabLabel(eventConfig.gun1.tabLabel)}
                                active={selectedDate === eventConfig.gun1.token}
                                onClick={() => setSelectedDate(eventConfig.gun1.token)}
                            />
                            <DateTab
                                label={compactShowTabLabel(eventConfig.gun2.tabLabel)}
                                active={selectedDate === eventConfig.gun2.token}
                                onClick={() => setSelectedDate(eventConfig.gun2.token)}
                            />
                        </>
                    ) : (
                        <div className="flex-[2] flex items-center justify-center py-2.5 text-[11px] text-text-muted">
                            Günler yükleniyor…
                        </div>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="İsim, e-posta, telefon veya QR ID ile ara..."
                        className="input-elegant pl-12 shadow-sm"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                </div>

                <PremiumSelect
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                        { id: 'all', label: 'FİLTRELE: TÜMÜ' },
                        { id: 'paid', label: 'SADECE ONAYLI' },
                        { id: 'unpaid', label: 'ÖDEME BEKLEYEN' },
                    ]}
                />
            </div>

            {/* Table Container - Fixed header alignment and corner gaps */}
            <div className="bg-white border border-border-light rounded-elegant shadow-elegant overflow-hidden mx-1 md:mx-4">
                <table className="w-full text-left border-spacing-0 table-fixed">
                    <thead className="bg-[#faf8f0] border-b border-border-light">
                        <tr>
                            <th className="px-6 md:px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted w-2/3 first:rounded-tl-elegant">Ad Soyad / İletİŞİm</th>
                            <th className="px-6 md:px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right last:rounded-tr-elegant">Tarİh</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light/50">
                        {loading && tickets.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="p-20 text-center">
                                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : filteredTickets.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="p-20 text-center text-text-muted italic text-sm">Kayıt bulunamadı.</td>
                            </tr>
                        ) : (
                            filteredTickets.map((t: Ticket) => (
                                <tr
                                    key={t.row}
                                    onClick={() => onViewDetail(t)}
                                    className="group hover:bg-primary/[0.04] active:bg-primary/[0.08] cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-accent-gold"
                                >
                                    <td className="px-6 md:px-8 py-6">
                                        <div className="font-bold text-primary text-[17px] group-hover:text-primary transition-colors font-playfair truncate">{t.adSoyad}</div>
                                        <div className="text-[12px] text-text-muted mt-1 opacity-80 truncate">{t.mail}</div>
                                        <div className="text-[12px] text-text-muted opacity-80">{t.telefon}</div>
                                    </td>
                                    <td className="px-6 md:px-8 py-6 text-right">
                                        <div className="flex justify-end">
                                            <span className="inline-flex flex-col items-center justify-center min-w-[90px] md:min-w-[100px] py-2 px-3 md:px-4 bg-bg-primary rounded-2xl border border-border-light group-hover:border-accent-gold/40 transition-all shadow-sm group-hover:shadow-md group-hover:bg-white">
                                                <span className="text-[11px] md:text-[12px] font-bold text-primary leading-tight font-playfair">{t.hangiGun.split(' ')[0]} {t.hangiGun.split(' ')[1]}</span>
                                                <span className="text-[8px] md:text-[9px] font-extrabold text-text-muted uppercase tracking-[0.2em] mt-0.5">{t.hangiGun.split(' ')[2]}</span>
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

const DateTab = ({ label, active, onClick }: any) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 whitespace-nowrap px-2 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-soft transition-all sm:px-3 sm:text-[11px] ${active ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-primary/5 hover:text-primary'}`}
    >
        {label}
    </button>
);

const PremiumSelect = ({ value, onChange, options }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((o: any) => o.id === value);

    return (
        <div className="relative min-w-[220px]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-white border-2 border-border-light rounded-soft px-5 py-3.5 font-bold text-[11px] uppercase tracking-widest text-primary hover:border-primary/30 transition-all shadow-sm group"
            >
                <span>{selectedOption?.label}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="text-primary/50 group-hover:text-primary transition-colors"
                >
                    <ChevronDown size={16} />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute mt-2 w-full bg-white border border-border-light rounded-soft shadow-2xl z-[61] overflow-hidden p-1.5"
                        >
                            {options.map((opt: any) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${value === opt.id ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-bg-primary hover:text-primary'}`}
                                >
                                    {opt.label}
                                    {value === opt.id && <Check size={14} />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tickets;
