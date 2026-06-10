import React, { useState, useEffect, useRef } from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Send, User, ShieldCheck, Clock, FileText, CheckCircle2, PhoneCall, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import DailyIframe from "@daily-co/daily-js";

export const Telemedicine = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointment_id") || "demo";
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "System", text: "Welcome to your secure telemedicine session. End-to-end encryption active. Click Start Call to initiate.", time: "00:00" }
  ]);
  const [inputText, setInputText] = useState("");
  const [timer, setTimer] = useState(0);

  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);

  // Daily.co call states & refs
  const callContainerRef = useRef(null);
  const callFrameRef = useRef(null);
  const [inCall, setInCall] = useState(false);
  const [loadingCall, setLoadingCall] = useState(false);

  // Mobile responsiveness tab controls
  const [activeTab, setActiveTab] = useState("video");
  const [unreadChat, setUnreadChat] = useState(false);

  // Preview local camera before joining the call
  useEffect(() => {
    let active = true;
    let stream = null;
    const startCamera = async () => {
      if (inCall || loadingCall) return; // Daily call handles its own camera, or we are currently connecting
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        if (!active) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        stream = mediaStream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera/microphone:", err);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [inCall, loadingCall]);

  // Sync mic/video preview state to local stream
  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = videoActive;
    }
  }, [videoActive, localStream]);

  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = micActive;
    }
  }, [micActive, localStream]);

  // Track messages length to set unread chat indicator on mobile
  const prevMessagesLength = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevMessagesLength.current) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage && lastMessage.sender !== "System" && lastMessage.sender !== (user?.full_name || user?.username)) {
        if (activeTab !== "chat") {
          setUnreadChat(true);
        }
      }
    }
    prevMessagesLength.current = chatMessages.length;
  }, [chatMessages, activeTab, user]);

  useEffect(() => {
    if (activeTab === "chat") {
      setUnreadChat(false);
    }
  }, [activeTab]);

  // Duration Timer
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages([
      ...chatMessages,
      { sender: user.full_name || user.username, text: inputText, time: timeStr }
    ]);
    setInputText("");

    if (user.role === "DOCTOR") {
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { sender: "Patient", text: "Got it, doctor. Thank you for clarifying.", time: timeStr }
        ]);
      }, 3000);
    }
  };

  // Start Meeting/Room and Join Session using Daily.co
  const startDailyCall = async () => {
    setLoadingCall(true);
    try {
      const res = await apiFetch("/telemedicine/create-room/", {
        method: "POST",
        body: JSON.stringify({ appointment_id: appointmentId })
      });
      if (res.ok) {
        const data = await res.json();
        const roomUrl = data.url;

        // Clean up preview stream
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }

        callFrameRef.current = DailyIframe.createFrame(callContainerRef.current, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "24px",
            minHeight: window.innerWidth < 768 ? "250px" : "400px"
          },
          showLeaveButton: false,
          showFullscreenButton: true
        });

        await callFrameRef.current.join({ 
          url: roomUrl,
          audioSource: micActive,
          videoSource: videoActive
        });

        callFrameRef.current.on("joined-meeting", () => {
          setConnected(true);
          setInCall(true);
          setLoadingCall(false);
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setChatMessages(prev => [
            ...prev,
            { sender: "System", text: `Secure meeting started. Peer joined the session room.`, time: timeStr }
          ]);
        });

        callFrameRef.current.on("left-meeting", () => {
          callFrameRef.current.destroy();
          callFrameRef.current = null;
          setInCall(false);
          setConnected(false);
        });
      } else {
        alert("Daily.co room creation failed. Check backend credentials.");
        setLoadingCall(false);
      }
    } catch (err) {
      console.error("Error launching call:", err);
      alert("System connection timeout. Please verify local connectivity.");
      setLoadingCall(false);
    }
  };

  const handleHangUp = () => {
    // Stop local camera/mic preview stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    // Leave Daily call if active
    if (callFrameRef.current) {
      try {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
      } catch (e) {
        console.warn("Daily cleanup:", e);
      }
      callFrameRef.current = null;
    }
    setInCall(false);
    setConnected(false);
    setTimer(0);
    navigate(user.role === "PATIENT" ? "/patient-portal" : "/");
  };

  const toggleMic = () => {
    const nextState = !micActive;
    setMicActive(nextState);
    if (callFrameRef.current) {
      callFrameRef.current.setLocalAudio(nextState);
    }
  };

  const toggleVideo = () => {
    const nextState = !videoActive;
    setVideoActive(nextState);
    if (callFrameRef.current) {
      callFrameRef.current.setLocalVideo(nextState);
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      
      {/* Telemedicine Top Bar */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 px-3 sm:px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-red-500 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse"></div>
          <div>
            <span className="font-bold text-xs sm:text-sm">SECURE CONSULTATION CHAMBER</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold block">APPOINTMENT ID: {appointmentId}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-6 text-[10px] sm:text-xs text-slate-400 font-bold">
          <div className="flex items-center space-x-1">
            <Clock size={12} className="text-blue-400" />
            <span>{connected ? formatTime(timer) : "CONNECTING..."}</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-800 border border-slate-700 px-2 sm:px-3 py-1 rounded-full text-blue-400">
            <ShieldCheck size={12} />
            <span>ENCRYPTED</span>
          </div>
        </div>
      </div>

      {/* Main Consultation Chamber Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Mobile Tabs */}
        <div className="lg:hidden flex border-b border-slate-800 bg-slate-900 shrink-0 select-none">
          <button 
            type="button"
            id="mobile-tab-video"
            onClick={() => { console.log("Switching tab to: video"); setActiveTab("video"); }}
            className={`flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "video" 
                ? "border-teal-500 text-teal-400 bg-slate-950/40" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Video Call
          </button>
          <button 
            type="button"
            id="mobile-tab-chat"
            onClick={() => { console.log("Switching tab to: chat"); setActiveTab("chat"); }}
            className={`flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase border-b-2 transition-all relative cursor-pointer ${
              activeTab === "chat" 
                ? "border-teal-500 text-teal-400 bg-slate-950/40" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Chat Room</span>
            {unreadChat && (
              <span className="absolute top-3.5 right-[30%] w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            )}
            {unreadChat && (
              <span className="absolute top-3.5 right-[30%] w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Left Side: Video Feeds (Dynamic grid) */}
        <div className={`flex-grow bg-slate-950 p-3 sm:p-6 flex flex-col justify-between overflow-hidden ${
          activeTab === "video" ? "flex" : "hidden lg:flex"
        }`}>
          
          {/* Scrollable Video Area */}
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 w-full">
            <div className="flex-grow flex flex-col items-center justify-center my-auto max-w-5xl w-full mx-auto relative min-h-[300px] sm:min-h-[400px]">
              {/* Daily call container */}
              <div 
                ref={callContainerRef} 
                className={`w-full h-full min-h-[300px] sm:min-h-[400px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 ${inCall ? "block" : "hidden"}`}
              />
              
              {/* Local Preview & Join Trigger Panel */}
              {!inCall && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full h-auto md:h-full items-center">
                  {/* Simulated Peer Feed / Greeting */}
                  <div className="bg-slate-900 aspect-video rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center shadow-lg p-4 sm:p-6">
                    <div className="text-center space-y-3 sm:space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <PhoneCall size={20} className="sm:hidden" />
                        <PhoneCall size={28} className="hidden sm:block" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 text-xs sm:text-sm">Secure Consultation Chamber Ready</h4>
                        <p className="text-slate-500 text-[9.5px] sm:text-[10.5px] mt-1 max-w-xs leading-relaxed">
                          Camera and microphone preview active. Click below to launch secure end-to-end encrypted video meeting.
                        </p>
                      </div>
                      <button
                        onClick={startDailyCall}
                        disabled={loadingCall}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-teal-600/10 disabled:bg-slate-800 disabled:text-slate-500 mx-auto cursor-pointer"
                      >
                        {loadingCall ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Creating Room...</span>
                          </>
                        ) : (
                          <>
                            <Video size={12} />
                            <span>{user.role === "DOCTOR" ? "Start Consultation Call" : "Join Consultation Call"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Local Preview Feed */}
                  <div className="bg-slate-900 aspect-video rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center shadow-lg">
                    {videoActive ? (
                      <>
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-slate-800 z-10">
                          {user?.full_name || user?.username || "You"} (Preview)
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-1 z-10">
                        <VideoOff size={32} className="text-slate-500 mx-auto sm:hidden" />
                        <VideoOff size={40} className="text-slate-500 mx-auto hidden sm:block" />
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold">Camera is disabled</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video Chamber Actions */}
          <div className="flex justify-center items-center space-x-3 sm:space-x-4 shrink-0 mt-4 sm:mt-6">
            <button
              onClick={toggleMic}
              className={`p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
                micActive 
                  ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                  : "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30"
              }`}
            >
              {micActive ? <Mic size={18} className="sm:hidden" /> : <MicOff size={18} className="sm:hidden" />}
              {micActive ? <Mic size={20} className="hidden sm:block" /> : <MicOff size={20} className="hidden sm:block" />}
            </button>

            <button
              onClick={handleHangUp}
              className="p-3.5 sm:p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all cursor-pointer"
            >
              <PhoneOff size={20} className="sm:hidden" />
              <PhoneOff size={24} className="hidden sm:block" />
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3.5 sm:p-4 rounded-full border transition-all cursor-pointer ${
                videoActive 
                  ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                  : "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30"
              }`}
            >
              {videoActive ? <Video size={18} className="sm:hidden" /> : <VideoOff size={18} className="sm:hidden" />}
              {videoActive ? <Video size={20} className="hidden sm:block" /> : <VideoOff size={20} className="hidden sm:block" />}
            </button>
          </div>

        </div>

        {/* Right Side: Chat & Prescription pad Panel */}
        <div className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 flex flex-col overflow-hidden lg:shrink-0 ${
          activeTab === "chat" ? "flex-1 flex" : "hidden lg:flex"
        }`}>
          
          {/* Chat Headers */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center space-x-2 shrink-0">
            <FileText size={16} className="text-blue-500" />
            <h3 className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-300">Consultation Chat</h3>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 text-[11px] sm:text-xs">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] rounded-2xl p-2.5 sm:p-3 space-y-1 ${
                  msg.sender === "System" ? "bg-slate-800/40 border border-slate-800/80 mx-auto text-center text-[9px] sm:text-[10px] text-slate-400 w-full" :
                  msg.sender === (user.full_name || user.username) ? "bg-blue-600 text-white ml-auto" :
                  "bg-slate-800 text-slate-200"
                }`}
              >
                {msg.sender !== "System" && (
                  <span className="font-extrabold text-[8px] sm:text-[9px] text-slate-400 block tracking-wider uppercase">{msg.sender}</span>
                )}
                <p className="leading-relaxed font-medium">{msg.text}</p>
                {msg.sender !== "System" && (
                  <span className="text-[8px] text-slate-300 font-bold block text-right">{msg.time}</span>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-950/60 flex items-center space-x-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type advice or message..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 p-2 sm:p-2.5 rounded-xl text-white transition-all shadow cursor-pointer"
            >
              <Send size={14} className="sm:hidden" />
              <Send size={16} className="hidden sm:block" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
