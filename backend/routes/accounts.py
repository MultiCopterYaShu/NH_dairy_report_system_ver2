from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from backend.utils.json_manager import load_json, save_json
from backend.routes.auth import admin_required
import uuid

bp = Blueprint('accounts', __name__, url_prefix='/api/accounts')

@bp.route('/', methods=['GET'])
@admin_required
def get_accounts():
    """全アカウント取得"""
    users = load_json('users.json')
    accounts = []
    for username, user_data in users.items():
        category = user_data.get('担当種別', [])
        # 後方互換性のため、文字列の場合はそのまま返す（フロントエンドで処理）
        accounts.append({
            'username': username,
            'role': user_data['role'],
            '担当種別': category
        })
    return jsonify({'accounts': accounts})

@bp.route('/add', methods=['POST'])
@admin_required
def add_account():
    """アカウント追加"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    category = data.get('担当種別', [])
    
    # 後方互換性のため、文字列が来た場合は配列に変換
    if isinstance(category, str):
        category = [category] if category else []
    
    if not username or not password:
        return jsonify({'error': 'ユーザー名とパスワードは必須です'}), 400
    
    users = load_json('users.json')
    
    if username in users:
        return jsonify({'error': 'このユーザー名は既に使用されています'}), 400
    
    users[username] = {
        'username': username,
        'password': generate_password_hash(password, method='pbkdf2:sha256'),
        'role': role,
        '担当種別': category
    }
    
    save_json('users.json', users)
    return jsonify({'success': True, 'message': 'アカウントを追加しました'})

@bp.route('/update', methods=['PUT'])
@admin_required
def update_account():
    """アカウント更新"""
    data = request.get_json()
    username = data.get('username')
    new_password = data.get('password')
    role = data.get('role')
    category = data.get('担当種別')
    
    if not username:
        return jsonify({'error': 'ユーザー名は必須です'}), 400
    
    users = load_json('users.json')
    
    if username not in users:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404
    
    if new_password:
        users[username]['password'] = generate_password_hash(new_password, method='pbkdf2:sha256')
    
    if role:
        users[username]['role'] = role
    
    if category is not None:
        # 後方互換性のため、文字列が来た場合は配列に変換
        if isinstance(category, str):
            category = [category] if category else []
        users[username]['担当種別'] = category
    
    save_json('users.json', users)
    return jsonify({'success': True, 'message': 'アカウントを更新しました'})

@bp.route('/delete', methods=['DELETE'])
@admin_required
def delete_account():
    """アカウント削除"""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'ユーザー名は必須です'}), 400
    
    if username == 'admin':
        return jsonify({'error': 'adminアカウントは削除できません'}), 400
    
    users = load_json('users.json')
    
    if username not in users:
        return jsonify({'error': 'ユーザーが見つかりません'}), 404
    
    del users[username]
    save_json('users.json', users)
    return jsonify({'success': True, 'message': 'アカウントを削除しました'})

