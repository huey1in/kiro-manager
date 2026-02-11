"""
配置文件
"""

# 文件路径
ACCOUNT_CSV = 'account.csv'
TEMP_ACCOUNT_CSV = 'temp_account.csv'
RESULTS_JSON = 'accounts.json'

# 浏览器配置
BROWSER_TYPE = 'chrome'  # 'chrome' 或 'edge'
HEADLESS_MODE = False  # 是否启用无头模式（后台运行，不显示浏览器窗口）
OPEN_DEVTOOLS = False  # 是否自动打开浏览器开发者工具（控制台）
CHROME_PATHS = [
    r"C:\Program Files (x86)\Qoom\Chrome\Application\chrome.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/usr/bin/chromium-browser",  # Linux
    "/usr/bin/google-chrome",  # Linux
    "/usr/bin/chromium",  # Linux
    "/snap/bin/chromium",  # Linux Snap
]
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/microsoft-edge",  # Linux
    "/usr/bin/microsoft-edge-stable",  # Linux
]
CHROME_VERSION = 144
INCOGNITO_MODE = True  # 是否启用无痕模式（隐私模式）

# 多线程配置
MAX_THREADS = 2  # 最大并发线程数（建议 1-5）

# 代理配置
ENABLE_PROXY = False  # 是否启用代理
PROXY_YAML_PATH = 'iKuuu_V2.yaml'  # Clash YAML 配置文件路径
USE_CLASH_LOCAL = False  # 是否使用 Clash 本地代理（推荐，需要 Clash 正在运行）
CLASH_LOCAL_PORT = 7890  # Clash 本地代理端口

# AWS 配置
AWS_SIGNUP_URL = 'https://profile.aws.amazon.com/'
OIDC_BASE_URL = "https://oidc.us-east-1.amazonaws.com"
START_URL = "https://view.awsapps.com/start"

# 注册流程配置
MAX_ITERATIONS = 30  # 最大迭代次数
PAGE_STUCK_THRESHOLD = 3  # 页面卡住阈值
BATCH_INTERVAL = 5  # 批量处理时账号之间的间隔（秒）
ENABLE_HUMAN_TYPING = False  # 是否启用模拟人类打字（False 则直接粘贴）
ENABLE_RANDOM_DELAY = False  # 是否启用随机延迟（False 则使用固定最小延迟）

# 验证码配置
VERIFICATION_TIMEOUT = 30  # 验证码获取超时时间（秒）

# 邮箱类型配置
EMAIL_TYPE = 'temporam'  # 'microsoft' 或 'temporam'

# Temporam 配置（当 EMAIL_TYPE='temporam' 时使用）
TEMPORAM_DOMAIN_TYPE = 0  # 0=常规邮箱, 1=教育邮箱
TEMPORAM_MAX_WAIT = 30  # 等待验证码的最大时间（秒）
