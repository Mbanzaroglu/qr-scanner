import type { EventShowConfig } from '../api';

/**
 * Bilet satırındaki hangiGun metni, seçilen gün (token) ile aynı gösterim gününe denk mi?
 * Apps Script sameGunDay_ ile aynı fikir; tam parity yok ama tipik token / etiket / dd.MM biçimlerini kapsar.
 */
function matchesGunSlot(hangiNorm: string, gun: EventShowConfig): boolean {
    const h = hangiNorm;
    const token = String(gun.token || '')
        .trim()
        .toLowerCase();
    const label = String(gun.label || '')
        .trim()
        .toLowerCase();
    const tab = String(gun.tabLabel || gun.label || '')
        .trim()
        .toLowerCase();

    if (!h) return false;
    if (token && (h === token || h.includes(token) || token.includes(h))) return true;
    if (label && (h.includes(label) || label.includes(h))) return true;
    if (tab && tab !== label && (h.includes(tab) || tab.includes(h))) return true;

    const dayFromLabel = label.match(/^(\d{1,2})/);
    if (dayFromLabel) {
        const d = dayFromLabel[1];
        const re = new RegExp('(^|[^0-9])0*' + d + '(?![0-9])');
        if (re.test(h)) return true;
    }

    const iso = h.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const ddmm = h.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    const labDd = label.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (iso && labDd) {
        if (iso[3] === labDd[1] && iso[2] === labDd[2] && iso[1] === labDd[3]) return true;
    }
    if (ddmm && labDd) {
        if (ddmm[1] === labDd[1] && ddmm[2] === labDd[2] && ddmm[3] === labDd[3]) return true;
    }

    return false;
}

export function ticketMatchesSelectedDay(
    hangiGun: string,
    selectedToken: string | null,
    gun1: EventShowConfig,
    gun2: EventShowConfig
): boolean {
    if (selectedToken === null) return true;
    if (selectedToken === gun1.token) return matchesGunSlot(hangiGun.trim().toLowerCase(), gun1);
    if (selectedToken === gun2.token) return matchesGunSlot(hangiGun.trim().toLowerCase(), gun2);
    return true;
}
