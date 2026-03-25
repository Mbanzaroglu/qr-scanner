import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext';
import { api } from './api';
import type { Ticket } from './api';

// Components
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import TicketDetailPanel from './components/TicketDetailPanel';
import MailLookupCheckInModal from './components/MailLookupCheckInModal';
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
    addRecentScan,
    eventConfig,
    loadEventConfig,
    appBrandName,
    eventTitle
  } = useAppContext();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Aynı anda birden fazla verify (QR kareleri arka arkaya) tetiklenmesin */
  const isProcessingRef = useRef(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  /** E-posta sorgusu: satır seçildi; verifyQR yok, modal içinde manualCheckIn */
  const [mailCheckInRow, setMailCheckInRow] = useState<number | null>(null);

  useEffect(() => {
    loadEventConfig();
  }, [loadEventConfig]);

  useEffect(() => {
    if (eventConfig?.eventName) {
      document.title = `${eventConfig.eventName} · ${appBrandName}`;
    }
  }, [eventConfig?.eventName, appBrandName]);

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

  const handleScan = useCallback(
    async (qrData: string) => {
      if (!pin || !selectedDate || isProcessingRef.current) return;
      isProcessingRef.current = true;
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
          const res = await api.getDashboardStats(pin);
          if (res.success) setDashboardStats(res);
        }
      } catch {
        setScanResult({
          status: 'error',
          title: 'Bağlantı Hatası',
          message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.',
          adSoyad: null,
          telefon: null,
          okutulan: null,
          toplam: null,
          biletNo: null
        });
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [pin, selectedDate, addRecentScan, setDashboardStats]
  );

  /**
   * E-posta ile sorgu: verifyQR çağrılmaz (sorgu okutma sayılmaz).
   * Eşleşen satırda biletler modalda listelenir; giriş tek tek manualCheckIn ile.
   */
  const handleManualEmailLookup = useCallback(
    async (emailRaw: string) => {
      if (!pin || !selectedDate || isProcessingRef.current) return;
      const email = emailRaw.trim().toLowerCase();
      if (!email) return;

      isProcessingRef.current = true;
      setIsProcessing(true);
      try {
        const search = await api.searchTickets(email, selectedDate, pin);
        if (!search.success) {
          setScanResult({
            status: 'error',
            title: 'Sorgu Hatası',
            message: search.error || 'Arama yapılamadı.',
            adSoyad: null,
            telefon: null,
            okutulan: null,
            toplam: null,
            biletNo: null
          });
          return;
        }
        if (search.results.length === 0) {
          setScanResult({
            status: 'invalid',
            title: 'Kayıt Bulunamadı',
            message: 'Bu e-posta ile eşleşen bilet yok.',
            adSoyad: null,
            telefon: null,
            okutulan: null,
            toplam: null,
            biletNo: null
          });
          return;
        }

        const ticket =
          search.results.find((t) => (t.mail || '').toString().toLowerCase() === email) ??
          search.results[0];

        if (!ticket.odemeOnay) {
          setScanResult({
            status: 'pending',
            title: 'Ödeme Onaylanmamış',
            message: 'Bu biletin ödemesi henüz onaylanmadı.',
            adSoyad: ticket.adSoyad,
            telefon: ticket.telefon,
            okutulan: ticket.okutulan,
            toplam: ticket.kisiSayisi,
            biletNo: null
          });
          return;
        }

        if (ticket.kalanBilet === 0) {
          setScanResult({
            status: 'used',
            title: 'Biletler Kullanılmış',
            message: 'Bu kayıt için kullanılabilir bilet kalmadı.',
            adSoyad: ticket.adSoyad,
            telefon: ticket.telefon,
            okutulan: ticket.okutulan,
            toplam: ticket.kisiSayisi,
            biletNo: null
          });
          return;
        }

        setMailCheckInRow(ticket.row);
      } catch {
        setScanResult({
          status: 'error',
          title: 'Bağlantı Hatası',
          message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.',
          adSoyad: null,
          telefon: null,
          okutulan: null,
          toplam: null,
          biletNo: null
        });
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [pin, selectedDate]
  );

  const refreshAfterMailCheckIn = useCallback(async () => {
    if (!pin) return;
    const res = await api.getDashboardStats(pin);
    if (res.success) setDashboardStats(res);
  }, [pin, setDashboardStats]);

  if (!pin) {
    return <Login onLogin={setPin} />;
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 bg-bg-primary overflow-hidden">
      <Sidebar />

      <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col max-md:pb-0 md:pb-0">
        {/*
          Mobil: üst bar fixed + safe-area; kaydırma alanına pt/pb verilir ki içerik çubukların altında kalmasın.
          Masaüstü: akış içi header, normal padding.
        */}
        <header className="z-[45] shrink-0 border-b border-border-light bg-white/50 backdrop-blur-md max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:pt-[env(safe-area-inset-top,0px)] md:relative md:top-auto md:pt-0">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <div className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-accent-gold">
                <span className="font-playfair text-sm font-bold">
                  {eventTitle.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="max-w-[40vw] truncate font-playfair text-lg text-primary md:hidden">
                {eventTitle}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isOnline ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}
              >
                {isOnline ? (
                  <>
                    <Wifi size={12} /> Çevrimiçi
                  </>
                ) : (
                  <>
                    <WifiOff size={12} /> Çevrimdışı
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 md:px-8 lg:px-12 md:py-8 lg:py-12 max-md:scroll-pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] max-md:pt-[calc(4rem+env(safe-area-inset-top,0px)+1rem)] max-md:pb-[calc(5.75rem+env(safe-area-inset-bottom,0px)+1rem)]"
        >
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
                  <div className="flex min-h-[min(88dvh,720px)] flex-col md:min-h-[calc(100dvh-10rem)]">
                    <ScannerView
                      onScan={handleScan}
                      onManualEmailLookup={handleManualEmailLookup}
                      isProcessing={isProcessing}
                    />
                  </div>
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

      <MailLookupCheckInModal
        row={mailCheckInRow}
        onClose={() => setMailCheckInRow(null)}
        onCheckInSuccess={refreshAfterMailCheckIn}
        onGuestCheckIn={(adSoyad) =>
          addRecentScan({
            name: adSoyad,
            status: 'ok',
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          })
        }
      />

      <ResultModal
        result={scanResult}
        onClose={() => setScanResult(null)}
      />

      {/* Global Error/Warning for Offline */}
      {!isOnline && (
        <div className="fixed left-1/2 z-[1000] flex -translate-x-1/2 animate-bounce items-center gap-3 rounded-soft bg-accent px-6 py-3 text-white shadow-2xl max-md:top-[calc(4rem+env(safe-area-inset-top,0px)+0.5rem)] md:top-20">
          <AlertTriangle size={20} />
          <span className="text-xs font-bold uppercase tracking-widest">İnternet Bağlantısı Yok!</span>
        </div>
      )}
    </div>
  );
};

export default App;
