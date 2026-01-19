import json
import os
from typing import Any, Dict

# 環境変数からデータディレクトリのパスを取得（Renderのディスクストレージ対応）
# デフォルトは相対パスの'data'
DATA_DIR = os.environ.get('DATA_DIR', 'data')

def ensure_data_dir():
    """データディレクトリが存在することを確認"""
    if not os.path.exists(DATA_DIR):
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            print(f"[json_manager] データディレクトリを作成しました: {os.path.abspath(DATA_DIR)}")
        except Exception as e:
            print(f"[json_manager] データディレクトリの作成に失敗しました: {e}, パス: {os.path.abspath(DATA_DIR)}")
            raise

def load_json(filename: str) -> Dict[str, Any]:
    """JSONファイルを読み込む"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_json(filename: str, data: Dict[str, Any]):
    """JSONファイルに保存"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_list_json(filename: str) -> list:
    """JSONファイル（リスト形式）を読み込む"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_list_json(filename: str, data: list):
    """JSONファイル（リスト形式）に保存"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

