import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, Plus, CalendarDays, User, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successAppt, setSuccessAppt] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patient: "",
    doctor: "",
    appointment_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "09:30",
    appointment_type: "WALK_IN",
    notes: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, patRes, docRes] = await Promise.all([
        apiFetch("/appointments/"),
        apiFetch("/patients/"),
        apiFetch("/doctors/")
      ]);

      if (apptRes.ok) setAppointments(toArray(await apptRes.json()));
      if (patRes.ok) setPatients(toArray(await patRes.json()));
      if (docRes.ok) setDoctors(toArray(await docRes.json()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessAppt(null);

    const payload = {
      ...formData,
      start_time: formData.start_time + ":00",
      end_time: formData.end_time + ":00"
    };

    try {
      const res = await apiFetch("/appointments/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        const errMsg = errData.non_field_errors 
          ? errData.non_field_errors.join(" ") 
          : Object.entries(errData).map(([k, v]) => `${k}: ${v}`).join(", ");
        throw new Error(errMsg || "Booking conflict detected.");
      }

      const booked = await res.json();
      setSuccessAppt(booked);
      fetchData(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const isReceptionistOrAdmin = user?.role === "RECEPTIONIST" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">OPD Appointments & Token Desk</h2>
        <p className="text-slate-500 text-xs mt-1">Book consultations, view token queue, and check scheduling conflicts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Scheduled Appointments List */}
        <div className="lg:col-span-2 bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-sm flex items-center space-x-2">
              <CalendarDays size={18} className="text-[#1a73e8]" />
              <span>Today's Consultation Queue</span>
            </h3>
            <hr className="border-[#c3c7cb]" />

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-2">Token</th>
                    <th className="py-2.5 px-2">Patient</th>
                    <th className="py-2.5 px-2">Doctor</th>
                    <th className="py-2.5 px-2">Time Slot</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">Loading schedule...</td>
                    </tr>
                  ) : appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">No appointments scheduled.</td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-100/40 text-slate-700">
                        <td className="py-3 px-2 font-bold text-[#1a73e8]">#{appt.token_number}</td>
                        <td className="py-3 px-2 font-semibold">{appt.patient_details?.first_name} {appt.patient_details?.last_name}</td>
                        <td className="py-3 px-2">Dr. {appt.doctor_details?.user_details?.first_name} ({appt.doctor_details?.specialization})</td>
                        <td className="py-3 px-2 font-medium">{appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            appt.appointment_type === "WALK_IN" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {appt.appointment_type}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            appt.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Appointment Booking Form */}
        <div className="bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm">
          {isReceptionistOrAdmin ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-[#1a73e8]">
                <Plus size={20} />
                <h3 className="font-bold text-slate-800 text-sm">Book Appointment</h3>
              </div>
              <hr className="border-[#c3c7cb]" />

              {error && (
                <div className="bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs px-3 py-2.5 rounded-xl flex items-start space-x-2">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span className="leading-relaxed font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Select Patient */}
                <div>
                  <label className="block text-[#444746] font-semibold mb-1">Select Patient *</label>
                  <select
                    required
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                    ))}
                  </select>
                </div>

                {/* Select Doctor */}
                <div>
                  <label className="block text-[#444746] font-semibold mb-1">Select Doctor *</label>
                  <select
                    required
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                    className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.user_details.first_name} {d.user_details.last_name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                {/* Appointment Date */}
                <div>
                  <label className="block text-[#444746] font-semibold mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#444746] font-semibold mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[#444746] font-semibold mb-1">End Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[#444746] font-semibold mb-1">Appointment Type *</label>
                  <select
                    value={formData.appointment_type}
                    onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                    className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                  >
                    <option value="WALK_IN">Walk-in</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[#444746] font-semibold mb-1">Symptoms / Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Brief description of complaints..."
                    rows={2}
                    className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold py-2.5 px-4 rounded-full transition-all text-xs shadow-md shadow-blue-500/10"
                >
                  Generate Token & Book
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 space-y-2 font-medium">
              <ShieldAlert size={36} className="mx-auto text-amber-600" />
              <p className="font-bold text-slate-700 text-sm">Write Access Restricted</p>
              <p className="text-xs leading-relaxed max-w-xs mx-auto">Only Receptionists and Admins are authorized to book appointments.</p>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal (Token Details) */}
      {successAppt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl border border-blue-500/10 text-center space-y-4">
            <div className="text-emerald-500 bg-emerald-50 p-3 rounded-full inline-block">
              <CheckCircle2 size={32} />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-800">Token Generated Successfully</h3>
              <p className="text-xs text-slate-500 mt-1">Appointment is booked in doctor's slot.</p>
            </div>

            <div className="bg-[#f0f4f9] p-4 rounded-2xl border border-[#c3c7cb] space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">OPD Consultation Token</span>
                <p className="text-3xl font-extrabold text-[#1a73e8] tracking-wide mt-1">#{successAppt.token_number}</p>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5 border-t pt-3 border-slate-300">
                <p><span className="font-semibold text-slate-500">Patient:</span> {successAppt.patient_details?.first_name} {successAppt.patient_details?.last_name}</p>
                <p><span className="font-semibold text-slate-500">Doctor:</span> Dr. {successAppt.doctor_details?.user_details?.first_name}</p>
                <p><span className="font-semibold text-slate-500">Timing:</span> {successAppt.start_time.slice(0,5)} - {successAppt.end_time.slice(0,5)}</p>
                <p><span className="font-semibold text-slate-500">Date:</span> {successAppt.appointment_date}</p>
              </div>
            </div>

            <button
              onClick={() => setSuccessAppt(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-full text-xs transition-all"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
