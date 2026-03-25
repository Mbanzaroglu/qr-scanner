import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DashboardStats, EventPublicConfig } from '../api';
import { api } from '../api';
import { resolveAppBrandName } from '../lib/branding';

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
    /** Decision: Centralized management — etkinlik metinleri tüm rotalar/sekmelerde ortak */
    eventConfig: EventPublicConfig | null;
    eventConfigError: boolean;
    loadEventConfig: () => Promise<void>;
    /** Üst bar / sidebar / giriş — VITE_APP_BRAND_NAME veya sheet appBrandName (organizasyon vb.) */
    appBrandName: string;
    /** Ana başlık: sheet EVENT_NAME (= script’te ETKINLIK_ADI), yoksa appBrandName */
    eventTitle: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pin, setPinState] = useState<string | null>(localStorage.getItem('tavaris_pin'));
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [eventConfig, setEventConfig] = useState<EventPublicConfig | null>(null);
    const [eventConfigError, setEventConfigError] = useState(false);

    const loadEventConfig = useCallback(async () => {
        try {
            const res = await api.getPublicEventConfig();
            if (res.success && res.config) {
                setEventConfig(res.config);
                setEventConfigError(false);
            } else {
                setEventConfigError(true);
            }
        } catch {
            setEventConfigError(true);
        }
    }, []);

    const setPin = (newPin: string | null) => {
        setPinState(newPin);
        if (newPin) localStorage.setItem('tavaris_pin', newPin);
        else localStorage.removeItem('tavaris_pin');
    };

    const addRecentScan = (scan: any) => {
        setRecentScans(prev => [scan, ...prev.slice(0, 9)]);
    };

    const clearRecentScans = () => setRecentScans([]);

    const appBrandName = useMemo(
        () => resolveAppBrandName(eventConfig?.appBrandName),
        [eventConfig?.appBrandName]
    );

    const eventTitle = useMemo(() => {
        const n = eventConfig?.eventName?.trim();
        if (n) return n;
        return appBrandName;
    }, [eventConfig?.eventName, appBrandName]);

    return (
        <AppContext.Provider value={{
            pin, setPin,
            selectedDate, setSelectedDate,
            activeTab, setActiveTab,
            dashboardStats, setDashboardStats,
            recentScans, addRecentScan, clearRecentScans,
            eventConfig, eventConfigError, loadEventConfig,
            appBrandName,
            eventTitle
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
