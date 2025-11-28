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

        if os.path.isdir(archive_path):
            print(f"檢測到下載路徑為目錄: {archive_path}")
            print(f"--- 正在複製資料至 '{output_dir}' 目錄 ---")
            
            # 複製所有內容到 data 目錄
            if os.listdir(output_dir):
                 print(f"警告: '{output_dir}' 目錄不為空，可能會覆蓋檔案。")

            for item in os.listdir(archive_path):
                s = os.path.join(archive_path, item)
                d = os.path.join(output_dir, item)
                if os.path.isdir(s):
                    if os.path.exists(d):
                        shutil.rmtree(d)
                    shutil.copytree(s, d)
                else:
                    shutil.copy2(s, d)
            print("複製完成。")
            
        else:
            print(f"--- 正在解壓縮資料至 '{output_dir}' 目錄 ---")
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                # ... (保留原有的 zip 處理邏輯，雖然目前 kagglehub 似乎返回目錄)
                zip_ref.extractall(output_dir) # 簡化：直接解壓到 data
                print("解壓縮完成。")
        
        # 處理巢狀目錄結構 (例如 data/training/training/...)
        print("--- 檢查並修正目錄結構 ---")
        
        # 檢查是否存在 data/training/training
        nested_training_path = os.path.join(output_dir, "training", "training")
        training_path = os.path.join(output_dir, "training")
        
        source_move_dir = None
        
        if os.path.exists(nested_training_path) and os.path.isdir(nested_training_path):
             source_move_dir = nested_training_path
        elif os.path.exists(training_path) and os.path.isdir(training_path):
             # 檢查 training 下面是否直接是作者目錄，還是空的
             # 如果 training 下面還有 training，上面那個 if 會抓到
             # 這裡處理 data/training/[Authors] 的情況
             source_move_dir = training_path

        if source_move_dir:
            print(f"發現巢狀目錄結構於: {source_move_dir}，正在移動檔案...")
            for item in os.listdir(source_move_dir):
                s = os.path.join(source_move_dir, item)
                d = os.path.join(output_dir, item)
                
                if os.path.exists(d):
                    if os.path.isdir(d):
                        shutil.rmtree(d)
                    else:
                        os.remove(d)
                
                shutil.move(s, output_dir)
                print(f"已移動: {item}")
            
            # 清理空的 training 目錄
            print("清理空目錄...")
            if os.path.exists(nested_training_path):
                shutil.rmtree(training_path) # 刪除 data/training (包含裡面的 training)
            elif os.path.exists(training_path):
                shutil.rmtree(training_path)
                
        print("目錄結構修正完成。")

        # 清理暫存檔案 (如果是 zip 下載的情況)
        if not os.path.isdir(archive_path) and os.path.exists(archive_path):
             os.remove(archive_path)
        
        print("\n資料集已成功準備就緒！")

    except Exception as e:
        print(f"\n處理過程中發生錯誤: {e}")
        print("請確保您已使用 'kaggle login' 或設定了 'kaggle.json' API 金鑰。 ")

if __name__ == "__main__":
    download_and_unzip_dataset()
