"""
代理管理模块
"""
import yaml
import random
from typing import List, Dict, Optional


class ProxyManager:
    """代理管理器"""
    
    def __init__(self, yaml_path: Optional[str] = None):
        """
        初始化代理管理器
        
        Args:
            yaml_path: Clash YAML 配置文件路径
        """
        self.yaml_path = yaml_path
        self.proxies = []
        
        if yaml_path:
            self.load_proxies()
    
    def load_proxies(self):
        """从 YAML 文件加载代理节点"""
        try:
            with open(self.yaml_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            # 获取 proxies 列表
            proxies = config.get('proxies', [])
            
            # 过滤出支持的代理类型
            supported_types = ['ss', 'vmess', 'trojan', 'socks5', 'http']
            self.proxies = [
                proxy for proxy in proxies 
                if proxy.get('type') in supported_types
            ]
            
            print(f"✓ 从 {self.yaml_path} 加载了 {len(self.proxies)} 个代理节点")
            
            if not self.proxies:
                print("⚠ 警告: 未找到可用的代理节点")
            
        except FileNotFoundError:
            print(f"✗ 代理配置文件不存在: {self.yaml_path}")
            self.proxies = []
        except yaml.YAMLError as e:
            print(f"✗ 解析 YAML 文件失败: {e}")
            self.proxies = []
        except Exception as e:
            print(f"✗ 加载代理配置失败: {e}")
            self.proxies = []
    
    def get_random_proxy(self) -> Optional[Dict]:
        """
        随机获取一个代理节点
        
        Returns:
            代理配置字典，如果没有可用代理则返回 None
        """
        if not self.proxies:
            return None
        
        return random.choice(self.proxies)
    
    def convert_to_selenium_proxy(self, proxy: Dict) -> Optional[str]:
        """
        将 Clash 代理配置转换为 Selenium 可用的代理字符串
        
        Args:
            proxy: Clash 代理配置字典
        
        Returns:
            代理字符串，格式: protocol://host:port
        """
        if not proxy:
            return None
        
        proxy_type = proxy.get('type', '').lower()
        server = proxy.get('server', '')
        port = proxy.get('port', '')
        
        if not server or not port:
            return None
        
        # 根据代理类型转换
        if proxy_type == 'http':
            return f"http://{server}:{port}"
        elif proxy_type == 'socks5':
            return f"socks5://{server}:{port}"
        elif proxy_type in ['ss', 'vmess', 'trojan']:
            # Shadowsocks/VMess/Trojan 需要本地转换工具
            # 这里返回 None，表示不支持直接使用
            # 如果需要支持，需要配合 Clash 等工具在本地启动 HTTP/SOCKS5 代理
            return None
        else:
            return None
    
    def get_random_selenium_proxy(self) -> Optional[str]:
        """
        获取一个随机的 Selenium 可用代理
        
        Returns:
            代理字符串或 None
        """
        proxy = self.get_random_proxy()
        if not proxy:
            return None
        
        proxy_str = self.convert_to_selenium_proxy(proxy)
        
        if proxy_str:
            proxy_name = proxy.get('name', 'Unknown')
            print(f"✓ 使用代理节点: {proxy_name} ({proxy_str})")
        
        return proxy_str
    
    def get_clash_local_proxy(self, proxy_port: int = 7890) -> str:
        """
        获取 Clash 本地代理地址
        
        如果 YAML 中的代理类型不支持直接使用（如 SS/VMess/Trojan），
        可以通过 Clash 在本地启动的 HTTP/SOCKS5 代理来使用
        
        Args:
            proxy_port: Clash 本地代理端口（默认 7890）
        
        Returns:
            本地代理地址
        """
        return f"http://127.0.0.1:{proxy_port}"
    
    def get_proxy_for_thread(self, use_clash_local: bool = True, clash_port: int = 7890) -> Optional[str]:
        """
        为线程获取代理（推荐方法）
        
        Args:
            use_clash_local: 是否使用 Clash 本地代理（推荐）
            clash_port: Clash 本地代理端口
        
        Returns:
            代理字符串或 None
        """
        if not self.proxies:
            return None
        
        if use_clash_local:
            # 使用 Clash 本地代理
            # 注意: 需要 Clash 正在运行，并且会随机选择节点
            proxy = self.get_random_proxy()
            if proxy:
                proxy_name = proxy.get('name', 'Unknown')
                print(f"✓ 选择代理节点: {proxy_name}")
                print(f"  通过 Clash 本地代理: http://127.0.0.1:{clash_port}")
                # 注意: 这里只是选择了节点，实际切换需要通过 Clash API
                # 简化实现：直接使用 Clash 的本地代理，Clash 会自动选择
                return f"http://127.0.0.1:{clash_port}"
        else:
            # 尝试直接使用代理（仅支持 HTTP/SOCKS5）
            return self.get_random_selenium_proxy()
    
    def has_proxies(self) -> bool:
        """检查是否有可用代理"""
        return len(self.proxies) > 0
    
    def get_proxy_count(self) -> int:
        """获取代理数量"""
        return len(self.proxies)
