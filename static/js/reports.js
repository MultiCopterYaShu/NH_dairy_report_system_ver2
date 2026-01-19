// 日報機能

let allReports = [];
let allWorkItems = [];
let allProjects = [];
let allWorkTypes = [];
let currentEditingReport = null;
let projectCounter = 0;
let workItemCounter = 0;
let currentViewMode = 'timeline'; // timeline, date, user, project

// 日報一覧読み込み
async function loadReports() {
    try {
        // adminユーザーの場合は全ユーザーの日報を取得、それ以外は自分の日報のみ
        const isAdmin = currentUser && currentUser.role === 'admin';
        const reportsPromise = isAdmin ? ReportAPI.getAllUsers() : ReportAPI.getAll();
        
        // 日報データとマスターデータを同時に読み込む
        const [reportsResult, workItemsResult, projectsResult, workTypesResult] = await Promise.all([
            reportsPromise,
            MasterAPI.getWorkItems(),
            MasterAPI.getProjects(),
            MasterAPI.getWorkTypes()
        ]);
        
        allReports = reportsResult.reports || [];
        allWorkItems = workItemsResult.items || [];
        allProjects = projectsResult.projects || [];
        allWorkTypes = workTypesResult.work_types || [];
        
        // 表示モードタブとフィルターの設定
        setupViewModeTabs();
        
        displayReports();
    } catch (error) {
        console.error('日報の読み込みに失敗しました:', error);
    }
}

// 日報表示
function displayReports() {
    const historyList = document.getElementById('history-list');
    
    // admin以外のユーザーは常に時系列表示のみ
    const isAdmin = currentUser && currentUser.role === 'admin';
    if (!isAdmin) {
        currentViewMode = 'timeline';
        // 管理者以外の場合は全てのフィルターを非表示
        const dateFilter = document.getElementById('date-filter-container');
        const userFilter = document.getElementById('user-filter-container');
        const projectFilter = document.getElementById('project-filter-container');
        if (dateFilter) dateFilter.style.display = 'none';
        if (userFilter) userFilter.style.display = 'none';
        if (projectFilter) projectFilter.style.display = 'none';
    }
    
    if (allReports.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">まだ日報がありません</div>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    
    // 表示モードに応じて表示方法を切り替え
    switch (currentViewMode) {
        case 'date':
            displayReportsByDate();
            break;
        case 'user':
            displayReportsByUser();
            break;
        case 'project':
            displayReportsByProject();
            break;
        default: // timeline
            displayReportsTimeline();
    }
}

// 時系列表示（デフォルト）
function displayReportsTimeline() {
    const historyList = document.getElementById('history-list');
    
    allReports.forEach(report => {
        const reportDiv = createReportDiv(report);
        historyList.appendChild(reportDiv);
    });
}

// 日別表示
function displayReportsByDate() {
    const historyList = document.getElementById('history-list');
    
    // 日付ごとにグループ化
    const reportsByDate = {};
    allReports.forEach(report => {
        const date = report.date;
        if (!reportsByDate[date]) {
            reportsByDate[date] = [];
        }
        reportsByDate[date].push(report);
    });
    
    // 日付でソート（新しい順）
    const sortedDates = Object.keys(reportsByDate).sort((a, b) => b.localeCompare(a));
    
    sortedDates.forEach(date => {
        const dateSection = document.createElement('div');
        dateSection.className = 'date-section';
        dateSection.innerHTML = `<h3 class="section-header">${date}</h3>`;
        
        const dateReportsList = document.createElement('div');
        dateReportsList.className = 'date-reports-list';
        
        reportsByDate[date].forEach(report => {
            const reportDiv = createReportDiv(report);
            dateReportsList.appendChild(reportDiv);
        });
        
        dateSection.appendChild(dateReportsList);
        historyList.appendChild(dateSection);
    });
}

// ユーザー別表示
function displayReportsByUser() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    // 選択されたユーザーと年月を取得
    const userFilter = document.getElementById('user-filter');
    const selectedUser = userFilter ? userFilter.value : '';
    const userMonthFilter = document.getElementById('user-month-filter');
    const selectedMonth = userMonthFilter ? userMonthFilter.value : '';
    
    // 年月が選択されている場合、カレンダー表示
    if (selectedMonth) {
        displayUserCalendar(selectedMonth, selectedUser);
        return;
    }
    
    // adminユーザーを除外
    const reportsWithoutAdmin = allReports.filter(report => report.username !== 'admin');
    
    // フィルターされた日報を取得
    let filteredReports = reportsWithoutAdmin;
    if (selectedUser) {
        filteredReports = reportsWithoutAdmin.filter(report => report.username === selectedUser);
    }
    
    // 選択されたユーザーがいる場合、そのユーザーの日報のみを表示
    if (selectedUser) {
        filteredReports.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        filteredReports.forEach(report => {
            const reportDiv = createReportDiv(report);
            historyList.appendChild(reportDiv);
        });
    } else {
        // ユーザーが選択されていない場合、ユーザーごとにグループ化して表示
        const reportsByUser = {};
        filteredReports.forEach(report => {
            const username = report.username || '不明';
            if (!reportsByUser[username]) {
                reportsByUser[username] = [];
            }
            reportsByUser[username].push(report);
        });
        
        // ユーザー名でソート
        const sortedUsers = Object.keys(reportsByUser).sort();
        
        sortedUsers.forEach(username => {
            const userSection = document.createElement('div');
            userSection.className = 'user-section';
            userSection.innerHTML = `<h3 class="section-header">ユーザー: ${username}</h3>`;
            
            const userReportsList = document.createElement('div');
            userReportsList.className = 'user-reports-list';
            
            // 日付でソート（新しい順）
            reportsByUser[username].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            
            reportsByUser[username].forEach(report => {
                const reportDiv = createReportDiv(report);
                userReportsList.appendChild(reportDiv);
            });
            
            userSection.appendChild(userReportsList);
            historyList.appendChild(userSection);
        });
    }
}

// ユーザー別カレンダー表示
function displayUserCalendar(yearMonth, selectedUser) {
    const historyList = document.getElementById('history-list');
    
    // 年月を解析
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // adminユーザーを除外して対象月の日報をフィルター
    let monthReports = allReports.filter(report => {
        if (!report.date) return false;
        if (report.username === 'admin') return false; // adminを除外
        const reportDate = new Date(report.date);
        return reportDate.getFullYear() === year && reportDate.getMonth() + 1 === month;
    });
    
    // ユーザーが選択されている場合、そのユーザーの日報のみをフィルター
    if (selectedUser) {
        monthReports = monthReports.filter(report => report.username === selectedUser);
    }
    
    // ユーザーごとに日報の有無をマッピング
    const userReportMap = {};
    monthReports.forEach(report => {
        const username = report.username || '不明';
        if (!userReportMap[username]) {
            userReportMap[username] = new Set();
        }
        const reportDate = new Date(report.date);
        const day = reportDate.getDate();
        userReportMap[username].add(day);
    });
    
    // 表示対象のユーザーリストを取得（adminを除外）
    let users = Object.keys(userReportMap).sort();
    if (selectedUser) {
        users = [selectedUser];
    } else {
        // 全ユーザーから対象月に日報があるユーザーを取得（adminを除外）
        const allUsers = new Set();
        allReports.forEach(report => {
            if (report.username && report.username !== 'admin') {
                const reportDate = new Date(report.date);
                if (reportDate.getFullYear() === year && reportDate.getMonth() + 1 === month) {
                    allUsers.add(report.username);
                }
            }
        });
        users = Array.from(allUsers).sort();
    }
    
    // カレンダーテーブルを作成
    const calendarTable = document.createElement('table');
    calendarTable.className = 'user-calendar-table';
    
    // ヘッダー行（ユーザー名と日付）
    const headerRow = document.createElement('tr');
    const userHeader = document.createElement('th');
    userHeader.className = 'calendar-user-header';
    userHeader.textContent = 'ユーザー';
    headerRow.appendChild(userHeader);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayHeader = document.createElement('th');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        headerRow.appendChild(dayHeader);
    }
    calendarTable.appendChild(headerRow);
    
    // ユーザーごとの行
    users.forEach(username => {
        const userRow = document.createElement('tr');
        
        // ユーザー名のセル
        const userCell = document.createElement('td');
        userCell.className = 'calendar-user-cell';
        userCell.textContent = username;
        userRow.appendChild(userCell);
        
        // 各日付のセル
        const userReports = userReportMap[username] || new Set();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('td');
            dayCell.className = 'calendar-day-cell';
            
            if (userReports.has(day)) {
                dayCell.textContent = '○';
                dayCell.classList.add('has-report');
            } else {
                dayCell.textContent = '×';
                dayCell.classList.add('no-report');
            }
            
            userRow.appendChild(dayCell);
        }
        
        calendarTable.appendChild(userRow);
    });
    
    historyList.appendChild(calendarTable);
}


// プロジェクト別カレンダー表示（削除済み - 関数本体は削除）
function displayProjectCalendar_DELETED(yearMonth, selectedProjectId) {
    // この関数は削除されました
    const historyList = document.getElementById('history-list');
    
    // 年月を解析
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // 対象月の日報をフィルター
    let monthReports = allReports.filter(report => {
        if (!report.date) return false;
        const reportDate = new Date(report.date);
        return reportDate.getFullYear() === year && reportDate.getMonth() + 1 === month;
    });
    
    // レベル2の作業項目のみを取得（登録順を保持）
    const level2Items = allWorkItems.filter(item => item.level === 2);
    
    // 作業項目IDからレベル2の項目IDを取得する関数
    function getLevel2ItemId(itemId) {
        const item = allWorkItems.find(i => i.id === itemId);
        if (!item) return null;
        
        if (item.level === 2) {
            return item.id;
        }
        
        // レベル3以上の場合、レベル2の親を探す
        let currentItem = item;
        while (currentItem && currentItem.level > 2) {
            if (currentItem.parent_id) {
                currentItem = allWorkItems.find(i => i.id === currentItem.parent_id);
            } else {
                break;
            }
        }
        
        if (currentItem && currentItem.level === 2) {
            return currentItem.id;
        }
        
        return null;
    }
    
    // レベル1の出現順序を保持するための配列
    const level1Order = [];
    const seenLevel1 = new Set();
    
    // レベル1ごとにレベル2項目をグループ化（登録順を保持）
    const level1Groups = {};
    
    // allWorkItemsの順序で処理して登録順を保持
    allWorkItems.forEach(item => {
        if (item.level === 2) {
            const level1Item = allWorkItems.find(i => i.id === item.parent_id);
            if (level1Item && level1Item.level === 1) {
                const level1Name = level1Item.name;
                const level1Id = level1Item.id;
                
                // レベル1を初めて見つけた場合、順序配列に追加
                if (!seenLevel1.has(level1Id)) {
                    level1Order.push(level1Name);
                    seenLevel1.add(level1Id);
                    level1Groups[level1Name] = [];
                }
                
                // レベル2項目を追加（重複チェック）
                if (!level1Groups[level1Name].find(i => i.id === item.id)) {
                    level1Groups[level1Name].push(item);
                }
            }
        }
    });
    
    // レベル2項目の順序をallWorkItemsの順序に合わせて再ソート
    level1Order.forEach(level1Name => {
        const level1Item = allWorkItems.find(i => i.level === 1 && i.name === level1Name);
        if (level1Item) {
            // レベル1の子要素（レベル2）をallWorkItemsの順序でソート
            const sortedLevel2Items = [];
            allWorkItems.forEach(item => {
                if (item.level === 2 && item.parent_id === level1Item.id) {
                    const found = level1Groups[level1Name].find(i => i.id === item.id);
                    if (found) {
                        sortedLevel2Items.push(found);
                    }
                }
            });
            level1Groups[level1Name] = sortedLevel2Items;
        }
    });
    
    // プロジェクトごとに、作業項目（レベル2）ごとの記録有無をマッピング
    const projectWorkItemMap = {};
    
    monthReports.forEach(report => {
        if (report.projects && report.projects.length > 0) {
            report.projects.forEach(projectData => {
                const projectId = projectData.project_id;
                
                // プロジェクトが選択されている場合、選択されたプロジェクトのみを処理
                if (selectedProjectId && projectId !== selectedProjectId) {
                    return;
                }
                
                const project = allProjects.find(p => p.id === projectId);
                const projectName = project ? project.name : '不明なプロジェクト';
                
                if (!projectWorkItemMap[projectName]) {
                    projectWorkItemMap[projectName] = new Set();
                }
                
                // このプロジェクトの作業項目を取得
                if (projectData.work_items && projectData.work_items.length > 0) {
                    projectData.work_items.forEach(workItem => {
                        const level2ItemId = getLevel2ItemId(workItem.work_item_id);
                        if (level2ItemId) {
                            projectWorkItemMap[projectName].add(level2ItemId);
                        }
                    });
                }
            });
        }
    });
    
    // 表示対象のプロジェクトリストを取得（カレンダー表示では全てのプロジェクトを表示）
    let projects = [];
    if (selectedProjectId) {
        const selectedProject = allProjects.find(p => p.id === selectedProjectId);
        if (selectedProject) {
            projects = [selectedProject.name];
        }
    } else {
        // 全てのプロジェクトを表示（日報がないプロジェクトも含む）
        projects = allProjects.map(p => p.name).sort();
    }
    
    // カレンダーテーブルを作成
    const calendarTable = document.createElement('table');
    calendarTable.className = 'project-calendar-table';
    
    // マルチインデックスヘッダー行（レベル1用）
    const level1HeaderRow = document.createElement('tr');
    const projectHeaderLevel1 = document.createElement('th');
    projectHeaderLevel1.className = 'calendar-project-header';
    projectHeaderLevel1.textContent = 'プロジェクト';
    projectHeaderLevel1.rowSpan = 2;
    level1HeaderRow.appendChild(projectHeaderLevel1);
    
    const statusHeaderLevel1 = document.createElement('th');
    statusHeaderLevel1.className = 'calendar-status-header';
    statusHeaderLevel1.textContent = 'ステータス';
    statusHeaderLevel1.rowSpan = 2;
    level1HeaderRow.appendChild(statusHeaderLevel1);
    
    level1Order.forEach(level1Name => {
        const level1Header = document.createElement('th');
        level1Header.className = 'calendar-level1-header';
        level1Header.textContent = level1Name;
        level1Header.colSpan = level1Groups[level1Name].length;
        level1HeaderRow.appendChild(level1Header);
    });
    calendarTable.appendChild(level1HeaderRow);
    
    // マルチインデックスヘッダー行（レベル2用）
    const level2HeaderRow = document.createElement('tr');
    level1Order.forEach(level1Name => {
        level1Groups[level1Name].forEach(level2Item => {
            const level2Header = document.createElement('th');
            level2Header.className = 'calendar-workitem-header';
            level2Header.textContent = level2Item.name;
            level2HeaderRow.appendChild(level2Header);
        });
    });
    calendarTable.appendChild(level2HeaderRow);
    
    // プロジェクトごとの行
    projects.forEach(projectName => {
        const projectRow = document.createElement('tr');
        
        // プロジェクト名のセル
        const projectCell = document.createElement('td');
        projectCell.className = 'calendar-project-cell';
        projectCell.textContent = projectName;
        projectRow.appendChild(projectCell);
        
        // ステータスのセル
        const statusCell = document.createElement('td');
        statusCell.className = 'calendar-status-cell';
        const project = allProjects.find(p => p.name === projectName);
        statusCell.textContent = project && project.status ? project.status : '未設定';
        projectRow.appendChild(statusCell);
        
        // 各レベル1グループのレベル2項目のセル
        const projectWorkItems = projectWorkItemMap[projectName] || new Set();
        level1Order.forEach(level1Name => {
            level1Groups[level1Name].forEach(level2Item => {
                const workItemCell = document.createElement('td');
                workItemCell.className = 'calendar-workitem-cell';
                
                if (projectWorkItems.has(level2Item.id)) {
                    workItemCell.textContent = '○';
                    workItemCell.classList.add('has-report');
                } else {
                    workItemCell.textContent = '×';
                    workItemCell.classList.add('no-report');
                }
                
                projectRow.appendChild(workItemCell);
            });
        });
        
        calendarTable.appendChild(projectRow);
    });
    
    historyList.appendChild(calendarTable);
}

// プロジェクト別表示
function displayReportsByProject() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    // 工程ごとにタブで表示
    const workTypesWithProjects = [];
    
    // 各工程について、その工程に関連するプロジェクトを取得
    allWorkTypes.forEach(workType => {
        const projectsWithThisWorkType = allProjects.filter(p => 
            p.work_type_ids && p.work_type_ids.includes(workType.id)
        );
        
        if (projectsWithThisWorkType.length > 0) {
            workTypesWithProjects.push({
                workType: workType,
                projects: projectsWithThisWorkType
            });
        }
    });
    
    if (workTypesWithProjects.length === 0) {
        historyList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">プロジェクトがありません</div></div>';
        return;
    }
    
    // タブとコンテンツを生成
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'work-type-tabs';
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'work-type-tabs-content';
    
    workTypesWithProjects.forEach((wtp, index) => {
        // タブボタン
        const tabBtn = document.createElement('button');
        tabBtn.className = `work-type-tab ${index === 0 ? 'active' : ''}`;
        tabBtn.textContent = wtp.workType.name;
        tabBtn.dataset.workTypeId = wtp.workType.id;
        tabBtn.addEventListener('click', () => {
            // 全てのタブとコンテンツのアクティブ状態を解除
            document.querySelectorAll('.work-type-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.work-type-tab-panel').forEach(p => p.style.display = 'none');
            
            // 選択されたタブとコンテンツをアクティブにする
            tabBtn.classList.add('active');
            const panel = document.getElementById(`work-type-panel-${wtp.workType.id}`);
            if (panel) {
                panel.style.display = 'block';
            }
        });
        tabsContainer.appendChild(tabBtn);
        
        // コンテンツパネル
        const panel = document.createElement('div');
        panel.id = `work-type-panel-${wtp.workType.id}`;
        panel.className = 'work-type-tab-panel';
        panel.style.display = index === 0 ? 'block' : 'none';
        
        // 粒度選択のドロップダウンを追加
        const levelSelectContainer = document.createElement('div');
        levelSelectContainer.className = 'project-view-level-select-container';
        levelSelectContainer.style.marginBottom = '15px';
        levelSelectContainer.style.display = 'flex';
        levelSelectContainer.style.alignItems = 'center';
        levelSelectContainer.style.gap = '10px';
        
        const levelSelectLabel = document.createElement('label');
        levelSelectLabel.textContent = '表示粒度:';
        levelSelectLabel.style.fontWeight = '500';
        levelSelectContainer.appendChild(levelSelectLabel);
        
        const levelSelect = document.createElement('select');
        levelSelect.id = `level-select-${wtp.workType.id}`;
        levelSelect.className = 'project-view-level-select';
        levelSelect.innerHTML = `
            <option value="leaf">最下層</option>
            <option value="1">レベル1</option>
            <option value="2">レベル2</option>
            <option value="3">レベル3</option>
            <option value="4">レベル4</option>
        `;
        levelSelect.value = 'leaf'; // デフォルトは最下層
        levelSelectContainer.appendChild(levelSelect);
        
        panel.appendChild(levelSelectContainer);
        
        // テーブルコンテナを作成
        const tableContainer = document.createElement('div');
        tableContainer.id = `table-container-${wtp.workType.id}`;
        tableContainer.className = 'project-view-table-container';
        
        // この工程の作業項目を取得
        console.log('[displayReportsByProject] 工程ID:', wtp.workType.id, '工程名:', wtp.workType.name);
        console.log('[displayReportsByProject] allWorkItems数:', allWorkItems.length);
        console.log('[displayReportsByProject] allWorkItemsのサンプル（最初の3件）:', allWorkItems.slice(0, 3).map(wi => ({
            id: wi.id,
            name: wi.name,
            work_type_id: wi.work_type_id,
            level: wi.level
        })));
        
        const workItemsForType = allWorkItems.filter(wi => wi.work_type_id === wtp.workType.id);
        console.log('[displayReportsByProject] この工程の作業項目数:', workItemsForType.length);
        
        // 階層順でソートする関数
        const getHierarchyPath = (item) => {
            const path = [];
            let currentItem = item;
            while (currentItem) {
                path.unshift(currentItem.id);
                const parentId = currentItem.parent_id;
                if (parentId) {
                    currentItem = workItemsForType.find(i => i.id === parentId);
                } else {
                    break;
                }
            }
            return path;
        };
        
        const itemIndexMap = {};
        workItemsForType.forEach((item, idx) => {
            itemIndexMap[item.id] = idx;
        });
        
        // プロジェクトと作業項目のマッピングを作成（全ての作業項目を含む）
        const projectWorkItemMap = {}; // {projectId: {workItemId: [dates]}}
        
        allReports.forEach(report => {
            if (!report.projects) return;
            
            report.projects.forEach(projectData => {
                const projectId = projectData.project_id;
                if (!wtp.projects.find(p => p.id === projectId)) return; // この工程に関連するプロジェクトのみ
                
                if (!projectWorkItemMap[projectId]) {
                    projectWorkItemMap[projectId] = {};
                }
                
                if (projectData.work_items) {
                    projectData.work_items.forEach(workItem => {
                        if (workItem.work_type_id === wtp.workType.id) {
                            const workItemId = workItem.work_item_id;
                            if (!projectWorkItemMap[projectId][workItemId]) {
                                projectWorkItemMap[projectId][workItemId] = [];
                            }
                            if (report.date) {
                                projectWorkItemMap[projectId][workItemId].push(report.date);
                            }
                        }
                    });
                }
            });
        });
        
        // テーブルを描画する関数
        const renderTable = (selectedLevel) => {
            // 選択されたレベルに応じて項目をフィルタリング
            let itemsToDisplay = [];
            
            if (selectedLevel === 'leaf') {
                // 最下層の作業項目のみを取得
                itemsToDisplay = workItemsForType.filter(item => {
                    return !workItemsForType.some(other => other.parent_id === item.id);
                });
            } else {
                const levelNum = parseInt(selectedLevel);
                // 指定されたレベルの項目を取得
                itemsToDisplay = workItemsForType.filter(item => item.level === levelNum);
            }
            
            // 階層順でソート
            const sortedItems = itemsToDisplay.sort((a, b) => {
                const pathA = getHierarchyPath(a);
                const pathB = getHierarchyPath(b);
                const minLength = Math.min(pathA.length, pathB.length);
                for (let i = 0; i < minLength; i++) {
                    if (pathA[i] !== pathB[i]) {
                        return (itemIndexMap[pathA[i]] || 0) - (itemIndexMap[pathB[i]] || 0);
                    }
                }
                return pathA.length - pathB.length;
            });
            
            // 既存のテーブルを削除
            const existingTable = tableContainer.querySelector('.project-workitem-table');
            if (existingTable) {
                existingTable.remove();
            }
            
            // テーブルを作成
            const table = document.createElement('table');
            table.className = 'project-workitem-table';
            
            // ヘッダー行
            const headerRow = document.createElement('tr');
            const workItemHeader = document.createElement('th');
            workItemHeader.textContent = '作業項目';
            headerRow.appendChild(workItemHeader);
            
            wtp.projects.forEach(project => {
                const projectHeader = document.createElement('th');
                projectHeader.textContent = project.name;
                headerRow.appendChild(projectHeader);
            });
            
            table.appendChild(headerRow);
            
            // データ行
            if (sortedItems.length === 0) {
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = wtp.projects.length + 1;
                emptyCell.textContent = '作業項目がありません';
                emptyCell.style.textAlign = 'center';
                emptyCell.style.padding = '20px';
                emptyRow.appendChild(emptyCell);
                table.appendChild(emptyRow);
            } else {
                sortedItems.forEach(workItem => {
                    const row = document.createElement('tr');
                    
                    const workItemCell = document.createElement('td');
                    workItemCell.textContent = getWorkItemPath(workItem.id);
                    row.appendChild(workItemCell);
                    
                    wtp.projects.forEach(project => {
                        const projectCell = document.createElement('td');
                        const workItemId = workItem.id;
                        const projectId = project.id;
                        
                        // この項目またはその子孫に作業記録があるか確認
                        const hasReport = checkWorkItemOrDescendants(workItemId, projectId, projectWorkItemMap, workItemsForType);
                        
                        if (hasReport.hasReport) {
                            projectCell.textContent = '○';
                            projectCell.classList.add('has-report');
                            if (hasReport.dates && hasReport.dates.length > 0) {
                                projectCell.dataset.dates = hasReport.dates.join(',');
                            }
                        } else {
                            projectCell.textContent = '×';
                            projectCell.classList.add('no-report');
                        }
                        
                        row.appendChild(projectCell);
                    });
                    
                    table.appendChild(row);
                });
            }
            
            tableContainer.appendChild(table);
        };
        
        // 作業項目またはその子孫に作業記録があるか確認する関数
        const checkWorkItemOrDescendants = (workItemId, projectId, projectWorkItemMap, allItems) => {
            // 直接この項目に作業記録があるか確認
            if (projectWorkItemMap[projectId] && projectWorkItemMap[projectId][workItemId] && projectWorkItemMap[projectId][workItemId].length > 0) {
                return {
                    hasReport: true,
                    dates: projectWorkItemMap[projectId][workItemId]
                };
            }
            
            // 子孫に作業記録があるか確認
            const children = allItems.filter(item => item.parent_id === workItemId);
            const allDates = [];
            
            for (const child of children) {
                const childResult = checkWorkItemOrDescendants(child.id, projectId, projectWorkItemMap, allItems);
                if (childResult.hasReport) {
                    if (childResult.dates) {
                        allDates.push(...childResult.dates);
                    }
                }
            }
            
            if (allDates.length > 0) {
                return {
                    hasReport: true,
                    dates: [...new Set(allDates)] // 重複を除去
                };
            }
            
            return { hasReport: false, dates: [] };
        };
        
        // 初期表示（最下層）
        renderTable('leaf');
        
        // 粒度選択の変更イベント
        levelSelect.addEventListener('change', (e) => {
            const selectedLevel = e.target.value;
            renderTable(selectedLevel);
        });
        
        panel.appendChild(tableContainer);
        
        // 出力ボタンを追加
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-primary export-project-view-btn';
        exportBtn.textContent = 'エクセル出力';
        exportBtn.style.marginTop = '15px';
        exportBtn.onclick = () => exportProjectViewExcel();
        panel.appendChild(exportBtn);
        
        contentContainer.appendChild(panel);
    });
    
    historyList.appendChild(tabsContainer);
    historyList.appendChild(contentContainer);
}

// 日報のdiv要素を作成（共通関数）
function createReportDiv(report) {
    const reportDiv = document.createElement('div');
    reportDiv.className = 'history-item';
    
    let projectsHtml = '';
    if (report.projects && report.projects.length > 0) {
        report.projects.forEach(projectData => {
            const project = allProjects.find(p => p.id === projectData.project_id);
            const projectName = project ? project.name : '不明なプロジェクト';
            
            let workItemsHtml = '';
            if (projectData.work_items && projectData.work_items.length > 0) {
                projectData.work_items.forEach(item => {
                    const workItemName = getWorkItemPath(item.work_item_id);
                    let detailsHtml = '';
                    
                    if (item.minutes) {
                        detailsHtml += `<div>実績工数: ${item.minutes}分`;
                        if (item.target_minutes) {
                            detailsHtml += ` / 目標: ${item.target_minutes}分`;
                        }
                        detailsHtml += `</div>`;
                    }
                    
                    if (item.checklist && item.checklist.length > 0) {
                        const checkedItems = item.checklist.filter(c => c.checked).map(c => c.name);
                        if (checkedItems.length > 0) {
                            detailsHtml += `<div>チェック: ${checkedItems.join(', ')}</div>`;
                        }
                    }
                    
                    workItemsHtml += `
                        <div class="history-work-item">
                            <div class="work-item-name">${workItemName}</div>
                            <div class="work-item-details">${detailsHtml}</div>
                        </div>
                    `;
                });
            }
            
            projectsHtml += `
                <div class="history-project">
                    <div class="project-name"><strong>${projectName}</strong></div>
                    ${workItemsHtml}
                </div>
            `;
        });
    }
    
    // adminユーザーの場合、ユーザー名も表示
    const usernameDisplay = currentUser && currentUser.role === 'admin' && report.username 
        ? `<div class="history-username">ユーザー: ${report.username}</div>` 
        : '';
    
    reportDiv.innerHTML = `
        <div class="history-header">
            <div>
                <div class="history-date">${report.date}</div>
                ${usernameDisplay}
            </div>
            <div class="history-actions">
                ${currentUser && currentUser.role === 'admin' ? '' : `
                    <button class="btn btn-warning" onclick="editReport('${report.id}')">編集</button>
                    <button class="btn btn-danger" onclick="deleteReport('${report.id}')">削除</button>
                `}
            </div>
        </div>
        ${projectsHtml}
    `;
    
    return reportDiv;
}

// プロジェクト別表示用の日報div要素を作成（削除済み）
function createProjectReportDiv_DELETED(report, selectedProject) {
    const reportDiv = document.createElement('div');
    reportDiv.className = 'history-item';
    
    const project = allProjects.find(p => p.id === selectedProject.project_id);
    const projectName = project ? project.name : '不明なプロジェクト';
    
    let workItemsHtml = '';
    if (selectedProject.work_items && selectedProject.work_items.length > 0) {
        selectedProject.work_items.forEach(item => {
            const workItemName = getWorkItemPath(item.work_item_id);
            let detailsHtml = '';
            
            if (item.minutes) {
                detailsHtml += `<div>実績工数: ${item.minutes}分`;
                if (item.target_minutes) {
                    detailsHtml += ` / 目標: ${item.target_minutes}分`;
                }
                detailsHtml += `</div>`;
            }
            
            if (item.checklist && item.checklist.length > 0) {
                const checkedItems = item.checklist.filter(c => c.checked).map(c => c.name);
                if (checkedItems.length > 0) {
                    detailsHtml += `<div>チェック: ${checkedItems.join(', ')}</div>`;
                }
            }
            
            workItemsHtml += `
                <div class="history-work-item">
                    <div class="work-item-name">${workItemName}</div>
                    <div class="work-item-details">${detailsHtml}</div>
                </div>
            `;
        });
    }
    
    // adminユーザーの場合、ユーザー名も表示
    const usernameDisplay = currentUser && currentUser.role === 'admin' && report.username 
        ? `<div class="history-username">ユーザー: ${report.username}</div>` 
        : '';
    
    reportDiv.innerHTML = `
        <div class="history-header">
            <div>
                <div class="history-date">${report.date}</div>
                ${usernameDisplay}
            </div>
            <div class="history-actions">
                ${currentUser && currentUser.role === 'admin' ? '' : `
                    <button class="btn btn-warning" onclick="editReport('${report.id}')">編集</button>
                    <button class="btn btn-danger" onclick="deleteReport('${report.id}')">削除</button>
                `}
            </div>
        </div>
        <div class="history-project">
            ${workItemsHtml}
        </div>
    `;
    
    return reportDiv;
}

// 表示モードタブのイベントリスナーを設定
function setupViewModeTabs() {
    // admin以外のユーザーは表示モードタブを非表示
    const isAdmin = currentUser && currentUser.role === 'admin';
    const viewModeTabsContainer = document.querySelector('.view-mode-tabs');
    if (viewModeTabsContainer) {
        if (!isAdmin) {
            viewModeTabsContainer.style.display = 'none';
        } else {
            viewModeTabsContainer.style.display = 'flex';
        }
    }
    
    // admin以外のユーザーはタブのイベントリスナーを設定しない
    if (!isAdmin) {
        return;
    }
    
    const viewModeTabs = document.querySelectorAll('.view-mode-tab');
    viewModeTabs.forEach(tab => {
        // 既存のイベントリスナーを削除（重複防止）
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        newTab.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            if (mode) {
                currentViewMode = mode;
                
                // タブのアクティブ状態を更新
                document.querySelectorAll('.view-mode-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // フィルターコンテナの表示を切り替え
                updateFilterVisibility();
                
                // フィルターをリセット
                resetFilters();
                
                // 表示を更新
                displayReports();
            }
        });
    });
    
    // 日付カレンダーのイベントリスナー
    const dateCalendar = document.getElementById('date-calendar');
    if (dateCalendar) {
        dateCalendar.addEventListener('change', () => {
            if (currentViewMode === 'date') {
                displayReports();
            }
        });
    }
    
    // ユーザーフィルターのイベントリスナー
    const userFilter = document.getElementById('user-filter');
    if (userFilter) {
        userFilter.addEventListener('change', () => {
            if (currentViewMode === 'user') {
                displayReports();
            }
        });
    }
    
    // ユーザー別表示の年月フィルターのイベントリスナー
    const userMonthFilter = document.getElementById('user-month-filter');
    if (userMonthFilter) {
        // 今月の年月をデフォルトで設定
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        userMonthFilter.value = `${year}-${month}`;
        
        userMonthFilter.addEventListener('change', () => {
            if (currentViewMode === 'user') {
                displayReports();
            }
        });
    }
    
}

// フィルターコンテナの表示を切り替え
function updateFilterVisibility() {
    // admin以外のユーザーはフィルターを表示しない
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // フィルターコンテナを取得
    const dateFilter = document.getElementById('date-filter-container');
    const userFilter = document.getElementById('user-filter-container');
    const projectFilter = document.getElementById('project-filter-container');
    
    // 管理者以外の場合は全てのフィルターを非表示
    if (!isAdmin) {
        if (dateFilter) dateFilter.style.display = 'none';
        if (userFilter) userFilter.style.display = 'none';
        if (projectFilter) projectFilter.style.display = 'none';
        return;
    }
    
    // 全て非表示
    if (dateFilter) dateFilter.style.display = 'none';
    if (userFilter) userFilter.style.display = 'none';
    if (projectFilter) projectFilter.style.display = 'none';
    
    // 現在のモードに応じて表示
    switch (currentViewMode) {
        case 'date':
            if (dateFilter) dateFilter.style.display = 'flex';
            break;
        case 'user':
            if (userFilter) userFilter.style.display = 'flex';
            populateUserFilter();
            break;
    }
}

// フィルターをリセット
function resetFilters() {
    const dateCalendar = document.getElementById('date-calendar');
    const userFilter = document.getElementById('user-filter');
    const userMonthFilter = document.getElementById('user-month-filter');
    
    if (dateCalendar) dateCalendar.value = '';
    if (userFilter) userFilter.value = '';
    
    // 今月の年月をデフォルトで設定
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const defaultMonth = `${year}-${month}`;
    
    if (userMonthFilter) {
        userMonthFilter.value = defaultMonth;
    }
}

// ユーザーフィルターにユーザーリストを設定
function populateUserFilter() {
    const userFilter = document.getElementById('user-filter');
    if (!userFilter) return;
    
    // 既存のオプションをクリア（「全てのユーザー」以外）
    while (userFilter.children.length > 1) {
        userFilter.removeChild(userFilter.lastChild);
    }
    
    // ユーザーリストを取得（adminのみ、全ユーザーの日報を表示する場合）
    // adminユーザーは除外
    if (currentUser && currentUser.role === 'admin') {
        const users = new Set();
        allReports.forEach(report => {
            if (report.username && report.username !== 'admin') {
                users.add(report.username);
            }
        });
        
        const sortedUsers = Array.from(users).sort();
        sortedUsers.forEach(username => {
            const option = document.createElement('option');
            option.value = username;
            option.textContent = username;
            userFilter.appendChild(option);
        });
    }
}

// プロジェクトフィルターにプロジェクトリストを設定（削除済み）
function populateProjectFilter_DELETED() {
    const projectFilter = document.getElementById('project-filter');
    if (!projectFilter) return;
    
    // 既存のオプションをクリア（「全てのプロジェクト」以外）
    while (projectFilter.children.length > 1) {
        projectFilter.removeChild(projectFilter.lastChild);
    }
    
    // プロジェクトリストを設定
    allProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectFilter.appendChild(option);
    });
}

// 作業項目のパスを取得
function getWorkItemPath(itemId) {
    const item = allWorkItems.find(i => i.id === itemId);
    if (!item) return '不明な作業項目';
    
    let path = item.name;
    let currentItem = item;
    
    while (currentItem.parent_id) {
        const parent = allWorkItems.find(i => i.id === currentItem.parent_id);
        if (!parent) break;
        path = parent.name + ' > ' + path;
        currentItem = parent;
    }
    
    return path;
}

// 新規日報追加ボタン
document.getElementById('new-report-btn').addEventListener('click', async () => {
    currentEditingReport = null;
    projectCounter = 0;
    workItemCounter = 0;
    
    // マスターデータを読み込む
    try {
        const [workItemsResult, projectsResult, workTypesResult] = await Promise.all([
            MasterAPI.getWorkItems(),
            MasterAPI.getProjects(),
            MasterAPI.getWorkTypes()
        ]);
        
        allWorkItems = workItemsResult.items || [];
        allProjects = projectsResult.projects || [];
        allWorkTypes = workTypesResult.work_types || [];
        
        // 今日の日付を設定
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('report-date').value = today;
        
        // フォームを表示
        document.getElementById('report-form').style.display = 'block';
        document.getElementById('report-history').style.display = 'none';
        document.getElementById('report-projects-list').innerHTML = '';
        
        // 最初のプロジェクトを追加
        addProjectField();
    } catch (error) {
        alert('マスターデータの読み込みに失敗しました');
    }
});

// プロジェクト追加
document.getElementById('add-report-project-btn').addEventListener('click', () => {
    addProjectField();
});

// プロジェクトフィールドを追加
function addProjectField(data = null) {
    const projectsList = document.getElementById('report-projects-list');
    const projectId = `project-${projectCounter++}`;
    
    const projectDiv = document.createElement('div');
    projectDiv.className = 'project-field';
    projectDiv.id = projectId;
    
    const selectedProjectId = data?.project_id || '';
    
    projectDiv.innerHTML = `
        <div class="project-header">
            <div class="project-select-group">
                <select class="project-select" data-project-id="${projectId}">
                    <option value="">プロジェクトを選択</option>
                    ${allProjects.map(p => `
                        <option value="${p.id}" ${selectedProjectId === p.id ? 'selected' : ''}>${p.name}</option>
                    `).join('')}
                </select>
            </div>
            <button type="button" class="project-remove" onclick="removeProject('${projectId}')">削除</button>
        </div>
        <div class="work-items-container" id="${projectId}-work-items" style="display: none;">
            <h4>作業項目</h4>
            <div class="work-items-list" id="${projectId}-work-items-list"></div>
            <button type="button" class="btn btn-secondary add-work-item-to-project" data-project-id="${projectId}">+ 作業項目追加</button>
        </div>
    `;
    
    projectsList.appendChild(projectDiv);
    
    // プロジェクト選択のイベントリスナー
    const projectSelect = projectDiv.querySelector('.project-select');
    projectSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const workItemsContainer = document.getElementById(`${projectId}-work-items`);
        if (selectedId) {
            workItemsContainer.style.display = 'block';
            // 作業項目リストをクリア（工程選択は各作業項目追加時に実施）
            const workItemsList = document.getElementById(`${projectId}-work-items-list`);
            workItemsList.innerHTML = '';
        } else {
            workItemsContainer.style.display = 'none';
        }
    });
    
    // 作業項目追加ボタンのイベントリスナー
    const addWorkItemBtn = projectDiv.querySelector('.add-work-item-to-project');
    addWorkItemBtn.addEventListener('click', () => {
        addWorkItemToProject(projectId);
    });
    
    // 既存データがある場合、作業項目を追加
    if (data && data.work_items && data.work_items.length > 0) {
        data.work_items.forEach(workItemData => {
            addWorkItemToProject(projectId, workItemData);
        });
    }
    
    // プロジェクトが選択されている場合は作業項目コンテナを表示
    if (selectedProjectId) {
        document.getElementById(`${projectId}-work-items`).style.display = 'block';
    }
}

// プロジェクトに作業項目を追加
function addWorkItemToProject(projectId, data = null) {
    const workItemsList = document.getElementById(`${projectId}-work-items-list`);
    const itemId = `work-item-${workItemCounter++}`;
    
    // プロジェクトを取得して工程を確認
    const projectField = document.getElementById(projectId);
    const projectSelect = projectField ? projectField.querySelector('.project-select') : null;
    const selectedProjectId = projectSelect ? projectSelect.value : null;
    const project = selectedProjectId ? allProjects.find(p => p.id === selectedProjectId) : null;
    
    // 後方互換性: work_type_idがある場合はwork_type_idsに変換
    const workTypeIds = project && project.work_type_ids ? project.work_type_ids : 
        (project && project.work_type_id ? [project.work_type_id] : []);
    
    // 既存データから工程IDを取得（編集時）
    const existingWorkTypeId = data && data.work_type_id ? data.work_type_id : null;
    
    // 工程が1つの場合は自動的に選択、複数の場合は選択ドロップダウンを表示
    const shouldShowWorkTypeSelector = workTypeIds.length > 1 || (workTypeIds.length === 0 && allWorkTypes.length > 1);
    const autoSelectedWorkTypeId = workTypeIds.length === 1 ? workTypeIds[0] : 
        (existingWorkTypeId || null);
    
    const workItemDiv = document.createElement('div');
    workItemDiv.className = 'work-item';
    workItemDiv.id = itemId;
    workItemDiv.dataset.projectId = projectId;
    if (autoSelectedWorkTypeId) {
        workItemDiv.dataset.workTypeId = autoSelectedWorkTypeId;
    }
    
    // 工程選択ドロップダウンを追加（複数工程がある場合のみ）
    let workTypeSelectorHtml = '';
    if (shouldShowWorkTypeSelector) {
        if (workTypeIds.length > 0) {
            // プロジェクトに工程が設定されている場合
            workTypeSelectorHtml = `
                <div class="work-item-work-type-selector">
                    <label>工程:</label>
                    <select class="work-item-work-type-select" id="${itemId}-work-type-select">
                        <option value="">工程を選択してください</option>
                        ${workTypeIds.map(wtId => {
                            const workType = allWorkTypes.find(wt => wt.id === wtId);
                            return workType ? `<option value="${wtId}" ${existingWorkTypeId === wtId ? 'selected' : ''}>${workType.name}</option>` : '';
                        }).join('')}
                    </select>
                </div>
            `;
        } else {
            // プロジェクトに工程が設定されていない場合、全工程から選択
            workTypeSelectorHtml = `
                <div class="work-item-work-type-selector">
                    <label>工程を選択:</label>
                    <select class="work-item-work-type-select" id="${itemId}-work-type-select">
                        <option value="">工程を選択してください</option>
                        ${allWorkTypes.map(wt => 
                            `<option value="${wt.id}" ${existingWorkTypeId === wt.id ? 'selected' : ''}>${wt.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
    }
    
    workItemDiv.innerHTML = `
        <div class="work-item-header">
            <strong>作業項目</strong>
            <div class="work-item-actions">
                <button type="button" class="work-item-copy" onclick="copyWorkItem('${itemId}')" title="コピー">📋</button>
                <button type="button" class="work-item-remove" onclick="removeWorkItem('${itemId}')">削除</button>
            </div>
        </div>
        ${workTypeSelectorHtml}
        <div class="work-item-selects" id="${itemId}-selects"></div>
        <div id="${itemId}-details"></div>
    `;
    
    workItemsList.appendChild(workItemDiv);
    
    // 工程選択のイベントリスナー
    const workTypeSelect = document.getElementById(`${itemId}-work-type-select`);
    if (workTypeSelect) {
        // 既存データがある場合は工程が選択されているので、階層選択を構築
        if (existingWorkTypeId) {
            (async () => {
                await buildHierarchySelects(itemId, data, existingWorkTypeId);
            })();
        }
        
        workTypeSelect.addEventListener('change', async (e) => {
            const selectedWorkTypeId = e.target.value;
            const selectsDiv = document.getElementById(`${itemId}-selects`);
            const detailsDiv = document.getElementById(`${itemId}-details`);
            
            // 工程IDをdata属性に保存
            if (selectedWorkTypeId) {
                workItemDiv.dataset.workTypeId = selectedWorkTypeId;
            } else {
                delete workItemDiv.dataset.workTypeId;
            }
            
            // 既存の選択肢と詳細をクリア
            selectsDiv.innerHTML = '';
            detailsDiv.innerHTML = '';
            
            if (selectedWorkTypeId) {
                // 工程が選択されたら階層選択を構築（buildHierarchySelects内で作業項目を取得）
                await buildHierarchySelects(itemId, data, selectedWorkTypeId);
            }
        });
    } else if (autoSelectedWorkTypeId) {
        // 工程が1つで自動選択された場合、直接階層選択を構築
        buildHierarchySelects(itemId, data, autoSelectedWorkTypeId);
    } else {
        // 工程選択がない場合（工程が設定されていない場合など）は従来通り
        buildHierarchySelects(itemId, data);
    }
}

async function buildHierarchySelects(itemId, data = null, workTypeId = null) {
    const selectsDiv = document.getElementById(`${itemId}-selects`);
    if (!selectsDiv) {
        console.error('[buildHierarchySelects] selectsDivが見つかりません:', itemId);
        return;
    }
    
    console.log('[buildHierarchySelects] 開始', { itemId, workTypeId, data });
    
    selectsDiv.innerHTML = '';
    
    // 工程IDを保存（後で使用するため）
    if (workTypeId) {
        const workItemDiv = document.getElementById(itemId);
        if (workItemDiv) {
            workItemDiv.dataset.workTypeId = workTypeId;
        }
        
        // 工程IDが指定されている場合、その工程の作業項目を取得
        try {
            console.log('[buildHierarchySelects] 工程IDで作業項目を取得中:', workTypeId);
            const workItemsResult = await MasterAPI.getWorkItems(`?work_type_id=${workTypeId}`);
            console.log('[buildHierarchySelects] APIレスポンス:', workItemsResult);
            
            const workItemsForType = workItemsResult.items || [];
            console.log('[buildHierarchySelects] 取得した作業項目数:', workItemsForType.length);
            console.log('[buildHierarchySelects] 取得した作業項目（最初の5件）:', workItemsForType.slice(0, 5));
            
            if (workItemsForType.length === 0) {
                console.warn('[buildHierarchySelects] 作業項目が0件です。工程ID:', workTypeId);
                selectsDiv.innerHTML = '<p style="color: red;">この工程には作業項目が登録されていません</p>';
                return;
            }
            
            // 一時的にallWorkItemsをこの工程の作業項目で置き換えて階層選択を構築
            const originalWorkItems = allWorkItems;
            allWorkItems = workItemsForType;
            
            console.log('[buildHierarchySelects] allWorkItemsを一時的に置き換えました。件数:', allWorkItems.length);
            console.log('[buildHierarchySelects] 置き換えた作業項目のサンプル:', allWorkItems.slice(0, 3).map(i => ({ id: i.id, name: i.name, work_type_id: i.work_type_id, level: i.level })));
            
            // レベル1の選択肢を作成（workTypeIdはnullにして、既にフィルタリング済みのallWorkItemsを使用）
            addLevelSelect(itemId, 1, null, data, null);
            
            // allWorkItemsを元に戻す
            allWorkItems = originalWorkItems;
            console.log('[buildHierarchySelects] allWorkItemsを元に戻しました');
        } catch (error) {
            console.error('[buildHierarchySelects] 作業項目の読み込みに失敗しました:', error);
            selectsDiv.innerHTML = '<p style="color: red;">作業項目の読み込みに失敗しました: ' + error.message + '</p>';
        }
    } else {
        console.log('[buildHierarchySelects] 工程IDが指定されていません。全工程の作業項目を使用します');
        // 工程IDが指定されていない場合は、全工程の作業項目を使用
        addLevelSelect(itemId, 1, null, data, workTypeId);
    }
}

// 親項目が表示可能かどうかを確認する関数（階層的に確認）
function isParentItemVisible(parentId, allItems) {
    if (!parentId) return true; // レベル1の場合は常に表示可能
    
    const parentItem = allItems.find(item => item.id === parentId);
    if (!parentItem) return false; // 親項目が存在しない場合は表示不可
    
    // さらに上位の親を確認
    if (parentItem.parent_id) {
        return isParentItemVisible(parentItem.parent_id, allItems);
    }
    
    return true; // 親項目が存在する場合は表示可能
}

// プロジェクトの工程に基づいて作業項目を読み込む
// 工程選択ドロップダウンを表示
function showWorkTypeSelector(projectId, workTypeIds) {
    const workItemsContainer = document.getElementById(`${projectId}-work-items`);
    const workTypeSelectorContainer = document.getElementById(`${projectId}-work-type-selector`);
    const workTypeSelect = document.getElementById(`${projectId}-work-type-select`);
    
    workItemsContainer.style.display = 'block';
    workTypeSelectorContainer.style.display = 'block';
    
    // 工程選択肢を設定
    workTypeSelect.innerHTML = '<option value="">工程を選択してください</option>';
    workTypeIds.forEach(workTypeId => {
        const workType = allWorkTypes.find(wt => wt.id === workTypeId);
        if (workType) {
            const option = document.createElement('option');
            option.value = workTypeId;
            option.textContent = workType.name;
            workTypeSelect.appendChild(option);
        }
    });
    
    // 工程選択のイベントリスナー
    workTypeSelect.onchange = (e) => {
        const selectedWorkTypeId = e.target.value;
        if (selectedWorkTypeId) {
            loadWorkItemsForProject(selectedWorkTypeId, projectId);
        } else {
            const workItemsList = document.getElementById(`${projectId}-work-items-list`);
            workItemsList.innerHTML = '';
        }
    };
}

async function loadWorkItemsForProject(workTypeId, projectId) {
    try {
        let workItemsResult;
        if (workTypeId) {
            workItemsResult = await MasterAPI.getWorkItems(`?work_type_id=${workTypeId}`);
        } else {
            workItemsResult = await MasterAPI.getWorkItems();
        }
        
        // このプロジェクトの作業項目コンテナ内の作業項目を更新
        const workItemsContainer = document.getElementById(`${projectId}-work-items-list`);
        const existingWorkItems = workItemsContainer.querySelectorAll('.work-item');
        
        // 既存の作業項目を一時的に保持
        const existingData = [];
        existingWorkItems.forEach(workItemDiv => {
            const selects = workItemDiv.querySelectorAll('.level-select');
            if (selects.length > 0) {
                const selectedIds = Array.from(selects).map(s => s.value).filter(v => v);
                if (selectedIds.length > 0) {
                    existingData.push({ hierarchy: selectedIds });
                }
            }
        });
        
        // 作業項目リストをクリア
        workItemsContainer.innerHTML = '';
        
        // フィルタリングされた作業項目を設定
        const projectWorkItems = workItemsResult.items || [];
        
        // 既存の作業項目を再構築（可能な場合）
        if (existingData.length > 0) {
            existingData.forEach(data => {
                addWorkItemToProject(projectId, data);
            });
        }
    } catch (error) {
        console.error('作業項目の読み込みに失敗しました:', error);
    }
}

function addLevelSelect(itemId, level, parentId, data = null, workTypeId = null) {
    const selectsDiv = document.getElementById(`${itemId}-selects`);
    if (!selectsDiv) {
        console.error('[addLevelSelect] selectsDivが見つかりません:', itemId);
        return;
    }
    
    console.log('[addLevelSelect] 開始', { itemId, level, parentId, workTypeId, allWorkItemsCount: allWorkItems.length });
    
    // 工程IDを取得（引数で指定されていない場合は、作業項目のdata属性から取得）
    if (!workTypeId) {
        const workItemDiv = document.getElementById(itemId);
        if (workItemDiv) {
            workTypeId = workItemDiv.dataset.workTypeId || null;
            console.log('[addLevelSelect] data属性から工程IDを取得:', workTypeId);
        }
    }
    
    // buildHierarchySelectsで既に工程IDでフィルタリングされたallWorkItemsが設定されている場合、
    // 再度フィルタリングする必要はない
    // ただし、workTypeIdが指定されていて、allWorkItemsに異なる工程IDの項目が含まれている場合はフィルタリング
    let filteredWorkItems = allWorkItems;
    console.log('[addLevelSelect] フィルタリング前の作業項目数:', filteredWorkItems.length);
    
    // allWorkItemsに複数の工程IDが含まれているか確認
    const uniqueWorkTypeIds = [...new Set(allWorkItems.map(item => item.work_type_id).filter(id => id))];
    console.log('[addLevelSelect] allWorkItemsに含まれる工程ID:', uniqueWorkTypeIds);
    
    // 工程IDでフィルタリング（allWorkItemsに複数の工程IDが含まれている場合のみ）
    if (workTypeId && uniqueWorkTypeIds.length > 1) {
        filteredWorkItems = allWorkItems.filter(item => item.work_type_id === workTypeId);
        console.log('[addLevelSelect] 工程IDでフィルタリング後:', {
            workTypeId,
            filteredCount: filteredWorkItems.length,
            sampleItems: filteredWorkItems.slice(0, 3).map(i => ({ id: i.id, name: i.name, work_type_id: i.work_type_id, level: i.level }))
        });
        
        // work_type_idが一致しない項目があるか確認
        const mismatchedItems = allWorkItems.filter(item => item.work_type_id !== workTypeId).slice(0, 3);
        if (mismatchedItems.length > 0) {
            console.log('[addLevelSelect] 工程IDが一致しない項目（サンプル）:', mismatchedItems.map(i => ({ id: i.id, name: i.name, work_type_id: i.work_type_id })));
        }
    } else {
        console.log('[addLevelSelect] フィルタリングをスキップ（既にフィルタリング済み、または工程IDが1つのみ）');
    }
    
    // 指定された親IDの子要素を取得
    let items = filteredWorkItems.filter(item => 
        item.level === level && item.parent_id === parentId
    );
    
    console.log('[addLevelSelect] レベルと親IDでフィルタリング後:', {
        level,
        parentId,
        itemsCount: items.length,
        sampleItems: items.slice(0, 3).map(i => ({ id: i.id, name: i.name, level: i.level, parent_id: i.parent_id }))
    });
    
    // 階層的なフィルタリング：親項目が表示可能か確認
    if (level > 1 && parentId) {
        // 親項目がfilteredWorkItemsに含まれているか確認（親項目がフィルタリングされていないか）
        const parentItem = filteredWorkItems.find(item => item.id === parentId);
        if (!parentItem) {
            console.warn('[addLevelSelect] 親項目が見つかりません:', parentId);
            // 親項目がフィルタリングされている場合は子項目も表示しない
            items = [];
        } else {
            console.log('[addLevelSelect] 親項目を確認:', { parentId, parentName: parentItem.name });
            // さらに上位の親も確認
            if (!isParentItemVisible(parentId, filteredWorkItems)) {
                console.warn('[addLevelSelect] 親項目が表示不可:', parentId);
                items = [];
            }
        }
    }
    
    if (items.length === 0 && level === 1) {
        console.error('[addLevelSelect] レベル1の作業項目が見つかりません', {
            workTypeId,
            allWorkItemsCount: allWorkItems.length,
            filteredWorkItemsCount: filteredWorkItems.length,
            allWorkItemsSample: allWorkItems.slice(0, 5).map(i => ({ id: i.id, name: i.name, work_type_id: i.work_type_id, level: i.level, parent_id: i.parent_id }))
        });
        selectsDiv.innerHTML = '<p style="color: red;">作業項目が登録されていません</p>';
        return;
    }
    
    if (items.length === 0) {
        // これ以上階層がない場合、詳細を表示
        if (parentId) {
            showWorkItemDetails(itemId, parentId, data);
        }
        return;
    }
    
    const selectDiv = document.createElement('div');
    selectDiv.className = 'form-group hierarchy-select';
    
    const select = document.createElement('select');
    select.className = 'level-select';
    select.dataset.level = level;
    select.dataset.itemId = itemId;
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `レベル${level}を選択`;
    select.appendChild(defaultOption);
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        if (data && data.hierarchy && data.hierarchy[level - 1] === item.id) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        
        // この選択以降の選択肢をクリア
        const allSelects = selectsDiv.querySelectorAll('.level-select');
        let shouldRemove = false;
        allSelects.forEach(s => {
            if (shouldRemove) {
                s.parentElement.remove();
            }
            if (s === select) {
                shouldRemove = true;
            }
        });
        
        // 詳細をクリア
        document.getElementById(`${itemId}-details`).innerHTML = '';
        
        if (selectedId) {
            // 工程IDを取得
            const workItemDiv = document.getElementById(itemId);
            const workTypeId = workItemDiv ? workItemDiv.dataset.workTypeId : null;
            // 次のレベルを追加
            addLevelSelect(itemId, level + 1, selectedId, data, workTypeId);
        }
    });
    
    selectDiv.appendChild(select);
    selectsDiv.appendChild(selectDiv);
    
    // データがある場合、次のレベルも構築
    if (data && data.hierarchy && data.hierarchy[level - 1]) {
        const workItemDiv = document.getElementById(itemId);
        const workTypeIdForNext = workItemDiv ? workItemDiv.dataset.workTypeId : null;
        addLevelSelect(itemId, level + 1, data.hierarchy[level - 1], data, workTypeIdForNext);
    }
}

function showWorkItemDetails(itemId, workItemId, data = null) {
    const detailsDiv = document.getElementById(`${itemId}-details`);
    const workItem = allWorkItems.find(i => i.id === workItemId);
    
    if (!workItem) return;
    
    let detailsHtml = '';
    
    // 属性がサイクルタイムの場合
    if (workItem.attribute === 'サイクルタイム') {
        detailsHtml += `
            <div class="form-group">
                <label>目標工数: ${workItem.target_minutes || 0}分</label>
                <label>実績工数（分）</label>
                <input type="number" class="work-item-minutes" min="0" value="${data?.minutes || ''}" required>
            </div>
        `;
    }
    
    // チェックリスト
    if (workItem.checklist && workItem.checklist.length > 0) {
        detailsHtml += '<div class="checklist"><strong>チェックリスト</strong>';
        workItem.checklist.forEach((item, index) => {
            const checked = data?.checklist?.find(c => c.name === item)?.checked || false;
            detailsHtml += `
                <div class="checklist-item">
                    <input type="checkbox" id="${itemId}-check-${index}" value="${item}" ${checked ? 'checked' : ''}>
                    <label for="${itemId}-check-${index}">${item}</label>
                </div>
            `;
        });
        detailsHtml += '</div>';
    }
    
    detailsDiv.innerHTML = detailsHtml;
    detailsDiv.dataset.workItemId = workItemId;
}

function removeWorkItem(itemId) {
    document.getElementById(itemId).remove();
}

// 作業項目をコピー（最下層-1階層まで選択された状態で追加）
function copyWorkItem(itemId) {
    const workItemDiv = document.getElementById(itemId);
    if (!workItemDiv) return;
    
    // 現在の作業項目の階層を取得
    const selects = workItemDiv.querySelectorAll('.level-select');
    const hierarchy = [];
    let workTypeId = null;
    
    // 工程IDを取得
    const workTypeSelect = workItemDiv.querySelector('.work-item-work-type-select');
    if (workTypeSelect) {
        workTypeId = workTypeSelect.value;
    } else {
        // 工程選択がない場合、data属性から取得
        workTypeId = workItemDiv.dataset.workTypeId || null;
    }
    
    // 選択された階層を取得（最下層-1階層まで）
    let lastSelectedIndex = -1;
    selects.forEach((select, index) => {
        if (select.value) {
            hierarchy.push(select.value);
            lastSelectedIndex = index;
        }
    });
    
    // 最下層-1階層まで取得（最後の選択を除く）
    if (hierarchy.length > 1) {
        hierarchy.pop(); // 最下層を削除
    } else if (hierarchy.length === 1) {
        // レベル1のみの場合、空にする
        hierarchy.length = 0;
    }
    
    // プロジェクトIDを取得
    const projectId = workItemDiv.closest('.project-field')?.id;
    if (!projectId) return;
    
    // 新しい作業項目を追加（階層情報を渡す）
    const copyData = {
        hierarchy: hierarchy,
        work_type_id: workTypeId
    };
    
    addWorkItemToProject(projectId, copyData);
}

function removeProject(projectId) {
    document.getElementById(projectId).remove();
}

// 日報完了
document.getElementById('submit-report-btn').addEventListener('click', async () => {
    const date = document.getElementById('report-date').value;
    
    if (!date) {
        alert('日付を選択してください');
        return;
    }
    
    // プロジェクトごとのデータを収集
    const projectsList = document.getElementById('report-projects-list');
    const projectDivs = projectsList.querySelectorAll('.project-field');
    
    const projects = [];
    let hasError = false;
    
    projectDivs.forEach(projectDiv => {
        const projectId = projectDiv.id;
        const projectSelect = projectDiv.querySelector('.project-select');
        const selectedProjectId = projectSelect?.value;
        
        if (!selectedProjectId) {
            alert('全てのプロジェクトを選択してください');
            hasError = true;
            return;
        }
        
        // このプロジェクトの作業項目を収集
        const workItemsList = projectDiv.querySelector('.work-items-list');
        const workItemDivs = workItemsList.querySelectorAll('.work-item');
        
        const workItems = [];
        
        workItemDivs.forEach(div => {
            const detailsDiv = div.querySelector('[id$="-details"]');
            const workItemId = detailsDiv?.dataset.workItemId;
            
            if (!workItemId) {
                alert('全ての作業項目を選択してください');
                hasError = true;
                return;
            }
            
            // 工程IDを取得（工程選択ドロップダウンから、またはdata属性から）
            const workTypeSelect = div.querySelector('.work-item-work-type-select');
            let workTypeId = workTypeSelect ? workTypeSelect.value : null;
            
            // 工程選択ドロップダウンがない場合（工程が1つで自動選択された場合）、data属性から取得
            if (!workTypeId) {
                workTypeId = div.dataset.workTypeId || null;
            }
            
            if (!workTypeId) {
                alert('全ての作業項目で工程を選択してください');
                hasError = true;
                return;
            }
            
            const workItem = allWorkItems.find(i => i.id === workItemId);
            const itemData = {
                work_item_id: workItemId,
                work_type_id: workTypeId,
                hierarchy: []
            };
            
            // 階層情報を収集
            const selects = div.querySelectorAll('.level-select');
            selects.forEach(select => {
                if (select.value) {
                    itemData.hierarchy.push(select.value);
                }
            });
            
            // 工数
            const minutesInput = detailsDiv.querySelector('.work-item-minutes');
            if (minutesInput) {
                const minutes = parseInt(minutesInput.value);
                if (!minutes || minutes <= 0) {
                    alert('工数を入力してください');
                    hasError = true;
                    return;
                }
                itemData.minutes = minutes;
                itemData.target_minutes = workItem.target_minutes;
            }
            
            // チェックリスト
            const checkboxes = detailsDiv.querySelectorAll('.checklist-item input[type="checkbox"]');
            if (checkboxes.length > 0) {
                const checkedItems = Array.from(checkboxes).filter(cb => cb.checked);
                if (checkedItems.length === 0) {
                    alert('チェックリストから1つ以上選択してください');
                    hasError = true;
                    return;
                }
                itemData.checklist = Array.from(checkboxes).map(cb => ({
                    name: cb.value,
                    checked: cb.checked
                }));
            }
            
            workItems.push(itemData);
        });
        
        if (hasError) return;
        
        if (workItems.length === 0) {
            alert('各プロジェクトに作業項目を1つ以上追加してください');
            hasError = true;
            return;
        }
        
        projects.push({
            project_id: selectedProjectId,
            work_items: workItems
        });
    });
    
    if (hasError) return;
    
    if (projects.length === 0) {
        alert('プロジェクトを1つ以上追加してください');
        return;
    }
    
    try {
        const reportData = {
            date,
            projects: projects
        };
        
        if (currentEditingReport) {
            reportData.id = currentEditingReport;
            await ReportAPI.update(reportData);
        } else {
            await ReportAPI.add(reportData);
        }
        
        // 達成アニメーション表示
        showAchievementAnimation();
        
        // フォームをリセット
        cancelReportForm();
        
        // 日報一覧を再読み込み
        await loadReports();
    } catch (error) {
        alert('日報の保存に失敗しました: ' + error.message);
    }
});

// キャンセル
document.getElementById('cancel-report-btn').addEventListener('click', () => {
    cancelReportForm();
});

function cancelReportForm() {
    document.getElementById('report-form').style.display = 'none';
    document.getElementById('report-history').style.display = 'block';
    currentEditingReport = null;
}

// 達成アニメーション
function showAchievementAnimation() {
    const animation = document.getElementById('achievement-animation');
    animation.style.display = 'flex';
    
    setTimeout(() => {
        animation.style.display = 'none';
    }, 2000);
}

// 日報編集
async function editReport(reportId) {
    currentEditingReport = reportId;
    const report = allReports.find(r => r.id === reportId);
    
    if (!report) return;
    
    // マスターデータを読み込む
    try {
        const [workItemsResult, projectsResult] = await Promise.all([
            MasterAPI.getWorkItems(),
            MasterAPI.getProjects()
        ]);
        
        allWorkItems = workItemsResult.items || [];
        allProjects = projectsResult.projects || [];
        
        // フォームを表示
        document.getElementById('report-form').style.display = 'block';
        document.getElementById('report-history').style.display = 'none';
        
        // データを設定
        document.getElementById('report-date').value = report.date;
        document.getElementById('report-projects-list').innerHTML = '';
        
        projectCounter = 0;
        workItemCounter = 0;
        
        // 旧形式（work_items）と新形式（projects）の両方に対応
        if (report.projects && report.projects.length > 0) {
            // 新形式
            report.projects.forEach(projectData => {
                addProjectField(projectData);
            });
        } else if (report.work_items && report.work_items.length > 0) {
            // 旧形式：プロジェクトごとにグループ化
            const projectGroups = {};
            report.work_items.forEach(item => {
                const projectId = item.project_id || 'no-project';
                if (!projectGroups[projectId]) {
                    projectGroups[projectId] = {
                        project_id: projectId === 'no-project' ? '' : projectId,
                        work_items: []
                    };
                }
                projectGroups[projectId].work_items.push(item);
            });
            
            Object.values(projectGroups).forEach(projectData => {
                addProjectField(projectData);
            });
        }
    } catch (error) {
        alert('マスターデータの読み込みに失敗しました');
    }
}

// プロジェクト別表示をエクセル出力
async function exportProjectViewExcel() {
    try {
        const response = await ReportAPI.exportProjectView();
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'エクスポートに失敗しました');
        }
        
        // ファイルをダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Content-Dispositionヘッダーからファイル名を取得
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'プロジェクト別表示.xlsx';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('エクセルファイルを出力しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 日報削除
async function deleteReport(reportId) {
    if (!confirm('この日報を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        await ReportAPI.delete(reportId);
        await loadReports();
    } catch (error) {
        alert('日報の削除に失敗しました');
    }
}


