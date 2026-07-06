import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, ShieldAlert, ShieldCheck, Cpu, History, Sparkles, Brain, 
  FileText, ScanFace, Camera, Info, X, Activity, RotateCw, 
  TrendingUp, Gauge, FileImage, Fingerprint, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip
} from "recharts";
import { 
  AuditResult, MLModelStatus
} from "./types";

export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState<"audit" | "engine">("audit");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [models, setModels] = useState<MLModelStatus[]>([]);
  const [selectedArch, setSelectedArch] = useState<"efficientnet" | "vit">("efficientnet");
  const [trainEpochs, setTrainEpochs] = useState<number>(5);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<number | null>(null);
  const [hoveredAnomaly, setHoveredAnomaly] = useState<number | null>(null);
  const [showWebcam, setShowWebcam] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch ML models status on load
  const fetchModels = async () => {
    try {
      const res = await fetch("/api/models");
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        
        // Check if either model is currently training
        const trainingModel = data.find((m: any) => m.status === "training");
        if (trainingModel) {
          setIsTraining(true);
          setSelectedArch(trainingModel.architecture as "efficientnet" | "vit");
        } else {
          setIsTraining(false);
        }
      }
    } catch (e) {
      console.error("Failed to load model registry:", e);
    }
  };

  useEffect(() => {
    fetchModels();
    // Poll models status periodically if training is active
    let interval: NodeJS.Timeout;
    if (isTraining) {
      interval = setInterval(() => {
        fetchModels();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTraining]);

  // Handle Drag-and-Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setAuditResult(null);
      } else {
        setErrorMessage("Please upload an image file (PNG, JPEG, WEBP).");
      }
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setAuditResult(null);
      } else {
        setErrorMessage("Please upload an image file (PNG, JPEG, WEBP).");
      }
    }
  };

  // Start Camera Stream
  const startWebcam = async () => {
    setShowWebcam(true);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setErrorMessage("Could not access camera. Please make sure permissions are granted.");
      setShowWebcam(false);
    }
  };

  // Stop Camera Stream
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowWebcam(false);
  };

  // Capture Snapshot from Camera
  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
            setSelectedFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(capturedFile));
            setAuditResult(null);
            stopWebcam();
          }
        }, "image/jpeg");
      }
    }
  };

  // Trigger Deepfake Verification
  const performAudit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage(null);
    setSelectedAnomaly(null);

    const formData = new FormData();
    formData.append("media", selectedFile);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result: AuditResult = await res.json();
        setAuditResult(result);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Forensic audit failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Server communication failure. Please check your network.");
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger Local ML Model Training
  const triggerTraining = async () => {
    setIsTraining(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architecture: selectedArch, epochs: trainEpochs })
      });
      if (res.ok) {
        fetchModels();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to trigger model training.");
        setIsTraining(false);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to establish server connection for training.");
      setIsTraining(false);
    }
  };

  // Clear Upload / Reset Selection
  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAuditResult(null);
    setSelectedAnomaly(null);
    setErrorMessage(null);
    stopWebcam();
  };

  // Format File Size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Active Model configuration for statistics
  const currentModelData = models.find(m => m.architecture === selectedArch);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header with Cyber Telemetry */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 py-4 px-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <ScanFace className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              TRUTHLENS <span className="text-emerald-400 text-sm font-semibold tracking-widest px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded-md">PRO FORENSICS</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">UTC MONITORING SYSTEM // v1.4.0</p>
          </div>
        </div>

        {/* Global Nav Tabs */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-lg text-sm font-medium font-display transition-all ${
              activeTab === "audit" 
                ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-[0_2px_10px_rgba(16,185,129,0.05)]" 
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Forensic Auditor
            </div>
          </button>
          <button 
            onClick={() => setActiveTab("engine")}
            className={`px-4 py-2 rounded-lg text-sm font-medium font-display transition-all ${
              activeTab === "engine" 
                ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-[0_2px_10px_rgba(16,185,129,0.05)]" 
                : "text-slate-400 hover:text-white hover:bg-slate-900/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Local ML Engine Hub
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Error Banners */}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 flex items-start gap-3 text-sm"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">System Warning:</span> {errorMessage}
            </div>
            <button onClick={() => setErrorMessage(null)} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "audit" ? (
            
            /* TAB 1: FORENSIC AUDITOR */
            <motion.div 
              key="audit-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              
              {/* LEFT SIDE: Media uploader and Visual Forensic Viewer (cols 1-5) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Uploader Bento Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div>
                    <h3 className="text-sm font-semibold font-display text-white tracking-wide uppercase flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-emerald-400" />
                      SECURE INGESTION PORTAL
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Upload high-res media for deep structural and pixel analysis.</p>
                  </div>

                  {!previewUrl && !showWebcam ? (
                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 transition-all rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-slate-950/40 hover:bg-slate-950/80 cursor-pointer group"
                      onClick={() => document.getElementById("file-upload-input")?.click()}
                    >
                      <input 
                        id="file-upload-input"
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                      <div className="bg-slate-900 p-4 rounded-full border border-slate-800 group-hover:border-emerald-500/30 transition-all shadow-inner">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition-all" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-200">Drag & drop forensic file here</p>
                        <p className="text-xs text-slate-500 mt-1 font-mono">PNG, JPG, WEBP, up to 10MB</p>
                      </div>
                      <div className="text-xs text-emerald-400/80 font-semibold bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-md group-hover:bg-emerald-500/10 transition-all">
                        or select file
                      </div>
                    </div>
                  ) : null}

                  {/* Webcam Stream */}
                  {showWebcam && (
                    <div className="border border-slate-800 rounded-xl overflow-hidden relative bg-black aspect-video flex flex-col justify-between">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                        <button 
                          onClick={captureSnapshot} 
                          className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg text-sm font-bold shadow-lg hover:bg-emerald-400 flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Capture Snapshot
                        </button>
                        <button 
                          onClick={stopWebcam} 
                          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Upload Selection Stats */}
                  {previewUrl && !showWebcam && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-800 relative bg-slate-900 flex items-center justify-center shrink-0">
                          <img src={previewUrl} className="w-full h-full object-cover" alt="thumbnail" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm text-slate-200 truncate font-medium">{selectedFile?.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {selectedFile ? formatBytes(selectedFile.size) : "0 MB"}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={clearSelection} 
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  )}

                  {/* Trigger Analysis Button Row */}
                  <div className="flex gap-2.5">
                    {!showWebcam && !previewUrl && (
                      <button 
                        onClick={startWebcam} 
                        className="flex-1 py-3 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-sm font-semibold hover:border-emerald-500/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-inner"
                      >
                        <Camera className="w-4.5 h-4.5 text-emerald-400" />
                        Scan Camera Feed
                      </button>
                    )}
                    {previewUrl && !auditResult && (
                      <button 
                        onClick={performAudit} 
                        disabled={isUploading}
                        className="flex-1 py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.25)] disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                      >
                        {isUploading ? (
                          <>
                            <RotateCw className="w-4.5 h-4.5 animate-spin" />
                            Analyzing Pixel Layers...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4.5 h-4.5" />
                            Perform Forensic Inquest
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* VISUAL FORENSIC AUDITOR VIEWER */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm relative">
                  <div>
                    <h3 className="text-sm font-semibold font-display text-white tracking-wide uppercase flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      SPATIAL COHERENCE VIEWER
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Highlighted regions represent areas with structural or frequency anomalies.</p>
                  </div>

                  <div className="border border-slate-900 rounded-xl bg-slate-950 relative aspect-square flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <div className="relative max-w-full max-h-full w-full h-full flex items-center justify-center">
                        <img 
                          id="forensic-target-img"
                          src={previewUrl} 
                          className="max-w-full max-h-full object-contain pointer-events-none" 
                          alt="forensic analysis" 
                        />
                        
                        {/* Audit Scanning Overlay effect */}
                        {isUploading && (
                          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none overflow-hidden">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] absolute left-0 animate-scan"></div>
                          </div>
                        )}

                        {/* Anomaly Bounding Box Overlays */}
                        {auditResult?.manipulatedRegions?.map((region, idx) => {
                          const isSelected = selectedAnomaly === idx;
                          const isHovered = hoveredAnomaly === idx;
                          const coords = region.coordinates;

                          return (
                            <div 
                              key={idx}
                              onClick={() => setSelectedAnomaly(isSelected ? null : idx)}
                              onMouseEnter={() => setHoveredAnomaly(idx)}
                              onMouseLeave={() => setHoveredAnomaly(null)}
                              className={`absolute border-2 transition-all cursor-pointer rounded ${
                                isSelected 
                                  ? "border-rose-500 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.5)] z-20" 
                                  : isHovered
                                    ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10"
                                    : "border-emerald-500/40 hover:border-amber-500 bg-transparent"
                              }`}
                              style={{
                                left: `${coords.x}%`,
                                top: `${coords.y}%`,
                                width: `${coords.width}%`,
                                height: `${coords.height}%`,
                              }}
                            >
                              {/* Label badge on top left */}
                              <span className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all uppercase ${
                                isSelected 
                                  ? "bg-rose-500 text-white" 
                                  : isHovered
                                    ? "bg-amber-500 text-slate-950"
                                    : "bg-emerald-500/80 text-slate-950 opacity-40 hover:opacity-100"
                              }`}>
                                {region.regionName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-600 flex flex-col items-center gap-2">
                        <FileImage className="w-12 h-12 opacity-30 text-slate-400" />
                        <span className="text-xs font-mono">No active media loaded. Ingest file to scan.</span>
                      </div>
                    )}
                  </div>

                  {/* Active Region Highlights description card */}
                  {previewUrl && auditResult && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 min-h-[70px]">
                      {selectedAnomaly !== null || hoveredAnomaly !== null ? (
                        (() => {
                          const idx = selectedAnomaly !== null ? selectedAnomaly : hoveredAnomaly!;
                          const region = auditResult.manipulatedRegions![idx];
                          return (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-rose-400 uppercase font-display flex items-center gap-1.5">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  Region {idx + 1}: {region.regionName}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">
                                  {region.anomalyType}
                                </span>
                              </div>
                              <p className="text-slate-300 mt-1.5 leading-relaxed">{region.description}</p>
                            </motion.div>
                          );
                        })()
                      ) : (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 justify-center h-full min-h-[50px]">
                          <Info className="w-4 h-4 text-emerald-400/60" />
                          <span>Hover or click highlighted bounding boxes on the image above to inspect local anomalies.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT SIDE: Forensic Report Details & Charts (cols 6-12) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {auditResult ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* BENTO ROW 1: Verdict & Circular Radial Meter */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Radial Verdict Meter */}
                      <div className="md:col-span-4 bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-transparent"></div>
                        <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase mb-3">AUTHENTICITY RATING</h4>
                        
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Radial SVG Gauge */}
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle 
                              cx="50" 
                              cy="50" 
                              r="42" 
                              stroke="#0f172a" 
                              strokeWidth="10" 
                              fill="transparent" 
                            />
                            <motion.circle 
                              cx="50" 
                              cy="50" 
                              r="42" 
                              stroke={
                                auditResult.verdict === "authentic" 
                                  ? "#10b981" 
                                  : auditResult.verdict === "suspicious" 
                                    ? "#f59e0b" 
                                    : "#f43f5e"
                              }
                              strokeWidth="10" 
                              fill="transparent" 
                              strokeDasharray="263.89"
                              initial={{ strokeDashoffset: 263.89 }}
                              animate={{ strokeDashoffset: 263.89 - (263.89 * auditResult.authenticityScore) / 100 }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                              strokeLinecap="round"
                            />
                          </svg>
                          {/* Inside score display */}
                          <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-black text-white font-display">
                              {auditResult.authenticityScore}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">percent</span>
                          </div>
                        </div>

                        {/* Verdict Text */}
                        <div className="mt-4">
                          <span className={`text-sm font-black font-display tracking-widest uppercase px-3 py-1 bg-slate-950 border rounded-lg ${
                            auditResult.verdict === "authentic" 
                              ? "text-emerald-400 border-emerald-500/25" 
                              : auditResult.verdict === "suspicious" 
                                ? "text-amber-400 border-amber-500/25" 
                                : "text-rose-400 border-rose-500/25"
                          }`}>
                            {auditResult.verdict}
                          </span>
                          <p className="text-[10px] font-mono text-slate-500 mt-2">CONFIDENCE: {auditResult.confidence}%</p>
                        </div>
                      </div>

                      {/* Forensic Summary */}
                      <div className="md:col-span-8 bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-sm relative">
                        <div>
                          <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            FORENSIC EXECUTIVE SUMMARY
                          </h4>
                          <h3 className="text-lg font-bold text-white mt-2 leading-snug">{auditResult.summary}</h3>
                          <p className="text-xs text-slate-400 mt-3 leading-relaxed border-t border-slate-900 pt-3">
                            {auditResult.technicalExplanation}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-900 pt-3">
                          <div className="text-xs">
                            <span className="text-slate-500 font-mono">FILE:</span>
                            <p className="font-mono text-slate-300 truncate mt-0.5">{auditResult.fileName}</p>
                          </div>
                          <div className="text-xs text-right">
                            <span className="text-slate-500 font-mono">TIMESTAMP:</span>
                            <p className="font-mono text-slate-300 mt-0.5">
                              {new Date(auditResult.analysisDate).toLocaleTimeString()} UTC
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* BENTO ROW 2: Metric breakdown & Provenance */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Breakdown Bars */}
                      <div className="md:col-span-6 bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
                        <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-emerald-400" />
                          COHERENCE TELEMETRY BREAKDOWN
                        </h4>
                        
                        {auditResult.verdictBreakdown && (
                          <div className="flex flex-col gap-3.5">
                            {[
                              { label: "Lighting Consistency", val: auditResult.verdictBreakdown.lightingConsistency },
                              { label: "Texture Naturalness", val: auditResult.verdictBreakdown.textureNaturalness },
                              { label: "Geometric Symmetry", val: auditResult.verdictBreakdown.geometricSymmetry },
                              { label: "Metadata Integrity", val: auditResult.verdictBreakdown.metadataIntegrity },
                              { label: "Noise Distribution", val: auditResult.verdictBreakdown.noiseDistribution },
                            ].map((item, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-300 font-medium">{item.label}</span>
                                  <span className={`font-mono font-bold ${
                                    item.val > 80 
                                      ? "text-emerald-400" 
                                      : item.val > 50 
                                        ? "text-amber-400" 
                                        : "text-rose-400"
                                  }`}>{item.val}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                                  <motion.div 
                                    className={`h-full rounded-full ${
                                      item.val > 80 
                                        ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" 
                                        : item.val > 50 
                                          ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" 
                                          : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.val}%` }}
                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Provenance Metadata */}
                      <div className="md:col-span-6 bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-sm relative">
                        <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                          <Fingerprint className="w-4 h-4 text-emerald-400" />
                          METADATA & PROVENANCE RECORD
                        </h4>
                        
                        <div className="flex-1 flex flex-col gap-3 mt-4 text-xs font-mono">
                          <div className="flex justify-between py-1.5 border-b border-slate-950">
                            <span className="text-slate-500">SIGNATURE STATUS</span>
                            <span className={`font-bold flex items-center gap-1 ${
                              auditResult.provenanceAnalysis.signatureValid ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {auditResult.provenanceAnalysis.signatureValid ? (
                                <><ShieldCheck className="w-3.5 h-3.5" /> VALID</>
                              ) : (
                                <><ShieldAlert className="w-3.5 h-3.5" /> FORGED / MISSING</>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-slate-950">
                            <span className="text-slate-500">CREATION DEVICE</span>
                            <span className="text-slate-300 truncate max-w-[180px]">
                              {auditResult.provenanceAnalysis.creationDevice || "UNKNOWN HARDWARE"}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-slate-950">
                            <span className="text-slate-500">GENERATIVE ENGINE</span>
                            <span className="text-slate-300">
                              {auditResult.provenanceAnalysis.softwareUsed || "NONE DETECTED"}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-slate-950">
                            <span className="text-slate-500">ORIGIN COORDINATES</span>
                            <span className="text-slate-300">{auditResult.provenanceAnalysis.location || "GEO-STRIPPED"}</span>
                          </div>
                          <div className="flex flex-col py-1.5 gap-1">
                            <span className="text-slate-500">AUDIT EDITING HISTORY LOG</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {auditResult.provenanceAnalysis.editingHistory && auditResult.provenanceAnalysis.editingHistory.length > 0 ? (
                                auditResult.provenanceAnalysis.editingHistory.map((edit, idx) => (
                                  <span key={idx} className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded uppercase">
                                    {edit}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-600 text-[10px]">NO MODIFICATIONS DETECTED</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* BENTO ROW 3: Deepfake Cues Breakdown */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
                      <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        IDENTIFIED DEEPFAKE FORENSIC CUES ({auditResult.deepfakeCues?.length || 0})
                      </h4>
                      
                      {auditResult.deepfakeCues && auditResult.deepfakeCues.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {auditResult.deepfakeCues.map((cue, idx) => (
                            <div key={idx} className="bg-slate-950/60 border border-slate-900 hover:border-slate-800 transition-all rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-sm font-bold text-white font-display leading-tight">{cue.cueName}</span>
                                  <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded uppercase shrink-0 ${
                                    cue.severity === "HIGH" 
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                      : cue.severity === "MEDIUM" 
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                        : "bg-slate-900 text-slate-400 border border-slate-800"
                                  }`}>
                                    {cue.severity}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{cue.description}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono text-slate-500 uppercase">CATEGORY:</span>
                                <span className="text-[9px] font-mono font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/5 rounded border border-emerald-500/10">
                                  {cue.category}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-65" />
                          <p className="text-xs font-mono">No deepfake cues or anomalies identified. Inception layer clean.</p>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  
                  /* FORENSIC PLACEHOLDER INSTRUCTION VIEW */
                  <div className="bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-inner min-h-[400px]">
                    <div className="w-16 h-16 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center text-slate-500">
                      <ScanFace className="w-8 h-8 text-slate-400 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-white">AWAITING FORENSIC INPUT</h3>
                      <p className="text-xs text-slate-500 max-w-[320px] mx-auto mt-2 leading-relaxed">
                        Securely capture from live camera or drag-and-drop any media into the left ingestion deck to initiate deep pixel forensics.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          ) : (
            
            /* TAB 2: LOCAL ML ENGINE HUB */
            <motion.div 
              key="engine-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              
              {/* LEFT COLUMN: Training Controller (cols 1-4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-sm relative">
                  <div>
                    <h3 className="text-sm font-semibold font-display text-white tracking-wide uppercase flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      LOCAL MODEL CONTROLLER
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure and fine-tune spatial and vision-transformer neural architectures.</p>
                  </div>

                  {/* Architecture Selection */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-mono text-slate-500">SELECT MODEL ARCHITECTURE</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSelectedArch("efficientnet")}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1.5 ${
                          selectedArch === "efficientnet" 
                            ? "bg-slate-950 border-emerald-500/40 text-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.1)]" 
                            : "bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                        <span>EfficientNet V2</span>
                        <span className="text-[10px] font-mono font-normal opacity-60">CNN Edge Detector</span>
                      </button>
                      <button 
                        onClick={() => setSelectedArch("vit")}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1.5 ${
                          selectedArch === "vit" 
                            ? "bg-slate-950 border-emerald-500/40 text-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.1)]" 
                            : "bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Sparkles className="w-5 h-5" />
                        <span>ViT-B/16</span>
                        <span className="text-[10px] font-mono font-normal opacity-60">Vision Transformer</span>
                      </button>
                    </div>
                  </div>

                  {/* Epochs count */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-500">TRAINING EPOCHS</span>
                      <span className="text-emerald-400 font-bold">{trainEpochs} Epochs</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="15" 
                      value={trainEpochs} 
                      onChange={(e) => setTrainEpochs(parseInt(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-600">
                      <span>1 Epoch (Fast)</span>
                      <span>15 Epochs (Deep)</span>
                    </div>
                  </div>

                  {/* Trigger Action */}
                  <button 
                    onClick={triggerTraining}
                    disabled={isTraining || (currentModelData?.status === "training")}
                    className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(16,185,129,0.25)] disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-800 disabled:shadow-none"
                  >
                    {isTraining || (currentModelData?.status === "training") ? (
                      <>
                        <RotateCw className="w-5 h-5 animate-spin" />
                        Training Epochs...
                      </>
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        Train and Fine-Tune Model
                      </>
                    )}
                  </button>

                  {/* Active Training Telemetry Logs */}
                  {(isTraining || currentModelData?.status === "training") && (
                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs font-mono text-slate-400 flex flex-col gap-1.5 shadow-inner">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="font-bold">STATUS: RUNNING EPICS</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Initializing AdamW optimizer... <br />
                        Loading weights and starting epoch step...<br />
                        <span className="text-slate-500">Check terminal logs or poll status. Results write instantly to registry.</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Model Info Specs Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 text-xs font-mono text-slate-400 flex flex-col gap-3 shadow-xl backdrop-blur-sm">
                  <h4 className="text-xs font-semibold font-display text-white tracking-wider uppercase mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400" />
                    ARCHITECTURE SPECIFICATION
                  </h4>
                  {selectedArch === "efficientnet" ? (
                    <>
                      <p className="leading-relaxed font-sans text-slate-400 text-xs">
                        EfficientNet-V2 is a convolutional neural network optimized for feature extraction on high-frequency noise grids. Excellent at detecting anomalous JPEG block boundaries and texture blending.
                      </p>
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-3">
                        <div>
                          <span className="text-slate-600">INPUT SHAPE:</span>
                          <p className="text-slate-300 font-bold">384 x 384 x 3</p>
                        </div>
                        <div>
                          <span className="text-slate-600">PARAMETERS:</span>
                          <p className="text-slate-300 font-bold">24.3 Million</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="leading-relaxed font-sans text-slate-400 text-xs">
                        Vision Transformer (ViT-B/16) splits images into 16x16 patches, applying multi-head self-attention mechanisms. Excels at modeling global contextual inconsistencies like lighting and facial symmetry.
                      </p>
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-3">
                        <div>
                          <span className="text-slate-600">INPUT SHAPE:</span>
                          <p className="text-slate-300 font-bold">224 x 224 x 3</p>
                        </div>
                        <div>
                          <span className="text-slate-600">PATCH SIZE:</span>
                          <p className="text-slate-300 font-bold">16 x 16 Pixels</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: Training Plots & Evaluation (cols 5-12) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {currentModelData && currentModelData.status === "trained" && currentModelData.history ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* PLOT CARD: Training History */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            HISTORIC TRAINING LOSS & ACCURACY
                          </h4>
                          <h3 className="text-lg font-bold text-white mt-1 uppercase">{selectedArch} Fine-Tuning Performance</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-full inline-block"></span> Val Acc</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span> Val Loss</span>
                        </div>
                      </div>

                      {/* Recharts Performance Line Graph */}
                      <div className="w-full h-72 bg-slate-950/60 rounded-xl border border-slate-900 p-3 shadow-inner">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={currentModelData.history} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                            <CartesianGrid stroke="#0f172a" strokeDasharray="3 3" />
                            <XAxis dataKey="epoch" stroke="#475569" tickFormatter={(v) => `Ep ${v}`} style={{ fontSize: "10px", fontFamily: "monospace" }} />
                            <YAxis yAxisId="left" stroke="#10b981" domain={[0.4, 1.0]} style={{ fontSize: "10px", fontFamily: "monospace" }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" domain={[0, 1.0]} style={{ fontSize: "10px", fontFamily: "monospace" }} />
                            <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px", color: "#fff", fontFamily: "monospace" }} />
                            <Line yAxisId="left" type="monotone" dataKey="valAccuracy" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Val Acc" />
                            <Line yAxisId="right" type="monotone" dataKey="valLoss" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} name="Val Loss" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* METRICS GRID: Detailed Validation Metrics */}
                    {currentModelData.evalResults && (
                      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4">
                        <h4 className="text-xs font-semibold font-display text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                          <History className="w-4 h-4 text-emerald-400" />
                          VALIDATION CONFUSION MATRIX & MODEL METRICS
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          
                          {/* Left: Score Box Metrics */}
                          <div className="md:col-span-5 grid grid-cols-2 gap-3">
                            {[
                              { label: "Accuracy", val: currentModelData.evalResults.accuracy, color: "text-white" },
                              { label: "Precision", val: currentModelData.evalResults.precision, color: "text-emerald-400" },
                              { label: "Recall / Sensitivity", val: currentModelData.evalResults.recall, color: "text-emerald-400" },
                              { label: "F1-Score", val: currentModelData.evalResults.f1Score, color: "text-emerald-400" },
                              { label: "False Positive Rate", val: currentModelData.evalResults.fpr, color: "text-rose-400" },
                              { label: "False Negative Rate", val: currentModelData.evalResults.fnr, color: "text-rose-400" },
                            ].map((item, idx) => (
                              <div key={idx} className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex flex-col justify-between h-20 shadow-inner">
                                <span className="text-[10px] font-mono text-slate-500 uppercase leading-none">{item.label}</span>
                                <span className={`text-xl font-bold font-display mt-2 ${item.color}`}>
                                  {(item.val * 100).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Right: Confusion Matrix Box Display */}
                          <div className="md:col-span-7 bg-slate-950 border border-slate-900 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">CONFUSION MATRIX (200 SAMPLE TEST SET)</span>
                            
                            <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2 text-xs font-mono text-center mt-2">
                              {/* Headers */}
                              <div></div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-center font-bold">PRED REAL</div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-center font-bold">PRED FAKE</div>

                              {/* Row 1 */}
                              <div className="text-[10px] text-slate-500 flex items-center justify-start font-bold pr-2">ACTUAL REAL</div>
                              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex flex-col items-center justify-center py-2">
                                <span className="text-base font-black">{currentModelData.evalResults.confusionMatrix.trueNegative}</span>
                                <span className="text-[9px] opacity-60">True Neg (TN)</span>
                              </div>
                              <div className="bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded flex flex-col items-center justify-center py-2">
                                <span className="text-base font-black">{currentModelData.evalResults.confusionMatrix.falsePositive}</span>
                                <span className="text-[9px] opacity-60">False Pos (FP)</span>
                              </div>

                              {/* Row 2 */}
                              <div className="text-[10px] text-slate-500 flex items-center justify-start font-bold pr-2">ACTUAL FAKE</div>
                              <div className="bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded flex flex-col items-center justify-center py-2">
                                <span className="text-base font-black">{currentModelData.evalResults.confusionMatrix.falseNegative}</span>
                                <span className="text-[9px] opacity-60">False Neg (FN)</span>
                              </div>
                              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex flex-col items-center justify-center py-2">
                                <span className="text-base font-black">{currentModelData.evalResults.confusionMatrix.truePositive}</span>
                                <span className="text-[9px] opacity-60">True Pos (TP)</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  
                  /* UNTRAINED MODEL SPECIFIC OVERVIEW */
                  <div className="bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-inner min-h-[400px]">
                    <div className="w-16 h-16 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center text-slate-500">
                      <Cpu className="w-8 h-8 text-slate-400 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-white">MODEL UNTRAINED OR TRAINING</h3>
                      <p className="text-xs text-slate-500 max-w-[340px] mx-auto mt-2 leading-relaxed">
                        This local ML neural architecture has no saved checkpoints or is currently in a training cycle. Adjust the epochs slider and click "Train" to initiate training.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* 5. Footer with Telemetry Logs */}
      <footer className="border-t border-slate-900 py-4 px-6 bg-slate-950 flex flex-wrap justify-between items-center text-[10px] font-mono text-slate-500 gap-4 mt-8">
        <div>
          STATUS: <span className="text-emerald-400 font-bold">ONLINE</span> // FORENSICS NODE ID: <span className="text-slate-300 font-bold">{Math.random().toString(16).substring(2, 8).toUpperCase()}</span>
        </div>
        <div>
          SECURE CONNECTION VIA HTTPS // NO EXTERNAL EXPOSURE
        </div>
      </footer>

    </div>
  );
}
