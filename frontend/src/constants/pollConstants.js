/**
 * How often the Dashboard, Genset and DPM pages reload their data from the API (milliseconds).
 * Change it here to change all three pages (see hooks/usePolling.js).
 * The backend stores a new reading every Recording:SaveIntervalSeconds (300 s), so a new value
 * appears on screen within 1 second of reaching the database.
 */
export const POLL_INTERVAL = 1000; // 1 second
