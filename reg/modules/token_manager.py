"""
Token 管理模块
"""
import asyncio
import aiohttp
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TokenManager:
    """Token 管理器"""
    
    def __init__(self):
        self.oidc_base_url = "https://oidc.us-east-1.amazonaws.com"
        self.start_url = "https://view.awsapps.com/start"
        self.scopes = [
            'codewhisperer:analysis',
            'codewhisperer:completions',
            'codewhisperer:conversations',
            'codewhisperer:taskassist',
            'codewhisperer:transformations'
        ]
    
    async def register_oidc_client(self):
        """注册 OIDC 客户端"""
        print("注册 OIDC 客户端...")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.oidc_base_url}/client/register",
                headers={'Content-Type': 'application/json'},
                json={
                    'clientName': 'Kiro Account Manager',
                    'clientType': 'public',
                    'scopes': self.scopes,
                    'grantTypes': ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
                    'issuerUrl': self.start_url
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    raise Exception(f"OIDC 注册失败: {resp.status} - {error_text}")
                
                data = await resp.json()
                client_id = data['clientId']
                client_secret = data['clientSecret']
                print(f"Client ID: {client_id[:30]}...")
                
                return client_id, client_secret
    
    async def device_authorization(self, client_id, client_secret):
        """设备授权"""
        print("设备授权...")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.oidc_base_url}/device_authorization",
                headers={'Content-Type': 'application/json'},
                json={
                    'clientId': client_id,
                    'clientSecret': client_secret,
                    'startUrl': self.start_url
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    raise Exception(f"设备授权失败: {resp.status} - {error_text}")
                
                data = await resp.json()
                user_code = data['userCode']
                device_code = data['deviceCode']
                print(f"User Code: {user_code}")
                print(f"Device Code: {device_code[:30]}...")
                
                return user_code, device_code
    
    def browser_authorize(self, driver, user_code):
        """使用浏览器完成授权"""
        print("\n使用浏览器完成设备授权...")
        auth_url = f"https://view.awsapps.com/start/#/device?user_code={user_code}"
        print(f"访问授权页面: {auth_url}")
        driver.get(auth_url)
        time.sleep(5)
        
        wait = WebDriverWait(driver, 20)
        
        # 点击"确认并继续"
        print("查找授权按钮...")
        button_selectors = [
            'button#cli_verification_btn',
            'button[data-analytics="accept-user-code"]',
            'button[type="submit"]',
        ]
        
        button_clicked = False
        for selector in button_selectors:
            try:
                button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
                button.click()
                print(f"已点击授权按钮")
                button_clicked = True
                break
            except:
                continue
        
        if not button_clicked:
            print("未找到授权按钮，请手动点击...")
            time.sleep(20)
        else:
            time.sleep(5)
        
        # 点击"Allow access"
        print("\n查找 'Allow access' 按钮...")
        allow_button_selectors = [
            'button[data-testid="allow-access-button"]',
            'button[data-analytics="consent-allow-access"]',
        ]
        
        allow_clicked = False
        for selector in allow_button_selectors:
            try:
                allow_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
                allow_button.click()
                print(f"已点击 'Allow access' 按钮")
                allow_clicked = True
                break
            except:
                continue
        
        if not allow_clicked:
            print("未找到 'Allow access' 按钮，请手动点击...")
            time.sleep(20)
        else:
            time.sleep(3)
        
        print("授权流程完成！")
        
        # 获取 SSO Token (x-amz-sso_authn cookie)
        sso_token = self.get_sso_token(driver)
        return sso_token
    
    def get_sso_token(self, driver):
        """从浏览器 cookies 中获取 SSO Token"""
        print("\n获取 SSO Token...")
        try:
            # 获取所有 cookies
            cookies = driver.get_cookies()
            
            # 查找 x-amz-sso_authn cookie
            sso_token = None
            for cookie in cookies:
                if cookie['name'] == 'x-amz-sso_authn':
                    sso_token = cookie['value']
                    print(f"✓ 找到 SSO Token: {sso_token[:50]}...")
                    break
            
            if not sso_token:
                print("⚠ 未找到 x-amz-sso_authn cookie")
                # 尝试从其他域名获取
                try:
                    driver.get("https://view.awsapps.com/start")
                    time.sleep(2)
                    cookies = driver.get_cookies()
                    for cookie in cookies:
                        if cookie['name'] == 'x-amz-sso_authn':
                            sso_token = cookie['value']
                            print(f"✓ 从 start 页面找到 SSO Token: {sso_token[:50]}...")
                            break
                except:
                    pass
            
            return sso_token
        except Exception as e:
            print(f"✗ 获取 SSO Token 失败: {e}")
            return None
    
    async def get_tokens(self, email, password, user_code, device_code, client_id, client_secret):
        """获取 tokens"""
        from .get_token import get_tokens_simple
        
        print("\n等待 3 秒后开始获取 tokens...")
        time.sleep(3)
        
        token_result = await get_tokens_simple(
            email=email,
            password=password,
            user_code=user_code,
            device_code=device_code,
            client_id=client_id,
            client_secret=client_secret
        )
        
        return token_result
