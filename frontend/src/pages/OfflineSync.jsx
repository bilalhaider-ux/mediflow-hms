import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { getQueue, addToQueue, removeFromQueue, markSynced } from "../utils/offlineDB";
import { 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  UserPlus, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  CloudLightning,
  Trash2,
  X
} from "lucide-react";

export const OfflineSync = () => {
  const { user } = useAuth();
  
  // Simulated Connectivity State
  const [isOnline, setIsOnline] = useState(true);
  
  // Offline patients queue
  const [queue, setQueue] = useState([]);
  
  // Database initialization loading state
  const [dbLoading, setDbLoading] = useState(true);
  
  // Form input states (same as patient creation)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    cnic: "",
    date_of_birth: "",
    gender: "M",
    phone: "",
    email: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });
  
  // Feedback states
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Load queue from IndexedDB on mount & migrate old localStorage data
  useEffect(() => {
    if (typeof window !== "undefined" && !window.indexedDB) {
      setIsSupported(false);
      setError("IndexedDB is not supported in this browser. Offline queueing is disabled.");
      setDbLoading(false);
      return;
    }

    const loadDB = async () => {
      try {
        // Migration Helper
        const keysToMigrate = ["offline_patients", "offline_queue", "patientQueue"];
        for (const key of keysToMigrate) {
          const localData = localStorage.getItem(key);
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item) {
                    await addToQueue("patientQueue", {
                      id: item.id || "offline_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                      data: item.data || item,
                      status: item.status || "PENDING",
                      errorMsg: item.errorMsg || ""
                    });
                  }
                }
              }
            } catch (jsonErr) {
              console.error(`Error migrating localStorage key ${key}:`, jsonErr);
            }
            localStorage.removeItem(key);
          }
        }

        const savedQueue = await getQueue("patientQueue");
        setQueue(savedQueue || []);
      } catch (err) {
        console.error("Error loading IndexedDB queue:", err);
        setError("Failed to open IndexedDB database context.");
      } finally {
        setDbLoading(false);
      }
    };
    loadDB();
  }, []);

  // CNIC formatting helper
  const handleCnicChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 13) val = val.slice(0, 13);
    let formatted = "";
    if (val.length > 0) formatted += val.slice(0, 5);
    if (val.length > 5) formatted += "-" + val.slice(5, 12);
    if (val.length > 12) formatted += "-" + val.slice(12, 13);
    setFormData({ ...formData, cnic: formatted });
  };

  // Add a patient record to the local queue
  const handleAddToQueue = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!isSupported) {
      setError("IndexedDB is not supported. Cannot queue patient.");
      return;
    }

    // Validate inputs
    if (formData.cnic.length !== 15) {
      setError("CNIC must follow the format XXXXX-XXXXXXX-X (13 digits).");
      return;
    }

    if (!formData.emergency_contact_name || !formData.emergency_contact_phone) {
      setError("Emergency contact name and phone are strictly required.");
      return;
    }

    const newRecord = {
      id: "offline_" + Date.now(),
      data: { ...formData },
      status: "PENDING", // 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED'
      errorMsg: ""
    };

    try {
      await addToQueue("patientQueue", newRecord);
      setQueue((prev) => [...prev, newRecord]);
      
      // Clear inputs
      setFormData({
        first_name: "",
        last_name: "",
        cnic: "",
        date_of_birth: "",
        gender: "M",
        phone: "",
        email: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: ""
      });

      setSuccessMsg("Patient registered successfully inside the Offline Queue.");
    } catch (err) {
      console.error("Error adding to IndexedDB:", err);
      setError("Failed to cache registration record in IndexedDB offline database.");
    }
  };

  // Clear a specific item from queue
  const handleRemoveFromQueue = async (id) => {
    if (!isSupported) return;
    try {
      await removeFromQueue("patientQueue", id);
      setQueue((prev) => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error deleting from IndexedDB:", err);
    }
  };

  // Push pending records to backend
  const syncQueue = async () => {
    if (!isOnline) {
      setError("Cannot sync while system is in OFFLINE mode.");
      return;
    }

    const pendingItems = queue.filter(item => item.status !== "SUCCESS");
    if (pendingItems.length === 0) {
      setError("No pending records to synchronize.");
      return;
    }

    setSyncing(true);
    setError("");
    setSuccessMsg("");

    let updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === "SUCCESS") continue;

      // Mark as syncing in state & IndexedDB
      const syncingItem = { ...item, status: "SYNCING" };
      updatedQueue[i] = syncingItem;
      setQueue([...updatedQueue]);
      await addToQueue("patientQueue", syncingItem);

      try {
        const res = await apiFetch("/patients/", {
          method: "POST",
          body: JSON.stringify(item.data)
        });

        if (!res.ok) {
          const errData = await res.json();
          const errMsg = Object.entries(errData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
            .join(" | ");
          throw new Error(errMsg || "Sync request failed.");
        }

        // Mark success in state & IndexedDB
        const successItem = { ...item, status: "SUCCESS", errorMsg: "" };
        updatedQueue[i] = successItem;
        setQueue([...updatedQueue]);
        await markSynced("patientQueue", item.id);
      } catch (err) {
        console.error("Sync error:", err);
        const failedItem = { ...item, status: "FAILED", errorMsg: err.message || "Failed to push record." };
        updatedQueue[i] = failedItem;
        setQueue([...updatedQueue]);
        await addToQueue("patientQueue", failedItem);
      }
    }

    setSyncing(false);
    
    const failedCount = updatedQueue.filter(item => item.status === "FAILED").length;
    if (failedCount > 0) {
      setError(`Sync completed with ${failedCount} errors. Please check specific record error details.`);
    } else {
      setSuccessMsg("All pending patient charts have been synchronized successfully with the central HMS database.");
    }
  };

  // Auto-sync when toggled back online
  useEffect(() => {
    if (isOnline && queue.some(item => item.status === "PENDING" || item.status === "FAILED")) {
      syncQueue();
    }
  }, [isOnline]);

  const isReceptionistOrAdmin = user?.role === "RECEPTIONIST" || user?.role === "ADMIN";

  if (dbLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-4">
        <RefreshCw size={40} className="animate-spin text-teal-600" />
        <p className="text-xs font-semibold animate-pulse">Initializing Secure Offline Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Offline Synchronization Desk</h2>
          <p className="text-slate-500 text-xs mt-1">Simulate connectivity outages and queue registrations locally to prevent data loss.</p>
        </div>

        {/* Online/Offline Simulator Toggle */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
          <button 
            onClick={() => setIsOnline(true)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              isOnline ? "bg-emerald-50 text-emerald-700 shadow-inner font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Wifi size={14} /> Simulate Online
          </button>
          <button 
            onClick={() => setIsOnline(false)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              !isOnline ? "bg-rose-50 text-rose-700 shadow-inner font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <WifiOff size={14} /> Simulate Offline
          </button>
        </div>
      </div>

      {/* Network Alert Message */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
        isOnline 
          ? "bg-emerald-50/50 border-emerald-200/80 text-emerald-800" 
          : "bg-rose-50/50 border-rose-200/80 text-rose-800"
      }`}>
        <div className="flex items-center space-x-2.5">
          {isOnline ? (
            <Wifi className="text-emerald-600 animate-pulse" size={20} />
          ) : (
            <WifiOff className="text-rose-600 animate-bounce" size={20} />
          )}
          <div className="text-xs">
            <p className="font-bold">System Status: {isOnline ? "ONLINE" : "OFFLINE"}</p>
            <p className="text-[10px] opacity-80 mt-0.5">
              {isOnline 
                ? "Direct database connection active. Queue will auto-sync." 
                : "Central database unreachable. Records will be queued in local storage."}
            </p>
          </div>
        </div>
        
        {queue.some(item => item.status !== "SUCCESS") && (
          <button
            onClick={syncQueue}
            disabled={syncing || !isOnline}
            className="google-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Sync Queue
          </button>
        )}
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Form (Offline queue input) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <UserPlus size={20} />
            <h3 className="font-bold text-slate-800 text-sm">Offline Registration Form</h3>
          </div>
          <hr className="border-slate-100" />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-start space-x-1.5">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <span className="leading-relaxed text-[11px]">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-lg flex items-start space-x-1.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span className="leading-relaxed text-[11px]">{successMsg}</span>
            </div>
          )}

          {isReceptionistOrAdmin ? (
            <form onSubmit={handleAddToQueue} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Zain"
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Bajwa"
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">CNIC *</label>
                  <input
                    type="text"
                    required
                    value={formData.cnic}
                    onChange={handleCnicChange}
                    placeholder="XXXXX-XXXXXXX-X"
                    className="block w-full border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 03218887777"
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Residential Address *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street and City..."
                  rows={2}
                  className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
                <span className="font-semibold text-slate-600 block text-[10px] uppercase tracking-wider">Emergency Contact Details</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Name"
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Phone *</label>
                    <input
                      type="text"
                      required
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="Phone"
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isSupported}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-600/10 text-xs mt-2 disabled:bg-slate-300 disabled:shadow-none"
              >
                Queue Patient Chart
              </button>
            </form>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <ShieldAlert className="mx-auto text-amber-500 mb-2" size={28} />
              <p className="font-bold text-slate-700 text-sm">Write Restricted</p>
              <p className="text-xs">Only Receptionists and Admins can create patient queue profiles.</p>
            </div>
          )}
        </div>

        {/* Local Storage / IndexedDB Queue Monitor (Right 2 columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Database className="text-blue-600" size={18} /> IndexedDB Queue Manager
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-100 font-mono px-2 py-0.5 rounded">
              TOTAL RECORDED: {queue.length}
            </span>
          </div>

          {/* Queue List Table */}
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-2">Patient Details</th>
                  <th className="py-2.5 px-2">CNIC</th>
                  <th className="py-2.5 px-2">Phone</th>
                  <th className="py-2.5 px-2">Sync Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-semibold space-y-2">
                      <CloudLightning className="mx-auto text-slate-300" size={36} />
                      <p>Queue is empty. Simulate offline mode and add patients.</p>
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => {
                    // Status Badge Mapping
                    let badgeClass = "bg-slate-100 text-slate-800";
                    if (item.status === "PENDING") badgeClass = "bg-amber-50 text-amber-700 border border-amber-200/50";
                    if (item.status === "SYNCING") badgeClass = "bg-blue-50 text-blue-700 border border-blue-200/50";
                    if (item.status === "SUCCESS") badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
                    if (item.status === "FAILED") badgeClass = "bg-red-50 text-red-700 border border-red-200/50";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 text-slate-700">
                        <td className="py-3 px-2">
                          <p className="font-bold text-slate-800">{item.data.first_name} {item.data.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">DOB: {item.data.date_of_birth}</p>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-600">{item.data.cnic}</td>
                        <td className="py-3 px-2 text-slate-600">{item.data.phone}</td>
                        <td className="py-3 px-2 space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badgeClass}`}>
                            {item.status === "PENDING" && <Clock size={10} />}
                            {item.status === "SYNCING" && <RefreshCw size={10} className="animate-spin" />}
                            {item.status === "SUCCESS" && <CheckCircle2 size={10} />}
                            {item.status === "FAILED" && <ShieldAlert size={10} />}
                            {item.status}
                          </span>
                          {item.errorMsg && (
                            <p className="text-[9px] text-red-600 leading-tight italic max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap" title={item.errorMsg}>
                              {item.errorMsg}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleRemoveFromQueue(item.id)}
                            className="text-slate-400 hover:text-red-500 p-1 hover:bg-slate-50 rounded transition-all"
                            title="Remove from queue"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Sync Stats Info Banner */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-1.5">
              <Database size={16} className="text-slate-400" />
              <span>Queue data is persistently cached inside browser IndexedDB context.</span>
            </div>
            <span>Pending records: {queue.filter(x => x.status !== "SUCCESS").length}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
