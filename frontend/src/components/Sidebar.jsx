import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  BedDouble, 
  Scissors, 
  Receipt, 
  FlaskConical, 
  Pill, 
  Video, 
  UserCog, 
  UserRound, 
  Banknote, 
  Building2, 
  Shield, 
  Settings, 
  BarChart3, 
  WifiOff, 
  LogOut, 
  Activity 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ICON_MAP = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  Users: <Users size={20} />,
  Calendar: <Calendar size={20} />,
  Stethoscope: <Stethoscope size={20} />,
  BedDouble: <BedDouble size={20} />,
  Scissors: <Scissors size={20} />,
  Receipt: <Receipt size={20} />,
  FlaskConical: <FlaskConical size={20} />,
  Pill: <Pill size={20} />,
  Video: <Video size={20} />,
  UserCog: <UserCog size={20} />,
  UserRound: <UserRound size={20} />,
  Banknote: <Banknote size={20} />,
  Building2: <Building2 size={20} />,
  Shield: <Shield size={20} />,
  Settings: <Settings size={20} />,
  BarChart3: <BarChart3 size={20} />,
  WifiOff: <WifiOff size={20} />
};

const NAV_CONFIG = { 
  ADMIN: [ 
    { section: null, items: [ 
      { label: "Dashboard",        path: "/",                   icon: "LayoutDashboard" }, 
      { label: "Patient Registry", path: "/patients",           icon: "Users" }, 
      { label: "Appointments",     path: "/appointments",       icon: "Calendar" }, 
      { label: "Consultation",     path: "/consultation",       icon: "Stethoscope" }, 
      { label: "IPD Wards",        path: "/ward-map",           icon: "BedDouble" }, 
      { label: "OT Scheduler",     path: "/ot-scheduler",       icon: "Scissors" }, 
      { label: "Billing Desk",     path: "/billing",            icon: "Receipt" }, 
      { label: "Diagnostics Lab",  path: "/lab-portal",         icon: "FlaskConical" }, 
      { label: "Pharmacy",         path: "/pharmacy",           icon: "Pill" }, 
      { label: "Telemedicine",     path: "/telemedicine",       icon: "Video" }, 
    ]}, 
    { section: "MANAGEMENT", items: [ 
      { label: "Staff Management", path: "/staff-management",   icon: "UserCog" }, 
      { label: "Doctors & Shifts", path: "/doctors",            icon: "UserRound" }, 
      { label: "HR & Payroll",     path: "/hr-payroll",         icon: "Banknote" }, 
      { label: "Branch Management",path: "/branch-management",  icon: "Building2" }, 
    ]}, 
    { section: "SYSTEM", items: [ 
      { label: "Security & Audit", path: "/audit-logs",         icon: "Shield" }, 
      { label: "System Settings",  path: "/system-settings",    icon: "Settings" }, 
      { label: "Reports",          path: "/reports",            icon: "BarChart3" }, 
      { label: "Offline Sync",     path: "/offline-sync",       icon: "WifiOff" }, 
    ]}, 
  ], 
  SUB_ADMIN: [ 
    { section: null, items: [ 
      { label: "Dashboard",        path: "/",                   icon: "LayoutDashboard" }, 
      { label: "Patient Registry", path: "/patients",           icon: "Users" }, 
      { label: "Appointments",     path: "/appointments",       icon: "Calendar" }, 
      { label: "Consultation",     path: "/consultation",       icon: "Stethoscope" }, 
      { label: "IPD Wards",        path: "/ward-map",           icon: "BedDouble" }, 
      { label: "OT Scheduler",     path: "/ot-scheduler",       icon: "Scissors" }, 
      { label: "Billing Desk",     path: "/billing",            icon: "Receipt" }, 
      { label: "Diagnostics Lab",  path: "/lab-portal",         icon: "FlaskConical" }, 
      { label: "Pharmacy",         path: "/pharmacy",           icon: "Pill" }, 
      { label: "Telemedicine",     path: "/telemedicine",       icon: "Video" }, 
    ]}, 
    { section: "MANAGEMENT", items: [ 
      { label: "Staff Management", path: "/staff-management",   icon: "UserCog" }, 
      { label: "Doctors & Shifts", path: "/doctors",            icon: "UserRound" }, 
      { label: "HR & Payroll",     path: "/hr-payroll",         icon: "Banknote" }, 
    ]}, 
  ], 
  DOCTOR: [ 
    { section: null, items: [ 
      { label: "Dashboard",        path: "/",             icon: "LayoutDashboard" }, 
      { label: "My Appointments",  path: "/appointments", icon: "Calendar" }, 
      { label: "Consultation",     path: "/consultation", icon: "Stethoscope" }, 
      { label: "My Patients",      path: "/patients",     icon: "Users" }, 
      { label: "OT Scheduler",     path: "/ot-scheduler", icon: "Scissors" }, 
      { label: "Telemedicine",     path: "/telemedicine", icon: "Video" }, 
    ]}, 
  ], 
  RECEPTIONIST: [ 
    { section: null, items: [ 
      { label: "Dashboard",        path: "/",             icon: "LayoutDashboard" }, 
      { label: "Patient Registry", path: "/patients",     icon: "Users" }, 
      { label: "Appointments",     path: "/appointments", icon: "Calendar" }, 
      { label: "IPD Wards",        path: "/ward-map",     icon: "BedDouble" }, 
      { label: "Billing Desk",     path: "/billing",      icon: "Receipt" }, 
      { label: "Offline Sync",     path: "/offline-sync", icon: "WifiOff" }, 
    ]}, 
  ], 
  PHARMACIST: [ 
    { section: null, items: [ 
      { label: "Dashboard",        path: "/",             icon: "LayoutDashboard" }, 
      { label: "Pharmacy Desk",    path: "/pharmacy",     icon: "Pill" }, 
      { label: "My Payslip",       path: "/hr-payroll",   icon: "Banknote" }, 
    ]}, 
  ], 
  LAB_TECH: [ 
    { section: null, items: [ 
      { label: "Dashboard",        path: "/",             icon: "LayoutDashboard" }, 
      { label: "Diagnostics Lab",  path: "/lab-portal",   icon: "FlaskConical" }, 
      { label: "My Payslip",       path: "/hr-payroll",   icon: "Banknote" }, 
    ]}, 
  ], 
}; 

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  const getBadgeColor = (role) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-700";
      case "SUB_ADMIN":
        return "bg-purple-100 text-purple-700";
      case "DOCTOR":
        return "bg-teal-100 text-teal-700";
      case "RECEPTIONIST":
        return "bg-blue-100 text-blue-700";
      case "PHARMACIST":
        return "bg-green-100 text-green-700";
      case "LAB_TECH":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <div 
        className={`bg-slate-900 text-white h-screen flex flex-col justify-between shadow-xl shrink-0 select-none fixed lg:static inset-y-0 left-0 z-50 lg:z-auto transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`} 
        style={{ minWidth: "240px", width: "240px" }}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* System Branding Header */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center space-x-2 shrink-0">
            <div className="bg-blue-600 w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 shadow-inner">
              <Activity size={16} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-white tracking-tight leading-none whitespace-nowrap" style={{ fontSize: "14px" }}>Medi Flow</h1>
              <p className="text-slate-500 font-bold tracking-wider mt-1 uppercase leading-none" style={{ fontSize: "9px" }}>Enterprise HMS</p>
            </div>
          </div>

          {/* User Role Quick Badge */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <p className="text-xs text-slate-500 font-semibold tracking-wider">LOGGED IN AS</p>
            <p className="font-bold text-sm text-white">{user.full_name || user.username}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1.5 font-semibold uppercase ${getBadgeColor(user.role)}`}>
              {user.role}
            </span>
          </div>

          {/* Nav Links */}
          <nav className="mt-4 px-2 py-1 space-y-1 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-800">
            {NAV_CONFIG[user.role]?.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                {section.section && (
                  <div className="mt-4 mb-1 px-3"> 
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold"> 
                      {section.section} 
                    </span> 
                  </div>
                )}
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive(item.path)
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {ICON_MAP[item.icon]}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Logout Action */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
