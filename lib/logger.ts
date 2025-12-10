/**
 * Production-safe logging utility
 * Disables console.log in production, keeps console.error and console.warn
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Override console.log in production
if (!isDevelopment && typeof window !== 'undefined') {
  const originalLog = console.log;
  console.log = () => {}; // No-op in production
}

/**
 * Safe logger that only logs in development
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors (but could send to error tracking service in production)
    console.error(...args);
    
    // In production, you could send to error tracking service
    // Example: if (window.Sentry) window.Sentry.captureException(args[0]);
  },
  
  warn: (...args: any[]) => {
    // Always log warnings
    console.warn(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

// Export for use in components
export default logger;

