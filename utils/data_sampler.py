import pandas as pd

def sample_data(csv_path, n_samples, random_state=42):
    """
    從 CSV 檔案載入資料，並從每個群組中取樣指定數量的項目。

    Args:
        csv_path (str): 輸入的 CSV 檔案路徑。
        n_samples (int): 要從每個標籤群組中抽取的樣本數。
        random_state (int): 用於可重現性的隨機種子。

    Returns:
        pandas.DataFrame: 包含取樣資料的 DataFrame。
    """
    print("Loading and sampling data...")
    data = pd.read_csv(csv_path)
    
    # 確保 'labels' 欄位存在
    if 'labels' not in data.columns:
        raise ValueError("The CSV file must contain a 'labels' column for grouping.")
        
    sampled_df = data.groupby('labels').apply(
        lambda x: x.sample(n=n_samples, random_state=random_state)
    ).reset_index(drop=True)
    
    print(f"Successfully sampled {len(sampled_df)} items.")
    return sampled_df

if __name__ == '__main__':
    # 這是如何使用此模組的範例。
    # 它假設原始 CSV 檔案位於父目錄中。
    # 在最終的流程中，它將由主腳本調用。
    try:
        INPUT_CSV_PATH = "../VanGoghPaintings.csv"
        SAMPLES_PER_LABEL = 28
        sampled_data = sample_data(INPUT_CSV_PATH, SAMPLES_PER_LABEL)
        print("\nSampled DataFrame head:")
        print(sampled_data.head())
    except FileNotFoundError:
        print(f"Error: The file {INPUT_CSV_PATH} was not found. This script is intended to be run from the project's subdirectories.")
    except Exception as e:
        print(f"An error occurred: {e}")

