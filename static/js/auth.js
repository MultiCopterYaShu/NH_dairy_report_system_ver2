// 認証機能

let currentUser = null;

async function checkAuth() {
    try {
        const result = await AuthAPI.check();
        if (result.logged_in) {
            currentUser = {
                username: result.username,
                role: result.role,
                担当種別: result.担当種別
            };
            showMainScreen();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('main-screen').style.display = 'none';
}

function showMainScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    
    // ユーザー情報表示
    document.getElementById('user-info').textContent = `${currentUser.username} さん`;
    
    // 管理者の場合は管理ボタンを表示、それ以外は非表示
    const adminBtn = document.getElementById('admin-btn');
    if (currentUser.role === 'admin') {
        adminBtn.style.display = 'inline-block';
    } else {
        adminBtn.style.display = 'none';
    }
    
    // 日報画面を表示
    showReportScreen();
    loadReports();
}

function showReportScreen() {
    document.getElementById('report-screen').style.display = 'block';
    document.getElementById('admin-screen').style.display = 'none';
    
    // adminユーザーの場合は日報入力画面を非表示
    const newReportBtn = document.getElementById('new-report-btn');
    if (currentUser && currentUser.role === 'admin') {
        if (newReportBtn) {
            newReportBtn.style.display = 'none';
        }
    } else {
        if (newReportBtn) {
            newReportBtn.style.display = 'inline-block';
        }
    }
    
    // 表示モードタブのイベントリスナーを設定（reports.jsで定義）
    if (typeof setupViewModeTabs === 'function') {
        setupViewModeTabs();
    }
}

function showAdminScreen() {
    document.getElementById('report-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = 'block';
    loadAdminData();
}

// ログインフォーム送信
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const result = await AuthAPI.login(username, password);
        if (result.success) {
            currentUser = {
                username: result.username,
                role: result.role,
                担当種別: result.担当種別
            };
            showMainScreen();
        }
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// ログアウト
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await AuthAPI.logout();
        currentUser = null;
        showLoginScreen();
    } catch (error) {
        alert('ログアウトに失敗しました');
    }
});

// 管理画面へ
document.getElementById('admin-btn').addEventListener('click', () => {
    showAdminScreen();
});

// 日報画面に戻る
document.getElementById('back-to-reports').addEventListener('click', () => {
    showReportScreen();
    loadReports();
});

