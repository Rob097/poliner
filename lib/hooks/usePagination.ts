"use client";

import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_DEFAULT = 15;

export interface UsePaginationResult<T> {
  visible: T[];
  hasMore: boolean;
  remaining: number;
  loadMore: () => void;
  reset: () => void;
}

/**
 * Paginazione client-side sopra un array già in memoria.
 *
 * Espone i primi `pageSize * pageCount` elementi e una funzione `loadMore`
 * che incrementa `pageCount`. Quando `items` cambia identità (filtro
 * cambiato, refresh) si resetta automaticamente alla prima pagina.
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = PAGE_SIZE_DEFAULT,
): UsePaginationResult<T> {
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    setPageCount(1);
  }, [items]);

  const visible = useMemo(
    () => items.slice(0, pageCount * pageSize),
    [items, pageCount, pageSize],
  );

  const hasMore = visible.length < items.length;
  const remaining = items.length - visible.length;

  function loadMore() {
    setPageCount((p) => p + 1);
  }

  function reset() {
    setPageCount(1);
  }

  return { visible, hasMore, remaining, loadMore, reset };
}
