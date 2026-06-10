import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, ClipboardList, Stethoscope, Plus, Trash2, CheckCircle2, ShieldAlert, Heart, Activity, Video } from "lucide-react";

export const Consultation = () => {
  const { user } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [queue, setQueue] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Prescription Pad State
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState([
    { medicine_name: "", dosage: "1-0-1", duration: "5 days", instructions: "After meal" }
  ]);
  
  // Lab Order Selection
  const [selectedTests, setSelectedTests] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  // Vitals & DDI & ICD-10 States
  const [vitals, setVitals] = useState(null);
  const [ddiAlerts, setDdiAlerts] = useState([]);
  const [icdQuery, setIcdQuery] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [icdDescription, setIcdDescription] = useState("");
  const [showIcdSuggestions, setShowIcdSuggestions] = useState(false);

  const icdDatabase = [
    { code: "A09", description: "Infectious gastroenteritis and colitis" },
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "E11", description: "Type 2 diabetes mellitus" },
    { code: "J06", description: "Acute upper respiratory infections" },
    { code: "K29", description: "Gastritis and duodenitis" },
    { code: "M54", description: "Dorsalgia (Back pain)" },
    { code: "N39", description: "Other disorders of urinary system (UTI)" },
    { code: "J45", description: "Asthma" },
    { code: "H10", description: "Conjunctivitis" }
  ];

  const filteredIcd = icdQuery.trim() === "" 
    ? [] 
    : icdDatabase.filter(item => 
        item.code.toLowerCase().includes(icdQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(icdQuery.toLowerCase())
      );

  useEffect(() => {
    const fetchDocProfileAndTests = async () => {
      setLoading(true);
      try {
        const docRes = await apiFetch("/doctors/");
        if (docRes.ok) {
          const docs = toArray(await docRes.json());
          const activeDoc = docs.find(d => d.user_details?.username === user?.username);
          setDoctorProfile(activeDoc);
        }

        const testsRes = await apiFetch("/lab-tests/");
        if (testsRes.ok) {
          setLabTests(toArray(await testsRes.json()));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocProfileAndTests();
  }, [user]);

  const fetchQueue = async () => {
    if (!doctorProfile) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await apiFetch(`/appointments/?doctor=${doctorProfile.id}&date=${today}&status=PENDING`);
      if (res.ok) {
        setQueue(toArray(await res.json()));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [doctorProfile]);

  // Fetch Vitals for selected patient
  useEffect(() => {
    if (selectedAppt) {
      apiFetch(`/vitals/?patient=${selectedAppt.patient}`)
        .then(res => {
          if (res.ok) return res.json();
          return [];
        })
        .then(data => {
          const list = toArray(data);
          if (list.length > 0) {
            setVitals(list[0]);
          } else {
            setVitals(null);
          }
        })
        .catch(err => console.error(err));
    } else {
      setVitals(null);
      setDdiAlerts([]);
      setIcdCode("");
      setIcdDescription("");
      setIcdQuery("");
    }
  }, [selectedAppt]);

  // Run dynamic DDI warning check
  useEffect(() => {
    const activeMeds = medicines
      .map(m => m.medicine_name.trim())
      .filter(name => name.length > 2);

    if (activeMeds.length > 1) {
      apiFetch("/prescriptions/ddi-check/", {
        method: "POST",
        body: JSON.stringify({ medicines: activeMeds })
      })
        .then(res => {
          if (res.ok) return res.json();
          return { conflicts: [] };
        })
        .then(data => {
          setDdiAlerts(data.conflicts || []);
        })
        .catch(err => console.error(err));
    } else {
      setDdiAlerts([]);
    }
  }, [medicines]);

  const handleAddMedicine = () => {
    setMedicines([...medicines, { medicine_name: "", dosage: "1-0-1", duration: "5 days", instructions: "After meal" }]);
  };

  const handleRemoveMedicine = (idx) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleMedChange = (idx, field, val) => {
    const updated = [...medicines];
    updated[idx][field] = val;
    setMedicines(updated);
  };

  const handleTestToggle = (testId) => {
    if (selectedTests.includes(testId)) {
      setSelectedTests(selectedTests.filter(id => id !== testId));
    } else {
      setSelectedTests([...selectedTests, testId]);
    }
  };

  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setSaving(true);

    try {
      const presRes = await apiFetch("/prescriptions/", {
        method: "POST",
        body: JSON.stringify({
          patient: selectedAppt.patient,
          doctor: doctorProfile.id,
          appointment: selectedAppt.id,
          diagnosis,
          icd_code: icdCode || null,
          icd_description: icdDescription || null,
          notes,
          items: medicines.filter(m => m.medicine_name.trim() !== "")
        })
      });

      if (!presRes.ok) throw new Error("Failed to save prescription.");
      const prescription = await presRes.json();

      if (selectedTests.length > 0) {
        const labRes = await apiFetch("/lab-orders/", {
          method: "POST",
          body: JSON.stringify({
            patient: selectedAppt.patient,
            doctor: doctorProfile.id,
            prescription: prescription.id,
            tests: selectedTests,
            status: "ORDERED"
          })
        });
        if (!labRes.ok) throw new Error("Failed to create lab orders.");
      }

      const apptUpdateRes = await apiFetch(`/appointments/${selectedAppt.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" })
      });

      if (!apptUpdateRes.ok) throw new Error("Failed to complete appointment status.");

      setSuccessMsg("Consultation completed and prescription saved successfully!");
      setSelectedAppt(null);
      setDiagnosis("");
      setNotes("");
      setMedicines([{ medicine_name: "", dosage: "1-0-1", duration: "5 days", instructions: "After meal" }]);
      setSelectedTests([]);
      setIcdCode("");
      setIcdDescription("");
      setIcdQuery("");
      fetchQueue();
      
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "DOCTOR" && user?.role !== "ADMIN") {
    return (
      <div className="bg-[#f4f8fd] p-8 rounded-[28px] border border-[#c3c7cb] text-center space-y-2 font-medium max-w-md mx-auto mt-12">
        <ShieldAlert size={48} className="mx-auto text-amber-600" />
        <h3 className="font-bold text-slate-800 text-base">Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed">Only Consulting Doctors are permitted to access the consultation room.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Doctor's Consultation Chamber</h2>
          <p className="text-slate-500 text-xs mt-1">Review your patient queue, write prescriptions, and request lab tests.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 font-semibold">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Patient Queue */}
        <div className="bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center space-x-2">
            <ClipboardList size={16} className="text-[#1a73e8]" />
            <span>Today's Queue</span>
          </h3>
          <hr className="border-[#c3c7cb]" />

          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-slate-500 text-center py-6">Checking profile...</p>
            ) : !doctorProfile ? (
              <p className="text-xs text-red-500 text-center py-6 font-semibold">Doctor profile not set up for this user.</p>
            ) : queue.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 font-medium">No pending patients in queue.</p>
            ) : (
              queue.map((appt) => (
                <button
                  key={appt.id}
                  onClick={() => setSelectedAppt(appt)}
                  className={`w-full text-left p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    selectedAppt?.id === appt.id
                      ? "bg-white border-[#1a73e8] shadow-sm"
                      : "border-slate-300 hover:border-slate-400 bg-white/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#1a73e8]">#{appt.token_number}</span>
                    <span className="text-[10px] text-slate-500">{appt.start_time.slice(0,5)}</span>
                  </div>
                  <p className="text-slate-800 mt-1.5">{appt.patient_details?.first_name} {appt.patient_details?.last_name}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Middle/Right Columns: Active Consultation Area */}
        <div className="lg:col-span-3">
          {selectedAppt ? (
            <form onSubmit={handleSubmitConsultation} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Prescription Form Section */}
              <div className="md:col-span-2 bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#c3c7cb] pb-3">
                  <div className="flex items-center space-x-2">
                    <Stethoscope size={20} className="text-[#1a73e8]" />
                    <h3 className="font-bold text-slate-800 text-sm">Active Consultation</h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-[#1a73e8]">MRN: {selectedAppt.patient_details?.mrn}</span>
                    <Link
                      to={`/telemedicine?appointment_id=${selectedAppt.id}`}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm shadow-teal-600/10"
                    >
                      <Video size={12} />
                      <span>Start Call</span>
                    </Link>
                  </div>
                </div>

                {/* Patient Mini Bio */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">PATIENT NAME</span>
                    <span className="font-bold text-slate-800">{selectedAppt.patient_details?.first_name} {selectedAppt.patient_details?.last_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">GENDER</span>
                    <span className="font-semibold text-slate-800">{selectedAppt.patient_details?.gender}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">PHONE</span>
                    <span className="font-semibold text-slate-800">{selectedAppt.patient_details?.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">CNIC</span>
                    <span className="font-mono text-slate-800">{selectedAppt.patient_details?.cnic}</span>
                  </div>
                </div>

                {/* Patient Vitals Triage Summary */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-xs">
                  <div className="flex items-center space-x-1.5 text-blue-800 font-bold mb-2">
                    <Activity size={16} />
                    <span>Triage Vitals Summary</span>
                  </div>
                  {vitals ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block">BLOOD PRESSURE</span>
                        <span className="font-bold text-slate-800">{vitals.blood_pressure} mmHg</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">PULSE RATE</span>
                        <span className="font-bold text-slate-800">{vitals.pulse} bpm</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">TEMPERATURE</span>
                        <span className="font-bold text-slate-800">{vitals.temperature} °F</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">SPO2</span>
                        <span className="font-bold text-slate-800">{vitals.oxygen_saturation}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">WEIGHT</span>
                        <span className="font-bold text-slate-800">{vitals.weight} kg</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">HEIGHT</span>
                        <span className="font-bold text-slate-800">{vitals.height} cm</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">No triage vitals recorded for this visit. Please consult patient directly.</p>
                  )}
                </div>

                {/* Diagnosis & Notes with ICD-10 Search */}
                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Diagnosis (Free Text) *</label>
                      <input
                        type="text"
                        required
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g. Acute Gastritis, Typhoid Fever"
                        className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-slate-600 font-semibold mb-1">Standardized ICD-10 Code</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={icdQuery}
                          onChange={(e) => {
                            setIcdQuery(e.target.value);
                            setShowIcdSuggestions(true);
                          }}
                          onFocus={() => setShowIcdSuggestions(true)}
                          placeholder="Search ICD-10 e.g. Hypertension, A09..."
                          className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                        />
                        {icdCode && (
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg font-bold flex items-center border border-blue-200">
                            {icdCode}
                          </div>
                        )}
                      </div>
                      
                      {showIcdSuggestions && filteredIcd.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {filteredIcd.map(item => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                setIcdCode(item.code);
                                setIcdDescription(item.description);
                                setIcdQuery(`${item.code} - ${item.description}`);
                                setShowIcdSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs"
                            >
                              <span className="font-bold text-blue-600 mr-2">{item.code}</span>
                              <span className="text-slate-700">{item.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Clinical Instructions / Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Avoid oily foods, bed rest for 3 days..."
                      rows={2}
                      className="block w-full border border-[#dadce0] rounded-lg p-2.5 bg-white font-medium"
                    />
                  </div>
                </div>

                {/* AI Drug-Drug Interaction Alert Box */}
                {ddiAlerts.length > 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-red-900 font-bold">
                      <ShieldAlert size={18} className="text-red-600 animate-pulse" />
                      <span>AI Clinical Safety Warning: Drug Interaction Detected</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 font-medium">
                      {ddiAlerts.map((alert, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <strong className="uppercase">{alert.drugs.join(" + ")}:</strong> {alert.warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Medicine List Pad */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-slate-700">Prescription Pad</span>
                    <button
                      type="button"
                      onClick={handleAddMedicine}
                      className="text-xs font-bold text-[#1a73e8] hover:underline flex items-center space-x-1"
                    >
                      <Plus size={14} />
                      <span>Add Medicine</span>
                    </button>
                  </div>

                  {medicines.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200 items-end">
                      <div className="md:col-span-4 text-xs">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">Medicine Name *</label>
                        <input
                          type="text"
                          required
                          value={med.medicine_name}
                          onChange={(e) => handleMedChange(idx, "medicine_name", e.target.value)}
                          placeholder="e.g. Panadol 500mg"
                          className="block w-full border rounded p-1.5 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2 text-xs">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                          placeholder="e.g. 1-0-1"
                          className="block w-full border rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2 text-xs">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">Duration</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                          placeholder="e.g. 5 days"
                          className="block w-full border rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-3 text-xs">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">Instructions</label>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => handleMedChange(idx, "instructions", e.target.value)}
                          placeholder="e.g. After meal"
                          className="block w-full border rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-1 text-center">
                        <button
                          type="button"
                          disabled={medicines.length === 1}
                          onClick={() => handleRemoveMedicine(idx)}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1.5 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Lab Request & Submit Section */}
              <div className="bg-[#f4f8fd] p-5 rounded-[28px] border border-[#c3c7cb] shadow-sm flex flex-col justify-between h-fit space-y-5">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Order Lab Diagnostics</h3>
                  <hr className="border-[#c3c7cb]" />

                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 text-xs">
                    {labTests.map(test => (
                      <label key={test.id} className="flex items-center space-x-2.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(test.id)}
                          onChange={() => handleTestToggle(test.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{test.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold py-2.5 px-4 rounded-full transition-all text-xs shadow-md shadow-blue-500/10 flex items-center justify-center space-x-1"
                  >
                    {saving ? <span>Saving...</span> : <span>Complete & Prescribe</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAppt(null)}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-full text-xs transition-all"
                  >
                    Cancel Consultation
                  </button>
                </div>

              </div>

            </form>
          ) : (
            <div className="bg-[#f4f8fd] border border-dashed border-[#c3c7cb] rounded-[28px] py-16 text-center text-slate-500 font-semibold">
              <User size={48} className="mx-auto text-[#1a73e8] opacity-40 mb-3" />
              <p className="text-slate-800 text-sm">No Active Patient Selected</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Please select a patient token from the left queue sidebar to start consultation.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
