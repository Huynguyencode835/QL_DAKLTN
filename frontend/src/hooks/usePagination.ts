import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  setPage: (page: number) => void;
  resetPage: () => void;
  paginationParams: { page: number };
  handlePaginatedResponse: (data: T[], paginatedData?: { count: number }) => T[];
  paginationProps: {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}

export default function usePagination<T = any>({
  pageSize = 8,
}: UsePaginationOptions = {}): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const setPage = useCallback((page: number) => setCurrentPage(page), []);
  const resetPage = useCallback(() => setCurrentPage(1), []);

  const paginationParams = { page: currentPage };

  const handlePaginatedResponse = useCallback(
    (data: T[], paginatedData?: { count: number }): T[] => {
      if (paginatedData) setTotalCount(paginatedData.count);
      return data;
    },
    []
  );

  const paginationProps = {
    currentPage,
    totalCount,
    pageSize,
    onPageChange: setCurrentPage,
  };

  return {
    currentPage,
    totalCount,
    pageSize,
    setPage,
    resetPage,
    paginationParams,
    handlePaginatedResponse,
    paginationProps,
  };
}
