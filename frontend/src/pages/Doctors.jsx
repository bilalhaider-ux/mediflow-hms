import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { CalendarDays, Plus, Trash2, Clock, MapPin, Stethoscope, Edit2, X, AlertCircle, UserPlus, Eye, EyeOff, Shield } from "lucide-react";

const DOCTOR_TYPES = [
  { value: "GENERAL", label: "General Physician" },
  { value: "CARDIOLOGIST", label: "Cardiologist" },
  { value: "NEUROLOGIST", label: "Neurologist" },
  { value: "ORTHOPEDIC", label: "Orthopedic Surgeon" },
  { value: "PEDIATRICIAN", label: "Pediatrician" },
  { value: "GYNECOLOGIST", label: "Gynecologist" },
  { value: "DERMATOLOGIST", label: "Dermatologist" },
  { value: "ENT", label: "ENT Specialist" },
  { value: "OPHTHALMOLOGIST", label: "Ophthalmologist" },
  { value: "UROLOGIST", label: "Urologist" },
  { value: "PSYCHIATRIST", label: "Psychiatrist" },
  { value: "PULMONOLOGIST", label: "Pulmonologist" },
  { value: "GASTROENTEROLOGIST", label: "Gastroenterologist" },
  { value: "NEPHROLOGIST", label: "Nephrologist" },
  { value: "ONCOLOGIST", label: "Oncologist" },
  { value: "ENDOCRINOLOGIST", label: "Endocrinologist" },
  { value: "RHEUMATOLOGIST", label: "Rheumatologist" },
  { value: "SURGEON", label: "General Surgeon" },
  { value: "ANESTHETIST", label: "Anesthetist" },
  { value: "RADIOLOGIST", label: "Radiologist" },
  { value: "PATHOLOGIST", label: "Pathologist" },
  { value: "DENTIST", label: "Dentist" },
  { value: "PHYSIOTHERAPIST", label: "Physiotherapist" },
  { value: "OTHER", label: "Other" },
];

export const Doctors = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  
  // Toast Notification state
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // Create schedule form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    day_of_week: 0,
    start_time: "09:00",
    end_time: "14:00",
    max_patients: 30
  });
  const [formError, setFormError] = useState("");

  // Doctor Profile CRUD Modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [docFormData, setDocFormData] = useState({
    // Account fields (only for new registration)
    username: "",
    password: "",
    email: "",
    // Profile fields
    first_name: "",
    last_name: "",
    phone_number: "",
    doctor_type: "GENERAL",
    specialization: "",
    department: "",
    license_number: "",
    consultation_fee: "",
    room_number: "",
  });
  const [docFormError, setDocFormError] = useState("");
  const [docFormSuccess, setDocFormSuccess] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    try {
      const deptsRes = await apiFetch("/departments/");
      if (deptsRes.ok) {
        const data = toArray(await deptsRes.json());
        setDepartments(data);
        if (data.length > 0) setSelectedDept(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch doctors whenever selected department changes
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedDept) return;
      try {
        const res = await apiFetch(`/doctors/?department=${selectedDept}`);
        if (res.ok) {
          const data = toArray(await res.json());
          setDoctors(data);
          setSelectedDoctor(data.length > 0 ? data[0] : null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDoctors();
  }, [selectedDept]);

  // Fetch schedules when selected doctor changes
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedDoctor) {
        setSchedules([]);
        return;
      }
      try {
        const res = await apiFetch(`/doctor-schedules/?doctor=${selectedDoctor.id}`);
        if (res.ok) {
          const data = toArray(await res.json());
          setSchedules(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchedules();
  }, [selectedDoctor]);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedDoctor) return;

    try {
      const payload = {
        doctor: selectedDoctor.id,
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time + ":00",
        end_time: formData.end_time + ":00",
        max_patients: parseInt(formData.max_patients)
      };

      const res = await apiFetch("/doctor-schedules/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.non_field_errors || "This shift slot already exists or has invalid timings.");
      }

      const schedRes = await apiFetch(`/doctor-schedules/?doctor=${selectedDoctor.id}`);
      if (schedRes.ok) {
        setSchedules(toArray(await schedRes.json()));
      }
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteSchedule = async (schedId) => {
    if (!window.confirm("Delete this shift schedule?")) return;
    try {
      const res = await apiFetch(`/doctor-schedules/${schedId}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSchedules(schedules.filter(s => s.id !== schedId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Doctor CRUD handlers
  const handleOpenAddModal = () => {
    setEditingDoctor(null);
    setDocFormData({
      username: "",
      password: "",
      email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      doctor_type: "GENERAL",
      specialization: "",
      department: selectedDept || (departments.length > 0 ? departments[0].id.toString() : ""),
      license_number: "",
      consultation_fee: "",
      room_number: "",
    });
    setDocFormError("");
    setDocFormSuccess("");
    setShowPassword(false);
    setShowDocModal(true);
  };

  const handleOpenEditModal = (doc) => {
    setEditingDoctor(doc);
    setDocFormData({
      username: doc.user_details?.username || "",
      password: "",
      email: doc.user_details?.email || "",
      first_name: doc.user_details?.first_name || "",
      last_name: doc.user_details?.last_name || "",
      phone_number: doc.user_details?.phone_number || "",
      doctor_type: doc.doctor_type || "GENERAL",
      specialization: doc.specialization,
      department: doc.department.toString(),
      license_number: doc.license_number,
      consultation_fee: parseInt(doc.consultation_fee).toString(),
      room_number: doc.room_number,
    });
    setDocFormError("");
    setDocFormSuccess("");
    setShowDocModal(true);
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    setDocFormError("");
    setDocFormSuccess("");
    setModalLoading(true);

    try {
      if (editingDoctor) {
        // EDIT MODE: Update existing user details + doctor profile
        const userPayload = {
          first_name: docFormData.first_name,
          last_name: docFormData.last_name,
          phone_number: docFormData.phone_number,
        };

        const userRes = await apiFetch(`/auth/users/${editingDoctor.user}/`, {
          method: "PATCH",
          body: JSON.stringify(userPayload)
        });

        if (!userRes.ok) {
          const errData = await userRes.json();
          throw new Error(errData.detail || "Failed to update user account details.");
        }

        const doctorPayload = {
          user: editingDoctor.user,
          department: parseInt(docFormData.department),
          doctor_type: docFormData.doctor_type,
          specialization: docFormData.specialization,
          license_number: docFormData.license_number,
          consultation_fee: parseFloat(docFormData.consultation_fee),
          room_number: docFormData.room_number,
        };

        const res = await apiFetch(`/doctors/${editingDoctor.id}/`, {
          method: "PUT",
          body: JSON.stringify(doctorPayload)
        });

        if (!res.ok) {
          const errData = await res.json();
          let errorMsg = "Failed to save doctor profile.";
          if (errData.license_number) errorMsg = `License error: ${errData.license_number}`;
          else if (errData.user) errorMsg = `User account error: ${errData.user}`;
          else if (errData.non_field_errors) errorMsg = errData.non_field_errors.join(", ");
          throw new Error(errorMsg);
        }

        setDocFormSuccess("Doctor profile updated successfully!");
        showToast("Doctor profile updated successfully!");

      } else {
        // CREATE MODE: Independent registration via register-doctor endpoint
        if (!docFormData.username.trim()) {
          throw new Error("Username is required for new doctor registration.");
        }
        if (!docFormData.password || docFormData.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        const payload = {
          username: docFormData.username.trim(),
          password: docFormData.password,
          email: docFormData.email.trim(),
          first_name: docFormData.first_name.trim(),
          last_name: docFormData.last_name.trim(),
          phone_number: docFormData.phone_number.trim(),
          doctor_type: docFormData.doctor_type,
          specialization: docFormData.specialization.trim(),
          department: parseInt(docFormData.department),
          license_number: docFormData.license_number.trim(),
          consultation_fee: parseFloat(docFormData.consultation_fee),
          room_number: docFormData.room_number.trim(),
        };

        const res = await apiFetch("/doctors/register-doctor/", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || errData.detail || "Failed to register doctor.");
        }

        setDocFormSuccess("Doctor registered successfully! Login credentials created.");
        showToast("New doctor registered successfully!");
      }

      // Refresh doctor list
      if (selectedDept) {
        const docRes = await apiFetch(`/doctors/?department=${selectedDept}`);
        if (docRes.ok) {
          const data = toArray(await docRes.json());
          setDoctors(data);
          if (editingDoctor) {
            const updatedDoc = data.find(d => d.id === editingDoctor.id);
            setSelectedDoctor(updatedDoc || (data.length > 0 ? data[0] : null));
          } else {
            setSelectedDoctor(data.length > 0 ? data[data.length - 1] : null);
          }
        }
      }

      setTimeout(() => {
        setShowDocModal(false);
      }, 1500);

    } catch (err) {
      setDocFormError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteDoctor = async (doc) => {
    const fullName = `Dr. ${doc.user_details.first_name} ${doc.user_details.last_name}`;
    if (!window.confirm(`Are you sure you want to deactivate ${fullName} profile?`)) return;

    try {
      const res = await apiFetch(`/doctors/${doc.id}/`, {
        method: "DELETE"
      });

      if (res.ok) {
        const updatedList = doctors.filter(d => d.id !== doc.id);
        setDoctors(updatedList);
        if (selectedDoctor?.id === doc.id) {
          setSelectedDoctor(updatedList.length > 0 ? updatedList[0] : null);
        }
        showToast(`${fullName} profile deactivated successfully.`);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to deactivate doctor profile.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deactivating the doctor profile.");
    }
  };

  const activeDepartment = departments.find(d => d.id === selectedDept);
  
  const canManageSchedule = (doc) => {
    if (user?.role === "ADMIN") return true;
    if (user?.role === "DOCTOR" && doc?.user_details?.username === user?.username) return true;
    return false;
  };

  const getTypeColor = (type) => {
    const colors = {
      CARDIOLOGIST: "bg-red-50 text-red-700 border-red-200",
      NEUROLOGIST: "bg-purple-50 text-purple-700 border-purple-200",
      ORTHOPEDIC: "bg-amber-50 text-amber-700 border-amber-200",
      PEDIATRICIAN: "bg-pink-50 text-pink-700 border-pink-200",
      GYNECOLOGIST: "bg-rose-50 text-rose-700 border-rose-200",
      DERMATOLOGIST: "bg-orange-50 text-orange-700 border-orange-200",
      ENT: "bg-cyan-50 text-cyan-700 border-cyan-200",
      OPHTHALMOLOGIST: "bg-blue-50 text-blue-700 border-blue-200",
      SURGEON: "bg-indigo-50 text-indigo-700 border-indigo-200",
      PSYCHIATRIST: "bg-violet-50 text-violet-700 border-violet-200",
      DENTIST: "bg-lime-50 text-lime-700 border-lime-200",
    };
    return colors[type] || "bg-teal-50 text-teal-700 border-teal-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Doctors Registry & Shift Schedules</h2>
          <p className="text-slate-500 text-xs mt-1">Review specialists directories, consulting chambers, and active weekly timetables.</p>
        </div>
        {user?.role === "ADMIN" && (
          <button
            onClick={handleOpenAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <UserPlus size={16} />
            <span>Register New Doctor</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Department List */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Departments</h3>
          <div className="space-y-1">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedDept === dept.id
                    ? "bg-teal-50 text-teal-800 border-l-4 border-teal-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Columns: Doctors List */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{activeDepartment?.name || "Consultants"}</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">{activeDepartment?.description}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Stethoscope size={20} className="text-teal-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center col-span-2">No doctors registered in this department.</p>
            ) : (
              doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedDoctor?.id === doc.id
                      ? "border-teal-500 bg-teal-50/20 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">
                        Dr. {doc.user_details?.first_name} {doc.user_details?.last_name}
                      </h4>
                      <p className="text-teal-600 text-[10px] font-semibold mt-0.5">{doc.specialization}</p>
                    </div>
                    {user?.role === "ADMIN" && (
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(doc);
                          }}
                          className="text-slate-400 hover:text-teal-600 p-1 rounded hover:bg-slate-100 transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDoctor(doc);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Doctor Type Badge */}
                  {doc.doctor_type && (
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${getTypeColor(doc.doctor_type)}`}>
                        {doc.doctor_type_display || doc.doctor_type}
                      </span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-slate-500 font-medium border-t border-slate-100 pt-2.5">
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} className="text-slate-400" />
                      <span>Room {doc.room_number}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-700">Rs. {parseInt(doc.consultation_fee)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Timetable Shift Schedule */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Timetable Grid</h3>
              {selectedDoctor && canManageSchedule(selectedDoctor) && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-teal-50 text-teal-700 hover:bg-teal-100 p-1.5 rounded-lg transition-all"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Add Schedule Form overlay */}
            {showAddForm ? (
              <form onSubmit={handleAddSchedule} className="mt-4 space-y-3 text-xs border bg-slate-50 p-3 rounded-xl">
                <span className="font-bold text-slate-700 text-[10px] uppercase block tracking-wider">Add Shift Timing</span>
                {formError && <p className="text-red-600 text-[10px] bg-red-50 p-1.5 rounded border border-red-100">{formError}</p>}
                
                <div>
                  <label className="block text-slate-500 mb-1">Select Day</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="block w-full border rounded p-1.5 bg-white"
                  >
                    <option value={0}>Monday</option>
                    <option value={1}>Tuesday</option>
                    <option value={2}>Wednesday</option>
                    <option value={3}>Thursday</option>
                    <option value={4}>Friday</option>
                    <option value={5}>Saturday</option>
                    <option value={6}>Sunday</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="block w-full border rounded p-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="block w-full border rounded p-1.5 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Max Patients Check-in Limit</label>
                  <input
                    type="number"
                    value={formData.max_patients}
                    onChange={(e) => setFormData({ ...formData, max_patients: e.target.value })}
                    className="block w-full border rounded p-1.5 bg-white"
                  />
                </div>

                <div className="flex space-x-2 pt-1">
                  <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-1.5 rounded-lg font-bold">
                    Save Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {/* Timetable schedule lists */}
            <div className="space-y-2 mt-4">
              {!selectedDoctor ? (
                <p className="text-xs text-slate-400 py-6 text-center">Select a consultant doctor to inspect schedule.</p>
              ) : schedules.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No shifts scheduled for this doctor yet.</p>
              ) : (
                schedules.map((sched) => (
                  <div key={sched.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-start space-x-2">
                      <Clock size={14} className="text-teal-600 mt-0.5" />
                      <div className="text-[10px]">
                        <p className="font-bold text-slate-700">{sched.day_name}</p>
                        <p className="text-slate-500 font-medium">{sched.start_time.slice(0,5)} - {sched.end_time.slice(0,5)}</p>
                        <p className="text-slate-400 mt-0.5">Capacity: {sched.max_patients} patients</p>
                      </div>
                    </div>

                    {canManageSchedule(selectedDoctor) && (
                      <button
                        onClick={() => handleDeleteSchedule(sched.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100/50 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Doctor Add/Edit Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                {editingDoctor ? <Edit2 size={16} className="text-teal-600" /> : <UserPlus size={16} className="text-teal-600" />}
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingDoctor ? "Edit Doctor Profile" : "Register New Doctor"}
                </h3>
              </div>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleDocSubmit} className="p-5 overflow-y-auto max-h-[75vh] space-y-4 text-xs">
              {docFormError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100 flex items-center space-x-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{docFormError}</span>
                </div>
              )}
              {docFormSuccess && (
                <div className="bg-green-50 text-green-700 p-2.5 rounded-xl border border-green-100 flex items-center space-x-2">
                  <span className="font-bold text-xs">&#10003;</span>
                  <span className="font-medium">{docFormSuccess}</span>
                </div>
              )}

              {/* LOGIN CREDENTIALS SECTION (only for NEW registration) */}
              {!editingDoctor && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Shield size={14} className="text-teal-600" />
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Login Credentials</span>
                  </div>
                  <p className="text-[10px] text-slate-400 -mt-1">A new user account will be created automatically for this doctor.</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Username*</label>
                      <input
                        type="text"
                        required
                        value={docFormData.username}
                        onChange={(e) => setDocFormData({ ...docFormData, username: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                        placeholder="e.g. dr_ahmad"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Password*</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={docFormData.password}
                          onChange={(e) => setDocFormData({ ...docFormData, password: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-2.5 pr-9 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={docFormData.email}
                      onChange={(e) => setDocFormData({ ...docFormData, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                      placeholder="e.g. dr.ahmad@hospital.pk (optional)"
                    />
                  </div>
                </div>
              )}

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name*</label>
                  <input
                    type="text"
                    required
                    value={docFormData.first_name}
                    onChange={(e) => setDocFormData({ ...docFormData, first_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. Ahmad"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name*</label>
                  <input
                    type="text"
                    required
                    value={docFormData.last_name}
                    onChange={(e) => setDocFormData({ ...docFormData, last_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. Khan"
                  />
                </div>
              </div>

              {/* Doctor Type & Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doctor Type*</label>
                  <select
                    required
                    value={docFormData.doctor_type}
                    onChange={(e) => setDocFormData({ ...docFormData, doctor_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                  >
                    {DOCTOR_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department*</label>
                  <select
                    required
                    value={docFormData.department}
                    onChange={(e) => setDocFormData({ ...docFormData, department: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specialization & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specialization*</label>
                  <input
                    type="text"
                    required
                    value={docFormData.specialization}
                    onChange={(e) => setDocFormData({ ...docFormData, specialization: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. Interventional Cardiology"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={docFormData.phone_number}
                    onChange={(e) => setDocFormData({ ...docFormData, phone_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. +923001234567"
                  />
                </div>
              </div>

              {/* PMDC / License & Consultation Fee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PMDC Number*</label>
                  <input
                    type="text"
                    required
                    value={docFormData.license_number}
                    onChange={(e) => setDocFormData({ ...docFormData, license_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. PMC-12345-D"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Fee (PKR)*</label>
                  <input
                    type="number"
                    required
                    value={docFormData.consultation_fee}
                    onChange={(e) => setDocFormData({ ...docFormData, consultation_fee: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>

              {/* Room Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room Number*</label>
                  <input
                    type="text"
                    required
                    value={docFormData.room_number}
                    onChange={(e) => setDocFormData({ ...docFormData, room_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold text-slate-800"
                    placeholder="e.g. OPD-10"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center justify-center space-x-2"
                >
                  {modalLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{modalLoading ? "Saving..." : (editingDoctor ? "Update Profile" : "Register Doctor")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 p-2.5 rounded-xl transition-all"
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
          <span className="font-bold">&#10003;</span>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
