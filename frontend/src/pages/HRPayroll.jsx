import React, { useState, useEffect } from "react";
import { apiFetch, toArray } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { 
  Users, 
  CalendarDays, 
  Clock, 
  FileSpreadsheet, 
  UserSquare2, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Play,
  ClipboardList,
  Plus,
  Trash2,
  Edit2,
  X
} from "lucide-react";

export const HRPayroll = () => {
  const { user } = useAuth();
  
  // Tab State
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.pathname === "/staff-management" ? "staff_directory" : "attendance"
  );

  useEffect(() => {
    if (location.pathname === "/staff-management") {
      setActiveTab("staff_directory");
    } else if (location.pathname === "/hr-payroll") {
      setActiveTab("attendance");
    }
  }, [location.pathname]);
  
  // Attendance States
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attStats, setAttStats] = useState({ present: 0, late: 0 });
  const [clocking, setClocking] = useState(false);
  
  // Doctor Share States
  const [shares, setShares] = useState([]);
  const [totalShareAmt, setTotalShareAmt] = useState(0);

  // Payroll States
  const [payrollSlips, setPayrollSlips] = useState([]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollSuccess, setPayrollSuccess] = useState(null);

  // Staff Directory States
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffFormData, setStaffFormData] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "RECEPTIONIST",
    branch: "",
    department: "",
    designation: "Receptionist",
    base_salary: "40000"
  });
  const [staffFormError, setStaffFormError] = useState("");
  const [staffFormSuccess, setStaffFormSuccess] = useState("");
  const [staffModalLoading, setStaffModalLoading] = useState(false);

  const fetchStaffData = async () => {
    try {
      const [staffRes, deptsRes, branchesRes] = await Promise.all([
        apiFetch("/staff/"),
        apiFetch("/departments/"),
        apiFetch("/branches/")
      ]);
      if (staffRes.ok) setStaffList(toArray(await staffRes.json()));
      if (deptsRes.ok) setDepartments(toArray(await deptsRes.json()));
      if (branchesRes.ok) setBranches(toArray(await branchesRes.json()));
    } catch (err) {
      console.error("Error fetching staff directory data:", err);
    }
  };

  const handleOpenAddStaffModal = () => {
    setEditingStaff(null);
    setStaffFormData({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      role: "RECEPTIONIST",
      branch: branches.length > 0 ? branches[0].id.toString() : "",
      department: departments.length > 0 ? departments[0].id.toString() : "",
      designation: "Receptionist",
      base_salary: "40000"
    });
    setStaffFormError("");
    setStaffFormSuccess("");
    setShowStaffModal(true);
  };

  const handleOpenEditStaffModal = (staff) => {
    setEditingStaff(staff);
    setStaffFormData({
      username: staff.user_details?.username || "",
      password: "",
      first_name: staff.user_details?.first_name || "",
      last_name: staff.user_details?.last_name || "",
      phone_number: staff.user_details?.phone_number || "",
      role: staff.user_details?.role || "RECEPTIONIST",
      branch: staff.user_details?.branch ? staff.user_details.branch.toString() : "",
      department: staff.department ? staff.department.toString() : "",
      designation: staff.designation || "",
      base_salary: parseInt(staff.base_salary || 0).toString()
    });
    setStaffFormError("");
    setStaffFormSuccess("");
    setShowStaffModal(true);
  };

  const handleDeleteStaff = async (staff) => {
    const fullName = `${staff.user_details?.first_name} ${staff.user_details?.last_name}`;
    if (!window.confirm(`Are you sure you want to delete ${fullName} profile and user account?`)) return;
    try {
      const staffDel = await apiFetch(`/staff/${staff.id}/`, { method: "DELETE" });
      if (staffDel.ok) {
        await apiFetch(`/auth/users/${staff.user}/`, { method: "DELETE" });
        alert("Staff profile deleted successfully.");
        fetchStaffData();
      } else {
        alert("Failed to delete staff profile.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffFormError("");
    setStaffFormSuccess("");
    setStaffModalLoading(true);

    try {
      if (editingStaff) {
        const userUpdate = await apiFetch(`/auth/users/${editingStaff.user}/`, {
          method: "PATCH",
          body: JSON.stringify({
            first_name: staffFormData.first_name,
            last_name: staffFormData.last_name,
            phone_number: staffFormData.phone_number,
            branch: staffFormData.branch ? parseInt(staffFormData.branch) : null
          })
        });
        if (!userUpdate.ok) throw new Error("Failed to update user details.");

        const staffUpdate = await apiFetch(`/staff/${editingStaff.id}/`, {
          method: "PUT",
          body: JSON.stringify({
            user: editingStaff.user,
            department: staffFormData.department ? parseInt(staffFormData.department) : null,
            designation: staffFormData.designation,
            base_salary: parseFloat(staffFormData.base_salary)
          })
        });
        if (!staffUpdate.ok) throw new Error("Failed to update staff profile.");

        setStaffFormSuccess("Staff profile updated successfully!");
      } else {
        const userCreate = await apiFetch("/auth/users/", {
          method: "POST",
          body: JSON.stringify({
            username: staffFormData.username,
            password: staffFormData.password,
            first_name: staffFormData.first_name,
            last_name: staffFormData.last_name,
            role: staffFormData.role,
            phone_number: staffFormData.phone_number,
            branch: staffFormData.branch ? parseInt(staffFormData.branch) : null
          })
        });
        if (!userCreate.ok) {
          const errData = await userCreate.json();
          throw new Error(errData.username || "Failed to create user account.");
        }
        const newUser = await userCreate.json();

        const staffCreate = await apiFetch("/staff/", {
          method: "POST",
          body: JSON.stringify({
            user: newUser.id,
            department: staffFormData.department ? parseInt(staffFormData.department) : null,
            designation: staffFormData.designation,
            base_salary: parseFloat(staffFormData.base_salary)
          })
        });
        if (!staffCreate.ok) throw new Error("Failed to create staff profile.");

        setStaffFormSuccess("Staff profile and user account created successfully!");
      }

      await fetchStaffData();
      setTimeout(() => setShowStaffModal(false), 1500);
    } catch (err) {
      setStaffFormError(err.message);
    } finally {
      setStaffModalLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await apiFetch("/hr/attendance/");
      if (res.ok) {
        const data = toArray(await res.json());
        setAttendanceLogs(data);
        
        // Find today's log
        const todayStr = new Date().toISOString().split("T")[0];
        const todayLog = data.find(log => log.date === todayStr);
        setTodayAttendance(todayLog || null);

        // Stats calculation
        const present = data.filter(l => l.status === "PRESENT").length;
        const late = data.filter(l => l.status === "LATE").length;
        setAttStats({ present, late });
      }
    } catch (err) {
      console.error("Error fetching attendance logs:", err);
    }
  };

  const fetchShares = async () => {
    try {
      const res = await apiFetch("/hr/fee-shares/");
      if (res.ok) {
        const data = toArray(await res.json());
        setShares(data);
        const total = data.reduce((sum, s) => sum + parseFloat(s.doctor_share), 0);
        setTotalShareAmt(total);
      }
    } catch (err) {
      console.error("Error fetching doctor fee shares:", err);
    }
  };

  const fetchPayroll = async () => {
    try {
      const res = await apiFetch("/hr/payroll/");
      if (res.ok) {
        const data = toArray(await res.json());
        setPayrollSlips(data);
      }
    } catch (err) {
      console.error("Error fetching payroll slips:", err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    if (user?.role === "DOCTOR" || user?.role === "ADMIN" || user?.role === "SUB_ADMIN") {
      fetchShares();
    }
    fetchPayroll();
    if (user?.role === "ADMIN" || user?.role === "SUB_ADMIN") {
      fetchStaffData();
    }
  }, [user]);

  const handleClockIn = async () => {
    setClocking(true);
    try {
      const res = await apiFetch("/hr/attendance/clock_in/", { method: "POST" });
      if (res.ok) {
        await fetchAttendance();
      } else {
        const err = await res.json();
        alert(err.error || "Clock in failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      const res = await apiFetch("/hr/attendance/clock_out/", { method: "POST" });
      if (res.ok) {
        await fetchAttendance();
      } else {
        const err = await res.json();
        alert(err.error || "Clock out failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClocking(false);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setPayrollLoading(true);
    setPayrollSuccess(null);
    try {
      const res = await apiFetch("/hr/payroll/generate_monthly_payroll/", {
        method: "POST",
        body: JSON.stringify({
          month: payrollMonth,
          year: payrollYear
        })
      });

      if (res.ok) {
        setPayrollSuccess(`Successfully generated payroll sheets for month ${payrollMonth}/${payrollYear}.`);
        await fetchPayroll();
      } else {
        alert("Failed to calculate monthly payroll splits.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleMarkPayrollPaid = async (id) => {
    try {
      const res = await apiFetch(`/hr/payroll/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PAID" })
      });
      if (res.ok) {
        await fetchPayroll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";
    const parts = timeStr.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#e3effd] to-[#edf3fc] p-6 rounded-2xl border border-blue-200/50 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-[#1a73e8]" /> Human Resources & Payroll
          </h2>
          <p className="text-slate-500 text-xs mt-1">Punch shifts, manage schedules, track doctor consultation split ledger accounts, and compile monthly payroll slips.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-2 px-1 text-xs font-bold border-b-2 transition-all ${activeTab === "attendance" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"}`}
        >
          Shift Attendance Punch
        </button>
        {(user?.role === "DOCTOR" || user?.role === "ADMIN" || user?.role === "SUB_ADMIN") && (
          <button
            onClick={() => setActiveTab("fee_shares")}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-all ${activeTab === "fee_shares" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"}`}
          >
            OPD Doctor Split Ledger
          </button>
        )}
        <button
          onClick={() => setActiveTab("payroll")}
          className={`py-2 px-1 text-xs font-bold border-b-2 transition-all ${activeTab === "payroll" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"}`}
        >
          Salary slips
        </button>
        {(user?.role === "ADMIN" || user?.role === "SUB_ADMIN") && (
          <button
            onClick={() => setActiveTab("staff_directory")}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-all ${activeTab === "staff_directory" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"}`}
          >
            Staff Directory
          </button>
        )}
      </div>

      {/* TAB CONTENT: ATTENDANCE */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shift punch Clock Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Clock size={16} className="text-blue-500" /> Shift Punch Card</h3>
            
            <div className="text-center py-6 bg-[#f4f8fd] border border-blue-100/50 rounded-xl space-y-2">
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">CURRENT SYSTEM TIME</p>
              <h4 className="text-2xl font-extrabold text-slate-800 font-mono">
                {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
              </h4>
              <p className="text-[10px] text-[#1a73e8] font-bold">Lahore Office Shift</p>
            </div>

            {/* Shift punch controls */}
            <div className="space-y-3">
              {!todayAttendance ? (
                <button
                  onClick={handleClockIn}
                  disabled={clocking}
                  className="w-full py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  Clock In Shift (09:00 AM)
                </button>
              ) : !todayAttendance.clock_out ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] rounded-xl flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Clocked In today at <b>{formatTime(todayAttendance.clock_in)}</b> ({todayAttendance.status})</span>
                  </div>
                  <button
                    onClick={handleClockOut}
                    disabled={clocking}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    Clock Out Shift
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl space-y-1.5 text-center font-medium">
                  <CheckCircle2 size={20} className="text-slate-500 mx-auto" />
                  <p className="font-bold text-slate-800">Shift Completed Today</p>
                  <p className="text-[10px] text-slate-400">
                    Clocked: {formatTime(todayAttendance.clock_in)} - {formatTime(todayAttendance.clock_out)}
                  </p>
                </div>
              )}
            </div>

            {/* Month summary stat block */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Presents Today</p>
                <p className="text-lg font-extrabold text-emerald-600 mt-1">{attStats.present}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Late Arrivals</p>
                <p className="text-lg font-extrabold text-amber-500 mt-1">{attStats.late}</p>
              </div>
            </div>
          </div>

          {/* Attendance logs ledger */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><FileSpreadsheet size={16} className="text-teal-600" /> Attendance Ledger</h3>
            <div className="overflow-y-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Clock In</th>
                    <th className="py-2.5 px-3">Clock Out</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {attendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">No shift records found.</td>
                    </tr>
                  ) : (
                    attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold">{log.date}</td>
                        <td className="py-2.5 px-3">{formatTime(log.clock_in)}</td>
                        <td className="py-2.5 px-3">{formatTime(log.clock_out)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${log.status === "PRESENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {log.status}
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

      {/* TAB CONTENT: DOCTOR SHARE LEDGER */}
      {activeTab === "fee_shares" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary stats */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><UserSquare2 size={16} className="text-blue-500" /> Share Accounting</h3>
            <div className="p-4 bg-[#f4f8fd] border border-blue-100/50 rounded-xl space-y-1">
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider">TOTAL OPD REVENUE SPLIT</p>
              <h4 className="text-2xl font-extrabold text-slate-800">Rs. {totalShareAmt.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</h4>
              <p className="text-[9px] text-slate-500 leading-relaxed mt-1">Split split parameters: <b>80% Doctor Share</b> / 20% Facility split share. Collected automatically upon invoice settlement.</p>
            </div>
          </div>

          {/* List Shares Ledger */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><ClipboardList size={16} className="text-teal-600" /> Consultation Fee Splits</h3>
            <div className="overflow-y-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Invoice No.</th>
                    <th className="py-2.5 px-3 text-right">Consultation Fee</th>
                    <th className="py-2.5 px-3 text-right">Your Split (80%)</th>
                    <th className="py-2.5 px-3 text-right">Facility Split (20%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {shares.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">No settled fee share ledger entries found.</td>
                    </tr>
                  ) : (
                    shares.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-400">{new Date(s.created_at).toLocaleDateString("en-PK")}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{s.invoice_number}</td>
                        <td className="py-2.5 px-3 text-right">Rs. {parseFloat(s.consultation_fee).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">Rs. {parseFloat(s.doctor_share).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">Rs. {parseFloat(s.facility_share).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PAYROLL */}
      {activeTab === "payroll" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin compile payroll panel */}
          {(user?.role === "ADMIN" || user?.role === "SUB_ADMIN") ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><DollarSign size={16} className="text-blue-500" /> Compile Payroll</h3>
              <form onSubmit={handleGeneratePayroll} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Select Period Month</label>
                  <select 
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full p-2 text-xs google-input bg-white"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{new Date(2020, m-1, 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Select Period Year</label>
                  <select 
                    value={payrollYear}
                    onChange={(e) => setPayrollYear(e.target.value)}
                    className="w-full p-2 text-xs google-input bg-white"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                {payrollSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{payrollSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={payrollLoading}
                  className="w-full py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {payrollLoading ? "Calculating Splits..." : "Calculate & Generate Sheets"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center py-12 text-slate-400 text-xs shadow-sm">
              Monthly payroll calculations and employee salary slip ledgers are managed by system administrators.
            </div>
          )}

          {/* List Payroll slips */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><FileSpreadsheet size={16} className="text-teal-600" /> Employee Salary Slips</h3>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Month / Year</th>
                    <th className="py-2.5 px-3 text-right">Basic / Share</th>
                    <th className="py-2.5 px-3 text-right">Deductions</th>
                    <th className="py-2.5 px-3 text-right">Net Salary</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    {(user?.role === "ADMIN" || user?.role === "SUB_ADMIN") && <th className="py-2.5 px-3 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {payrollSlips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">No payroll slip records found.</td>
                    </tr>
                  ) : (
                    payrollSlips.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <div>{p.user_details?.full_name}</div>
                          <div className="text-[9px] text-slate-400 font-bold tracking-widest">{p.user_details?.role}</div>
                        </td>
                        <td className="py-2.5 px-3">{new Date(2020, p.month - 1, 1).toLocaleString('default', { month: 'short' })} {p.year}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div>Rs. {parseFloat(p.basic_salary).toFixed(0)}</div>
                          {parseFloat(p.doctor_share) > 0 && <div className="text-[9px] text-emerald-600 font-semibold">+Rs. {parseFloat(p.doctor_share).toFixed(0)}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600">Rs. {parseFloat(p.deductions).toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-800">Rs. {parseFloat(p.net_salary).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${p.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {p.status}
                          </span>
                        </td>
                        {(user?.role === "ADMIN" || user?.role === "SUB_ADMIN") && (
                          <td className="py-2.5 px-3 text-center">
                            {p.status === "PENDING" && (
                              <button
                                onClick={() => handleMarkPayrollPaid(p.id)}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-1 rounded transition-all shadow-sm"
                              >
                                Release
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STAFF DIRECTORY */}
      {activeTab === "staff_directory" && (user?.role === "ADMIN" || user?.role === "SUB_ADMIN") && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Staff Directory</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Manage user accounts and employee profiles for Receptionists, Pharmacists, and Lab Techs.</p>
            </div>
            <button
              onClick={handleOpenAddStaffModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all"
            >
              <Plus size={14} />
              <span>Register Staff Member</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase bg-slate-50">
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Username / Phone</th>
                  <th className="py-2.5 px-3">System Role</th>
                  <th className="py-2.5 px-3">Designation / Dept</th>
                  <th className="py-2.5 px-3 text-right">Base Salary</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">No staff profile records found.</td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{staff.user_details?.first_name} {staff.user_details?.last_name}</p>
                        <p className="text-[10px] text-slate-400">{staff.user_details?.email || "No email"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-mono text-slate-700">{staff.user_details?.username}</p>
                        <p className="text-[10px] text-slate-500">{staff.user_details?.phone_number || "No phone"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-800 uppercase">
                          {staff.user_details?.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{staff.designation || "N/A"}</p>
                        <p className="text-[10px] text-[#1a73e8] font-semibold">{staff.department_name || "No Department"}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        Rs. {parseInt(staff.base_salary || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEditStaffModal(staff)}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Add/Edit Modal */}
      {showStaffModal && (user?.role === "ADMIN" || user?.role === "SUB_ADMIN") && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingStaff ? "Edit Staff Profile" : "Register New Staff Member"}
              </h3>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} className="p-5 overflow-y-auto max-h-[75vh] space-y-4 text-xs">
              {staffFormError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100 flex items-center space-x-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{staffFormError}</span>
                </div>
              )}
              {staffFormSuccess && (
                <div className="bg-green-50 text-green-700 p-2.5 rounded-xl border border-green-100 flex items-center space-x-2">
                  <span className="font-bold text-xs">✓</span>
                  <span className="font-medium">{staffFormSuccess}</span>
                </div>
              )}

              {/* User Account Fields - Only for Create */}
              {!editingStaff && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={staffFormData.username}
                      onChange={(e) => setStaffFormData({ ...staffFormData, username: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                      placeholder="e.g. sana_receptionist"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={staffFormData.password}
                      onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* Name Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.first_name}
                    onChange={(e) => setStaffFormData({ ...staffFormData, first_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                    placeholder="e.g. Sana"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.last_name}
                    onChange={(e) => setStaffFormData({ ...staffFormData, last_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                    placeholder="e.g. Ahmed"
                  />
                </div>
              </div>

              {/* Phone & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={staffFormData.phone_number}
                    onChange={(e) => setStaffFormData({ ...staffFormData, phone_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                    placeholder="e.g. 03001234567"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    disabled={!!editingStaff}
                    value={staffFormData.role}
                    onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECH">Lab Technician</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              {/* Branch & Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch *</label>
                  <select
                    value={staffFormData.branch}
                    onChange={(e) => setStaffFormData({ ...staffFormData, branch: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={staffFormData.department}
                    onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Designation & Base Salary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.designation}
                    onChange={(e) => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                    placeholder="e.g. Senior Receptionist"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Salary (PKR)</label>
                  <input
                    type="number"
                    required
                    value={staffFormData.base_salary}
                    onChange={(e) => setStaffFormData({ ...staffFormData, base_salary: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                    placeholder="e.g. 40000"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={staffModalLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-bold transition-all disabled:opacity-55"
                >
                  {staffModalLoading ? "Saving Profile..." : "Save Staff Member"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 p-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
