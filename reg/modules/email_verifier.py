#!/usr/bin/env python3
"""
邮箱验证码获取模块
"""
import re
import time
import imaplib
import email as email_lib
import requests
from email.header import decode_header
from typing import Optional


class HotmailVerifier:
    """Hotmail/Outlook 邮箱验证码获取器"""
    
    IMAP_SERVER = "outlook.office365.com"
    IMAP_PORT = 993
    TOKEN_URL = "https://login.live.com/oauth20_token.srf"
    OUTLOOK_CLIENT_ID = "9e5f94bc-e8a4-4e73-b8be-63364c29d753"
    AWS_SENDERS = ['amazon', 'aws', 'signin.aws']
    
    def __init__(self, email_addr: str, password: str = None, 
                 client_id: str = None, refresh_token: str = None):
        self.email = email_addr
        self.password = password
        self.client_id = client_id or self.OUTLOOK_CLIENT_ID
        self.refresh_token = refresh_token
        self.access_token = None
        self.imap = None
    
    def _refresh_access_token(self):
        if not self.refresh_token:
            raise Exception("没有 Refresh Token")
        
        data = {
            "client_id": self.client_id,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
            "scope": "https://outlook.office.com/IMAP.AccessAsUser.All offline_access"
        }
        
        resp = requests.post(self.TOKEN_URL, data=data, timeout=30)
        
        if resp.status_code != 200:
            data.pop("scope")
            resp = requests.post(self.TOKEN_URL, data=data, timeout=30)
        
        if resp.status_code != 200:
            raise Exception(f"Token 刷新失败: {resp.status_code}")
        
        result = resp.json()
        self.access_token = result.get("access_token")
        if "refresh_token" in result:
            self.refresh_token = result["refresh_token"]
        
        return self.access_token
    
    def _xoauth2_auth(self, challenge):
        auth_string = f"user={self.email}\x01auth=Bearer {self.access_token}\x01\x01"
        return auth_string.encode()
    
    def _connect(self):
        if self.imap:
            return True
        
        if not self.access_token:
            self._refresh_access_token()
        
        try:
            self.imap = imaplib.IMAP4_SSL(self.IMAP_SERVER, self.IMAP_PORT)
            self.imap.authenticate('XOAUTH2', self._xoauth2_auth)
            return True
        except Exception as e:
            print(f"[IMAP] 连接失败: {e}")
            self.imap = None
            raise
    
    def _reconnect(self):
        """重新连接 IMAP"""
        try:
            if self.imap:
                try:
                    self.imap.logout()
                except:
                    pass
                self.imap = None
            
            time.sleep(1)
            return self._connect()
        except Exception as e:
            print(f"[IMAP] 重连失败: {e}")
            return False
    
    def _decode_header(self, value):
        if not value:
            return ""
        decoded = decode_header(value)
        result = []
        for part, charset in decoded:
            if isinstance(part, bytes):
                result.append(part.decode(charset or 'utf-8', errors='ignore'))
            else:
                result.append(part)
        return ''.join(result)
    
    def _get_body(self, msg):
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype in ["text/plain", "text/html"]:
                    try:
                        payload = part.get_payload(decode=True)
                        return payload.decode(part.get_content_charset() or 'utf-8', errors='ignore')
                    except:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                return payload.decode(msg.get_content_charset() or 'utf-8', errors='ignore')
            except:
                pass
        return ""
    
    def _is_aws_email(self, from_addr, subject):
        text = (from_addr + subject).lower()
        for sender in self.AWS_SENDERS:
            if sender in text:
                return True
        for kw in ['verification', 'verify', 'code']:
            if kw in text:
                return True
        return False
    
    def _extract_code(self, text):
        if not text:
            return None
        
        # 优先匹配明确标注为验证码的模式
        patterns = [
            r'(?:验证码|verification code|code|代码)[:：\s]+(\d{6})',  # 中英文"验证码："后的6位数字
            r'(\d{6})\s*(?:is your|为您的|是您的)',  # 6位数字后跟"is your"等
            r'(?:enter|输入|请输入).*?(\d{6})',  # "输入"等关键词后的6位数字
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # 如果没有匹配到明确模式，使用通用匹配并过滤
        matches = re.findall(r'\b(\d{6})\b', text)
        for code in matches:
            idx = text.find(code)
            if idx > 0:
                context = text[max(0, idx-50):idx+50].lower()
                # 跳过明显是样式代码或其他非验证码的内容
                if any(skip in context for skip in ['#', 'color', 'rgb', 'font', 'style', 'px', 'margin', 'padding']):
                    continue
            return code
        return None
    
    def get_verification_code(self, timeout=90, verbose=False):
        """获取 AWS 验证码"""
        if verbose:
            print(f"[IMAP] 连接邮箱: {self.email}")
        
        try:
            self._connect()
        except Exception as e:
            if verbose:
                print(f"[IMAP] 连接失败: {e}")
            return None
        
        if verbose:
            print(f"[IMAP] 连接成功，搜索验证码...")
        
        start_time = time.time()
        check_interval = 3
        consecutive_errors = 0
        max_consecutive_errors = 3
        
        while time.time() - start_time < timeout:
            try:
                # 检查连接是否有效
                if not self.imap:
                    if verbose:
                        print(f"[IMAP] 连接已断开，尝试重连...")
                    if not self._reconnect():
                        time.sleep(check_interval)
                        continue
                
                self.imap.select('INBOX')
                status, messages = self.imap.search(None, 'ALL')
                
                if status != 'OK':
                    consecutive_errors += 1
                    if consecutive_errors >= max_consecutive_errors:
                        if verbose:
                            print(f"[IMAP] 连续错误过多，尝试重连...")
                        self._reconnect()
                        consecutive_errors = 0
                    time.sleep(check_interval)
                    continue
                
                # 重置错误计数
                consecutive_errors = 0
                
                mail_ids = messages[0].split()
                if not mail_ids:
                    if verbose:
                        print(f"[IMAP] 邮箱为空，等待...")
                    time.sleep(check_interval)
                    continue
                
                recent_ids = mail_ids[-5:]
                recent_ids.reverse()
                
                for mail_id in recent_ids:
                    status, msg_data = self.imap.fetch(mail_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    
                    raw_email = msg_data[0][1]
                    msg = email_lib.message_from_bytes(raw_email)
                    
                    from_addr = self._decode_header(msg.get('From', ''))
                    subject = self._decode_header(msg.get('Subject', ''))
                    
                    if not self._is_aws_email(from_addr, subject):
                        continue
                    
                    if verbose:
                        print(f"[IMAP] 发现 AWS 邮件: {subject[:50]}")
                    
                    body = self._get_body(msg)
                    code = self._extract_code(subject + ' ' + body)
                    
                    if code:
                        if verbose:
                            print(f"[IMAP] ✓ 获取验证码: {code}")
                        self.close()
                        return code
                
                if verbose:
                    elapsed = int(time.time() - start_time)
                    print(f"[IMAP] 未找到验证码，已等待 {elapsed}s...")
                
                time.sleep(check_interval)
                
            except imaplib.IMAP4.abort as e:
                consecutive_errors += 1
                if verbose:
                    print(f"[IMAP] 连接中断: {e}")
                if consecutive_errors >= max_consecutive_errors:
                    if verbose:
                        print(f"[IMAP] 尝试重连...")
                    self._reconnect()
                    consecutive_errors = 0
                time.sleep(check_interval)
                
            except Exception as e:
                consecutive_errors += 1
                if verbose:
                    print(f"[IMAP] 检查邮件出错: {e}")
                if consecutive_errors >= max_consecutive_errors:
                    if verbose:
                        print(f"[IMAP] 尝试重连...")
                    self._reconnect()
                    consecutive_errors = 0
                time.sleep(check_interval)
        
        if verbose:
            print(f"[IMAP] ✗ 超时")
        
        self.close()
        return None
    
    def check_account_suspended(self, verbose=False):
        """检查账号是否被封禁（检测 AWS 限制邮件）"""
        if verbose:
            print(f"[IMAP] 检查账号状态: {self.email}")
        
        try:
            self._connect()
        except Exception as e:
            if verbose:
                print(f"[IMAP] 连接失败: {e}")
            return False
        
        if verbose:
            print(f"[IMAP] 连接成功，检查邮件...")
        
        try:
            self.imap.select('INBOX')
            status, messages = self.imap.search(None, 'ALL')
            
            if status != 'OK':
                if verbose:
                    print(f"[IMAP] 搜索邮件失败")
                return False
            
            mail_ids = messages[0].split()
            if not mail_ids:
                if verbose:
                    print(f"[IMAP] 邮箱为空，账号正常")
                return False
            
            # 检查最近的邮件（最多检查最近10封）
            recent_ids = mail_ids[-10:]
            recent_ids.reverse()
            
            for mail_id in recent_ids:
                try:
                    status, msg_data = self.imap.fetch(mail_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    
                    raw_email = msg_data[0][1]
                    msg = email_lib.message_from_bytes(raw_email)
                    
                    from_addr = self._decode_header(msg.get('From', ''))
                    subject = self._decode_header(msg.get('Subject', ''))
                    body = self._get_body(msg)
                    
                    # 检查是否是 AWS 限制邮件
                    full_text = (from_addr + subject + body).lower()
                    
                    # 关键词检测
                    suspend_keywords = [
                        'suspicious activity',
                        'restricted your ability',
                        'restricted your account',
                        'account suspended',
                        'account has been suspended',
                        'detected suspicious activity on your kiro account'
                    ]
                    
                    for keyword in suspend_keywords:
                        if keyword in full_text:
                            if verbose:
                                print(f"[IMAP] ✗ 检测到账号限制邮件")
                                print(f"[IMAP] 主题: {subject}")
                            self.close()
                            return True
                
                except Exception as e:
                    if verbose:
                        print(f"[IMAP] 读取邮件出错: {e}")
                    continue
            
            if verbose:
                print(f"[IMAP] ✓ 未发现限制邮件，账号正常")
            
            self.close()
            return False
            
        except Exception as e:
            if verbose:
                print(f"[IMAP] 检查过程出错: {e}")
            self.close()
            return False
    
    def close(self):
        if self.imap:
            try:
                self.imap.logout()
            except:
                pass
            self.imap = None


def get_verification_code(email, password=None, client_id=None, refresh_token=None, 
                          timeout=90, verbose=False):
    """便捷函数：获取 AWS 验证码"""
    verifier = HotmailVerifier(email, password, client_id, refresh_token)
    return verifier.get_verification_code(timeout, verbose)


def check_account_suspended(email, password=None, client_id=None, refresh_token=None, verbose=False):
    """便捷函数：检查账号是否被封禁"""
    verifier = HotmailVerifier(email, password, client_id, refresh_token)
    return verifier.check_account_suspended(verbose)
