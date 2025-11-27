from flask import Flask, jsonify, render_template, send_from_directory
import pandas as pd
import os

# 定義基礎目錄 (專案根目錄) 為此腳本所在目錄的父目錄
BASE_DIR = os.path.dirname(os.path.abspath(os.path.join(__file__, '..')))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static'
)

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
    data = df[['image_url', 'x', 'y', 'class_name', 'labels', 'author']].to_dict(orient='records')
    return jsonify(data)

@app.route('/')
def index():
    return render_template('index.html')  # 渲染 templates/index.html

if __name__ == '__main__':
    app.run(debug=True, port=5001)