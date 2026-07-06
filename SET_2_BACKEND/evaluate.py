import os
import sys
import torch
import numpy as np
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from train import TruthlensImageDataset
from models.image_detector import EfficientNetB4Detector, ViTDetector

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def evaluate_image_detector(backbone="efficientnet"):
    print(f"\n--- Evaluating Image Deepfake Detector (Backbone: {backbone.upper()}) ---")

    # Locate dataset path
    data_dir = "./dataset/deepfake_and_real_images"
    if not os.path.exists(data_dir):
        data_dir = "./dataset/artifact_dataset"

    val_dataset = TruthlensImageDataset(data_dir=data_dir, split="val", simulated_samples=30)
    val_loader = DataLoader(val_dataset, batch_size=10, shuffle=False)

    # Init detector
    if backbone == "efficientnet":
        model = EfficientNetB4Detector(pretrained=False).to(device)
    elif backbone == "vit":
        model = ViTDetector().to(device)
    else:
        raise ValueError(f"Unknown backbone: {backbone}")

    # Attempt to load the most recent saved weights
    checkpoints_dir = Path("./checkpoints")
    checkpoint_file = checkpoints_dir / f"truthlens_{backbone}_epoch_3.pt"
    if not checkpoint_file.exists():
        # Fallback to search for any saved checkpoint for this model
        saved_pts = sorted(list(checkpoints_dir.glob(f"truthlens_{backbone}_epoch_*.pt")))
        if saved_pts:
            checkpoint_file = saved_pts[-1]

    if checkpoint_file.exists():
        print(f"✓ Loading saved trained checkpoint weights from: {checkpoint_file}")
        try:
            checkpoint = torch.load(checkpoint_file, map_location=device)
            if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
            else:
                model.load_state_dict(checkpoint)
        except Exception as e:
            print(f"Error loading checkpoint weights: {e}. Evaluating with initialized weights.")
    else:
        print(f"⚠ No trained checkpoints found for {backbone.upper()} in './checkpoints/'. Evaluating with initialized weights.")
        print(f"  To train the model first, run: 'python3 train.py {backbone}'")

    model.eval()

    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            outputs = model(images)
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())

    # Calculate classification metrics
    acc = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='binary', zero_division=0)
    cm = confusion_matrix(all_labels, all_preds)

    print("\n--- Forensics Evaluation Metrics ---")
    print(f"Accuracy:  {acc*100:.2f}%")
    print(f"Precision: {precision:.4f}  (Ability to avoid false positives)")
    print(f"Recall:    {recall:.4f}  (Ability to find all synthetic images)")
    print(f"F1-Score:  {f1:.4f}  (Harmonic mean of precision and recall)")
    print("\nConfusion Matrix:")
    print(f"  [TN={cm[0][0]} (Real correctly identified)  |  FP={cm[0][1]} (Real marked as Fake)]")
    print(f"  [FN={cm[1][0]} (Fake marked as Real)  |  TP={cm[1][1]} (Fake correctly identified)]")

    if cm[0][1] > 0 or cm[1][0] > 0:
        print("\nNote: Any False Positives (FP) or False Negatives (FN) indicate fine-tuning is required.")
        print("Increasing epoch count or training on more authentic/synthetic variations will improve bounds.")


if __name__ == "__main__":
    print("=========================================================================")
    print("             TRUTHLENS: IMAGE MODEL FORENSIC EVALUATION")
    print("=========================================================================")

    backbone_arg = sys.argv[1] if len(sys.argv) > 1 else "efficientnet"
    if backbone_arg not in ["efficientnet", "vit"]:
        print(f"Warning: Invalid backbone '{backbone_arg}'. Defaulting to 'efficientnet'.")
        backbone_arg = "efficientnet"

    evaluate_image_detector(backbone=backbone_arg)
    print("=========================================================================")
