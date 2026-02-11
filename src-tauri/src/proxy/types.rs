// 反代服务类型定义
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 代理账号信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyAccount {
    pub id: String,
    pub email: Option<String>,
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: Option<String>,
    #[serde(rename = "profileArn")]
    pub profile_arn: Option<String>,
    #[serde(rename = "expiresAt")]
    pub expires_at: Option<i64>,
    #[serde(rename = "clientId")]
    pub client_id: Option<String>,
    #[serde(rename = "clientSecret")]
    pub client_secret: Option<String>,
    pub region: Option<String>,
    #[serde(rename = "authMethod")]
    pub auth_method: Option<String>,
    #[serde(default)]
    #[serde(rename = "isAvailable")]
    pub is_available: bool,
    #[serde(default)]
    #[serde(rename = "lastUsed")]
    pub last_used: Option<i64>,
    #[serde(default)]
    #[serde(rename = "requestCount")]
    pub request_count: u64,
    #[serde(default)]
    #[serde(rename = "errorCount")]
    pub error_count: u64,
}

/// API Key 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub key: String,
    pub enabled: bool,
    #[serde(default)]
    #[serde(rename = "creditsLimit")]
    pub credits_limit: Option<f64>,
    #[serde(default)]
    pub usage: ApiKeyUsage,
    #[serde(default)]
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(default)]
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: Option<i64>,
}

/// API Key 用量统计
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ApiKeyUsage {
    #[serde(default)]
    #[serde(rename = "totalRequests")]
    pub total_requests: u64,
    #[serde(default)]
    #[serde(rename = "totalCredits")]
    pub total_credits: f64,
    #[serde(default)]
    #[serde(rename = "totalInputTokens")]
    pub total_input_tokens: u64,
    #[serde(default)]
    #[serde(rename = "totalOutputTokens")]
    pub total_output_tokens: u64,
    #[serde(default)]
    pub daily: HashMap<String, DailyUsage>,
    #[serde(default)]
    #[serde(rename = "byModel")]
    pub by_model: HashMap<String, ModelUsage>,
}

/// 每日用量
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyUsage {
    pub requests: u64,
    pub credits: f64,
    #[serde(rename = "inputTokens")]
    pub input_tokens: u64,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u64,
}

/// 模型用量
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModelUsage {
    pub requests: u64,
    pub credits: f64,
    #[serde(rename = "inputTokens")]
    pub input_tokens: u64,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u64,
}

/// 模型映射规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMappingRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    #[serde(rename = "type")]
    pub rule_type: String, // "replace" | "alias" | "loadbalance"
    #[serde(rename = "sourceModel")]
    pub source_model: String,
    #[serde(rename = "targetModels")]
    pub target_models: Vec<String>,
    #[serde(default)]
    pub weights: Option<Vec<u32>>,
    pub priority: u32,
    #[serde(default)]
    #[serde(rename = "apiKeyIds")]
    pub api_key_ids: Option<Vec<String>>,
}

/// 代理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub enabled: bool,
    pub port: u16,
    pub host: String,
    #[serde(default)]
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    #[serde(default)]
    #[serde(rename = "apiKeys")]
    pub api_keys: Option<Vec<ApiKey>>,
    #[serde(rename = "enableMultiAccount")]
    pub enable_multi_account: bool,
    #[serde(default)]
    #[serde(rename = "selectedAccountIds")]
    pub selected_account_ids: Vec<String>,
    #[serde(rename = "logRequests")]
    pub log_requests: bool,
    #[serde(default)]
    #[serde(rename = "maxRetries")]
    pub max_retries: Option<u32>,
    #[serde(default)]
    #[serde(rename = "preferredEndpoint")]
    pub preferred_endpoint: Option<String>,
    #[serde(default)]
    #[serde(rename = "autoStart")]
    pub auto_start: Option<bool>,
    #[serde(default)]
    #[serde(rename = "autoContinueRounds")]
    pub auto_continue_rounds: Option<u32>,
    #[serde(default)]
    #[serde(rename = "disableTools")]
    pub disable_tools: Option<bool>,
    #[serde(default)]
    #[serde(rename = "autoSwitchOnQuotaExhausted")]
    pub auto_switch_on_quota_exhausted: Option<bool>,
    #[serde(default)]
    #[serde(rename = "modelMappings")]
    pub model_mappings: Option<Vec<ModelMappingRule>>,
    #[serde(default = "default_true")]
    #[serde(rename = "enableOpenAI")]
    pub enable_openai: bool,
    #[serde(default = "default_true")]
    #[serde(rename = "enableClaude")]
    pub enable_claude: bool,
}

fn default_true() -> bool {
    true
}

/// 代理统计信息
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProxyStats {
    #[serde(rename = "totalRequests")]
    pub total_requests: u64,
    #[serde(rename = "successRequests")]
    pub success_requests: u64,
    #[serde(rename = "failedRequests")]
    pub failed_requests: u64,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u64,
    #[serde(rename = "totalCredits")]
    pub total_credits: f64,
    #[serde(rename = "inputTokens")]
    pub input_tokens: u64,
    #[serde(rename = "outputTokens")]
    pub output_tokens: u64,
    #[serde(rename = "startTime")]
    pub start_time: i64,
}

/// 会话统计信息
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionStats {
    #[serde(rename = "totalRequests")]
    pub total_requests: u64,
    #[serde(rename = "successRequests")]
    pub success_requests: u64,
    #[serde(rename = "failedRequests")]
    pub failed_requests: u64,
    #[serde(rename = "startTime")]
    pub start_time: i64,
}

/// 请求日志
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestLog {
    pub time: String,
    pub path: String,
    pub model: Option<String>,
    pub status: u16,
    pub tokens: Option<u64>,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub credits: Option<f64>,
    pub error: Option<String>,
}

/// OpenAI 聊天请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIChatRequest {
    pub model: String,
    pub messages: Vec<OpenAIMessage>,
    #[serde(default)]
    pub stream: Option<bool>,
    #[serde(default)]
    pub max_tokens: Option<u32>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub top_p: Option<f32>,
}

/// OpenAI 消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIMessage {
    pub role: String,
    pub content: String,
}

/// Claude 请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeRequest {
    pub model: String,
    pub messages: Vec<ClaudeMessage>,
    #[serde(default)]
    pub max_tokens: u32,
    #[serde(default)]
    pub stream: Option<bool>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub system: Option<String>,
}

/// Claude 消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeMessage {
    pub role: String,
    pub content: String,
}

/// Kiro 请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroRequest {
    #[serde(rename = "conversationState")]
    pub conversation_state: KiroConversationState,
}

/// Kiro 对话状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroConversationState {
    #[serde(rename = "currentMessage")]
    pub current_message: KiroMessage,
    #[serde(rename = "chatTriggerType")]
    pub chat_trigger_type: String,
}

/// Kiro 消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroMessage {
    #[serde(rename = "userInputMessage")]
    pub user_input_message: KiroUserInputMessage,
}

/// Kiro 用户输入消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroUserInputMessage {
    pub content: String,
    #[serde(rename = "userInputMessageContext")]
    pub user_input_message_context: KiroUserInputMessageContext,
    #[serde(rename = "userIntent")]
    pub user_intent: String,
}

/// Kiro 用户输入消息上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroUserInputMessageContext {
    #[serde(rename = "editorState")]
    pub editor_state: KiroEditorState,
}

/// Kiro 编辑器状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroEditorState {
    pub document: KiroDocument,
}

/// Kiro 文档
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroDocument {
    #[serde(rename = "relativeFilePath")]
    pub relative_file_path: String,
    #[serde(rename = "programmingLanguage")]
    pub programming_language: KiroProgrammingLanguage,
    pub text: String,
}

/// Kiro 编程语言
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiroProgrammingLanguage {
    #[serde(rename = "languageName")]
    pub language_name: String,
}
