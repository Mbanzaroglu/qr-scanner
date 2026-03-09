import { motion } from 'framer-motion';
import { LayoutDashboard, Ticket, Scan } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BottomNav = () => {
    const { activeTab, setActiveTab } = useAppContext();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'tickets', label: 'Biletler', icon: <Ticket size={20} /> },
        { id: 'scanner', label: 'Scanner', icon: <Scan size={20} /> },
    ];

    return (
        <nav className="md:hidden glass fixed bottom-0 left-0 right-0 h-20 border-t border-border-light flex items-center justify-around px-4 z-[50] pb-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex flex-col items-center justify-center w-20 py-1 transition-all"
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-primary text-accent-gold shadow-lg shadow-primary/20 scale-110 mb-1' : 'text-text-muted mb-1'}`}>
                        {tab.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === tab.id ? 'text-primary' : 'text-text-muted opacity-0'}`}>
                        {tab.label}
                    </span>
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute -top-1 w-8 h-1 bg-accent-gold rounded-full"
                        />
                    )}
                </button>
            ))}
        </nav>
    );
};

export default BottomNav;
