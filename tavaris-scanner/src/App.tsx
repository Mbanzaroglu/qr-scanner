import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext';
import { api } from './api';
import type { Ticket } from './api';

// Components
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import TicketDetailPanel from './components/TicketDetailPanel';
import ResultModal from './components/ResultModal';

// Views
import Dashboard from './views/Dashboard';
import Tickets from './views/Tickets';
import ScannerView from './views/ScannerView';

// Icons
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

const App = () => {
  const {
    pin, setPin,
    selectedDate,
    activeTab,
    dashboardStats, setDashboardStats,
    addRecentScan
  } = useAppContext();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  // Online/Offline handling
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Periodic stats refresh
  useEffect(() => {
    if (!pin) return;

    const refreshStats = async () => {
      try {
        const res = await api.getDashboardStats(pin);
        if (res.success) setDashboardStats(res);
      } catch (err) {
        console.error('Stats refresh failed:', err);
      }
    };

    refreshStats();
    const interval = setInterval(refreshStats, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [pin]);

  const handleScan = async (qrData: string) => {
    if (!pin || !selectedDate || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await api.verifyQR(qrData, selectedDate, pin);
      setScanResult(result);

      if (result.status === 'ok') {
        addRecentScan({
          name: result.adSoyad,
          status: 'ok',
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        });
        // Trigger stats refresh
        const res = await api.getDashboardStats(pin);
        if (res.success) setDashboardStats(res);
      }
    } catch (err) {
      setScanResult({
        status: 'error',
        title: 'Bağlantı Hatası',
        message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!pin) {
    return <Login onLogin={setPin} />;
  }

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 relative h-full pb-20 md:pb-0">
        {/* Header / Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md border-b border-border-light z-40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-accent-gold shrink-0">
              <span className="font-playfair text-sm font-bold">T</span>
            </div>
            <h2 className="font-playfair text-lg text-primary md:hidden">Tavariş</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isOnline ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
              {isOnline ? <><Wifi size={12} /> Çevrimiçi</> : <><WifiOff size={12} /> Çevrimdışı</>}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 min-h-0">
          <div className="max-w-7xl mx-auto min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="min-h-full"
              >
                {activeTab === 'dashboard' && <Dashboard stats={dashboardStats?.stats || null} />}
                {activeTab === 'tickets' && (
                  <Tickets
                    onViewDetail={setSelectedTicket}
                    onShowLoading={setIsProcessing}
                  />
                )}
                {activeTab === 'scanner' && (
                  <ScannerView
                    onScan={handleScan}
                    isProcessing={isProcessing}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <BottomNav />
      </main>

      {/* Overlays */}
      <TicketDetailPanel
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onRefresh={async () => {
          if (!pin) return;
          const res = await api.getDashboardStats(pin);
          if (res.success) setDashboardStats(res);
        }}
      />

      <ResultModal
        result={scanResult}
        onClose={() => setScanResult(null)}
      />

      {/* Global Error/Warning for Offline */}
      {!isOnline && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] bg-accent text-white px-6 py-3 rounded-soft shadow-2xl flex items-center gap-3 animate-bounce">
          <AlertTriangle size={20} />
          <span className="text-xs font-bold uppercase tracking-widest">İnternet Bağlantısı Yok!</span>
        </div>
      )}
    </div>
  );
};

export default App;
