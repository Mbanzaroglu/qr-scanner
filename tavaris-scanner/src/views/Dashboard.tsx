import React from 'react';
import { motion } from 'framer-motion';
import { Users, Ticket, CheckCircle, Clock } from 'lucide-react';
import type { DayStats } from '../api';

interface DashboardProps {
    stats: {
        toplamKayit: number;
        gun1: DayStats;
        gun2: DayStats;
    } | null;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
    if (!stats) return (
        <div className="flex-1 flex items-center justify-center p-10">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl text-primary mb-2">Genel Bakış</h1>
                    <p className="text-text-muted">Etkinlik doluluk ve giriş durumları.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-soft border border-border-light shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary">
                        <Users size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Toplam Kayıt</div>
                        <div className="text-xl font-bold text-primary">{stats.toplamKayit}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <EventCard dayStats={stats.gun1} />
                <EventCard dayStats={stats.gun2} />
            </div>
        </motion.div>
    );
};

const EventCard = ({ dayStats }: { dayStats: DayStats }) => (
    <div className="card card-hover p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl md:text-3xl mb-1">{dayStats.label}</h2>
                <span className="px-3 py-1 bg-accent-gold/10 text-accent-gold text-xs font-bold rounded-full border border-accent-gold/20">
                    KAPASİTE: {dayStats.limit}
                </span>
            </div>
            <div className={`text-3xl font-playfair font-bold ${dayStats.doluluk > 90 ? 'text-accent' : 'text-primary'}`}>
                %{dayStats.doluluk}
            </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-text-muted uppercase tracking-widest">
                <span>Doluluk Oranı</span>
                <span>{dayStats.odemeOnayli} / {dayStats.limit}</span>
            </div>
            <div className="h-3 w-full bg-bg-primary rounded-full overflow-hidden border border-border-light p-0.5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dayStats.doluluk}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${dayStats.doluluk > 90 ? 'bg-accent' : 'bg-primary shadow-[0_0_10px_rgba(26,68,128,0.3)]'}`}
                />
            </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
            <StatSmall label="Giriş Yapan" value={dayStats.giris} icon={<CheckCircle size={14} />} color="success" />
            <StatSmall label="Onaylı Bilet" value={dayStats.odemeOnayli} icon={<Ticket size={14} />} color="primary" />
            <StatSmall label="Kalan Bilet" value={dayStats.kalan} icon={<Clock size={14} />} color="accent-gold" />
        </div>
    </div>
);

const StatSmall = ({ label, value, icon, color }: any) => {
    const colorClasses: any = {
        success: 'text-success bg-success/5 border-success/10',
        primary: 'text-primary bg-primary/5 border-primary/10',
        'accent-gold': 'text-accent-gold bg-accent-gold/5 border-accent-gold/10',
    };

    return (
        <div className={`p-4 rounded-soft border flex flex-col items-center text-center space-y-2 ${colorClasses[color]}`}>
            <div className="opacity-70">{icon}</div>
            <div className="text-xl font-bold leading-none">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-tight opacity-70 whitespace-nowrap">{label}</div>
        </div>
    );
};

export default Dashboard;
