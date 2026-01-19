from werkzeug.security import generate_password_hash
from backend.utils.json_manager import load_json, save_json, load_list_json, save_list_json
import os

def initialize_data():
    """初期データを作成"""
    data_dir = 'data'
    
    # ユーザーデータの初期化
    users_file = os.path.join(data_dir, 'users.json')
    if not os.path.exists(users_file):
        users = {
            'admin': {
                'username': 'admin',
                'password': generate_password_hash('admin123', method='pbkdf2:sha256'),
                'role': 'admin',
                '担当種別': 'all'
            }
        }
        save_json('users.json', users)
    
    # 作業項目マスターの初期化
    work_items_file = os.path.join(data_dir, 'work_items.json')
    if not os.path.exists(work_items_file):
        work_items = {
            'items': [
                {
                    'id': '1',
                    'name': 'サンプル作業',
                    'level': 1,
                    'parent_id': None,
                    'attribute': None,
                    'target_minutes': None,
                    'checklist': [],
                    'internal_leadtime': False,
                    'external_leadtime': False,
                    'internal_leadtime_items': [],
                    'external_leadtime_items': [],
                    '担当種別': []
                }
            ]
        }
        save_json('work_items.json', work_items)
    
    # 担当種別マスターの初期化
    categories_file = os.path.join(data_dir, 'job_categories.json')
    if not os.path.exists(categories_file):
        categories = {
            'categories': ['全般', '設計', '製造', '検査', '営業']
        }
        save_json('job_categories.json', categories)
    
    # プロジェクトマスターの初期化
    projects_file = os.path.join(data_dir, 'projects.json')
    if not os.path.exists(projects_file):
        projects = {
            'projects': [
                {
                    'id': '1',
                    'name': 'サンプルプロジェクト',
                    'status': '未着手'
                }
            ]
        }
        save_json('projects.json', projects)

