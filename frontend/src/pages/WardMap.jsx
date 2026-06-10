import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { BedDouble, ShieldAlert, Plus, DoorOpen, Info, Edit2, Trash2, X, AlertCircle } from "lucide-react";

export const WardMap = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  // Modals state
  const [activeBed, setActiveBed] = useState(null); // Selected bed for action
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  // Ward Add/Edit Modal
  const [showWardModal, setShowWardModal] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [wardForm, setWardForm] = useState({
    name: "",
    ward_type: "GENERAL",
    total_beds: 10,
    cost_per_day: 1500,
    floor_number: 1
  });
  const [wardError, setWardError] = useState("");
  const [wardLoading, setWardLoading] = useState(false);

  // Bed Add/Edit Modal
  const [showBedModal, setShowBedModal] = useState(false);
  const [editingBed, setEditingBed] = useState(null);
  const [bedForm, setBedForm] = useState({
    bed_number: "",
    bed_type: "STANDARD",
    notes: ""
  });
  const [bedError, setBedError] = useState("");
  const [bedLoading, setBedLoading] = useState(false);

  // Bed Actions Menu Modal (for management)
  const [showBedOptionsModal, setShowBedOptionsModal] = useState(false);
  
  // Forms State
  const [admitForm, setAdmitForm] = useState({
    patient: "",
    admitting_doctor: "",
    notes: ""
  });
  
  const [dischargeForm, setDischargeForm] = useState({
    discharge_date: new Date().toISOString().slice(0, 16) // datetime-local format
  });
  const [formError, setFormError] = useState("");

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  const fetchData = async () => {
    try {
      const [wardsRes, patRes, docRes] = await Promise.all([
        apiFetch("/wards/"),
        apiFetch("/patients/"),
        apiFetch("/doctors/")
      ]);

      if (wardsRes.ok) {
        const wardsData = toArray(await wardsRes.json());
        setWards(wardsData);
        if (wardsData.length > 0) {
          // If selected ward is not set, set it to first. If set, find fresh data for it.
          if (!selectedWard) {
            setSelectedWard(wardsData[0]);
          } else {
            const updated = wardsData.find(w => w.id === selectedWard.id);
            if (updated) setSelectedWard(updated);
          }
        }
      }
      if (patRes.ok) setPatients(toArray(await patRes.json()));
      if (docRes.ok) setDoctors(toArray(await docRes.json()));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchBeds = async () => {
    if (!selectedWard) return;
    try {
      const res = await apiFetch(`/beds/?ward=${selectedWard.id}`);
      if (res.ok) {
        setBeds(toArray(await res.json()));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [selectedWard]);

  const handleBedClick = async (bed) => {
    setActiveBed(bed);
    setFormError("");
    
    if (bed.status === "MAINTENANCE") {
      if (isManagement) {
        setShowBedOptionsModal(true);
      } else {
        alert("This bed is currently under maintenance.");
      }
      return;
    }

    if (bed.is_occupied) {
      // Fetch active admission details for this bed
      try {
        const res = await apiFetch(`/bed-admissions/?status=ADMITTED`);
        if (res.ok) {
          const admissions = toArray(await res.json());
          const activeAdm = admissions.find(a => a.bed === bed.id);
          setSelectedAdmission(activeAdm);
          setShowDischargeModal(true);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      if (isManagement) {
        setShowBedOptionsModal(true);
      } else {
        // Open Admit Modal (receptionist)
        setAdmitForm({ patient: "", admitting_doctor: "", notes: "" });
        setShowAdmitModal(true);
      }
    }
  };

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    try {
      const res = await apiFetch("/bed-admissions/", {
        method: "POST",
        body: JSON.stringify({
          ...admitForm,
          bed: activeBed.id,
          status: "ADMITTED"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.non_field_errors?.join(" ") || "Failed to admit patient.");
      }

      showToast("Patient admitted successfully!");
      setShowAdmitModal(false);
      fetchBeds(); // Refresh bed map
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    try {
      const res = await apiFetch(`/bed-admissions/${selectedAdmission.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "DISCHARGED",
          discharge_date: new Date(dischargeForm.discharge_date).toISOString()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.non_field_errors?.join(" ") || "Failed to discharge patient.");
      }

      showToast("Patient discharged successfully.");
      setShowDischargeModal(false);
      fetchBeds(); // Refresh bed map
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Ward CRUD
  const handleOpenAddWardModal = () => {
    setEditingWard(null);
    setWardError("");
    setWardForm({
      name: "",
      ward_type: "GENERAL",
      total_beds: 10,
      cost_per_day: 1500,
      floor_number: 1
    });
    setShowWardModal(true);
  };

  const handleOpenEditWardModal = (ward) => {
    setEditingWard(ward);
    setWardError("");
    setWardForm({
      name: ward.name,
      ward_type: ward.ward_type,
      total_beds: ward.total_beds,
      cost_per_day: parseInt(ward.cost_per_day),
      floor_number: ward.floor_number || 1
    });
    setShowWardModal(true);
  };

  const handleWardSubmit = async (e) => {
    e.preventDefault();
    setWardError("");
    setWardLoading(true);

    try {
      const payload = {
        name: wardForm.name.trim(),
        ward_type: wardForm.ward_type,
        total_beds: parseInt(wardForm.total_beds, 10),
        cost_per_day: parseFloat(wardForm.cost_per_day),
        floor_number: parseInt(wardForm.floor_number, 10)
      };

      let res;
      if (editingWard) {
        res = await apiFetch(`/wards/${editingWard.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch("/wards/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const savedWard = await res.json();
        showToast(editingWard ? "Ward updated successfully!" : "Ward registered successfully!");
        setShowWardModal(false);
        await fetchData(); // refresh ward list
        setSelectedWard(savedWard);
      } else {
        const errData = await res.json();
        setWardError(errData.name ? `Name error: ${errData.name.join(" ")}` : errData.detail || "Failed to save ward.");
      }
    } catch (err) {
      setWardError("Connection error.");
    } finally {
      setWardLoading(false);
    }
  };

  // Bed CRUD
  const handleOpenAddBedModal = () => {
    setEditingBed(null);
    setBedError("");
    setBedForm({
      bed_number: "",
      bed_type: "STANDARD",
      notes: ""
    });
    setShowBedModal(true);
  };

  const handleOpenEditBedModal = (bed) => {
    setEditingBed(bed);
    setBedError("");
    setBedForm({
      bed_number: bed.bed_number,
      bed_type: bed.bed_type || "STANDARD",
      notes: bed.notes || ""
    });
    setShowBedModal(true);
  };

  const handleBedSubmit = async (e) => {
    e.preventDefault();
    setBedError("");
    setBedLoading(true);

    try {
      const payload = {
        ward: selectedWard.id,
        bed_number: bedForm.bed_number.trim(),
        bed_type: bedForm.bed_type,
        notes: bedForm.notes.trim()
      };

      let res;
      if (editingBed) {
        res = await apiFetch(`/beds/${editingBed.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch("/beds/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingBed ? "Bed details updated!" : "Bed added successfully!");
        setShowBedModal(false);
        setShowBedOptionsModal(false);
        fetchBeds();
      } else {
        const errData = await res.json();
        setBedError(errData.bed_number ? `Bed number error: ${errData.bed_number.join(" ")}` : errData.detail || "Failed to save bed.");
      }
    } catch (err) {
      setBedError("Connection error.");
    } finally {
      setBedLoading(false);
    }
  };

  // Patch Bed Status (Maintenance toggle)
  const handlePatchBedStatus = async (bedId, newStatus) => {
    try {
      const res = await apiFetch(`/beds/${bedId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast(`Bed status updated to ${newStatus}.`);
        setShowBedOptionsModal(false);
        fetchBeds();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to update bed status.");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error.");
    }
  };

  const isReceptionistOrAdmin = user?.role === "RECEPTIONIST" || user?.role === "ADMIN";
  const isManagement = user?.role === "ADMIN" || user?.role === "SUB_ADMIN";

  const getBedStyles = (bed) => {
    if (bed.status === "MAINTENANCE") {
      return "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50";
    }
    return bed.is_occupied
      ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100/50"
      : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">IPD Wards & Occupancy Map</h2>
          <p className="text-slate-500 text-xs mt-1">Real-time bed allocation grid, admission checklists, and discharge management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Wards selector */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Clinic Wards</h3>
            {isManagement && (
              <button
                onClick={handleOpenAddWardModal}
                className="text-teal-600 hover:text-teal-700 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                title="Add Ward"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {wards.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWard(w)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedWard?.id === w.id
                    ? "bg-teal-600 text-white shadow-md shadow-teal-500/20"
                    : "text-slate-600 hover:bg-slate-100/40"
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Columns: Visual Beds Map */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-800 text-base">{selectedWard?.name || "Ward Grid"}</h3>
                {isManagement && selectedWard && (
                  <button
                    onClick={() => handleOpenEditWardModal(selectedWard)}
                    className="text-slate-400 hover:text-teal-600 p-1 rounded transition-all"
                    title="Edit Ward"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                {selectedWard?.ward_type} WARD — Floor {selectedWard?.floor_number || 1} — Rs. {parseInt(selectedWard?.cost_per_day || 0)}/day
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {isManagement && selectedWard && (
                <button
                  onClick={handleOpenAddBedModal}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all"
                >
                  <Plus size={14} />
                  <span>Add Bed</span>
                </button>
              )}
              
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <span className="flex items-center space-x-1.5 text-emerald-600">
                  <span className="w-3 h-3 bg-emerald-500 rounded"></span>
                  <span>Available</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-600">
                  <span className="w-3 h-3 bg-amber-500 rounded"></span>
                  <span>Maintenance</span>
                </span>
                <span className="flex items-center space-x-1.5 text-red-600">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span>Occupied</span>
                </span>
              </div>
            </div>
          </div>

          {/* Beds Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 py-4">
            {beds.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center col-span-full">No beds configured in this ward.</p>
            ) : (
              beds.map((bed) => (
                <button
                  key={bed.id}
                  onClick={() => handleBedClick(bed)}
                  className={`p-4 rounded-2xl border text-center transition-all hover:scale-[1.02] flex flex-col items-center justify-center space-y-2 cursor-pointer shadow-sm ${getBedStyles(bed)}`}
                >
                  <BedDouble size={24} />
                  <span className="text-xs font-bold font-mono">{bed.bed_number}</span>
                  <span className="text-[8px] font-semibold opacity-75 uppercase">{bed.bed_type || "STANDARD"}</span>
                </button>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Ward Add/Edit Modal */}
      {showWardModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingWard ? "Edit Ward Profile" : "Register New Ward"}
              </h3>
              <button onClick={() => setShowWardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleWardSubmit} className="p-5 space-y-4 text-xs">
              {wardError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100 flex items-center space-x-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{wardError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ward Name*</label>
                <input
                  type="text"
                  required
                  value={wardForm.name}
                  onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  placeholder="e.g. Ward A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ward Type*</label>
                  <select
                    value={wardForm.ward_type}
                    onChange={(e) => setWardForm({ ...wardForm, ward_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  >
                    <option value="GENERAL">General Ward</option>
                    <option value="ICU">Intensive Care Unit</option>
                    <option value="PRIVATE">Private Room</option>
                    <option value="CCU">Cardiac Care Unit</option>
                    <option value="MATERNITY">Maternity Ward</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Floor Number*</label>
                  <input
                    type="number"
                    required
                    value={wardForm.floor_number}
                    onChange={(e) => setWardForm({ ...wardForm, floor_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacity (Beds)*</label>
                  <input
                    type="number"
                    required
                    value={wardForm.total_beds}
                    onChange={(e) => setWardForm({ ...wardForm, total_beds: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Per Day (PKR)*</label>
                  <input
                    type="number"
                    required
                    value={wardForm.cost_per_day}
                    onChange={(e) => setWardForm({ ...wardForm, cost_per_day: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={wardLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center justify-center space-x-2"
                >
                  {wardLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{wardLoading ? "Saving Ward..." : "Save Ward Details"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWardModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Add/Edit Modal */}
      {showBedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingBed ? `Edit Bed: ${editingBed.bed_number}` : `Add Bed to Ward: ${selectedWard?.name}`}
              </h3>
              <button onClick={() => setShowBedModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBedSubmit} className="p-5 space-y-4 text-xs">
              {bedError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100 flex items-center space-x-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{bedError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bed Number*</label>
                <input
                  type="text"
                  required
                  value={bedForm.bed_number}
                  onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800 font-mono"
                  placeholder="e.g. Bed-A1"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bed Type*</label>
                <select
                  value={bedForm.bed_type}
                  onChange={(e) => setBedForm({ ...bedForm, bed_type: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                >
                  <option value="STANDARD">Standard Bed</option>
                  <option value="ICU">ICU Bed</option>
                  <option value="PRIVATE">Private Bed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={bedForm.notes}
                  onChange={(e) => setBedForm({ ...bedForm, notes: e.target.value })}
                  placeholder="Maintenance log, special details, etc..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={bedLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center justify-center space-x-2"
                >
                  {bedLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{bedLoading ? "Saving Bed..." : "Save Bed Details"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBedModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Options Management Modal */}
      {showBedOptionsModal && activeBed && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                Bed Action Sheet: {activeBed.bed_number}
              </h3>
              <button onClick={() => setShowBedOptionsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1.5">
                <p><span className="font-semibold text-slate-500">Bed Number:</span> <span className="font-bold text-slate-800 font-mono">{activeBed.bed_number}</span></p>
                <p><span className="font-semibold text-slate-500">Type:</span> <span className="font-bold text-teal-700 text-[10px] uppercase bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-100">{activeBed.bed_type || "STANDARD"}</span></p>
                <p><span className="font-semibold text-slate-500">Status:</span> <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeBed.status === "MAINTENANCE" 
                    ? "bg-amber-50 text-amber-700 border border-amber-200" 
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>{activeBed.status}</span></p>
                {activeBed.notes && (
                  <p><span className="font-semibold text-slate-500">Notes:</span> <span className="text-slate-600">{activeBed.notes}</span></p>
                )}
              </div>

              <div className="flex flex-col space-y-2 pt-2">
                {activeBed.status === "AVAILABLE" && (
                  <button
                    onClick={() => {
                      setShowBedOptionsModal(false);
                      setAdmitForm({ patient: "", admitting_doctor: "", notes: "" });
                      setShowAdmitModal(true);
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-xs"
                  >
                    Admit Patient
                  </button>
                )}

                <button
                  onClick={() => {
                    handleOpenEditBedModal(activeBed);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-all"
                >
                  Edit Bed Details
                </button>

                {activeBed.status === "AVAILABLE" && (
                  <button
                    onClick={() => handlePatchBedStatus(activeBed.id, "MAINTENANCE")}
                    className="w-full bg-amber-50 hover:bg-amber-100/60 text-amber-700 border border-amber-200 py-2.5 rounded-xl font-bold transition-all"
                  >
                    Mark Maintenance
                  </button>
                )}

                {activeBed.status === "MAINTENANCE" && (
                  <button
                    onClick={() => handlePatchBedStatus(activeBed.id, "AVAILABLE")}
                    className="w-full bg-emerald-50 hover:bg-emerald-100/60 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl font-bold transition-all"
                  >
                    Restore to Available
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admit Patient Modal */}
      {showAdmitModal && activeBed && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-155">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Plus size={18} className="text-teal-600" />
                <span>Admit Patient to Bed: {activeBed.bed_number}</span>
              </h3>
              <button onClick={() => setShowAdmitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p className="bg-red-50 border border-red-100 text-red-700 text-xs p-2 rounded-xl mb-4 font-semibold">{formError}</p>
            )}

            {isReceptionistOrAdmin ? (
              <form onSubmit={handleAdmitSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Select Patient *</label>
                  <select
                    required
                    value={admitForm.patient}
                    onChange={(e) => setAdmitForm({ ...admitForm, patient: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:ring-teal-500 focus:outline-none focus:border-teal-500 text-slate-800"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Admitting Doctor *</label>
                  <select
                    required
                    value={admitForm.admitting_doctor}
                    onChange={(e) => setAdmitForm({ ...admitForm, admitting_doctor: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:ring-teal-500 focus:outline-none focus:border-teal-500 text-slate-800"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.user_details.first_name} {d.user_details.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Admission Notes</label>
                  <textarea
                    value={admitForm.notes}
                    onChange={(e) => setAdmitForm({ ...admitForm, notes: e.target.value })}
                    placeholder="Diagnosis, reason for admission, etc..."
                    rows={3}
                    className="block w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:ring-teal-500 focus:outline-none focus:border-teal-500 text-slate-800"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl font-bold transition-all shadow-xs">
                    Admit Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdmitModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 text-slate-400 space-y-2">
                <ShieldAlert size={36} className="mx-auto text-amber-600" />
                <p className="font-bold text-slate-700 text-sm">Access Denied</p>
                <p className="text-xs">Only receptionists/admins are authorized to register admissions.</p>
                <button
                  onClick={() => setShowAdmitModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-full text-xs font-semibold mt-3 transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discharge / Bed Info Modal */}
      {showDischargeModal && activeBed && selectedAdmission && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-155">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Info size={18} className="text-red-500" />
                <span>Bed Allocation Details: {activeBed.bed_number}</span>
              </h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p className="bg-red-50 border border-red-100 text-red-700 text-xs p-2 rounded-xl mb-4 font-semibold">{formError}</p>
            )}

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border space-y-2">
                <p><span className="font-semibold text-slate-500">Patient:</span> <span className="font-bold text-slate-800">{selectedAdmission.patient_details?.first_name} {selectedAdmission.patient_details?.last_name}</span></p>
                <p><span className="font-semibold text-slate-500">MRN:</span> <span className="font-mono text-slate-800">{selectedAdmission.patient_details?.mrn}</span></p>
                <p><span className="font-semibold text-slate-500">Admitting Doctor:</span> Dr. {selectedAdmission.doctor_details?.user_details?.first_name}</p>
                <p><span className="font-semibold text-slate-500">Date Admitted:</span> {new Date(selectedAdmission.admission_date).toLocaleString()}</p>
                {selectedAdmission.notes && <p><span className="font-semibold text-slate-500">Admitting Notes:</span> {selectedAdmission.notes}</p>}
              </div>

              {isReceptionistOrAdmin ? (
                <form onSubmit={handleDischargeSubmit} className="space-y-3 pt-2">
                  <label className="block text-slate-600 font-bold mb-1 uppercase tracking-wider text-[10px]">Select Discharge Date/Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={dischargeForm.discharge_date}
                    onChange={(e) => setDischargeForm({ discharge_date: e.target.value })}
                    className="block w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium text-xs focus:ring-teal-500 focus:outline-none focus:border-teal-500 text-slate-800"
                  />

                  <div className="flex space-x-3 pt-2">
                    <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs">
                      <DoorOpen size={16} />
                      <span>Discharge Patient</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDischargeModal(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all"
                    >
                      Close
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowDischargeModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 px-4 rounded-xl font-semibold transition-all"
                >
                  Close Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-500 transition-all animate-bounce">
          <span className="font-bold">✓</span>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
