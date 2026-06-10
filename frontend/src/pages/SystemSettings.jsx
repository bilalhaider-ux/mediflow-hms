import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Settings, Building, CircleDollarSign, Bell, Clock, X, AlertCircle, Upload, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export const SystemSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("hospital"); // "hospital" | "financial" | "notifications" | "hours" | "security"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });

  // Tab 1 Form State
  const [hospitalForm, setHospitalForm] = useState({
    hospital_name: "MediFlow",
    tagline: "",
    address: "",
    phone: "",
    email: ""
  });
  const [logoFile, setLogoFile] = useState(null);

  // Security tab state
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [resetForm, setResetForm] = useState({ username: "", new_password: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [logoPreview, setLogoPreview] = useState("");

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // Fetch hospital info on mount
  const fetchHospitalInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/settings/hospital/");
      if (res.ok) {
        const data = await res.json();
        setHospitalForm({
          hospital_name: data.hospital_name || "MediFlow",
          tagline: data.tagline || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || ""
        });
        if (data.logo) {
          setLogoPreview(data.logo);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalInfo();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleHospitalSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("hospital_name", hospitalForm.hospital_name);
      formData.append("tagline", hospitalForm.tagline);
      formData.append("address", hospitalForm.address);
      formData.append("phone", hospitalForm.phone);
      formData.append("email", hospitalForm.email);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      // Call API with custom multipart fetch
      const token = localStorage.getItem("access_token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${baseUrl}/settings/hospital/`, {
        method: "PUT",
        headers,
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess("Hospital information saved successfully!");
        showToast("Hospital info saved successfully!");
        if (data.logo) {
          setLogoPreview(data.logo);
        }
        setLogoFile(null);
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update hospital settings.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-semibold text-slate-500">
        Access Denied. You do not have permission to view System Settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="text-teal-600" /> System Settings & Controls
        </h2>
        <p className="text-slate-500 text-xs mt-1">Configure global clinic settings, billing configurations, and notifications systems.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("hospital")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "hospital"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building size={16} />
          <span>Hospital Info</span>
        </button>
        <button
          onClick={() => setActiveTab("financial")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "financial"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CircleDollarSign size={16} />
          <span>Financial Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "notifications"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Bell size={16} />
          <span>Notification Toggles</span>
        </button>
        <button
          onClick={() => setActiveTab("hours")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "hours"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock size={16} />
          <span>Working Hours</span>
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "security"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Lock size={16} />
          <span>Security</span>
        </button>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl flex items-center space-x-2 mb-4 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl flex items-center space-x-2 mb-4 text-xs font-semibold animate-fade-in">
            <span className="font-bold">✓</span>
            <span>{success}</span>
          </div>
        )}

        {activeTab === "hospital" && (
          <form onSubmit={handleHospitalSubmit} className="space-y-4 text-xs">
            <div className="flex items-center space-x-5">
              <div className="relative w-20 h-20 bg-slate-100 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building size={28} className="text-slate-400" />
                )}
                <label className="absolute inset-0 bg-black/45 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload size={16} />
                  <input type="file" onChange={handleLogoChange} className="hidden" accept="image/*" />
                </label>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Hospital Branding Logo</h4>
                <p className="text-slate-400 text-[10px] mt-0.5">JPEG, PNG format. Max file size: 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={hospitalForm.hospital_name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Tagline</label>
                <input
                  type="text"
                  value={hospitalForm.tagline}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, tagline: e.target.value })}
                  placeholder="e.g. Care with Passion"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Address</label>
              <textarea
                value={hospitalForm.address}
                onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                placeholder="Hospital street address..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={hospitalForm.phone}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                  placeholder="e.g. +9242111222333"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Contact Email</label>
                <input
                  type="email"
                  value={hospitalForm.email}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, email: e.target.value })}
                  placeholder="e.g. info@hospital.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center justify-center space-x-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Save Hospital Info</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === "financial" && (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <CircleDollarSign size={32} className="mx-auto text-slate-300" />
            <h4 className="font-bold text-slate-700 text-sm">Financial Settings Configuration</h4>
            <p className="text-xs">This configuration page is currently locked pending verification approval.</p>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Bell size={32} className="mx-auto text-slate-300" />
            <h4 className="font-bold text-slate-700 text-sm">Notification Channels Configuration</h4>
            <p className="text-xs">This configuration page is currently locked pending verification approval.</p>
          </div>
        )}

        {activeTab === "hours" && (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock size={32} className="mx-auto text-slate-300" />
            <h4 className="font-bold text-slate-700 text-sm">OPD Shift Hours Configuration</h4>
            <p className="text-xs">This configuration page is currently locked pending verification approval.</p>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-8">
            {/* Section 1: Change Own Password */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Lock size={18} className="text-teal-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Change Your Password</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Update your own login password. You'll need your current password.</p>
                </div>
              </div>

              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}
              {pwSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-semibold">
                  <span className="font-bold">&#10003;</span>
                  <span>{pwSuccess}</span>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setPwError(""); setPwSuccess(""); setPwLoading(true);
                try {
                  const res = await apiFetch("/auth/change-password/", {
                    method: "POST",
                    body: JSON.stringify(pwForm)
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to change password.");
                  setPwSuccess(data.message || "Password changed successfully!");
                  showToast("Password changed successfully!");
                  setPwForm({ current_password: "", new_password: "", confirm_password: "" });
                } catch (err) {
                  setPwError(err.message);
                } finally {
                  setPwLoading(false);
                }
              }} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      required
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                      placeholder="Enter your current password"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">New Password *</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        required
                        minLength={6}
                        value={pwForm.new_password}
                        onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                        placeholder="Min 6 characters"
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={pwForm.confirm_password}
                      onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                      placeholder="Re-type new password"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center space-x-2"
                  >
                    {pwLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>{pwLoading ? "Updating..." : "Update Password"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Admin Reset Any User's Password */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <ShieldCheck size={18} className="text-amber-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Reset User Password (Admin)</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Force-reset any user's password by their username. Use when a staff member forgets their password.</p>
                </div>
              </div>

              {resetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
              {resetSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-semibold">
                  <span className="font-bold">&#10003;</span>
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setResetError(""); setResetSuccess(""); setResetLoading(true);
                try {
                  const res = await apiFetch("/auth/reset-password/", {
                    method: "POST",
                    body: JSON.stringify(resetForm)
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to reset password.");
                  setResetSuccess(data.message || "Password reset successfully!");
                  showToast("User password reset successfully!");
                  setResetForm({ username: "", new_password: "" });
                } catch (err) {
                  setResetError(err.message);
                } finally {
                  setResetLoading(false);
                }
              }} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={resetForm.username}
                      onChange={(e) => setResetForm({ ...resetForm, username: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                      placeholder="e.g. receptionist"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">New Password *</label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={resetForm.new_password}
                      onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-teal-500 focus:outline-none focus:border-teal-500 transition-all font-semibold text-slate-800"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center space-x-2"
                  >
                    {resetLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>{resetLoading ? "Resetting..." : "Reset User Password"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

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
