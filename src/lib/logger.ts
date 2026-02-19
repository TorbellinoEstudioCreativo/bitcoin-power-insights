// ============================================================================
// LOGGER UTILITY - Silent in production, verbose in development
// ============================================================================

const isDev = import.meta.env.DEV;

export const logger = {
  log(message: string, ...args: unknown[]) {
    if (isDev) console.log(message, ...args);
  },
  warn(message: string, ...args: unknown[]) {
    if (isDev) console.warn(message, ...args);
  },
  error(message: string, ...args: unknown[]) {
    // Errors always log (useful for production debugging)
    console.error(message, ...args);
  },
  debug(message: string, ...args: unknown[]) {
    if (isDev) console.debug(message, ...args);
  },
};
