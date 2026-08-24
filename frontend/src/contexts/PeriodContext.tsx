import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { fetchWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import type { Period } from '../types';

interface PeriodContextValue {
  period: Period | null;
  loading: boolean;
  refetch: () => void;
}

const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchWithAuth(
      endpoints.registrationPeriodDetail('current'),
      (data: Period) => setPeriod(data),
      () => setPeriod(null),
      {},
      setLoading,
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PeriodContext.Provider value={{ period, loading, refetch: load }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error('usePeriod phải được dùng bên trong <PeriodProvider>');
  }
  return ctx;
}