from flask import Blueprint, request, jsonify, session
from backend.utils.json_manager import load_json, save_json, list_files
from backend.routes.auth import login_required, admin_required
import uuid
from datetime import datetime
import os

bp = Blueprint('reports', __name__, url_prefix='/api/reports')

def get_user_reports_filename(username):
    """ユーザーごとの日報ファイル名を取得"""
    return f'reports_{username}.json'

@bp.route('/', methods=['GET'])
@login_required
def get_reports():
    """日報一覧取得"""
    username = session.get('username')
    reports = load_json(get_user_reports_filename(username))
    
    if 'reports' not in reports:
        reports['reports'] = []
    
    # 日付でソート（新しい順）
    reports['reports'].sort(key=lambda x: x.get('date', ''), reverse=True)
    
    return jsonify(reports)

@bp.route('/add', methods=['POST'])
@login_required
def add_report():
    """日報追加"""
    username = session.get('username')
    data = request.get_json()
    
    reports = load_json(get_user_reports_filename(username))
    
    if 'reports' not in reports:
        reports['reports'] = []
    
    new_report = {
        'id': str(uuid.uuid4()),
        'date': data.get('date'),
        'projects': data.get('projects', []),
        'work_items': data.get('work_items', []),  # 旧形式との互換性のため保持
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    reports['reports'].append(new_report)
    save_json(get_user_reports_filename(username), reports)
    
    return jsonify({'success': True, 'report': new_report})

@bp.route('/update', methods=['PUT'])
@login_required
def update_report():
    """日報更新"""
    username = session.get('username')
    data = request.get_json()
    report_id = data.get('id')
    
    reports = load_json(get_user_reports_filename(username))
    
    for i, report in enumerate(reports.get('reports', [])):
        if report['id'] == report_id:
            reports['reports'][i] = {
                'id': report_id,
                'date': data.get('date', report['date']),
                'projects': data.get('projects', report.get('projects', [])),
                'work_items': data.get('work_items', report.get('work_items', [])),  # 旧形式との互換性のため保持
                'created_at': report.get('created_at'),
                'updated_at': datetime.now().isoformat()
            }
            save_json(get_user_reports_filename(username), reports)
            return jsonify({'success': True, 'report': reports['reports'][i]})
    
    return jsonify({'error': '日報が見つかりません'}), 404

@bp.route('/delete', methods=['DELETE'])
@login_required
def delete_report():
    """日報削除"""
    username = session.get('username')
    data = request.get_json()
    report_id = data.get('id')
    
    reports = load_json(get_user_reports_filename(username))
    
    reports['reports'] = [r for r in reports.get('reports', []) if r['id'] != report_id]
    save_json(get_user_reports_filename(username), reports)
    
    return jsonify({'success': True})

@bp.route('/date/<date>', methods=['GET'])
@login_required
def get_report_by_date(date):
    """特定日付の日報取得"""
    username = session.get('username')
    reports = load_json(get_user_reports_filename(username))
    
    date_reports = [r for r in reports.get('reports', []) if r.get('date') == date]
    
    return jsonify({'reports': date_reports})

@bp.route('/all', methods=['GET'])
@admin_required
def get_all_reports():
    """全ユーザーの日報一覧取得（admin専用）"""
    all_reports = []
    users = load_json('users.json')
    
    # 全ユーザーの日報ファイルを読み込む
    for username in users.keys():
        reports_filename = get_user_reports_filename(username)
        user_reports = load_json(reports_filename)
        if user_reports:  # ファイルが存在する場合（空でない場合）
            for report in user_reports.get('reports', []):
                # ユーザー名を追加
                report_with_username = report.copy()
                report_with_username['username'] = username
                all_reports.append(report_with_username)
    
    # 日付でソート（新しい順）
    all_reports.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    return jsonify({'reports': all_reports})

