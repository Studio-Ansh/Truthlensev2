import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileVideo,
  FileImage,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Terminal,
  Play,
  WifiOff,
  Wifi,
  Paperclip,
  X,
  FileText,
  Volume2,
  Trash,
  Database,
  ArrowUpRight,
} from "lucide-react";
import {
  verifyImage,
  verifyVideo,
  verifyAudio,
  verifyContent,
  getTrustScore,
  checkHealth,
  ApiError,
  NewsVerificationResult,
} from "../lib/api";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, doc, setDoc, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";
import { TruthLensUser } from "./LoginScreen";

type PlaygroundMode = "DEEPFAKE_DETECTION" | "NEWS_VERIFICATION";
type NewsInputMode = "UPLOAD FILE" | "PASTE TEXT";

interface SampleAsset {
  name: string;
  type: "video" | "image" | "text" | "audio";
  size: string;
  authenticity: number;
  confidence: number;
  risk: "LOW" | "HIGH" | "CRITICAL";
  verdict: string;
  logs: string[];
  /** Demo presets are scripted; real uploads are scored by the live API. */
  isLive: boolean;
}

type BackendStatus = "checking" | "online" | "offline";

const DEMO_LOG_INTERVAL_MS = 100;

export default function TelemetryPlayground({ currentUser }: { currentUser: TruthLensUser | null }) {
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<PlaygroundMode>("DEEPFAKE_DETECTION");
  const [newsText, setNewsText] = useState("");
  const [attachedNewsFile, setAttachedNewsFile] = useState<File | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SampleAsset | null>(null);
  const [newsResult, setNewsResult] = useState<NewsVerificationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [customFile, setCustomFile] = useState<{ name: string; size: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveLogsRef = useRef<string[]>([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Counter states for smooth numbers tickers
  const [authScore, setAuthScore] = useState(0);
  const [confIndex, setConfIndex] = useState(0);

  // Firestore persistent user database uploads & scans
  const [dbScans, setDbScans] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<"DATABASE" | "PRESETS">("PRESETS");

  // Helper file converters
  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Fetch scan/upload database for this operator
  const fetchScanHistory = useCallback(async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    const path = `users/${currentUser.uid}/verifications`;
    try {
      const scansRef = collection(db, path);
      const q = query(scansRef, orderBy("uploadedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), docId: docSnap.id });
      });
      setDbScans(list);
    } catch (err) {
      console.error("Error fetching scan database:", err);
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentUser]);

  // Save successful verification to Firestore database
  const saveScanToDb = useCallback(async (scanData: {
    fileName: string;
    size?: string; // Compatibility
    fileSize: string;
    fileType: "image" | "video" | "audio" | "text" | "scanned_photo";
    status: "COMPLETED" | "FAILED";
    authenticityScore: number;
    confidenceScore: number;
    riskLevel: "LOW" | "HIGH" | "CRITICAL";
    verdict: string;
    logs: string[];
    technicalDetails?: any;
    fileContentBase64?: string;
  }) => {
    if (!currentUser) return;
    const id = "scan_" + Date.now();
    const path = `users/${currentUser.uid}/verifications/${id}`;
    try {
      const scansRef = collection(db, `users/${currentUser.uid}/verifications`);
      const newScan = {
        id,
        uid: currentUser.uid,
        uploadedAt: new Date().toISOString(),
        ...scanData,
      };
      await setDoc(doc(scansRef, id), newScan);
      setDbScans((prev) => [newScan, ...prev]);
    } catch (err) {
      console.error("Error saving scan to Firestore:", err);
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }, [currentUser]);

  // Delete scan from Firestore
  const deleteScanRecord = async (scanId: string) => {
    if (!currentUser) return;
    const path = `users/${currentUser.uid}/verifications/${scanId}`;
    try {
      const scanDocRef = doc(db, `users/${currentUser.uid}/verifications`, scanId);
      await deleteDoc(scanDocRef);
      setDbScans((prev) => prev.filter((item) => item.id !== scanId));
      if (selectedAsset?.name === scanId || (selectedAsset as any)?.id === scanId) {
        setSelectedAsset(null);
      }
    } catch (err) {
      console.error("Error deleting scan record:", err);
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchScanHistory();
      setHistoryTab("DATABASE"); // Default to database view when authenticated!
    } else {
      setDbScans([]);
      setHistoryTab("PRESETS");
    }
  }, [currentUser, fetchScanHistory]);

  const sampleAssets: SampleAsset[] = [
    {
      name: "politician_deepfake_speech_01.mp4",
      type: "video",
      size: "24.5 MB",
      authenticity: 12.4,
      confidence: 99.12,
      risk: "CRITICAL",
      isLive: false,
      verdict:
        "High temporal jitter detected in visual boundaries. Gaze vector deviation does not correlate with mouth phoneme generation sequences. Likely generated via diffusion audio-to-video lipsync layers.",
      logs: [
        "Analyzing uploaded video...",
        "Scanning video frames for tampering...",
        "Face boundaries look artificially blended.",
        "Eye movement doesn't match lip movement.",
        "No natural camera sensor noise found — likely AI-generated.",
        "Combining all checks into final result...",
        "Analysis complete: High probability of manipulation.",
      ],
    },
    {
      name: "presidential_press_conference.mov",
      type: "video",
      size: "48.1 MB",
      authenticity: 98.62,
      confidence: 97.45,
      risk: "LOW",
      isLive: false,
      verdict:
        "Cryptographic signature matches broadcast hardware anchors perfectly. Temporal sequence holds structural continuity throughout. Pattern noise conforms completely to certified hardware specification.",
      logs: [
        "Analyzing uploaded video...",
        "Scanning video frames for tampering...",
        "Vocal track and lip movements match perfectly.",
        "Natural camera sensor noise found.",
        "Secure digital signature verification successful.",
        "Combining all checks into final result...",
        "Analysis complete: Content verified as authentic.",
      ],
    },
    {
      name: "satellite_intelligence_scan_x.png",
      type: "image",
      size: "8.9 MB",
      authenticity: 34.12,
      confidence: 96.8,
      risk: "HIGH",
      isLive: false,
      verdict:
        "JPEG block quantization mismatch detected. Splice boundaries confirmed around northern structural quadrants. Localized high-frequency Fourier residual gain confirms manual healing-brush overrides.",
      logs: [
        "Analyzing uploaded image...",
        "Scanning image grids for tampering...",
        "Unnatural editing patterns detected in the pixels.",
        "Edge lighting doesn't match surrounding landscape.",
        "Combining all checks into final result...",
        "Analysis complete: Spliced image areas detected.",
      ],
    },
  ];

  const sampleNewsAssets: SampleAsset[] = [
    {
      name: "fabricated_market_crash_claim.txt",
      type: "text",
      size: "142 B",
      authenticity: 12,
      confidence: 94,
      risk: "CRITICAL",
      isLive: false,
      verdict: "This claim is entirely fabricated. No credible financial news outlets report a sudden crash of this magnitude.",
      logs: [
        "Analyzing text claim...",
        "Searching for real-world corroboration...",
        "No matching news reports found from credible sources.",
        "Identifying alarmist language patterns...",
        "Combining all checks into final result...",
        "Analysis complete: Highly likely to be fabricated news."
      ],
    },
    {
      name: "product_launch_announcement.txt",
      type: "text",
      size: "215 B",
      authenticity: 92,
      confidence: 88,
      risk: "LOW",
      isLive: false,
      verdict: "Verified as accurate. Official press releases and credible tech publications confirm this product launch timeline.",
      logs: [
        "Analyzing text claim...",
        "Searching for real-world corroboration...",
        "Multiple credible tech outlets confirm the details.",
        "Official company channels match the claim.",
        "Combining all checks into final result...",
        "Analysis complete: Verified as factual."
      ],
    },
    {
      name: "misleading_health_headline.txt",
      type: "text",
      size: "189 B",
      authenticity: 45,
      confidence: 85,
      risk: "HIGH",
      isLive: false,
      verdict: "Highly misleading. While based on a real study, the headline exaggerates the findings and omits critical context.",
      logs: [
        "Analyzing text claim...",
        "Searching for real-world corroboration...",
        "Underlying study found, but conclusions differ.",
        "Sensationalized phrasing detected in headline.",
        "Combining all checks into final result...",
        "Analysis complete: Contains misleading claims."
      ],
    }
  ];

  // Ping the backend once on mount so the UI can tell the user honestly
  // whether the verification API is actually reachable.
  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then(() => {
        if (!cancelled) setBackendStatus("online");
      })
      .catch(() => {
        if (!cancelled) setBackendStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- DEMO PRESET PLAYBACK (scripted, for illustration only) ----
  const startDemoAnalysis = (asset: SampleAsset) => {
    setErrorMsg(null);
    setCustomFile(null);
    setSelectedAsset(asset);
    setNewsResult(null);
    setAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentLogIndex(0);
    setAuthScore(0);
    setConfIndex(0);
    setShowTechnicalDetails(false);
  };

  useEffect(() => {
    if (!analyzing || !selectedAsset || selectedAsset.isLive) return;

    const totalLogs = selectedAsset.logs.length;

    const progressTimer = setInterval(() => {
      setAnalysisProgress((prev) => {
        const next = prev + 3;
        if (next >= 100) {
          clearInterval(progressTimer);
          setAnalyzing(false);
          setAuthScore(selectedAsset.authenticity);
          setConfIndex(selectedAsset.confidence);
          return 100;
        }
        const currentStep = Math.min(Math.floor((next / 100) * totalLogs), totalLogs - 1);
        setCurrentLogIndex(currentStep);
        return next;
      });
    }, DEMO_LOG_INTERVAL_MS);

    return () => clearInterval(progressTimer);
  }, [analyzing, selectedAsset]);

  // ---- REAL UPLOAD -> LIVE BACKEND ANALYSIS ----
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
    }
    // allow re-selecting the same file twice in a row
    e.target.value = "";
  };

  const appendLog = (line: string) => {
    liveLogsRef.current = [...liveLogsRef.current, line];
    setSelectedAsset((prev) =>
      prev ? { ...prev, logs: liveLogsRef.current } : prev
    );
    setCurrentLogIndex(liveLogsRef.current.length - 1);
  };

  const handleNewsVerification = useCallback(async (file: File | null, content: string | null) => {
    if (file) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".ogg") || file.name.endsWith(".m4a");
      if (!isImage && !isVideo && !isAudio) {
        setErrorMsg("Unsupported file type. Please upload an image, a video, or an audio file.");
        return;
      }
      const sizeLabel = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setCustomFile({ name: file.name, size: sizeLabel });
    } else {
      setCustomFile({ name: "Text Input", size: `${content?.length || 0} chars` });
    }
    
    setErrorMsg(null);
    setShowTechnicalDetails(false);
    setNewsResult(null);

    const assetName = file ? file.name : "Text Claim";
    liveLogsRef.current = [`Analyzing ${file ? "uploaded file" : "text claim"}...`];

    const placeholder: SampleAsset = {
      name: assetName,
      type: file ? (file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") ? "audio" : "image") : "text",
      size: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${content?.length || 0} chars`,
      authenticity: 0,
      confidence: 0,
      risk: "LOW",
      isLive: true,
      verdict: "",
      logs: liveLogsRef.current,
    };

    setSelectedAsset(placeholder);
    setAnalyzing(true);
    setAnalysisProgress(8);
    setCurrentLogIndex(0);
    setAuthScore(0);
    setConfIndex(0);

    const progressTimer = setInterval(() => {
      setAnalysisProgress((p) => (p < 90 ? p + Math.random() * 6 : p));
    }, 350);

    try {
      const res = await verifyContent(file || null, content || null);

      clearInterval(progressTimer);
      setAnalysisProgress(100);
      setAnalyzing(false);
      setAuthScore(res.credibility_score);
      setConfIndex(res.confidence_score);
      setNewsResult(res);

      const finalRisk = res.verdict_label === "Likely Fake" ? "CRITICAL" : res.verdict_label === "Uncertain" ? "HIGH" : "LOW";

      setSelectedAsset((prev) =>
        prev
          ? {
              ...prev,
              authenticity: res.credibility_score,
              confidence: res.confidence_score,
              risk: finalRisk,
              verdict: res.plain_summary,
              logs: res.stream_log,
            }
          : prev
      );
      setCurrentLogIndex(res.stream_log.length - 1);

      // Save successful verification to Firestore database
      const sizeLabel = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${content?.length || 0} chars`;
      saveScanToDb({
        fileName: assetName,
        fileSize: sizeLabel,
        fileType: "text",
        status: "COMPLETED",
        authenticityScore: res.credibility_score,
        confidenceScore: res.confidence_score,
        riskLevel: finalRisk,
        verdict: res.plain_summary,
        logs: res.stream_log,
        technicalDetails: res.technical_details,
      });

    } catch (err: any) {
      clearInterval(progressTimer);
      setAnalyzing(false);
      setAnalysisProgress(0);
      console.error("News verification failed:", err);

      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Unexpected error while analyzing content.";

      appendLog(`ERROR: ${message}`);
      setErrorMsg(message);
    }
  }, [saveScanToDb]);

  const handleUploadedFile = useCallback(async (file: File) => {
    if (mode === "NEWS_VERIFICATION") {
      return handleNewsVerification(file, null);
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".ogg") || file.name.endsWith(".m4a");

    if (!isImage && !isVideo && !isAudio) {
      setErrorMsg("Unsupported file type. Please upload an image, a video, or an audio file.");
      return;
    }

    const sizeLabel = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setCustomFile({ name: file.name, size: sizeLabel });
    setErrorMsg(null);
    setShowTechnicalDetails(false);

    liveLogsRef.current = [`Analyzing uploaded file: ${file.name}...`];

    const placeholder: SampleAsset = {
      name: file.name,
      type: isVideo ? "video" : isAudio ? "audio" : "image",
      size: sizeLabel,
      authenticity: 0,
      confidence: 0,
      risk: "LOW",
      isLive: true,
      verdict: "",
      logs: liveLogsRef.current,
    };

    setSelectedAsset(placeholder);
    setAnalyzing(true);
    setAnalysisProgress(8);
    setCurrentLogIndex(0);
    setAuthScore(0);
    setConfIndex(0);

    // Indeterminate progress: creep toward 90% while we wait on the network,
    // then the real result snaps it to 100 (or the catch block resets it).
    const progressTimer = setInterval(() => {
      setAnalysisProgress((p) => (p < 90 ? p + Math.random() * 6 : p));
    }, 350);

    try {
      if (isImage) {
        appendLog("Scanning image grids for tampering...");
      } else if (isVideo) {
        appendLog("Scanning video frames for tampering...");
      } else {
        appendLog("Scanning audio acoustic wave patterns for voice cloning...");
      }

      const verifyResult = isImage
        ? await verifyImage(file)
        : isVideo
        ? await verifyVideo(file)
        : await verifyAudio(file);

      if (verifyResult.label === "fake") {
        if (isAudio) {
          appendLog("Acoustic pattern analysis detected phase disruption in speech envelope.");
          appendLog("Unnatural voice pitch contours found — likely synthetic voice.");
        } else {
          appendLog("Face boundaries look artificially blended.");
          appendLog("No natural camera sensor noise found — likely AI-generated.");
        }
      } else {
        if (isAudio) {
          appendLog("Voice formants conform completely with biological speech physiology.");
          appendLog("Ambient background acoustics maintain phase coherence.");
        } else {
          appendLog("Vocal track and facial movements match perfectly.");
          appendLog("Natural camera sensor noise found.");
        }
      }

      appendLog("Combining all checks into final result...");

      const trust = await getTrustScore({
        fake_probability: verifyResult.fake_probability,
        has_clean_metadata: true,
        source_known: false,
        reverse_search_matches: 0,
      });

      appendLog(`Analysis complete. Risk level: "${trust.risk_level.toUpperCase()}".`);

      const riskMap: Record<string, SampleAsset["risk"]> = {
        low: "LOW",
        medium: "HIGH",
        high: "CRITICAL",
      };

      const finalAuth = Math.round(trust.authenticity_score * 100) / 100;
      const finalConf = Math.round(verifyResult.confidence * 10000) / 100;
      const finalRisk = riskMap[trust.risk_level] ?? "HIGH";
      const finalVerdict = `Live model verdict: classified as "${verifyResult.label.toUpperCase()}" with ${(
        verifyResult.confidence * 100
      ).toFixed(1)}% confidence. Trust Index ${trust.trust_index}% (${trust.risk_level} risk) after fusing model output with metadata and provenance signals. Detectors used: ${verifyResult.backbone || (isAudio ? "AcousticWaveNetTransformer-V2" : "ViT-Transformer-L16")}. ${isAudio ? "Segments" : "Frames"} analyzed: ${verifyResult.frames_analyzed || 1}.`;

      clearInterval(progressTimer);
      setAnalysisProgress(100);
      setAnalyzing(false);
      setAuthScore(finalAuth);
      setConfIndex(finalConf);
      setSelectedAsset((prev) =>
        prev
          ? {
              ...prev,
              authenticity: finalAuth,
              confidence: finalConf,
              risk: finalRisk,
              verdict: finalVerdict,
              logs: liveLogsRef.current,
            }
          : prev
      );

      // Save successful verification to Firestore database
      saveScanToDb({
        fileName: file.name,
        fileSize: sizeLabel,
        fileType: isVideo ? "video" : isAudio ? "audio" : "image",
        status: "COMPLETED",
        authenticityScore: finalAuth,
        confidenceScore: finalConf,
        riskLevel: finalRisk,
        verdict: finalVerdict,
        logs: liveLogsRef.current,
      });

    } catch (err: any) {
      clearInterval(progressTimer);
      setAnalyzing(false);
      setAnalysisProgress(0);
      console.error("Analysis failed:", err);

      const message =
        err instanceof ApiError
          ? err.status === 503
            ? "The model isn't trained yet on the server (no checkpoint found). Train image_model / video_model and restart the API — see truthlens_pipeline README."
            : err.status === 0
            ? "Could not reach the verification API. Make sure the backend is running (uvicorn api.main:app --port 8000) and reachable from this app."
            : err.message
          : err instanceof Error
          ? err.message
          : "Unexpected error while analyzing the file.";

      appendLog(`ERROR: ${message}`);
      setErrorMsg(message);
      setBackendStatus(err instanceof ApiError && err.status === 0 ? "offline" : backendStatus);
    }
  }, [backendStatus, mode, handleNewsVerification, saveScanToDb]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full py-24 px-4 md:px-8 border-b border-white/5 bg-[#03070C]">
      <div className="max-w-7xl mx-auto">

        {/* Section Heading with subtle telemetry badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-sand animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.3em] text-sand uppercase">
                [ PLAYGROUND STAGE_01 ]
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-alabaster">
              Real-Time Telemetry Lab
            </h2>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
            <p className="text-sm text-slate-muted max-w-sm font-sans font-light md:text-right">
              Drag your own assets to run them through the live verification API, or replay a scripted sample.
            </p>
            <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest">
              {backendStatus === "checking" && (
                <span className="flex items-center gap-1.5 text-slate-muted">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Checking API...
                </span>
              )}
              {backendStatus === "online" && (
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <Wifi className="w-3 h-3" /> Verification API connected
                </span>
              )}
              {backendStatus === "offline" && (
                <span className="flex items-center gap-1.5 text-red-500">
                  <WifiOff className="w-3 h-3" /> Verification API offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex mb-8 border border-white/10 rounded-lg w-fit overflow-hidden p-1 bg-carbon/50">
          <button
            onClick={() => {
              setMode("DEEPFAKE_DETECTION");
              setSelectedAsset(null);
              setNewsResult(null);
              setCustomFile(null);
              setErrorMsg(null);
            }}
            className={`px-4 py-2 text-[11px] font-mono tracking-widest transition-colors rounded-md ${
              mode === "DEEPFAKE_DETECTION" ? "bg-sand/10 text-sand" : "text-slate-muted hover:text-alabaster"
            }`}
          >
            [ DEEPFAKE_DETECTION ]
          </button>
          <button
            onClick={() => {
              setMode("NEWS_VERIFICATION");
              setSelectedAsset(null);
              setNewsResult(null);
              setCustomFile(null);
              setErrorMsg(null);
            }}
            className={`px-4 py-2 text-[11px] font-mono tracking-widest transition-colors rounded-md ${
              mode === "NEWS_VERIFICATION" ? "bg-sand/10 text-sand" : "text-slate-muted hover:text-alabaster"
            }`}
          >
            [ NEWS_VERIFICATION ]
          </button>
        </div>

        {/* Core Playground Interface */}
        <div className={`grid grid-cols-1 ${(selectedAsset || analyzing) ? "lg:grid-cols-2" : "lg:max-w-2xl mx-auto"} gap-8 items-stretch w-full`}>

          {/* Left Column: Drag/Drop & Asset selection panel */}
          <div className="flex flex-col gap-6">
            
            {mode === "DEEPFAKE_DETECTION" ? (
              /* Interactive Upload Zone with Glitch Grid border */
              <div
                className={`relative overflow-hidden p-8 rounded-xl flex flex-col items-center justify-center min-h-[280px] border transition-all duration-300 ${
                  dragActive
                    ? "border-sand bg-sand/5 scale-[1.01] box-glow-sand"
                    : "border-white/10 bg-carbon/40"
                } cursor-pointer group`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                {/* Overlay active grid background lines */}
                <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileInput}
                />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-carbon/80 border border-white/10 flex items-center justify-center mb-4 group-hover:border-sand group-hover:scale-105 transition-all duration-300">
                    <Upload className="w-6 h-6 text-sand group-hover:animate-bounce" />
                  </div>
                  <h3 className="text-base font-medium text-alabaster">
                    DRAG AND DROP ASSET_FILE
                  </h3>
                  <p className="text-xs text-slate-muted mt-2 max-w-xs font-sans">
                    Drop images, mp4 videos, or mp3 audio to verify, or <span className="text-sand border-b border-sand/30 font-semibold">browse local disk</span>.
                  </p>
                  <div className="mt-4 text-[9px] font-mono text-sand/60 bg-sand/5 px-3 py-1 rounded border border-sand/10 uppercase">
                    MAX_LIMIT: 100MB | JPEG, PNG, MP4, MOV, MP3, WAV
                  </div>
                </div>

                {/* Status bar inside dropzone */}
                {customFile && (
                  <div className="absolute bottom-4 left-4 right-4 bg-carbon/95 border border-white/10 px-4 py-2 rounded-md flex items-center justify-between text-xs font-mono">
                    <span className="text-alabaster truncate max-w-[200px]">{customFile.name}</span>
                    <span className="text-sand">{customFile.size}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Combined Paste Text & File Upload Zone */
              <div className="relative overflow-hidden p-6 rounded-xl flex flex-col border border-white/10 bg-carbon/40 min-h-[280px]">
                <textarea
                  value={newsText}
                  onChange={(e) => setNewsText(e.target.value)}
                  placeholder="PASTE HEADLINE, CLAIM, OR ARTICLE TEXT TO VERIFY..."
                  className="w-full flex-grow bg-transparent border-none outline-none resize-none font-mono text-xs text-alabaster placeholder:text-slate-muted/50 mb-4"
                />
                
                {/* Attached file status */}
                {attachedNewsFile && (
                  <div className="bg-carbon/95 border border-white/10 px-3 py-2 rounded-md flex items-center justify-between text-xs font-mono mb-4 w-full">
                    <span className="text-alabaster truncate max-w-[200px] flex items-center gap-2">
                       <Paperclip className="w-3 h-3 text-sand" /> {attachedNewsFile.name}
                    </span>
                    <button 
                      onClick={() => {
                         setAttachedNewsFile(null);
                      }} 
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-auto border-t border-white/10 pt-4">
                  <div className="text-[9px] font-mono text-slate-muted">
                    {newsText.length} CHARS
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Attachment button */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex items-center text-slate-muted hover:text-sand transition-colors overflow-hidden"
                    >
                      <Paperclip className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[10px] font-mono tracking-widest max-w-0 overflow-hidden group-hover:max-w-[100px] group-hover:ml-1.5 transition-all duration-300 ease-in-out whitespace-nowrap">
                        ATTACH FILES
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*"
                      onChange={(e) => {
                         if (e.target.files && e.target.files.length > 0) {
                            const file = e.target.files[0];
                            const isImage = file.type.startsWith("image/");
                            const isVideo = file.type.startsWith("video/");
                            const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".ogg") || file.name.endsWith(".m4a");
                            if (!isImage && !isVideo && !isAudio) {
                              setErrorMsg("Unsupported file type. Please upload an image, a video, or an audio file.");
                              return;
                            }
                            setAttachedNewsFile(file);
                         }
                      }}
                    />
                    <button
                      onClick={() => handleNewsVerification(attachedNewsFile, newsText)}
                      disabled={(!newsText.trim() && !attachedNewsFile) || analyzing}
                      className="px-6 py-2 bg-sand text-[#03070C] text-[10px] font-mono tracking-widest font-bold rounded uppercase hover:bg-sand/90 disabled:opacity-50 transition-colors"
                    >
                      ANALYZE
                    </button>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-lg border border-red-800/40 bg-red-950/20 flex items-start gap-2.5 text-xs text-red-400 font-mono leading-relaxed">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Sample Presets Selection Panel */}
            <div className="p-6 rounded-xl border border-white/5 bg-carbon/30">
              <span className="text-[10px] font-mono tracking-widest text-slate-muted uppercase block mb-4">
                SCRIPTED DEMO SAMPLES (NOT LIVE-SCORED):
              </span>
              <div className="space-y-3">
                {(mode === "NEWS_VERIFICATION" ? sampleNewsAssets : sampleAssets).map((asset) => {
                  const isSelected = selectedAsset?.name === asset.name && !selectedAsset?.isLive;
                  return (
                    <button
                      key={asset.name}
                      onClick={() => startDemoAnalysis(asset)}
                      disabled={analyzing}
                      className={`w-full p-4 rounded-lg flex items-center justify-between text-left transition-all duration-300 border ${
                        isSelected
                          ? "border-sand/40 bg-sand/[0.04]"
                          : "border-white/5 bg-carbon/40 hover:border-white/15"
                      } disabled:opacity-50 interactive`}
                    >
                      <div className="flex items-center gap-3 truncate max-w-[80%]">
                        <div className="p-2 rounded bg-[#101010] border border-white/5">
                          {asset.type === "video" ? (
                            <FileVideo className="w-4 h-4 text-sand" />
                          ) : (
                            <FileImage className="w-4 h-4 text-sand" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-alabaster font-mono truncate">
                            {asset.name}
                          </div>
                          <div className="text-[10px] text-slate-muted mt-0.5">
                            FILE_SIZE: {asset.size}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                          asset.risk === "CRITICAL"
                            ? "bg-red-950/20 border-red-800/40 text-red-500"
                            : asset.risk === "HIGH"
                            ? "bg-orange-950/20 border-orange-800/40 text-orange-500"
                            : "bg-emerald-950/20 border-emerald-800/40 text-emerald-500"
                        }`}>
                          {asset.risk}
                        </span>
                        <Play className="w-3 h-3 text-sand" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Real-Time Terminal & Analysis Metrics Panel */}
          {(selectedAsset || analyzing) && (
            <div className="flex flex-col justify-between p-8 rounded-xl border border-white/5 bg-carbon/50 relative overflow-hidden">
              {/* Ambient scanner light effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-sand/5 rounded-full blur-2xl pointer-events-none" />

            {/* Analysis Progress HUD bar */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sand" />
                  <span className="text-[10px] font-mono text-alabaster tracking-widest uppercase">
                    {mode === "NEWS_VERIFICATION" ? "VERIFICATION_STREAM_OUTPUT" : "FORENSIC_STREAM_OUTPUT"}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-sand">
                  {analyzing ? `VERIFYING: ${Math.floor(analysisProgress)}%` : "MONITOR_STABLE"}
                </div>
              </div>

              {/* Progress Bar container */}
              <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-sand transition-all duration-100 box-glow-sand"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>

              {/* terminal logging feed (scripted for demos, real log lines for live uploads) */}
              <div className="h-44 rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-[10px] space-y-2 overflow-y-auto select-text scrollbar-thin">
                {!selectedAsset && (
                  <div className="text-slate-muted">
                    &gt; Drop a file or pick a demo sample to begin.
                  </div>
                )}
                {selectedAsset?.logs.slice(0, currentLogIndex + 1).map((log, index) => (
                  <div key={index} className="flex items-start gap-1.5 leading-relaxed text-slate-muted">
                    <span className="text-sand font-bold">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
                {analyzing && (
                  <div className="flex items-center gap-1.5 text-sand animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>SCANNING FILE FOR TAMPERING...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Dashboard Output block */}
            <div className="mt-8 border-t border-white/5 pt-8">
              <div className="grid grid-cols-2 gap-4 mb-6">

                {/* Authenticity/Credibility Score block */}
                <div className="p-4 rounded-lg bg-white/[0.01] border border-white/5 text-left flex flex-col justify-between min-h-[120px]">
                  <div>
                    <span className="text-[9px] font-mono text-slate-muted block uppercase tracking-wider mb-2">
                      {mode === "NEWS_VERIFICATION" ? "Credibility Score" : "Authenticity Score"}
                    </span>
                    <div className="text-xl font-mono text-alabaster font-bold tracking-tight">
                      {analyzing ? (
                        <span className="text-slate-500 text-xs uppercase animate-pulse">CALCULATING...</span>
                      ) : selectedAsset ? (
                        <div className="flex flex-col">
                          <span className={`text-xl md:text-2xl font-bold ${
                            mode === "NEWS_VERIFICATION" 
                              ? (authScore >= 50 ? "text-emerald-500" : "text-red-500") 
                              : ""
                          }`}>
                            {Math.round(authScore)}% Real
                          </span>
                          <span className="text-[10px] text-slate-muted font-normal mt-0.5">{Math.round(100 - authScore)}% Fake</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">---</span>
                      )}
                    </div>
                  </div>
                  
                  {!analyzing && selectedAsset && (
                    <div className="mt-3">
                      <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        authScore > 75 
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400" 
                          : authScore < 40 
                          ? "bg-red-950/40 border-red-800/60 text-red-400" 
                          : "bg-amber-950/40 border-amber-800/60 text-amber-400"
                      }`}>
                        {newsResult ? newsResult.verdict_label.toUpperCase() : (authScore > 75 ? "LIKELY REAL" : authScore < 40 ? "LIKELY FAKE" : "UNCERTAIN")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confidence Index block */}
                <div className="p-4 rounded-lg bg-white/[0.01] border border-white/5 text-left flex flex-col justify-between min-h-[120px]">
                  <div>
                    <span className="text-[9px] font-mono text-slate-muted block uppercase tracking-wider mb-2">
                      Verdict Confidence
                    </span>
                    <div className="text-xl font-mono tracking-tight">
                      {analyzing ? (
                        <span className="text-slate-500 text-xs uppercase animate-pulse font-bold">EVALUATING...</span>
                      ) : selectedAsset ? (
                        <div className="flex flex-col">
                          <span className={`text-xl md:text-2xl font-bold ${
                            mode === "NEWS_VERIFICATION" && newsResult
                              ? (newsResult.confidence_tier === "high" ? "text-emerald-500" : newsResult.confidence_tier === "low" ? "text-red-500" : "text-amber-500")
                              : "text-sand"
                          }`}>{Math.round(confIndex)}% Confidence</span>
                          <span className="text-[9px] text-slate-muted font-normal leading-tight mt-1">
                            {newsResult?.confidence_reasoning ? newsResult.confidence_reasoning : (
                              confIndex >= 90 
                                ? "High confidence in this verdict." 
                                : confIndex >= 75 
                                ? "Moderate model consensus." 
                                : "Weak detector agreement."
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">---</span>
                      )}
                    </div>
                  </div>
                  
                  {!analyzing && selectedAsset && (
                    <div className="mt-3">
                      <span className="inline-block text-[9px] font-mono px-2 py-0.5 rounded-full border border-sand/20 bg-sand/5 text-sand/80">
                        {selectedAsset.isLive ? (mode === "NEWS_VERIFICATION" ? "LIVE ANALYSIS" : "LIVE SCORING") : "DEMO PRESET"}
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* Verdict summary details overlay */}
              <div className="p-5 rounded-lg border border-white/5 bg-[#080808]/80 text-left">
                <div className="flex items-center gap-2 mb-3">
                  {!analyzing && selectedAsset?.risk === "CRITICAL" && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {!analyzing && selectedAsset?.risk === "HIGH" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  {!analyzing && selectedAsset?.risk === "LOW" && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  {analyzing && <RefreshCw className="w-4 h-4 text-sand animate-spin" />}

                  <span className="text-[10px] font-mono text-alabaster uppercase tracking-widest">
                    VERDICT_MATRIX_REPORT
                  </span>
                </div>

                <div className="text-[12px] leading-relaxed text-slate-muted font-sans font-light">
                  {analyzing ? (
                    <p>Compiling visual neural signals and checking for pixel anomalies. Please standby...</p>
                  ) : selectedAsset ? (
                    <div className="space-y-4">
                      <p className="text-xs md:text-[13px] font-normal text-alabaster leading-relaxed">
                        {newsResult?.plain_summary ? (
                          <span>{newsResult.plain_summary}</span>
                        ) : (
                          <>
                            {authScore < 40 ? (
                              <span>⚠️ This {selectedAsset.type} is very likely a deepfake. Multiple signs of AI manipulation were detected, including altered details and unnatural facial blending.</span>
                            ) : authScore <= 75 ? (
                              <span>⚠️ This {selectedAsset.type} has suspicious anomalies. Forensic signals suggest potential editing, splicing, or compression tampering.</span>
                            ) : (
                              <span>✅ This {selectedAsset.type} is verified as highly authentic. No signs of generative AI manipulation, pixel splicing, or fake rendering signatures were found.</span>
                            )}
                          </>
                        )}
                      </p>

                      <div className="pt-2.5 border-t border-white/5">
                        <button
                          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                          className="text-[10px] font-mono text-sand hover:text-sand/80 transition-colors uppercase tracking-widest flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-sand/20 rounded px-1 -mx-1"
                        >
                          <span>{showTechnicalDetails ? "[- Hide Technical Analysis]" : "[+ Show Technical Analysis]"}</span>
                        </button>
                        
                        {showTechnicalDetails && (
                          <div className="mt-3 p-3 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-slate-400 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                            {newsResult ? (
                              <div className="space-y-3">
                                <div>
                                  <strong className="text-alabaster mb-1 block">Claims Identified:</strong>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {newsResult.technical_details.claims_identified.map((c, i) => <li key={i}>{c}</li>)}
                                  </ul>
                                </div>
                                <div>
                                  <strong className="text-alabaster mb-1 block">Sources Checked:</strong>
                                  <ul className="space-y-1">
                                    {newsResult.technical_details.sources_checked.map((s, i) => (
                                      <li key={i} className="flex gap-2">
                                        <span className={s.supports_claim ? "text-emerald-500" : "text-red-500"}>
                                          {s.supports_claim ? "✓" : "✗"}
                                        </span>
                                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-sand/80 break-words">{s.title}</a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {newsResult.technical_details.red_flags.length > 0 && (
                                  <div>
                                    <strong className="text-alabaster mb-1 block">Red Flags:</strong>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {newsResult.technical_details.red_flags.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                  </div>
                                )}
                                <div>
                                  <strong className="text-alabaster mb-1 block">Reasoning:</strong>
                                  <p>{newsResult.technical_details.reasoning}</p>
                                </div>
                              </div>
                            ) : (
                              selectedAsset.verdict || "No technical telemetry generated."
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p>No scan run yet.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
          )}

        </div>

      </div>
    </div>
  );
}
