/**
 * Client for the Truthlens FastAPI inference service
 * (see truthlens_pipeline/truthlens/api/main.py).
 *
 * In dev, requests go through the Vite proxy at /api (see vite.config.ts),
 * which forwards to VITE_API_PROXY_TARGET (default http://localhost:8000).
 * This avoids CORS issues and keeps the deployed frontend pointed at
 * whatever backend URL you configure at build time via VITE_API_BASE_URL.
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface VerifyResult {
  label: "real" | "fake";
  confidence: number; // 0..1
  fake_probability: number; // 0..1
  backbone?: string;
  frames_analyzed?: number;
}

export interface TrustScoreResult {
  trust_index: number; // 0..100
  risk_level: "low" | "medium" | "high";
  authenticity_score: number; // 0..100
  components: {
    metadata_score: number;
    source_score: number;
    provenance_score: number;
  };
}

export interface HealthResult {
  status: string;
  image_model_loaded: boolean;
  video_model_loaded: boolean;
  device: string;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (typeof data?.detail === "string") return data.detail;
      return JSON.stringify(data);
    } catch {
      // If it's HTML, return a truncated clean message or status text
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        return `Server returned HTML instead of JSON. Status: ${res.status} (${res.statusText || "Error"})`;
      }
      return text.substring(0, 150) || res.statusText || `Request failed with status ${res.status}`;
    }
  } catch {
    return res.statusText || `Request failed with status ${res.status}`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (err) {
    // Network-level failure: backend unreachable, CORS blocked, offline, etc.
    throw new ApiError(
      "Could not reach the verification service. Is the Truthlens API running?",
      0
    );
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(message, res.status);
  }

  // Ensure response is JSON
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    if (text.includes("Please wait while your application starts") || text.includes("<html") || text.includes("<!DOCTYPE")) {
      throw new ApiError(
        "The verification service is currently starting up or restarting. Please wait a few seconds and try again.",
        res.status
      );
    }
    throw new ApiError(
      `Invalid response format from verification service (expected JSON, got HTML or plain text). Status: ${res.status}`,
      res.status
    );
  }

  try {
    return await res.json() as T;
  } catch (jsonErr: any) {
    throw new ApiError(
      `Failed to parse JSON response: ${jsonErr.message}`,
      res.status
    );
  }
}

export function checkHealth(): Promise<HealthResult> {
  return request<HealthResult>("/health");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function verifyImage(file: File): Promise<VerifyResult> {
  try {
    const base64Data = await fileToBase64(file);
    return await request<VerifyResult>("/verify/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileData: base64Data,
        mimetype: file.type,
        originalname: file.name,
      }),
    });
  } catch (err) {
    console.warn("Base64 upload failed, falling back to multipart:", err);
    const form = new FormData();
    form.append("file", file);
    return request<VerifyResult>("/verify/image", { method: "POST", body: form });
  }
}

export async function verifyVideo(file: File): Promise<VerifyResult> {
  try {
    const base64Data = await fileToBase64(file);
    return await request<VerifyResult>("/verify/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileData: base64Data,
        mimetype: file.type,
        originalname: file.name,
      }),
    });
  } catch (err) {
    console.warn("Base64 upload failed, falling back to multipart:", err);
    const form = new FormData();
    form.append("file", file);
    return request<VerifyResult>("/verify/video", { method: "POST", body: form });
  }
}

export async function verifyAudio(file: File): Promise<VerifyResult> {
  try {
    const base64Data = await fileToBase64(file);
    return await request<VerifyResult>("/verify/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileData: base64Data,
        mimetype: file.type,
        originalname: file.name,
      }),
    });
  } catch (err) {
    console.warn("Base64 upload failed, falling back to multipart:", err);
    const form = new FormData();
    form.append("file", file);
    return request<VerifyResult>("/verify/audio", { method: "POST", body: form });
  }
}

export interface TrustScoreInput {
  fake_probability: number;
  has_clean_metadata?: boolean;
  source_known?: boolean;
  reverse_search_matches?: number;
}

export function getTrustScore(input: TrustScoreInput): Promise<TrustScoreResult> {
  return request<TrustScoreResult>("/verify/trust-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export interface NewsVerificationResult {
  credibility_score: number;
  verdict_label: string;
  confidence_score: number;
  confidence_tier: "high" | "medium" | "low";
  confidence_reasoning: string;
  plain_summary: string;
  stream_log: string[];
  technical_details: {
    claims_identified: string[];
    sources_checked: Array<{ title: string; url: string; supports_claim: boolean }>;
    red_flags: string[];
    reasoning: string;
  };
}

export async function verifyContent(file?: File | null, content?: string | null): Promise<NewsVerificationResult> {
  if (file) {
    try {
      const base64Data = await fileToBase64(file);
      return await request<NewsVerificationResult>("/verify-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: base64Data,
          mimetype: file.type,
          originalname: file.name,
          content: content || "",
        }),
      });
    } catch (err) {
      console.warn("Base64 content upload failed, falling back to multipart:", err);
    }
  }

  const form = new FormData();
  if (file) {
    form.append("file", file);
  }
  if (content) {
    form.append("content", content);
  }
  return request<NewsVerificationResult>("/verify-content", { method: "POST", body: form });
}

