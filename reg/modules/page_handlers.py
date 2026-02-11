"""
页面处理器模块
"""
import time
import random
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from .utils import human_like_type
import config


class PageHandler:
    """页面处理器"""
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
    
    def handle_email_page(self, account):
        """处理邮箱输入页面"""
        print("\n邮箱输入页面")
        
        # 等待邮箱输入框
        print("等待邮箱输入框...")
        email_input = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[placeholder="username@example.com"]'))
        )
        
        # 检查输入框是否已有正确内容
        current_value = email_input.get_attribute('value') or ''
        if current_value == account['email']:
            print(f"✓ 邮箱已正确填写: {account['email']}，跳过输入")
        else:
            # 清空并输入邮箱
            print(f"输入邮箱: {account['email']}")
            time.sleep(random.uniform(0.5, 1.5) if config.ENABLE_RANDOM_DELAY else 0.3)
            email_input.click()
            time.sleep(random.uniform(0.2, 0.5) if config.ENABLE_RANDOM_DELAY else 0.1)
            
            # 清空输入框
            from selenium.webdriver.common.keys import Keys
            email_input.send_keys(Keys.CONTROL + "a")
            time.sleep(0.1)
            email_input.send_keys(Keys.DELETE)
            time.sleep(0.3 if config.ENABLE_RANDOM_DELAY else 0.1)
            
            # 输入邮箱（根据配置选择模拟打字或直接输入）
            if config.ENABLE_HUMAN_TYPING:
                human_like_type(email_input, account['email'])
            else:
                email_input.send_keys(account['email'])
            
            print("邮箱已输入")
        
        # 点击继续按钮
        time.sleep(random.uniform(1.5, 3.0) if config.ENABLE_RANDOM_DELAY else 1.0)
        print("点击继续按钮...")
        
        continue_button = self.wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[data-testid="test-primary-button"]'))
        )
        continue_button.click()
        
        print("已点击继续按钮")
        time.sleep(random.uniform(3, 5) if config.ENABLE_RANDOM_DELAY else 2)
    
    def handle_name_page(self, random_name):
        """处理姓名输入页面"""
        print("\n姓名输入页面")
        
        # 等待姓名输入框
        print("等待姓名输入框...")
        name_input = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[placeholder*="Maria"]'))
        )
        
        # 检查输入框是否已有正确内容
        current_value = name_input.get_attribute('value') or ''
        if current_value == random_name:
            print(f"✓ 姓名已正确填写: {random_name}，跳过输入")
        else:
            # 输入姓名
            print(f"输入姓名: {random_name}")
            time.sleep(random.uniform(0.8, 2.0) if config.ENABLE_RANDOM_DELAY else 0.5)
            name_input.click()
            time.sleep(random.uniform(0.2, 0.5) if config.ENABLE_RANDOM_DELAY else 0.1)
            
            # 清空并输入
            from selenium.webdriver.common.keys import Keys
            name_input.send_keys(Keys.CONTROL + "a")
            time.sleep(0.1)
            name_input.send_keys(Keys.DELETE)
            time.sleep(0.3 if config.ENABLE_RANDOM_DELAY else 0.1)
            
            # 输入姓名（根据配置选择模拟打字或直接输入）
            if config.ENABLE_HUMAN_TYPING:
                human_like_type(name_input, random_name, min_delay=0.1, max_delay=0.25)
            else:
                name_input.send_keys(random_name)
            
            print("姓名已输入")
        
        # 点击继续按钮
        time.sleep(random.uniform(1.5, 3.0) if config.ENABLE_RANDOM_DELAY else 1.0)
        print("点击继续按钮...")
        
        continue_button = self.wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[data-testid="signup-next-button"]'))
        )
        continue_button.click()
        
        print("已点击继续按钮")
        time.sleep(random.uniform(3, 5) if config.ENABLE_RANDOM_DELAY else 2)
    
    def handle_verification_page(self, email_manager, code_callback=None):
        """处理验证码页面"""
        print("\n验证码页面")
        print(f"邮箱: {email_manager.get_email()}")
        
        try:
            # 立即开始获取验证码（不等待输入框）
            if code_callback:
                code_callback('fetching', '正在自动获取验证码...')
            
            print("\n开始自动获取验证码...")
            
            # 使用邮箱管理器获取验证码（异步进行）
            code = email_manager.wait_for_verification_code()
            
            if not code:
                print("✗ 未能自动获取验证码")
                if code_callback:
                    code_callback('failed', '自动获取验证码失败')
                return False
            
            print(f"\n✓ 验证码: {code}")
            
            if code_callback:
                code_callback('success', f'成功获取验证码: {code}', code)
            
            # 查找验证码输入框（此时应该已经加载好了）
            code_input = None
            
            verification_selectors = [
                'input[placeholder="6-digit"]',
                'input[placeholder*="digit"]',
                'input[type="text"][autocomplete="on"]',
            ]
            
            # 先尝试直接查找（不等待）
            for selector in verification_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for elem in elements:
                        if elem.is_displayed():
                            code_input = elem
                            print(f"✓ 找到验证码输入框（已加载）")
                            break
                    if code_input:
                        break
                except:
                    continue
            
            # 如果没找到，再等待一下
            if not code_input:
                print("输入框未加载，等待中...")
                for selector in verification_selectors:
                    try:
                        code_input = self.wait.until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                        )
                        if code_input.is_displayed():
                            print(f"✓ 找到验证码输入框")
                            break
                    except:
                        continue
            
            if not code_input:
                raise Exception("未找到验证码输入框")
            
            # 检查输入框是否已有正确内容
            current_value = code_input.get_attribute('value') or ''
            if current_value == code:
                print(f"✓ 验证码已正确填写: {code}，跳过输入")
            else:
                # 输入验证码
                time.sleep(random.uniform(0.5, 1.0) if config.ENABLE_RANDOM_DELAY else 0.1)
                code_input.click()
                time.sleep(0.3 if config.ENABLE_RANDOM_DELAY else 0.1)
                
                # 输入验证码（根据配置选择模拟打字或直接输入）
                if config.ENABLE_HUMAN_TYPING:
                    human_like_type(code_input, code)
                else:
                    code_input.send_keys(code)
                
                print("✓ 验证码已输入")
            
            if code_callback:
                code_callback('input', '验证码已输入')
            
            # 立即查找并点击继续按钮
            print("点击继续按钮...")
            
            button_selectors = [
                'button[data-testid="test-primary-button"]',
                'button[data-testid="email-verification-verify-button"]',
                'button[type="submit"]'
            ]
            
            continue_button = None
            
            # 先尝试直接查找（不等待）
            for selector in button_selectors:
                try:
                    buttons = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for btn in buttons:
                        if btn.is_displayed() and btn.is_enabled():
                            continue_button = btn
                            print(f"✓ 找到继续按钮（已加载）")
                            break
                    if continue_button:
                        break
                except:
                    continue
            
            # 如果没找到，再等待一下
            if not continue_button:
                print("按钮未加载，等待中...")
                for selector in button_selectors:
                    try:
                        continue_button = self.wait.until(
                            EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                        )
                        if continue_button:
                            print(f"✓ 找到继续按钮")
                            break
                    except:
                        continue
            
            if not continue_button:
                raise Exception("未找到继续按钮")
            
            continue_button.click()
            
            print("✓ 已点击继续按钮")
            time.sleep(random.uniform(3, 5) if config.ENABLE_RANDOM_DELAY else 2)
            return True
            
        except Exception as e:
            print(f"✗ 处理验证码页面失败: {e}")
            if code_callback:
                code_callback('failed', f'处理验证码页面失败: {str(e)}')
            import traceback
            traceback.print_exc()
            return False
    
    def handle_password_page(self, aws_password):
        """处理密码设置页面"""
        print("\n密码设置页面")
        
        try:
            # 获取所有密码输入框
            print(f"输入密码...")
            password_inputs = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
            
            if len(password_inputs) < 2:
                print(f"只找到 {len(password_inputs)} 个密码输入框，预期 2 个")
                return False
            
            # 检查两个密码框是否已有正确内容
            current_value_1 = password_inputs[0].get_attribute('value') or ''
            current_value_2 = password_inputs[1].get_attribute('value') or ''
            
            if current_value_1 == aws_password and current_value_2 == aws_password:
                print(f"✓ 密码已正确填写，跳过输入")
            else:
                # 滚动到第一个密码输入框并输入
                time.sleep(random.uniform(0.8, 1.5) if config.ENABLE_RANDOM_DELAY else 0.5)
                self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", password_inputs[0])
                time.sleep(0.5 if config.ENABLE_RANDOM_DELAY else 0.2)
                password_inputs[0].click()
                time.sleep(random.uniform(0.3, 0.6) if config.ENABLE_RANDOM_DELAY else 0.2)
                
                # 清空第一个输入框
                from selenium.webdriver.common.keys import Keys
                password_inputs[0].send_keys(Keys.CONTROL + "a")
                time.sleep(0.1)
                password_inputs[0].send_keys(Keys.DELETE)
                time.sleep(0.3 if config.ENABLE_RANDOM_DELAY else 0.1)
                
                # 输入主密码（根据配置选择模拟打字或直接输入）
                if config.ENABLE_HUMAN_TYPING:
                    human_like_type(password_inputs[0], aws_password)
                else:
                    password_inputs[0].send_keys(aws_password)
                
                print("主密码已输入")
                
                # 滚动到第二个密码输入框并输入
                time.sleep(random.uniform(0.8, 1.5) if config.ENABLE_RANDOM_DELAY else 0.5)
                self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", password_inputs[1])
                time.sleep(0.5 if config.ENABLE_RANDOM_DELAY else 0.2)
                password_inputs[1].click()
                time.sleep(random.uniform(0.3, 0.6) if config.ENABLE_RANDOM_DELAY else 0.2)
                
                # 清空第二个输入框
                password_inputs[1].send_keys(Keys.CONTROL + "a")
                time.sleep(0.1)
                password_inputs[1].send_keys(Keys.DELETE)
                time.sleep(0.3 if config.ENABLE_RANDOM_DELAY else 0.1)
                
                # 输入确认密码（根据配置选择模拟打字或直接输入）
                if config.ENABLE_HUMAN_TYPING:
                    human_like_type(password_inputs[1], aws_password)
                else:
                    password_inputs[1].send_keys(aws_password)
                
                print("确认密码已输入")
            
            # 点击继续按钮
            time.sleep(random.uniform(2.0, 4.0) if config.ENABLE_RANDOM_DELAY else 1.5)
            print("点击继续按钮...")
            
            continue_button = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[data-testid="test-primary-button"]'))
            )
            
            # 滚动到按钮位置并点击
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", continue_button)
            time.sleep(0.5 if config.ENABLE_RANDOM_DELAY else 0.2)
            
            # 尝试 JavaScript 点击，如果失败再用普通点击
            try:
                self.driver.execute_script("arguments[0].click();", continue_button)
            except:
                continue_button.click()
            
            print("已点击继续按钮")
            time.sleep(random.uniform(5, 8) if config.ENABLE_RANDOM_DELAY else 3)
            return True
            
        except Exception as e:
            print(f"设置密码失败: {e}")
            return False
