#!/usr/bin/env python3
"""
Token 获取流程
"""
import asyncio
import aiohttp


async def get_tokens_simple(email, password, user_code, device_code, client_id, client_secret):
    """
    简化的 Token 获取流程
    
    前提：浏览器授权已完成（点击了"确认并继续"和"Allow access"）
    
    Args:
        email: 邮箱
        password: 密码
        user_code: 用户代码
        device_code: 设备代码
        client_id: OIDC 客户端 ID
        client_secret: OIDC 客户端密钥
    
    Returns:
        dict: {
            'status': 'success' | 'failed',
            'email': str,
            'aws_token': dict (可选),
            'kiro_tokens': dict (可选),
            'error': str (可选)
        }
    """
    print("开始轮询获取 Token")
    
    oidc_base_url = "https://oidc.us-east-1.amazonaws.com"
    
    # 轮询参数
    max_attempts = 40  # 最多尝试 40 次（约 2 分钟）
    interval = 3  # 每 3 秒轮询一次
    
    print(f"User Code: {user_code}")
    print(f"Device Code: {device_code[:30]}...")
    print(f"Client ID: {client_id[:30]}...")
    print(f"\n开始轮询（最多 {max_attempts} 次，间隔 {interval} 秒）...")
    
    async with aiohttp.ClientSession() as session:
        for attempt in range(max_attempts):
            print(f"\n[{attempt + 1}/{max_attempts}] 尝试获取 Token...")
            
            try:
                token_url = f"{oidc_base_url}/token"
                payload = {
                    'clientId': client_id,
                    'clientSecret': client_secret,
                    'grantType': 'urn:ietf:params:oauth:grant-type:device_code',
                    'deviceCode': device_code
                }
                
                async with session.post(token_url, json=payload) as resp:
                    status_code = resp.status
                    
                    if status_code == 200:
                        # 成功获取 token
                        token_data = await resp.json()
                        print("\n✓ AWS Token 获取成功！")
                        print(f"Access Token: {token_data.get('accessToken', '')[:50]}...")
                        print(f"Refresh Token: {token_data.get('refreshToken', '')[:50]}...")
                        
                        # 获取 Kiro Token（可选）
                        print("\n尝试交换 Kiro Token...")
                        kiro_tokens = await exchange_kiro_token(
                            session,
                            token_data['accessToken'],
                            client_id,
                            client_secret
                        )
                        
                        if kiro_tokens:
                            print("✓ Kiro Token 获取成功！")
                            print(f"Kiro Access Token: {kiro_tokens.get('accessToken', '')[:50]}...")
                            print(f"Kiro Refresh Token: {kiro_tokens.get('refreshToken', '')[:50]}...")
                        else:
                            print("ℹ Kiro Token 未获取（可使用 AWS Token 登录 Kiro IDE）")
                        
                        return {
                            'status': 'success',
                            'email': email,
                            'aws_token': token_data,
                            'kiro_tokens': kiro_tokens or {}
                        }
                    
                    elif status_code == 400:
                        # 检查错误类型
                        error_data = await resp.json()
                        error_code = error_data.get('error', '')
                        
                        if error_code == 'authorization_pending':
                            # 授权待处理，继续等待
                            print(f"  授权待处理，{interval} 秒后重试...")
                            await asyncio.sleep(interval)
                            continue
                        
                        elif error_code == 'slow_down':
                            # 减慢轮询速度
                            interval += 5
                            print(f"  减慢轮询速度到 {interval} 秒...")
                            await asyncio.sleep(interval)
                            continue
                        
                        else:
                            # 其他错误
                            print(f"✗ Token 获取失败: {error_code}")
                            return {
                                'status': 'failed',
                                'email': email,
                                'error': f"Token 获取失败: {error_code}"
                            }
                    
                    else:
                        # 其他 HTTP 状态码
                        print(f"  HTTP {status_code}，{interval} 秒后重试...")
                        await asyncio.sleep(interval)
                        
            except Exception as e:
                print(f"  轮询出错: {e}")
                await asyncio.sleep(interval)
        
        # 超时
        print("\n✗ Token 获取超时")
        return {
            'status': 'failed',
            'email': email,
            'error': 'Token 获取超时，授权可能未完成'
        }


async def exchange_kiro_token(session, aws_access_token, client_id, client_secret):
    """
    使用 AWS Access Token 交换 Kiro Token
    
    流程：
    1. 使用 Bearer Token 验证身份 (whoAmI)
    2. 获取设备会话令牌 (session/device)
    3. 注册新的 OIDC 客户端（用于 Kiro）
    4. 发起 Kiro 设备授权
    5. 接受用户代码并批准授权
    6. 轮询获取 Kiro Token
    
    Args:
        session: aiohttp ClientSession
        aws_access_token: AWS Access Token (作为 Bearer Token)
        client_id: OIDC 客户端 ID
        client_secret: OIDC 客户端密钥
    
    Returns:
        dict: Kiro tokens 或 None
    """
    try:
        print("  开始 Kiro Token 交换流程...")
        
        portal_base = 'https://portal.sso.us-east-1.amazonaws.com'
        oidc_base = 'https://oidc.us-east-1.amazonaws.com'
        
        # Step 1: 验证 Bearer Token (whoAmI)
        print("  [1/6] 验证 Bearer Token...")
        try:
            async with session.get(
                f"{portal_base}/token/whoAmI",
                headers={
                    'Authorization': f'Bearer {aws_access_token}',
                    'Accept': 'application/json'
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"  whoAmI 失败: {resp.status} - {error_text[:200]}")
                    return None
                print("  ✓ Bearer Token 验证成功")
        except Exception as e:
            print(f"  whoAmI 出错: {e}")
            return None
        
        # Step 2: 获取设备会话令牌
        print("  [2/6] 获取设备会话令牌...")
        device_session_token = None
        try:
            async with session.post(
                f"{portal_base}/session/device",
                headers={
                    'Authorization': f'Bearer {aws_access_token}',
                    'Content-Type': 'application/json'
                },
                json={}
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"  获取设备会话失败: {resp.status} - {error_text[:200]}")
                    return None
                
                data = await resp.json()
                device_session_token = data.get('token')
                if not device_session_token:
                    print(f"  响应中没有 token: {data}")
                    return None
                print("  ✓ 设备会话令牌获取成功")
        except Exception as e:
            print(f"  获取设备会话出错: {e}")
            return None
        
        # Step 3: 注册 Kiro OIDC 客户端
        print("  [3/6] 注册 Kiro OIDC 客户端...")
        kiro_client_id = None
        kiro_client_secret = None
        kiro_device_code = None
        kiro_user_code = None
        
        try:
            async with session.post(
                f"{oidc_base}/client/register",
                headers={'Content-Type': 'application/json'},
                json={
                    'clientName': 'Kiro Account Manager',
                    'clientType': 'public',
                    'scopes': [
                        'codewhisperer:analysis',
                        'codewhisperer:completions',
                        'codewhisperer:conversations',
                        'codewhisperer:taskassist',
                        'codewhisperer:transformations'
                    ],
                    'grantTypes': ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
                    'issuerUrl': 'https://view.awsapps.com/start'
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"  注册 Kiro 客户端失败: {resp.status} - {error_text[:200]}")
                    return None
                
                data = await resp.json()
                kiro_client_id = data.get('clientId')
                kiro_client_secret = data.get('clientSecret')
                print(f"  ✓ Kiro Client ID: {kiro_client_id[:30]}...")
        except Exception as e:
            print(f"  注册 Kiro 客户端出错: {e}")
            return None
        
        # Step 4: 发起 Kiro 设备授权
        print("  [4/6] 发起 Kiro 设备授权...")
        try:
            async with session.post(
                f"{oidc_base}/device_authorization",
                headers={'Content-Type': 'application/json'},
                json={
                    'clientId': kiro_client_id,
                    'clientSecret': kiro_client_secret,
                    'startUrl': 'https://view.awsapps.com/start'
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"  Kiro 设备授权失败: {resp.status} - {error_text[:200]}")
                    return None
                
                data = await resp.json()
                kiro_device_code = data.get('deviceCode')
                kiro_user_code = data.get('userCode')
                print(f"  ✓ Kiro User Code: {kiro_user_code}")
        except Exception as e:
            print(f"  Kiro 设备授权出错: {e}")
            return None
        
        # Step 5: 接受用户代码并批准授权
        print("  [5/6] 接受用户代码并批准授权...")
        device_context = None
        try:
            async with session.post(
                f"{oidc_base}/device_authorization/accept_user_code",
                headers={
                    'Content-Type': 'application/json',
                    'Referer': 'https://view.awsapps.com/'
                },
                json={
                    'userCode': kiro_user_code,
                    'userSessionId': device_session_token
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"  接受用户代码失败: {resp.status} - {error_text[:200]}")
                    return None
                
                data = await resp.json()
                device_context = data.get('deviceContext')
                if not device_context:
                    print(f"  响应中没有 deviceContext: {data}")
                    return None
                print("  ✓ 用户代码已接受")
        except Exception as e:
            print(f"  接受用户代码出错: {e}")
            return None
        
        # 批准授权
        try:
            async with session.post(
                f"{oidc_base}/device_authorization/associate_token",
                headers={
                    'Content-Type': 'application/json',
                    'Referer': 'https://view.awsapps.com/'
                },
                json={
                    'deviceContext': {
                        'deviceContextId': device_context.get('deviceContextId'),
                        'clientId': device_context.get('clientId') or kiro_client_id,
                        'clientType': device_context.get('clientType') or 'public'
                    },
                    'userSessionId': device_session_token
                }
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"  批准授权失败: {resp.status} - {error_text[:200]}")
                    return None
                print("  ✓ 授权已批准")
        except Exception as e:
            print(f"  批准授权出错: {e}")
            return None
        
        # Step 6: 轮询获取 Kiro Token
        print("  [6/6] 轮询获取 Kiro Token...")
        max_attempts = 20
        interval = 1
        
        for attempt in range(max_attempts):
            try:
                async with session.post(
                    f"{oidc_base}/token",
                    headers={'Content-Type': 'application/json'},
                    json={
                        'clientId': kiro_client_id,
                        'clientSecret': kiro_client_secret,
                        'grantType': 'urn:ietf:params:oauth:grant-type:device_code',
                        'deviceCode': kiro_device_code
                    }
                ) as resp:
                    if resp.status == 200:
                        kiro_tokens = await resp.json()
                        print("  ✓ Kiro Token 获取成功！")
                        return kiro_tokens
                    elif resp.status == 400:
                        error_data = await resp.json()
                        error_code = error_data.get('error', '')
                        
                        if error_code == 'authorization_pending':
                            await asyncio.sleep(interval)
                            continue
                        elif error_code == 'slow_down':
                            interval += 5
                            await asyncio.sleep(interval)
                            continue
                        else:
                            print(f"  Kiro Token 获取失败: {error_code}")
                            return None
                    else:
                        await asyncio.sleep(interval)
            except Exception as e:
                print(f"  轮询出错: {e}")
                await asyncio.sleep(interval)
        
        print("  Kiro Token 获取超时")
        return None
        
    except Exception as e:
        print(f"  Kiro token 交换出错: {e}")
        import traceback
        traceback.print_exc()
        return None
