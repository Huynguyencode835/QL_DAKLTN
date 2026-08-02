import { useState, useMemo } from 'react';

interface UseSearchFilterOptions<T> {
  data: T[];
  searchFields: (item: T) => (string | undefined | null)[]; // các field dùng để search
  extraFilter?: (item: T) => boolean; // filter thêm (status, difficulty, ...)
}

function useSearchFilter<T>({ data, searchFields, extraFilter }: UseSearchFilterOptions<T>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return data.filter((item) => {
      if (q) {
        const fields = searchFields(item);
        const matched = fields.some((field) => field?.toLowerCase().includes(q));
        if (!matched) return false;
      }
      if (extraFilter && !extraFilter(item)) return false;
      return true;
    });
  }, [data, search, extraFilter, searchFields]);

  return { search, setSearch, filtered };
}

export default useSearchFilter;