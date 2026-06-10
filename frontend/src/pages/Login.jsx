import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2, Activity, X, ShieldAlert, Phone } from "lucide-react";
import clinicVibe from "../assets/clinic_vibe.png";

export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col md:flex-row font-sans">
      
      {/* Left Panel: High-contrast content with a very soft, soothing blue-gray gradient (No Glare) */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] bg-gradient-to-b from-[#e3effd] to-[#edf3fc] border-r border-[#d0d4dc] p-12 flex-col justify-between items-center text-center">
        
        {/* Brand Header */}
        <div className="flex items-center space-x-3 w-full text-left">
          <div className="bg-white border border-[#b4cbf0] p-2.5 rounded-2xl text-[#1a73e8] shadow-sm">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="font-bold text-base text-[#101010] tracking-tight leading-none">Medi Flow</h1>
            <p className="text-[10px] text-[#404040] font-bold tracking-wider mt-1 uppercase">Enterprise HMS</p>
          </div>
        </div>

        {/* Clinical Illustration with soft contrast */}
        <div className="my-auto space-y-6">
          <img 
            src={clinicVibe} 
            alt="Healthcare Patient Vibe" 
            className="max-w-[85%] mx-auto h-auto object-contain transition-all hover:scale-[1.01]" 
          />
          <div>
            <h3 className="text-lg font-bold text-[#101010] tracking-tight">Patient Care First</h3>
            <p className="text-xs text-[#3c4043] font-medium max-w-xs mx-auto mt-2 leading-relaxed">
              Empowering clinical staff with secure tools to register patients, manage OPD queues, and track clinical services.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-[#5f6368] font-semibold w-full text-left border-t border-slate-300/60 pt-4">
          © 2026 Medi Flow Enterprise HMS.
        </div>
      </div>

      {/* Right Panel: Google Sign-In Card with High Readability Contrast */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f0f4f9]">
        
        {/* Main Sign-In Card Container (Soothing soft light-blue tint to reduce glare) */}
        <div className="w-full max-w-[450px] bg-[#f4f8fd] rounded-[28px] p-8 md:p-10 border border-[#c3c7cb] shadow-md flex flex-col justify-between transition-all">
          
          {/* Header */}
          <div className="text-left mb-8">
            {/* Mobile Branding Indicator */}
            <div className="flex items-center space-x-2 text-[#1a73e8] md:hidden mb-6">
              <Activity size={24} />
              <span className="font-bold text-[#202124]">Medi Flow HMS</span>
            </div>
            
            <h2 className="text-2xl font-bold text-[#202124]">Sign in</h2>
            <p className="text-[#3c4043] text-sm mt-2 font-medium">Use your Medi Flow Staff Account</p>
          </div>

          {/* Validation Errors */}
          {error && (
            <div className="bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs font-bold px-4 py-3 rounded-xl mb-6 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input (White input inside light blue card for high-contrast reading) */}
            <div className="relative">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=" "
                className="block w-full px-4 py-3.5 bg-white border border-[#747775] rounded-lg text-[#202124] font-medium focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all text-sm peer"
              />
              <label
                htmlFor="username"
                className="absolute text-sm text-[#444746] bg-[#f4f8fd] px-1 left-3 top-3.5 origin-[0] -translate-y-6 scale-75 transform transition-all peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 peer-focus:text-[#1a73e8] font-semibold pointer-events-none"
              >
                Username
              </label>
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="block w-full px-4 py-3.5 bg-white border border-[#747775] rounded-lg text-[#202124] font-medium focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all text-sm peer"
              />
              <label
                htmlFor="password"
                className="absolute text-sm text-[#444746] bg-[#f4f8fd] px-1 left-3 top-3.5 origin-[0] -translate-y-6 scale-75 transform transition-all peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 peer-focus:text-[#1a73e8] font-semibold pointer-events-none"
              >
                Password
              </label>
            </div>

            {/* Action Links & Next Button */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[#1a73e8] hover:text-[#1557b0] text-xs font-bold hover:underline"
              >
                Forgot password?
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-bold py-2.5 px-6 rounded-full transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:pointer-events-none text-sm shadow-sm hover:shadow"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Next</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200/60 text-center">
            <p className="text-xs text-[#3c4043] font-medium">
              Are you a patient?{" "}
              <button
                type="button"
                onClick={() => navigate("/patient-portal")}
                className="text-[#1a73e8] hover:text-[#1557b0] font-bold hover:underline focus:outline-none"
              >
                Access Patient Portal
              </button>
            </p>
          </div>

        </div>

        {/* Demo Credentials Panel (Interactive autofill chips to reduce login friction) */}
        <div className="w-full max-w-[450px] mt-6 text-center">
          <p className="text-[10px] text-[#444746] font-bold uppercase tracking-wider mb-3">Click to Autofill Demo Credentials</p>
          <div className="grid grid-cols-3 gap-2.5 text-[11px]">
            <button
              type="button"
              onClick={() => { setUsername("receptionist"); setPassword("password"); }}
              className="bg-[#f4f8fd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] p-2.5 rounded-2xl border border-[#c3c7cb] text-left shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
            >
              <span className="font-bold text-[#1a73e8] block">Receptionist</span>
              <p className="text-[#444746] font-mono text-[9px] mt-0.5">receptionist</p>
            </button>
            
            <button
              type="button"
              onClick={() => { setUsername("doctor_ahmad"); setPassword("password"); }}
              className="bg-[#f4f8fd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] p-2.5 rounded-2xl border border-[#c3c7cb] text-left shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
            >
              <span className="font-bold text-[#1a73e8] block">Doctor</span>
              <p className="text-[#444746] font-mono text-[9px] mt-0.5">doctor_ahmad</p>
            </button>
            
            <button
              type="button"
              onClick={() => { setUsername("admin"); setPassword("password"); }}
              className="bg-[#f4f8fd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] p-2.5 rounded-2xl border border-[#c3c7cb] text-left shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
            >
              <span className="font-bold text-[#1a73e8] block">Admin</span>
              <p className="text-[#444746] font-mono text-[9px] mt-0.5">admin</p>
            </button>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ShieldAlert size={18} className="text-[#1a73e8]" />
                <h3 className="font-bold text-[#202124] text-base">Reset Your Password</h3>
              </div>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-[#3c4043] font-medium leading-relaxed">
                  To reset your password, please contact your <span className="font-bold text-[#202124]">System Administrator</span>.
                </p>
                <p className="text-xs text-[#5f6368] mt-2">
                  The admin can reset your password from the <span className="font-semibold">System Settings &rarr; Security</span> panel.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Admin Assistance</p>
                <div className="flex items-center space-x-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-700 font-semibold">Contact hospital IT department</span>
                </div>
                <p className="text-xs text-slate-500">Provide your <span className="font-bold">username</span> and the admin will reset your password.</p>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold py-2.5 rounded-full transition-all text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
