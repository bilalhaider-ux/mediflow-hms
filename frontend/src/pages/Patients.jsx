import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { usePagination } from "../hooks/usePagination";
import { useAuth } from "../context/AuthContext";
import { Search, UserPlus, Trash2, ShieldAlert, CheckCircle2, QrCode } from "lucide-react";
import { Pagination } from "../components/Pagination";

export const Patients = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  
  // Form State
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
  
  // Success Modal state
  const [newPatient, setNewPatient] = useState(null);

  const {
    data: patients,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    loading,
    refresh: fetchPatients
  } = usePagination(`/patients/?search=${search}`);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // CNIC Formatting Helper (XXXXX-XXXXXXX-X)
  const handleCnicChange = (e) => {
    let val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.length > 13) val = val.slice(0, 13);

    let formatted = "";
    if (val.length > 0) formatted += val.slice(0, 5);
    if (val.length > 5) formatted += "-" + val.slice(5, 12);
    if (val.length > 12) formatted += "-" + val.slice(12, 13);

    setFormData({ ...formData, cnic: formatted });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate CNIC length
    if (formData.cnic.length !== 15) {
      setError("CNIC must follow the format XXXXX-XXXXXXX-X (13 digits).");
      return;
    }

    try {
      const res = await apiFetch("/patients/", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        // Extract first error message
        const errMsg = Object.entries(errData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(" ") : val}`)
          .join(" | ");
        throw new Error(errMsg || "Failed to register patient");
      }

      const registered = await res.json();
      setNewPatient(registered); // Open success modal
      fetchPatients(); // Refresh list
      
      // Reset form
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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this patient profile?")) return;
    
    try {
      const res = await apiFetch(`/patients/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchPatients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isReceptionistOrAdmin = user?.role === "RECEPTIONIST" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Patient Registry Portal</h2>
          <p className="text-slate-500 text-xs mt-1">Manage patient files, search records, and register new patients.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Patients List & Search */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search patients by MRN, Name, CNIC, or Phone..."
                className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm transition-all"
              />
            </div>

            {/* Patients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-2">MRN</th>
                    <th className="py-3 px-2">Full Name</th>
                    <th className="py-3 px-2">CNIC</th>
                    <th className="py-3 px-2">Phone</th>
                    <th className="py-3 px-2">Age/Gender</th>
                    {isReceptionistOrAdmin && <th className="py-3 px-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">
                        Loading patient files...
                      </td>
                    </tr>
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">
                        No patient records found.
                      </td>
                    </tr>
                  ) : (
                    patients.map((pat) => {
                      const age = new Date().getFullYear() - new Date(pat.date_of_birth).getFullYear();
                      return (
                        <tr key={pat.id} className="hover:bg-slate-50/50 text-slate-700">
                          <td className="py-3 px-2 font-bold text-teal-700">{pat.mrn}</td>
                          <td className="py-3 px-2 font-semibold">{pat.first_name} {pat.last_name}</td>
                          <td className="py-3 px-2 font-mono text-slate-600">{pat.cnic}</td>
                          <td className="py-3 px-2 text-slate-600">{pat.phone}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                              pat.gender === "M" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"
                            }`}>
                              {pat.gender}
                            </span>
                            {age} yrs
                          </td>
                          {isReceptionistOrAdmin && (
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() => handleDelete(pat.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
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
        </div>

        {/* Right Column: Registration Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          {isReceptionistOrAdmin ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-teal-700">
                <UserPlus size={20} />
                <h3 className="font-bold text-slate-800 text-sm">Register New Patient</h3>
              </div>
              <hr className="border-slate-100" />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-start space-x-1.5">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="e.g. Ahmad"
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="e.g. Ali"
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* CNIC & DOB */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">CNIC *</label>
                    <input
                      type="text"
                      required
                      value={formData.cnic}
                      onChange={handleCnicChange}
                      placeholder="XXXXX-XXXXXXX-X"
                      className="block w-full border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Gender & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
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
                      placeholder="e.g. 03001234567"
                      className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Residential Address *</label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full postal address..."
                    rows={2}
                    className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Emergency Contact */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2.5">
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
                        className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 bg-white"
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
                        className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-teal-600/10 text-xs mt-2"
                >
                  Confirm Registration
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <ShieldAlert size={36} className="mx-auto text-amber-500" />
              <p className="font-bold text-slate-700 text-sm">Write Access Restricted</p>
              <p className="text-xs leading-relaxed">Only Receptionists and Administrators are permitted to register new patients.</p>
            </div>
          )}
        </div>

      </div>

      {/* Success Modal (Registration Complete) */}
      {newPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-teal-500/20 text-center space-y-4">
            <div className="text-emerald-500 bg-emerald-50 p-3 rounded-full inline-block">
              <CheckCircle2 size={32} />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-800">Registration Successful</h3>
              <p className="text-xs text-slate-400 mt-1">A new medical chart has been initialized.</p>
            </div>

            {/* Generated Patient Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Medical Record Number (MRN)</span>
                <p className="text-lg font-extrabold text-teal-800 tracking-wide mt-0.5">{newPatient.mrn}</p>
              </div>

              {/* QR Code Graphic Box */}
              <div className="bg-white p-3 border border-slate-200/50 rounded-xl shadow-inner flex flex-col items-center justify-center">
                <QrCode size={100} className="text-teal-700" />
                <span className="text-[9px] text-teal-600 font-mono font-bold mt-1.5">HMS SCAN ID</span>
              </div>

              <div className="text-xs text-slate-700">
                <p className="font-bold">{newPatient.first_name} {newPatient.last_name}</p>
                <p className="text-slate-500 font-mono">{newPatient.cnic}</p>
              </div>
            </div>

            <button
              onClick={() => setNewPatient(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
