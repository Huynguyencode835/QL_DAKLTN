import { useState, useEffect, useMemo } from 'react';

interface UseSearchOptions {
  debounceMs?: number;
}

export default function useSearch({ debounceMs = 400 }: UseSearchOptions = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  const searchParams = useMemo(() => {
    return debouncedSearch ? { search: debouncedSearch } : {};
  }, [debouncedSearch]);

  return { search, setSearch, searchParams };
}
