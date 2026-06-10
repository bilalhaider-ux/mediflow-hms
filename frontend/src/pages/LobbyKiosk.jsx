import React, { useState } from "react";
import { apiFetch, toArray } from "../utils/api";
import { QrCode, Ticket, CheckCircle2, AlertTriangle, Printer, ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";

export const LobbyKiosk = () => {
  const [mrn, setMrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [success, setSuccess] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleSearchCheckIn = async (e) => {
    e.preventDefault();
    if (!mrn.trim()) return;
    setLoading(true);
    setError("");
    setActiveAppointment(null);
    setSuccess(false);

    try {
      // 1. Resolve patient using MRN
      const patientsRes = await apiFetch(`/patients/`);
      if (!patientsRes.ok) throw new Error("Could not connect to patient database.");
      const patients = toArray(await patientsRes.json());
      const patient = patients.find(p => p.mrn.toLowerCase() === mrn.trim().toLowerCase() || p.phone === mrn.trim());
      
      if (!patient) {
        throw new Error("No patient record found matching this MRN or Phone number.");
      }

      // 2. Fetch pending appointments for today
      const today = new Date().toISOString().split("T")[0];
      const apptsRes = await apiFetch(`/appointments/?patient=${patient.id}&date=${today}`);
      if (!apptsRes.ok) throw new Error("Could not resolve appointments.");
      
      const appts = toArray(await apptsRes.json());
      const pendingAppt = appts.find(a => a.status === "PENDING");

      if (!pendingAppt) {
        throw new Error("No pending appointment found for today. Please register at the reception desk.");
      }

      // 3. Perform Check-in transition: status -> ACTIVE
      const checkInRes = await apiFetch(`/appointments/${pendingAppt.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" })
      });

      if (!checkInRes.ok) throw new Error("Check-in request failed. Try again.");
      const updatedAppt = await checkInRes.json();

      setActiveAppointment(updatedAppt);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      setPrinting(false);
      window.print();
      // Reset
      setMrn("");
      setActiveAppointment(null);
      setSuccess(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] font-sans flex flex-col items-center justify-between p-6">
      
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3 text-[#1a73e8]">
          <div className="bg-[#1a73e8] text-white p-2.5 rounded-2xl font-bold text-lg">HMS</div>
          <div>
            <h1 className="font-extrabold text-base text-slate-800 leading-none">Self-Service Desk</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">Check-in Kiosk</p>
          </div>
        </div>
        <Link 
          to="/login"
          className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-white border border-[#c3c7cb] px-4 py-2 rounded-full transition-all"
        >
          <ArrowLeft size={14} />
          <span>Exit Kiosk</span>
        </Link>
      </div>

      {/* Main Panel Card */}
      <div className="w-full max-w-2xl bg-white border border-[#c3c7cb] shadow-lg rounded-[32px] p-8 md:p-10 flex flex-col justify-center my-auto">
        {!success ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <QrCode size={48} className="mx-auto text-[#1a73e8] animate-pulse" />
              <h2 className="text-xl font-extrabold text-slate-800">Scan Card or Enter MRN</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">Scan your digital QR code from your Patient Portal or type your MRN/Phone number below to check-in and get your token.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl flex items-center space-x-2.5">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSearchCheckIn} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  required
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="Enter MRN (e.g. HMS-2026-00001) or Phone"
                  className="block w-full px-5 py-4 bg-slate-50 border border-[#747775] rounded-2xl text-slate-800 font-bold focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all text-sm text-center"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-extrabold py-4 px-6 rounded-2xl transition-all flex items-center justify-center space-x-2 text-sm shadow-md shadow-blue-500/10"
              >
                {loading ? <span>Resolving Booking...</span> : (
                  <>
                    <Search size={16} />
                    <span>Search & Check-in</span>
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-slate-200 pt-6 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Simulate QR scan</p>
              <div className="flex justify-center space-x-3 mt-3">
                <button
                  onClick={() => { setMrn("HMS-2026-00001"); }}
                  className="bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-[11px] font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Scan Demo Patient Card
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
              <h2 className="text-xl font-extrabold text-slate-800">Check-in Completed!</h2>
              <p className="text-xs text-slate-500 font-medium">Your appointment is validated. Print your queue token ticket below.</p>
            </div>

            {/* Thermal Receipt Simulation */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-receipt-section, #print-receipt-section * {
                  visibility: visible !important;
                }
                #print-receipt-section {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 20px !important;
                }
              }
            `}</style>
            <div id="print-receipt-section" className="bg-slate-50 border border-slate-300 rounded-2xl p-6 max-w-sm mx-auto shadow-inner text-left font-mono relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300"></div>
              
              <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
                <h3 className="font-bold text-sm tracking-widest uppercase">HMS MEDICAL SUITE</h3>
                <p className="text-[10px] text-slate-500">Self-Service Desk Token</p>
                <p className="text-[9px] text-slate-400">{new Date().toLocaleString()}</p>
              </div>

              <div className="py-4 text-center space-y-1.5">
                <span className="text-[10px] text-slate-500 font-semibold block tracking-wider">OPD QUEUE TOKEN</span>
                <span className="text-4xl font-extrabold text-slate-800 tracking-tight block">
                  #{activeAppointment.token_number}
                </span>
                <span className="text-[10px] text-slate-600 bg-white border px-3 py-1 rounded-full font-bold inline-block border-slate-200">
                  {activeAppointment.appointment_type}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-3 text-[11px] space-y-1 text-slate-700">
                <p className="flex justify-between">
                  <span>PATIENT:</span>
                  <span className="font-bold">{activeAppointment.patient_details?.first_name} {activeAppointment.patient_details?.last_name}</span>
                </p>
                <p className="flex justify-between">
                  <span>MRN:</span>
                  <span className="font-bold">{activeAppointment.patient_details?.mrn}</span>
                </p>
                <p className="flex justify-between">
                  <span>DOCTOR:</span>
                  <span className="font-bold">Dr. {activeAppointment.doctor_details?.user_details?.last_name}</span>
                </p>
                <p className="flex justify-between">
                  <span>TIME SLOT:</span>
                  <span className="font-bold">{activeAppointment.start_time.slice(0,5)}</span>
                </p>
              </div>

              <div className="border-t border-dashed border-slate-300 mt-4 pt-3 flex flex-col items-center space-y-1.5">
                {/* Simulated Barcode */}
                <div className="w-full h-8 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_6px)] opacity-80"></div>
                <span className="text-[9px] text-slate-500 font-bold tracking-widest">{activeAppointment.patient_details?.mrn}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={handleSimulatePrint}
                disabled={printing}
                className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-extrabold py-3 px-6 rounded-full text-xs shadow-md shadow-blue-500/10 flex items-center space-x-1.5"
              >
                <Printer size={16} />
                <span>{printing ? "Printing..." : "Print Ticket"}</span>
              </button>
              <button
                onClick={() => {
                  setMrn("");
                  setActiveAppointment(null);
                  setSuccess(false);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-full text-xs"
              >
                Done / Exit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-slate-500 font-semibold py-4">
        © 2026 Medi Flow HMS. All rights reserved.
      </div>
    </div>
  );
};
