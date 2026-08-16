// Backend base URL. Empty string = same-origin (dev via Vite proxy, or
// same-domain prod deploy). Set VITE_API_BASE_URL when frontend and backend
// run on separate Coolify domains.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
