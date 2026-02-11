"""
账号加载模块
"""
import os


def load_accounts(csv_file='account.csv', force_file=False):
    """从 CSV 文件加载所有账号
    
    优先级（当 force_file=False 时）：
    1. temp_account.csv (Web 服务器临时文件)
    2. 指定的 csv_file 参数
    
    Args:
        csv_file: CSV 文件路径
        force_file: 是否强制使用指定的文件，忽略 temp_account.csv
    
    Returns:
        list: 账号列表
    """
    # 优先检查临时文件（除非强制使用指定文件）
    if not force_file and os.path.exists('temp_account.csv'):
        csv_file = 'temp_account.csv'
    
    try:
        accounts = []
        with open(csv_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split('----')
                if len(parts) >= 4:
                    accounts.append({
                        'email': parts[0].strip(),
                        'password': parts[1].strip(),
                        'client_id': parts[2].strip(),
                        'refresh_token': parts[3].strip()
                    })
        
        if not accounts:
            raise Exception("CSV 文件中没有找到有效账号")
        
        return accounts
    except FileNotFoundError:
        raise Exception(f"找不到文件: {csv_file}")


def load_first_account(csv_file='account.csv'):
    """从 CSV 文件加载第一个账号（兼容旧代码）"""
    accounts = load_accounts(csv_file)
    return accounts[0] if accounts else None
