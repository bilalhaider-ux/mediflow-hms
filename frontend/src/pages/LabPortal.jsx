import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { 
  FileText, 
  Search, 
  FlaskConical, 
  CheckCircle2, 
  Download, 
  FileSignature, 
  ChevronRight,
  ClipboardList
} from "lucide-react";

export const LabPortal = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ORDERED");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Lab Tech Action States
  const [resultsSummary, setResultsSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (statusFilter) queryParams.append("status", statusFilter);
      
      const res = await apiFetch(`/lab-orders/?${queryParams.toString()}`);
      if (res.ok) {
        const data = toArray(await res.json());
        setOrders(data);
        // Refresh active selected order
        if (selectedOrder) {
          const updated = data.find(o => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching lab orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter]);

  // Set default parameters template when order changes
  useEffect(() => {
    if (selectedOrder) {
      setSuccessMsg(null);
      setErrorMsg(null);
      
      if (selectedOrder.status === "COMPLETED") {
        setResultsSummary(selectedOrder.results_summary || "");
      } else {
        // Pre-populate parameter suggestions based on ordered tests
        const testNames = selectedOrder.test_details?.map(t => t.name).join(", ");
        const template = selectedOrder.test_details?.map(t => {
          if (t.code === "CBC") {
            return "Hemoglobin: \nWBC Count: \nRBC Count: \nPlatelets: ";
          }
          return `${t.name} Result: `;
        }).join("\n") || "";
        
        setResultsSummary(template);
      }
    }
  }, [selectedOrder]);

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch(`/lab-orders/${selectedOrder.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setSuccessMsg(`Order updated to status: ${newStatus}`);
        await fetchOrders();
      } else {
        setErrorMsg("Failed to update order status.");
      }
    } catch (err) {
      setErrorMsg("Network connection error.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitResults = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch(`/lab-orders/${selectedOrder.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "COMPLETED",
          results_summary: resultsSummary
        })
      });

      if (res.ok) {
        setSuccessMsg("Results recorded! Report PDF generated automatically.");
        await fetchOrders();
      } else {
        setErrorMsg("Failed to compile test results.");
      }
    } catch (err) {
      setErrorMsg("Connection timed out.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      ORDERED: "bg-blue-50 text-blue-700 border-blue-200",
      SAMPLE_COLLECTED: "bg-purple-50 text-purple-700 border-purple-200",
      COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span className={`inline-block border text-[10px] px-2 py-0.5 rounded-full font-semibold ${configs[status] || "bg-slate-50 text-slate-700"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#e3effd] to-[#edf3fc] p-6 rounded-2xl border border-blue-200/50 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FlaskConical className="text-[#1a73e8]" /> Diagnostics & Lab Desk
          </h2>
          <p className="text-slate-500 text-xs mt-1">Manage active laboratory investigations, update sample collection status, record parameter results, and generate PDFs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: List of Lab Orders */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 text-base">Lab Orders List</h3>
            <div className="flex gap-2 flex-1 md:flex-initial">
              {/* Filter */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs google-input px-2.5 py-1.5 bg-white"
              >
                <option value="ORDERED">Pending Samples</option>
                <option value="SAMPLE_COLLECTED">Collected Samples</option>
                <option value="COMPLETED">Completed Reports</option>
                <option value="CANCELLED">Cancelled Orders</option>
              </select>
            </div>
          </div>

          {/* Grid Layout of Orders */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading && orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs animate-pulse">Loading diagnostic queue...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No lab orders found.</div>
            ) : (
              orders.map((ord) => (
                <div 
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all ${selectedOrder?.id === ord.id ? "bg-[#f4f8fd] border-[#1a73e8] shadow-sm" : "bg-white border-slate-200"}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">Order #{ord.id}</span>
                      {getStatusBadge(ord.status)}
                    </div>
                    <p className="text-xs text-slate-700 font-semibold">{ord.patient_details?.first_name} {ord.patient_details?.last_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">MRN: {ord.patient_details?.mrn}</p>
                  </div>
                  
                  <div className="text-right flex items-center gap-3">
                    <div className="hidden md:block">
                      <p className="text-[10px] text-slate-400 font-semibold">TESTS ORDERED</p>
                      <p className="text-xs font-semibold text-[#1a73e8]">
                        {ord.test_details?.map(t => t.name).join(", ")}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Action Panel */}
        <div>
          {selectedOrder ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Order Meta Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 text-base">Order #{selectedOrder.id}</h4>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-slate-400 text-[10px] mt-0.5">Ordered on: {new Date(selectedOrder.order_date).toLocaleString("en-PK")}</p>
              </div>

              {/* Patient and Doctor Details */}
              <div className="space-y-2 text-xs border-b border-slate-100 pb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-semibold text-slate-700">{selectedOrder.patient_details?.first_name} {selectedOrder.patient_details?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Referring Dr:</span>
                  <span className="font-medium text-slate-700">Dr. {selectedOrder.doctor_details?.user?.username}</span>
                </div>
              </div>

              {/* Action Flows */}
              {selectedOrder.status === "ORDERED" ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100/50 p-4 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-blue-800">Sample Pending Collection</p>
                    <p className="text-slate-600 leading-relaxed">Collect the patient's blood, urine, or swab sample before updating the order status in the system.</p>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus("SAMPLE_COLLECTED")}
                    disabled={saving}
                    className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:bg-slate-300"
                  >
                    <CheckCircle2 size={16} /> Mark Sample As Collected
                  </button>
                </div>
              ) : selectedOrder.status === "SAMPLE_COLLECTED" ? (
                <form onSubmit={handleSubmitResults} className="space-y-4">
                  <div className="bg-purple-50 border border-purple-100/50 p-4 rounded-xl text-xs">
                    <p className="font-bold text-purple-800">Input Diagnostic Parameters</p>
                    <p className="text-slate-600 mt-1 leading-normal">Enter the observed values for the ordered tests below to compile the patient's lab sheet report.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Result Summary Sheet</label>
                    <textarea 
                      required
                      rows={6}
                      className="w-full p-2.5 text-xs font-mono google-input"
                      placeholder="e.g. Hemoglobin: 13.8 g/dL"
                      value={resultsSummary}
                      onChange={(e) => setResultsSummary(e.target.value)}
                    />
                    <span className="text-[9px] text-slate-400 block mt-1 leading-normal">
                      * Write parameters as "Key: Value" pair per line to render them inside tables in the compiled PDF.
                    </span>
                  </div>

                  {successMsg && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium">
                      {successMsg}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:bg-slate-300"
                  >
                    <FileSignature size={16} /> Compile & Complete Lab Report
                  </button>
                </form>
              ) : selectedOrder.status === "COMPLETED" ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-4 rounded-xl space-y-1 font-medium">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Diagnostics Finalized
                    </p>
                    <p className="text-[10px] text-emerald-700/80">The results are compiled and the PDF report is ready for download.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-slate-700 text-xs">Results Sheet View</p>
                    <pre className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-mono text-slate-600 max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {selectedOrder.results_summary}
                    </pre>
                  </div>

                  {selectedOrder.results_file && (
                    <a 
                      href={`http://localhost:8000/media/${selectedOrder.results_file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-center"
                    >
                      <Download size={16} /> Download PDF Lab Report
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">Order cancelled.</div>
              )}

            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center py-20 text-slate-400 text-xs shadow-sm">
              Select an investigation order file from the queue list to update statuses, input test parameters, or retrieve compiled reports.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
