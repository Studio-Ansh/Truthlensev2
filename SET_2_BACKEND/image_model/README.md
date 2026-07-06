# Truthlens: AI Content Provenance & Verification Platform

**Truthlens** is a unified multi-modal AI platform designed to detect deepfakes, inspect digital media provenance, verify metadata integrity, and calculate multidimensional trust scoring. This platform answers three critical forensic questions:
1. **Is the content manipulated?** (Deepfake detection)
2. **Where did the content originate?** (Content provenance and lineage graph)
3. **Can the content be trusted?** (Multi-modal trust fusion index)

---

## 🛠️ Multimodal AI/ML Architecture

Truthlens implements a high-performance verification framework across multiple sensory and metadata layers:

### A. Image Deepfake Detection (Spatial Analysis)
* **Model Choices**: Vision Transformer (ViT-Base-Patch16) & EfficientNet-B4
* **Method**: Analyzes high-frequency diffusion artifacts, inconsistent lighting vectors, local edge blending discrepancies, and non-biological sensor anomalies commonly found in GAN and Stable Diffusion generated human portraits.
* **Location**: `models/image_detector.py`

### B. Video Deepfake Detection (Temporal Analysis)
* **Model**: ResNeXt50 + Bidirectional LSTM
* **Method**: Extracts frame-level spatial features via a pre-trained ResNeXt50 neural net and channels the temporal sequences through a Bidirectional LSTM network to flag inter-frame flickering, shifting compression densities, face-boundary mismatch anomalies, and non-natural blinking cadences.
* **Location**: `models/video_detector.py`

### C. Audio-Visual Synchronization Analysis (Cross-Modal Alignment)
* **Model**: Cross-Modal Multihead Attention Network / SAFF
* **Method**: Computes co-attention alignments between visual mouth/lip tracking representations and voice spectrogram embeddings. Exposes voice cloning, deepfake dubs, and face-swaps by calculating dynamic cross-modal correlation coefficients.
* **Location**: `models/audio_visual_sync.py`

### D. Content Provenance & EXIF Metadata Intelligence
* **Model**: Metadata Intelligence Engine + Provenance Graph Network
* **Method**: Extracts active camera parameters, focal length signatures, geographic coordinate records (GPS), and editing software footprints (e.g., Photoshop, GIMP). Creates an interactive Directed Acyclic Graph (DAG) charting the media’s editing lineage.
* **Location**: `utils/metadata_extractor.py`

### E. Trust Scoring Engine
* **Model**: Multi-Modal Feature Fusion Network
* **Method**: Synthesizes output metrics across spatial, temporal, cross-modal synchronization, and metadata authenticity profiles. Evaluates unified **Risk Ratings** (LOW, MEDIUM, HIGH, CRITICAL) and the multi-layered **Trust Index** (0 to 100).
* **Location**: `models/trust_scoring.py`

---

## 📁 Repository Directory Structure

```
├── dataset/
│   ├── setup_kaggle.py                 # Auto-configures credentials and directories
│   ├── deepfake_detection_challenge/   # Target folder for Kaggle DFDC data (470 GB)
│   ├── artifact_dataset/               # Target folder for Kaggle Artifact Dataset (105 GB)
│   ├── deepfake_and_real_images/       # Target folder for Kaggle Real vs Fake face benchmark (1.8 GB)
│   └── real_and_fake_face_detection/   # Target folder for Expert Annotated local face swaps (1.2 GB)
├── models/
│   ├── image_detector.py               # Vision Transformer (ViT) & EfficientNet-B4 modules
│   ├── video_detector.py               # ResNeXt50 + LSTM temporal modeling module
│   ├── audio_visual_sync.py            # Cross-Modal Multihead Attention network
│   └── trust_scoring.py                # Multi-Modal Feature Fusion Network & Weights
├── utils/
│   └── metadata_extractor.py           # Metadata parsing & Provenance lineage graph builder
├── train.py                            # Unified training runner (with simulated fallback generators)
├── evaluate.py                         # Unified evaluation metrics calculator (Accuracy, F1, Loss)
├── package.json                        # Node runtime descriptor
└── README.md                           # Documentation and guides
```

---

## 🚀 Setup & Installation

### 1. Requirements & Dependencies
Ensure you have Python 3.10+ installed. To install all ML dependencies:
```bash
# Path to installed local pip environment
/root/.local/bin/pip install --user torch torchvision transformers opencv-python-headless kaggle pandas numpy scikit-learn tqdm
```

### 2. Configure Kaggle Datasets & Folders
Run the setup script to configure authentication using your provided Kaggle API Token and establish separate folders for datasets:
```bash
python3 dataset/setup_kaggle.py
```
This script will:
* Save your Kaggle API key safely to `~/.kaggle/access_token` and configure permissions.
* Create isolated folders for each target Kaggle dataset:
  * [Deepfake Detection Challenge Data](https://www.kaggle.com/competitions/deepfake-detection-challenge/data)
  * [Artifact Dataset](https://www.kaggle.com/datasets/awsaf49/artifact-dataset)
  * [Deepfake and Real Images](https://www.kaggle.com/datasets/manjilkarki/deepfake-and-real-images)
  * [Real and Fake Face Detection](https://www.kaggle.com/datasets/ciplab/real-and-fake-face-detection)
* Test connection to the Kaggle API.

---

## 🏋️ Training the Models

Because downloading and processing multi-gigabyte or terabyte Kaggle datasets requires substantial GPU compute and bandwidth, **Truthlens features an Out-of-the-Box Simulated Fallback Generator**. If you run the training script before downloading the datasets, it will dynamically generate high-fidelity simulated forensic features. This allows you to verify that the PyTorch forward, backward, backpropagation, and loss optimization loops execute successfully immediately:

### To Train All Models:
```bash
python3 train.py all
```

### To Train specific modules:
* **Image Detector**: `python3 train.py image`
* **Video Detector**: `python3 train.py video`
* **Audio-Visual Sync**: `python3 train.py audiovisual`

Checkpoints and weights will be saved automatically to the `./checkpoints/` directory.

---

## 📊 Evaluating the Models

Calculate model performance metrics (Accuracy, Precision, Recall, F1-Score, and Confusion Matrix boundaries) on your validation datasets:
```bash
python3 evaluate.py
```

---

## 🛡️ Hackathon Solution Competitive Advantages
* **Hybrid Multimodal Paradigm**: Combines deep visual analysis (Vision Transformer), dynamic video analysis (ResNeXt50+LSTM), and auditory alignment (Attention) instead of a single-modality baseline.
* **Resilient Scoring**: Adaptable Multi-Modal Fusion handles cases where some data (like audio tracks or video sequences) is stripped.
* **Provenance Integration**: Integrates physical camera lens EXIF authenticity check together with AI predictions to secure Digital Identity Verification (KYC) pipelines.
