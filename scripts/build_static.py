import pandas as pd
import os
import json
import shutil

# 定義基礎目錄 (專案根目錄) 為此腳本所在目錄的父目錄
BASE_DIR = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
DATA_DIR = os.path.join(BASE_DIR, 'data')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')

def build_static():
    print("開始建置靜態網站資源 (Local File Support)...")

    # 1. 處理 CSV 資料並轉為 JS (window.GLOBAL_DATA)
    csv_path = os.path.join(STATIC_DIR, "multiAuthor_features.csv")
    if not os.path.exists(csv_path):
        print(f"錯誤: 找不到 {csv_path}")
        return

    print(f"讀取 {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # 將圖片路徑轉換為相對 URL (data/...)
    df['image_url'] = df['image_path'].apply(lambda p: f"data/{p}")
    
    data = df[['image_path', 'image_url', 'x', 'y', 'class_name', 'labels', 'author', 'cluster_id']].to_dict(orient='records')
    
    # 寫入 static/data.js
    js_data_path = os.path.join(STATIC_DIR, "data.js")
    with open(js_data_path, 'w', encoding='utf-8') as f:
        f.write("window.GLOBAL_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";")
    print(f"已生成 {js_data_path}")

    # 2. 處理向量資料並轉為 JS (window.GLOBAL_VECTORS)
    vectors_path = os.path.join(STATIC_DIR, "multiAuthor_vectors.json")
    if os.path.exists(vectors_path):
        print(f"讀取 {vectors_path}...")
        with open(vectors_path, 'r', encoding='utf-8') as f:
            vectors = json.load(f)
        
        # 寫入 static/vectors.js
        js_vectors_path = os.path.join(STATIC_DIR, "vectors.js")
        with open(js_vectors_path, 'w', encoding='utf-8') as f:
            f.write("window.GLOBAL_VECTORS = ")
            json.dump(vectors, f, ensure_ascii=False) # 向量檔較大，不縮排以節省空間
            f.write(";")
        print(f"已生成 {js_vectors_path}")
    else:
        print(f"警告: 找不到 {vectors_path}，相似度功能將無法使用。")

    # 3. 複製 index.html 到根目錄
    index_src = os.path.join(TEMPLATES_DIR, 'index.html')
    index_dst = os.path.join(BASE_DIR, 'index.html')
    
    if os.path.exists(index_src):
        shutil.copy(index_src, index_dst)
        print(f"已複製 {index_src} -> {index_dst}")
    else:
        print(f"錯誤: 找不到 {index_src}")

    print("靜態資源建置完成！")
    print("您可以直接雙擊 index.html 開啟網站 (無需伺服器)。")

if __name__ == "__main__":
    build_static()
