import os
from PIL import Image
from PIL.ExifTags import TAGS
import datetime

class MetadataIntelligenceEngine:
    """
    Examines image EXIF metadata, headers, structures, and software trails
    to construct a Content Provenance profile and lineage map.
    """
    def __init__(self, file_path=None):
        self.file_path = file_path
        self.raw_exif = {}
        self.provenance_metrics = {
            "hasExif": False,
            "deviceInfo": "Unknown Camera/Device",
            "creationTimestamp": None,
            "softwareCreated": None,
            "gpsPresent": False,
            "suspiciousTags": [],
            "editingHistory": [],
            "metadataValidityScore": 100 # Default starts perfect, decays on warning signs
        }
        if file_path:
            self.analyze()
            
    def analyze(self):
        if not os.path.exists(self.file_path):
            self.provenance_metrics["editingHistory"].append("File not found.")
            self.provenance_metrics["metadataValidityScore"] = 0
            return self.provenance_metrics
                
        try:
            with Image.open(self.file_path) as img:
                # Basic info
                self.provenance_metrics["format"] = img.format
                self.provenance_metrics["size"] = img.size
                
                # Check EXIF
                info = img._getexif()
                if info:
                    self.provenance_metrics["hasExif"] = True
                    for tag_id, value in info.items():
                        tag = TAGS.get(tag_id, tag_id)
                        self.raw_exif[tag] = value
                                    
                    # 1. Device Hardware Details
                    make = self.raw_exif.get("Make", "")
                    model = self.raw_exif.get("Model", "")
                    if make or model:
                        self.provenance_metrics["deviceInfo"] = f"{make} {model}".strip()
                    else:
                        # Wiped EXIF camera model triggers score decay
                        self.provenance_metrics["metadataValidityScore"] -= 15
                        self.provenance_metrics["suspiciousTags"].append("Device Make/Model signature is absent.")
                                    
                    # 2. Extract Creation Timestamp
                    date_time_str = self.raw_exif.get("DateTimeOriginal") or self.raw_exif.get("DateTime")
                    if date_time_str:
                        self.provenance_metrics["creationTimestamp"] = date_time_str
                    else:
                        self.provenance_metrics["metadataValidityScore"] -= 10
                        self.provenance_metrics["suspiciousTags"].append("Original creation date is missing.")
                                        
                    # 3. Check for Editing Software footprints (Photoshop, Lightroom, GIMP, etc.)
                    software = self.raw_exif.get("Software", "")
                    if software:
                        self.provenance_metrics["softwareCreated"] = software
                        self.provenance_metrics["editingHistory"].append(f"Edited/Processed in software: {software}")
                        self.provenance_metrics["metadataValidityScore"] -= 30 # Software edit means not original/raw
                                    
                    # 4. GPS Check
                    gps_info = self.raw_exif.get("GPSInfo")
                    if gps_info:
                        self.provenance_metrics["gpsPresent"] = True
                                    
                else:
                    # Missing EXIF as a whole (highly common for screenshots, downloads, or social media compression)
                    self.provenance_metrics["hasExif"] = False
                    self.provenance_metrics["metadataValidityScore"] = 40 # Substantial drop
                    self.provenance_metrics["suspiciousTags"].append("EXIF metadata segment has been completely stripped or is missing.")
                    
        except Exception as e:
            self.provenance_metrics["metadataValidityScore"] = 0
            self.provenance_metrics["suspiciousTags"].append(f"Header parsing failure: {str(e)}")
            
        return self.provenance_metrics
