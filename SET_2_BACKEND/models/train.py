import os
import sys

# Simply delegate to the root training pipeline for perfect consistency
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from train import train_image_detector, TruthlensImageDataset

if __name__ == "__main__":
    import sys
    backbone = sys.argv[1] if len(sys.argv) > 1 else "efficientnet"
    epochs = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    train_image_detector(backbone=backbone, epochs=epochs)
