# 畫作資料集視覺化 🎨 (Static Version)

一個使用深度學習特徵、UMAP 降維、D3.js 打造的互動式、資料驅動的畫作視覺化專案。

此專案已轉換為靜態網頁版本，可直接部署於 GitHub Pages 或任何靜態網頁伺服器。

## 📦 專案結構

```
project-root/
├── data/                         # 📥 用於新畫作資料集的輸入目錄 (例如: data/Monet/image.jpg)
│   ├── [Author Name 1]/          #   每個子資料夾代表一位作者
│   │   └── image_01.jpg
│   └── [Author Name 2]/
│       └── image_02.png
├── scripts/                      # 🐍 用於資料處理的 Python 腳本
│   ├── process_pipeline.py       #   用於提取特徵與降維的主腳本
│   └── build_static.py           #   ✨ [NEW] 用於生成靜態網站資源的腳本
├── static/                       # 🌐 面向網頁的靜態資源
│   ├── main.js                   #   D3.js 視覺化邏輯 (包含前端相似度計算)
│   ├── data.json                 #   ✨ 靜態網站用的主要資料檔
│   ├── multiAuthor_vectors.json  #   ✨ 用於前端相似度計算的特徵向量檔
│   └── ...
├── index.html                    # 📄 靜態網站入口 (由 build_static.py 生成)
├── requirements.txt              # 📋 Python 依賴套件列表
└── README.md                     # 📄 專案文件
```

## ✨ 功能特色

*   **深度學習特徵提取**：使用 EfficientNet-B5 從圖片中提取豐富的特徵。
*   **維度降低**：應用 t-SNE 將高維度特徵投影到一個互動式的 2D 空間中。
*   **靜態網頁視覺化**：使用 D3.js 驅動的散點圖，無需後端伺服器。
*   **前端相似度計算**：在瀏覽器端直接計算圖片相似度 (載入向量檔)。
*   **互動式作者篩選器**：透過複選框顯示或隱藏特定作者的作品。
*   **搜尋與突顯**：可依作者或檔名進行搜尋，並在圖表中突顯符合條件的資料點。
*   **顯示群組中心點**：計算並在地圖上標示出每個作者作品群組的中心位置。

## 🚀 安裝說明

### 1. 建立並啟用您的 Python 虛擬環境 (建議)
```bash
python -m venv venv                 # 建立虛擬環境 (僅限首次)
.\venv\Scripts\activate             # 在 Windows 上啟用
source venv/bin/activate            # 在 Linux/macOS 上啟用
```

### 2. 安裝必要的 Python 套件
```bash
pip install --upgrade -r requirements.txt
```
**GPU 使用者請注意：** 如果您希望使用 NVIDIA GPU 來進行特徵提取 (為提升效能，強烈建議)，請確保您安裝了**支援 CUDA 的 PyTorch 版本**。

### 3. 下載資料集 (若尚未下載)
```bash
python scripts/download_dataset.py
```
*需先設定 Kaggle API 金鑰 (`kaggle.json`)。*

## ▶️ 使用方式

### 1. 產生特徵資料
首先，執行資料處理流程以提取特徵並計算您圖片的 2D 座標。
```bash
python scripts/process_pipeline.py
```

### 2. 建置靜態網站
執行以下腳本來生成靜態資源 (`index.html` 和 `static/data.json`)：
```bash
python scripts/build_static.py
```


### 3. 預覽靜態網站
現在，您可以直接**雙擊專案根目錄下的 `index.html`** 來開啟網站，無需啟動任何伺服器！

(當然，您仍然可以使用 `python -m http.server` 來預覽)

## 🖼️ 介面截圖 

### 整體介面
![Overall Interface Screenshot](assets/screenshots/overall_interface.png)

### 選取／懸停於圖片上
![Hover Screenshot](assets/screenshots/hover_image.png)

## 🔮 未來工作 (Future Work)

*   **可選的嵌入模型 (Selectable Embedding Models)**：擴充支援 ResNet, CLIP 等模型。
*   **可選的降維模型 (Selectable Dimensionality Reduction Models)**：增加 UMAP, PCA 等選項。
*   **模型測試結果比較**：並列顯示不同模型組合的結果。
