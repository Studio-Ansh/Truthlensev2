import os
import sys
import subprocess

def setup_kaggle_credentials():
    print("Setting up Kaggle API credentials...")
    kaggle_token = "KGAT_eddb47da13b385ac339bbacdb6ad2efa"
    
    # Standard Kaggle home directory paths
    home_dir = os.path.expanduser("~")
    kaggle_dir = os.path.join(home_dir, ".kaggle")
    
    os.makedirs(kaggle_dir, exist_ok=True)
    token_path = os.path.join(kaggle_dir, "access_token")
    
    with open(token_path, "w") as f:
        f.write(kaggle_token)
    
    # Secure token file permissions (read/write by owner only)
    try:
        os.chmod(token_path, 0o600)
        print(f"Kaggle API token successfully written to {token_path} and secured.")
    except Exception as e:
        print(f"Warning: Could not set file permissions: {e}")
        
    os.environ["KAGGLE_API_TOKEN"] = kaggle_token
    print("KAGGLE_API_TOKEN environment variable set.")

def download_dataset(dataset_name, target_dir):
    print(f"\n--- Downloading {dataset_name} into {target_dir} ---")
    os.makedirs(target_dir, exist_ok=True)
    
    # We can use the kaggle CLI or direct request API if installed.
    # Attempt to call kaggle command line
    try:
        print(f"Running: kaggle datasets download -d {dataset_name} -p {target_dir} --unzip")
        result = subprocess.run(
            ["kaggle", "datasets", "download", "-d", dataset_name, "-p", target_dir, "--unzip"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"Successfully downloaded and extracted {dataset_name}!")
        else:
            print(f"Error downloading {dataset_name}:")
            print(result.stderr)
            print("Note: Please make sure 'kaggle' package is installed ('pip install kaggle').")
    except FileNotFoundError:
        print("Error: 'kaggle' command line tool not found. Please run 'pip install kaggle' first.")
    except Exception as e:
        print(f"An unexpected error occurred during download: {e}")

if __name__ == "__main__":
    setup_kaggle_credentials()
    
    # Create dataset subfolders as requested
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    datasets = {
        "deepfake-dataset": ("simongraves/deepfake-dataset", os.path.join(base_dir, "simongraves_deepfake")),
        "anti-spoofing": ("trainingdatapro/real-vs-fake-anti-spoofing-video-classification", os.path.join(base_dir, "trainingdatapro_antispoofing")),
        "deepfake-videos": ("unidpro/deepfake-videos-dataset", os.path.join(base_dir, "unidpro_deepfake_videos")),
        "cropped-deepfake": ("ucimachinelearning/deep-fake-detection-cropped-dataset", os.path.join(base_dir, "ucimachinelearning_cropped"))
    }
    
    print("\nDataset paths configured inside `/dataset/` folder:")
    for key, (source, path) in datasets.items():
        print(f"  - {key}: source='{source}', destination='{path}'")
        
    print("\nTo download all datasets, ensure you have installed the kaggle CLI ('pip install kaggle') and then execute this script.")
    print("Example:\n  pip install kaggle\n  python download_datasets.py")
