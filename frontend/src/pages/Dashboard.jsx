import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { 
  Users, 
  UserSquare2, 
  Activity, 
  Calendar,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight
} from "lucide-react";

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    patientsCount: 0,
    doctorsCount: 0,
    departmentsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [patientsRes, doctorsRes, deptsRes] = await Promise.all([
          apiFetch("/patients/"),
          apiFetch("/doctors/"),
          apiFetch("/departments/")
        ]);

        const patients = patientsRes.ok ? await patientsRes.json() : { count: 0 };
        const doctors = doctorsRes.ok ? await doctorsRes.json() : { count: 0 };
        const depts = deptsRes.ok ? await deptsRes.json() : { count: 0 };

        setStats({
          patientsCount: patients.count ?? patients.length ?? 0,
          doctorsCount: doctors.count ?? doctors.length ?? 0,
          departmentsCount: depts.count ?? depts.length ?? 0,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Total Registered Patients",
      value: stats.patientsCount,
      icon: <Users size={24} className="text-teal-600" />,
      color: "bg-teal-50 border-teal-200",
      description: "Lifetime patient registrations"
    },
    {
      title: "Consulting Doctors",
      value: stats.doctorsCount,
      icon: <UserSquare2 size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-200",
      description: "Active practicing specialists"
    },
    {
      title: "Active Wards / Depts",
      value: stats.departmentsCount,
      icon: <Activity size={24} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-200",
      description: "Registered specialty departments"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Greetings Block */}
      <div className="bg-gradient-to-r from-[#1a73e8] to-[#1253a4] text-white p-6 rounded-2xl shadow-lg shadow-blue-900/10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {user?.full_name || user?.username}!</h2>
          <p className="text-blue-100 text-sm mt-1">Here is a quick snapshot of Medi Flow HMS operations today.</p>
        </div>
        <div className="text-right hidden md:block">
          <span className="inline-block bg-blue-800/40 text-blue-100 text-xs px-3 py-1 rounded-full border border-blue-500/30">
            System Location: Lahore, Pakistan
          </span>
        </div>
      </div>

      {/* Operations Quick Action Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.role === "RECEPTIONIST" || user?.role === "ADMIN" ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="p-3 bg-teal-50 text-teal-600 inline-block rounded-xl mb-4"><PlusCircle size={22} /></div>
              <h3 className="font-bold text-slate-800 text-base">Register New Patient</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Add a new patient registration file, check CNIC validation details and automatically generate MRN/QR codes.</p>
            </div>
            <Link to="/patients" className="flex items-center space-x-1.5 text-teal-600 font-semibold text-xs mt-4 group">
              <span>Go to Registration Desk</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : null}

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="p-3 bg-emerald-50 text-emerald-600 inline-block rounded-xl mb-4"><Calendar size={22} /></div>
            <h3 className="font-bold text-slate-800 text-base">Doctor Shifts & Scheduling</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">View availability grids, assign shifts, manage rooms, and set consultation fees for doctors.</p>
          </div>
          <Link to="/doctors" className="flex items-center space-x-1.5 text-emerald-600 font-semibold text-xs mt-4 group">
            <span>Manage Shift Rotas</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div>
        <h3 className="font-bold text-slate-800 text-lg mb-4">Core Operational KPIs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border ${card.color} shadow-sm flex items-start justify-between`}>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{card.title}</p>
                {loading ? (
                  <div className="h-8 w-16 bg-slate-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <h4 className="text-3xl font-extrabold text-slate-800 mt-2">{card.value}</h4>
                )}
                <p className="text-[11px] text-slate-400 mt-2">{card.description}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/50 shadow-sm">{card.icon}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
