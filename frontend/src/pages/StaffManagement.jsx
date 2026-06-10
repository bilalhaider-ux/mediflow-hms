import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Edit2, Trash2, X, UserCheck, Users, Layers, AlertCircle, RefreshCw } from "lucide-react";

export const StaffManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("users"); // "users" | "profiles" | "departments"
  const [branches, setBranches] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Add/Edit User Form State
  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirm_password: "",
    role: "RECEPTIONIST",
    branch: "",
    phone_number: "",
    email: ""
  });
  
  // Track if username has been manually modified by the user
  const [isUsernameCustomized, setIsUsernameCustomized] = useState(false);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  const fetchBranches = async () => {
    try {
      const res = await apiFetch("/branches/");
      if (res.ok) {
        setBranches(toArray(await res.json()));
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/auth/users/");
      if (res.ok) {
        setUsersList(toArray(await res.json()));
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  // Username auto-suggest effect
  useEffect(() => {
    if (!editingUser && !isUsernameCustomized) {
      const cleanFirst = userForm.first_name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLast = userForm.last_name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanFirst || cleanLast) {
        setUserForm(prev => ({
          ...prev,
          username: cleanFirst && cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst || cleanLast
        }));
      } else {
        setUserForm(prev => ({ ...prev, username: "" }));
      }
    }
  }, [userForm.first_name, userForm.last_name, isUsernameCustomized, editingUser]);

  // Open add modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setModalError("");
    setIsUsernameCustomized(false);
    setUserForm({
      first_name: "",
      last_name: "",
      username: "",
      password: "",
      confirm_password: "",
      role: "RECEPTIONIST",
      branch: branches.length > 0 ? branches[0].id.toString() : "",
      phone_number: "",
      email: ""
    });
    setShowUserModal(true);
  };

  // Open edit modal
  const handleOpenEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setModalError("");
    setUserForm({
      first_name: targetUser.first_name || "",
      last_name: targetUser.last_name || "",
      username: targetUser.username,
      password: "",
      confirm_password: "",
      role: targetUser.role,
      branch: targetUser.branch ? targetUser.branch.toString() : "",
      phone_number: targetUser.phone_number || "",
      email: targetUser.email || ""
    });
    setShowUserModal(true);
  };

  // Handle submit (Create or Update)
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    // Validation
    if (!editingUser) {
      if (!userForm.password) {
        setModalError("Password is required for new accounts.");
        return;
      }
      if (userForm.password !== userForm.confirm_password) {
        setModalError("Passwords do not match.");
        return;
      }
    } else {
      if (userForm.password && userForm.password !== userForm.confirm_password) {
        setModalError("Passwords do not match.");
        return;
      }
    }

    setModalLoading(true);

    try {
      const payload = {
        username: userForm.username.trim(),
        first_name: userForm.first_name.trim(),
        last_name: userForm.last_name.trim(),
        role: userForm.role,
        branch: userForm.branch ? parseInt(userForm.branch, 10) : null,
        phone_number: userForm.phone_number.trim(),
        email: userForm.email.trim()
      };

      if (userForm.password) {
        payload.password = userForm.password;
      }

      let res;
      if (editingUser) {
        res = await apiFetch(`/auth/users/${editingUser.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch("/auth/users/", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingUser ? "User updated successfully!" : "User account created successfully!");
        setShowUserModal(false);
        fetchUsers();
      } else {
        const errData = await res.json();
        let errMsg = "Failed to save user account.";
        if (errData.username) {
          errMsg = `Username error: ${errData.username.join(", ")}`;
        } else if (errData.detail) {
          errMsg = errData.detail;
        } else if (errData.non_field_errors) {
          errMsg = errData.non_field_errors.join(", ");
        }
        setModalError(errMsg);
      }
    } catch (err) {
      setModalError("Connection error. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  // Toggle user activation status
  const handleToggleActive = async (targetUser) => {
    const action = targetUser.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${targetUser.first_name || targetUser.username}'s user account?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/auth/users/${targetUser.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !targetUser.is_active })
      });

      if (res.ok) {
        showToast(`User account ${targetUser.is_active ? "deactivated" : "activated"} successfully.`);
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.detail || `Failed to ${action} user account.`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during account status update.");
    }
  };

  // Badge styles mapping
  const getBadgeClass = (role) => {
    switch (role) {
      case "DOCTOR":
        return "bg-teal-50 text-teal-800 border-teal-200 border";
      case "RECEPTIONIST":
        return "bg-blue-50 text-blue-800 border-blue-200 border";
      case "PHARMACIST":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 border";
      case "LAB_TECH":
        return "bg-orange-50 text-orange-800 border-orange-200 border";
      case "ADMIN":
        return "bg-rose-50 text-rose-800 border-rose-200 border";
      case "SUB_ADMIN":
        return "bg-purple-50 text-purple-800 border-purple-200 border";
      default:
        return "bg-slate-50 text-slate-800 border-slate-200 border";
    }
  };

  // Sub-admin branch name display helper
  const getSubAdminBranchName = () => {
    if (user?.role === "SUB_ADMIN" && user.branch_id) {
      const branchObj = branches.find(b => b.id === user.branch_id);
      return branchObj ? ` - ${branchObj.name} Branch` : "";
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Staff Management{getSubAdminBranchName()}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Manage administrative user accounts, staff details profiles, and clinic departments.
          </p>
        </div>
        
        {activeTab === "users" && (
          <button
            onClick={handleOpenAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Tab Selectors */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "users"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserCheck size={16} />
          <span>User Accounts</span>
        </button>
        <button
          onClick={() => setActiveTab("profiles")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "profiles"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users size={16} />
          <span>Staff Profiles</span>
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "departments"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers size={16} />
          <span>Departments</span>
        </button>
      </div>

      {/* Tab Views */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {activeTab === "users" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm">System User Accounts</h3>
              <button 
                onClick={fetchUsers} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                title="Refresh List"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {loading && usersList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                Loading accounts list...
              </div>
            ) : usersList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No user credentials found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role Badge</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {usersList.map((account) => (
                      <tr key={account.id} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {account.first_name || account.last_name
                            ? `${account.first_name} ${account.last_name}`
                            : "—"}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500">
                          {account.username}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getBadgeClass(account.role)}`}>
                            {account.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {account.branch_details?.name || "Global / Head Office"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            account.is_active 
                              ? "bg-emerald-50 text-emerald-700" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {account.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex space-x-1.5">
                            <button
                              onClick={() => handleOpenEditModal(account)}
                              className="text-slate-400 hover:text-teal-600 p-1 rounded hover:bg-slate-100 transition-all"
                              title="Edit User"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(account)}
                              className={`p-1 rounded hover:bg-slate-100 transition-all ${
                                account.is_active 
                                  ? "text-slate-400 hover:text-red-500" 
                                  : "text-slate-400 hover:text-emerald-600"
                              }`}
                              title={account.is_active ? "Deactivate Account" : "Activate Account"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "profiles" && (
          <div className="p-6 py-16 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-700 text-sm">Staff Profiles Tab</h4>
            <p className="text-slate-400 text-xs mt-1">This module is currently pending verification approval.</p>
          </div>
        )}

        {activeTab === "departments" && (
          <div className="p-6 py-16 text-center">
            <Layers size={40} className="mx-auto text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-700 text-sm">Departments Directory</h4>
            <p className="text-slate-400 text-xs mt-1">This module is currently pending verification approval.</p>
          </div>
        )}

      </div>

      {/* User Credentials Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingUser ? "Edit User Credentials" : "Create New User Account"}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleUserSubmit} className="p-5 overflow-y-auto max-h-[75vh] space-y-4 text-xs">
              {modalError && (
                <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl border border-rose-100 flex items-center space-x-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{modalError}</span>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name*</label>
                  <input
                    type="text"
                    required
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name*</label>
                  <input
                    type="text"
                    required
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              {/* Username (with auto-suggest status check) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username*</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => {
                    setIsUsernameCustomized(true);
                    setUserForm({ ...userForm, username: e.target.value });
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800 font-mono font-semibold"
                  placeholder="e.g. username"
                />
                {!editingUser && !isUsernameCustomized && (
                  <p className="text-[10px] text-teal-600 mt-1">Suggested automatically. Edit to customize.</p>
                )}
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingUser ? "New Password" : "Password*"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800"
                    placeholder={editingUser ? "Leave blank to keep current" : "Choose password"}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Confirm Password*
                  </label>
                  <input
                    type="password"
                    required={!!userForm.password}
                    value={userForm.confirm_password}
                    onChange={(e) => setUserForm({ ...userForm, confirm_password: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800"
                    placeholder="Confirm password"
                  />
                </div>
              </div>

              {/* Role & Branch */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Role*</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800 bg-white font-semibold"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECH">Lab Technician</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Branch*</label>
                  <select
                    value={userForm.branch}
                    onChange={(e) => setUserForm({ ...userForm, branch: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800 bg-white font-semibold"
                    required
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone_number}
                    onChange={(e) => setUserForm({ ...userForm, phone_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800"
                    placeholder="e.g. +923001234567"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition-all text-slate-800"
                    placeholder="e.g. name@mediflow.com"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center justify-center space-x-2"
                >
                  {modalLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{modalLoading ? "Saving Credentials..." : "Save User Account"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
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
