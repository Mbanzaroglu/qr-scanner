import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Ticket, Scan, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Sidebar = () => {
    const { activeTab, setActiveTab, setPin } = useAppContext();
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'tickets', label: 'Biletler', icon: <Ticket size={20} /> },
        { id: 'scanner', label: 'Scanner', icon: <Scan size={20} /> },
    ];

    return (
        <motion.aside
            animate={{ width: collapsed ? 80 : 280 }}
            className="hidden md:flex flex-col bg-white border-r border-border-light h-screen sticky top-0 z-[50] shadow-sm transition-all"
        >
            {/* Logo area */}
            <div className="p-8 flex items-center gap-4 border-b border-border-light/50 overflow-hidden">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-accent-gold shadow-lg shrink-0">
                    <span className="font-playfair text-xl font-bold">T</span>
                </div>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="font-playfair text-2xl font-bold tracking-tight text-primary whitespace-nowrap"
                    >
                        Tavariş
                    </motion.div>
                )}
            </div>

            {/* Nav area */}
            <nav className="flex-1 p-4 space-y-2 mt-4">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-soft transition-all group ${activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-bg-primary hover:text-primary'}`}
                    >
                        <span className={`transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-accent-gold' : ''}`}>
                            {item.icon}
                        </span>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="font-bold text-[13px] uppercase tracking-widest whitespace-nowrap"
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Footer area */}
            <div className="p-4 space-y-2 border-t border-border-light/50">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center gap-4 p-4 rounded-soft text-text-muted hover:bg-bg-primary transition-all group"
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    {!collapsed && <span className="text-[13px] font-bold uppercase tracking-widest">Daralt</span>}
                </button>
                <button
                    onClick={() => setPin(null)}
                    className="w-full flex items-center gap-4 p-4 rounded-soft text-accent/70 hover:bg-accent/5 hover:text-accent transition-all group"
                >
                    <LogOut size={20} />
                    {!collapsed && <span className="text-[13px] font-bold uppercase tracking-widest">Çıkış Yap</span>}
                </button>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
