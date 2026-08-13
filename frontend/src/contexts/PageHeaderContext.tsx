import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface PageHeader {
  title: string;
  description?: string;
}

interface PageHeaderContextType {
  header: PageHeader;
  setPageHeader: (header: PageHeader) => void;
}

export const DEFAULT_HEADER: PageHeader = { title: 'Trang Chủ' };

export const PageHeaderContext = createContext<PageHeaderContextType | null>(null);

export function usePageHeaderValue() {
  const context = useContext(PageHeaderContext);
  if (!context) throw new Error('usePageHeaderValue must be used within PageHeaderProvider');
  return context;
}

export function usePageHeader(header: PageHeader) {
  const { setPageHeader } = usePageHeaderValue();
  useEffect(() => {
    setPageHeader(header);
    return () => setPageHeader(DEFAULT_HEADER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeader>(DEFAULT_HEADER);

  const setPageHeader = (next: PageHeader) => setHeader(next);

  return (
    <PageHeaderContext.Provider value={{ header, setPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}
