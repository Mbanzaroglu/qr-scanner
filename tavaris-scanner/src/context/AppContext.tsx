import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { DashboardStats } from '../api';

interface AppContextType {
    pin: string | null;
    setPin: (pin: string | null) => void;
    selectedDate: string | null;
    setSelectedDate: (date: string | null) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    dashboardStats: DashboardStats | null;
    setDashboardStats: (stats: DashboardStats | null) => void;
    recentScans: any[];
    addRecentScan: (scan: any) => void;
    clearRecentScans: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pin, setPinState] = useState<string | null>(localStorage.getItem('tavaris_pin'));
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [recentScans, setRecentScans] = useState<any[]>([]);

    const setPin = (newPin: string | null) => {
        setPinState(newPin);
        if (newPin) localStorage.setItem('tavaris_pin', newPin);
        else localStorage.removeItem('tavaris_pin');
    };

    const addRecentScan = (scan: any) => {
        setRecentScans(prev => [scan, ...prev.slice(0, 9)]);
    };

    const clearRecentScans = () => setRecentScans([]);

    return (
        <AppContext.Provider value={{
            pin, setPin,
            selectedDate, setSelectedDate,
            activeTab, setActiveTab,
            dashboardStats, setDashboardStats,
            recentScans, addRecentScan, clearRecentScans
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within AppProvider');
    return context;
};
