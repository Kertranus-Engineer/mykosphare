import { DEFAULT_LAB_THEME, LAB_THEMES, LAB_THEME_STORAGE_KEY } from "./lab-request"

/**
 * Inline script (runs before first paint) that applies the lab theme from its
 * stored preference, so there is no flash of the wrong look. Built from the same
 * constants the provider uses, so the two can never disagree.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(LAB_THEME_STORAGE_KEY)});var ok=${JSON.stringify(LAB_THEMES)};document.documentElement.setAttribute("data-hv2-theme",ok.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_LAB_THEME)})}catch(e){document.documentElement.setAttribute("data-hv2-theme",${JSON.stringify(DEFAULT_LAB_THEME)})}`
