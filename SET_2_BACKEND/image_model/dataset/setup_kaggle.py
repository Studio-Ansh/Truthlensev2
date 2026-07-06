import os
import sys
import json
import subprocess
from pathlib import Path

# Kaggle Token provided by the user
KAGGLE_TOKEN = "KGAT_eddb47da13b385ac339bbacdb6ad2efa"

def setup_kaggle_auth():
    print("=== Truthlens: Setting up Kaggle API Token ===")
    
    # Kaggle expects credentials in ~/.kaggle/kaggle.json
    # Format of kaggle.json should be: {"username":"YOUR_USERNAME","key":"YOUR_API_KEY"}
    # The token provided 'KGAT_eddb47da13b385ac339bbacdb6ad2efa' is a generic or client-specific access token.
    # In some client configs, KAGGLE_API_TOKEN environment variable can be used directly or stored.
    
    # Let's write the credentials configuration
    home_dir = Path.home()
    kaggle_dir = home_dir / ".kaggle"
    kaggle_dir.mkdir(parents=True, exist_ok=True)
    
    access_token_file = kaggle_dir / "access_token"
    access_token_file.write_text(KAGGLE_TOKEN)
    access_token_file.chmod(0o600)
    
    # We also set the environment variable for the current process
    os.environ["KAGGLE_API_TOKEN"] = KAGGLE_TOKEN
    os.environ["KAGGLE_CONFIG_DIR"] = str(kaggle_dir)
    
    print(f"Kaggle token saved to: {access_token_file}")
    print("Environment variables configured.")

def create_dataset_directories():
    print("\n=== Truthlens: Creating Separate Folders for Datasets ===")
    
    # Define paths for each dataset as specified in user request
    base_dir = Path("./dataset")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    datasets = {
        "deepfake-detection-challenge": base_dir / "deepfake_detection_challenge",
        "artifact-dataset": base_dir / "artifact_dataset",
        "deepfake-and-real-images": base_dir / "deepfake_and_real_images",
        "real-and-fake-face-detection": base_dir / "real_and_fake_face_detection",
        "samples": base_dir / "samples"
    }
    
    for name, path in datasets.items():
        path.mkdir(parents=True, exist_ok=True)
        print(f"Created/Verified directory: {path}")
        
    return datasets

def test_kaggle_cli():
    print("\n=== Truthlens: Verifying Kaggle Connection ===")
    try:
        # Use subprocess to test connection
        # Setting env var for the subprocess call
        my_env = os.environ.copy()
        my_env["KAGGLE_API_TOKEN"] = KAGGLE_TOKEN
        
        print("Listing active Kaggle competitions as verification...")
        # Since 'kaggle' might be installed but not yet in the default system PATH during background setup,
        # we can call it using python -m kaggle
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "competitions", "list", "--search", "deepfake"],
            env=my_env,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("Successfully connected to Kaggle API!")
            print(result.stdout)
        else:
            print("Kaggle API verification completed with output/warning:")
            print(result.stdout)
            print(result.stderr)
            print("\nNote: Make sure your Kaggle account has accepted the competition rules for the Deepfake Detection Challenge.")
    except Exception as e:
        print(f"Failed to execute Kaggle CLI check: {e}")

if __name__ == "__main__":
    setup_kaggle_auth()
    create_dataset_directories()
    test_kaggle_cli()
