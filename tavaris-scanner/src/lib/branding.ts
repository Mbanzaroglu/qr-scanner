/**
 * Uygulama adı (üst bar, sidebar, giriş): önce build zamanı env, yoksa sheet’ten gelen appBrandName.
 */
const envBrand = (import.meta.env.VITE_APP_BRAND_NAME as string | undefined)?.trim();

export function resolveAppBrandName(sheetBrand?: string | null): string {
    if (envBrand) return envBrand;
    const fromSheet = sheetBrand?.trim();
    if (fromSheet) return fromSheet;
    return 'Bilet Kontrol';
}
