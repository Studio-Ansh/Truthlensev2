import React, { useState, ReactNode } from "react";
import { ShieldAlert, Fingerprint, Eye, ArrowUpRight } from "lucide-react";

interface QuestionCardProps {
  question: string;
  metricLabel: string;
  metricValue: string;
  icon: ReactNode;
  description: string;
  techSpecs: string[];
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  metricLabel,
  metricValue,
  icon,
  description,
  techSpecs,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-xl border border-white/5 bg-carbon/20 p-8 transition-all duration-500 hover:border-sand/40 hover:translate-y-[-4px]"
      style={{
        boxShadow: hovered ? "0 20px 40px rgba(0,0,0,0.8)" : "none",
      }}
    >
      {/* Glow highlight */}
      <div
        className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-sand/5 blur-3xl transition-opacity duration-500"
        style={{ opacity: hovered ? 1 : 0.4 }}
      />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-sand">
          {icon}
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-slate-muted block tracking-wider uppercase">
            {metricLabel}
          </span>
          <span className="text-sm font-mono text-[#F4F4F0] font-semibold">
            {metricValue}
          </span>
        </div>
      </div>

      <h3 className="text-xl font-light tracking-tight text-[#F4F4F0] mb-4 relative z-10">
        {question}
      </h3>

      <p className="text-xs text-slate-muted leading-relaxed font-sans font-light mb-6 relative z-10">
        {description}
      </p>

      <div className="border-t border-white/5 pt-5 relative z-10">
        <span className="text-[9px] font-mono text-slate-muted block tracking-widest uppercase mb-3">
          TECHNICAL_SPECS
        </span>
        <div className="flex flex-wrap gap-1.5">
          {techSpecs.map((spec) => (
            <span
              key={spec}
              className="text-[8px] font-mono text-sand/85 bg-sand/5 border border-sand/10 px-2 py-0.5 rounded uppercase"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThreeQuestionCards() {
  const cards = [
    {
      question: "Is this media completely synthetic or real?",
      metricLabel: "SYNTHETIC_PROBABILITY",
      metricValue: "99.8%",
      icon: <Fingerprint className="w-5 h-5" />,
      description:
        "Extract invisible structural camera fingerprints and GAN/Diffusion residues down to micro-pixel frequency grids to detect synthetic origin.",
      techSpecs: ["ViT Feature Map", "Coherence Scoring", "GAN Signature Sync"],
    },
    {
      question: "Has this image been subtly edited or altered?",
      metricLabel: "MANIPULATION_CONFIDENCE",
      metricValue: "92.4%",
      icon: <ShieldAlert className="w-5 h-5" />,
      description:
        "Locate clone-stamp artifacts, local compression discrepancies, and neural model infill regions with advanced error level analysis.",
      techSpecs: ["ELA Imaging", "Compression Divergence", "Infill Artifacting"],
    },
    {
      question: "Where did this file actually originate from?",
      metricLabel: "LINEAGE_VERIFIED",
      metricValue: "100%",
      icon: <Eye className="w-5 h-5" />,
      description:
        "Synchronize and trace cryptographic EXIF block records, C2PA manifest history, and decentralized ledger anchor timestamps.",
      techSpecs: ["C2PA Manifest", "EXIF Cryptographic Hash", "Ledger Anchors"],
    },
  ];

  return (
    <div id="deep-assessment" className="w-full py-24 px-4 md:px-8 border-b border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16 text-left">
          <span className="text-[10px] font-mono tracking-[0.3em] text-sand uppercase mb-3 block">
            [ DEEP_ASSESSMENT_LAYER ]
          </span>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-[#F4F4F0]">
            Answering the critical questions of visual authenticity.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <QuestionCard
              key={idx}
              question={card.question}
              metricLabel={card.metricLabel}
              metricValue={card.metricValue}
              icon={card.icon}
              description={card.description}
              techSpecs={card.techSpecs}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
