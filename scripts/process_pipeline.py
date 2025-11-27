import sys
import os
import pandas as pd
import numpy as np
from sklearn.manifold import TSNE

# 將父目錄添加到系統路徑，以允許從 'utils' 目錄導入模組
# 這允許腳本找到 'utils' 資料夾中的模組
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 從我們新建立的模組中導入函式
from utils.data_sampler import sample_data
from utils.feature_extractor import get_device, load_model, extract_features

# --- 設定 ---
# 設定新多作者資料集的輸入目錄
INPUT_DATA_DIR = "data"
# 設定新的輸出檔案名稱
OUTPUT_CSV_PATH = os.path.join("static", "multiAuthor_features.csv")

# 我們可以保留這個設定，以便在每位作者的作品內部進行取樣
SAMPLES_PER_LABEL = 28
RANDOM_STATE = 42

def reduce_dimensions(features, random_state):
    """
    使用 t-SNE 降低特徵向量的維度。

    Args:
        features (list): 一個包含高維度特徵向量的列表。
        random_state (int): 用於可重現性的隨機種子。

    Returns:
        numpy.ndarray: 一個包含降維後 2D 座標的陣列。
    """
    print("Performing dimensionality reduction using t-SNE...")
    feature_array = np.array(features)
    # 如果樣本數非常少，則調整 perplexity 值使其小於樣本數
    perplexity = min(30, len(feature_array) - 1)
    if perplexity <= 0:
        print("Warning: Not enough samples to perform t-SNE. Skipping.")
        # 返回一個形狀正確的零陣列
        return np.zeros((len(feature_array), 2))
        
    tsne = TSNE(n_components=2, random_state=random_state, perplexity=perplexity)
    embedded_features = tsne.fit_transform(feature_array)
    print("Dimensionality reduction complete.")
    return embedded_features

def main():
    """
    執行多作者資料集完整資料處理流程的主函式。
    """
    print("--- Starting Multi-Author Data Processing Pipeline ---")
    
    image_files = []
    authors = []
    
    # 掃描新的 data 目錄
    for author_name in os.listdir(INPUT_DATA_DIR):
        author_path = os.path.join(INPUT_DATA_DIR, author_name)
        if os.path.isdir(author_path):
            for filename in os.listdir(author_path):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    # 為 image_path 欄位建立一個相對路徑
                    relative_path = os.path.join(author_name, filename)
                    # 使用正斜線以確保網頁相容性
                    image_files.append(relative_path.replace('\\', '/'))
                    authors.append(author_name)

    if not image_files:
        print(f"Error: No images found in {INPUT_DATA_DIR}. Please check the directory.")
        return

    # 從掃描到的檔案建立 DataFrame
    data = pd.DataFrame({
        'image_path': image_files,
        'author': authors,
    })
    # 使用 'author' 作為 class_name，並建立一個數字標籤
    data['class_name'] = data['author']
    data['labels'] = pd.factorize(data['author'])[0] + 1

    # 步驟 1：從每位作者的作品中取樣資料
    try:
        # 根據新的 'author' 欄位進行分組取樣
        sampled_df = data.groupby('author').apply(
            lambda x: x.sample(n=min(SAMPLES_PER_LABEL, len(x)), random_state=RANDOM_STATE)
        ).reset_index(drop=True)
        print(f"Sampled {len(sampled_df)} images from the scanned directory.")
    except Exception as e:
        print(f"Could not sample data. Using all {len(data)} scanned images. Error: {e}")
        sampled_df = data

    # 步驟 2：提取特徵
    device = get_device()
    model, preprocessor = load_model(device)
    # 現在圖片路徑是相對於 'data' 目錄
    feature_vectors = extract_features(
        image_paths=sampled_df["image_path"].tolist(),
        model=model,
        preprocessor=preprocessor,
        device=device,
        image_base_path=INPUT_DATA_DIR # 傳入正確的基礎路徑
    )
    
    # 將特徵加入 DataFrame
    sampled_df["feature_vector"] = feature_vectors

    # 步驟 3：維度降低
    embedded_coords = reduce_dimensions(feature_vectors, random_state=RANDOM_STATE)
    
    # 將座標加入 DataFrame
    sampled_df['x'] = embedded_coords[:, 0]
    sampled_df['y'] = embedded_coords[:, 1]

    # 步驟 4：儲存最終輸出
    final_df = sampled_df.drop(columns=['feature_vector'])
    final_df.to_csv(OUTPUT_CSV_PATH, index=False)
    
    print(f"\n--- Pipeline Complete ---")
    print(f"Successfully processed {len(final_df)} images.")
    print(f"Output saved to: {OUTPUT_CSV_PATH}")
    print("\nFinal DataFrame head:")
    print(final_df.head())

if __name__ == '__main__':
    main()
