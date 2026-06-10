import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../utils/api";

export function usePagination(endpoint) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  const fetchPage = useCallback(async (page, signal) => {
    setLoading(true);
    try {
      const ep = endpointRef.current;
      const separator = ep.includes("?") ? "&" : "?";
      const res = await apiFetch(`${ep}${separator}page=${page}`, { signal });
      if (res.ok) {
        const result = await res.json();
        const results = result.results || [];
        const count = result.count || 0;

        setData(results);
        setTotalCount(count);
        setTotalPages(Math.max(1, Math.ceil(count / 20))); // Default Django Page Size is 20
        setCurrentPage(page);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Pagination fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced effect: waits 400ms after endpoint changes before fetching
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      fetchPage(1, controller.signal);
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [endpoint, fetchPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      fetchPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      fetchPage(currentPage - 1);
    }
  };

  const refresh = () => {
    fetchPage(currentPage);
  };

  return {
    data,
    loading,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    refresh
  };
}
