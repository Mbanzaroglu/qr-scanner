import { compactShowTabLabel } from './showTabLabel';

const TR_MONTHS = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
];

/** Metnin sonundaki saat dilimini kaldırır (örn. "07.04.2026 00:00" → "07.04.2026"). */
function stripTrailingClock(s: string): string {
    return s.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?\s*$/, '').trim();
}

/**
 * Sheet / GAS’tan gelen gösteri tarihini "7 Nisan" biçimine çevirir; tanınmayan metinde yalnızca hafta günü kısaltması uygulanır.
 */
export function formatShowDateForUi(raw: string | null | undefined): string {
    if (raw == null) return '';
    let s = String(raw).trim();
    if (!s) return '';

    s = stripTrailingClock(s);

    const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddmmyyyy) {
        const day = parseInt(ddmmyyyy[1], 10);
        const month = parseInt(ddmmyyyy[2], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return compactShowTabLabel(`${day} ${TR_MONTHS[month - 1]}`);
        }
    }

    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const day = parseInt(slash[1], 10);
        const month = parseInt(slash[2], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return compactShowTabLabel(`${day} ${TR_MONTHS[month - 1]}`);
        }
    }

    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        const day = parseInt(iso[3], 10);
        const month = parseInt(iso[2], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return compactShowTabLabel(`${day} ${TR_MONTHS[month - 1]}`);
        }
    }

    return compactShowTabLabel(s);
}
