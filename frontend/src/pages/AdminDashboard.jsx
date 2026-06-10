import React, { useState, useEffect, useRef } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  BedDouble, 
  DollarSign, 
  Terminal, 
  RefreshCw, 
  ShieldCheck, 
  Server, 
  Activity,
  Download,
  FileText
} from "lucide-react";

export const AdminDashboard = () => {
  const { user } = useAuth();
  
  // Real-time KPI state
  const [kpiData, setKpiData] = useState({
    patients_count: 0,
    beds_occupied: 0,
    beds_total: 1, // Avoid divide by zero
    today_revenue: 0.0,
    recent_logs: []
  });
  
  const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED"); // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
  const [errorMessage, setErrorMessage] = useState("");
  const [logHighlights, setLogHighlights] = useState({}); // Tracking which logs are new to flash highlight them
  
  const [expMonth, setExpMonth] = useState(6);
  const [expYear, setExpYear] = useState(2026);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // SaaS Expansion States
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [lowStockMeds, setLowStockMeds] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierLedger, setSupplierLedger] = useState([]);
  const [activeTab, setActiveTab] = useState("KPI"); // 'KPI' | 'REORDER' | 'SUPPLIER'

  const prevLogsRef = useRef([]);

  // Fetch SaaS configurations
  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    apiFetch("/branches/")
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setBranches(toArray(data)))
      .catch(err => console.error(err));

    apiFetch("/pharmacy/medicines/low-stock-reorder/")
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setLowStockMeds(toArray(data)))
      .catch(err => console.error(err));

    apiFetch("/pharmacy/suppliers/")
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setSuppliers(toArray(data)))
      .catch(err => console.error(err));
  }, [user]);

  // Fetch supplier ledgers
  useEffect(() => {
    if (selectedSupplierId) {
      apiFetch(`/pharmacy/ledgers/?supplier=${selectedSupplierId}`)
        .then(res => {
          if (res.ok) return res.json();
          return [];
        })
        .then(data => setSupplierLedger(toArray(data)))
        .catch(err => console.error(err));
    } else {
      setSupplierLedger([]);
    }
  }, [selectedSupplierId]);

  // SSE Stream fetch via ReadableStream (handles JWT Auth)
  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    let controller = new AbortController();
    const startSSE = async () => {
      setConnectionStatus("CONNECTING");
      setErrorMessage("");
      
      const token = localStorage.getItem("access_token");
      try {
        const response = await fetch("http://localhost:8000/api/admin/kpis/stream/", {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          signal: controller.signal
        });

        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            throw new Error("Access Denied: Admin authorization required.");
          }
          throw new Error(`SSE stream connection failed: ${response.statusText}`);
        }

        setConnectionStatus("CONNECTED");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const line = part.trim();
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.error) {
                  setErrorMessage(parsed.error);
                  continue;
                }
                
                // Track highlights for new logs
                if (parsed.recent_logs) {
                  const newLogs = {};
                  parsed.recent_logs.forEach(log => {
                    const exists = prevLogsRef.current.some(prev => prev.id === log.id);
                    if (!exists && prevLogsRef.current.length > 0) {
                      newLogs[log.id] = true;
                    }
                  });
                  if (Object.keys(newLogs).length > 0) {
                    setLogHighlights(prev => ({ ...prev, ...newLogs }));
                    // Clear highlight after 2 seconds
                    setTimeout(() => {
                      setLogHighlights(prev => {
                        const copy = { ...prev };
                        Object.keys(newLogs).forEach(id => delete copy[id]);
                        return copy;
                      });
                    }, 2000);
                  }
                  prevLogsRef.current = parsed.recent_logs;
                }

                setKpiData(parsed);
              } catch (e) {
                console.error("Error parsing SSE JSON:", e);
              }
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("SSE stream error:", err);
          setConnectionStatus("DISCONNECTED");
          setErrorMessage(err.message || "Lost connection to live KPI feed.");
          // Attempt retry after 5 seconds
          setTimeout(() => {
            if (!controller.signal.aborted) {
              startSSE();
            }
          }, 5000);
        }
      }
    };

    startSSE();

    return () => {
      controller.abort();
      setConnectionStatus("DISCONNECTED");
    };
  }, [user]);

  if (user?.role !== "ADMIN") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-amber-50 p-4 rounded-full text-amber-600 border border-amber-200">
          <ShieldAlert size={48} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Access Restricted</h3>
        <p className="text-slate-500 text-sm max-w-md">
          The Security & System Admin Dashboard is restricted to Admin accounts only. 
          Please contact your IT administrator if you require permissions.
        </p>
      </div>
    );
  }

  // Calculate Bed Occupancy percentages
  const occupancyRate = Math.round((kpiData.beds_occupied / (kpiData.beds_total || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Header with SSE Status Indicator & Branch Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Security & Live KPIs Desk</h2>
          <p className="text-slate-500 text-xs mt-1">Real-time system telemetry, active telemetry streams, and security audit logs.</p>
        </div>
        
        <div className="flex items-center space-x-3 text-xs">
          {/* Branch Switcher */}
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm font-semibold text-slate-700">
            <span>Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent border-0 font-bold focus:outline-none text-[#1a73e8]"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Stream Telemetry Status Card */}
          <div className="flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${
              connectionStatus === "CONNECTED" ? "bg-emerald-500 animate-pulse" : 
              connectionStatus === "CONNECTING" ? "bg-amber-400 animate-pulse" : "bg-red-500"
            }`} />
            <span className="text-slate-700">{connectionStatus}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] text-slate-400 font-mono">SSE Stream</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-2xl flex items-start space-x-2 shadow-sm">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">System Telemetry Interrupted</p>
            <p className="text-[10px] mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Patients Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Registered Patients</span>
            <h3 className="text-3xl font-black text-slate-800">{kpiData.patients_count}</h3>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
              <TrendingUp size={12} className="text-emerald-500" /> Active charts in DB
            </p>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl">
            <Users size={24} />
          </div>
        </div>

        {/* Bed Occupancy Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">IPD Bed Occupancy</span>
            <h3 className="text-3xl font-black text-slate-800">{kpiData.beds_occupied} <span className="text-sm font-medium text-slate-400">/ {kpiData.beds_total}</span></h3>
            <p className="text-[10px] text-slate-500 font-semibold">{occupancyRate}% occupancy rate</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl">
            <BedDouble size={24} />
          </div>
        </div>

        {/* Daily Settled Revenue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Today's Settled Revenue</span>
            <h3 className="text-3xl font-black text-slate-800">Rs. {kpiData.today_revenue.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Real-time collections (completed payments)</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Monthly Financial Reports PDF Export Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <FileText className="text-blue-600" size={18} /> Financial Audit PDF Report Exporter
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Generate and download compiled monthly system collections and doctor splits sheets.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {exportError && (
              <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">{exportError}</span>
            )}
            
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-slate-500">Month:</label>
              <select
                value={expMonth}
                onChange={(e) => setExpMonth(parseInt(e.target.value))}
                className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 focus:outline-none focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="font-semibold text-slate-500">Year:</label>
              <select
                value={expYear}
                onChange={(e) => setExpYear(parseInt(e.target.value))}
                className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 focus:outline-none focus:border-blue-500"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={async () => {
                setExportError("");
                setExporting(true);
                try {
                  const token = localStorage.getItem("access_token");
                  const response = await fetch(`http://localhost:8000/api/admin/exports/financial-report/?month=${expMonth}&year=${expYear}`, {
                    headers: {
                      "Authorization": `Bearer ${token}`
                    }
                  });
                  if (!response.ok) {
                    throw new Error("No transaction history generated for selected month.");
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `financial_report_${expMonth.toString().padStart(2, '0')}_${expYear}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  setExportError(err.message);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/10 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download size={14} /> {exporting ? "Generating PDF..." : "Export PDF Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Charts & Security Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Occupancy SVG Graphic & Analytics */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity className="text-blue-600 animate-pulse" size={18} /> Bed Utilization Indicator
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Visual representation of live IPD ward status.</p>
          </div>

          {/* SVG Circular Donut Chart */}
          <div className="flex justify-center items-center py-4 relative">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Outer Background Circle */}
              <circle
                cx="64"
                cy="64"
                r="52"
                className="stroke-slate-100"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Active Occupancy Circle */}
              <circle
                cx="64"
                cy="64"
                r="52"
                className="stroke-blue-600 transition-all duration-1000 ease-out"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - occupancyRate / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-800">{occupancyRate}%</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Occupied</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-semibold">Available Wards & Beds:</span>
              <span className="font-bold text-slate-800">{kpiData.beds_total - kpiData.beds_occupied} beds free</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{ width: `${Math.max(0, 100 - occupancyRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Security Audit Logger (Right 2 columns) */}
        <div className="lg:col-span-2 bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Terminal className="text-blue-400" size={18} /> Security Audit Middleware Logs
              </h3>
              <p className="text-slate-400 text-[10px]">Real-time tracking of PHI record views & billing changes.</p>
            </div>
            <div className="flex items-center space-x-1 bg-slate-800/80 px-2 py-1 rounded text-[10px] text-slate-300 font-mono">
              <Server size={12} className="text-blue-400" />
              <span>LOG_ROUTER: ACTIVE</span>
            </div>
          </div>

          {/* Audit Terminal Ticker */}
          <div className="font-mono text-[11px] leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 min-h-[260px] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {kpiData.recent_logs.length === 0 ? (
              <div className="text-slate-500 text-center py-12 flex flex-col items-center justify-center space-y-1">
                <ShieldCheck size={28} className="text-slate-600" />
                <p>Telemetry stream active. Listening for events...</p>
              </div>
            ) : (
              kpiData.recent_logs.map((log) => {
                const isNew = logHighlights[log.id];
                
                // Color mapping by action type
                let actionColor = "text-blue-400";
                if (log.action === "PATIENT_RECORD_VIEW") actionColor = "text-teal-400";
                if (log.action.includes("BILLING") || log.action.includes("INVOICE")) actionColor = "text-emerald-400";
                if (log.action.includes("FAILED") || log.action.includes("UNAUTHORIZED")) actionColor = "text-rose-400";

                return (
                  <div 
                    key={log.id} 
                    className={`border-b border-slate-900/50 pb-2.5 space-y-1 transition-all duration-500 ${
                      isNew ? "bg-blue-950/40 p-2 rounded border-l-2 border-l-blue-500 animate-pulse" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>[{log.time}]</span>
                      <span>IP: {log.ip}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-300">USER: {log.user}</span>
                      <span className="text-slate-600">|</span>
                      <span className={`font-extrabold uppercase ${actionColor}`}>{log.action}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] pl-2 border-l border-slate-800 mt-1 italic">
                      {log.details}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Terminal Footer */}
          <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-800 pt-3">
            <p>Middleware listens on all views matching Patient or Invoice queries</p>
            <p className="flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin text-blue-400" /> SSE polling rate: 3s
            </p>
          </div>
        </div>

      </div>

      {/* SaaS Pharmacy & Inventory Control Center */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-bold space-x-4">
          <button
            onClick={() => setActiveTab("KPI")}
            className={`pb-2 border-b-2 transition-all ${activeTab === "KPI" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            System Telemetry Details
          </button>
          <button
            onClick={() => setActiveTab("REORDER")}
            className={`pb-2 border-b-2 transition-all flex items-center space-x-1.5 ${activeTab === "REORDER" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <span>Auto-Reorder Alerts</span>
            {lowStockMeds.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">{lowStockMeds.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("SUPPLIER")}
            className={`pb-2 border-b-2 transition-all ${activeTab === "SUPPLIER" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Supplier Ledgers
          </button>
        </div>

        {/* Tab 1: Telemetry */}
        {activeTab === "KPI" && (
          <div className="text-slate-500 text-xs font-medium leading-relaxed max-w-2xl">
            <h4 className="font-bold text-slate-800 mb-1">Multi-Branch SaaS Telemetry Console</h4>
            <p>This command dashboard monitors live API throughput, system transaction logs, and medical records telemetry. Select a branch from the header drop-down to filter billing collections and bed allocations dynamically.</p>
          </div>
        )}

        {/* Tab 2: Reorder alerts */}
        {activeTab === "REORDER" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">Low Stock Pharmacy Reorder List</span>
              <span className="text-slate-500 font-semibold">Generates draft POs when remaining batches drop below medicine threshold levels.</span>
            </div>
            
            {lowStockMeds.length === 0 ? (
              <p className="text-xs text-emerald-600 italic font-semibold">All pharmacy stocks are currently above their reorder thresholds.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Generic Name</th>
                      <th className="py-2.5 px-3">Formulation</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Reorder Limit</th>
                      <th className="py-2.5 px-3 text-right">Suggested PO Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockMeds.map((med, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{med.name} {med.strength}</td>
                        <td className="py-2.5 px-3 text-slate-600">{med.generic_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{med.formulation}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600">{med.current_stock} units</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{med.reorder_level} units</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-600">{med.suggested_reorder_qty} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Supplier Ledgers */}
        {activeTab === "SUPPLIER" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3 border-r border-slate-100 pr-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Drug Distributors</h4>
              <div className="space-y-2">
                {suppliers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No drug suppliers registered.</p>
                ) : (
                  suppliers.map(sup => (
                    <button
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className={`w-full text-left p-3 rounded-2xl border text-xs font-semibold transition-all ${
                        selectedSupplierId === sup.id
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{sup.name}</span>
                        <span className="text-slate-500 font-bold">Rs. {parseFloat(sup.balance_due).toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Contact: {sup.contact_person} | {sup.phone}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Ledger Transactions</h4>
              
              {!selectedSupplierId ? (
                <p className="text-xs text-slate-400 italic py-12 text-center">Select a supplier from the left sidebar to view their outstanding ledger transactions.</p>
              ) : supplierLedger.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-12 text-center">No transactions recorded for this supplier.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Debit (Paid)</th>
                        <th className="py-2 px-3 text-right">Credit (Purchased)</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supplierLedger.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-slate-500">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-slate-800 font-semibold">{tx.description}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-bold">Rs. {parseFloat(tx.amount_debited).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-700 font-bold">Rs. {parseFloat(tx.amount_credited).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-900 font-bold">Rs. {parseFloat(tx.running_balance).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
