export interface ProvenanceAnalysis {
  creationDevice?: string;
  softwareUsed?: string;
  location?: string;
  editingHistory?: string[];
  signatureValid: boolean;
}

export interface DeepfakeCue {
  cueName: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  category: "Lighting" | "Symmetry" | "Texture" | "Compression" | "EXIF/Metadata" | "Other";
}

export interface ManipulatedRegion {
  regionName: string;
  description: string;
  anomalyType: string;
  coordinates: {
    x: number; // 0-100 normalized x-offset (percent)
    y: number; // 0-100 normalized y-offset (percent)
    width: number; // 0-100 normalized width (percent)
    height: number; // 0-100 normalized height (percent)
  };
}

export interface VerdictBreakdown {
  lightingConsistency: number; // 0-100
  textureNaturalness: number;  // 0-100
  geometricSymmetry: number;   // 0-100
  metadataIntegrity: number;   // 0-100
  noiseDistribution: number;   // 0-100
}

export interface AuditResult {
  mediaType: "image" | "video" | "audio";
  authenticityScore: number;
  verdict: "authentic" | "suspicious" | "manipulated";
  confidence: number;
  analysisDate: string;
  fileSize: string;
  fileName: string;
  provenanceAnalysis: ProvenanceAnalysis;
  summary: string;
  technicalExplanation: string;
  deepfakeCues?: DeepfakeCue[];
  manipulatedRegions?: ManipulatedRegion[];
  verdictBreakdown?: VerdictBreakdown;
}

export interface TrainingHistoryEpoch {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
}

export interface MLEvalResults {
  architecture: string;
  evaluationDate: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  fpr: number;
  fnr: number;
  confusionMatrix: {
    truePositive: number;
    falseNegative: number;
    falsePositive: number;
    trueNegative: number;
  };
}

export interface MLModelStatus {
  architecture: string;
  status: "untrained" | "training" | "trained";
  lastTrained?: string;
  epochs?: number;
  history?: TrainingHistoryEpoch[];
  evalResults?: MLEvalResults;
}
