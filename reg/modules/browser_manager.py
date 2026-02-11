"""
浏览器管理模块
"""
import os
import sys
import time
import random
import warnings
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
import config

# 抑制 undetected_chromedriver 析构时的警告
warnings.filterwarnings('ignore', category=ResourceWarning)

# 重定向 stderr 来抑制 Exception ignored 消息
class SuppressStderr:
    """临时抑制 stderr 输出"""
    def __enter__(self):
        self._original_stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stderr.close()
        sys.stderr = self._original_stderr


class BrowserManager:
    """浏览器管理器"""
    
    def __init__(self, proxy: str = None):
        """
        初始化浏览器管理器
        
        Args:
            proxy: 代理地址，格式: http://host:port 或 socks5://host:port
        """
        self.driver = None
        self.browser_type = config.BROWSER_TYPE
        self.proxy = proxy
    
    def start(self):
        """启动浏览器"""
        if self.browser_type == 'edge':
            return self._start_edge()
        else:
            return self._start_chrome()
    
    def _start_edge(self):
        """启动 Edge 浏览器"""
        print("\n启动 Edge 浏览器...")
        options = EdgeOptions()
        
        # 添加选项
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        # 配置代理
        if self.proxy:
            print(f"✓ 配置代理: {self.proxy}")
            options.add_argument(f'--proxy-server={self.proxy}')
        
        # 无头模式
        if config.HEADLESS_MODE:
            options.add_argument('--headless=new')
            print("已启用无头模式")
        else:
            options.add_argument('--start-maximized')  # 全屏启动
        
        # 自动打开开发者工具
        if config.OPEN_DEVTOOLS and not config.HEADLESS_MODE:
            options.add_argument('--auto-open-devtools-for-tabs')
            print("已启用开发者工具")
        
        # 启用无痕模式
        if config.INCOGNITO_MODE:
            options.add_argument('--inprivate')
            print("已启用无痕模式")
        
        # 查找 Edge 路径
        edge_found = False
        for edge_path in config.EDGE_PATHS:
            if os.path.exists(edge_path):
                print(f"找到 Edge: {edge_path}")
                options.binary_location = edge_path
                edge_found = True
                break
        
        if not edge_found:
            print("未找到 Edge，将使用系统默认路径")
        
        try:
            self.driver = webdriver.Edge(options=options)
            print("Edge 浏览器启动成功")
            return self.driver
        except Exception as e:
            print(f"启动 Edge 浏览器失败: {e}")
            raise
    
    def _start_chrome(self):
        """启动 Chrome 浏览器"""
        print("\n启动 Chrome 浏览器...")
        options = uc.ChromeOptions()
        
        # 添加选项减少关闭时的错误
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        # 配置代理
        if self.proxy:
            print(f"✓ 配置代理: {self.proxy}")
            options.add_argument(f'--proxy-server={self.proxy}')
        
        # 无头模式
        if config.HEADLESS_MODE:
            options.add_argument('--headless=new')
            print("已启用无头模式")
        
        # 自动打开开发者工具
        if config.OPEN_DEVTOOLS and not config.HEADLESS_MODE:
            options.add_argument('--auto-open-devtools-for-tabs')
            print("已启用开发者工具")
        
        # 启用无痕模式（如果配置中启用）
        if config.INCOGNITO_MODE:
            options.add_argument('--incognito')
            print("已启用无痕模式")
        
        # 查找 Chrome 路径
        chrome_found = False
        for chrome_path in config.CHROME_PATHS:
            if os.path.exists(chrome_path):
                print(f"找到 Chrome: {chrome_path}")
                options.binary_location = chrome_path
                chrome_found = True
                break
        
        if not chrome_found:
            print("未找到 Chrome，将使用系统默认路径")
        
        # 检查本地是否已有 ChromeDriver
        driver_path = None
        possible_paths = [
            './chromedriver.exe',
            './chromedriver',
            os.path.join(os.path.expanduser('~'), '.wdm', 'drivers', 'chromedriver', 'win64', 'chromedriver.exe'),
            os.path.join(os.path.expanduser('~'), '.wdm', 'drivers', 'chromedriver', 'chromedriver.exe'),
        ]
        
        for path in possible_paths:
            if os.path.isfile(path):
                driver_path = os.path.abspath(path)
                print(f"找到本地 ChromeDriver: {driver_path}")
                break
        
        try:
            if driver_path:
                # 使用本地 ChromeDriver
                print("使用本地 ChromeDriver...")
                self.driver = uc.Chrome(
                    options=options,
                    driver_executable_path=driver_path,
                    use_subprocess=True
                )
            else:
                # 需要下载 ChromeDriver
                print("正在下载 ChromeDriver...")
                
                # 尝试多次下载，处理 SSL 错误
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        self.driver = uc.Chrome(
                            options=options,
                            version_main=144,
                            use_subprocess=True,
                            driver_executable_path=None
                        )
                        break
                    except Exception as e:
                        if attempt < max_retries - 1:
                            print(f"下载失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                            print("等待 2 秒后重试...")
                            time.sleep(2)
                        else:
                            print(f"\n✗ ChromeDriver 下载失败")
                            print("\n解决方案:")
                            print("1. 手动下载 ChromeDriver: https://googlechromelabs.github.io/chrome-for-testing/")
                            print("2. 下载后将 chromedriver.exe 放到项目根目录")
                            raise
            
            # 禁用 undetected_chromedriver 的自动清理
            # 这样可以避免析构时的句柄错误
            if hasattr(self.driver, '_keep_alive'):
                self.driver._keep_alive = False
            
            print("浏览器启动成功")
            return self.driver
        except Exception as e:
            print(f"启动浏览器失败: {e}")
            raise
    
    def close(self):
        """关闭浏览器"""
        if self.driver:
            try:
                # 保存进程信息
                service = getattr(self.driver, 'service', None)
                
                # 先尝试关闭所有窗口
                try:
                    self.driver.close()
                except:
                    pass
                
                # 等待一下让浏览器完全关闭
                time.sleep(0.3)
                
                # 调用 quit 方法
                try:
                    self.driver.quit()
                except:
                    pass
                
                # 手动终止 ChromeDriver 进程
                if service and hasattr(service, 'process'):
                    try:
                        import subprocess
                        if service.process and service.process.poll() is None:
                            service.process.terminate()
                            service.process.wait(timeout=2)
                    except:
                        pass
                
                # 等待进程完全退出
                time.sleep(0.3)
                
                print("浏览器已关闭")
            except Exception as e:
                # 忽略关闭时的错误
                pass
            finally:
                # 确保 driver 被设置为 None，防止析构函数再次调用
                try:
                    # 移除 __del__ 方法避免二次清理
                    if hasattr(self.driver, '__del__'):
                        self.driver.__del__ = lambda: None
                except:
                    pass
                self.driver = None
    
    def __del__(self):
        """析构函数，确保浏览器被关闭"""
        try:
            if self.driver:
                self.close()
        except:
            pass
    
    def detect_current_page(self):
        """检测当前页面类型"""
        if not self.driver:
            return 'unknown'
        
        try:
            time.sleep(1)
            current_url = self.driver.current_url
            
            # 检查是否是带 registrationCode 的中间页面（需要等待加载）
            if 'registrationCode' in current_url and 'state=' in current_url:
                print(f"[检测] 检测到 registrationCode 中间页面，等待加载...")
                time.sleep(3)  # 给页面更多时间加载
                # 重新获取 URL，可能已经跳转
                current_url = self.driver.current_url
            
            # 先通过 URL 判断（更可靠）
            if 'verify-otp' in current_url or 'verification' in current_url:
                print(f"[检测] URL 包含 verify-otp，判定为验证码页面")
                return 'verification'
            
            if 'password' in current_url and 'signup' in current_url:
                print(f"[检测] URL 包含 password，判定为密码页面")
                return 'password'
            
            # 检查是否是已注册账号的登录页面（要求输入密码）
            # 必须同时满足：URL 包含特定关键词 + 有密码输入框 + 没有确认密码框
            if ('get-password' in current_url or 'login' in current_url) and 'signup' not in current_url:
                try:
                    # 检查是否有密码输入框
                    password_inputs = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
                    # 登录页面只有一个密码框，注册页面有两个（密码+确认密码）
                    if len(password_inputs) == 1 and password_inputs[0].is_displayed():
                        print(f"[检测] 检测到登录密码页面（单个密码框），账号已注册")
                        return 'already_registered'
                except:
                    pass
            
            # 检查是否是邮箱输入页面
            try:
                email_input = self.driver.find_element(By.CSS_SELECTOR, 'input[placeholder="username@example.com"]')
                if email_input.is_displayed():
                    print(f"[检测] 找到邮箱输入框")
                    return 'email'
            except:
                pass
            
            # 检查是否是姓名输入页面
            try:
                name_input = self.driver.find_element(By.CSS_SELECTOR, 'input[placeholder*="Maria"]')
                if name_input.is_displayed():
                    print(f"[检测] 找到姓名输入框")
                    return 'name'
            except:
                pass
            
            # 检查是否是验证码页面
            verification_selectors = [
                'input[placeholder="6-digit"]',
                'input[placeholder*="digit"]',
                'input[type="text"][autocomplete="on"]',
            ]
            
            for selector in verification_selectors:
                try:
                    code_input = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if code_input.is_displayed():
                        print(f"[检测] 找到验证码输入框: {selector}")
                        return 'verification'
                except:
                    continue
            
            # 检查是否是密码设置页面（必须有2个密码框）
            try:
                password_inputs = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
                if len(password_inputs) >= 2:
                    # 确认这些输入框是可见的
                    visible_count = sum(1 for inp in password_inputs if inp.is_displayed())
                    if visible_count >= 2:
                        print(f"[检测] 找到 {visible_count} 个密码输入框，判定为密码设置页面")
                        return 'password'
            except:
                pass
            
            # 检查是否已完成
            if 'profile.aws.amazon.com' in current_url and 'signup' not in current_url:
                print(f"[检测] 检测到完成页面")
                return 'completed'
            
            print(f"[检测] 未识别的页面类型，URL: {current_url}")
            return 'unknown'
        except Exception as e:
            print(f"检测页面类型时出错: {e}")
            return 'unknown'
    
    def goto(self, url):
        """访问 URL"""
        if self.driver:
            self.driver.get(url)
            time.sleep(random.uniform(3, 5) if config.ENABLE_RANDOM_DELAY else 2)
