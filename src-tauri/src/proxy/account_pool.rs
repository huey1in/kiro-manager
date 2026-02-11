// 账号池管理
use super::types::ProxyAccount;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// 账号池
pub struct AccountPool {
    accounts: Arc<Mutex<HashMap<String, ProxyAccount>>>,
    current_index: Arc<Mutex<usize>>,
}

impl AccountPool {
    /// 创建新的账号池
    pub fn new() -> Self {
        Self {
            accounts: Arc::new(Mutex::new(HashMap::new())),
            current_index: Arc::new(Mutex::new(0)),
        }
    }

    /// 添加账号
    pub fn add_account(&self, account: ProxyAccount) {
        let mut accounts = self.accounts.lock().unwrap();
        accounts.insert(account.id.clone(), account);
    }

    /// 批量添加账号
    pub fn add_accounts(&self, new_accounts: Vec<ProxyAccount>) {
        let mut accounts = self.accounts.lock().unwrap();
        for account in new_accounts {
            accounts.insert(account.id.clone(), account);
        }
    }

    /// 移除账号
    pub fn remove_account(&self, account_id: &str) {
        let mut accounts = self.accounts.lock().unwrap();
        accounts.remove(account_id);
    }

    /// 清空所有账号
    pub fn clear(&self) {
        let mut accounts = self.accounts.lock().unwrap();
        accounts.clear();
        let mut index = self.current_index.lock().unwrap();
        *index = 0;
    }

    /// 获取指定账号
    pub fn get_account(&self, account_id: &str) -> Option<ProxyAccount> {
        let accounts = self.accounts.lock().unwrap();
        accounts.get(account_id).cloned()
    }

    /// 获取所有账号
    pub fn get_all_accounts(&self) -> Vec<ProxyAccount> {
        let accounts = self.accounts.lock().unwrap();
        accounts.values().cloned().collect()
    }

    /// 获取可用账号数量
    pub fn get_available_count(&self) -> usize {
        let accounts = self.accounts.lock().unwrap();
        accounts.values().filter(|acc| acc.is_available).count()
    }

    /// 获取下一个可用账号（轮询）
    pub fn get_next_account(&self) -> Option<ProxyAccount> {
        let accounts = self.accounts.lock().unwrap();
        let available: Vec<_> = accounts
            .values()
            .filter(|acc| acc.is_available)
            .collect();

        if available.is_empty() {
            return None;
        }

        let mut index = self.current_index.lock().unwrap();
        let account = available[*index % available.len()].clone();
        *index = (*index + 1) % available.len();

        Some(account)
    }

    /// 获取下一个可用账号（排除指定账号）
    pub fn get_next_available_account(&self, exclude_id: &str) -> Option<ProxyAccount> {
        let accounts = self.accounts.lock().unwrap();
        let available: Vec<_> = accounts
            .values()
            .filter(|acc| acc.is_available && acc.id != exclude_id)
            .collect();

        if available.is_empty() {
            return None;
        }

        available.first().map(|acc| (*acc).clone())
    }

    /// 更新账号信息
    pub fn update_account(&self, account_id: &str, updates: ProxyAccount) {
        let mut accounts = self.accounts.lock().unwrap();
        if let Some(account) = accounts.get_mut(account_id) {
            *account = updates;
        }
    }

    /// 标记账号需要刷新
    pub fn mark_needs_refresh(&self, account_id: &str) {
        let mut accounts = self.accounts.lock().unwrap();
        if let Some(account) = accounts.get_mut(account_id) {
            account.is_available = false;
        }
    }

    /// 记录账号错误
    pub fn record_error(&self, account_id: &str, is_quota_error: bool) {
        let mut accounts = self.accounts.lock().unwrap();
        if let Some(account) = accounts.get_mut(account_id) {
            account.error_count += 1;
            if is_quota_error {
                account.is_available = false;
            }
        }
    }

    /// 记录账号使用
    pub fn record_usage(&self, account_id: &str) {
        let mut accounts = self.accounts.lock().unwrap();
        if let Some(account) = accounts.get_mut(account_id) {
            account.request_count += 1;
            account.last_used = Some(chrono::Utc::now().timestamp_millis());
        }
    }

    /// 更新账号 Token
    pub fn update_token(
        &self,
        account_id: &str,
        access_token: String,
        refresh_token: Option<String>,
        expires_at: Option<i64>,
    ) {
        let mut accounts = self.accounts.lock().unwrap();
        if let Some(account) = accounts.get_mut(account_id) {
            account.access_token = access_token;
            if let Some(rt) = refresh_token {
                account.refresh_token = Some(rt);
            }
            account.expires_at = expires_at;
            account.is_available = true;
        }
    }
}

impl Default for AccountPool {
    fn default() -> Self {
        Self::new()
    }
}
