// 管理画面機能

let adminWorkItems = [];
let adminJobCategories = [];
let adminProjects = [];
let adminAccounts = [];
let adminWorkTypes = [];

// タブ切り替え
document.querySelectorAll('.tab-btn').forEach(btn => {
    if (!btn.classList.contains('back-btn')) {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            
            // タブボタンのアクティブ状態を切り替え
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // タブコンテンツの表示切り替え
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const tabContent = document.getElementById(`tab-${tabName}`);
            if (tabContent) {
                tabContent.classList.add('active');
                
                // プロジェクトタブが選択された場合、プロジェクト一覧を再表示
                if (tabName === 'work-types') {
                    if (adminWorkTypes.length === 0) {
                        loadAdminWorkTypes();
                    } else {
                        displayAdminWorkTypes();
                    }
                } else if (tabName === 'projects') {
                    // データが読み込まれていない場合は読み込み、既に読み込まれている場合は表示のみ
                    if (adminProjects.length === 0) {
                        loadAdminProjects();
                    } else {
                        displayAdminProjects();
                    }
                }
            }
        });
    }
});

// 管理データ読み込み
async function loadAdminData() {
    await Promise.all([
        loadAccounts(),
        loadAdminWorkTypes(),
        loadAdminWorkItems(),
        loadAdminJobCategories(),
        loadAdminProjects()
    ]);
}

// アカウント管理
async function loadAccounts() {
    try {
        const result = await AccountAPI.getAll();
        adminAccounts = result.accounts || [];
        displayAccounts();
    } catch (error) {
        console.error('アカウントの読み込みに失敗しました:', error);
    }
}

function displayAccounts() {
    const accountsList = document.getElementById('accounts-list');
    
    if (adminAccounts.length === 0) {
        accountsList.innerHTML = '<p>アカウントがありません</p>';
        return;
    }
    
    accountsList.innerHTML = '';
    
    adminAccounts.forEach(account => {
        const accountDiv = document.createElement('div');
        accountDiv.className = 'list-item';
        
        // 担当種別の表示（配列または文字列に対応）
        let categoryDisplay = '未設定';
        if (account.担当種別) {
            if (Array.isArray(account.担当種別)) {
                categoryDisplay = account.担当種別.length > 0 ? account.担当種別.join(', ') : '未設定';
            } else {
                categoryDisplay = account.担当種別;
            }
        }
        
        accountDiv.innerHTML = `
            <div class="list-item-info">
                <strong>${account.username}</strong>
                <div>権限: ${account.role === 'admin' ? '管理者' : '一般'}</div>
                <div>担当種別: ${categoryDisplay}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-warning" onclick="editAccount('${account.username}')">編集</button>
                ${account.username !== 'admin' ? `<button class="btn btn-danger" onclick="deleteAccount('${account.username}')">削除</button>` : ''}
            </div>
        `;
        
        accountsList.appendChild(accountDiv);
    });
}

// アカウント追加
document.getElementById('add-account-btn').addEventListener('click', () => {
    showAccountModal();
});

function showAccountModal(account = null) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    const isEdit = account !== null;
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'アカウント編集' : 'アカウント追加'}</h2>
        <form id="account-form">
            <div class="form-group">
                <label>ユーザー名</label>
                <input type="text" id="account-username" value="${account?.username || ''}" ${isEdit ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
                <label>パスワード${isEdit ? '（変更する場合のみ入力）' : ''}</label>
                <input type="password" id="account-password" ${!isEdit ? 'required' : ''}>
            </div>
            <div class="form-group">
                <label>権限</label>
                <select id="account-role">
                    <option value="user" ${account?.role === 'user' ? 'selected' : ''}>一般</option>
                    <option value="admin" ${account?.role === 'admin' ? 'selected' : ''}>管理者</option>
                </select>
            </div>
            <div class="form-group">
                <label>担当種別（複数選択可）</label>
                <div class="account-category-checkbox-group">
                    <label class="account-category-checkbox-item">
                        <input type="checkbox" value="all" id="account-category-all" ${(Array.isArray(account?.担当種別) && account.担当種別.includes('all')) || (!Array.isArray(account?.担当種別) && account?.担当種別 === 'all') ? 'checked' : ''}>
                        <span>全般</span>
                    </label>
                    ${adminJobCategories.map(cat => {
                        const isChecked = Array.isArray(account?.担当種別) ? account.担当種別.includes(cat) : account?.担当種別 === cat;
                        return `<label class="account-category-checkbox-item">
                            <input type="checkbox" value="${cat}" class="account-category-checkbox" ${isChecked ? 'checked' : ''}>
                            <span>${cat}</span>
                        </label>`;
                    }).join('')}
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">保存</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
    
    document.getElementById('account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 担当種別を複数選択から取得
        const categoryAll = document.getElementById('account-category-all');
        let categories = [];
        if (categoryAll && categoryAll.checked) {
            categories = ['all'];
        } else {
            const categoryCheckboxes = document.querySelectorAll('.account-category-checkbox:checked');
            categories = Array.from(categoryCheckboxes).map(cb => cb.value);
        }
        
        const data = {
            username: document.getElementById('account-username').value,
            password: document.getElementById('account-password').value,
            role: document.getElementById('account-role').value,
            担当種別: categories
        };
        
        try {
            if (isEdit) {
                if (!data.password) {
                    delete data.password;
                }
                await AccountAPI.update(data);
            } else {
                await AccountAPI.add(data);
            }
            
            closeModal();
            await loadAccounts();
            alert('アカウントを保存しました');
        } catch (error) {
            alert('エラー: ' + error.message);
        }
    });
}

function editAccount(username) {
    const account = adminAccounts.find(a => a.username === username);
    if (account) {
        showAccountModal(account);
    }
}

async function deleteAccount(username) {
    if (!confirm(`アカウント「${username}」を削除してもよろしいですか？`)) {
        return;
    }
    
    try {
        await AccountAPI.delete(username);
        await loadAccounts();
        alert('アカウントを削除しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 作業項目マスター
let selectedWorkTypeId = null;

async function loadAdminWorkItems() {
    try {
        // 工種データも同時に読み込む
        if (adminWorkTypes.length === 0) {
            const workTypesResult = await MasterAPI.getWorkTypes();
            adminWorkTypes = workTypesResult.work_types || [];
        }
        
        // 工程選択ドロップダウンを設定
        const workTypeSelect = document.getElementById('work-items-work-type-select');
        if (workTypeSelect) {
            workTypeSelect.innerHTML = '<option value="">工程を選択してください</option>';
            adminWorkTypes.forEach(wt => {
                const option = document.createElement('option');
                option.value = wt.id;
                option.textContent = wt.name;
                workTypeSelect.appendChild(option);
            });
            
            // デフォルトで最初の工程を選択
            if (adminWorkTypes.length > 0 && !selectedWorkTypeId) {
                selectedWorkTypeId = adminWorkTypes[0].id;
                workTypeSelect.value = selectedWorkTypeId;
            } else if (selectedWorkTypeId) {
                workTypeSelect.value = selectedWorkTypeId;
            }
            
            // 工程選択のイベントリスナー
            workTypeSelect.addEventListener('change', (e) => {
                selectedWorkTypeId = e.target.value;
                if (selectedWorkTypeId) {
                    loadWorkItemsByWorkType(selectedWorkTypeId);
                } else {
                    adminWorkItems = [];
                    displayAdminWorkItems();
                }
            });
        }
        
        // 工程が選択されていない場合は何も表示しない
        if (!selectedWorkTypeId) {
            const workItemsList = document.getElementById('master-work-items-list');
            workItemsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">工程を選択してください。</div></div>';
            return;
        }
        
        await loadWorkItemsByWorkType(selectedWorkTypeId);
    } catch (error) {
        console.error('作業項目の読み込みに失敗しました:', error);
    }
}

async function loadWorkItemsByWorkType(workTypeId) {
    try {
        const result = await MasterAPI.getWorkItems(`?work_type_id=${workTypeId}`);
        const items = result.items || [];
        
        // 階層的な順序でソート（深さ優先探索の順序）
        const sortWorkItemsHierarchically = (items) => {
            const sorted = [];
            const processed = new Set();
            
            // 階層パスを作成する関数
            const getHierarchyPath = (item) => {
                const path = [];
                let currentItem = item;
                while (currentItem) {
                    path.unshift(currentItem.id);
                    const parentId = currentItem.parent_id;
                    if (parentId) {
                        currentItem = items.find(i => i.id === parentId);
                    } else {
                        break;
                    }
                }
                return path;
            };
            
            // 全ての項目の階層パスを計算
            const itemsWithPath = items.map(item => ({
                item,
                path: getHierarchyPath(item)
            }));
            
            // 階層パスでソート
            itemsWithPath.sort((a, b) => {
                const minLength = Math.min(a.path.length, b.path.length);
                for (let i = 0; i < minLength; i++) {
                    if (a.path[i] !== b.path[i]) {
                        // 同じ階層レベルでの順序を取得（元のitems配列での順序を使用）
                        const aIndex = items.findIndex(wi => wi.id === a.path[i]);
                        const bIndex = items.findIndex(wi => wi.id === b.path[i]);
                        if (aIndex !== bIndex) {
                            return aIndex - bIndex;
                        }
                    }
                }
                return a.path.length - b.path.length;
            });
            
            return itemsWithPath.map(iwp => iwp.item);
        };
        
        adminWorkItems = sortWorkItemsHierarchically(items);
        displayAdminWorkItems();
    } catch (error) {
        console.error('作業項目の読み込みに失敗しました:', error);
    }
}

function displayAdminWorkItems() {
    const workItemsList = document.getElementById('master-work-items-list');
    
    workItemsList.innerHTML = '';
    
    // 階層構造で表示
    const rootItems = adminWorkItems.filter(item => !item.parent_id);
    
    if (rootItems.length === 0) {
        // ルート項目がない場合は空のリストを表示
        workItemsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">作業項目がありません。右側の「+」ボタンで追加してください。</div></div>';
    }
    
    rootItems.forEach(item => {
        displayWorkItemTree(item, workItemsList, 0);
    });
}

function displayWorkItemTree(item, container, level) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'work-item-editable';
    itemDiv.dataset.itemId = item.id;
    itemDiv.style.marginLeft = `${level * 15}px`;
    
    // 子要素を取得
    const children = adminWorkItems.filter(i => i.parent_id === item.id);
    const isLeaf = children.length === 0;
    const canAddChild = level < 3; // 最大4階層（レベル0-3）
    // 最下層フラグ（既存データがあればそれを使用、なければ子要素がない場合にtrue）
    const isLeafChecked = item.is_leaf !== undefined ? item.is_leaf : isLeaf;
    
    // 親項目の選択肢を作成
    const parentOptions = adminWorkItems
        .filter(i => i.level < 4 && i.id !== item.id)
        .map(i => {
            const indent = '　'.repeat(i.level);
            return `<option value="${i.id}" ${item.parent_id === i.id ? 'selected' : ''}>${indent}${i.name}</option>`;
        }).join('');
    
    // 担当種別のチェックボックス
    const categoryCheckboxes = adminJobCategories.map((cat, index) => `
        <div class="checklist-item">
            <input type="checkbox" class="work-item-category-checkbox" id="cat-${item.id}-${index}" value="${cat}" 
                ${item.担当種別?.includes(cat) ? 'checked' : ''}>
            <label for="cat-${item.id}-${index}">${cat}</label>
        </div>
    `).join('');
    
    // 前工程の最下層項目を取得
    // 対象：同じ階層の一つ以上前の項目、または別の階層の前に登録されている項目（その下位階層も含む）
    const getPreviousProcessItems = (currentItem) => {
        const result = [];
        
        // 現在の項目のインデックスを取得
        const currentIndex = adminWorkItems.findIndex(wi => wi.id === currentItem.id);
        if (currentIndex === -1) return result;
        
        // 同じ親を持つ子項目のリスト（順序を保持）
        const sameParentItems = adminWorkItems.filter(wi => wi.parent_id === currentItem.parent_id);
        const currentItemInSameParentIndex = sameParentItems.findIndex(wi => wi.id === currentItem.id);
        
        // 前の項目のIDを収集（同じ階層で前の項目、または前に登録されている項目）
        const previousItemIds = new Set();
        
        adminWorkItems.forEach((wi, index) => {
            // 現在の項目自身は除外
            if (wi.id === currentItem.id) return;
            
            let isPreviousItem = false;
            
            // 1. 同じ階層（同じ親）で、一つ以上前の項目
            if (wi.parent_id === currentItem.parent_id) {
                const wiInSameParentIndex = sameParentItems.findIndex(w => w.id === wi.id);
                if (wiInSameParentIndex !== -1 && wiInSameParentIndex < currentItemInSameParentIndex) {
                    isPreviousItem = true;
                }
            }
            // 2. 別の階層で、前に登録されている項目（現在の項目より前のインデックス）
            else if (index < currentIndex) {
                isPreviousItem = true;
            }
            
            if (isPreviousItem) {
                previousItemIds.add(wi.id);
            }
        });
        
        // 前の項目の子孫階層を再帰的に取得する関数
        const getDescendantLeafItems = (parentId) => {
            const descendants = [];
            const children = adminWorkItems.filter(wi => wi.parent_id === parentId);
            
            children.forEach(child => {
                // 最下層チェック
                const hasChildren = adminWorkItems.some(i => i.parent_id === child.id);
                const isLeaf = child.is_leaf !== undefined ? child.is_leaf : !hasChildren;
                
                if (isLeaf) {
                    descendants.push(child.id);
                } else {
                    // 子がいる場合は、さらに下位階層を取得
                    const childDescendants = getDescendantLeafItems(child.id);
                    descendants.push(...childDescendants);
                }
            });
            
            return descendants;
        };
        
        // 前の項目の子孫階層の最下層項目を取得
        const previousItemDescendantIds = new Set();
        previousItemIds.forEach(itemId => {
            const descendants = getDescendantLeafItems(itemId);
            descendants.forEach(descId => previousItemDescendantIds.add(descId));
        });
        
        // 全ての最下層項目をチェック（インデックスと共に保存）
        const candidateItems = [];
        
        adminWorkItems.forEach((wi, index) => {
            // 現在の項目自身は除外
            if (wi.id === currentItem.id) return;
            
            // 最下層チェック（子要素がない、またはis_leafがtrue）
            const hasChildren = adminWorkItems.some(i => i.parent_id === wi.id);
            const isLeaf = wi.is_leaf !== undefined ? wi.is_leaf : !hasChildren;
            
            if (!isLeaf) return;
            
            let isPreviousProcess = false;
            
            // 1. 同じ階層（同じ親）で、一つ以上前の項目
            if (wi.parent_id === currentItem.parent_id) {
                const wiInSameParentIndex = sameParentItems.findIndex(w => w.id === wi.id);
                if (wiInSameParentIndex !== -1 && wiInSameParentIndex < currentItemInSameParentIndex) {
                    isPreviousProcess = true;
                }
            }
            // 2. 別の階層で、前に登録されている項目（現在の項目より前のインデックス）
            else if (index < currentIndex) {
                isPreviousProcess = true;
            }
            // 3. 前の項目の子孫階層の最下層項目
            else if (previousItemDescendantIds.has(wi.id)) {
                isPreviousProcess = true;
            }
            
            if (isPreviousProcess) {
                // パスを作成（表示用）
                let path = wi.name;
                let pathParentId = wi.parent_id;
                while (pathParentId) {
                    const pathParent = adminWorkItems.find(i => i.id === pathParentId);
                    if (pathParent) {
                        path = pathParent.name + ' > ' + path;
                        pathParentId = pathParent.parent_id;
                    } else {
                        break;
                    }
                }
                
                // 階層的なパス（IDのリスト）を作成（ソート用）
                const hierarchyPath = [];
                let currentParentId = wi.parent_id;
                while (currentParentId) {
                    const parentItem = adminWorkItems.find(i => i.id === currentParentId);
                    if (parentItem) {
                        hierarchyPath.unshift(currentParentId);
                        currentParentId = parentItem.parent_id;
                    } else {
                        break;
                    }
                }
                hierarchyPath.push(wi.id);
                
                candidateItems.push({ 
                    id: wi.id, 
                    name: path, 
                    index: index,
                    hierarchyPath: hierarchyPath 
                });
            }
        });
        
        // 階層的な順序でソート（深さ優先探索の順序）
        candidateItems.sort((a, b) => {
            // 階層パスを比較
            const minLength = Math.min(a.hierarchyPath.length, b.hierarchyPath.length);
            
            for (let i = 0; i < minLength; i++) {
                const aPathId = a.hierarchyPath[i];
                const bPathId = b.hierarchyPath[i];
                
                // 同じ階層レベルでの順序を取得
                if (aPathId !== bPathId) {
                    const aIndex = adminWorkItems.findIndex(wi => wi.id === aPathId);
                    const bIndex = adminWorkItems.findIndex(wi => wi.id === bPathId);
                    
                    if (aIndex !== bIndex) {
                        return aIndex - bIndex;
                    }
                }
            }
            
            // 階層の深さが異なる場合、浅い方を先に
            return a.hierarchyPath.length - b.hierarchyPath.length;
        });
        
        // 階層情報を除いて返す
        return candidateItems.map(candidate => ({ id: candidate.id, name: candidate.name }));
    };
    
    const previousProcessItems = getPreviousProcessItems(item);
    
    // デバッグ用：選択肢が空の場合にログを出力
    if (previousProcessItems.length === 0 && item.is_leaf) {
        console.log('リードタイム対象項目が見つかりません:', {
            itemId: item.id,
            itemName: item.name,
            adminWorkItemsCount: adminWorkItems.length,
            currentIndex: adminWorkItems.findIndex(wi => wi.id === item.id)
        });
    }
    
    // 社内リードタイム項目選択肢（単一選択）
    const internalLeadtimeSelectedId = item.internal_leadtime_items && item.internal_leadtime_items.length > 0 
        ? item.internal_leadtime_items[0] : '';
    const internalLeadtimeOptions = '<option value="">選択してください</option>' + 
        previousProcessItems.map(wi => `
        <option value="${wi.id}" ${internalLeadtimeSelectedId === wi.id ? 'selected' : ''}>${wi.name}</option>
    `).join('');
    
    // 社外リードタイム項目選択肢（単一選択）
    const externalLeadtimeSelectedId = item.external_leadtime_items && item.external_leadtime_items.length > 0 
        ? item.external_leadtime_items[0] : '';
    const externalLeadtimeOptions = '<option value="">選択してください</option>' + 
        previousProcessItems.map(wi => `
        <option value="${wi.id}" ${externalLeadtimeSelectedId === wi.id ? 'selected' : ''}>${wi.name}</option>
    `).join('');
    
    itemDiv.innerHTML = `
        <div class="work-item-editable-content">
            <div class="work-item-main-row">
                <div class="work-item-name-section">
                    ${canAddChild ? `<button class="btn btn-small btn-add-child" onclick="addChildWorkItem('${item.id}')" title="子項目を追加">+</button>` : ''}
                    <input type="text" class="work-item-name-input" value="${item.name}" placeholder="作業項目名">
                    <label class="work-item-leaf-checkbox-label">
                        <input type="checkbox" class="work-item-leaf-checkbox" ${isLeafChecked ? 'checked' : ''}>
                        最下層
                    </label>
                    <button class="btn btn-small btn-edit" data-item-id="${item.id}" title="編集" style="display: ${isLeafChecked ? 'inline-block' : 'none'};">編集</button>
                    <div class="work-item-buttons">
                        <button class="btn btn-small btn-danger" onclick="deleteWorkItem('${item.id}')" title="削除">🗑</button>
                    </div>
                </div>
                
                <div class="work-item-form-row" style="display: none;">
                    <div class="work-item-detail-group">
                        <label>属性:</label>
                        <select class="work-item-attribute-select">
                            <option value="">なし</option>
                            <option value="サイクルタイム" ${item.attribute === 'サイクルタイム' ? 'selected' : ''}>サイクルタイム</option>
                            <option value="時期" ${item.attribute === '時期' ? 'selected' : ''}>時期</option>
                        </select>
                    </div>
                    
                    <div class="work-item-detail-group work-item-target-minutes-group" style="display: ${item.attribute === 'サイクルタイム' ? 'flex' : 'none'};">
                        <label>目標工数（分）:</label>
                        <input type="number" class="work-item-target-minutes-input" value="${item.target_minutes || ''}" min="0" style="width: 100px;">
                    </div>
                    
                    <div class="work-item-detail-group">
                        <label>チェックリスト:</label>
                        <textarea class="work-item-checklist-textarea" rows="2" placeholder="1行1項目">${item.checklist?.join('\n') || ''}</textarea>
                    </div>
                    
                    <div class="work-item-detail-group">
                        <label>手段:</label>
                        <textarea class="work-item-method-textarea" rows="2" placeholder="1行1項目">${item.method?.join('\n') || ''}</textarea>
                    </div>
                    
                    <div class="work-item-detail-group">
                        <label>担当種別:</label>
                        <div class="work-item-categories-container">
                            ${categoryCheckboxes}
                        </div>
                    </div>
                </div>
                
                <div class="work-item-leadtime-row" style="display: none;">
                    <div class="work-item-leadtime-group-vertical">
                        <div class="work-item-leadtime-item">
                            <label>
                                <input type="checkbox" class="work-item-internal-leadtime-checkbox" ${item.internal_leadtime ? 'checked' : ''}>
                                社内リードタイム
                            </label>
                            <div class="work-item-leadtime-items-group work-item-internal-leadtime-items-group" style="display: ${item.internal_leadtime ? 'block' : 'none'};">
                                <label>社内リードタイム対象項目:</label>
                                <select class="work-item-internal-leadtime-select">
                                    ${internalLeadtimeOptions}
                                </select>
                            </div>
                        </div>
                        <div class="work-item-leadtime-item">
                            <label>
                                <input type="checkbox" class="work-item-external-leadtime-checkbox" ${item.external_leadtime ? 'checked' : ''}>
                                社外リードタイム
                            </label>
                            <div class="work-item-leadtime-items-group work-item-external-leadtime-items-group" style="display: ${item.external_leadtime ? 'block' : 'none'};">
                                <label>社外リードタイム対象項目:</label>
                                <select class="work-item-external-leadtime-select">
                                    ${externalLeadtimeOptions}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="work-item-children" id="children-${item.id}"></div>
    `;
    
    container.appendChild(itemDiv);
    
    // イベントリスナーを設定
    setupWorkItemEventListeners(itemDiv, item);
    
    // 子要素を表示
    const childrenContainer = document.getElementById(`children-${item.id}`);
    if (children.length > 0) {
        children.forEach(child => {
            displayWorkItemTree(child, childrenContainer, level + 1);
        });
    }
}

// 自動保存用のタイマー管理
const saveTimers = {};

// debounce関数
function debounceSave(itemId, saveFunction, delay = 500) {
    if (saveTimers[itemId]) {
        clearTimeout(saveTimers[itemId]);
    }
    saveTimers[itemId] = setTimeout(() => {
        saveFunction();
        delete saveTimers[itemId];
    }, delay);
}

function setupWorkItemEventListeners(itemDiv, item) {
    const itemId = item.id;
    
    // 項目名変更時の自動保存
    const nameInput = itemDiv.querySelector('.work-item-name-input');
    nameInput.addEventListener('input', () => {
        debounceSave(itemId, () => saveWorkItem(itemId));
    });
    
    // 最下層チェックボックスのイベントリスナー
    const leafCheckbox = itemDiv.querySelector('.work-item-leaf-checkbox');
    const formRow = itemDiv.querySelector('.work-item-form-row');
    const leadtimeRow = itemDiv.querySelector('.work-item-leadtime-row');
    const editButton = itemDiv.querySelector('.btn-edit');
    
    // フォーム行の要素にイベントリスナーを設定する関数（一度だけ設定する）
    let listenersSetup = false;
    const setupFormRowListeners = () => {
        if (listenersSetup) return;
        listenersSetup = true;
        
        // 属性変更時の処理
        const attributeSelect = itemDiv.querySelector('.work-item-attribute-select');
        const targetMinutesGroup = itemDiv.querySelector('.work-item-target-minutes-group');
        
        if (attributeSelect && targetMinutesGroup) {
            attributeSelect.addEventListener('change', (e) => {
                targetMinutesGroup.style.display = e.target.value === 'サイクルタイム' ? 'flex' : 'none';
                // 属性変更時も自動保存
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        // 目標工数変更時の自動保存
        const targetMinutesInput = itemDiv.querySelector('.work-item-target-minutes-input');
        if (targetMinutesInput) {
            targetMinutesInput.addEventListener('input', () => {
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        // チェックリスト変更時の自動保存
        const checklistTextarea = itemDiv.querySelector('.work-item-checklist-textarea');
        if (checklistTextarea) {
            checklistTextarea.addEventListener('input', () => {
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        // 手段変更時の自動保存
        const methodTextarea = itemDiv.querySelector('.work-item-method-textarea');
        if (methodTextarea) {
            methodTextarea.addEventListener('input', () => {
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        // 担当種別変更時の自動保存
        const categoryCheckboxes = itemDiv.querySelectorAll('.work-item-category-checkbox');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        });
        
        // リードタイム変更時の自動保存
        const internalLeadtimeCheckbox = itemDiv.querySelector('.work-item-internal-leadtime-checkbox');
        const externalLeadtimeCheckbox = itemDiv.querySelector('.work-item-external-leadtime-checkbox');
        const internalLeadtimeItemsGroup = itemDiv.querySelector('.work-item-internal-leadtime-items-group');
        const externalLeadtimeItemsGroup = itemDiv.querySelector('.work-item-external-leadtime-items-group');
        const internalLeadtimeSelect = itemDiv.querySelector('.work-item-internal-leadtime-select');
        const externalLeadtimeSelect = itemDiv.querySelector('.work-item-external-leadtime-select');
        
        if (internalLeadtimeCheckbox) {
            internalLeadtimeCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (internalLeadtimeItemsGroup) {
                    internalLeadtimeItemsGroup.style.display = isChecked ? 'block' : 'none';
                }
                
                // チェックが入った時、設定がない場合は一つ前の項目を自動設定
                if (isChecked && internalLeadtimeSelect && !internalLeadtimeSelect.value) {
                    const currentItem = adminWorkItems.find(i => i.id === itemId);
                    if (currentItem) {
                        const previousProcessItems = getPreviousProcessItemsForAutoSet(currentItem);
                        if (previousProcessItems.length > 0) {
                            internalLeadtimeSelect.value = previousProcessItems[previousProcessItems.length - 1].id;
                        }
                    }
                }
                
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        if (externalLeadtimeCheckbox) {
            externalLeadtimeCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (externalLeadtimeItemsGroup) {
                    externalLeadtimeItemsGroup.style.display = isChecked ? 'block' : 'none';
                }
                
                // チェックが入った時、設定がない場合は一つ前の項目を自動設定
                if (isChecked && externalLeadtimeSelect && !externalLeadtimeSelect.value) {
                    const currentItem = adminWorkItems.find(i => i.id === itemId);
                    if (currentItem) {
                        const previousProcessItems = getPreviousProcessItemsForAutoSet(currentItem);
                        if (previousProcessItems.length > 0) {
                            externalLeadtimeSelect.value = previousProcessItems[previousProcessItems.length - 1].id;
                        }
                    }
                }
                
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        // リードタイム項目選択時の自動保存
        if (internalLeadtimeSelect) {
            internalLeadtimeSelect.addEventListener('change', () => {
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
        
        if (externalLeadtimeSelect) {
            externalLeadtimeSelect.addEventListener('change', () => {
                debounceSave(itemId, () => saveWorkItem(itemId));
            });
        }
    };
    
    // 最下層チェックボックスのイベント
    if (leafCheckbox && formRow) {
        leafCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            
            // 編集ボタンの表示/非表示を切り替え
            if (editButton) {
                editButton.style.display = isChecked ? 'inline-block' : 'none';
            }
            
            // チェックが外れた場合はform-rowとleadtime-rowも非表示にする
            if (!isChecked) {
                if (formRow) {
                    formRow.style.display = 'none';
                }
                if (leadtimeRow) {
                    leadtimeRow.style.display = 'none';
                }
                if (editButton) {
                    editButton.textContent = '編集';
                }
            }
            
            // 最下層状態も自動保存
            debounceSave(itemId, () => saveWorkItem(itemId));
        });
    }
    
    // 編集ボタンのイベント
    if (editButton) {
        editButton.addEventListener('click', () => {
            const isVisible = formRow.style.display !== 'none' && formRow.offsetParent !== null;
            
            if (isVisible) {
                // 非表示にする
                formRow.style.display = 'none';
                if (leadtimeRow) {
                    leadtimeRow.style.display = 'none';
                }
                editButton.textContent = '編集';
            } else {
                // 表示にする
                formRow.style.display = 'flex';
                if (leadtimeRow) {
                    leadtimeRow.style.display = 'block';
                }
                editButton.textContent = '閉じる';
                
                // formRowのイベントリスナーを設定（まだ設定されていない場合）
                setupFormRowListeners();
            }
        });
    }
}

// 作業項目追加（ルートレベル）
document.getElementById('add-master-work-item-btn').addEventListener('click', async () => {
    if (!selectedWorkTypeId) {
        alert('工程を選択してください');
        return;
    }
    await addNewWorkItem(null);
});

// 作業項目エクスポート
document.getElementById('export-work-items-btn').addEventListener('click', async () => {
    if (!selectedWorkTypeId) {
        alert('工程を選択してください');
        return;
    }
    
    try {
        const response = await fetch(`/api/masters/work-items/export?work_type_id=${selectedWorkTypeId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'エクスポートに失敗しました');
        }
        
        // ファイルをダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '作業項目マスター.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('作業項目をエクスポートしました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
});

// 作業項目インポート
document.getElementById('import-work-items-btn').addEventListener('click', () => {
    document.getElementById('import-work-items-file').click();
});

document.getElementById('import-work-items-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx')) {
        alert('Excelファイル(.xlsx)を選択してください');
        e.target.value = '';
        return;
    }
    
    // プレビュー用にファイルをアップロード
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/masters/work-items/preview', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'プレビューの読み込みに失敗しました');
        }
        
        // モーダルにプレビューを表示
        showImportPreviewModal(result.items, result.count, file);
        
        // ファイル選択をリセット（モーダル内で再度ファイルを保持するため）
        e.target.value = '';
    } catch (error) {
        alert('エラー: ' + error.message);
        e.target.value = '';
    }
});

// インポートプレビューモーダルを表示（ファイルオブジェクトを保持するための変数）
let importPreviewFile = null;

// インポートプレビューモーダルを表示
function showImportPreviewModal(items, count, file) {
    // ファイルオブジェクトを保持
    importPreviewFile = file;
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    // 工程選択ドロップダウンを作成
    const workTypeOptions = adminWorkTypes.map(wt => 
        `<option value="${wt.id}">${wt.name}</option>`
    ).join('');
    
    // プレビューテーブルの行を作成（全行を表示）
    const previewRows = items.map(item => {
        return `
            <tr>
                <td>${item.uuid || ''}</td>
                <td>${item.level1 || ''}</td>
                <td>${item.level2 || ''}</td>
                <td>${item.level3 || ''}</td>
                <td>${item.level4 || ''}</td>
                <td>${item.checklist || ''}</td>
                <td>${item.method || ''}</td>
                <td>${item.attribute || ''}</td>
                <td>${item.target_minutes || ''}</td>
                <td>${item.internal_leadtime ? 'あり' : 'なし'}</td>
                <td>${item.internal_leadtime_items || ''}</td>
                <td>${item.external_leadtime ? 'あり' : 'なし'}</td>
                <td>${item.external_leadtime_items || ''}</td>
                <td>${item.担当種別 || ''}</td>
            </tr>
        `;
    }).join('');
    
    modalBody.innerHTML = `
        <h2>Excelインポートプレビュー</h2>
        <div class="import-preview-container">
            <div class="form-group">
                <label>工程を選択してください:</label>
                <select id="import-work-type-select" class="form-group select">
                    <option value="">工程を選択してください</option>
                    ${workTypeOptions}
                </select>
            </div>
            
            <div class="preview-info">
                <p>読み込まれる項目数: <strong>${count}件</strong></p>
            </div>
            
            <div class="preview-table-container">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>UUID</th>
                            <th>レベル1</th>
                            <th>レベル2</th>
                            <th>レベル3</th>
                            <th>レベル4</th>
                            <th>チェックリスト</th>
                            <th>手段</th>
                            <th>属性</th>
                            <th>目標工数</th>
                            <th>社内リードタイム</th>
                            <th>社内リードタイムUUID</th>
                            <th>社外リードタイム</th>
                            <th>社外リードタイムUUID</th>
                            <th>担当種別</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows}
                    </tbody>
                </table>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-primary" id="confirm-import-btn">インポート実行</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // インポート実行ボタンのイベントリスナー
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const workTypeSelect = document.getElementById('import-work-type-select');
    
    confirmImportBtn.addEventListener('click', async () => {
        const selectedWorkTypeId = workTypeSelect.value;
        
        if (!selectedWorkTypeId) {
            alert('工程を選択してください');
            return;
        }
        
        if (!importPreviewFile) {
            alert('ファイルが見つかりません');
            return;
        }
        
        // インポートを実行
        await executeImport(importPreviewFile, selectedWorkTypeId);
    });
}

// インポートを実行
async function executeImport(file, workTypeId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('work_type_id', workTypeId);
    
    try {
        const response = await fetch('/api/masters/work-items/import', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'インポートに失敗しました');
        }
        
        alert(result.message || '作業項目をインポートしました');
        
        closeModal();
        
        // ファイルオブジェクトをクリア
        importPreviewFile = null;
        
        // 作業項目を再読み込み
        if (selectedWorkTypeId === workTypeId) {
            await loadWorkItemsByWorkType(workTypeId);
        } else {
            // 選択中の工程と異なる場合は、選択中の工程を再読み込み
            if (selectedWorkTypeId) {
                await loadWorkItemsByWorkType(selectedWorkTypeId);
            } else {
                await loadAdminWorkItems();
            }
        }
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 新しい作業項目を追加
async function addNewWorkItem(parentId) {
    if (!selectedWorkTypeId) {
        alert('工程を選択してください');
        return;
    }
    
    const parentLevel = parentId ? (adminWorkItems.find(i => i.id === parentId)?.level || 0) + 1 : 1;
    const newItem = {
        name: '',
        level: parentLevel,
        parent_id: parentId || null,
        work_type_id: selectedWorkTypeId,
        attribute: null,
        target_minutes: null,
        checklist: [],
        method: [],
        internal_leadtime: false,
        external_leadtime: false,
        internal_leadtime_items: [],
        external_leadtime_items: [],
        担当種別: [],
        is_leaf: parentLevel === 4 || false // レベル4の場合は最下層、それ以外はデフォルトでfalse
    };
    
    try {
        const result = await MasterAPI.addWorkItem(newItem);
        // 工程が選択されている場合は、その工程の作業項目を再読み込み
        if (selectedWorkTypeId) {
            await loadWorkItemsByWorkType(selectedWorkTypeId);
        } else {
            await loadAdminWorkItems();
        }
        // 新しく追加した項目にフォーカス
        const newItemDiv = document.querySelector(`[data-item-id="${result.item.id}"]`);
        if (newItemDiv) {
            const nameInput = newItemDiv.querySelector('.work-item-name-input');
            if (nameInput) {
                nameInput.focus();
            }
        }
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 子項目を追加
async function addChildWorkItem(parentId) {
    if (!selectedWorkTypeId) {
        alert('工程を選択してください');
        return;
    }
    await addNewWorkItem(parentId);
}

// 一つ前の項目を取得する関数（自動設定用、最下層項目のみ）
function getPreviousProcessItemsForAutoSet(currentItem) {
    const result = [];
    
    // 現在の項目のインデックスを取得
    const currentIndex = adminWorkItems.findIndex(wi => wi.id === currentItem.id);
    if (currentIndex === -1) return result;
    
    // 現在の項目より前の最下層項目を取得
    for (let i = currentIndex - 1; i >= 0; i--) {
        const item = adminWorkItems[i];
        // 最下層チェック（子要素がない、またはis_leafがtrue）
        const hasChildren = adminWorkItems.some(wi => wi.parent_id === item.id);
        const isLeaf = item.is_leaf !== undefined ? item.is_leaf : !hasChildren;
        
        if (isLeaf) {
            // パスを作成（表示用）
            let path = item.name;
            let pathParentId = item.parent_id;
            while (pathParentId) {
                const pathParent = adminWorkItems.find(wi => wi.id === pathParentId);
                if (pathParent) {
                    path = pathParent.name + ' > ' + path;
                    pathParentId = pathParent.parent_id;
                } else {
                    break;
                }
            }
            result.push({ id: item.id, name: path });
            // 一つ前の項目が見つかったら終了
            break;
        }
    }
    
    return result;
}

// 作業項目を保存
async function saveWorkItem(itemId) {
    const itemDiv = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!itemDiv) return;
    
    const nameInput = itemDiv.querySelector('.work-item-name-input');
    const attributeSelect = itemDiv.querySelector('.work-item-attribute-select');
    const targetMinutesInput = itemDiv.querySelector('.work-item-target-minutes-input');
    const checklistTextarea = itemDiv.querySelector('.work-item-checklist-textarea');
    const methodTextarea = itemDiv.querySelector('.work-item-method-textarea');
    const internalLeadtimeCheckbox = itemDiv.querySelector('.work-item-internal-leadtime-checkbox');
    const externalLeadtimeCheckbox = itemDiv.querySelector('.work-item-external-leadtime-checkbox');
    const internalLeadtimeSelect = itemDiv.querySelector('.work-item-internal-leadtime-select');
    const externalLeadtimeSelect = itemDiv.querySelector('.work-item-external-leadtime-select');
    const categoryCheckboxes = itemDiv.querySelectorAll('.work-item-category-checkbox:checked');
    const leafCheckbox = itemDiv.querySelector('.work-item-leaf-checkbox');
    
    const name = nameInput.value.trim();
    // 名前が空の場合は保存しない（新規追加時など）
    if (!name) {
        return;
    }
    
    // 親項目は階層構造から自動的に取得（既存のitemから）
    const existingItem = adminWorkItems.find(i => i.id === itemId);
    const parentId = existingItem ? existingItem.parent_id : null;
    const parentItem = parentId ? adminWorkItems.find(i => i.id === parentId) : null;
    const level = parentItem ? parentItem.level + 1 : 1;
    
    const checklistText = checklistTextarea.value;
    const checklist = checklistText ? checklistText.split('\n').filter(line => line.trim()) : [];
    
    const methodText = methodTextarea ? methodTextarea.value : '';
    const method = methodText ? methodText.split('\n').filter(line => line.trim()) : [];
    
    const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
    
    // リードタイム項目の選択値を取得（単一選択）
    let selectedInternalLeadtimeItems = internalLeadtimeSelect && internalLeadtimeSelect.value ? 
        [internalLeadtimeSelect.value] : [];
    let selectedExternalLeadtimeItems = externalLeadtimeSelect && externalLeadtimeSelect.value ? 
        [externalLeadtimeSelect.value] : [];
    
    // リードタイムチェックが入っているが設定がない場合、一つ前の項目を自動設定
    if (internalLeadtimeCheckbox && internalLeadtimeCheckbox.checked && selectedInternalLeadtimeItems.length === 0) {
        const currentItem = adminWorkItems.find(i => i.id === itemId);
        if (currentItem) {
            const previousProcessItems = getPreviousProcessItemsForAutoSet(currentItem);
            if (previousProcessItems.length > 0) {
                // 一つ前の項目（最後の要素）を設定
                selectedInternalLeadtimeItems = [previousProcessItems[previousProcessItems.length - 1].id];
                // ドロップダウンにも反映
                if (internalLeadtimeSelect) {
                    internalLeadtimeSelect.value = selectedInternalLeadtimeItems[0];
                }
            }
        }
    }
    
    if (externalLeadtimeCheckbox && externalLeadtimeCheckbox.checked && selectedExternalLeadtimeItems.length === 0) {
        const currentItem = adminWorkItems.find(i => i.id === itemId);
        if (currentItem) {
            const previousProcessItems = getPreviousProcessItemsForAutoSet(currentItem);
            if (previousProcessItems.length > 0) {
                // 一つ前の項目（最後の要素）を設定
                selectedExternalLeadtimeItems = [previousProcessItems[previousProcessItems.length - 1].id];
                // ドロップダウンにも反映
                if (externalLeadtimeSelect) {
                    externalLeadtimeSelect.value = selectedExternalLeadtimeItems[0];
                }
            }
        }
    }
    
    // 既存の項目からwork_type_idを取得（新規追加時はselectedWorkTypeIdを使用）
    const existingItemForWorkType = adminWorkItems.find(i => i.id === itemId);
    const workTypeId = existingItemForWorkType?.work_type_id || selectedWorkTypeId;
    
    const data = {
        id: itemId,
        name,
        level,
        parent_id: parentId,
        work_type_id: workTypeId,
        attribute: attributeSelect.value || null,
        target_minutes: targetMinutesInput ? (parseInt(targetMinutesInput.value) || null) : null,
        checklist,
        method: method,
        internal_leadtime: internalLeadtimeCheckbox.checked,
        external_leadtime: externalLeadtimeCheckbox.checked,
        internal_leadtime_items: selectedInternalLeadtimeItems,
        external_leadtime_items: selectedExternalLeadtimeItems,
        担当種別: selectedCategories,
        is_leaf: leafCheckbox ? leafCheckbox.checked : false
    };
    
    try {
        await MasterAPI.updateWorkItem(data);
        // 画面全体を再読み込みせず、現在の状態を保持
        // データだけを更新
        const itemIndex = adminWorkItems.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
            adminWorkItems[itemIndex] = { ...adminWorkItems[itemIndex], ...data };
        }
    } catch (error) {
        console.error('保存エラー:', error);
        // エラー時は画面を再読み込み
        if (selectedWorkTypeId) {
            await loadWorkItemsByWorkType(selectedWorkTypeId);
        } else {
            await loadAdminWorkItems();
        }
        alert('保存に失敗しました: ' + error.message);
    }
}

async function deleteWorkItem(itemId) {
    // 削除対象の項目を取得
    const targetItem = adminWorkItems.find(i => i.id === itemId);
    if (!targetItem) return;
    
    // 子要素を再帰的に取得
    const getDescendantIds = (parentId) => {
        const descendantIds = [];
        const children = adminWorkItems.filter(i => i.parent_id === parentId);
        children.forEach(child => {
            descendantIds.push(child.id);
            // 子要素の子要素も再帰的に取得
            const childDescendants = getDescendantIds(child.id);
            descendantIds.push(...childDescendants);
        });
        return descendantIds;
    };
    
    const childIds = getDescendantIds(itemId);
    const hasChildren = childIds.length > 0;
    
    // 確認メッセージ
    let confirmMessage = 'この作業項目を削除してもよろしいですか？';
    if (hasChildren) {
        confirmMessage = `この作業項目と${childIds.length}個の子項目も含めて削除してもよろしいですか？`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // 子項目から順に削除（子→親の順序で削除）
        const allIdsToDelete = [...childIds, itemId];
        
        // 工程IDを含めて削除
        const deleteData = {
            ids: allIdsToDelete,
            work_type_id: selectedWorkTypeId
        };
        await MasterAPI.deleteWorkItem(deleteData);
        
        if (selectedWorkTypeId) {
            await loadWorkItemsByWorkType(selectedWorkTypeId);
        } else {
            await loadAdminWorkItems();
        }
        alert(hasChildren ? `作業項目と${childIds.length}個の子項目を削除しました` : '作業項目を削除しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 担当種別マスター
async function loadAdminJobCategories() {
    try {
        const result = await MasterAPI.getJobCategories();
        adminJobCategories = result.categories || [];
        displayAdminJobCategories();
    } catch (error) {
        console.error('担当種別の読み込みに失敗しました:', error);
    }
}

function displayAdminJobCategories() {
    const categoriesList = document.getElementById('job-categories-list');
    
    categoriesList.innerHTML = '';
    
    if (adminJobCategories.length === 0) {
        categoriesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">担当種別がありません。右側の「+」ボタンで追加してください。</div></div>';
        return;
    }
    
    adminJobCategories.forEach((category, index) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'list-item job-category-item';
        categoryDiv.dataset.categoryIndex = index;
        categoryDiv.draggable = true;
        
        categoryDiv.innerHTML = `
            <div class="list-item-info">
                <span class="drag-handle" title="ドラッグして並び順を変更">☰</span>
                <input type="text" class="job-category-input" value="${category}" placeholder="担当種別名" data-index="${index}">
            </div>
            <div class="list-item-actions">
                <button class="btn btn-danger btn-small" onclick="deleteJobCategory(${index})" title="削除">🗑</button>
            </div>
        `;
        
        categoriesList.appendChild(categoryDiv);
        
        // ドラッグ＆ドロップイベントリスナー
        categoryDiv.addEventListener('dragstart', handleCategoryDragStart);
        categoryDiv.addEventListener('dragover', handleCategoryDragOver);
        categoryDiv.addEventListener('drop', handleCategoryDrop);
        categoryDiv.addEventListener('dragend', handleCategoryDragEnd);
        
        // 入力フィールドにイベントリスナーを設定
        const categoryInput = categoryDiv.querySelector('.job-category-input');
        let categoryTimer = null;
        categoryInput.addEventListener('input', () => {
            clearTimeout(categoryTimer);
            categoryTimer = setTimeout(() => {
                saveJobCategory(index);
            }, 500);
        });
    });
}

// 担当種別追加
document.getElementById('add-job-category-btn').addEventListener('click', async () => {
    await addNewJobCategory();
});

// 新しい担当種別を追加
async function addNewJobCategory() {
    try {
        adminJobCategories.push('');
        await MasterAPI.saveJobCategories({ categories: adminJobCategories });
        await loadAdminJobCategories();
        
        // 新しく追加した項目の入力フィールドにフォーカス
        const categoriesList = document.getElementById('job-categories-list');
        const lastInput = categoriesList.querySelector('.job-category-input:last-child');
        if (lastInput) {
            lastInput.focus();
        }
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 担当種別を保存
async function saveJobCategory(index) {
    const categoriesList = document.getElementById('job-categories-list');
    const categoryDiv = categoriesList.querySelector(`[data-category-index="${index}"]`);
    if (!categoryDiv) return;
    
    const categoryInput = categoryDiv.querySelector('.job-category-input');
    const newCategory = categoryInput.value.trim();
    
    // 空の場合は保存しない
    if (!newCategory) {
        return;
    }
    
    try {
        adminJobCategories[index] = newCategory;
        await MasterAPI.saveJobCategories({ categories: adminJobCategories });
        // データを更新
        const result = await MasterAPI.getJobCategories();
        adminJobCategories = result.categories || [];
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存に失敗しました: ' + error.message);
        await loadAdminJobCategories();
    }
}


async function deleteJobCategory(index) {
    if (!confirm('この担当種別を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        adminJobCategories.splice(index, 1);
        await MasterAPI.saveJobCategories({ categories: adminJobCategories });
        await loadAdminJobCategories();
        alert('担当種別を削除しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 担当種別のドラッグ&ドロップ用変数
let draggedCategoryElement = null;

// 担当種別のドラッグ開始
function handleCategoryDragStart(e) {
    draggedCategoryElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

// 担当種別のドラッグオーバー
function handleCategoryDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getCategoryDragAfterElement(this.parentNode, e.clientY);
    if (afterElement == null) {
        this.parentNode.appendChild(draggedCategoryElement);
    } else {
        this.parentNode.insertBefore(draggedCategoryElement, afterElement);
    }
    
    return false;
}

// 担当種別のドロップ
function handleCategoryDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    return false;
}

// 担当種別のドラッグ終了
function handleCategoryDragEnd(e) {
    this.classList.remove('dragging');
    draggedCategoryElement = null;
    
    // 並び順を更新
    saveJobCategoriesOrder();
}

// 担当種別のドラッグ後の位置を取得
function getCategoryDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.job-category-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 担当種別の並び順を保存
async function saveJobCategoriesOrder() {
    const categoriesList = document.getElementById('job-categories-list');
    const categoryItems = categoriesList.querySelectorAll('.job-category-item');
    
    // 現在のDOM順序に基づいて新しい順序を取得
    const orderedCategories = Array.from(categoryItems).map(item => {
        const input = item.querySelector('.job-category-input');
        return input ? input.value : '';
    }).filter(cat => cat); // 空文字を除外
    
    try {
        // バックエンドに並び順を保存
        await MasterAPI.saveJobCategories({ categories: orderedCategories });
        
        // ローカルデータも更新
        adminJobCategories = orderedCategories;
    } catch (error) {
        console.error('並び順の保存に失敗しました:', error);
        // エラー時は再読み込み
        await loadAdminJobCategories();
    }
}

// 工程マスター
async function loadAdminWorkTypes() {
    try {
        const result = await MasterAPI.getWorkTypes();
        adminWorkTypes = result.work_types || [];
        displayAdminWorkTypes();
    } catch (error) {
        console.error('工程の読み込みに失敗しました:', error);
    }
}

function displayAdminWorkTypes() {
    const workTypesList = document.getElementById('work-types-list');
    
    if (!workTypesList) {
        console.error('work-types-list要素が見つかりません');
        return;
    }
    
    workTypesList.innerHTML = '';
    
    if (!adminWorkTypes || adminWorkTypes.length === 0) {
        workTypesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">工程がありません。右側の「+」ボタンで追加してください。</div></div>';
        return;
    }
    
    adminWorkTypes.forEach(workType => {
        const workTypeDiv = document.createElement('div');
        workTypeDiv.className = 'list-item work-type-item';
        workTypeDiv.dataset.workTypeId = workType.id;
        workTypeDiv.draggable = true;
        
        workTypeDiv.innerHTML = `
            <div class="list-item-info">
                <span class="drag-handle" title="ドラッグして並び順を変更">☰</span>
                <input type="text" class="work-type-name-input" value="${workType.name}" placeholder="工程名" data-work-type-id="${workType.id}">
            </div>
            <div class="list-item-actions">
                <button class="btn btn-danger btn-small" onclick="deleteWorkType('${workType.id}')" title="削除">🗑</button>
            </div>
        `;
        
        workTypesList.appendChild(workTypeDiv);
        
        // ドラッグ＆ドロップイベントリスナー
        workTypeDiv.addEventListener('dragstart', handleDragStart);
        workTypeDiv.addEventListener('dragover', handleDragOver);
        workTypeDiv.addEventListener('drop', handleDrop);
        workTypeDiv.addEventListener('dragend', handleDragEnd);
        
        // 入力フィールドにイベントリスナーを設定
        const workTypeNameInput = workTypeDiv.querySelector('.work-type-name-input');
        
        let workTypeTimer = null;
        workTypeNameInput.addEventListener('input', () => {
            clearTimeout(workTypeTimer);
            workTypeTimer = setTimeout(() => {
                saveWorkType(workType.id);
            }, 500);
        });
    });
}

// 工程追加
document.getElementById('add-work-type-btn').addEventListener('click', async () => {
    await addNewWorkType();
});

// 新しい工程を追加
async function addNewWorkType() {
    try {
        const result = await MasterAPI.addWorkType({
            name: ''
        });
        await loadAdminWorkTypes();
        
        // 新しく追加した項目の入力フィールドにフォーカス
        const workTypesList = document.getElementById('work-types-list');
        const workTypeDiv = workTypesList.querySelector(`[data-work-type-id="${result.work_type.id}"]`);
        if (workTypeDiv) {
            const nameInput = workTypeDiv.querySelector('.work-type-name-input');
            if (nameInput) {
                nameInput.focus();
            }
        }
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 工程を保存
async function saveWorkType(workTypeId) {
    const workTypesList = document.getElementById('work-types-list');
    const workTypeDiv = workTypesList.querySelector(`[data-work-type-id="${workTypeId}"]`);
    if (!workTypeDiv) return;
    
    const nameInput = workTypeDiv.querySelector('.work-type-name-input');
    
    const name = nameInput.value.trim();
    
    // 名前が空の場合は保存しない（新規追加時など）
    if (!name) {
        return;
    }
    
    try {
        const data = {
            id: workTypeId,
            name: name
        };
        
        await MasterAPI.updateWorkType(data);
        
        // データを更新
        const result = await MasterAPI.getWorkTypes();
        adminWorkTypes = result.work_types || [];
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存に失敗しました: ' + error.message);
        await loadAdminWorkTypes();
    }
}

async function deleteWorkType(workTypeId) {
    if (!confirm('この工程を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        await MasterAPI.deleteWorkType(workTypeId);
        await loadAdminWorkTypes();
        alert('工程を削除しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// ドラッグ＆ドロップ関連の変数
let draggedElement = null;

// ドラッグ開始
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

// ドラッグオーバー
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(this.parentNode, e.clientY);
    if (afterElement == null) {
        this.parentNode.appendChild(draggedElement);
    } else {
        this.parentNode.insertBefore(draggedElement, afterElement);
    }
    
    return false;
}

// ドロップ
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    return false;
}

// ドラッグ終了
function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // 並び順を更新
    saveWorkTypesOrder();
}

// ドラッグ後の位置を取得
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.work-type-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 工程の並び順を保存
async function saveWorkTypesOrder() {
    const workTypesList = document.getElementById('work-types-list');
    const workTypeItems = workTypesList.querySelectorAll('.work-type-item');
    
    const orderedIds = Array.from(workTypeItems).map(item => item.dataset.workTypeId);
    
    try {
        // 現在の工程データを順序に従って再配置
        const orderedWorkTypes = orderedIds.map(id => {
            return adminWorkTypes.find(wt => wt.id === id);
        }).filter(wt => wt); // undefinedを除外
        
        // バックエンドに並び順を保存
        await MasterAPI.updateWorkTypesOrder({ work_types: orderedWorkTypes });
        
        // ローカルデータも更新
        adminWorkTypes = orderedWorkTypes;
    } catch (error) {
        console.error('並び順の保存に失敗しました:', error);
        // エラー時は再読み込み
        await loadAdminWorkTypes();
    }
}

// プロジェクトマスター
async function loadAdminProjects() {
    try {
        // 工種データも同時に読み込む
        if (adminWorkTypes.length === 0) {
            const workTypesResult = await MasterAPI.getWorkTypes();
            adminWorkTypes = workTypesResult.work_types || [];
        }
        
        const result = await MasterAPI.getProjects();
        adminProjects = result.projects || [];
        console.log('プロジェクト読み込み成功:', adminProjects);
        displayAdminProjects();
    } catch (error) {
        console.error('プロジェクトの読み込みに失敗しました:', error);
    }
}

function displayAdminProjects() {
    const projectsList = document.getElementById('projects-list');
    
    if (!projectsList) {
        console.error('projects-list要素が見つかりません');
        return;
    }
    
    projectsList.innerHTML = '';
    
    if (!adminProjects || adminProjects.length === 0) {
        projectsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">プロジェクトがありません。右側の「+」ボタンで追加してください。</div></div>';
        return;
    }
    
    adminProjects.forEach(project => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'list-item project-item';
        projectDiv.dataset.projectId = project.id;
        projectDiv.draggable = true;
        
        // 後方互換性: work_type_idがある場合はwork_type_idsに変換
        const workTypeIds = project.work_type_ids || (project.work_type_id ? [project.work_type_id] : []);
        
        // 工程選択のチェックボックスを生成
        const workTypeCheckboxes = adminWorkTypes.map(wt => `
            <div class="checklist-item">
                <input type="checkbox" class="project-work-type-checkbox" id="wt-${project.id}-${wt.id}" value="${wt.id}" 
                    ${workTypeIds.includes(wt.id) ? 'checked' : ''}>
                <label for="wt-${project.id}-${wt.id}">${wt.name}</label>
            </div>
        `).join('');
        
        projectDiv.innerHTML = `
            <div class="list-item-info">
                <span class="drag-handle" title="ドラッグして並び順を変更">☰</span>
                <input type="text" class="project-name-input" value="${project.name}" placeholder="プロジェクト名" data-project-id="${project.id}">
                <div class="project-work-types-container">
                    <label>工程:</label>
                    <div class="work-item-categories-container">
                        ${workTypeCheckboxes}
                    </div>
                </div>
                <select class="project-status-select" data-project-id="${project.id}">
                    <option value="未着手" ${project.status === '未着手' ? 'selected' : ''}>未着手</option>
                    <option value="実行中" ${project.status === '実行中' ? 'selected' : ''}>実行中</option>
                    <option value="完了" ${project.status === '完了' ? 'selected' : ''}>完了</option>
                </select>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick="exportProject('${project.id}', 'user')" title="Excel出力（ユーザー別）">📥</button>
                <button class="btn btn-secondary btn-small" onclick="exportProject('${project.id}', 'detail')" title="Excel出力（詳細）">📊</button>
                <button class="btn btn-danger btn-small" onclick="deleteProject('${project.id}')" title="削除">🗑</button>
            </div>
        `;
        
        projectsList.appendChild(projectDiv);
        
        // ドラッグ＆ドロップイベントリスナー
        projectDiv.addEventListener('dragstart', handleProjectDragStart);
        projectDiv.addEventListener('dragover', handleProjectDragOver);
        projectDiv.addEventListener('drop', handleProjectDrop);
        projectDiv.addEventListener('dragend', handleProjectDragEnd);
        
        // 入力フィールドとセレクトにイベントリスナーを設定
        const projectNameInput = projectDiv.querySelector('.project-name-input');
        const projectWorkTypeCheckboxes = projectDiv.querySelectorAll('.project-work-type-checkbox');
        const projectStatusSelect = projectDiv.querySelector('.project-status-select');
        
        let projectTimer = null;
        projectNameInput.addEventListener('input', () => {
            clearTimeout(projectTimer);
            projectTimer = setTimeout(() => {
                saveProject(project.id);
            }, 500);
        });
        
        projectWorkTypeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                saveProject(project.id);
            });
        });
        
        projectStatusSelect.addEventListener('change', () => {
            saveProject(project.id);
        });
    });
}

// プロジェクト追加
document.getElementById('add-project-btn').addEventListener('click', async () => {
    await addNewProject();
});

// 新しいプロジェクトを追加
async function addNewProject() {
    try {
        const result = await MasterAPI.addProject({
            name: '',
            status: '未着手'
        });
        await loadAdminProjects();
        
        // 新しく追加した項目の入力フィールドにフォーカス
        const projectsList = document.getElementById('projects-list');
        const projectDiv = projectsList.querySelector(`[data-project-id="${result.project.id}"]`);
        if (projectDiv) {
            const nameInput = projectDiv.querySelector('.project-name-input');
            if (nameInput) {
                nameInput.focus();
            }
        }
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// プロジェクトを保存
async function saveProject(projectId) {
    const projectsList = document.getElementById('projects-list');
    const projectDiv = projectsList.querySelector(`[data-project-id="${projectId}"]`);
    if (!projectDiv) return;
    
    const nameInput = projectDiv.querySelector('.project-name-input');
    const workTypeCheckboxes = projectDiv.querySelectorAll('.project-work-type-checkbox:checked');
    const statusSelect = projectDiv.querySelector('.project-status-select');
    
    const name = nameInput.value.trim();
    
    // 名前が空の場合は保存しない（新規追加時など）
    if (!name) {
        return;
    }
    
    // 選択された工程IDの配列を取得
    const workTypeIds = Array.from(workTypeCheckboxes).map(cb => cb.value);
    
    try {
        const data = {
            id: projectId,
            name: name,
            work_type_ids: workTypeIds,
            status: statusSelect.value
        };
        
        await MasterAPI.updateProject(data);
        
        // データを更新
        const result = await MasterAPI.getProjects();
        adminProjects = result.projects || [];
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存に失敗しました: ' + error.message);
        await loadAdminProjects();
    }
}

// プロジェクトのドラッグ&ドロップ用変数
let draggedProjectElement = null;

// プロジェクトのドラッグ開始
function handleProjectDragStart(e) {
    draggedProjectElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

// プロジェクトのドラッグオーバー
function handleProjectDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getProjectDragAfterElement(this.parentNode, e.clientY);
    if (afterElement == null) {
        this.parentNode.appendChild(draggedProjectElement);
    } else {
        this.parentNode.insertBefore(draggedProjectElement, afterElement);
    }
    
    return false;
}

// プロジェクトのドロップ
function handleProjectDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    return false;
}

// プロジェクトのドラッグ終了
function handleProjectDragEnd(e) {
    this.classList.remove('dragging');
    draggedProjectElement = null;
    
    // 並び順を更新
    saveProjectsOrder();
}

// プロジェクトのドラッグ後の位置を取得
function getProjectDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.project-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// プロジェクトの並び順を保存
async function saveProjectsOrder() {
    const projectsList = document.getElementById('projects-list');
    const projectItems = projectsList.querySelectorAll('.project-item');
    
    // 現在のDOM順序に基づいて新しい順序を取得
    const orderedProjectIds = Array.from(projectItems).map(item => item.dataset.projectId);
    
    try {
        // 現在のプロジェクトデータを順序に従って再配置
        const orderedProjects = orderedProjectIds.map(id => {
            return adminProjects.find(p => p.id === id);
        }).filter(p => p); // undefinedを除外
        
        // 各プロジェクトを順番に更新して順序を保存
        // 注意: これは非効率的ですが、プロジェクトの順序を保存するには全更新が必要
        // 将来的には順序を一括更新するAPIエンドポイントを追加することを推奨
        for (const project of orderedProjects) {
            await MasterAPI.updateProject(project);
        }
        
        // ローカルデータも更新
        adminProjects = orderedProjects;
    } catch (error) {
        console.error('並び順の保存に失敗しました:', error);
        // エラー時は再読み込み
        await loadAdminProjects();
    }
}

async function exportProject(projectId, formatType = 'user') {
    try {
        // プロジェクト名を先に取得（adminProjectsから確実に取得するため）
        let project = adminProjects.find(p => p.id === projectId);
        
        // プロジェクトが見つからない場合は再読み込み
        if (!project) {
            await loadAdminProjects();
            project = adminProjects.find(p => p.id === projectId);
        }
        
        if (!project) {
            alert('プロジェクトが見つかりません');
            return;
        }
        console.log("project",project);

        const safeProjectName = project.name || 'プロジェクト';
        //const safeProjectName = projectName.replace(/[^\w\s-]/g, '').trim() || 'プロジェクト';
        
        // 年月日を取得（YYYYMMDD形式）
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        const filename = `${safeProjectName}_${dateStr}.xlsx`;
        
        const response = await MasterAPI.exportProject(projectId, formatType);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'エクスポートに失敗しました');
        }
        
        // ファイルをダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('プロジェクトをエクスポートしました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function deleteProject(projectId) {
    if (!confirm('このプロジェクトを削除してもよろしいですか？')) {
        return;
    }
    
    try {
        await MasterAPI.deleteProject(projectId);
        await loadAdminProjects();
        alert('プロジェクトを削除しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// モーダルを閉じる
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

document.querySelector('.close').addEventListener('click', closeModal);

// モーダル外クリックで閉じる
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

