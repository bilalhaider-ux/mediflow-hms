import { useState, useEffect, useRef } from "react";

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Safely extract an array from API response data.
 * Handles both paginated responses ({count, results: [...]}) and plain arrays.
 */
export const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

export const apiFetch = async (endpoint, options = {}) => {
  let token = localStorage.getItem("access_token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401 && endpoint !== "/auth/login/" && endpoint !== "/auth/refresh/") {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem("access_token", data.access);
          if (data.refresh) {
            localStorage.setItem("refresh_token", data.refresh);
          }
          
          // Retry original request with new token
          headers["Authorization"] = `Bearer ${data.access}`;
          response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
          return response;
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
    
    // Auto-logout if refresh fails or no refresh token is present
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_fullname");
    localStorage.removeItem("user_branch_id");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  
  return response;
};

export const usePagination = (endpoint, pageSize = 20) => {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Store endpoint in a ref to use inside fetchPage without stale closure issues
  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  const fetchPage = async (page, signal) => {
    setLoading(true);
    try {
      const ep = endpointRef.current;
      const separator = ep.includes("?") ? "&" : "?";
      const res = await apiFetch(`${ep}${separator}page=${page}`, { signal });
      if (res.ok) {
        const result = await res.json();
        setData(result.results || []);
        const count = result.count || 0;
        setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
        setCurrentPage(page);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Pagination fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

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
  }, [endpoint]);

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

  return { 
    data, 
    currentPage, 
    totalPages, 
    goToPage, 
    nextPage, 
    prevPage, 
    loading, 
    refresh: () => fetchPage(currentPage) 
  };
};

