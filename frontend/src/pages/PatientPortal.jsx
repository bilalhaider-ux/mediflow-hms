import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { Link } from "react-router-dom";
import { 
  Heart, 
  FileText, 
  Calendar, 
  Download, 
  User, 
  LogOut, 
  CheckCircle2, 
  ShieldAlert, 
  Plus, 
  Clock,
  Activity,
  QrCode,
  Video
} from "lucide-react";

export const PatientPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mrn, setMrn] = useState("");
  const [cnic, setCnic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Portal data states
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Appointment Request Form state
  const [reqDoctor, setReqDoctor] = useState("");
  const [reqDate, setReqDate] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [requesting, setRequesting] = useState(false);

  // Load patient session on mount if token exists and role is PATIENT
  useEffect(() => {
    const role = localStorage.getItem("user_role");
    const token = localStorage.getItem("access_token");
    if (token && role === "PATIENT") {
      setIsLoggedIn(true);
      fetchDashboard();
    }
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/patients/portal-dashboard/");
      if (res.ok) {
        const data = await res.json();
        setPatientData(data.patient);
        setAppointments(data.appointments);
        setPrescriptions(data.prescriptions);
        setLabOrders(data.lab_orders);

        // Fetch doctors list for the booking form
        const docRes = await apiFetch("/doctors/");
        if (docRes.ok) {
          setDoctors(toArray(await docRes.json()));
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/patients/portal-login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrn, cnic })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Login credentials failed.");
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user_role", data.user.role);
      localStorage.setItem("user_name", data.user.username);
      localStorage.setItem("user_fullname", data.user.full_name);

      setIsLoggedIn(true);
      fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutofillDemo = async () => {
    setLoading(true);
    setError("");
    try {
      // Find any patient in the database to fetch their MRN and CNIC
      // We can make a public request or pre-configure a known patient MRN/CNIC
      // Since HMS-2026-00001 is seeded or usually created, let's use a dynamic fetch from backend
      // if staff token is available, or use a reliable seeded placeholder
      setMrn("HMS-2026-00001");
      setCnic("35201-1111111-1");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRequesting(true);

    try {
      const res = await apiFetch("/patients/portal-request-appointment/", {
        method: "POST",
        body: JSON.stringify({
          doctor: reqDoctor,
          appointment_date: reqDate,
          notes: reqNotes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit booking request.");
      }

      setSuccess("Appointment request submitted successfully. Staff will confirm soon.");
      setReqDoctor("");
      setReqDate("");
      setReqNotes("");
      fetchDashboard(); // Refresh appointment history list
    } catch (err) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_fullname");
    setIsLoggedIn(false);
    setPatientData(null);
    setAppointments([]);
    setPrescriptions([]);
    setLabOrders([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#f0f4f9] font-sans">
        <div className="w-full max-w-[450px] bg-[#f4f8fd] rounded-[28px] p-8 border border-[#c3c7cb] shadow-md space-y-6">
          <div className="text-center">
            <div className="bg-white border border-[#b4cbf0] p-3 rounded-full text-[#1a73e8] inline-block shadow-sm mb-3">
              <Heart size={32} />
            </div>
            <h2 className="text-xl font-bold text-[#202124]">HMS Patient Self-Service Portal</h2>
            <p className="text-[#3c4043] text-xs mt-1">Access your charts, download lab reports, and book appointments.</p>
          </div>

          {error && (
            <div className="bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs font-bold px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Medical Record Number (MRN) *</label>
              <input
                type="text"
                required
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="e.g. HMS-2026-00001"
                className="block w-full px-3 py-2.5 bg-white border border-[#747775] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#1a73e8]"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">CNIC (Pakistan Format) *</label>
              <input
                type="text"
                required
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="XXXXX-XXXXXXX-X"
                className="block w-full px-3 py-2.5 bg-white border border-[#747775] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#1a73e8] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-xs mt-2"
            >
              {loading ? "Verifying..." : "Access Patient Portal"}
            </button>
          </form>

          <hr className="border-slate-200" />
          
          <div className="text-center">
            <button
              onClick={handleAutofillDemo}
              className="text-xs font-semibold text-[#1a73e8] hover:underline"
            >
              Click to Autofill Seeded Patient (HMS-2026-00001)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Welcome, {patientData?.first_name} {patientData?.last_name}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">MRN: <span className="font-bold text-blue-600">{patientData?.mrn}</span> | Phone: {patientData?.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-250 hover:border-red-200 p-2.5 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Demographics Card & Appointment Request Form */}
        <div className="space-y-6">
          {/* Patient Card */}
          <div className="bg-[#f4f8fd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Health Card</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Active Profile</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 border border-slate-200 rounded-xl">
                <QrCode size={64} className="text-blue-600" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-extrabold text-slate-800 text-sm">{patientData?.first_name} {patientData?.last_name}</p>
                <p className="text-slate-500 font-mono">CNIC: {patientData?.cnic}</p>
                <p className="text-slate-500">Address: {patientData?.address}</p>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3 text-[10px] text-slate-500 grid grid-cols-2 gap-2 leading-relaxed">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wide">Emergency Contact</p>
                <p className="font-semibold text-slate-700">{patientData?.emergency_contact_name}</p>
                <p className="font-mono">{patientData?.emergency_contact_phone}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wide">Date of Birth</p>
                <p className="font-semibold text-slate-700">{patientData?.date_of_birth}</p>
                <p className="font-semibold text-slate-700">Gender: {patientData?.gender === "M" ? "Male" : "Female"}</p>
              </div>
            </div>
          </div>

          {/* Appointment Booking Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="text-blue-600" size={18} /> Request Appointment Online
            </h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-lg">
                {success}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Select Consulting Specialist *</label>
                <select
                  required
                  value={reqDoctor}
                  onChange={(e) => setReqDoctor(e.target.value)}
                  className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.user_details?.first_name} {doc.user_details?.last_name} ({doc.specialization}) - Rs. {doc.consultation_fee}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Preferred Checkup Date *</label>
                <input
                  type="date"
                  required
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Notes / Symptoms Description</label>
                <textarea
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Describe details for checkup..."
                  rows={2}
                  className="block w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={requesting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
              >
                {requesting ? "Submitting..." : <><Plus size={14} /> Submit Booking Request</>}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side (2 Columns): Records (Prescriptions, Lab Reports, Appointments) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Prescriptions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <FileText className="text-blue-600" size={18} /> Active Prescriptions History
            </h3>
            
            <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
              {prescriptions.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">No prescriptions recorded on file yet.</p>
              ) : (
                prescriptions.map((pres) => (
                  <div key={pres.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/30 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 pb-1.5">
                      <span className="font-mono">Date: {new Date(pres.date_prescribed).toLocaleDateString()}</span>
                      <span className="font-bold text-slate-700">Prescribed By: Dr. {pres.doctor_details?.first_name} {pres.doctor_details?.last_name}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800">Diagnosis:</p>
                      <p className="text-slate-600 italic">{pres.diagnosis || "No specific diagnosis logged."}</p>
                    </div>
                    
                    {pres.items && pres.items.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="font-bold text-slate-800">Medications:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {pres.items.map((item, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
                              <span className="font-bold text-slate-700">{item.medicine_details?.name}</span>
                              <span className="text-[10px] text-slate-500 font-semibold mt-1">Dosage: {item.dosage}</span>
                              <span className="text-[9px] text-slate-400 italic">Duration: {item.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Diagnostic Lab Reports */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity className="text-blue-600" size={18} /> Diagnostics Lab Reports
            </h3>
            
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="py-2 px-2">Test Name</th>
                    <th className="py-2 px-2">Order Date</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Report Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                  {labOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400">No diagnostic orders listed.</td>
                    </tr>
                  ) : (
                    labOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-2 font-bold text-slate-800">{order.test_details?.name}</td>
                        <td className="py-2.5 px-2 text-slate-500 font-mono">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            order.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {order.status === "COMPLETED" && order.results_file ? (
                            <a
                              href={`http://localhost:8000${order.results_file}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                              <Download size={12} /> Download PDF
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Processing Results...</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Appointment History */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="text-blue-600" size={18} /> Appointment Checkup History
            </h3>
            
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="py-2 px-2">Doctor</th>
                    <th className="py-2 px-2">Scheduled Date</th>
                    <th className="py-2 px-2">Checkin Token</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">No scheduled appointments.</td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-2 font-bold text-slate-800">
                          Dr. {appt.doctor_details?.first_name} {appt.doctor_details?.last_name}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 font-mono">{appt.appointment_date}</td>
                        <td className="py-2.5 px-2 font-bold text-blue-700">Token #{appt.token_number}</td>
                        <td className="py-2.5 px-2">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">{appt.appointment_type}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            appt.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                            appt.status === "ACTIVE" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {appt.status !== "COMPLETED" && (
                            <Link
                              to={`/telemedicine?appointment_id=${appt.id}`}
                              className="inline-flex items-center gap-1 bg-teal-650 hover:bg-teal-700 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all shadow-sm shadow-teal-650/10"
                            >
                              <Video size={10} /> Join Call
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
