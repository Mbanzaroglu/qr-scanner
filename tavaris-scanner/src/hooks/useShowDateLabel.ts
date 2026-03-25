// Decision: Context wrapper değil — saf gösterim metni; hook ile memoize edilir (alt ağaçta tekrar hesap yok).
import { useMemo } from 'react';
import { formatShowDateForUi } from '../lib/formatShowDate';

/**
 * Dashboard kartları vb. için gösteri tarihi ("7 Nisan"); `formatShowDateForUi` ile aynı mantık.
 */
export function useShowDateLabel(value: string | null | undefined): string {
    return useMemo(() => formatShowDateForUi(value), [value]);
}
