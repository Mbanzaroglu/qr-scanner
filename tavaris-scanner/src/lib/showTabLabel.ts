/**
 * Gün sekmesi metnini kısaltır: "7 Nisan Salı" → "7 Nisan" (hafta günü kaldırılır, pill tek satırda kalır).
 */
export function compactShowTabLabel(label: string): string {
    const t = label.trim();
    if (!t) return t;
    const re =
        /\s+(?:Pazartesi|Pazar|Salı|Sali|Çarşamba|Carsamba|Perşembe|Persembe|Cuma|Cumartesi)\s*$/iu;
    const out = t.replace(re, '').trim();
    return out || t;
}
