"""
邮箱管理模块
"""

import config
from typing import Optional, Dict


class EmailManager:
    """邮箱管理器 - 根据配置选择邮箱类型"""
    
    def __init__(self):
        self.email_type = config.EMAIL_TYPE
        self.current_email = None
        self.current_password = None
        self.verifier = None
        
        if self.email_type == 'temporam':
            from modules.temporam_email import TemporamEmail
            self.temporam_client = TemporamEmail()
            print(f"[EmailManager] 使用 Temporam 临时邮箱模式")
        else:
            print(f"[EmailManager] 使用微软邮箱模式")
    
    def setup_account(self, account: Optional[Dict] = None) -> Dict:
        """
        设置账号信息
        
        Args:
            account: 微软邮箱账号信息（仅在 microsoft 模式下需要）
        
        Returns:
            包含 email 和 password 的字典
        """
        if self.email_type == 'temporam':
            # 生成临时邮箱
            email = self.temporam_client.generate_email(
                domain_type=config.TEMPORAM_DOMAIN_TYPE
            )
            self.current_email = email
            self.current_password = None  # 临时邮箱无密码
            
            return {
                'email': email,
                'password': None,
                'client_id': None,
                'refresh_token': None
            }
        else:
            # 使用微软邮箱
            if not account:
                raise ValueError("微软邮箱模式需要提供账号信息")
            
            self.current_email = account['email']
            self.current_password = account.get('password')
            
            # 初始化验证器
            from modules.email_verifier import HotmailVerifier
            self.verifier = HotmailVerifier(
                email_addr=account['email'],
                password=account.get('password'),
                client_id=account.get('client_id'),
                refresh_token=account.get('refresh_token')
            )
            
            return account
    
    def check_account_suspended(self) -> bool:
        """
        检查账号是否被 AWS 封禁
        
        Returns:
            True 表示被封禁，False 表示正常
        """
        if self.email_type == 'temporam':
            # 临时邮箱不需要检查封禁状态
            print("[EmailManager] 临时邮箱无需检查封禁状态")
            return False
        else:
            # 检查微软邮箱是否被封禁
            if not self.verifier:
                print("[EmailManager] ✗ 验证器未初始化")
                return False
            
            print("[EmailManager] 检查账号状态...")
            is_suspended = self.verifier.check_account_suspended(verbose=True)
            
            if is_suspended:
                print(f"[EmailManager] ✗ 账号 {self.current_email} 已被 AWS 限制")
                return True
            
            print(f"[EmailManager] ✓ 账号状态正常")
            return False
    
    def wait_for_verification_code(self, timeout: Optional[int] = None) -> Optional[str]:
        """
        等待并获取验证码
        
        Args:
            timeout: 超时时间（秒），不指定则使用配置文件的值
        
        Returns:
            验证码字符串，失败返回 None
        """
        if timeout is None:
            timeout = config.TEMPORAM_MAX_WAIT if self.email_type == 'temporam' else config.VERIFICATION_TIMEOUT
        
        if self.email_type == 'temporam':
            # 使用 Temporam API 获取验证码
            return self.temporam_client.wait_for_verification_code(
                email=self.current_email,
                max_wait=timeout
            )
        else:
            # 使用 IMAP 获取验证码
            if not self.verifier:
                print("[EmailManager] ✗ 验证器未初始化")
                return None
            
            print(f"[EmailManager] 开始自动获取验证码 (IMAP)...")
            return self.verifier.get_verification_code(timeout=timeout)
    
    def get_email(self) -> Optional[str]:
        """获取当前邮箱地址"""
        return self.current_email
    
    def get_password(self) -> Optional[str]:
        """获取当前邮箱密码"""
        return self.current_password
    
    def cleanup(self):
        """清理资源"""
        if self.verifier:
            try:
                self.verifier.close()
            except:
                pass
