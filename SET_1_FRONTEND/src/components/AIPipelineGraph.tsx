import React, { useState, useEffect, useRef, ReactNode } from "react";
import { Cpu, ShieldCheck, Zap, Database, ArrowRight, Activity, Network } from "lucide-react";

interface NodeProps {
  id: string;
  label: string;
  sublabel: string;
  icon: ReactNode;
  status: "idle" | "processing" | "completed";
  details: {
    title: string;
    description: string;
    metrics: { key: string; val: string }[];
  };
}

export default function AIPipelineGraph() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [pulseProgress, setPulseProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth continuous tech pulse flowing along connection lines
  useEffect(() => {
    let animationId: number;
    let start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = (elapsed % 3000) / 3000; // 3 second cycle
      setPulseProgress(progress);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const pipelineNodes: NodeProps[] = [
    {
      id: "input",
      label: "DATA INPUT",
      sublabel: "Image / Video Stream",
      icon: <Database className="w-5 h-5 text-sand" />,
      status: "completed",
      details: {
        title: "Ingestion Core v4.1",
        description: "Streams high-resolution keyframes directly into memory arrays. Performs metadata forensic decoding and cryptographic stamp validation.",
        metrics: [
          { key: "Throughput", val: "1.4 GB/s" },
          { key: "Buffer State", val: "Optimal" },
          { key: "Frames Parsed", val: "240 fps" },
        ],
      },
    },
    {
      id: "vit",
      label: "ViT NETWORK",
      sublabel: "Visual Transformers",
      icon: <Cpu className="w-5 h-5 text-sand" />,
      status: "processing",
      details: {
        title: "Vision Transformer Array",
        description: "Applies self-attention blocks to 16x16 patch embeddings to trace subtle patch manipulation, sharpening boundaries, and generative signature frequencies.",
        metrics: [
          { key: "Attention Heads", val: "16 Blocks" },
          { key: "Param Size", val: "340M" },
          { key: "Latency Profile", val: "8.4ms" },
        ],
      },
    },
    {
      id: "lstm",
      label: "LSTM TRACKER",
      sublabel: "Temporal Forensics",
      icon: <Network className="w-5 h-5 text-sand" />,
      status: "processing",
      details: {
        title: "Temporal Recurrent Neural Net",
        description: "Analyzes inter-frame correlation vector fields. Detects face-swaps, gaze deviations, eye-reflection mismatching, and unnatural head-velocity patterns.",
        metrics: [
          { key: "Recurrent Cells", val: "512 Bi-LSTM" },
          { key: "Sequence Window", val: "60 Frames" },
          { key: "Accuracy", val: "99.12%" },
        ],
      },
    },
    {
      id: "saff",
      label: "SAFF ANALYZER",
      sublabel: "Spatio-Temporal Fusion",
      icon: <Activity className="w-5 h-5 text-sand" />,
      status: "processing",
      details: {
        title: "Spatial-Attention Feature Fusion",
        description: "Extracts local noise residuals, sensor pattern noise, and JPEG compression grids to expose micro-splicing patterns.",
        metrics: [
          { key: "Resolution Gate", val: "4K Quad-Grid" },
          { key: "Residual Gain", val: "24.5 dB" },
          { key: "False Positive", val: "<0.01%" },
        ],
      },
    },
    {
      id: "fusion",
      label: "FUSION ENGINE",
      sublabel: "Multi-Modal Synthesizer",
      icon: <Zap className="w-5 h-5 text-sand animate-pulse" />,
      status: "idle",
      details: {
        title: "Cross-Modal Decision Fusion",
        description: "Weighs temporal, spatial, and semantic verification cues simultaneously using deep bayesian belief aggregation arrays.",
        metrics: [
          { key: "Confidence Math", val: "Bayesian Joint" },
          { key: "Entropy Factor", val: "0.12 H" },
          { key: "Decision Weight", val: "Dynamic" },
        ],
      },
    },
    {
      id: "output",
      label: "TRUST OUTPUT",
      sublabel: "Cryptographic Provenance",
      icon: <ShieldCheck className="w-5 h-5 text-sand" />,
      status: "idle",
      details: {
        title: "Provenance Certificate Ledger",
        description: "Signs verified telemetry data and outputs a C2PA-compliant manifest containing detailed spatial manipulation heatmap metrics.",
        metrics: [
          { key: "Ledger Type", val: "Immutable Anchor" },
          { key: "Signature Type", val: "Ed25519" },
          { key: "C2PA Manifest", val: "v2.0 Standard" },
        ],
      },
    },
  ];

  return (
    <div ref={containerRef} className="w-full relative py-16 px-4 md:px-8 border-y border-white/5 bg-carbon/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-sand/[0.01] via-transparent to-sand/[0.01] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header HUD info block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-white/5 pb-6">
          <div>
            <span className="text-[10px] font-mono tracking-[0.3em] text-sand uppercase mb-2 block">
              [ ENGINE ARCHITECTURE ]
            </span>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-alabaster">
              Neural Verification Pipeline
            </h2>
          </div>
          <div className="mt-4 md:mt-0 text-[11px] font-mono text-slate-muted text-left md:text-right max-w-sm">
            Interactive Spatio-Temporal fusion processing nodes. Hover over individual network coordinates to inspect validation parameters.
          </div>
        </div>

        {/* Horizontal Node-based Pipeline Flowchart Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
          
          {/* Background SVG Connective Lines */}
          <div className="absolute top-[50px] left-0 w-full h-[2px] bg-white/[0.04] hidden md:block z-0">
            {/* Pulsing light flowing from left to right */}
            <div 
              className="h-full bg-gradient-to-r from-transparent via-sand/60 to-transparent w-40 transition-all duration-75"
              style={{
                transform: `translateX(${pulseProgress * 100}%)`,
                willChange: "transform"
              }}
            />
          </div>

          {pipelineNodes.map((node, idx) => {
            const isHovered = activeNode === node.id;
            
            return (
              <div 
                key={node.id}
                className="relative flex flex-col items-center group z-10"
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
              >
                {/* Visual Circle Terminal Wrapper with rotating indicator */}
                <div 
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 relative cursor-crosshair ${
                    isHovered 
                      ? "bg-[#141414] border-sand scale-105 box-glow-sand" 
                      : "bg-[#0A0A0A] border-white/10"
                  } border`}
                >
                  {/* Subtle spinning technical compass outline */}
                  <div className={`absolute inset-1.5 rounded-full border border-dashed border-sand/10 transition-transform duration-[12s] linear ${
                    isHovered ? "rotate-90 border-sand/40 scale-105" : ""
                  }`} />

                  {/* Active telemetry scanning pulse */}
                  {node.status === "processing" && (
                    <div className="absolute -inset-1 rounded-full border border-sand/10 animate-ping opacity-60" />
                  )}

                  {/* Center Node Icon */}
                  <div className={`p-4 rounded-full bg-carbon transition-all duration-300 ${isHovered ? "bg-sand/10" : ""}`}>
                    {node.icon}
                  </div>

                  {/* Line index badge */}
                  <div className="absolute -top-1 -right-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#101010] border border-white/5 text-slate-muted">
                    0{idx + 1}
                  </div>
                </div>

                {/* Node Metadata Text */}
                <div className="text-center mt-4">
                  <div className="text-xs font-semibold tracking-wider text-alabaster uppercase">
                    {node.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-muted mt-1">
                    {node.sublabel}
                  </div>
                </div>

                {/* Next arrow indicator (Mobile only or end item check) */}
                {idx < 5 && (
                  <div className="block md:hidden my-4 text-sand/30">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>
                )}

                {/* Floating Technical Tooltip Container (Hover Triggered) */}
                <div 
                  className={`absolute top-[130px] md:top-[-260px] w-[290px] p-5 rounded-lg glass-panel text-left transition-all duration-300 z-50 ${
                    isHovered 
                      ? "opacity-100 translate-y-0 visible pointer-events-auto scale-100" 
                      : "opacity-0 translate-y-3 invisible pointer-events-none scale-95"
                  }`}
                  style={{
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05)"
                  }}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sand animate-pulse" />
                    <span className="text-[8px] font-mono text-sand/60">NODE_LIVE</span>
                  </div>

                  <div className="text-[9px] font-mono text-sand mb-1 uppercase tracking-widest">
                    SYSTEM NODE COMPONENT
                  </div>
                  <h4 className="text-sm font-semibold text-alabaster tracking-tight">
                    {node.details.title}
                  </h4>
                  <p className="text-[11px] text-slate-muted mt-2 leading-relaxed font-sans">
                    {node.details.description}
                  </p>

                  <div className="mt-4 border-t border-white/5 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {node.details.metrics.map((m) => (
                        <div key={m.key} className="bg-white/[0.02] p-1.5 rounded border border-white/[0.03]">
                          <div className="text-[8px] font-mono text-slate-muted uppercase">{m.key}</div>
                          <div className="text-[11px] font-mono text-sand font-medium mt-0.5">{m.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}

        </div>

        {/* Inline HUD calibration bar */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-between bg-white/[0.01] border border-white/5 rounded px-6 py-4">
          <div className="flex items-center gap-4 text-xs font-mono text-slate-muted">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sand"></span>
            </span>
            <span>MODEL WEIGHT VERIFIED AGAINST C2PA BLOCKCHAIN LEDGER V2.4</span>
          </div>
          <div className="mt-2 sm:mt-0 text-[10px] font-mono text-sand/60">
            SECURE RECEPTOR LATENCY: &lt; 14ms | GRID_COORDINATE: 34.02.551
          </div>
        </div>

      </div>
    </div>
  );
}
