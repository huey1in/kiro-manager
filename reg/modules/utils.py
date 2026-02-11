"""
工具函数模块
"""
import random
import string
import time

# 随机姓名列表
FIRST_NAMES = ['James', 'Robert', 'John', 'Michael', 'David', 'William', 'Richard', 'Maria', 'Elizabeth', 'Jennifer']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']


def generate_random_name():
    """生成随机姓名"""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"


def generate_aws_password():
    """生成符合 AWS Builder ID 要求的强随机密码"""
    upper = random.choices(string.ascii_uppercase, k=4)
    lower = random.choices(string.ascii_lowercase, k=6)
    digits = random.choices(string.digits, k=4)
    special = random.choices("!@#$%^&*", k=2)
    
    password = upper + lower + digits + special
    random.shuffle(password)
    
    return ''.join(password)


def human_like_type(element, text, min_delay=0.08, max_delay=0.2):
    """模拟人类打字"""
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(min_delay, max_delay))
        # 偶尔停顿
        if random.random() < 0.1:
            time.sleep(random.uniform(0.3, 0.8))
