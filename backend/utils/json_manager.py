import json
import os
from typing import Any, Dict, Optional

# S3設定
USE_S3 = os.environ.get('USE_S3', 'false').lower() == 'true'
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'nohara-dairy-report-db')
AWS_REGION = os.environ.get('AWS_REGION', 'ap-northeast-1')

# ローカルデータディレクトリ（開発環境用）
DATA_DIR = 'data'

# S3クライアント（必要な場合のみ初期化）
_s3_client = None

def get_s3_client():
    """S3クライアントを取得（必要に応じて初期化）"""
    global _s3_client
    if _s3_client is None and USE_S3:
        try:
            import boto3
            _s3_client = boto3.client(
                's3',
                region_name=AWS_REGION,
                aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
            )
            print(f"[json_manager] S3クライアントを初期化しました: バケット={S3_BUCKET_NAME}, リージョン={AWS_REGION}")
        except Exception as e:
            print(f"[json_manager] S3クライアントの初期化に失敗しました: {e}")
            raise
    return _s3_client

def ensure_data_dir():
    """データディレクトリが存在することを確認（ローカル環境のみ）"""
    if not USE_S3:
        if not os.path.exists(DATA_DIR):
            try:
                os.makedirs(DATA_DIR, exist_ok=True)
                print(f"[json_manager] データディレクトリを作成しました: {os.path.abspath(DATA_DIR)}")
            except Exception as e:
                print(f"[json_manager] データディレクトリの作成に失敗しました: {e}, パス: {os.path.abspath(DATA_DIR)}")
                raise

def load_json(filename: str) -> Dict[str, Any]:
    """JSONファイルを読み込む（S3またはローカル）"""
    if USE_S3:
        try:
            s3_client = get_s3_client()
            response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=filename)
            content = response['Body'].read().decode('utf-8')
            return json.loads(content)
        except s3_client.exceptions.NoSuchKey:
            # ファイルが存在しない場合は空の辞書を返す
            return {}
        except Exception as e:
            print(f"[json_manager] S3からの読み込みに失敗しました: {filename}, エラー: {e}")
            return {}
    else:
        # ローカルファイルシステム
        ensure_data_dir()
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

def save_json(filename: str, data: Dict[str, Any]):
    """JSONファイルに保存（S3またはローカル）"""
    if USE_S3:
        try:
            s3_client = get_s3_client()
            content = json.dumps(data, ensure_ascii=False, indent=2)
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=filename,
                Body=content.encode('utf-8'),
                ContentType='application/json'
            )
            print(f"[json_manager] S3に保存しました: {filename}")
        except Exception as e:
            print(f"[json_manager] S3への保存に失敗しました: {filename}, エラー: {e}")
            raise
    else:
        # ローカルファイルシステム
        ensure_data_dir()
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

def load_list_json(filename: str) -> list:
    """JSONファイル（リスト形式）を読み込む（S3またはローカル）"""
    if USE_S3:
        try:
            s3_client = get_s3_client()
            import botocore.exceptions
            response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=filename)
            content = response['Body'].read().decode('utf-8')
            return json.loads(content)
        except botocore.exceptions.ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                # ファイルが存在しない場合は空のリストを返す
                return []
            else:
                print(f"[json_manager] S3からの読み込みに失敗しました: {filename}, エラー: {e}")
                return []
        except Exception as e:
            print(f"[json_manager] S3からの読み込みに失敗しました: {filename}, エラー: {e}")
            return []
    else:
        # ローカルファイルシステム
        ensure_data_dir()
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

def save_list_json(filename: str, data: list):
    """JSONファイル（リスト形式）に保存（S3またはローカル）"""
    if USE_S3:
        try:
            s3_client = get_s3_client()
            content = json.dumps(data, ensure_ascii=False, indent=2)
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=filename,
                Body=content.encode('utf-8'),
                ContentType='application/json'
            )
            print(f"[json_manager] S3に保存しました: {filename}")
        except Exception as e:
            print(f"[json_manager] S3への保存に失敗しました: {filename}, エラー: {e}")
            raise
    else:
        # ローカルファイルシステム
        ensure_data_dir()
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

def list_files(prefix: str = '') -> list:
    """指定されたプレフィックスで始まるファイルのリストを取得（S3またはローカル）"""
    if USE_S3:
        try:
            s3_client = get_s3_client()
            response = s3_client.list_objects_v2(
                Bucket=S3_BUCKET_NAME,
                Prefix=prefix
            )
            if 'Contents' in response:
                return [obj['Key'] for obj in response['Contents']]
            return []
        except Exception as e:
            print(f"[json_manager] S3からのファイルリスト取得に失敗しました: {prefix}, エラー: {e}")
            return []
    else:
        # ローカルファイルシステム
        ensure_data_dir()
        import glob
        pattern = os.path.join(DATA_DIR, prefix + '*')
        files = glob.glob(pattern)
        return [os.path.basename(f) for f in files]
