# Truthlens Kaggle Dataset Integration

This folder contains scripts and configurations to retrieve and interact with the deepfake detection datasets provided for the Truthlens platform.

## Supported Datasets
The platform is optimized for the following datasets:
1. **Deepfake Dataset (Simon Graves)**: `simongraves/deepfake-dataset`
2. **Real vs Fake Anti-Spoofing Video Classification (TrainingDataPro)**: `trainingdatapro/real-vs-fake-anti-spoofing-video-classification`
3. **Deepfake Videos Dataset (Unidpro)**: `unidpro/deepfake-videos-dataset`
4. **Deep Fake Detection Cropped Dataset (UCI Machine Learning)**: `ucimachinelearning/deep-fake-detection-cropped-dataset`

## Setup & Kaggle API Token
To download these datasets, you must have the Kaggle CLI installed and use the provided API Token.

The platform includes a pre-configured Python download script (`download_datasets.py`) that handles the setup and download.

### Automatic Environment Setup
Run the following commands in your terminal to set up the credentials:
```bash
export KAGGLE_API_TOKEN=KGAT_eddb47da13b385ac339bbacdb6ad2efa
mkdir -p ~/.kaggle
echo KGAT_eddb47da13b385ac339bbacdb6ad2efa > ~/.kaggle/access_token
chmod 600 ~/.kaggle/access_token
```

### Download Datasets
You can run the download script directly to pull the datasets into this folder:
```bash
python download_datasets.py
```

## Model Architecture Details (`temporal_model.py`)
To process these datasets, the platform utilizes a temporal consistency model:
- **Spatial Feature Extractor**: ResNeXt50 extracts frame-by-frame visual features and identifies blending seams/artifacts.
- **Temporal Analysis**: LSTM layers analyze sequences of 30 frames to capture temporal incoherency (flickering, texture shifting).
- **Audio-Visual Fusion**: Cross-modal attention networks evaluate lip synchronization and audio cloning.
