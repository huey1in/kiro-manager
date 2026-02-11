#!/usr/bin/env python3
"""
主程序
"""
import os
import sys
import json
import time
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# 过滤 undetected_chromedriver 的析构错误
_original_stderr = sys.stderr

class FilteredStderr:
    """过滤特定错误消息的 stderr"""
    def __init__(self, original):
        self.original = original
        self.buffer = []
        
    def write(self, text):
        # 过滤掉 undetected_chromedriver 的析构错误
        if 'undetected_chromedriver' in text and '__del__' in text:
            return
        if 'OSError: [WinError 6]' in text:
            return
        if 'Exception ignored in:' in text:
            self.buffer.append(text)
            return
        
        # 清空缓冲区（如果不是错误的一部分）
        if self.buffer and 'undetected_chromedriver' not in text:
            for buffered in self.buffer:
                self.original.write(buffered)
            self.buffer = []
        
        self.original.write(text)
    
    def flush(self):
        self.original.flush()

sys.stderr = FilteredStderr(_original_stderr)

from modules import (
    load_accounts,
    load_first_account,
    BrowserManager,
    PageHandler,
    TokenManager,
    generate_random_name,
    generate_aws_password
)
from modules.email_manager import EmailManager
from modules.proxy_manager import ProxyManager
import config


def save_result(result):
    """保存注册结果到 JSON 文件"""
    try:
        # 读取现有数据
        accounts_list = []
        if os.path.exists(config.RESULTS_JSON):
            try:
                with open(config.RESULTS_JSON, 'r', encoding='utf-8') as f:
                    accounts_list = json.load(f)
            except:
                accounts_list = []
        
        # 构建简化的存储格式
        simplified_result = {
            "refreshToken": result.get('aws_token', {}).get('refresh_token', ''),
            "clientId": result.get('client_id', ''),
            "clientSecret": result.get('client_secret', ''),
            "ssoToken": result.get('sso_token', ''),
            "provider": "BuilderId"
        }
        
        # 添加新账号
        accounts_list.append(simplified_result)
        
        # 保存回文件
        with open(config.RESULTS_JSON, 'w', encoding='utf-8') as f:
            json.dump(accounts_list, f, ensure_ascii=False, indent=2)
        
        print(f"\n✓ 账号信息已保存到 {config.RESULTS_JSON}")
        
    except Exception as e:
        print(f"保存注册结果失败: {e}")



def register_account(account=None, code_callback=None, proxy=None):
    """注册单个账号
    
    Args:
        account: 账号信息字典（仅在 microsoft 模式下需要）
        code_callback: 验证码回调函数
        proxy: 代理地址（可选）
    
    Returns:
        bool: 是否成功
    """
    # 初始化邮箱管理器
    email_manager = EmailManager()
    
    # 设置账号
    account_info = email_manager.setup_account(account)
    print(f"开始处理账号: {account_info['email']}")
    
    # 检查账号是否被封禁
    if email_manager.check_account_suspended():
        print(f"\n✗ 账号 {account_info['email']} 已被 AWS 限制，跳过注册")
        email_manager.cleanup()
        return False
    
    # 生成随机姓名和密码
    random_name = generate_random_name()
    aws_password = generate_aws_password()
    print(f"随机姓名: {random_name}")
    print(f"AWS 密码: {aws_password}")
    
    # 初始化浏览器管理器（传入代理）
    browser = BrowserManager(proxy=proxy)
    
    try:
        # 启动浏览器
        driver = browser.start()
        
        # 清除所有 cookies 和缓存，避免自动登录
        print("清除浏览器缓存和 cookies...")
        driver.delete_all_cookies()
        
        # 初始化页面处理器
        page_handler = PageHandler(driver)
        
        # 打开注册页面
        print("打开 AWS Builder ID 注册页面...")
        browser.goto(config.AWS_SIGNUP_URL)
        
        # 主循环
        completed_steps = set()
        page_stuck_count = {}
        last_page = None
        iteration = 0
        retry_counts = {
            'email': 0,
            'name': 0,
            'verification': 0,
            'password': 0
        }
        max_retry = 3  # 每个页面最大重试次数
        
        while iteration < config.MAX_ITERATIONS:
            iteration += 1
            
            current_page = browser.detect_current_page()
            print(f"\n[第 {iteration} 次检测] 当前页面: {current_page}")
            
            # 检测页面卡住
            if current_page == last_page and current_page in completed_steps:
                page_stuck_count[current_page] = page_stuck_count.get(current_page, 0) + 1
                
                if page_stuck_count[current_page] >= config.PAGE_STUCK_THRESHOLD:
                    print(f"\n⚠ 页面 {current_page} 停留过久，尝试重新处理...")
                    
                    # 统一处理所有需要重试的页面
                    if current_page in retry_counts and retry_counts[current_page] < max_retry:
                        retry_counts[current_page] += 1
                        print(f"尝试重新处理 {current_page} 页面 (第 {retry_counts[current_page]} 次)...")
                        completed_steps.discard(current_page)  # 移除已完成标记
                        page_stuck_count[current_page] = 0  # 重置卡住计数
                    else:
                        # 重试次数过多或无重试逻辑
                        if current_page in retry_counts:
                            print(f"⚠ 页面 {current_page} 重试次数已达上限 ({max_retry} 次)")
                        else:
                            print(f"⚠ 页面 {current_page} 无重试逻辑")
            else:
                page_stuck_count[current_page] = 0
            
            last_page = current_page
            
            # 处理不同页面
            if current_page == 'completed':
                print("\n✓ AWS Builder ID 注册完成！")
                break
            
            elif current_page == 'already_registered':
                email = account_info.get('email', '临时邮箱') if account_info else '未知邮箱'
                print(f"\n✗ 账号 {email} 已注册，跳过")
                email_manager.cleanup()
                return False
            
            elif current_page == 'email' and 'email' not in completed_steps:
                page_handler.handle_email_page(account_info)
                completed_steps.add('email')
            
            elif current_page == 'name' and 'name' not in completed_steps:
                page_handler.handle_name_page(random_name)
                completed_steps.add('name')
            
            elif current_page == 'verification' and 'verification' not in completed_steps:
                success = page_handler.handle_verification_page(email_manager, code_callback)
                if success:
                    completed_steps.add('verification')
                    retry_counts['verification'] = 0  # 重置重试计数
                else:
                    print("✗ 验证码处理失败，等待重试...")
                    # 不直接返回 False，让重试机制处理
                    time.sleep(2)
            
            elif current_page == 'password' and 'password' not in completed_steps:
                success = page_handler.handle_password_page(aws_password)
                if success:
                    completed_steps.add('password')
                    retry_counts['password'] = 0  # 重置重试计数
                else:
                    print("✗ 密码设置失败，等待重试...")
                    # 不直接返回 False，让重试机制处理
                    time.sleep(2)
            
            elif current_page == 'unknown':
                print(f"⚠ 未知页面: {driver.current_url}")
                
                # 检测是否连续多次遇到 unknown 页面
                if last_page == 'unknown':
                    page_stuck_count['unknown'] = page_stuck_count.get('unknown', 0) + 1
                    
                    if page_stuck_count['unknown'] >= 3:
                        print("⚠ 连续多次遇到未知页面，尝试刷新...")
                        driver.refresh()
                        page_stuck_count['unknown'] = 0
                        time.sleep(3)
                    else:
                        time.sleep(5)
                else:
                    page_stuck_count['unknown'] = 0
                    time.sleep(5)
            
            else:
                # 页面已处理，等待跳转
                time.sleep(2)
        
        # 检查是否注册成功
        if current_page != 'completed':
            print("\n⚠ 注册流程未完成")
            # 检查是否因为重试次数过多
            for page, count in retry_counts.items():
                if count >= max_retry:
                    print(f"⚠ {page} 页面重试次数已达上限")
            email_manager.cleanup()
            return False
        
        # 获取 Token
        print("\n开始获取 AWS Token...")
        token_manager = TokenManager()
        
        # 注册 OIDC 客户端
        client_id, client_secret = asyncio.run(token_manager.register_oidc_client())
        
        # 设备授权
        user_code, device_code = asyncio.run(token_manager.device_authorization(client_id, client_secret))
        
        # 浏览器授权
        sso_token = token_manager.browser_authorize(driver, user_code)
        
        # 关闭浏览器
        browser.close()
        
        # 获取 tokens
        token_result = asyncio.run(token_manager.get_tokens(
            email=account_info.get('email', email_manager.get_email()),
            password=aws_password,
            user_code=user_code,
            device_code=device_code,
            client_id=client_id,
            client_secret=client_secret
        ))
        
        # 构建结果
        if token_result and token_result['status'] == 'success':
            print("完整流程成功！")
            
            aws_token = token_result.get('aws_token', {})
            kiro_tokens = token_result.get('kiro_tokens', {})
            
            result_data = {
                'email': account_info.get('email', email_manager.get_email()),
                'outlook_password': account_info.get('password', ''),
                'aws_password': aws_password,
                'name': random_name,
                'client_id': client_id,
                'client_secret': client_secret,
                'sso_token': sso_token if sso_token else '',
                'aws_token': {
                    'access_token': aws_token.get('accessToken', ''),
                    'refresh_token': aws_token.get('refreshToken', ''),
                    'expires_in': aws_token.get('expiresIn', 0)
                },
                'kiro_tokens': {
                    'access_token': kiro_tokens.get('accessToken', ''),
                    'refresh_token': kiro_tokens.get('refreshToken', ''),
                    'expires_in': kiro_tokens.get('expiresIn', 0)
                } if kiro_tokens else {},
                'registered_at': datetime.now().isoformat(),
                'status': 'success'
            }
            
            save_result(result_data)
            return True
        else:
            print("\n⚠ 注册成功但 token 获取失败，不保存到 JSON")
            return False
    
    except Exception as e:
        print(f"\n✗ 注册失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        browser.close()


def main(code_callback=None):
    """主函数 - 单账号模式"""
    print("AWS Builder ID 自动注册")
    
    # 初始化代理管理器
    proxy = None
    if config.ENABLE_PROXY:
        print("\n初始化代理管理器...")
        proxy_manager = ProxyManager(config.PROXY_YAML_PATH)
        if proxy_manager.has_proxies():
            proxy = proxy_manager.get_proxy_for_thread(
                use_clash_local=config.USE_CLASH_LOCAL,
                clash_port=config.CLASH_LOCAL_PORT
            )
        else:
            print("⚠ 未找到可用代理，将不使用代理")
    
    # 加载账号
    if config.EMAIL_TYPE == 'microsoft':
        print("\n读取账号信息...")
        account = load_first_account()
        print(f"账号邮箱: {account['email']}")
    else:
        print("\n使用临时邮箱模式")
        account = None
    
    # 注册账号
    success = register_account(account, code_callback, proxy)
    
    if success:
        print("\n✓ 注册成功！")
    else:
        print("\n✗ 注册失败！")
    
    return success


def batch_mode():
    """批量模式"""
    print("批量注册模式")
    print(f"邮箱类型: {config.EMAIL_TYPE}")
    
    # 初始化代理管理器
    proxy_manager = None
    if config.ENABLE_PROXY:
        print("\n初始化代理管理器...")
        proxy_manager = ProxyManager(config.PROXY_YAML_PATH)
        if proxy_manager.has_proxies():
            print(f"✓ 加载了 {proxy_manager.get_proxy_count()} 个代理节点")
        else:
            print("⚠ 未找到可用代理，将不使用代理")
            proxy_manager = None
    
    if config.EMAIL_TYPE == 'microsoft':
        # 微软邮箱模式：从 CSV 加载账号
        accounts = load_accounts(force_file=True)
        
        # 读取已注册账号列表（通过 clientId 判断）
        registered_client_ids = set()
        if os.path.exists(config.RESULTS_JSON):
            try:
                with open(config.RESULTS_JSON, 'r', encoding='utf-8') as f:
                    registered_accounts = json.load(f)
                    registered_client_ids = {acc.get('clientId') for acc in registered_accounts if acc.get('clientId')}
                    print(f"已注册账号数: {len(registered_client_ids)}")
            except:
                pass
        
        # 过滤掉已注册的账号（通过 client_id 匹配）
        accounts_to_register = [acc for acc in accounts if acc['client_id'] not in registered_client_ids]
        skipped_count = len(accounts) - len(accounts_to_register)
        
        total = len(accounts_to_register)
        print(f"\n共加载 {len(accounts)} 个账号")
        print(f"跳过已注册: {skipped_count} 个")
        print(f"待注册: {total} 个\n")
    else:
        # 临时邮箱模式：询问注册数量
        try:
            count = int(input("请输入要注册的账号数量: "))
            if count <= 0:
                print("数量必须大于 0")
                return
            accounts_to_register = [None] * count  # 占位符
            total = count
            print(f"\n将注册 {total} 个账号\n")
        except ValueError:
            print("输入无效")
            return
    
    # 询问是否使用多线程
    use_threads = False
    if config.MAX_THREADS > 1:
        choice = input(f"\n是否启用多线程模式？(最多 {config.MAX_THREADS} 个并发) [y/N]: ").strip().lower()
        use_threads = choice == 'y'
    
    if use_threads:
        print(f"\n使用多线程模式，并发数: {config.MAX_THREADS}")
        _batch_mode_threaded(accounts_to_register, total, proxy_manager)
    else:
        print("\n使用单线程模式")
        _batch_mode_sequential(accounts_to_register, total, proxy_manager)


def _batch_mode_sequential(accounts_to_register, total, proxy_manager=None):
    """单线程批量注册"""
    success_count = 0
    failed_count = 0
    
    for index, account in enumerate(accounts_to_register, 1):
        print(f"进度: {index}/{total}")
        
        # 获取代理
        proxy = None
        if proxy_manager and proxy_manager.has_proxies():
            proxy = proxy_manager.get_proxy_for_thread(
                use_clash_local=config.USE_CLASH_LOCAL,
                clash_port=config.CLASH_LOCAL_PORT
            )
        
        # 微软邮箱模式需要保存临时文件
        if config.EMAIL_TYPE == 'microsoft' and account:
            with open(config.TEMP_ACCOUNT_CSV, 'w', encoding='utf-8') as f:
                f.write(f"{account['email']}----{account['password']}----{account['client_id']}----{account['refresh_token']}\n")
        
        try:
            success = register_account(account, proxy=proxy)
            if success:
                success_count += 1
                email = account['email'] if account else '临时邮箱'
                print(f"\n✓ [{index}/{total}] {email} 注册成功")
            else:
                failed_count += 1
                email = account['email'] if account else '临时邮箱'
                print(f"\n✗ [{index}/{total}] {email} 注册失败")
        except Exception as e:
            failed_count += 1
            email = account['email'] if account else '临时邮箱'
            print(f"\n✗ [{index}/{total}] {email} 处理异常: {e}")
        
        # 清理临时文件
        if config.EMAIL_TYPE == 'microsoft':
            try:
                os.remove(config.TEMP_ACCOUNT_CSV)
            except:
                pass
        
        # 账号之间间隔
        if index < total:
            print(f"\n等待 {config.BATCH_INTERVAL} 秒后处理下一个账号...")
            time.sleep(config.BATCH_INTERVAL)
    
    # 最终统计
    print(f"\n{'='*60}")
    print(f"批量注册完成！")
    print(f"总计: {total} 个账号")
    print(f"成功: {success_count} 个")
    print(f"失败: {failed_count} 个")
    print(f"成功率: {success_count/total*100:.1f}%")
    print(f"{'='*60}")


def _register_account_worker(account, index, total, lock, proxy_manager=None):
    """多线程工作函数"""
    thread_id = f"[线程-{index}]"
    
    try:
        with lock:
            print(f"\n{thread_id} 开始处理 ({index}/{total})")
        
        # 获取代理
        proxy = None
        if proxy_manager and proxy_manager.has_proxies():
            proxy = proxy_manager.get_proxy_for_thread(
                use_clash_local=config.USE_CLASH_LOCAL,
                clash_port=config.CLASH_LOCAL_PORT
            )
        
        # 微软邮箱模式需要保存临时文件（使用线程安全的文件名）
        if config.EMAIL_TYPE == 'microsoft' and account:
            temp_file = f"temp_account_{index}.csv"
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(f"{account['email']}----{account['password']}----{account['client_id']}----{account['refresh_token']}\n")
        
        success = register_account(account, proxy=proxy)
        
        # 清理临时文件
        if config.EMAIL_TYPE == 'microsoft' and account:
            try:
                os.remove(temp_file)
            except:
                pass
        
        email = account['email'] if account else '临时邮箱'
        
        with lock:
            if success:
                print(f"\n{thread_id} ✓ {email} 注册成功")
            else:
                print(f"\n{thread_id} ✗ {email} 注册失败")
        
        return success, email, None
        
    except Exception as e:
        email = account['email'] if account else '临时邮箱'
        with lock:
            print(f"\n{thread_id} ✗ {email} 处理异常: {e}")
        return False, email, str(e)


def _batch_mode_threaded(accounts_to_register, total, proxy_manager=None):
    """多线程批量注册"""
    success_count = 0
    failed_count = 0
    lock = Lock()
    
    print(f"\n启动 {config.MAX_THREADS} 个线程...")
    
    with ThreadPoolExecutor(max_workers=config.MAX_THREADS) as executor:
        # 提交所有任务
        futures = {
            executor.submit(_register_account_worker, account, index, total, lock, proxy_manager): (account, index)
            for index, account in enumerate(accounts_to_register, 1)
        }
        
        # 等待完成
        for future in as_completed(futures):
            account, index = futures[future]
            try:
                success, email, error = future.result()
                if success:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                failed_count += 1
                with lock:
                    print(f"\n线程异常: {e}")
    
    # 最终统计
    print(f"批量注册完成！")
    print(f"总计: {total} 个账号")
    print(f"成功: {success_count} 个")
    print(f"失败: {failed_count} 个")
    print(f"成功率: {success_count/total*100:.1f}%")
    print(f"成功: {success_count} 个")
    print(f"失败: {failed_count} 个")
    print(f"成功率: {success_count/total*100:.1f}%" if total > 0 else "成功率: 0%")


if __name__ == '__main__':
    import sys
    
    # 检查命令行参数
    if '--batch' in sys.argv or '-b' in sys.argv:
        batch_mode()
    else:
        main()
