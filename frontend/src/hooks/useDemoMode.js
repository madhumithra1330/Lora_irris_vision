import { isDemoMode } from '../services/demoService';

/**
 * Hook to check if the app is running in demo mode.
 */
export function useDemoMode() {
  return { isDemoMode: isDemoMode() };
}
