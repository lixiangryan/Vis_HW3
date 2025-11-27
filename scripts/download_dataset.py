import kagglehub
import zipfile
import os
import shutil

def download_and_unzip_dataset():
    """
    Downloads the impressionist classifier dataset from Kaggle Hub,
    unzips it into the 'data' directory, and cleans up the downloaded archive.
    """
    output_dir = "data"
    
    print("--- 開始下載 Kaggle 資料集 ---")
    print("這可能需要一些時間，請稍候...")
    
    try:
        # 下載資料集，它會返回一個 .zip 檔案的路徑
        archive_path = kagglehub.dataset_download("delayedkarma/impressionist-classifier-data")
        print(f"資料集已下載至: {archive_path}")

        # 確保 'data' 目錄存在
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"已建立 '{output_dir}' 目錄。 সন")

        print(f"--- 正在解壓縮資料至 '{output_dir}' 目錄 ---")
        with zipfile.ZipFile(archive_path, 'r') as zip_ref:
            # Kaggle 的資料集通常包含一個與資料集同名的根目錄
            # 我們需要解壓縮後將內容移動到 'data' 的根目錄
            
            # 建立一個臨時解壓縮目錄
            temp_unzip_dir = "temp_unzip"
            if os.path.exists(temp_unzip_dir):
                shutil.rmtree(temp_unzip_dir)
            os.makedirs(temp_unzip_dir)

            zip_ref.extractall(temp_unzip_dir)
            print("解壓縮完成。")

            # 通常，Kaggle 資料集解壓縮後會有一個或多個子目錄
            # 我們需要找到這些子目錄並將其內容移動到 'data' 目錄
            for item in os.listdir(temp_unzip_dir):
                item_path = os.path.join(temp_unzip_dir, item)
                # 假設解壓縮後的第一層目錄就是我們想要的藝術家目錄
                if os.path.isdir(item_path):
                    # 如果 'data' 目錄下已存在同名資料夾，先刪除
                    target_dir = os.path.join(output_dir, item)
                    if os.path.exists(target_dir):
                        shutil.rmtree(target_dir)
                    # 移動資料夾
                    shutil.move(item_path, output_dir)
                    print(f"已將 '{item}' 移動至 '{output_dir}'")
        
        print("--- 清理暫存檔案 ---")
        # 移除下載的 .zip 檔案
        os.remove(archive_path)
        # 移除臨時解壓縮目錄
        shutil.rmtree(temp_unzip_dir)
        
        print("\n資料集已成功準備就緒！")

    except Exception as e:
        print(f"\n處理過程中發生錯誤: {e}")
        print("請確保您已使用 'kaggle login' 或設定了 'kaggle.json' API 金鑰。 সন")

if __name__ == "__main__":
    download_and_unzip_dataset()
