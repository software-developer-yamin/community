/**
 * Native language utility: mapping, validation, and default detection.
 *
 * All 6 supported languages displayed in their native script:
 *   বাংলা, English, हिन्दी, العربية, Español, Français
 */

/** Canonical map: normalized key → display name with native script + stored value */
export const NATIVE_LANG_MAP = [
  { key: "bangla", label: "বাংলা", value: "bangla" },
  { key: "english", label: "English", value: "english" },
  { key: "hindi", label: "हिन्दी", value: "hindi" },
  { key: "arabic", label: "العربية", value: "arabic" },
  { key: "spanish", label: "Español", value: "spanish" },
  { key: "french", label: "Français", value: "french" },
] as const;

export type NativeLangKey = (typeof NATIVE_LANG_MAP)[number]["key"];
export type NativeLangValue = (typeof NATIVE_LANG_MAP)[number]["value"];

/** Default fallback — Bangladesh market majority */
export const DEFAULT_NATIVE_LANG = "bn" as const;

/** Country-code prefix → default native language inference */
const COUNTRY_LANG_MAP: Record<string, string> = {
  "+880": "bangla", // Bangladesh
  "+91": "hindi", // India
  "+92": "hindi", // Pakistan (Urdu ~ Hindi for conv)
  "+966": "arabic", // Saudi Arabia
  "+971": "arabic", // UAE
  "+974": "arabic", // Qatar
  "+973": "arabic", // Bahrain
  "+965": "arabic", // Kuwait
  "+968": "arabic", // Oman
  "+20": "arabic", // Egypt
  "+212": "arabic", // Morocco
  "+216": "arabic", // Tunisia
  "+213": "arabic", // Algeria
  "+218": "arabic", // Libya
  "+249": "arabic", // Sudan
  "+34": "spanish", // Spain
  "+52": "spanish", // Mexico
  "+54": "spanish", // Argentina
  "+57": "spanish", // Colombia
  "+56": "spanish", // Chile
  "+51": "spanish", // Peru
  "+33": "french", // France
  "+221": "french", // Senegal
  "+225": "french", // Côte d'Ivoire
  "+261": "french", // Madagascar
};

/**
 * Detect default native language from phone number country code.
 * Returns the normalized value (e.g. "bangla") or null if unknown.
 */
export function detectDefaultLang(phoneNumber: string | null): string | null {
  if (!phoneNumber) return null;

  const normalized = phoneNumber.replace(/\s+/g, "");
  // Sort prefixes longest-first so "+880" wins before "+88"
  const prefix = Object.keys(COUNTRY_LANG_MAP).sort(
    (a, b) => b.length - a.length
  ).find((p) => normalized.startsWith(p));

  return prefix ? (COUNTRY_LANG_MAP[prefix] ?? null) : null;
}

/** Valid language values for input validation */
export const VALID_LANG_VALUES = NATIVE_LANG_MAP.map((l) => l.value);

/** Check if a value is a valid native language */
export function isValidNativeLang(value: string): boolean {
  return (VALID_LANG_VALUES as readonly string[]).includes(value);
}

/** Display label for a stored value */
export function getLangLabel(value: string): string {
  return NATIVE_LANG_MAP.find((l) => l.value === value)?.label ?? value;
}
