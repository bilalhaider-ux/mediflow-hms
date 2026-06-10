import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { usePagination } from "../hooks/usePagination";
import { Pagination } from "../components/Pagination";
import { 
  Search, 
  Pill, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ShieldAlert, 
  History, 
  FileText
} from "lucide-react";

export const Pharmacy = () => {
  const { user } = useAuth();
  
  // Tab states: 'inventory' | 'dispensation' | 'history'
  const [activeTab, setActiveTab] = useState("inventory");
  
  // Data states
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  
  // Loader & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Search states
  const [medSearch, setMedSearch] = useState("");
  const [patSearch, setPatSearch] = useState("");

  const {
    data: medicines,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    loading: loadingMedicines,
    refresh: fetchMedicines
  } = usePagination(`/pharmacy/medicines/?search=${medSearch}`);
  
  // Dispensation Form state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dispenseItems, setDispenseItems] = useState([]); // Array of { medicine_id, medicine_name, quantity }
  const [currentMed, setCurrentMed] = useState("");
  const [currentQty, setCurrentQty] = useState(1);
  const [prescriptionId, setPrescriptionId] = useState("");

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const batchRes = await apiFetch("/pharmacy/batches/");
      if (batchRes.ok) {
        const data = await batchRes.json();
        setBatches(toArray(data));
      }
      
      const alertRes = await apiFetch("/pharmacy/batches/alerts/");
      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlerts(toArray(data));
      }

      const logRes = await apiFetch("/pharmacy/dispensations/");
      if (logRes.ok) {
        const data = await logRes.json();
        setHistoryLogs(toArray(data));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePatientSearch = async (val) => {
    setPatSearch(val);
    if (val.length < 2) {
      setPatients([]);
      return;
    }
    try {
      const res = await apiFetch(`/patients/?search=${val}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(toArray(data));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addDispenseItem = () => {
    if (!currentMed) return;
    const medObj = medicines.find(m => m.id === parseInt(currentMed));
    if (!medObj) return;

    // Check if already added
    const existing = dispenseItems.find(item => item.medicine === medObj.id);
    if (existing) {
      setDispenseItems(dispenseItems.map(item => 
        item.medicine === medObj.id 
          ? { ...item, quantity: item.quantity + parseInt(currentQty) }
          : item
      ));
    } else {
      setDispenseItems([...dispenseItems, {
        medicine: medObj.id,
        name: medObj.name,
        generic_name: medObj.generic_name,
        quantity: parseInt(currentQty)
      }]);
    }
    
    // Reset selection inputs
    setCurrentMed("");
    setCurrentQty(1);
  };

  const removeDispenseItem = (medId) => {
    setDispenseItems(dispenseItems.filter(item => item.medicine !== medId));
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!selectedPatient) {
      setError("Please select a patient first.");
      return;
    }

    if (dispenseItems.length === 0) {
      setError("Please add at least one medication to dispense.");
      return;
    }

    const payload = {
      prescription: prescriptionId || null,
      dispensed_to: selectedPatient.id,
      items: dispenseItems.map(item => ({
        medicine: item.medicine,
        quantity: item.quantity
      }))
    };

    try {
      const res = await apiFetch("/pharmacy/dispensations/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to dispense medication.");
      }

      setSuccessMsg("Medication successfully dispensed using FIFO inventory deduction.");
      setDispenseItems([]);
      setSelectedPatient(null);
      setPrescriptionId("");
      setPatSearch("");
      fetchData(); // Refresh inventory levels and history logs
      fetchMedicines(); // Refresh medicines catalog
    } catch (err) {
      setError(err.message);
    }
  };

  const isPharmacistOrAdmin = user?.role === "PHARMACIST" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pharmacy Inventory & Dispensation</h2>
          <p className="text-slate-500 text-xs mt-1">Manage pharmacy medications, monitor batch expiries, and process prescriptions.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button 
            onClick={() => setActiveTab("inventory")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "inventory" ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-800"}`}
          >
            Medicine Inventory
          </button>
          <button 
            onClick={() => setActiveTab("dispensation")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "dispensation" ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-800"}`}
          >
            Dispense Desk
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "history" ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-800"}`}
          >
            Dispensation History
          </button>
        </div>
      </div>

      {/* Critical Stock/Expiry Alerts Bar */}
      {alerts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div>
              <h4 className="text-xs font-bold text-amber-800">Inventory Warning Alerts</h4>
              <p className="text-amber-700 text-[10px] mt-0.5">
                There are {alerts.length} batches either expiring within 30 days or falling below low-stock limit (50 units).
              </p>
            </div>
          </div>
          <div className="flex -space-x-1.5 overflow-hidden">
            {alerts.slice(0, 5).map((alert, i) => (
              <span 
                key={alert.id}
                className="inline-block bg-white text-amber-800 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm"
              >
                {alert.medicine_name} ({alert.batch_number})
              </span>
            ))}
            {alerts.length > 5 && (
              <span className="inline-block bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                +{alerts.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Medicines Listing */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Pill className="text-blue-600" size={18} /> Medicines Catalog
              </h3>
              
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400" size={14} />
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="Search medicine catalog..."
                  className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-2">Name</th>
                    <th className="py-2.5 px-2">Generic</th>
                    <th className="py-2.5 px-2">Formulation</th>
                    <th className="py-2.5 px-2">Strength</th>
                    <th className="py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingMedicines ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400">Loading catalog...</td></tr>
                  ) : medicines.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-400">No medicines found.</td></tr>
                  ) : (
                    medicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/50 text-slate-700 font-medium">
                        <td className="py-3 px-2 font-bold text-blue-700">{med.name}</td>
                        <td className="py-3 px-2 text-slate-600 italic">{med.generic_name}</td>
                        <td className="py-3 px-2">{med.formulation}</td>
                        <td className="py-3 px-2">{med.strength}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${med.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                            {med.is_active ? "Active" : "Discontinued"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={goToPage}
            />
          </div>

          {/* Batches & Expiry List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="text-blue-600" size={18} /> Active Stock Batches
            </h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {batches.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">No active batches available.</p>
              ) : (
                batches.map((batch) => {
                  const isLow = batch.quantity_remaining < 50;
                  const isExpiring = batch.is_expired || (new Date(batch.expiry_date) - new Date() < 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div 
                      key={batch.id} 
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        batch.is_expired 
                          ? "bg-red-50/50 border-red-200" 
                          : isExpiring || isLow 
                          ? "bg-amber-50/40 border-amber-200" 
                          : "bg-slate-50/50 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{batch.medicine_name}</p>
                          <p className="text-[10px] text-slate-500">Batch: <span className="font-semibold text-slate-700">{batch.batch_number}</span></p>
                        </div>
                        <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          isLow ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {batch.quantity_remaining} Left
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-200/40 pt-1.5">
                        <p>Price: <span className="font-semibold text-slate-700">Rs. {batch.unit_price}</span></p>
                        <p className={`flex items-center gap-1 ${
                          batch.is_expired ? "text-red-600 font-bold" : isExpiring ? "text-amber-700 font-semibold" : ""
                        }`}>
                          Exp: {batch.expiry_date}
                          {batch.is_expired && "(Expired)"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "dispensation" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispensation Form (Left 2 columns) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <FileText className="text-blue-600" size={18} /> Dispense Medication Desk
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-start space-x-1.5">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-lg flex items-start space-x-1.5">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleDispenseSubmit} className="space-y-4 text-xs">
              {/* Patient Search */}
              <div className="space-y-1.5 relative">
                <label className="block text-slate-500 font-bold">Search Patient (MRN, Name, or CNIC) *</label>
                <div className="relative">
                  <Search className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400" size={14} />
                  <input
                    type="text"
                    value={patSearch}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                    placeholder="Type to search patients..."
                    className="block w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {patients.length > 0 && (
                  <div className="absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto mt-1 divide-y divide-slate-50">
                    {patients.map((pat) => (
                      <div 
                        key={pat.id}
                        onClick={() => {
                          setSelectedPatient(pat);
                          setPatients([]);
                          setPatSearch(`${pat.first_name} ${pat.last_name} (${pat.mrn})`);
                        }}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{pat.first_name} {pat.last_name}</p>
                          <p className="text-[10px] text-slate-500">CNIC: {pat.cnic} | Phone: {pat.phone}</p>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{pat.mrn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Selected Patient Details Card */}
              {selectedPatient && (
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/50 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Active Recipient</span>
                    <h4 className="font-bold text-slate-800">{selectedPatient.first_name} {selectedPatient.last_name}</h4>
                    <p className="text-[10px] text-slate-500">MRN: {selectedPatient.mrn} | Contact: {selectedPatient.phone}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Prescription ID (Optional) */}
              <div>
                <label className="block text-slate-500 font-bold mb-1">Prescription Reference (Optional)</label>
                <input
                  type="text"
                  value={prescriptionId}
                  onChange={(e) => setPrescriptionId(e.target.value)}
                  placeholder="e.g. prescription ID or document reference"
                  className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <hr className="border-slate-100" />

              {/* Medicine Select & Add Section */}
              <div className="space-y-2.5">
                <span className="font-bold text-slate-700 block uppercase tracking-wide text-[10px]">Add Medicines to Dispense Basket</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-slate-500 font-semibold mb-1">Select Medicine</label>
                    <select
                      value={currentMed}
                      onChange={(e) => setCurrentMed(e.target.value)}
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                    >
                      <option value="">-- Choose Medicine --</option>
                      {medicines.filter(m => m.is_active).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.generic_name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={currentQty}
                      onChange={(e) => setCurrentQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addDispenseItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>

              {/* Dispensation Basket List */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block uppercase tracking-wide text-[10px]">Dispensation Basket ({dispenseItems.length} items)</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs bg-slate-50/30">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2 px-3">Medicine</th>
                        <th className="py-2 px-3">Generic Name</th>
                        <th className="py-2 px-3">Quantity</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {dispenseItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-400">
                            Dispense basket is empty. Add medicines above.
                          </td>
                        </tr>
                      ) : (
                        dispenseItems.map((item) => (
                          <tr key={item.medicine} className="text-slate-700 font-medium bg-white">
                            <td className="py-2 px-3 font-bold text-slate-800">{item.name}</td>
                            <td className="py-2 px-3 text-slate-500 italic">{item.generic_name}</td>
                            <td className="py-2 px-3 font-semibold">{item.quantity} units</td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeDispenseItem(item.medicine)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Submit */}
              {isPharmacistOrAdmin ? (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-600/10 text-xs mt-3 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} /> Process & Deduct Stock (FIFO)
                </button>
              ) : (
                <div className="bg-slate-50 text-slate-400 p-3.5 rounded-xl border border-slate-200/50 text-center font-semibold">
                  Only Pharmacists and Admins can process dispensations.
                </div>
              )}
            </form>
          </div>

          {/* FIFO Deduction Explanation Graphic Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">How FIFO Dispensation Works</h3>
            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <p>
                To minimize inventory waste and expiry losses, our HMS automatically executes a <strong>First-In, First-Out (FIFO)</strong> deduction algorithm.
              </p>
              
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <span className="font-bold text-blue-800 block uppercase tracking-wider text-[9px]">The Deduction Order:</span>
                <ol className="list-decimal list-inside space-y-1.5 text-[10px]">
                  <li>Finds all batches of the selected medicine.</li>
                  <li>Sorts batches by <strong>expiry date</strong> (earliest expiry first).</li>
                  <li>Deducts quantity from the earliest batch.</li>
                  <li>If insufficient, continues to the next batch.</li>
                </ol>
              </div>

              <div className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <span className="font-bold text-slate-700 block">Verification Rules:</span>
                <p>• Cannot dispense expired batches.</p>
                <p>• Cannot dispense quantity greater than total remaining stock.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <History className="text-blue-600" size={18} /> Dispensation Log History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-2">Dispensed At</th>
                  <th className="py-2.5 px-2">MRN</th>
                  <th className="py-2.5 px-2">Patient</th>
                  <th className="py-2.5 px-2">Dispensed By</th>
                  <th className="py-2.5 px-2">Medications & Batches Deducted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      No dispensation logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30">
                      <td className="py-3 px-2 text-slate-500 font-mono">
                        {new Date(log.dispensed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 font-bold text-blue-700">
                        {log.patient_details?.mrn || "N/A"}
                      </td>
                      <td className="py-3 px-2 font-semibold">
                        {log.patient_details?.first_name} {log.patient_details?.last_name}
                      </td>
                      <td className="py-3 px-2 text-slate-600">
                        {log.dispensed_by_username}
                      </td>
                      <td className="py-3 px-2 space-y-1">
                        {log.items.map((item) => (
                          <div key={item.id} className="inline-flex items-center gap-1.5 mr-2 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                            <span className="font-bold">{item.medicine_name}</span> 
                            <span className="text-slate-500">x{item.quantity}</span>
                            <span className="bg-blue-200 text-blue-800 font-mono text-[9px] px-1 rounded">Batch: {item.batch_number}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
