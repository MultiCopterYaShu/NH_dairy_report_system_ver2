from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from backend.utils.json_manager import load_json
from functools import wraps

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return jsonify({'error': 'ログインが必要です'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return jsonify({'error': 'ログインが必要です'}), 401
        if session.get('role') != 'admin':
            return jsonify({'error': '管理者権限が必要です'}), 403
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'ユーザー名とパスワードを入力してください'}), 400
    
    users = load_json('users.json')
    
    if username in users and check_password_hash(users[username]['password'], password):
        session['username'] = username
        session['role'] = users[username]['role']
        category = users[username].get('担当種別', [])
        # 後方互換性のため、文字列の場合は配列に変換
        if isinstance(category, str):
            category = [category] if category else []
        session['担当種別'] = category
        return jsonify({
            'success': True,
            'username': username,
            'role': users[username]['role'],
            '担当種別': category
        })
    
    return jsonify({'error': 'ユーザー名またはパスワードが正しくありません'}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@bp.route('/check', methods=['GET'])
def check():
    if 'username' in session:
        category = session.get('担当種別', [])
        # 後方互換性のため、文字列の場合は配列に変換
        if isinstance(category, str):
            category = [category] if category else []
        return jsonify({
            'logged_in': True,
            'username': session['username'],
            'role': session['role'],
            '担当種別': category
        })
    return jsonify({'logged_in': False})

