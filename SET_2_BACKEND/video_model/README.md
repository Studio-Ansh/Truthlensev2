# Truthlens: AI Content Provenance & Verification Platform (ML Core)

Truthlens is an advanced, multi-modal machine learning platform designed to verify the authenticity, origin, and trustworthiness of video files. Unlike traditional deepfake detectors that only classify media as real or fake, Truthlens evaluates spatial manipulation, temporal consistency, and cross-modal audio-visual synchronization to generate a complete forensic integrity index.

This repository contains the optimized machine learning core designed specifically for frame-by-frame temporal consistency and audio-visual sync analysis of MP4 video files.

---

## 🛠️ ML Architecture Overview

```text
               ┌────────────────────────────────────────────────────────┐
               │                  MP4 Video Source File                 │
               └───────────────────────────┬────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
          [ Video Frame Stream ]                        [ Audio Vocal Track ]
                    │                                             │
      ┌─────────────┴─────────────┐                 ┌─────────────┴─────────────┐
      │   Uniform Frame Sampling  │                 │    Vocal Feature Extract  │
      │       (30-frame seq)      │                 │  (Mel-Spectrogram / MFCC) │
      └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                    │                                             │
                    ▼                                             ▼
       ┌──────────────────────────┐                  ┌──────────────────────────┐
       │   ResNeXt50 Backbone     │                  │   Common Audio Embedder  │
       │ (Spatial representation) │                  │    (Temporal Spectrums)  │
       └────────────┬─────────────┘                  └────────────┬─────────────┘
                    │                                             │
                    ▼ [B, T, 512]                                 ▼ [B, Ta, 128]
       ┌──────────────────────────┐                               │
       │  Bidirectional LSTM RNN  │                               │
       │ (Temporal Flickers Check)│                               │
       └────────────┬─────────────┘                               │
                    │                                             │
                    ├───────────────────────┬─────────────────────┘
                    │                       │
                    ▼ [B, Hidden]           ▼ [Cross-Attention Matrix]
             (Temporal State)      ┌─────────────────────────────┐
                    │              │    Cross-Modal Attention    │
                    │              │  (Lip-Sync / Voice Clone)   │
                    │              └────────┬────────────────────┘
                    │                       │
                    ▼                       ▼ [B, 128]
               ┌─────────────────────────────────┐
               │    Multi-Modal Feature Fusion   │
               └────────────────┬────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  Trust Scoring / Decision Head  │
               └────────────────┬────────────────┘
                                │
    ┌───────────────────────────┼───────────────────────────┐
    ▼                           ▼                           ▼
[ Authenticity Score ]    [ Risk Level ]          [ Confidence Level ]
     (0 - 100%)         (Low/Medium/High)              (0 - 100%)
```

### A. Spatial Feature Extraction (ResNeXt50)
We employ a **ResNeXt50_32x4d** model as our spatial backbone. It processes individual frame matrices to locate visual seam blending anomalies, generative diffusion textures, color space noise artifacts, and face boundary misalignments.

### B. Temporal Consistency Analysis (Bi-LSTM)
Frame features are passed sequentially into a **Bidirectional Long Short-Term Memory (Bi-LSTM)** network. This analyzes changes from frame to frame to spot temporal discrepancies—such as facial landmark jitter, skin texture flickering, eye blinking discrepancies, or sudden light gradient changes—that are physically impossible in genuine recordings.

### C. Audio-Visual Synchronization (Cross-Modal Attention)
By aligning extracted visual face sequences with vocal audio spectrograms using a **Multi-Head Cross-Modal Attention Network**, the model calculates lip-sync match ratios to identify advanced voice cloning or audio-swap manipulations.

### D. Deepfake Trust Scoring Engine
Features from the temporal and synchronization channels are fused into a dense classification layer to generate:
- **Authenticity Score (%):** Overall probability of the video being authentic.
- **Risk Evaluation:** Dynamic risk labels (`Low Risk`, `Medium Risk`, or `High Risk`) depending on the forensic indicators.
- **Confidence Level (%):** The model's classification certainty index.
- **Trust Index:** A scaled score from `0.0` to `10.0` representing comprehensive media validity.

---

## 📁 Repository Structure

```text
├── /dataset/                  # Dataset resources and helper scripts
│   ├── README.md              # Dataset setup documentation
│   └── download_datasets.py   # Secure Kaggle download orchestrator
│
├── /model/                    # PyTorch model code and training pipelines
│   ├── __init__.py
│   ├── truthlens_model.py     # ResNeXt50-LSTM & Cross-Modal attention network
│   └── train.py               # Optimized training loop and DataLoader
│
├── verify_video.py            # CLI Tool for running forensic verification on MP4s
└── requirements.txt           # Python dependency requirements list
```

---

## 🚀 Quick Start Guide

### 1. Installation
Clone the workspace and install the required dependencies:
```bash
pip install -r requirements.txt
```

### 2. Dataset Preparation
To configure Kaggle and download the datasets, execute the helper script located in `/dataset/`:
```bash
python dataset/download_datasets.py
```
*The script automatically sets up the verified API Token `KGAT_eddb47da13b385ac339bbacdb6ad2efa` and maps the target datasets:*
1. `simongraves/deepfake-dataset`
2. `trainingdatapro/real-vs-fake-anti-spoofing-video-classification`
3. `unidpro/deepfake-videos-dataset`
4. `ucimachinelearning/deep-fake-detection-cropped-dataset`

### 3. Run Forensic Verification (Inference)
Execute verification on any MP4 file using the command-line interface:
```bash
python verify_video.py --video path/to/your_video.mp4 --report forensic_report.json
```
*If a video path is omitted, the pipeline runs a diagnostic demo using self-generating inputs, writing a sample analysis report (`report.json`).*

### 4. Train the Model
Train the ResNeXt-LSTM network on the prepared Kaggle data:
```bash
python model/train.py
```
*Model training saves sequential checkpoint files `.pth` to the `/model/checkpoints/` directory at the end of each epoch.*

---

## 📊 Real-World Forensic Applications

- **Banking & KYC:** Verifies identity check streams to prevent customer-spoofing injection attacks.
- **Social Media Platforms:** Automatically scans and flags deepfakes and temporal anomalies before media spreads.
- **News & Journalism:** Assesses the integrity of incoming user-submitted videos to preserve journalistic precision.
- **Government & Digital Forensics:** Provides investigative tools to map video timeline inconsistencies and check provenance graphs.
