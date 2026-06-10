import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Building, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle2, MapPin, Phone, Mail, User, ShieldAlert, Users } from "lucide-react";

export const BranchManagement = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    manager: ""
  });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [branchesRes, usersRes] = await Promise.all([
        apiFetch("/branches/"),
        apiFetch("/auth/users/")
      ]);

      if (branchesRes.ok) {
        setBranches(toArray(await branchesRes.json()));
      }
      if (usersRes.ok) {
        setUsers(toArray(await usersRes.json()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubAdmins = async () => {
    try {
      const res = await apiFetch("/auth/users/?role=SUB_ADMIN");
      if (res.ok) {
        setSubAdmins(toArray(await res.json()));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchSubAdmins();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBranch(null);
    setFormData({
      name: "",
      city: "",
      address: "",
      phone: "",
      email: "",
      manager: ""
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleOpenEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      city: branch.city,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      manager: branch.manager ? branch.manager.toString() : ""
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        manager: formData.manager ? parseInt(formData.manager, 10) : null
      };

      let res;
      if (editingBranch) {
        res = await apiFetch(`/branches/${editingBranch.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch("/branches/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        const errMsg = Object.entries(errData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(" ") : val}`)
          .join(" | ");
        throw new Error(errMsg || "Failed to save branch");
      }

      const msg = editingBranch ? "Branch updated successfully!" : "Branch added successfully!";
      setSuccess(msg);
      showToast(msg);
      fetchBranches();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivateToggle = async (branch) => {
    const action = branch.is_active !== false ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${branch.name}?`)) return;

    try {
      const res = await apiFetch(`/branches/${branch.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: branch.is_active === false })
      });
      if (res.ok) {
        showToast(`Branch ${action}d successfully.`);
        fetchBranches();
      } else {
        alert(`Failed to ${action} branch.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-semibold text-slate-500">
        Access Denied. You do not have permission to view Branch Management.
      </div>
    );
  }

  // Calculate statistics
  const totalBranches = branches.length;
  const activeBranches = branches.filter(b => b.is_active !== false).length;
  const inactiveBranches = totalBranches - activeBranches;

  // Calculate counts per branch
  const getBranchStats = (branchId) => {
    const branchStaff = users.filter(u => u.branch === branchId && u.role !== "PATIENT");
    const activeDocs = branchStaff.filter(u => u.role === "DOCTOR" && u.is_active !== false);
    return {
      totalStaff: branchStaff.length,
      activeDoctors: activeDocs.length
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="text-teal-600" /> Branch Management Desk
          </h2>
          <p className="text-slate-500 text-xs mt-1">Review active branch outlets, service zones, and coordinate healthcare systems.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
        >
          <Plus size={14} />
          <span>Add Branch</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Branches</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalBranches}</p>
          </div>
          <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500">
            <Building size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wider">Active Outlets</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{activeBranches}</p>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider">Inactive Outlets</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{inactiveBranches}</p>
          </div>
          <div className="bg-rose-50 p-2.5 rounded-xl text-rose-600">
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {loading && branches.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          Loading branch profiles...
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          No branch profiles registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => {
            const stats = getBranchStats(branch.id);
            return (
              <div 
                key={branch.id} 
                className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition-all relative flex flex-col justify-between ${
                  branch.is_active !== false 
                    ? "border-slate-200" 
                    : "border-rose-100 bg-rose-50/10"
                }`}
              >
                <div>
                  {/* Top line Name + Status */}
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{branch.name}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 border ${
                      branch.is_active !== false 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {branch.is_active !== false ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  {/* City and Address */}
                  <div className="flex items-start space-x-1.5 text-slate-500 text-[11px] mt-1.5 font-medium">
                    <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                    <span>{branch.city} &mdash; <span className="text-slate-400">{branch.address}</span></span>
                  </div>

                  {/* Contact Info */}
                  <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5 text-[11px] text-slate-600 font-semibold">
                    <div className="flex items-center space-x-2">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{branch.phone || "No phone number"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span>{branch.email || "No email address"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span>Manager: <span className="text-slate-700 font-bold">{branch.manager_name || "Unassigned"}</span></span>
                    </div>
                  </div>
                </div>

                {/* Staff stats & actions */}
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <div className="flex space-x-3">
                    <div className="flex items-center space-x-1">
                      <Users size={12} className="text-slate-400" />
                      <span>Staff: {stats.totalStaff}</span>
                    </div>
                    <div>
                      <span>Doctors: {stats.activeDoctors}</span>
                    </div>
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(branch)}
                      className="text-slate-400 hover:text-teal-600 p-1.5 rounded hover:bg-slate-100 transition-all"
                      title="Edit branch"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeactivateToggle(branch)}
                      className={`p-1.5 rounded hover:bg-slate-100 transition-all ${
                        branch.is_active !== false 
                          ? "text-slate-400 hover:text-rose-600" 
                          : "text-slate-400 hover:text-emerald-600"
                      }`}
                      title={branch.is_active !== false ? "Deactivate branch" : "Activate branch"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingBranch ? "Edit Branch Profile" : "Add New Branch"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-2.5 rounded-xl flex items-start space-x-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-xl flex items-start space-x-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{success}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Lahore Johar Town"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Lahore"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Address *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full physical street location..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +9242111222333"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. lhr@mediflow.com"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Branch Manager</label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                >
                  <option value="">-- Unassigned --</option>
                  {subAdmins.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username} ({m.first_name} {m.last_name})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Select the SUB_ADMIN user in charge of managing this branch outlet.</p>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl font-bold transition-all"
                >
                  {editingBranch ? "Save Changes" : "Create Branch"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
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
