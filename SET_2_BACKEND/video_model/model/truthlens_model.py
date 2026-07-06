"""
Truthlens - AI Content Provenance & Verification Platform
Core Deepfake Video Detection & Temporal Consistency Model Architecture
Built with PyTorch, Torchvision, and Torchaudio
"""

import torch
import torch.nn as nn
import torchvision.models as models
import torch.nn.functional as F

class ResNeXt50FeatureExtractor(nn.Module):
    """
    ResNeXt50-based spatial feature extractor.
    Extracts frame-level embeddings of shape (batch_size, feature_dim)
    from video frames to identify blending seams, color spaces anomalies,
    and diffusion artifacts.
    """
    def __init__(self, pretrained=True, feature_dim=512):
        super(ResNeXt50FeatureExtractor, self).__init__()
        # Use standard resnext50_32x4d for advanced multi-cardinality representations
        if pretrained:
            weights = models.ResNeXt50_32X4D_Weights.DEFAULT
            self.backbone = models.resnext50_32x4d(weights=weights)
        else:
            self.backbone = models.resnext50_32x4d()
            
        # Replace the final fully connected layer to output target features
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity() # Strip the original classification head
        
        # Projection layer to standard embed size
        self.projection = nn.Sequential(
            nn.Linear(in_features, feature_dim),
            nn.BatchNorm1d(feature_dim),
            nn.ReLU(),
            nn.Dropout(0.3)
        )
        
    def forward(self, x):
        # Input shape: (Batch Size * Sequence Length, Channels, Height, Width)
        # e.g., [B * T, 3, 224, 224]
        features = self.backbone(x) # Out: [B * T, 2048]
        projected = self.projection(features) # Out: [B * T, feature_dim]
        return projected


class TemporalConsistencyLSTM(nn.Module):
    """
    Recurrent Neural Network component (LSTM) designed to analyze frame sequence
    temporal consistency, spotting high-frequency flickering, inconsistent facial transitions,
    unnatural eye blinking rates, and blending boundary shifts.
    """
    def __init__(self, input_dim=512, hidden_dim=256, num_layers=2, bidirectional=True):
        super(TemporalConsistencyLSTM, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=bidirectional,
            dropout=0.4 if num_layers > 1 else 0.0
        )
        
        # Combine bidirectional states if active
        self.lstm_out_dim = hidden_dim * 2 if bidirectional else hidden_dim
        
        # Temporal attention mechanism to weight the most suspicious or irregular transitions
        self.attention = nn.Sequential(
            nn.Linear(self.lstm_out_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 1)
        )
        
    def forward(self, x):
        # Input shape: (Batch Size, Sequence Length, Input Dim) -> e.g., [B, T, 512]
        lstm_out, (hn, cn) = self.lstm(x) # Out: [B, T, lstm_out_dim]
        
        # Compute self-attention weights over time frames
        attn_weights = self.attention(lstm_out) # Out: [B, T, 1]
        attn_weights = F.softmax(attn_weights, dim=1) # Out: [B, T, 1]
        
        # Context vector via weighted sum of temporal outputs
        context = torch.sum(lstm_out * attn_weights, dim=1) # Out: [B, lstm_out_dim]
        
        return context, attn_weights


class CrossModalAttention(nn.Module):
    """
    Cross-Modal Attention Network for evaluating synchronization mismatches
    between visual lip/facial movements and generated/cloned audio tracks.
    """
    def __init__(self, visual_dim=512, audio_dim=128, common_dim=256):
        super(CrossModalAttention, self).__init__()
        # Project both modalities to a common embedding space
        self.project_visual = nn.Linear(visual_dim, common_dim)
        self.project_audio = nn.Linear(audio_dim, common_dim)
        
        # Query, Key, Value representations for Multihead Cross Attention
        self.mha = nn.MultiheadAttention(embed_dim=common_dim, num_heads=4, batch_first=True)
        
        # Output dense layers
        self.fc = nn.Sequential(
            nn.Linear(common_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2)
        )
        
    def forward(self, visual_seq, audio_seq):
        # visual_seq: [B, T, visual_dim]
        # audio_seq:  [B, Ta, audio_dim] (Ta is number of audio frames/spectrogram windows)
        
        v_proj = self.project_visual(visual_seq) # [B, T, common_dim]
        a_proj = self.project_audio(audio_seq)   # [B, Ta, common_dim]
        
        # Visual acts as queries, Audio acts as keys and values to capture lip-audio sync
        attn_output, attn_weights = self.mha(query=v_proj, key=a_proj, value=a_proj) # [B, T, common_dim]
        
        # Pool across sequence length to yield audio-visual synchronization state
        pooled_sync = torch.mean(attn_output, dim=1) # [B, common_dim]
        out = self.fc(pooled_sync) # [B, 128]
        
        return out, attn_weights


class TruthLensDeepfakeDetector(nn.Module):
    """
    The ultimate Multi-Modal Feature Fusion Network that merges frame spatial indicators,
    LSTM temporal consistency states, and audio-visual synchronization features to generate
    a comprehensive authenticity index.
    """
    def __init__(self, feature_dim=512, audio_dim=128, hidden_dim=256):
        super(TruthLensDeepfakeDetector, self).__init__()
        self.feature_dim = feature_dim
        
        # Spatial Feature Extractor
        self.spatial_extractor = ResNeXt50FeatureExtractor(pretrained=True, feature_dim=feature_dim)
        
        # Temporal Consistency Module
        self.temporal_lstm = TemporalConsistencyLSTM(input_dim=feature_dim, hidden_dim=hidden_dim)
        
        # Audio-Visual Sync Module
        self.av_sync = CrossModalAttention(visual_dim=feature_dim, audio_dim=audio_dim, common_dim=256)
        
        # Final Multimodal Fusion Head
        # Concatenates: Temporal output [lstm_out_dim] + AV sync output [128]
        fusion_input_dim = self.temporal_lstm.lstm_out_dim + 128
        
        self.classifier = nn.Sequential(
            nn.Linear(fusion_input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 2) # Outputs: Logits for [Real, Fake]
        )
        
    def forward(self, video_frames, audio_features):
        """
        Forward Pass of the Truthlens Verification Network.
        
        Parameters:
        -----------
        video_frames: torch.Tensor
            Tensor of shape (B, T, C, H, W) representing sampled video sequence.
            B: Batch Size, T: Frames, C: Channels, H: Height, W: Width
        audio_features: torch.Tensor
            Tensor of shape (B, Ta, audio_dim) representing the Mel-spectrogram/MFCC vectors of the voice track.
            
        Returns:
        --------
        logits: torch.Tensor
            Logits of shape (B, 2) where class 0 is Real and class 1 is Fake/Manipulated.
        spatial_embeddings: torch.Tensor
            Frame-by-frame projected spatial feature representations.
        temporal_weights: torch.Tensor
            Attention scores highlighting which frames in the sequence contain temporal anomalies.
        av_sync_weights: torch.Tensor
            Matrix map demonstrating sync alignments or voice-cloning offsets.
        """
        batch_size, seq_len, channels, height, width = video_frames.size()
        
        # 1. Spatial Phase: Extract frame-by-frame visual embeddings
        # Reshape to 4D for Convolution network processing: [B*T, C, H, W]
        flat_frames = video_frames.view(batch_size * seq_len, channels, height, width)
        spatial_embeddings = self.spatial_extractor(flat_frames) # [B*T, feature_dim]
        
        # Reshape back to sequence: [B, T, feature_dim]
        seq_embeddings = spatial_embeddings.view(batch_size, seq_len, self.feature_dim)
        
        # 2. Temporal Phase: Analyze sequential frame transition consistency
        temporal_context, temporal_weights = self.temporal_lstm(seq_embeddings) # [B, lstm_out_dim], [B, T, 1]
        
        # 3. Audio-Visual Sync Phase: Process cross-modal attention maps
        sync_context, av_sync_weights = self.av_sync(seq_embeddings, audio_features) # [B, 128], [B, T, Ta]
        
        # 4. Fusion and Decision Phase
        fused_features = torch.cat((temporal_context, sync_context), dim=1) # [B, lstm_out_dim + 128]
        logits = self.classifier(fused_features) # [B, 2]
        
        return logits, seq_embeddings, temporal_weights, av_sync_weights


def compute_comprehensive_trust_metrics(logits, temporal_weights, av_sync_weights, forensics_data=None):
    """
    Deterministic trust score generation engine representing Truthlens verification algorithms.
    Combines direct neural classification results with heuristic temporal stability and physical forensics.
    
    Returns a dictionary of:
    - Authenticity Score (%)
    - Risk Level ('Low', 'Medium', 'High')
    - Confidence Score (%)
    - Trust Index (0.0 to 10.0)
    """
    probabilities = F.softmax(logits, dim=1)
    real_prob = probabilities[0][0].item()
    fake_prob = probabilities[0][1].item()
    
    # 1. Base Authenticity Score
    # Highly correlated with Real Probability, adjusted slightly by temporal variance stability
    if temporal_weights is not None:
        temporal_variance = torch.var(temporal_weights).item()
        temporal_penalty = min(0.20, temporal_variance * 5.0) if fake_prob > 0.4 else 0.0
    else:
        temporal_penalty = 0.0
        
    authenticity_score = max(0.0, min(100.0, (real_prob - temporal_penalty) * 100.0))
    
    # 2. Integrate Advanced Forensic Analysis overriding
    # If the physical forensic analyzer detects high-confidence manipulation, we enforce strict trust boundaries
    if forensics_data is not None:
        manipulation_score = forensics_data.get("manipulation_score", 0.0)
        overall_manipulated = forensics_data.get("overall_manipulated", False)
        
        if overall_manipulated or manipulation_score > 0.4:
            # Strictly limit authenticity of manipulated files to prevent false-positives >75%
            max_allowed_authenticity = 100.0 - (manipulation_score * 100.0)
            # Ensure it is at most 35% (High Risk) for high-severity manipulations
            if manipulation_score > 0.6 or overall_manipulated:
                max_allowed_authenticity = min(35.0, max_allowed_authenticity)
                
            authenticity_score = min(authenticity_score, max_allowed_authenticity)
            confidence_score = forensics_data.get("confidence", 95.0)
        else:
            # If both neural model and forensics agree it is clean
            confidence_score = max(abs(real_prob - fake_prob) * 100.0, forensics_data.get("confidence", 90.0))
    else:
        confidence_score = abs(real_prob - fake_prob) * 100.0
        
    # 3. Risk Level Assignment
    if authenticity_score > 80.0:
        risk_level = "Low Risk"
    elif authenticity_score > 40.0:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"
        
    # 4. Trust Index
    trust_index = round((authenticity_score / 10.0), 2)
    
    return {
        "authenticity_score": round(authenticity_score, 2),
        "risk_level": risk_level,
        "confidence_score": round(confidence_score, 2),
        "trust_index": trust_index
    }

if __name__ == "__main__":
    print("Initializing Truthlens Deepfake Verification Model...")
    model = TruthLensDeepfakeDetector(feature_dim=512, audio_dim=128, hidden_dim=256)
    print("\nModel instantiated successfully!")
    print(f"Total Parameters: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    
    # Run mock pass to verify dimensions
    print("\nRunning structural dimension test pass...")
    batch_size = 1
    sequence_len = 30 # standard frames
    channels = 3
    height, width = 224, 224
    audio_dim = 128
    audio_len = 80 # spectrogram bins over time
    
    dummy_video = torch.randn(batch_size, sequence_len, channels, height, width)
    dummy_audio = torch.randn(batch_size, audio_len, audio_dim)
    
    logits, embeddings, temp_weights, av_weights = model(dummy_video, dummy_audio)
    
    print("\nDimensional outputs:")
    print(f"  - Input Video Tensor Shape:  {list(dummy_video.shape)}")
    print(f"  - Input Audio Tensor Shape:  {list(dummy_audio.shape)}")
    print(f"  - Logits Shape:              {list(logits.shape)}")
    print(f"  - Spatial Embeddings Shape:  {list(embeddings.shape)}")
    print(f"  - Temporal Attention Shape:  {list(temp_weights.shape)}")
    print(f"  - AV Cross Attention Shape:  {list(av_weights.shape)}")
    
    metrics = compute_comprehensive_trust_metrics(logits, temp_weights, av_weights)
    print("\nFused Trust Metrics Generated:")
    for k, v in metrics.items():
        print(f"  - {k.replace('_', ' ').title()}: {v}")
