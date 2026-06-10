import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { Calendar, Clock, Plus, ShieldAlert, CheckCircle2, User } from "lucide-react";

export const OTScheduler = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [surgeryName, setSurgeryName] = useState("");
  const [anesthesiologist, setAnesthesiologist] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, bookingsRes, patientsRes, doctorsRes] = await Promise.all([
        apiFetch("/ot-rooms/"),
        apiFetch("/ot-bookings/"),
        apiFetch("/patients/"),
        apiFetch("/doctors/")
      ]);

      if (roomsRes.ok) setRooms(toArray(await roomsRes.json()));
      if (bookingsRes.ok) setBookings(toArray(await bookingsRes.json()));
      if (patientsRes.ok) setPatients(toArray(await patientsRes.json()));
      if (doctorsRes.ok) setDoctors(toArray(await doctorsRes.json()));
    } catch (err) {
      console.error("Error fetching OT data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/ot-bookings/", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          surgeon: doctorId,
          room: roomId,
          surgery_name: surgeryName,
          anesthesiologist,
          start_time: startTime,
          end_time: endTime,
          status: "SCHEDULED"
        })
      });

      if (res.ok) {
        setSuccessMsg("Operation Theater booking scheduled successfully!");
        setShowForm(false);
        setPatientId("");
        setDoctorId("");
        setRoomId("");
        setSurgeryName("");
        setAnesthesiologist("");
        setStartTime("");
        setEndTime("");
        fetchData();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const error = await res.json();
        alert(JSON.stringify(error));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Surgical Suite & OT Scheduler</h2>
          <p className="text-slate-500 text-xs mt-1">Manage operating theater bookings, visual timelines, and anesthesia schedules.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold py-2 px-4 rounded-full text-xs shadow-md shadow-blue-500/10 flex items-center space-x-1"
        >
          <Plus size={14} />
          <span>Book OT Room</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 font-semibold">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateBooking} className="bg-[#f4f8fd] p-6 rounded-[28px] border border-[#c3c7cb] shadow-sm max-w-3xl space-y-4 text-xs font-semibold text-slate-700">
          <h3 className="text-sm font-bold text-slate-800">Schedule OT Booking</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">Select Patient *</label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Select Surgeon *</label>
              <select
                required
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              >
                <option value="">-- Choose Surgeon --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Dr. {d.user_details?.first_name} {d.user_details?.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Select Operating Room *</label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              >
                <option value="">-- Choose OT Room --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Surgery / Procedure Name *</label>
              <input
                type="text"
                required
                value={surgeryName}
                onChange={(e) => setSurgeryName(e.target.value)}
                placeholder="e.g. Appendectomy, Angioplasty"
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1">Assigned Anesthesiologist *</label>
              <input
                type="text"
                required
                value={anesthesiologist}
                onChange={(e) => setAnesthesiologist(e.target.value)}
                placeholder="e.g. Dr. Salman Khan"
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Start Time *</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1">Estimated End Time *</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border p-2 bg-white rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Confirm Schedule
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-full"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Scheduler Dashboard & Visual Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Visual Timeline Grid */}
        <div className="lg:col-span-3 bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5">
            <Calendar size={16} className="text-[#1a73e8]" />
            <span>OT Operational Timeline</span>
          </h3>
          <hr className="border-[#c3c7cb]" />

          {loading ? (
            <p className="text-xs text-slate-500 text-center py-12">Loading visual timeline...</p>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">No Operating Rooms configured in system.</p>
          ) : (
            <div className="space-y-4">
              {rooms.map(room => {
                const roomBookings = bookings.filter(b => b.room === room.id);
                return (
                  <div key={room.id} className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-slate-800 text-xs">{room.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        room.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        room.status === "IN_USE" ? "bg-red-50 text-red-700 border border-red-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {room.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {roomBookings.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No bookings scheduled for today.</p>
                      ) : (
                        roomBookings.map(b => (
                          <div key={b.id} className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl text-xs flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-800">{b.surgery_name}</p>
                              <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-semibold">
                                <span className="flex items-center space-x-0.5">
                                  <Clock size={12} />
                                  <span>{new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </span>
                                <span>Surgeon: Dr. {b.surgeon_details?.user_details?.last_name}</span>
                                <span>Anesthesia: {b.anesthesiologist}</span>
                              </div>
                            </div>
                            <span className="font-bold text-[10px] text-slate-700 bg-white border px-2 py-0.5 rounded-full">
                              {b.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Surgical List Sidebar */}
        <div className="bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5">
            <User size={16} className="text-[#1a73e8]" />
            <span>Surgical Allocations</span>
          </h3>
          <hr className="border-[#c3c7cb]" />

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 italic">No active surgeries booked.</p>
            ) : (
              bookings.map(b => (
                <div key={b.id} className="bg-white p-3 rounded-2xl border text-xs space-y-1.5">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-[#1a73e8]">{b.patient_details?.first_name} {b.patient_details?.last_name}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{new Date(b.start_time).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-800 font-bold">{b.surgery_name}</p>
                  <div className="text-[10px] text-slate-500 leading-tight space-y-0.5">
                    <p>OT: {b.room_name}</p>
                    <p>Surgeon: Dr. {b.surgeon_details?.user_details?.first_name} {b.surgeon_details?.user_details?.last_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
