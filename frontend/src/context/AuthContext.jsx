import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    const username = localStorage.getItem("user_name");
    const fullName = localStorage.getItem("user_fullname");
    const branchId = localStorage.getItem("user_branch_id");

    if (token && role && username) {
      setUser({
        username,
        role,
        full_name: fullName,
        branch_id: branchId ? parseInt(branchId, 10) : null,
      });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    const response = await fetch(`${baseUrl}/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Invalid credentials");
    }

    const data = await response.json();
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user_role", data.user.role);
    localStorage.setItem("user_name", data.user.username);
    localStorage.setItem("user_fullname", data.user.full_name);
    localStorage.setItem("user_branch_id", data.user.branch_id !== null ? String(data.user.branch_id) : "");

    setUser({
      username: data.user.username,
      role: data.user.role,
      full_name: data.user.full_name,
      branch_id: data.user.branch_id,
    });

    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_fullname");
    localStorage.removeItem("user_branch_id");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
