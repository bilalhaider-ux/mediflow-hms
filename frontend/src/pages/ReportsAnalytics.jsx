import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Pill, 
  UserSquare2, 
  FileText, 
  Download, 
  Calendar,
  AlertCircle,
  Activity,
  CheckCircle2,
  CalendarCheck,
  TrendingDown,
  RefreshCw
} from "lucide-react";

export const ReportsAnalytics = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("revenue");
  const [loading, setLoading] = useState(false);

  // Month + Year Selector State (used in Tab 1 and Tab 4)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Tab 1: Revenue Report States
  const [invoiceStats, setInvoiceStats] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });
  const [doctorShares, setDoctorShares] = useState([]);

  // Tab 2: Patient Footfall States
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [footfallStats, setFootfallStats] = useState({
    newPatients: 0,
    returning: 0,
    totalVisits: 0
  });
  const [footfallChart, setFootfallChart] = useState([]);

  // Tab 3: Pharmacy Stock States
  const [stockFilter, setStockFilter] = useState("ALL");
  const [medicinesData, setMedicinesData] = useState([]);

  // Tab 4: Doctor Performance States
  const [doctorPerformance, setDoctorPerformance] = useState([]);

  // Fetch Tab 1: Revenue Report
  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const invRes = await apiFetch(`/invoices/?month=${selectedMonth}&year=${selectedYear}`);
      const sharesRes = await apiFetch(`/hr/fee-shares/?month=${selectedMonth}&year=${selectedYear}`);

      if (invRes.ok && sharesRes.ok) {
        const invData = await invRes.json();
        const invoicesList = toArray(invData);
        const totalCount = invData.count !== undefined ? invData.count : invoicesList.length;

        let totalRev = 0;
        let paid = 0;
        let pending = 0;
        let overdue = 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        invoicesList.forEach(inv => {
          const totalAmt = parseFloat(inv.total_amount || 0);
          if (inv.status === "PAID") {
            totalRev += totalAmt;
            paid++;
          } else if (inv.status === "PENDING" || inv.status === "PARTIALLY_PAID") {
            pending++;
            const created = new Date(inv.created_at);
            if (created < sevenDaysAgo) {
              overdue++;
            }
          }
        });

        setInvoiceStats({
          totalRevenue: totalRev,
          totalInvoices: totalCount,
          paidCount: paid,
          pendingCount: pending,
          overdueCount: overdue
        });

        const sharesData = await sharesRes.json();
        const sharesList = toArray(sharesData);

        const docMap = {};
        sharesList.forEach(share => {
          const docId = share.doctor;
          const docName = `Dr. ${share.doctor_details?.user_details?.first_name || ""} ${share.doctor_details?.user_details?.last_name || ""}`;
          
          if (!docMap[docId]) {
            docMap[docId] = {
              name: docName,
              patientsSeen: 0,
              revenue: 0,
              share: 0
            };
          }
          docMap[docId].patientsSeen += 1;
          docMap[docId].revenue += parseFloat(share.consultation_fee || 0);
          docMap[docId].share += parseFloat(share.doctor_share || 0);
        });

        setDoctorShares(Object.values(docMap));
      }
    } catch (err) {
      console.error("Error loading revenue reports:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tab 2: Patient Footfall
  const fetchFootfallData = async () => {
    setLoading(true);
    try {
      const patRes = await apiFetch(`/patients/?created_after=${startDate}&created_before=${endDate}`);
      const apptRes = await apiFetch(`/appointments/?date_after=${startDate}&date_before=${endDate}`);
      
      if (patRes.ok && apptRes.ok) {
        const patData = await patRes.json();
        const apptData = await apptRes.json();
        
        const newPatientsList = toArray(patData);
        const appointmentsList = toArray(apptData);

        const newPats = patData.count !== undefined ? patData.count : newPatientsList.length;
        const totalVisits = apptData.count !== undefined ? apptData.count : appointmentsList.length;
        const returningPats = Math.max(0, totalVisits - newPats);

        setFootfallStats({
          newPatients: newPats,
          returning: returningPats,
          totalVisits: totalVisits
        });

        // Generate Daily Chart Data
        const dateMap = {};
        let curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
          const dateString = curr.toISOString().split("T")[0];
          dateMap[dateString] = 0;
          curr.setDate(curr.getDate() + 1);
        }

        appointmentsList.forEach(appt => {
          const dateStr = appt.appointment_date;
          if (dateMap[dateStr] !== undefined) {
            dateMap[dateStr] += 1;
          }
        });

        const sortedChartData = Object.entries(dateMap).map(([date, count]) => {
          const formattedDate = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return { date: formattedDate, count };
        }).slice(-10); // Show last 10 days for clarity
        
        setFootfallChart(sortedChartData);
      }
    } catch (err) {
      console.error("Error loading footfall reports:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tab 3: Pharmacy Stock Report
  const fetchPharmacyStock = async () => {
    setLoading(true);
    try {
      const medRes = await apiFetch("/pharmacy/medicines/");
      const batchRes = await apiFetch("/pharmacy/batches/");
      
      if (medRes.ok && batchRes.ok) {
        const meds = toArray(await medRes.json());
        const batchesList = toArray(await batchRes.json());

        const computed = meds.map(med => {
          const medBatches = batchesList.filter(b => b.medicine === med.id);
          const stock = medBatches.reduce((sum, b) => sum + (parseInt(b.quantity_remaining) || 0), 0);
          
          const now = new Date();
          const hasExpired = medBatches.some(b => new Date(b.expiry_date) < now);
          
          let status = "OK";
          if (hasExpired) {
            status = "EXPIRED";
          } else if (stock === 0) {
            status = "CRITICAL";
          } else if (stock < 50) {
            status = "LOW";
          }

          const expiryDates = medBatches.map(b => new Date(b.expiry_date)).filter(d => !isNaN(d.getTime()));
          const earliestExpiry = expiryDates.length > 0 
            ? new Date(Math.min(...expiryDates)).toLocaleDateString("en-PK") 
            : "N/A";

          return {
            id: med.id,
            name: med.name,
            generic_name: med.generic_name,
            stock,
            reorderLevel: 50,
            expiry: earliestExpiry,
            status
          };
        });

        setMedicinesData(computed);
      }
    } catch (err) {
      console.error("Error loading pharmacy stock report:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tab 4: Doctor Performance
  const fetchDoctorPerformance = async () => {
    setLoading(true);
    try {
      const apptRes = await apiFetch(`/appointments/?month=${selectedMonth}&year=${selectedYear}`);
      const doctorsRes = await apiFetch("/doctors/");
      const sharesRes = await apiFetch(`/hr/fee-shares/?month=${selectedMonth}&year=${selectedYear}`);

      if (apptRes.ok && doctorsRes.ok && sharesRes.ok) {
        const apptsList = toArray(await apptRes.json());
        const docsList = toArray(await doctorsRes.json());
        const sharesList = toArray(await sharesRes.json());

        const docMap = {};
        docsList.forEach(d => {
          const fullName = `Dr. ${d.user_details?.first_name || ""} ${d.user_details?.last_name || d.specialty}`;
          docMap[d.id] = {
            name: fullName,
            appointmentsCount: 0,
            completedCount: 0,
            cancelledCount: 0,
            revenue: 0
          };
        });

        apptsList.forEach(appt => {
          const docId = appt.doctor;
          if (docMap[docId]) {
            docMap[docId].appointmentsCount += 1;
            if (appt.status === "COMPLETED") {
              docMap[docId].completedCount += 1;
            } else if (appt.status === "CANCELLED") {
              docMap[docId].cancelledCount += 1;
            }
          }
        });

        sharesList.forEach(share => {
          const docId = share.doctor;
          if (docMap[docId]) {
            docMap[docId].revenue += parseFloat(share.consultation_fee || 0);
          }
        });

        setDoctorPerformance(Object.values(docMap));
      }
    } catch (err) {
      console.error("Error loading doctor performance reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "revenue") {
      fetchRevenueData();
    } else if (activeTab === "footfall") {
      fetchFootfallData();
    } else if (activeTab === "pharmacy") {
      fetchPharmacyStock();
    } else if (activeTab === "doctor") {
      fetchDoctorPerformance();
    }
  }, [activeTab, selectedMonth, selectedYear, startDate, endDate]);

  const handleExportPDF = async () => {
    try {
      const res = await apiFetch(`/admin/exports/financial-report/?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial_report_${selectedMonth}_${selectedYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to export PDF report. Please verify administrator rights.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during PDF generation.");
    }
  };

  if (user?.role !== "ADMIN" && user?.role !== "SUB_ADMIN") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-semibold text-slate-500">
        Access Denied. You do not have permission to view Reports & Analytics.
      </div>
    );
  }

  const getStockBadgeClass = (status) => {
    switch (status) {
      case "OK":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOW":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "EXPIRED":
        return "bg-slate-100 text-slate-600 border-slate-300";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const maxChartCount = Math.max(...footfallChart.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-teal-600" /> Reports & Analytics Desk
          </h2>
          <p className="text-slate-500 text-xs mt-1">Monitor operational metrics, doctor fee splits, patient traffic, and pharmacy stock levels.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        {[
          { id: "revenue", label: "Revenue Report", icon: <TrendingUp size={14} /> },
          { id: "footfall", label: "Patient Footfall", icon: <Users size={14} /> },
          { id: "pharmacy", label: "Pharmacy Stock", icon: <Pill size={14} /> },
          { id: "doctor", label: "Doctor Performance", icon: <UserSquare2 size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-teal-600 text-teal-700 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: REVENUE REPORT */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {/* Selectors & Export */}
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs justify-between">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Calendar className="text-teal-600 shrink-0" size={16} />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>{new Date(2020, m-1, 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            
            <button
              onClick={handleExportPDF}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold px-3.5 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-sm"
            >
              <Download size={14} />
              <span>Export Financial PDF</span>
            </button>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: "Total Revenue", val: `Rs. ${invoiceStats.totalRevenue.toLocaleString()}`, color: "bg-teal-50 text-teal-700", icon: <TrendingUp size={18} /> },
              { label: "Total Invoices", val: invoiceStats.totalInvoices, color: "bg-blue-50 text-blue-700", icon: <FileText size={18} /> },
              { label: "Paid", val: invoiceStats.paidCount, color: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 size={18} /> },
              { label: "Pending", val: invoiceStats.pendingCount, color: "bg-amber-50 text-amber-700", icon: <AlertCircle size={18} /> },
              { label: "Overdue", val: invoiceStats.overdueCount, color: "bg-red-50 text-red-700", icon: <TrendingDown size={18} /> }
            ].map((card, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
                <div className={`${card.color} p-2 rounded-lg`}>{card.icon}</div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                  <p className="text-base font-extrabold text-slate-800 mt-0.5">{card.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Doctor splits table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <UserSquare2 className="text-teal-600" size={18} /> Doctor Consultation Splits & Payouts
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-2">Doctor</th>
                    <th className="py-2.5 px-2 text-center">Patients Seen</th>
                    <th className="py-2.5 px-2 text-right">Billed</th>
                    <th className="py-2.5 px-2 text-right">Doctor Share</th>
                    <th className="py-2.5 px-2 text-right">Hospital Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">Loading payout details...</td>
                    </tr>
                  ) : doctorShares.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">No settled fee shares found for the selected period.</td>
                    </tr>
                  ) : (
                    doctorShares.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2 font-bold text-slate-800">{doc.name}</td>
                        <td className="py-3 px-2 text-center text-slate-600">{doc.patientsSeen}</td>
                        <td className="py-3 px-2 text-right">Rs. {doc.revenue.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right text-teal-600 font-bold">Rs. {doc.share.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right text-slate-500">Rs. {(doc.revenue - doc.share).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT FOOTFALL */}
      {activeTab === "footfall" && (
        <div className="space-y-6">
          {/* Date Range Pickers */}
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-slate-400 font-bold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 font-semibold focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-slate-400 font-bold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "New Patients", val: footfallStats.newPatients, color: "bg-teal-50 text-teal-700", icon: <Users size={18} /> },
              { label: "Returning Patients", val: footfallStats.returning, color: "bg-blue-50 text-blue-700", icon: <RefreshCw size={18} /> },
              { label: "Total Visits", val: footfallStats.totalVisits, color: "bg-indigo-50 text-indigo-700", icon: <CalendarCheck size={18} /> }
            ].map((card, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className={`${card.color} p-2.5 rounded-lg`}>{card.icon}</div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                  <p className="text-base font-extrabold text-slate-800 mt-0.5">{card.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pure CSS Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity className="text-teal-600" size={18} /> Daily Patient Footfall (Last 10 Days in Range)
            </h3>

            {loading ? (
              <div className="text-center py-20 text-slate-400 text-xs animate-pulse">Computing chart metrics...</div>
            ) : footfallChart.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">No footfall recorded in this range.</div>
            ) : (
              <div className="pt-6 pb-2">
                <div className="flex items-end justify-between h-48 border-b border-slate-200 px-4">
                  {footfallChart.map((d, i) => {
                    const heightPercent = (d.count / maxChartCount) * 100;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 font-mono shadow-md">
                          {d.count} visits
                        </div>
                        {/* CSS Bar */}
                        <div 
                          style={{ height: `${Math.max(5, heightPercent)}%` }} 
                          className="w-6 sm:w-10 bg-teal-500 hover:bg-teal-600 rounded-t-md transition-all duration-300 shadow-xs cursor-pointer"
                        ></div>
                        {/* Label */}
                        <span className="text-[9px] text-slate-400 mt-2 font-bold select-none text-center truncate w-full">{d.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PHARMACY STOCK REPORT */}
      {activeTab === "pharmacy" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <span className="text-slate-400 font-bold">Filter Alert Level:</span>
            <div className="flex space-x-1.5">
              {["ALL", "LOW", "CRITICAL", "EXPIRED"].map(f => (
                <button
                  key={f}
                  onClick={() => setStockFilter(f)}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all ${
                    stockFilter === f
                      ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Medicines Stock Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3">Generic Name</th>
                    <th className="py-2.5 px-3 text-center">Remaining Stock</th>
                    <th className="py-2.5 px-3 text-center">Reorder Trigger</th>
                    <th className="py-2.5 px-3">Earliest Expiry</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 animate-pulse">Correlating stock items...</td>
                    </tr>
                  ) : medicinesData.filter(m => stockFilter === "ALL" || m.status === stockFilter).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">No stock records matching the filter.</td>
                    </tr>
                  ) : (
                    medicinesData
                      .filter(m => stockFilter === "ALL" || m.status === stockFilter)
                      .map((med) => (
                        <tr key={med.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-bold text-teal-700">{med.name}</td>
                          <td className="py-3 px-3 text-slate-500 italic">{med.generic_name}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">{med.stock} units</td>
                          <td className="py-3 px-3 text-center text-slate-400">{med.reorderLevel} units</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{med.expiry}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block border text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${getStockBadgeClass(med.status)}`}>
                              {med.status}
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
      )}

      {/* TAB 4: DOCTOR PERFORMANCE */}
      {activeTab === "doctor" && (
        <div className="space-y-6">
          {/* Selectors */}
          <div className="flex items-center space-x-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <Calendar className="text-teal-600 shrink-0" size={16} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{new Date(2020, m-1, 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* Performance Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3 text-center">Appointments Requested</th>
                    <th className="py-2.5 px-3 text-center">Completed Visits</th>
                    <th className="py-2.5 px-3 text-center">Cancelled Visits</th>
                    <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 animate-pulse">Aggregating appointments...</td>
                    </tr>
                  ) : doctorPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">No performance records found.</td>
                    </tr>
                  ) : (
                    doctorPerformance.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-800">{doc.name}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{doc.appointmentsCount}</td>
                        <td className="py-3 px-3 text-center text-emerald-600 font-bold">{doc.completedCount}</td>
                        <td className="py-3 px-3 text-center text-rose-500">{doc.cancelledCount}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-800">Rs. {doc.revenue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
