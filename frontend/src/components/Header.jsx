import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { Bell, Clock, Check, Inbox, Menu } from "lucide-react";

export const Header = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications periodically (e.g. every 10 seconds)
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiFetch("/notifications/");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object" && Array.isArray(data.results)) {
          setNotifications(data.results);
        } else if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await apiFetch("/notifications/mark-all-read/", {
        method: "POST"
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const res = await apiFetch(`/notifications/${id}/mark-read/`, {
        method: "POST"
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between custom-shadow z-30">
      
      {/* Left side: Hamburger button + Clock */}
      <div className="flex items-center space-x-3 text-slate-500 text-sm font-medium">
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden transition-all cursor-pointer mr-1"
          aria-label="Toggle Sidebar"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center space-x-2 text-slate-500 text-xs sm:text-sm font-medium">
          <Clock size={16} className="text-blue-600 animate-pulse shrink-0" />
          <span className="hidden sm:inline">{formatDate(time)}</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="font-semibold text-slate-700">{formatTime(time)} <span className="hidden sm:inline">(PKT)</span></span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 relative" ref={dropdownRef}>
        
        {/* Notification Bell */}
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 relative transition-all"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown Card */}
        {showDropdown && (
          <div className="absolute right-12 top-10 bg-white border border-slate-200 rounded-2xl shadow-xl w-80 py-2.5 z-40 animate-fade-in text-xs">
            <div className="flex justify-between items-center px-4 pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">System Alerts</span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold space-y-1.5">
                  <Inbox size={24} className="mx-auto text-slate-300" />
                  <p>No notifications on file.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                    className={`p-3 text-left transition-all ${
                      notif.is_read 
                        ? "bg-white text-slate-600" 
                        : "bg-blue-50/50 text-slate-800 hover:bg-blue-50 cursor-pointer border-l-2 border-blue-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold">{notif.title}</span>
                      {!notif.is_read && <Check size={12} className="text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{notif.message}</p>
                    <span className="text-[8px] text-slate-400 block mt-1.5 font-mono">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* User Badge */}
        {user && (
          <div className="flex items-center space-x-2 sm:space-x-3 border-l pl-2 sm:pl-4 border-slate-200">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-700 text-xs sm:text-sm shrink-0">
              {user.full_name ? user.full_name.split(" ").map(n => n[0]).join("") : user.username[0].toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">{user.full_name || user.username}</p>
              <p className="text-xs text-slate-400 mt-1 leading-none">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

