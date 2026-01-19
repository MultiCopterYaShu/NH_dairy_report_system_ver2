from flask import Blueprint, request, jsonify, session, send_file
from backend.utils.json_manager import load_json, save_json
from backend.utils.excel_manager import export_work_items_to_excel, import_work_items_from_excel, export_project_to_excel, export_project_to_excel_detail, export_project_view_to_excel
from backend.routes.auth import admin_required, login_required
import uuid
import os
import tempfile
import glob

bp = Blueprint('masters', __name__, url_prefix='/api/masters')

# 作業項目マスター
@bp.route('/work-items', methods=['GET'])
@login_required
def get_work_items():
    """作業項目マスター取得"""
    work_type_id = request.args.get('work_type_id', None)
    
    # 工程IDが指定されている場合、工程別ファイルを読み込む
    if work_type_id:
        filename = f'work_items_{work_type_id}.json'
        work_items = load_json(filename)
        all_items = work_items.get('items', [])
    else:
        # 工程IDが指定されていない場合は全ての工程の作業項目を読み込む
        all_items = []
        data_dir = 'data'
        work_item_files = glob.glob(os.path.join(data_dir, 'work_items_*.json'))
        for file_path in work_item_files:
            filename = os.path.basename(file_path)
            # ファイル名から工程IDを抽出 (work_items_{work_type_id}.json)
            if filename.startswith('work_items_') and filename.endswith('.json'):
                work_type_id_from_file = filename[11:-5]  # 'work_items_'を削除し、'.json'を削除
            else:
                work_type_id_from_file = None
            
            work_items = load_json(filename)
            items = work_items.get('items', [])
            
            # 各アイテムにwork_type_idを設定（まだ設定されていない場合のみ）
            for item in items:
                if 'work_type_id' not in item or item['work_type_id'] is None:
                    item['work_type_id'] = work_type_id_from_file
            
            all_items.extend(items)
    
    user_category = session.get('担当種別', [])
    # 後方互換性のため、文字列の場合は配列に変換
    if isinstance(user_category, str):
        user_category = [user_category] if user_category else []
    
    # 管理者または全体担当の場合は全て表示
    if session.get('role') == 'admin' or 'all' in user_category:
        return jsonify({'items': all_items})
    
    # 一般ユーザーは階層的に担当種別でフィルター
    # 最下層項目（子項目がない項目）かどうかを判定する関数
    def is_leaf_item(item, items):
        item_id = item.get('id')
        has_children = any(i.get('parent_id') == item_id for i in items)
        return not has_children
    
    # 最下層項目かどうかの判定を事前に計算
    leaf_flags = {item.get('id'): is_leaf_item(item, all_items) for item in all_items}
    
    # 項目の配下の最下層項目にユーザーの担当種別が含まれるかチェック
    def has_accessible_leaf_descendants(item_id, items, leaf_flags, user_cats):
        """項目の配下にユーザーがアクセス可能な最下層項目があるか確認"""
        # 自分が最下層の場合
        if leaf_flags.get(item_id, False):
            item = next((i for i in items if i.get('id') == item_id), None)
            if item:
                item_categories = item.get('担当種別', [])
                # 担当種別が設定されていない場合、またはユーザーの担当種別のいずれかが含まれる場合
                if not item_categories or any(user_cat in item_categories for user_cat in user_cats):
                    return True
        
        # 子項目を確認
        children = [i for i in items if i.get('parent_id') == item_id]
        for child in children:
            if has_accessible_leaf_descendants(child.get('id'), items, leaf_flags, user_cats):
                return True
        
        return False
    
    # フィルタリング：配下にアクセス可能な最下層項目がある項目のみを表示
    filtered_items = []
    for item in all_items:
        item_id = item.get('id')
        # 自分が最下層で、かつアクセス可能な場合
        if leaf_flags.get(item_id, False):
            item_categories = item.get('担当種別', [])
            if not item_categories or any(user_cat in item_categories for user_cat in user_category):
                filtered_items.append(item)
        # 自分が親項目の場合、配下にアクセス可能な最下層項目がある場合のみ表示
        else:
            if has_accessible_leaf_descendants(item_id, all_items, leaf_flags, user_category):
                filtered_items.append(item)
    
    return jsonify({'items': filtered_items})

@bp.route('/work-items', methods=['POST'])
@admin_required
def save_work_items():
    """作業項目マスター保存（現在は使用されていない可能性があります）"""
    data = request.get_json()
    work_type_id = data.get('work_type_id')
    
    if not work_type_id:
        return jsonify({'error': '工種IDが必要です'}), 400
    
    filename = f'work_items_{work_type_id}.json'
    save_json(filename, data)
    return jsonify({'success': True, 'message': '作業項目マスターを保存しました'})

@bp.route('/work-items/add', methods=['POST'])
@admin_required
def add_work_item():
    """作業項目追加"""
    data = request.get_json()
    work_type_id = data.get('work_type_id')
    
    if not work_type_id:
        return jsonify({'error': '工種IDが必要です'}), 400
    
    filename = f'work_items_{work_type_id}.json'
    work_items = load_json(filename)
    
    new_item = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', ''),
        'level': data.get('level', 1),
        'parent_id': data.get('parent_id'),
        'work_type_id': work_type_id,
        'attribute': data.get('attribute'),
        'target_minutes': data.get('target_minutes'),
        'checklist': data.get('checklist', []),
        'method': data.get('method', []),
        'internal_leadtime': data.get('internal_leadtime', False),
        'external_leadtime': data.get('external_leadtime', False),
        'internal_leadtime_items': data.get('internal_leadtime_items', []),
        'external_leadtime_items': data.get('external_leadtime_items', []),
        '担当種別': data.get('担当種別', []),
        'is_leaf': data.get('is_leaf', False)
    }
    
    if 'items' not in work_items:
        work_items['items'] = []
    
    work_items['items'].append(new_item)
    save_json(filename, work_items)
    
    return jsonify({'success': True, 'item': new_item})

@bp.route('/work-items/update', methods=['PUT'])
@admin_required
def update_work_item():
    """作業項目更新"""
    data = request.get_json()
    item_id = data.get('id')
    work_type_id = data.get('work_type_id')
    
    if not work_type_id:
        return jsonify({'error': '工種IDが必要です'}), 400
    
    filename = f'work_items_{work_type_id}.json'
    work_items = load_json(filename)
    
    for i, item in enumerate(work_items.get('items', [])):
        if item['id'] == item_id:
            work_items['items'][i] = {
                'id': item_id,
                'name': data.get('name', item['name']),
                'level': data.get('level', item['level']),
                'parent_id': data.get('parent_id', item.get('parent_id')),
                'work_type_id': work_type_id,
                'attribute': data.get('attribute', item.get('attribute')),
                'target_minutes': data.get('target_minutes', item.get('target_minutes')),
                'checklist': data.get('checklist', item.get('checklist', [])),
                'method': data.get('method', item.get('method', [])),
                'internal_leadtime': data.get('internal_leadtime', item.get('internal_leadtime', False)),
                'external_leadtime': data.get('external_leadtime', item.get('external_leadtime', False)),
                'internal_leadtime_items': data.get('internal_leadtime_items', item.get('internal_leadtime_items', [])),
                'external_leadtime_items': data.get('external_leadtime_items', item.get('external_leadtime_items', [])),
                '担当種別': data.get('担当種別', item.get('担当種別', [])),
                'is_leaf': data.get('is_leaf', item.get('is_leaf', False))
            }
            save_json(filename, work_items)
            return jsonify({'success': True, 'item': work_items['items'][i]})
    
    return jsonify({'error': '作業項目が見つかりません'}), 404

@bp.route('/work-items/delete', methods=['DELETE'])
@admin_required
def delete_work_item():
    """作業項目削除"""
    data = request.get_json()
    item_ids = data.get('ids', [])
    if not isinstance(item_ids, list):
        item_ids = [data.get('id')] if data.get('id') else []
    
    work_type_id = data.get('work_type_id')
    
    if not work_type_id:
        return jsonify({'error': '工種IDが必要です'}), 400
    
    filename = f'work_items_{work_type_id}.json'
    work_items = load_json(filename)
    
    # 削除対象のIDセットを作成
    ids_to_delete = set(item_ids)
    
    # 再帰的に子項目も削除
    def get_all_descendant_ids(item_id, items):
        """項目IDとその全ての子孫IDを取得"""
        descendant_ids = {item_id}
        for item in items:
            if item.get('parent_id') == item_id:
                descendant_ids.add(item['id'])
                descendant_ids.update(get_all_descendant_ids(item['id'], items))
        return descendant_ids
    
    # 全ての削除対象IDを取得（子孫を含む）
    all_ids_to_delete = set()
    for item_id in ids_to_delete:
        all_ids_to_delete.update(get_all_descendant_ids(item_id, work_items.get('items', [])))
    
    # 削除対象以外の項目を残す
    work_items['items'] = [item for item in work_items.get('items', []) if item['id'] not in all_ids_to_delete]
    save_json(filename, work_items)
    
    return jsonify({'success': True})

@bp.route('/work-items/export', methods=['GET'])
@admin_required
def export_work_items():
    """作業項目をExcelにエクスポート"""
    work_type_id = request.args.get('work_type_id')
    
    if not work_type_id:
        return jsonify({'error': '工種IDが必要です'}), 400
    
    filename = f'work_items_{work_type_id}.json'
    work_items = load_json(filename)
    items = work_items.get('items', [])
    
    # Excelを生成（作業項目がない場合は空の雛形を生成）
    wb = export_work_items_to_excel(items)
    
    # 一時ファイルに保存
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    temp_file_path = temp_file.name
    wb.save(temp_file_path)
    temp_file.close()
    
    # send_fileの後、レスポンスが送信された後に削除されるよう設定
    return send_file(
        temp_file_path,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='作業項目マスター.xlsx',
        # 削除はFlaskが自動的に処理（send_fileは削除しないが、一時ファイルはシステムが後で削除）
    )

@bp.route('/work-items/preview', methods=['POST'])
@admin_required
def preview_work_items():
    """Excelから作業項目をプレビュー（工程ID不要）"""
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルがアップロードされていません'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    if not file.filename.endswith('.xlsx'):
        return jsonify({'error': 'Excelファイル(.xlsx)をアップロードしてください'}), 400
    
    temp_file_path = None
    try:
        # 一時ファイルに保存
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
        temp_file_path = temp_file.name
        file.save(temp_file_path)
        temp_file.close()
        
        # Excelから作業項目を読み込み（プレビューのみ、工程ID不要）
        imported_items = import_work_items_from_excel(temp_file_path)
        
        # プレビュー用にデータを整形（階層パスを含める）
        def get_hierarchy_path(item, all_items):
            """項目の階層パスを取得"""
            path = []
            current_item = item
            while current_item:
                path.insert(0, current_item.get('name', ''))
                parent_id = current_item.get('parent_id')
                if parent_id:
                    current_item = next((i for i in all_items if i.get('id') == parent_id), None)
                else:
                    break
            return path
        
        preview_data = []
        for item in imported_items:
            hierarchy_path = get_hierarchy_path(item, imported_items)
            preview_data.append({
                'uuid': item.get('id', ''),
                'level1': hierarchy_path[0] if len(hierarchy_path) > 0 else '',
                'level2': hierarchy_path[1] if len(hierarchy_path) > 1 else '',
                'level3': hierarchy_path[2] if len(hierarchy_path) > 2 else '',
                'level4': hierarchy_path[3] if len(hierarchy_path) > 3 else '',
                'checklist': '\n'.join(item.get('checklist', [])) if item.get('checklist') else '',
                'method': '\n'.join(item.get('method', [])) if item.get('method') else '',
                'attribute': item.get('attribute', '') or '',
                'target_minutes': item.get('target_minutes', '') or '',
                'internal_leadtime': item.get('internal_leadtime', False),
                'external_leadtime': item.get('external_leadtime', False),
                'internal_leadtime_items': ','.join(item.get('internal_leadtime_items', [])) if item.get('internal_leadtime_items') else '',
                'external_leadtime_items': ','.join(item.get('external_leadtime_items', [])) if item.get('external_leadtime_items') else '',
                '担当種別': ','.join(item.get('担当種別', [])) if item.get('担当種別') else ''
            })
        
        # 一時ファイルを削除
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        return jsonify({
            'success': True,
            'items': preview_data,
            'count': len(preview_data)
        })
    except Exception as e:
        # エラー時は一時ファイルを削除
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        return jsonify({'error': f'プレビューの読み込みに失敗しました: {str(e)}'}), 500

@bp.route('/work-items/import', methods=['POST'])
@admin_required
def import_work_items():
    """Excelから作業項目をインポート"""
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルがアップロードされていません'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    if not file.filename.endswith('.xlsx'):
        return jsonify({'error': 'Excelファイル(.xlsx)をアップロードしてください'}), 400
    
    temp_file_path = None
    try:
        # 一時ファイルに保存
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
        temp_file_path = temp_file.name
        file.save(temp_file_path)
        temp_file.close()
        
        # Excelから作業項目を読み込み
        work_type_id = request.form.get('work_type_id')
        
        if not work_type_id:
            os.unlink(temp_file_path)
            return jsonify({'error': '工程IDが必要です'}), 400
        
        imported_items = import_work_items_from_excel(temp_file_path)
        
        # 既存の作業項目を読み込み
        filename = f'work_items_{work_type_id}.json'
        work_items = load_json(filename)
        existing_items = work_items.get('items', [])
        
        # UUIDで既存項目をマップ
        existing_items_map = {item['id']: item for item in existing_items}
        
        # 階層パスを取得する関数
        def get_hierarchy_path(item, all_items):
            """項目の階層パス（レベル1から順に）を取得"""
            path = []
            current_item = item
            while current_item:
                path.insert(0, current_item.get('name', ''))
                parent_id = current_item.get('parent_id')
                if parent_id:
                    current_item = next((i for i in all_items if i.get('id') == parent_id), None)
                else:
                    break
            return tuple(path)
        
        # インポートされた項目の階層パスセットを作成
        imported_hierarchy_paths = set()
        for item in imported_items:
            hierarchy_path = get_hierarchy_path(item, imported_items)
            imported_hierarchy_paths.add(hierarchy_path)
        
        # インポートされた項目のUUIDセットを作成（最下層項目と親項目の両方を含む）
        imported_uuids = {item['id'] for item in imported_items}
        
        # 既存項目の階層パスマップを作成
        existing_hierarchy_paths = {}
        for item in existing_items:
            hierarchy_path = get_hierarchy_path(item, existing_items)
            existing_hierarchy_paths[item['id']] = hierarchy_path
        
        # インポートした項目で更新/追加
        updated_count = 0
        added_count = 0
        
        # 既存項目をマップに保持（インポート順序を保持するため）
        updated_items_map = {}
        
        for imported_item in imported_items:
            item_id = imported_item['id']
            if item_id in existing_items_map:
                # 既存項目を更新（既存のデータを保持しつつ更新）
                existing_item = existing_items_map[item_id].copy()
                existing_item.update(imported_item)
                updated_items_map[item_id] = existing_item
                updated_count += 1
            else:
                # 新規項目を追加
                updated_items_map[item_id] = imported_item
                added_count += 1
        
        # Excelに含まれていない既存項目を削除（ただし、階層パスが同じ既存項目は削除しない）
        items_to_keep_from_existing = []
        deleted_count = 0
        for item in existing_items:
            item_id = item['id']
            hierarchy_path = existing_hierarchy_paths[item_id]
            if item_id in imported_uuids:
                # インポートされたUUIDに含まれている場合は保持
                items_to_keep_from_existing.append(item)
            elif hierarchy_path in imported_hierarchy_paths:
                # 階層パスが同じ既存項目は削除しない（名称が同じ場合は保持）
                items_to_keep_from_existing.append(item)
            else:
                deleted_count += 1
        
        # インポートされた項目の順序を保持（親項目も含む）
        items_to_keep = []
        seen_ids = set()
        for imported_item in imported_items:
            item_id = imported_item['id']
            if item_id not in seen_ids:
                items_to_keep.append(updated_items_map[item_id])
                seen_ids.add(item_id)
        
        # 階層パスが同じ既存項目を追加（インポートされていないが、名称が同じ項目）
        existing_ids_in_keep = {item['id'] for item in items_to_keep}
        for item in items_to_keep_from_existing:
            if item['id'] not in existing_ids_in_keep:
                items_to_keep.append(item)
        
        # フィルタリング後のリストを保存
        work_items['items'] = items_to_keep
        
        # 保存（filenameは既に設定されている）
        save_json(filename, work_items)
        
        # 一時ファイルを削除
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        message = f'{len(imported_items)}件の作業項目をインポートしました（新規: {added_count}件、更新: {updated_count}件、削除: {deleted_count}件）'
        
        return jsonify({
            'success': True,
            'message': message,
            'count': len(imported_items),
            'added': added_count,
            'updated': updated_count,
            'deleted': deleted_count
        })
    except Exception as e:
        # 一時ファイルを削除
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        return jsonify({'error': f'インポートに失敗しました: {str(e)}'}), 500

# 担当種別マスター
@bp.route('/job-categories', methods=['GET'])
@login_required
def get_job_categories():
    """担当種別マスター取得"""
    categories = load_json('job_categories.json')
    return jsonify(categories)

@bp.route('/job-categories', methods=['POST'])
@admin_required
def save_job_categories():
    """担当種別マスター保存"""
    data = request.get_json()
    save_json('job_categories.json', data)
    return jsonify({'success': True, 'message': '担当種別マスターを保存しました'})

# プロジェクトマスター
@bp.route('/projects', methods=['GET'])
@login_required
def get_projects():
    """プロジェクトマスター取得"""
    projects = load_json('projects.json')
    return jsonify(projects)

@bp.route('/projects/add', methods=['POST'])
@admin_required
def add_project():
    """プロジェクト追加"""
    data = request.get_json()
    projects = load_json('projects.json')
    
    new_project = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', ''),
        'status': data.get('status', '未着手'),
        'work_type_ids': data.get('work_type_ids', [])  # 複数工程に対応
    }
    
    if 'projects' not in projects:
        projects['projects'] = []
    
    projects['projects'].append(new_project)
    save_json('projects.json', projects)
    
    return jsonify({'success': True, 'project': new_project})

@bp.route('/projects/update', methods=['PUT'])
@admin_required
def update_project():
    """プロジェクト更新"""
    from datetime import datetime
    
    data = request.get_json()
    project_id = data.get('id')
    
    projects = load_json('projects.json')
    
    for i, project in enumerate(projects.get('projects', [])):
        if project['id'] == project_id:
            new_status = data.get('status', project.get('status'))
            old_status = project.get('status')
            
            # ステータスが「完了」に変更された場合、完了日を記録
            completed_date = project.get('completed_date')
            if new_status == '完了' and old_status != '完了':
                completed_date = datetime.now().strftime('%Y-%m-%d')
            elif new_status != '完了':
                # ステータスが「完了」以外に変更された場合、完了日をクリア
                completed_date = None
            
            # 後方互換性: work_type_idがある場合はwork_type_idsに変換
            work_type_ids = data.get('work_type_ids')
            if work_type_ids is None:
                # work_type_idsが指定されていない場合、既存のwork_type_idを確認
                existing_work_type_id = project.get('work_type_id')
                if existing_work_type_id:
                    work_type_ids = [existing_work_type_id]
                else:
                    work_type_ids = project.get('work_type_ids', [])
            
            projects['projects'][i] = {
                'id': project_id,
                'name': data.get('name', project['name']),
                'status': new_status,
                'work_type_ids': work_type_ids,
                'completed_date': completed_date if completed_date else project.get('completed_date')
            }
            save_json('projects.json', projects)
            return jsonify({'success': True, 'project': projects['projects'][i]})
    
    return jsonify({'error': 'プロジェクトが見つかりません'}), 404

# 工程マスター
@bp.route('/work-types', methods=['GET'])
@login_required
def get_work_types():
    """工程マスター取得"""
    work_types = load_json('work_types.json')
    return jsonify(work_types)

@bp.route('/work-types/add', methods=['POST'])
@admin_required
def add_work_type():
    """工程追加"""
    data = request.get_json()
    work_types = load_json('work_types.json')
    
    new_work_type = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', '')
    }
    
    if 'work_types' not in work_types:
        work_types['work_types'] = []
    
    work_types['work_types'].append(new_work_type)
    save_json('work_types.json', work_types)
    
    return jsonify({'success': True, 'work_type': new_work_type})

@bp.route('/work-types/update', methods=['PUT'])
@admin_required
def update_work_type():
    """工程更新"""
    data = request.get_json()
    work_type_id = data.get('id')
    
    work_types = load_json('work_types.json')
    
    for i, work_type in enumerate(work_types.get('work_types', [])):
        if work_type['id'] == work_type_id:
            work_types['work_types'][i] = {
                'id': work_type_id,
                'name': data.get('name', work_type['name'])
            }
            save_json('work_types.json', work_types)
            return jsonify({'success': True, 'work_type': work_types['work_types'][i]})
    
    return jsonify({'error': '工程が見つかりません'}), 404

@bp.route('/work-types/delete', methods=['DELETE'])
@admin_required
def delete_work_type():
    """工程削除"""
    data = request.get_json()
    work_type_id = data.get('id')
    
    work_types = load_json('work_types.json')
    
    work_types['work_types'] = [wt for wt in work_types.get('work_types', []) if wt['id'] != work_type_id]
    save_json('work_types.json', work_types)
    
    return jsonify({'success': True, 'message': '工程を削除しました'})

@bp.route('/work-types/update-order', methods=['PUT'])
@admin_required
def update_work_types_order():
    """工程の並び順を更新"""
    data = request.get_json()
    ordered_work_types = data.get('work_types', [])
    
    work_types = {
        'work_types': ordered_work_types
    }
    
    save_json('work_types.json', work_types)
    
    return jsonify({'success': True, 'message': '並び順を更新しました'})

@bp.route('/projects/delete', methods=['DELETE'])
@admin_required
def delete_project():
    """プロジェクト削除"""
    data = request.get_json()
    project_id = data.get('id')
    
    projects = load_json('projects.json')
    
    projects['projects'] = [p for p in projects.get('projects', []) if p['id'] != project_id]
    save_json('projects.json', projects)
    
    return jsonify({'success': True})

@bp.route('/projects/export', methods=['GET'])
@admin_required
def export_project():
    """プロジェクトをExcelにエクスポート"""
    project_id = request.args.get('project_id')
    format_type = request.args.get('format', 'user')  # 'user' または 'detail'
    
    if not project_id:
        return jsonify({'error': 'プロジェクトIDが必要です'}), 400
    
    # プロジェクトを取得
    projects = load_json('projects.json')
    project = next((p for p in projects.get('projects', []) if p['id'] == project_id), None)
    
    if not project:
        return jsonify({'error': 'プロジェクトが見つかりません'}), 404
    
    # 工程マスターを取得
    work_types_data = load_json('work_types.json')
    work_types = work_types_data.get('work_types', [])
    
    # 各工程の作業項目を取得
    work_items_by_type = {}
    work_type_ids = project.get('work_type_ids', [])
    
    for work_type_id in work_type_ids:
        filename = f'work_items_{work_type_id}.json'
        work_items_data = load_json(filename)
        work_items_by_type[work_type_id] = work_items_data.get('items', [])
    
    # 全ユーザーの日報を取得
    all_reports = []
    data_dir = 'data'
    users_data = load_json('users.json')
    
    for username in users_data.keys():
        reports_file = os.path.join(data_dir, f'reports_{username}.json')
        if os.path.exists(reports_file):
            user_reports_data = load_json(f'reports_{username}.json')
            for report in user_reports_data.get('reports', []):
                report_with_username = report.copy()
                report_with_username['username'] = username
                all_reports.append(report_with_username)
    
    # Excelを生成（フォーマットに応じて）
    if format_type == 'detail':
        wb = export_project_to_excel_detail(project, work_types, work_items_by_type, all_reports)
    else:
        wb = export_project_to_excel(project, work_types, work_items_by_type, all_reports)
    
    # 一時ファイルに保存
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    temp_file_path = temp_file.name
    wb.save(temp_file_path)
    temp_file.close()
    
    # プロジェクト名をファイル名に使用（プロジェクト名＋年月日）
    from datetime import datetime
    project_name = project.get('name', 'プロジェクト')
    safe_project_name = "".join(c for c in project_name if c.isalnum() or c in (' ', '-', '_')).strip()
    if not safe_project_name:
        safe_project_name = 'プロジェクト'
    
    # 年月日を取得（YYYYMMDD形式）
    today = datetime.now()
    date_str = today.strftime('%Y%m%d')
    
    # send_fileで返す
    return send_file(
        temp_file_path,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'{safe_project_name}_{date_str}.xlsx'
    )

@bp.route('/reports/export-project-view', methods=['GET'])
@admin_required
def export_project_view():
    """プロジェクト別表示をExcelにエクスポート"""
    # 工程マスターを取得
    work_types_data = load_json('work_types.json')
    work_types = work_types_data.get('work_types', [])
    
    # プロジェクトマスターを取得
    projects_data = load_json('projects.json')
    projects = projects_data.get('projects', [])
    
    # 各工程の作業項目を取得
    work_items_by_type = {}
    for work_type in work_types:
        work_type_id = work_type['id']
        filename = f'work_items_{work_type_id}.json'
        try:
            work_items_data = load_json(filename)
            work_items_by_type[work_type_id] = work_items_data.get('items', [])
        except:
            work_items_by_type[work_type_id] = []
    
    # 全ユーザーの日報を取得
    all_reports = []
    data_dir = 'data'
    users_data = load_json('users.json')
    
    for username in users_data.keys():
        reports_file = os.path.join(data_dir, f'reports_{username}.json')
        if os.path.exists(reports_file):
            user_reports_data = load_json(f'reports_{username}.json')
            for report in user_reports_data.get('reports', []):
                report_with_username = report.copy()
                report_with_username['username'] = username
                all_reports.append(report_with_username)
    
    # Excelを生成
    wb = export_project_view_to_excel(work_types, projects, work_items_by_type, all_reports)
    
    # 一時ファイルに保存
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    temp_file_path = temp_file.name
    wb.save(temp_file_path)
    temp_file.close()
    
    # ファイル名を生成（プロジェクト別表示_YYYYMMDD.xlsx）
    from datetime import datetime
    today = datetime.now()
    date_str = today.strftime('%Y%m%d')
    
    # send_fileで返す
    return send_file(
        temp_file_path,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'プロジェクト別表示_{date_str}.xlsx'
    )

