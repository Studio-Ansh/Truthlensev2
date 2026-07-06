import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  Video, 
  AlertTriangle, 
  CheckCircle, 
  History, 
  Settings, 
  TrendingUp, 
  Activity, 
  Eye, 
  Sparkles, 
  FileText,
  FileVideo,
  Layers,
  Cpu,
  Trash2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MetricResult {
  authenticity_score: number;
  risk_level: string;
  confidence_score: number;
  trust_index: number;
}

interface ForensicAspect {
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  variance?: number;
  max_spike_ratio?: number;
  mean_energy?: number;
  mean_ratio?: number;
  max_seam_intensity?: number;
  mean_chroma_ratio?: number;
  anomalous_peaks?: boolean;
}

interface ForensicsData {
  temporal_flicker: ForensicAspect;
  fft_spectrum: ForensicAspect;
  sensor_grain: ForensicAspect;
  blending_seams: ForensicAspect;
  chrominance: ForensicAspect;
  overall_manipulated: boolean;
  confidence: number;
  manipulation_score: number;
  manipulated_region: string;
  manipulation_type: string;
  forensic_proof_points: string[];
}

interface VerificationReport {
  file_name: string;
  file_path: string;
  duration_seconds: number | null;
  metrics: MetricResult;
  forensics: ForensicsData;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  metrics: MetricResult;
  forensics: ForensicsData;
  logs?: string;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  
  // Controls for testing / forcing fallbacks
  const [forceManipulated, setForceManipulated] = useState(false);
  const [forceAuthentic, setForceAuthentic] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch verification history', err);
    }
  };

  const steps = [
    'Decoding and demuxing MP4 container streams...',
    'Analyzing 2D FFT frequency spectrum for upsampling lattices...',
    'Mapping frame-by-frame temporal stability gradients...',
    'Estimating Laplacian localized camera sensor noise uniformities...',
    'Sweeping boundary seams for rectangular blend contours...',
    'Validating multi-spectral chrominance phase alignments...',
    'Generating final media integrity index...'
  ];

  // Progress stepper simulation
  useEffect(() => {
    let interval: any;
    if (analyzing) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            return prev;
          }
        });
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      } else {
        setErrorMsg('Please upload a valid MP4 or video format file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const startVerification = async () => {
    if (!videoFile) return;

    setAnalyzing(true);
    setErrorMsg(null);
    setReport(null);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('forceManipulated', forceManipulated.toString());
    formData.append('forceAuthentic', forceAuthentic.toString());

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error running verification');
      }

      const data = await response.json();
      setReport(data);
      fetchHistory(); // Refresh history
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not connect to the verification engine API. Please make sure the backend is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High Risk': return 'text-red-500 border-red-500/20 bg-red-500/5';
      case 'Medium Risk': return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
      default: return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Background radial effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        
        {/* Navigation & Logo */}
        <header className="flex justify-between items-center mb-10 border-b border-slate-800/60 pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                TRUTHLENS <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono border border-indigo-500/20">MEDIA CORE</span>
              </h1>
              <p className="text-xs text-slate-400">Deepfake Detection & Media Provenance Engine</p>
            </div>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center space-x-2 ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Verify Media</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center space-x-2 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Analytic History</span>
              {history.length > 0 && (
                <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full text-[10px]">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Tab Content: Upload & Verify */}
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Side: Upload Zone & Configuration */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
                  <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-400" /> Upload Target Video
                  </h2>

                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${
                      dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <input
                      type="file"
                      id="video-upload"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                          <Upload className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-200">Drag & drop video, or <span className="text-indigo-400">browse file</span></p>
                          <p className="text-[10px] text-slate-500 mt-1">Accepts MP4, MOV, or standard video formats</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Selected Video Card */}
                  {videoFile && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                          <FileVideo className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-slate-200 truncate">{videoFile.name}</p>
                          <p className="text-[10px] text-slate-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setVideoFile(null)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {errorMsg && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                {/* Simulated Verification Modes */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-400" /> Forensic Testing Control
                    </h2>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">SANDBOX ACTIVE</span>
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Force specific deepfake generation signatures to verify the model fallback accuracy and explore Explainable AI (XAI) output vectors.
                  </p>

                  <div className="space-y-3">
                    <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${forceManipulated ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-950/20 border-slate-800/60 hover:bg-slate-950/40'}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-200">Force Deepfake Verdict</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">High-risk, severe manipulation signature</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={forceManipulated} 
                        onChange={(e) => {
                          setForceManipulated(e.target.checked);
                          if (e.target.checked) setForceAuthentic(false);
                        }}
                        className="accent-indigo-500 h-4 w-4 rounded cursor-pointer"
                      />
                    </label>

                    <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${forceAuthentic ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950/20 border-slate-800/60 hover:bg-slate-950/40'}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-200">Force Authentic Verdict</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Clean background, uniform sensor grain</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={forceAuthentic} 
                        onChange={(e) => {
                          setForceAuthentic(e.target.checked);
                          if (e.target.checked) setForceManipulated(false);
                        }}
                        className="accent-indigo-500 h-4 w-4 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  disabled={!videoFile || analyzing}
                  onClick={startVerification}
                  className={`w-full py-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-lg ${
                    videoFile && !analyzing
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/20 cursor-pointer active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Verification...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Begin Forensic Sweep</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Side: Output Dashboard / Loader */}
              <div className="lg:col-span-7">
                {analyzing ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 backdrop-blur-md flex flex-col items-center justify-center min-h-[500px]"
                  >
                    <div className="relative mb-8">
                      {/* Outer pulse */}
                      <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" />
                      {/* Inner circle spinner */}
                      <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin flex items-center justify-center relative">
                        <Shield className="w-8 h-8 text-indigo-400 absolute" />
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-2">Analyzing Media Integrity</h3>
                    <p className="text-xs text-slate-400 mb-8 max-w-sm text-center leading-relaxed">
                      Please wait. Running full-spectrum multi-channel physical & spectral diagnostics on target.
                    </p>

                    <div className="w-full max-w-md bg-slate-950 border border-slate-800/60 p-4 rounded-xl">
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-medium text-slate-300">Analysis Pipeline Status</span>
                        <span className="text-indigo-400 font-mono font-semibold">{Math.round((currentStep + 1) / steps.length * 100)}%</span>
                      </div>
                      
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-4">
                        <motion.div 
                          className="bg-indigo-500 h-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentStep}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center space-x-2"
                        >
                          <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span className="text-[11px] font-mono text-slate-400 truncate">{steps[currentStep]}</span>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : report ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Verdict Card */}
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/60 pb-6">
                        <div className="space-y-1">
                          <span className="text-[10px] text-indigo-400 font-mono font-semibold tracking-wider uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">VERDICT GENERATED</span>
                          <h3 className="text-lg font-bold text-white mt-2 truncate max-w-sm">{report.file_name}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Media duration: {report.duration_seconds ? `${report.duration_seconds.toFixed(2)}s` : 'Procedural Fallback'}
                          </p>
                        </div>

                        {/* Large Score Indicator */}
                        <div className="flex items-center space-x-4 shrink-0">
                          <div className="relative flex items-center justify-center">
                            {/* Score ring */}
                            <svg className="w-20 h-20 transform -rotate-90">
                              <circle cx="40" cy="40" r="34" className="stroke-slate-800 fill-none" strokeWidth="5" />
                              <motion.circle 
                                cx="40" 
                                cy="40" 
                                r="34" 
                                className={`fill-none ${
                                  report.metrics.risk_level === 'High Risk' ? 'stroke-red-500' : 
                                  report.metrics.risk_level === 'Medium Risk' ? 'stroke-amber-500' : 'stroke-emerald-500'
                                }`} 
                                strokeWidth="5" 
                                strokeDasharray={2 * Math.PI * 34}
                                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - report.metrics.authenticity_score / 100) }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                              />
                            </svg>
                            <span className="absolute text-sm font-extrabold text-white font-mono">{report.metrics.authenticity_score}%</span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Authenticity Score</p>
                            <div className={`text-xs px-2.5 py-1 rounded-full border inline-block font-semibold ${getRiskColor(report.metrics.risk_level)}`}>
                              {report.metrics.risk_level.toUpperCase()}
                            </div>
                            <p className="text-[10px] text-slate-500">Confidence: {report.metrics.confidence_score}%</p>
                          </div>
                        </div>
                      </div>

                      {/* XAI Evidence Points */}
                      <div className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400" /> FORENSIC PROOF POINTS
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">Platform Trust: {report.metrics.trust_index}/10.0</span>
                        </div>

                        {report.forensics.overall_manipulated ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                              <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> Generative Discrepancies Confirmed
                              </p>
                              <div className="text-slate-300 text-xs mt-1.5 leading-relaxed space-y-1">
                                <p><strong className="text-slate-200">Detected Type:</strong> {report.forensics.manipulation_type}</p>
                                <p><strong className="text-slate-200">Target Region:</strong> {report.forensics.manipulated_region}</p>
                              </div>
                            </div>

                            <ul className="space-y-2">
                              {report.forensics.forensic_proof_points.map((pt, index) => (
                                <motion.li 
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  key={index} 
                                  className="text-xs text-slate-300 flex items-start space-x-2.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40"
                                >
                                  <span className="text-[10px] font-mono font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">FAIL</span>
                                  <span className="leading-relaxed">{pt}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-emerald-400">All Forensic Indices Authentic</p>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                  No signatures of face-swapping, GAN checkerboards, localized boundary blending seams, or temporal flicker spikes were detected. The media corresponds perfectly to authentic physical recording properties.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Multi-Channel Breakdown */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-400" /> Multi-Spectral Diagnostics
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FFT Spectrum */}
                        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-white">FFT 2D Frequency Domain</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${getSeverityColor(report.forensics.fft_spectrum.severity)}`}>
                                {report.forensics.fft_spectrum.severity} Severity
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {report.forensics.fft_spectrum.description}
                            </p>
                          </div>
                          {report.forensics.fft_spectrum.mean_energy && (
                            <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/40">
                              Mean High-Freq Energy: {report.forensics.fft_spectrum.mean_energy.toFixed(1)}
                            </div>
                          )}
                        </div>

                        {/* Temporal Flicker */}
                        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-white">Temporal Consistency</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${getSeverityColor(report.forensics.temporal_flicker.severity)}`}>
                                {report.forensics.temporal_flicker.severity} Severity
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {report.forensics.temporal_flicker.description}
                            </p>
                          </div>
                          {report.forensics.temporal_flicker.variance !== undefined && (
                            <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/40">
                              Variance: {report.forensics.temporal_flicker.variance.toFixed(6)} | Spike ratio: {report.forensics.temporal_flicker.max_spike_ratio}x
                            </div>
                          )}
                        </div>

                        {/* Sensor Grain */}
                        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-white">Sensor Grain Map</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${getSeverityColor(report.forensics.sensor_grain.severity)}`}>
                                {report.forensics.sensor_grain.severity} Severity
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {report.forensics.sensor_grain.description}
                            </p>
                          </div>
                          {report.forensics.sensor_grain.mean_ratio !== undefined && (
                            <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/40">
                              Face vs Environment Noise ratio: {report.forensics.sensor_grain.mean_ratio}
                            </div>
                          )}
                        </div>

                        {/* Blending Seams */}
                        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-semibold text-white">Blending Borders & Seams</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${getSeverityColor(report.forensics.blending_seams.severity)}`}>
                                {report.forensics.blending_seams.severity} Severity
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {report.forensics.blending_seams.description}
                            </p>
                          </div>
                          {report.forensics.blending_seams.max_seam_intensity !== undefined && (
                            <div className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/40">
                              Max Edge Seam Force: {report.forensics.blending_seams.max_seam_intensity}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mb-4 text-slate-500">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-300">No Target Analyzed</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Select a video file and hit the forensic sweep button to generate complete media authenticity analytics.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab Content: Analytic History */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md min-h-[500px]"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" /> Historic Verification Audits
                </h2>
                <span className="text-xs text-slate-400">{history.length} Saved Scans</span>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Clock className="w-10 h-10 text-slate-600 mb-3" />
                  <p className="text-xs font-semibold text-slate-400">History Empty</p>
                  <p className="text-[11px] text-slate-500 mt-1">Verified files will appear here for audit tracking.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Media File</th>
                        <th className="py-3 px-4 font-semibold">Risk Level</th>
                        <th className="py-3 px-4 font-semibold">Authenticity</th>
                        <th className="py-3 px-4 font-semibold">Confidence</th>
                        <th className="py-3 px-4 font-semibold">Timestamp</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/30 transition-all">
                          <td className="py-4 px-4 font-medium text-slate-200">
                            <div className="flex items-center space-x-2.5 max-w-xs">
                              <FileVideo className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate">{item.fileName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                              item.metrics.risk_level === 'High Risk' ? 'text-red-400 bg-red-400/5 border-red-400/20' :
                              item.metrics.risk_level === 'Medium Risk' ? 'text-amber-400 bg-amber-400/5 border-amber-400/20' :
                              'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                            }`}>
                              {item.metrics.risk_level}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-semibold font-mono text-slate-300">
                            {item.metrics.authenticity_score}%
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-400">
                            {item.metrics.confidence_score}%
                          </td>
                          <td className="py-4 px-4 text-slate-400 text-[11px]">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                setReport({
                                  file_name: item.fileName,
                                  file_path: '',
                                  duration_seconds: null,
                                  metrics: item.metrics,
                                  forensics: item.forensics
                                });
                                setActiveTab('upload');
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 rounded text-[11px] text-indigo-400 transition inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 border-t border-slate-900 pt-6 text-center text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} TRUTHLENS. Fully standalone physical & spectral forensics core.</p>
        </footer>
      </div>
    </div>
  );
}
