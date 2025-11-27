from flask import Flask, jsonify, render_template, send_from_directory, request
import pandas as pd
import os
import json
import numpy as np

# 定義基礎目錄 (專案根目錄) 為此腳本所在目錄的父目錄
BASE_DIR = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static'
)

# --- 預先載入資料 ---
vectors_path = os.path.join(app.static_folder, "multiAuthor_vectors.json")
feature_vectors = {}
try:
    with open(vectors_path, 'r') as f:
        # 將向量轉換為 NumPy 陣列以利計算
        feature_vectors = {path: np.array(vec) for path, vec in json.load(f).items()}
    print("特徵向量檔案 (multiAuthor_vectors.json) 載入成功。")
except FileNotFoundError:
    print(f"警告：找不到特徵向量檔案 {vectors_path}。相似度分析功能將無法使用。")
except Exception as e:
    print(f"載入特徵向量檔案時發生錯誤: {e}")

# 新增一個路由，以直接從 'data' 目錄提供圖片
@app.route('/data/<path:filename>')
def serve_data_images(filename):
    # 確保路徑對於發送檔案是正確的
    return send_from_directory(os.path.join(BASE_DIR, 'data'), filename)

@app.route('/get_van_gogh_data', methods=['GET'])
def get_van_gogh_data():
    csv_path = os.path.join(app.static_folder, "multiAuthor_features.csv")
    df = pd.read_csv(csv_path)
    
    # 將圖片路徑轉換為前端可訪問的 URL
    # CSV 中的 image_path 是 "作者/圖片.jpg"。Flask 在 '/data' URL 前綴下提供 'data' 目錄的服務。
    df['image_url'] = df['image_path'].apply(lambda p: f"/data/{p}")
    
    # 選擇前端需要的欄位
    data = df[['image_path', 'image_url', 'x', 'y', 'class_name', 'labels', 'author', 'cluster_id']].to_dict(orient='records')
    return jsonify(data)

@app.route('/get_similar_images', methods=['GET'])
def get_similar_images():
    target_path = request.args.get('path')
    if not target_path or not feature_vectors:
        return jsonify({"error": "缺少路徑或特徵向量未載入"}), 400

    target_vector = feature_vectors.get(target_path)
    if target_vector is None:
        return jsonify({"error": "找不到目標圖片的特徵向量"}), 404

    distances = []
    for path, vector in feature_vectors.items():
        # 計算歐幾里得距離
        dist = np.linalg.norm(target_vector - vector)
        distances.append((dist, path))
    
    # 按距離排序
    distances.sort(key=lambda x: x[0])
    
    # 取得最相似的 6 個 (包含自己)，然後只回傳圖片路徑
    similar_paths = [path for dist, path in distances[:6]]
    
    return jsonify(similar_paths)


@app.route('/')
def index():
    return render_template('index.html')  # 渲染 templates/index.html

if __name__ == '__main__':
    app.run(debug=True, port=5001)