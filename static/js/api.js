// API通信用の共通関数

const API_BASE = '/api';

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'エラーが発生しました');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// 認証API
const AuthAPI = {
    login: (username, password) => apiCall('/auth/login', 'POST', { username, password }),
    logout: () => apiCall('/auth/logout', 'POST'),
    check: () => apiCall('/auth/check', 'GET')
};

// アカウントAPI
const AccountAPI = {
    getAll: () => apiCall('/accounts/', 'GET'),
    add: (data) => apiCall('/accounts/add', 'POST', data),
    update: (data) => apiCall('/accounts/update', 'PUT', data),
    delete: (username) => apiCall('/accounts/delete', 'DELETE', { username })
};

// マスターAPI
const MasterAPI = {
    // 作業項目
    getWorkItems: (query = '') => apiCall(`/masters/work-items${query}`, 'GET'),
    saveWorkItems: (data) => apiCall('/masters/work-items', 'POST', data),
    addWorkItem: (data) => apiCall('/masters/work-items/add', 'POST', data),
    updateWorkItem: (data) => apiCall('/masters/work-items/update', 'PUT', data),
    deleteWorkItem: (data) => apiCall('/masters/work-items/delete', 'DELETE', data),
    
    // 担当種別
    getJobCategories: () => apiCall('/masters/job-categories', 'GET'),
    saveJobCategories: (data) => apiCall('/masters/job-categories', 'POST', data),
    
    // プロジェクト
    getProjects: () => apiCall('/masters/projects', 'GET'),
    addProject: (data) => apiCall('/masters/projects/add', 'POST', data),
    updateProject: (data) => apiCall('/masters/projects/update', 'PUT', data),
    deleteProject: (id) => apiCall('/masters/projects/delete', 'DELETE', { id }),
    exportProject: (projectId, formatType = 'user') => {
        // ファイルダウンロードのため、apiCallを使わずに直接fetchを使用
        return fetch(`${API_BASE}/masters/projects/export?project_id=${projectId}&format=${formatType}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
    },
    
    // 工程
    getWorkTypes: () => apiCall('/masters/work-types', 'GET'),
    addWorkType: (data) => apiCall('/masters/work-types/add', 'POST', data),
    updateWorkType: (data) => apiCall('/masters/work-types/update', 'PUT', data),
    deleteWorkType: (id) => apiCall('/masters/work-types/delete', 'DELETE', { id }),
    updateWorkTypesOrder: (data) => apiCall('/masters/work-types/update-order', 'PUT', data)
};

    // 日報API
const ReportAPI = {
    getAll: () => apiCall('/reports/', 'GET'),
    getAllUsers: () => apiCall('/reports/all', 'GET'),  // admin専用
    add: (data) => apiCall('/reports/add', 'POST', data),
    update: (data) => apiCall('/reports/update', 'PUT', data),
    delete: (id) => apiCall('/reports/delete', 'DELETE', { id }),
    getByDate: (date) => apiCall(`/reports/date/${date}`, 'GET'),
    exportProjectView: () => {
        // ファイルダウンロードのため、apiCallを使わずに直接fetchを使用
        return fetch(`${API_BASE}/masters/reports/export-project-view`, {
            method: 'GET',
            credentials: 'same-origin'
        });
    }
};

