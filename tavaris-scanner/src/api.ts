const API_URL =
    import.meta.env.VITE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwCr9kPQtKWLeqDhfCfX9dtlWvyc5GHwf1nM0djj1nL4yOW9slve2Mzsk-2Bw2aHqg7Vg/exec';
    

/** Tek gösterim günü — sheet + scanner sekmeleri ile uyumlu */
export interface EventShowConfig {
    token: string;
    label: string;
    saat: string;
    limit: number;
    /** Dar ekran sekmesi (boşsa label kullanılır) */
    tabLabel: string;
}

/** GAS `Etkinlik Ayarları` sayfasından gelen genel etkinlik bilgisi */
export interface EventPublicConfig {
    eventName: string;
    venue: string;
    address: string;
    cityBadge: string;
    appBrandName: string;
    doorTime: string;
    gun1: EventShowConfig;
    gun2: EventShowConfig;
}

export interface EventConfigResponse {
    success: boolean;
    config?: EventPublicConfig;
    error?: string;
}

export interface Ticket {
    row: number;
    adSoyad: string;
    mail: string;
    telefon: string;
    hangiGun: string;
    kisiSayisi: number;
    odemeOnay: boolean;
    qrGonderildi: boolean;
    qrIds: string[];
    kalanBilet: number;
    okutulan: number;
    log: string;
}

export interface BiletDetay {
    biletNo: number;
    qrId: string | null;
    kullanildi: boolean;
}

export interface TicketDetail extends Ticket {
    biletler: BiletDetay[];
}

export interface DayStats {
    label: string;
    token: string;
    limit: number;
    odemeOnayli: number;
    odemeBekleyen: number;
    giris: number;
    kalan: number;
    doluluk: number;
}

export interface DashboardStats {
    success: boolean;
    stats: {
        toplamKayit: number;
        gun1: DayStats;
        gun2: DayStats;
    };
    error?: string;
}

export interface VerifyResult {
    status: 'ok' | 'used' | 'invalid' | 'pending' | 'wrong_date' | 'error';
    title: string;
    message: string;
    adSoyad: string | null;
    telefon: string | null;
    okutulan: number | null;
    toplam: number | null;
    biletNo: number | null;
    hangiGun?: string;
}
export type ScanResult = VerifyResult;
export interface Stats {
    total: number;
    used: number;
    remaining: number;
    limit: number;
}

/** Apps Script aksiyonlari genel basari/ hata cevabi */
export interface ApiActionResult {
    success: boolean;
    message?: string;
    error?: string;
    okutulan?: number;
    toplam?: number;
}

function eventConfigUrl(): string {
    const sep = API_URL.indexOf('?') >= 0 ? '&' : '?';
    return `${API_URL}${sep}action=eventConfig`;
}

export const api = {
    /**
     * Etkinlik metinleri ve gün token’ları (PIN gerekmez; Web App herkese açık deploy ile çalışır).
     */
    async getPublicEventConfig(): Promise<EventConfigResponse> {
        const response = await fetch(eventConfigUrl(), { method: 'GET' });
        return response.json();
    },

    async verifyQR(qr: string, date: string, pin: string): Promise<VerifyResult> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'verify', qr, date, pin })
        });
        return response.json();
    },

    async getStats(date: string, pin: string): Promise<Stats> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'stats', date, pin })
        });
        return response.json();
    },

    async getDashboardStats(pin: string): Promise<DashboardStats> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'dashboard', pin })
        });
        return response.json();
    },

    async searchTickets(query: string, date: string, pin: string): Promise<{ success: boolean; results: Ticket[]; total: number; error?: string }> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'search', query, date, pin })
        });
        return response.json();
    },

    async getAllTickets(date: string, page: number, pin: string): Promise<{ success: boolean; results: Ticket[]; total: number; page: number; totalPages: number; error?: string }> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'getAllTickets', date, page, limit: 50, pin })
        });
        return response.json();
    },

    async getTicket(row: number, pin: string): Promise<{ success: boolean; ticket: TicketDetail; error?: string }> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'getTicket', row, pin })
        });
        return response.json();
    },

    async manualCheckIn(row: number, biletNo: number, pin: string): Promise<ApiActionResult> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'manualCheckIn', row, biletNo, pin })
        });
        return response.json();
    },

    async manualCheckInAll(row: number, pin: string): Promise<ApiActionResult> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'manualCheckInAll', row, pin })
        });
        return response.json();
    },

    async updatePayment(row: number, status: boolean, pin: string): Promise<ApiActionResult> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'updatePayment', row, status, pin })
        });
        return response.json();
    },

    async resendQr(row: number, pin: string): Promise<ApiActionResult> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'resendQr', row, pin })
        });
        return response.json();
    }
};
