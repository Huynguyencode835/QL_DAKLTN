import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { fetchWithAuth } from '../utils/ApiHelper';
import { endpoints } from '../config/Apis';
import type { Period } from '../types';

interface PeriodContextValue {
  projectPeriod: Period | null;
  thesisPeriod: Period | null;
  loading: boolean;
  refetch: () => void;
}

const PeriodContext = createContext<PeriodContextValue | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [projectPeriod, setProjectPeriod] = useState<Period | null>(null);
  const [thesisPeriod, setThesisPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let count = 0;
    const done = () => { count += 1; if (count >= 2) setLoading(false); };

    fetchWithAuth(
      endpoints.registrationPeriodDetail('current-project'),
      (data: Period) => setProjectPeriod(data),
      () => setProjectPeriod(null),
      {},
      (v) => { if (!v) done(); },
    );
    fetchWithAuth(
      endpoints.registrationPeriodDetail('current-thesis'),
      (data: Period) => setThesisPeriod(data),
      () => setThesisPeriod(null),
      {},
      (v) => { if (!v) done(); },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PeriodContext.Provider value={{ projectPeriod, thesisPeriod, loading, refetch: load }}>
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
