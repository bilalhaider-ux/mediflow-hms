import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { usePagination } from "../hooks/usePagination";
import { useAuth } from "../context/AuthContext";
import { Pagination } from "../components/Pagination";
import { 
  Receipt, 
  Search, 
  CreditCard, 
  Wallet, 
  CircleDollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Clock, 
  DollarSign,
  User,
  Hash,
  ArrowRight,
  Plus,
  Trash2,
  X
} from "lucide-react";

export const Billing = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Checkout States
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  
  // Panel Insurance States
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState("");
  const [panelApproved, setPanelApproved] = useState("0.00");
  const [patientCopay, setPatientCopay] = useState("0.00");

  // Refund States
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundPasscode, setRefundPasscode] = useState("");
  const [refunding, setRefunding] = useState(false);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);

  // New Invoice Modal States
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvoiceStep, setNewInvoiceStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatientForInvoice, setSelectedPatientForInvoice] = useState(null);
  
  // Invoice items state
  const [newInvoiceItems, setNewInvoiceItems] = useState([
    { description: "", quantity: 1, unit_price: "" }
  ]);
  const [newInvoiceTaxPercent, setNewInvoiceTaxPercent] = useState("0");
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState("0");
  
  // Link States
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientAdmissions, setPatientAdmissions] = useState([]);
  const [selectedAppointmentForInvoice, setSelectedAppointmentForInvoice] = useState("");
  const [selectedAdmissionForInvoice, setSelectedAdmissionForInvoice] = useState("");
  const [selectedPanelForInvoice, setSelectedPanelForInvoice] = useState("");

  // Submit and success states
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [createdInvoiceResult, setCreatedInvoiceResult] = useState(null);
  const [newInvoiceError, setNewInvoiceError] = useState(null);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("");
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Pagination hook integration
  const queryParams = new URLSearchParams();
  if (search) queryParams.append("search", search);
  if (statusFilter) queryParams.append("status", statusFilter);
  const endpoint = `/invoices/?${queryParams.toString()}`;

  const {
    data: invoices,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    loading,
    refresh: fetchInvoices
  } = usePagination(endpoint);

  useEffect(() => {
    if (selectedInvoice && invoices) {
      const updated = invoices.find(i => i.id === selectedInvoice.id);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedInvoice)) {
          setSelectedInvoice(updated);
        }
      }
    }
  }, [invoices, selectedInvoice]);

  const handleSearchPatient = async (query) => {
    setPatientSearch(query);
    if (!query || query.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const res = await apiFetch(`/patients/?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setPatientResults(data);
        } else if (data && Array.isArray(data.results)) {
          setPatientResults(data.results);
        } else {
          setPatientResults([]);
        }
      }
    } catch (err) {
      console.error("Error searching patients:", err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatientForInvoice(patient);
    
    try {
      const [apptRes, admRes] = await Promise.all([
        apiFetch(`/appointments/?patient=${patient.id}&status=SCHEDULED`),
        apiFetch(`/ipd/admissions/?patient=${patient.id}&status=ADMITTED`)
      ]);
      
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        if (Array.isArray(apptData)) {
          setPatientAppointments(apptData);
        } else if (apptData && Array.isArray(apptData.results)) {
          setPatientAppointments(apptData.results);
        }
      }
      
      if (admRes.ok) {
        const admData = await admRes.json();
        if (Array.isArray(admData)) {
          setPatientAdmissions(admData);
        } else if (admData && Array.isArray(admData.results)) {
          setPatientAdmissions(admData.results);
        }
      }
    } catch (err) {
      console.error("Error fetching patient details:", err);
    }
  };

  const handleAddItemRow = () => {
    setNewInvoiceItems([...newInvoiceItems, { description: "", quantity: 1, unit_price: "" }]);
  };

  const handleRemoveItemRow = (index) => {
    if (newInvoiceItems.length === 1) return;
    const updated = newInvoiceItems.filter((_, i) => i !== index);
    setNewInvoiceItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = newInvoiceItems.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setNewInvoiceItems(updated);
  };

  const calculateNewInvoiceSubtotal = () => {
    return newInvoiceItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.unit_price) || 0;
      return sum + (qty * rate);
    }, 0);
  };

  const newSubtotal = calculateNewInvoiceSubtotal();
  const taxPercent = parseFloat(newInvoiceTaxPercent) || 0;
  const newTaxAmount = newSubtotal * (taxPercent / 100);
  const newDiscount = parseFloat(newInvoiceDiscount) || 0;
  const newTotal = Math.max(0, newSubtotal + newTaxAmount - newDiscount);

  // Recalculate panel discount when subtotal changes
  useEffect(() => {
    if (selectedPanelForInvoice) {
      const panel = panels.find(p => p.id === parseInt(selectedPanelForInvoice));
      if (panel) {
        const discountPct = parseFloat(panel.discount_percentage) || 0;
        const discountAmt = newSubtotal * (discountPct / 100);
        setNewInvoiceDiscount(discountAmt.toFixed(2));
      }
    }
  }, [newSubtotal, selectedPanelForInvoice, panels]);

  const handlePanelChange = (panelId) => {
    setSelectedPanelForInvoice(panelId);
    if (panelId) {
      const panel = panels.find(p => p.id === parseInt(panelId));
      if (panel) {
        const discountPct = parseFloat(panel.discount_percentage) || 0;
        const discountAmt = newSubtotal * (discountPct / 100);
        setNewInvoiceDiscount(discountAmt.toFixed(2));
      }
    } else {
      setNewInvoiceDiscount("0");
    }
  };

  const handleSubmitNewInvoice = async () => {
    setCreatingInvoice(true);
    setNewInvoiceError(null);

    const payload = {
      patient: selectedPatientForInvoice.id,
      appointment: selectedAppointmentForInvoice ? parseInt(selectedAppointmentForInvoice) : null,
      admission: selectedAdmissionForInvoice ? parseInt(selectedAdmissionForInvoice) : null,
      panel: selectedPanelForInvoice ? parseInt(selectedPanelForInvoice) : null,
      items: newInvoiceItems.map(item => ({
        description: item.description,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        item_type: "OTHER"
      })),
      tax: newTaxAmount.toFixed(2),
      tax_percentage: newInvoiceTaxPercent,
      discount: newDiscount.toFixed(2),
      payment_mode: paymentMode,
      notes: newInvoiceNotes
    };

    try {
      const res = await apiFetch("/invoices/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedInvoiceResult(data);
        setToast({
          message: `Invoice ${data.invoice_number} created successfully!`,
          type: "success"
        });
      } else {
        const errorMsg = data.error || data.detail || "Failed to create invoice. Please check all fields.";
        setNewInvoiceError(errorMsg);
        setToast({
          message: errorMsg,
          type: "error"
        });
      }
    } catch (err) {
      const errorMsg = "System connection timeout. Please verify backend connection.";
      setNewInvoiceError(errorMsg);
      setToast({
        message: errorMsg,
        type: "error"
      });
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Fetch panels catalog on mount
  useEffect(() => {
    apiFetch("/billing/panels/")
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setPanels(toArray(data)))
      .catch(err => console.error(err));
  }, []);

  // Pre-fill amount when selected invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      const remaining = parseFloat(selectedInvoice.total_amount) - 
        selectedInvoice.payments
          .filter(p => p.status === "COMPLETED")
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      setPayAmount(remaining > 0 ? remaining.toFixed(2) : "0.00");
      setCheckoutMessage(null);
      setCheckoutError(null);
      
      setSelectedPanel(selectedInvoice.panel || "");
      setPanelApproved(selectedInvoice.panel_approved_amount || "0.00");
      setPatientCopay(selectedInvoice.patient_copay_amount || "0.00");
    }
  }, [selectedInvoice]);

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setPaying(true);
    setCheckoutMessage(null);
    setCheckoutError(null);

    try {
      const res = await apiFetch(`/invoices/${selectedInvoice.id}/pay/`, {
        method: "POST",
        body: JSON.stringify({
          amount: payAmount,
          payment_method: paymentMethod,
          phone_number: phoneNumber
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCheckoutMessage(data.message);
        await fetchInvoices();
      } else {
        setCheckoutError(data.error || "Payment processing failed.");
      }
    } catch (err) {
      setCheckoutError("System connection timeout. Please check local connectivity.");
    } finally {
      setPaying(false);
    }
  };

  const handleApplyPanel = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      const res = await apiFetch(`/invoices/${selectedInvoice.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          panel: selectedPanel || null,
          panel_approved_amount: panelApproved,
          patient_copay_amount: patientCopay
        })
      });
      if (res.ok) {
        alert("Panel insurance split applied successfully!");
        await fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setRefunding(true);
    try {
      const res = await apiFetch(`/invoices/${selectedInvoice.id}/refund/`, {
        method: "POST",
        body: JSON.stringify({
          amount: refundAmount,
          reason: refundReason,
          passcode: refundPasscode
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Refund authorized and processed successfully!");
        setShowRefundForm(false);
        setRefundAmount("");
        setRefundReason("");
        setRefundPasscode("");
        await fetchInvoices();
      } else {
        alert(data.error || "Refund authorization failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefunding(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      PARTIALLY_PAID: "bg-orange-50 text-orange-700 border-orange-200",
      CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span className={`inline-block border text-xs px-2.5 py-1 rounded-full font-semibold ${configs[status] || "bg-slate-50 text-slate-700"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 opacity-100 ${toast.type === "success" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <div className="text-xs font-semibold">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-white hover:text-slate-200 ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#e3effd] to-[#edf3fc] p-6 rounded-2xl border border-blue-200/50 flex justify-between items-center shadow-sm text-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="text-[#1a73e8]" /> Billing & Financials Desk
          </h2>
          <p className="text-slate-500 text-xs mt-1">Manage OPD consultations, lab billing, ward stay invoices, and process Pakistani mobile wallet payments.</p>
        </div>
        {(user?.role === "RECEPTIONIST" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <button
            onClick={() => setShowNewInvoiceModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
          >
            <Plus size={15} /> New Invoice
          </button>
        )}
      </div>

      {/* Main Content Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Invoice List & Search */}
        <div className="lg:col-span-2 space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 text-base">Billing Invoices</h3>
            <div className="flex gap-2 flex-1 md:flex-initial">
              {/* Search Bar */}
              <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search MRN, Patient, Inv..." 
                  className="w-full pl-9 pr-3 py-1.5 text-xs google-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {/* Filter */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs google-input px-2.5 py-1.5 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Invoices List Grid */}
          <div className="overflow-x-auto">
            {loading && invoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Loading billing ledger...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No billing records found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Invoice No.</th>
                    <th className="py-3 px-4">Patient / MRN</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {invoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-[#f4f8fd] transition-all cursor-pointer ${selectedInvoice?.id === inv.id ? "bg-[#f4f8fd] border-l-4 border-l-[#1a73e8]" : ""}`}
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <td className="py-3 px-4 font-bold text-slate-800">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        <div>{inv.patient_detail?.first_name} {inv.patient_detail?.last_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.patient_detail?.mrn}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.created_at).toLocaleDateString("en-PK")}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        Rs. {parseFloat(inv.total_amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(inv);
                            setShowReceipt(true);
                          }}
                        >
                          <Printer size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination Controls */}
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={goToPage}
          />
        </div>

        {/* Right Side: Detail Panel & Checkout Control */}
        <div className="space-y-6">
          
          {selectedInvoice ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Selected Invoice Meta */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{selectedInvoice.invoice_number}</h4>
                  <p className="text-slate-400 text-[11px] font-mono mt-0.5">{selectedInvoice.patient_detail?.mrn}</p>
                </div>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              {/* Patient Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-semibold text-slate-700">{selectedInvoice.patient_detail?.first_name} {selectedInvoice.patient_detail?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="text-slate-600">{selectedInvoice.patient_detail?.phone}</span>
                </div>
              </div>

              {/* Items breakdown list */}
              <div className="space-y-3 bg-[#f4f8fd] p-4 rounded-xl border border-blue-100/50">
                <p className="font-bold text-slate-700 text-xs">Invoice Items</p>
                <div className="divide-y divide-slate-100 text-[11px]">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.id} className="py-2 flex justify-between items-start">
                      <div className="pr-4">
                        <p className="font-medium text-slate-700">{item.description}</p>
                        <p className="text-[10px] text-slate-400">{item.item_type.replace("_", " ")} x{item.quantity}</p>
                      </div>
                      <span className="font-semibold text-slate-800 whitespace-nowrap">Rs. {parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                {/* Financial Summary */}
                <div className="border-t border-slate-200/60 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>Rs. {parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.discount) > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- Rs. {parseFloat(selectedInvoice.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-dashed border-slate-200 pt-2">
                    <span>Total Amount:</span>
                    <span>Rs. {parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Payments History */}
              {selectedInvoice.payments.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 text-xs">Payment Logs</p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {selectedInvoice.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-[10px] bg-slate-50 p-2 border border-slate-100 rounded-lg">
                        <div>
                          <span className="font-semibold text-slate-600">{p.payment_method}</span>
                          <span className="text-slate-400 font-mono block">{p.transaction_id || "No Ref"}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-700">Rs. {parseFloat(p.amount).toFixed(2)}</span>
                          <span className={`block font-semibold ${p.status === "COMPLETED" ? "text-emerald-600" : "text-rose-500"}`}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Panel Split Settings */}
              {(selectedInvoice.status === "PENDING" || selectedInvoice.status === "PARTIALLY_PAID") && (user?.role === "RECEPTIONIST" || user?.role === "ADMIN") && (
                <form onSubmit={handleApplyPanel} className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="font-bold text-slate-800 text-xs">Corporate Panel / Sehat Card Split</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Select Panel / Insurance</label>
                      <select
                        value={selectedPanel}
                        onChange={(e) => setSelectedPanel(e.target.value)}
                        className="w-full border p-2 bg-white rounded-lg focus:outline-none"
                      >
                        <option value="">-- No Panel (Self Pay) --</option>
                        {panels.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.discount_percentage)}% discount)</option>
                        ))}
                      </select>
                    </div>

                    {selectedPanel && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Approved Amt (Rs.)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={panelApproved}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPanelApproved(e.target.value);
                              const copay = Math.max(0, parseFloat(selectedInvoice.total_amount) - val);
                              setPatientCopay(copay.toFixed(2));
                            }}
                            className="w-full border p-2 bg-white rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Patient Copay (Rs.)</label>
                          <div className="w-full border p-2 bg-slate-50 text-slate-700 rounded-lg font-bold">
                            Rs. {patientCopay}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedPanel && (
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all"
                    >
                      Apply Panel Split
                    </button>
                  )}
                </form>
              )}

              {/* Checkout processing Panel */}
              {(selectedInvoice.status === "PENDING" || selectedInvoice.status === "PARTIALLY_PAID") && (user?.role === "RECEPTIONIST" || user?.role === "ADMIN") ? (
                <form onSubmit={handleProcessPayment} className="border-t border-slate-100 pt-4 space-y-4">
                  <p className="font-bold text-slate-800 text-xs">Payment Checkout</p>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "CASH", label: "Cash", icon: <CircleDollarSign size={16} /> },
                      { id: "JAZZCASH", label: "JazzCash", icon: <Wallet size={16} /> },
                      { id: "EASYPAISA", label: "EasyPaisa", icon: <Wallet size={16} /> },
                      { id: "CARD", label: "Card", icon: <CreditCard size={16} /> }
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id);
                          setCheckoutMessage(null);
                          setCheckoutError(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2 border rounded-xl transition-all ${paymentMethod === method.id ? "bg-blue-50 border-blue-500 text-blue-600 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        {method.icon}
                        <span className="text-[9px] font-semibold mt-1">{method.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Checkout Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Pay Amount (Rs.)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="w-full p-2 text-xs google-input"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>

                    {(paymentMethod === "JAZZCASH" || paymentMethod === "EASYPAISA") && (
                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Mobile Wallet Number</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 03451234567"
                          required
                          className="w-full p-2 text-xs google-input"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        <span className="text-[9px] text-slate-400 leading-normal block mt-1">
                          * Entering a number ending with <b>999</b> simulates a transaction rejection/failure.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Alerts */}
                  {checkoutMessage && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-start gap-2 text-[11px] font-medium">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{checkoutMessage}</span>
                    </div>
                  )}

                  {checkoutError && (
                    <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl flex items-start gap-2 text-[11px] font-medium">
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:bg-slate-300"
                  >
                    {paying ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Initiating Mobile Push Prompt...</span>
                      </>
                    ) : (
                      <>
                        <span>Process Rs. {parseFloat(payAmount || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })} Payment</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                selectedInvoice.status === "PAID" && (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-4 rounded-xl flex items-center gap-2.5 font-medium">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      <div>
                        <p className="font-bold">Invoice Fully Settled</p>
                        <p className="text-[10px] text-emerald-700/80 mt-0.5">Payment has been cleared. You can print the receipt slip now.</p>
                      </div>
                    </div>

                    {/* Refund option */}
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      <button
                        onClick={() => setShowRefundForm(!showRefundForm)}
                        className="w-full py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-all animate-pulse"
                      >
                        {showRefundForm ? "Cancel Refund" : "Issue Refund / Invoice Reversal"}
                      </button>

                      {showRefundForm && (
                        <form onSubmit={handleProcessRefund} className="space-y-3 text-xs font-semibold text-slate-700">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Refund Amount (Rs.) *</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={refundAmount}
                              onChange={(e) => setRefundAmount(e.target.value)}
                              max={selectedInvoice.total_amount}
                              className="w-full border p-2 bg-white rounded-lg focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Reason for Refund *</label>
                            <input
                              type="text"
                              required
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder="e.g. Duplicate order, incorrect doctor charge"
                              className="w-full border p-2 bg-white rounded-lg focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Manager Passcode *</label>
                            <input
                              type="password"
                              required
                              value={refundPasscode}
                              onChange={(e) => setRefundPasscode(e.target.value)}
                              placeholder="Enter passcode to authorize"
                              className="w-full border p-2 bg-white rounded-lg focus:outline-none"
                            />
                            <span className="text-[9px] text-slate-400 mt-1 block leading-normal">* Try: <b>admin123</b> to authorize.</span>
                          </div>
                          <button
                            type="submit"
                            disabled={refunding}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
                          >
                            {refunding ? "Processing Refund..." : "Confirm Refund / Reverse Invoice"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              )}

              <button
                onClick={() => setShowReceipt(true)}
                className="w-full border border-slate-200 text-slate-700 hover:bg-slate-50 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={14} /> Preview Printable Slip
              </button>

            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center py-20 text-slate-400 text-xs shadow-sm">
              Select an invoice from the ledger to view breakdowns, track logs, and record checkout payments.
            </div>
          )}

        </div>

      </div>

      {/* PRINT RECEIPT OVERLAY MODAL */}
      {showReceipt && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white w-full max-w-xl p-8 rounded-2xl border border-slate-300 shadow-2xl relative print:border-none print:shadow-none print:max-w-full print:p-0">
            {/* Close controls (hidden in print) */}
            <div className="absolute right-4 top-4 flex gap-2 print:hidden">
              <button 
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Printer size={14} /> Print
              </button>
              <button 
                onClick={() => setShowReceipt(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
              >
                Close
              </button>
            </div>

            {/* Receipt Content */}
            <div className="space-y-6 text-slate-700 font-sans print:text-black">
              {/* Slip Brand */}
              <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                <h3 className="font-black text-xl text-[#1a73e8] tracking-wider uppercase print:text-black">Medi Flow HMS</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Queens Road, Lahore, Pakistan | Phone: +92-42-111-222-333</p>
                <p className="text-[11px] font-bold tracking-widest text-slate-700 bg-slate-100 py-1 rounded inline-block px-4">OFFICIAL BILLING RECEIPT</p>
              </div>

              {/* Patient/Receipt Meta info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p><span className="text-slate-400 font-medium">Invoice No:</span> <b className="text-slate-800">{selectedInvoice.invoice_number}</b></p>
                  <p><span className="text-slate-400 font-medium">Date:</span> <b>{new Date(selectedInvoice.created_at).toLocaleString("en-PK")}</b></p>
                  <p><span className="text-slate-400 font-medium">Status:</span> <b>{selectedInvoice.status}</b></p>
                </div>
                <div className="space-y-1">
                  <p><span className="text-slate-400 font-medium">Patient Name:</span> <b>{selectedInvoice.patient_detail?.first_name} {selectedInvoice.patient_detail?.last_name}</b></p>
                  <p><span className="text-slate-400 font-medium">MRN:</span> <b className="font-mono">{selectedInvoice.patient_detail?.mrn}</b></p>
                  <p><span className="text-slate-400 font-medium">Contact:</span> <b>{selectedInvoice.patient_detail?.phone}</b></p>
                </div>
              </div>

              {/* Invoice items table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 font-bold bg-slate-50 print:bg-slate-100">
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block">{item.description}</span>
                        <span className="text-[9px] text-slate-400">{item.item_type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">Rs. {parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">Rs. {parseFloat(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total calculations */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>Rs. {parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.discount) > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- Rs. {parseFloat(selectedInvoice.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-slate-800 border-t-2 border-slate-300 pt-2 text-sm">
                    <span>Net Total:</span>
                    <span>Rs. {parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signature area */}
              <div className="grid grid-cols-2 gap-4 pt-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 mx-8 pt-1">Reception Desk Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 mx-8 pt-1">Patient/Guardian Signature</div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[9px] text-slate-400 text-center leading-normal pt-4">
                Thank you for choosing Medi Flow Enterprise HMS.<br/>
                This is a computer generated invoice and does not strictly require physical signatures to be valid.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NEW INVOICE MODAL */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-6 rounded-2xl border border-slate-200 shadow-2xl relative">
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowNewInvoiceModal(false);
                setNewInvoiceStep(1);
                setSelectedPatientForInvoice(null);
                setPatientSearch("");
                setPatientResults([]);
                setNewInvoiceItems([{ description: "", quantity: 1, unit_price: "" }]);
                setNewInvoiceTaxPercent("0");
                setNewInvoiceDiscount("0");
                setSelectedAppointmentForInvoice("");
                setSelectedAdmissionForInvoice("");
                setSelectedPanelForInvoice("");
                setCreatedInvoiceResult(null);
                setNewInvoiceError(null);
                setPaymentMode("CASH");
                setNewInvoiceNotes("");
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-3">
              <Receipt className="text-teal-600" /> Create New Invoice
            </h3>

            {/* Step Indicators */}
            {!createdInvoiceResult && (
              <div className="flex items-center justify-between mb-6 text-xs font-semibold text-slate-400 max-w-md mx-auto">
                {[
                  { step: 1, label: "Patient Select" },
                  { step: 2, label: "Invoice Items" },
                  { step: 3, label: "Link & Corporate" },
                  { step: 4, label: "Review & Submit" }
                ].map((s) => (
                  <React.Fragment key={s.step}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] ${newInvoiceStep === s.step ? "bg-teal-600 border-teal-600 text-white font-bold" : newInvoiceStep > s.step ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-white border-slate-200 text-slate-400"}`}>
                        {s.step}
                      </span>
                      <span className={newInvoiceStep === s.step ? "text-slate-800 font-bold" : ""}>{s.label}</span>
                    </div>
                    {s.step < 4 && <div className={`flex-1 h-0.5 mx-2 ${newInvoiceStep > s.step ? "bg-teal-200" : "bg-slate-100"}`} />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Step Contents */}
            {newInvoiceError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600" />
                <span>{newInvoiceError}</span>
              </div>
            )}

            {/* STEP 1: PATIENT SELECT */}
            {newInvoiceStep === 1 && !createdInvoiceResult && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1">Search Patient by Name or MRN</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Type MRN (e.g. HMS-PAT-...) or name..." 
                      className="w-full pl-9 pr-3 py-2 text-xs google-input"
                      value={patientSearch}
                      onChange={(e) => handleSearchPatient(e.target.value)}
                    />
                  </div>
                </div>

                {searchingPatients && <div className="text-center py-4 text-xs text-slate-400 animate-pulse">Searching matching patient logs...</div>}

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
                  {patientResults.length === 0 && !searchingPatients && patientSearch.trim().length >= 2 && (
                    <div className="text-center py-8 text-xs text-slate-400">No patients matched this search.</div>
                  )}
                  {patientResults.map((pat) => (
                    <div 
                      key={pat.id} 
                      onClick={() => handleSelectPatient(pat)}
                      className="p-3 flex justify-between items-center hover:bg-[#f4f8fd] cursor-pointer transition-all text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-700">{pat.first_name} {pat.last_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pat.mrn}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-600">{pat.phone}</p>
                        <p className="text-[10px] text-slate-400">{pat.gender === "M" ? "Male" : "Female"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPatientForInvoice && (
                  <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block">Selected Patient Profile</span>
                        <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedPatientForInvoice.first_name} {selectedPatientForInvoice.last_name}</h4>
                        <p className="text-slate-500 font-mono mt-0.5">MRN: {selectedPatientForInvoice.mrn}</p>
                        <p className="text-slate-500 mt-0.5">Phone: {selectedPatientForInvoice.phone}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedPatientForInvoice(null)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 underline animate-pulse"
                      >
                        Change Patient
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <button
                    disabled={!selectedPatientForInvoice}
                    onClick={() => setNewInvoiceStep(2)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center gap-1"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: INVOICE ITEMS */}
            {newInvoiceStep === 2 && !createdInvoiceResult && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500 font-bold">Patient: <b className="text-slate-700">{selectedPatientForInvoice.first_name} {selectedPatientForInvoice.last_name} ({selectedPatientForInvoice.mrn})</b></span>
                  <button
                    onClick={handleAddItemRow}
                    className="text-teal-600 hover:text-teal-700 font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <Plus size={14} /> Add Charge Item
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {newInvoiceItems.map((item, index) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="col-span-6">
                          <input 
                            type="text" 
                            placeholder="Description (e.g. Consultation, Lab report, Syringe)"
                            className="w-full text-xs google-input"
                            required
                            value={item.description}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            type="number" 
                            placeholder="Qty"
                            min="1"
                            className="w-full text-xs google-input text-center"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            type="number" 
                            placeholder="Rate"
                            min="0"
                            className="w-full text-xs google-input text-right"
                            required
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1.5 text-right text-xs font-bold text-slate-700">
                          Rs. {amount.toFixed(2)}
                        </div>
                        <div className="col-span-0.5 text-center">
                          <button 
                            onClick={() => handleRemoveItemRow(index)}
                            disabled={newInvoiceItems.length === 1}
                            className="text-rose-500 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calculations Box */}
                <div className="bg-[#f4f8fd] p-4 rounded-xl border border-blue-100/50 space-y-3 text-xs">
                  <div className="flex justify-between font-semibold text-slate-600">
                    <span>Subtotal:</span>
                    <span>Rs. {newSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Tax (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full p-2 bg-white border text-xs rounded-lg focus:outline-none"
                        value={newInvoiceTaxPercent}
                        onChange={(e) => setNewInvoiceTaxPercent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Discount (Rs.)</label>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full p-2 bg-white border text-xs rounded-lg focus:outline-none"
                        value={newInvoiceDiscount}
                        onChange={(e) => setNewInvoiceDiscount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-200/60 pt-2 flex justify-between font-bold text-slate-800 text-sm">
                    <span>Total Amount:</span>
                    <span>Rs. {newTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button
                    onClick={() => setNewInvoiceStep(1)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all"
                  >
                    Back
                  </button>
                  <button
                    disabled={newSubtotal <= 0 || newInvoiceItems.some(i => !i.description)}
                    onClick={() => setNewInvoiceStep(3)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center gap-1"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: LINK & CORPORATE */}
            {newInvoiceStep === 3 && !createdInvoiceResult && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-semibold mb-2">Patient: <b className="text-slate-700">{selectedPatientForInvoice.first_name} {selectedPatientForInvoice.last_name}</b></p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Link to Appointment (Optional)</label>
                    <select
                      value={selectedAppointmentForInvoice}
                      onChange={(e) => setSelectedAppointmentForInvoice(e.target.value)}
                      className="w-full border p-2 bg-white rounded-lg focus:outline-none text-xs"
                    >
                      <option value="">-- No Appointment (Walk-in / Other) --</option>
                      {patientAppointments.map(appt => (
                        <option key={appt.id} value={appt.id}>
                          Appt on {new Date(appt.appointment_date).toLocaleDateString("en-PK")} at {appt.start_time} - Dr. {appt.doctor_details?.user?.first_name} {appt.doctor_details?.user?.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Link to Admission (Optional)</label>
                    <select
                      value={selectedAdmissionForInvoice}
                      onChange={(e) => setSelectedAdmissionForInvoice(e.target.value)}
                      className="w-full border p-2 bg-white rounded-lg focus:outline-none text-xs"
                    >
                      <option value="">-- No Active Admission --</option>
                      {patientAdmissions.map(adm => (
                        <option key={adm.id} value={adm.id}>
                          Admission on {new Date(adm.admission_date).toLocaleDateString("en-PK")} ({adm.status}) - Bed {adm.bed_details?.bed_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Corporate Panel / Insurance (Optional)</label>
                    <select
                      value={selectedPanelForInvoice}
                      onChange={(e) => handlePanelChange(e.target.value)}
                      className="w-full border p-2 bg-white rounded-lg focus:outline-none text-xs"
                    >
                      <option value="">-- No Panel (Self Pay) --</option>
                      {panels.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.discount_percentage)}% discount)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button
                    onClick={() => setNewInvoiceStep(2)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setNewInvoiceStep(4)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all flex items-center gap-1.5"
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & SUBMIT */}
            {newInvoiceStep === 4 && !createdInvoiceResult && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-slate-800 text-sm border-b pb-2">Invoice Summary Review</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <p><span className="text-slate-400">Patient:</span> <b className="text-slate-700">{selectedPatientForInvoice.first_name} {selectedPatientForInvoice.last_name}</b></p>
                    <p><span className="text-slate-400">MRN:</span> <b className="text-slate-700 font-mono">{selectedPatientForInvoice.mrn}</b></p>
                    <p><span className="text-slate-400">Contact:</span> <b className="text-slate-700">{selectedPatientForInvoice.phone}</b></p>
                  </div>
                  <div className="space-y-1.5">
                    <p>
                      <span className="text-slate-400">Linked Appt:</span>{" "}
                      <b className="text-slate-700">
                        {selectedAppointmentForInvoice 
                          ? `Appt ID #${selectedAppointmentForInvoice}`
                          : "None"}
                      </b>
                    </p>
                    <p>
                      <span className="text-slate-400">Linked Admission:</span>{" "}
                      <b className="text-slate-700">
                        {selectedAdmissionForInvoice 
                          ? `Admission ID #${selectedAdmissionForInvoice}`
                          : "None"}
                      </b>
                    </p>
                    <p>
                      <span className="text-slate-400 font-medium">Corporate Panel:</span>{" "}
                      <b className="text-slate-700">
                        {selectedPanelForInvoice 
                          ? panels.find(p => p.id === parseInt(selectedPanelForInvoice))?.name
                          : "None (Self Pay)"}
                      </b>
                    </p>
                  </div>
                </div>

                {/* Charge Items */}
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700">Charge Breakdown</p>
                  <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                    {newInvoiceItems.map((item, index) => (
                      <div key={index} className="py-2 flex justify-between">
                        <div>
                          <p className="font-semibold text-slate-700">{item.description}</p>
                          <p className="text-[10px] text-slate-400">Qty {item.quantity} x Rs. {parseFloat(item.unit_price || 0).toFixed(2)}</p>
                        </div>
                        <span className="font-bold text-slate-800">Rs. {(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Mode & Notes Selection */}
                <div className="grid grid-cols-2 gap-4 border-t pt-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 font-semibold text-slate-700">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Select Payment Mode *</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full border p-2 bg-white rounded-lg focus:outline-none text-[11px]"
                      required
                    >
                      <option value="CASH">Cash Payment</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="JAZZCASH">JazzCash Wallet</option>
                      <option value="EASYPAISA">EasyPaisa Wallet</option>
                      <option value="PANEL">Corporate Panel Split</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Add Billing Notes (Optional)</label>
                    <textarea
                      placeholder="Add checkout details or receipt memo..."
                      rows={2}
                      value={newInvoiceNotes}
                      onChange={(e) => setNewInvoiceNotes(e.target.value)}
                      className="w-full border p-2 bg-white rounded-lg focus:outline-none text-[11px]"
                    />
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="border-t pt-2 space-y-1.5 text-right font-medium text-slate-600">
                  <p>Subtotal: <span className="text-slate-800 font-semibold ml-2">Rs. {newSubtotal.toFixed(2)}</span></p>
                  {newTaxAmount > 0 && <p>Tax ({taxPercent}%): <span className="text-slate-800 font-semibold ml-2">Rs. {newTaxAmount.toFixed(2)}</span></p>}
                  {newDiscount > 0 && <p className="text-rose-600">Discount: <span className="font-semibold ml-2">- Rs. {newDiscount.toFixed(2)}</span></p>}
                  <p className="text-slate-800 font-bold text-sm">Grand Total: <span className="text-teal-600 font-black ml-2 text-base">Rs. {newTotal.toFixed(2)}</span></p>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button
                    disabled={creatingInvoice}
                    onClick={() => setNewInvoiceStep(3)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    Back
                  </button>
                  <button
                    disabled={creatingInvoice}
                    onClick={handleSubmitNewInvoice}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:bg-slate-300"
                  >
                    {creatingInvoice ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Generating Invoice...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate & Record Invoice</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS STATE */}
            {createdInvoiceResult && (
              <div className="space-y-6 text-center py-6">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-slate-800">Invoice Created Successfully!</h4>
                  <p className="text-xs text-slate-500">Invoice Number: <b className="text-slate-800 font-mono text-sm">{createdInvoiceResult.invoice_number}</b></p>
                  <p className="text-xs text-slate-400">Total Charged Amount: <b>Rs. {parseFloat(createdInvoiceResult.total_amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</b></p>
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => {
                      setSelectedInvoice(createdInvoiceResult);
                      setShowReceipt(true);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Printer size={14} /> Print Receipt Slip
                  </button>
                  <button
                    onClick={() => {
                      setShowNewInvoiceModal(false);
                      setNewInvoiceStep(1);
                      setSelectedPatientForInvoice(null);
                      setPatientSearch("");
                      setPatientResults([]);
                      setNewInvoiceItems([{ description: "", quantity: 1, unit_price: "" }]);
                      setNewInvoiceTaxPercent("0");
                      setNewInvoiceDiscount("0");
                      setSelectedAppointmentForInvoice("");
                      setSelectedAdmissionForInvoice("");
                      setSelectedPanelForInvoice("");
                      setCreatedInvoiceResult(null);
                      setNewInvoiceError(null);
                      setPaymentMode("CASH");
                      setNewInvoiceNotes("");
                      fetchInvoices(1);
                    }}
                    className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-xl text-xs font-semibold transition-all shadow-sm"
                  >
                    Done / Close Desk
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
