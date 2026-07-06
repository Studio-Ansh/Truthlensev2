import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from tqdm import tqdm
from pathlib import Path

# Add project root to path for local imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models.image_detector import EfficientNetB4Detector, ViTDetector

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Verify device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Truthlens Image Training Platform initialized on device: {device}")

# Ensure checkpoints directory exists
checkpoints_dir = Path("./checkpoints")
checkpoints_dir.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# 1. Image Forensic Dataset Implementation
# -------------------------------------------------------------
class TruthlensImageDataset(Dataset):
    """
    Handles training data for Image Deepfake Detection.
    Bridges Kaggle datasets: 'artifact-dataset', 'deepfake-and-real-images', or 'real-and-fake-face-detection'.
    """
    def __init__(self, data_dir=None, split="train", transform=None, simulated_samples=100):
        self.data_dir = data_dir
        self.split = split
        self.transform = transform
        self.simulated_samples = simulated_samples
        self.image_paths = []
        self.labels = []
        
        # Explicit label mapping to avoid default alphabetical sorting issues:
        # 0: REAL, 1: FAKE / SYNTHETIC / MANIPULATED
        self.class_to_idx = {"real": 0, "original": 0, "authentic": 0, "fake": 1, "synthetic": 1, "manipulated": 1}
        
        if data_dir and os.path.exists(data_dir):
            data_path = Path(data_dir)
            print(f"Scanning directory: {data_path} for {split} split...")
            
            # Scan directories recursively matching real/fake patterns
            for label_name, label_idx in [("real", 0), ("fake", 1)]:
                # Check for split/label structure: e.g. dataset_dir/train/real/
                class_path = data_path / split / label_name
                if not class_path.exists():
                    # Fallback to check dataset_dir/real/
                    class_path = data_path / label_name
                
                if class_path.exists():
                    for ext in ["*.jpg", "*.jpeg", "*.png"]:
                        for f in class_path.glob(ext):
                            self.image_paths.append(str(f))
                            self.labels.append(label_idx)
            
        # Fallback to simulated data if real dataset files are not available
        if not self.image_paths:
            print(f"--- Dataset warning: Real Kaggle data not found in '{data_dir}'. Generating simulated forensic feature patterns for '{split}' ---")
            self.labels = [0] * (self.simulated_samples // 2) + [1] * (self.simulated_samples // 2)
            # Simulated 3x224x224 tensor representations
            self.simulated_data = [torch.randn(3, 224, 224) for _ in range(self.simulated_samples)]
            
    def __len__(self):
        return len(self.labels) if hasattr(self, 'simulated_data') else len(self.image_paths)
        
    def __getitem__(self, idx):
        if hasattr(self, 'simulated_data'):
            # Return simulated images for testing
            x = self.simulated_data[idx]
            label = self.labels[idx]
            return x, label
        else:
            # Load real image from dataset
            from PIL import Image
            img_path = self.image_paths[idx]
            label = self.labels[idx]
            with Image.open(img_path) as img:
                img = img.convert("RGB")
                if self.transform:
                    img = self.transform(img)
                else:
                    from torchvision import transforms
                    default_tf = transforms.Compose([
                        transforms.Resize((224, 224)),
                        transforms.ToTensor(),
                        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                    ])
                    img = default_tf(img)
            return img, label

# -------------------------------------------------------------
# 2. Image Training Pipeline
# -------------------------------------------------------------
def train_image_detector(backbone="efficientnet", epochs=3, batch_size=16, lr=1e-4):
    print(f"\n--- Training Image Deepfake Detector (Backbone: {backbone.upper()}) ---")
    
    # Locate dataset path
    data_dir = "./dataset/deepfake_and_real_images"
    if not os.path.exists(data_dir):
        data_dir = "./dataset/artifact_dataset"
        
    train_dataset = TruthlensImageDataset(data_dir=data_dir, split="train", simulated_samples=100)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    
    # Initialize appropriate backbone
    if backbone.lower() == "efficientnet":
        model = EfficientNetB4Detector(pretrained=False).to(device)
    elif backbone.lower() == "vit":
        model = ViTDetector().to(device)
    else:
        raise ValueError(f"Unknown backbone choice: {backbone}")
        
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        progress = tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}")
        for images, labels in progress:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            progress.set_postfix({
                "Loss": f"{loss.item():.4f}",
                "Acc": f"{(correct/total)*100:.1f}%"
            })
            
        epoch_loss = total_loss / len(train_loader)
        epoch_acc = (correct / total) * 100
        print(f"Epoch {epoch+1} Complete - Avg Loss: {epoch_loss:.4f} - Accuracy: {epoch_acc:.1f}%")
        
        # Save checkpoint
        checkpoint_path = checkpoints_dir / f"truthlens_{backbone}_epoch_{epoch+1}.pt"
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'loss': epoch_loss,
            'accuracy': epoch_acc,
            'backbone': backbone
        }, checkpoint_path)
        print(f"Saved checkpoint to: {checkpoint_path}")
        
    print(f"\n✓ Image Detector training completed. All weights saved to: {checkpoints_dir}")

if __name__ == "__main__":
    print("=========================================================================")
    print("             TRUTHLENS: AI DEEPFAKE IMAGE TRAINING PIPELINE")
    print("=========================================================================")
    
    # Select backbone to train from CLI args. Defaults to "efficientnet".
    backbone_arg = sys.argv[1] if len(sys.argv) > 1 else "efficientnet"
    if backbone_arg not in ["efficientnet", "vit"]:
        print(f"Warning: Invalid backbone argument '{backbone_arg}'. Defaulting to 'efficientnet'.")
        backbone_arg = "efficientnet"
        
    epochs_arg = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    train_image_detector(backbone=backbone_arg, epochs=epochs_arg)
    print("=========================================================================")
