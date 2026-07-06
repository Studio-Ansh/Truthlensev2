import torch
import torch.nn as nn
import torchvision.models as models
from transformers import ViTForImageClassification

class EfficientNetB4Detector(nn.Module):
    """
    EfficientNet-B4 Model adapted for Real vs Fake image classification.
    Analyzes local blending discrepancies, diffusion artifacts, and synthetic textures.
    """
    def __init__(self, pretrained=True, num_classes=2):
        super(EfficientNetB4Detector, self).__init__()
        # Load pre-trained EfficientNet-B4 model
        weights = models.EfficientNet_B4_Weights.DEFAULT if pretrained else None
        self.backbone = models.efficientnet_b4(weights=weights)
        
        # Replace the classifier layer
        # EfficientNet-B4 classifier input size is 1792
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier[1] = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(512, num_classes)
        )
        
    def forward(self, x):
        # Outputs logits: [real, fake]
        return self.backbone(x)

class ViTDetector(nn.Module):
    """
    Vision Transformer (ViT) Detector for digital content authentication.
    Uses self-attention to spot global anomalies and diffusion patch artifacts.
    """
    def __init__(self, model_name="google/vit-base-patch16-224", num_classes=2):
        super(ViTDetector, self).__init__()
        # Load pre-trained Hugging Face ViT
        self.vit = ViTForImageClassification.from_pretrained(
            model_name,
            num_labels=num_classes,
            ignore_mismatched_sizes=True
        )
        
    def forward(self, x):
        # Hugging Face ViT expects pixel_values
        outputs = self.vit(pixel_values=x)
        return outputs.logits
