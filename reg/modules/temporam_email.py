"""
临时邮箱模块
"""

import requests
import time
import random
import string
import re
from typing import Optional, List, Dict


class TemporamEmail:
    """Temporam 临时邮箱客户端"""
    
    BASE_URL = "https://www.temporam.com"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.temporam.com/zh',
            'Origin': 'https://www.temporam.com',
            'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
        })
        self.domains = []
        self.fallback_domains = [
            {"domain": "nooboy.com", "type": 0},
            {"domain": "tianmi.me", "type": 0},
            {"domain": "temporam.xin", "type": 0},
            {"domain": "guanshuyun.com", "type": 0},
            {"domain": "temporam.com", "type": 0},
            {"domain": "mona.edu.rs", "type": 1},
            {"domain": "mona.edu.pl", "type": 1},
            {"domain": "mona.edu.kg", "type": 1},
        ]
        self._load_domains()
        self.current_email = None
    
    def _load_domains(self):
        """加载可用域名列表"""
        try:
            response = self.session.get(f"{self.BASE_URL}/api/email/domains", timeout=10)
            if response.status_code == 200:
                self.domains = response.json()
                print(f"[Temporam] ✓ 加载了 {len(self.domains)} 个可用域名")
            else:
                print(f"[Temporam] ⚠ 使用备用域名列表")
                self.domains = self.fallback_domains
        except Exception:
            print(f"[Temporam] ⚠ 使用备用域名列表")
            self.domains = self.fallback_domains
    
    def get_domains(self, domain_type: Optional[int] = None) -> List[Dict]:
        """获取域名列表"""
        if domain_type is None:
            return self.domains
        return [d for d in self.domains if d['type'] == domain_type]
    
    def generate_email(self, domain_type: int = 0, username: Optional[str] = None) -> str:
        """生成随机邮箱地址"""
        domains = self.get_domains(domain_type)
        if not domains:
            raise ValueError(f"没有可用的域名 (type={domain_type})")
        
        domain = random.choice(domains)['domain']
        
        if username is None:
            username = ''.join(random.choices(string.ascii_lowercase, k=8))
        
        email = f"{username}@{domain}"
        self.current_email = email
        print(f"[Temporam] ✓ 生成邮箱: {email}")
        return email
    
    def get_messages(self, email: str, max_retries: int = 30, interval: int = 5) -> List[Dict]:
        """获取邮箱的邮件列表"""
        for attempt in range(1, max_retries + 1):
            try:
                response = self.session.get(
                    f"{self.BASE_URL}/api/email/messages",
                    params={'email': email},
                    timeout=10
                )
                
                if response.status_code == 200:
                    messages = response.json()
                    if messages:
                        print(f"[Temporam] ✓ 收到 {len(messages)} 封邮件")
                        return messages
                    else:
                        if attempt % 5 == 0:
                            print(f"[Temporam] [{attempt}/{max_retries}] 等待邮件...")
                else:
                    print(f"[Temporam] ✗ 请求失败: {response.status_code}")
                
            except Exception as e:
                print(f"[Temporam] ✗ 请求出错: {e}")
            
            if attempt < max_retries:
                time.sleep(interval)
        
        print("[Temporam] ✗ 超时未收到邮件")
        return []
    
    def extract_verification_code(self, message: Dict) -> Optional[str]:
        """从邮件中提取验证码"""
        text = message.get('summary', '') + ' ' + message.get('subject', '')
        
        priority_patterns = [
            r'验证码[：:]\s*(\d{6})',
            r'verification code[：:]\s*(\d{6})',
            r'code[：:]\s*(\d{6})',
        ]
        
        for pattern in priority_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                code = match.group(1)
                if code not in ['000000', '111111', '123456', '654321']:
                    return code
        
        match = re.search(r'\b(\d{6})\b', text)
        if match:
            code = match.group(1)
            if code not in ['000000', '111111', '123456', '654321']:
                return code
        
        return None
    
    def wait_for_verification_code(self, email: Optional[str] = None, max_wait: int = 150) -> Optional[str]:
        """等待并获取验证码"""
        if email is None:
            email = self.current_email
        
        if not email:
            print("[Temporam] ✗ 未指定邮箱地址")
            return None
        
        print(f"[Temporam] 等待验证码邮件: {email}")
        messages = self.get_messages(email, max_retries=max_wait // 5, interval=5)
        
        if not messages:
            return None
        
        for message in messages:
            code = self.extract_verification_code(message)
            if code:
                print(f"[Temporam] ✓ 提取到验证码: {code}")
                print(f"[Temporam]   发件人: {message.get('from_email')}")
                print(f"[Temporam]   主题: {message.get('subject')}")
                return code
        
        print("[Temporam] ✗ 未能从邮件中提取验证码")
        return None
