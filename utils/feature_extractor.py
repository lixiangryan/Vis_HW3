import torch
from PIL import Image
from transformers import EfficientNetImageProcessor
from torchvision.models import efficientnet_b5
from tqdm import tqdm
import numpy as np
import os

def get_device():
    """檢查並返回可用的設備 (CUDA GPU 或 CPU)。"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    return device

def load_model(device):
    """載入預訓練的 EfficientNet-B5 模型和預處理器。"""
    print("Loading pre-trained EfficientNet-B5 model...")
    preprocessor = EfficientNetImageProcessor.from_pretrained("google/efficientnet-b5")
    model = efficientnet_b5(pretrained=True)
    model = model.to(device)
    model.eval()
    print("Model loaded successfully.")
    return model, preprocessor

def extract_features(image_paths, model, preprocessor, device, image_base_path="static/"):
    """
    從圖片路徑列表中提取特徵向量。

    Args:
        image_paths (list): 包含圖片相對路徑的列表。
        model: 預訓練的模型。
        preprocessor: 圖片預處理器。
        device: 要使用的 torch 設備 (CPU 或 CUDA)。
        image_base_path (str): 圖片資料夾所在的基礎路徑。

    Returns:
        list: 一個包含特徵向量 (numpy 陣列) 的列表。
    """
    feature_vectors = []
    print("Extracting features from images...")
    for path_suffix in tqdm(image_paths):
        try:
            # 原始的 notebook 路徑邏輯不一致，此處將其標準化。
            # 假設 path_suffix 的格式類似 "van-gogh-paintings/Arles/image.jpg"
            # 且我們需要將其與基礎路徑結合。
            full_path = os.path.join(image_base_path, path_suffix)
            
            # 一個更穩健的方式來處理來自 notebook 的原始路徑
            if "van-gogh-paintings/" in path_suffix:
                 path_suffix = path_suffix.split("van-gogh-paintings/")[-1]
                 full_path = os.path.join(image_base_path, "van-gogh-paintings", path_suffix)


            with torch.no_grad():
                image = Image.open(full_path).convert("RGB")
                input_tensor = preprocessor(image, return_tensors="pt")["pixel_values"]
                input_tensor = input_tensor.to(device)
                
                features = model.features(input_tensor)
                feature_vector = torch.nn.functional.adaptive_avg_pool2d(features, (1, 1))
                feature_vector = feature_vector.squeeze()
                
                feature_vectors.append(feature_vector.cpu().numpy())
        except FileNotFoundError:
            print(f"Warning: Image not found at {full_path}. Skipping.")
        except Exception as e:
            print(f"An error occurred while processing {path_suffix}: {e}")

    print("Feature extraction complete.")
    return feature_vectors

if __name__ == '__main__':
    # 這是如何使用此模組的範例。
    # 它示範了載入模型並從單張圖片中提取特徵。
    try:
        # 此範例假設指定的路徑中至少有一張圖片
        EXAMPLE_IMAGE_PATH = "static/van-gogh-paintings/Arles/A Field of Yellow Flowers.jpg"
        
        if not os.path.exists(EXAMPLE_IMAGE_PATH):
             raise FileNotFoundError(f"Example image not found at {EXAMPLE_IMAGE_PATH}")

        device = get_device()
        model, preprocessor = load_model(device)
        
        # 注意：此函式期望一個路徑列表。
        # 為使函式正常運作，路徑需要是相對路徑。
        relative_path = EXAMPLE_IMAGE_PATH.replace('static/', '')
        features = extract_features([relative_path], model, preprocessor, device, image_base_path="static/")
        
        print(f"\nSuccessfully extracted {len(features)} feature vector(s).")
        print("Shape of the first feature vector:", features[0].shape)

    except Exception as e:
        print(f"An error occurred during the example run: {e}")
