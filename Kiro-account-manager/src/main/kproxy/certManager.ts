// K-Proxy CA 证书管理
import * as forge from 'node-forge'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { CACertInfo } from './types'

const CA_CERT_FILENAME = 'kproxy-ca.crt'
const CA_KEY_FILENAME = 'kproxy-ca.key'
const CERT_CACHE_DIR = 'kproxy-certs'

// 证书缓存（避免重复生成）
const certCache = new Map<string, { cert: string; key: string }>()

/**
 * CA 证书管理器
 */
export class CertManager {
  private dataPath: string
  private caCert: forge.pki.Certificate | null = null
  private caKey: forge.pki.PrivateKey | null = null
  private caInfo: CACertInfo | null = null

  constructor(dataPath: string) {
    this.dataPath = dataPath
  }

  /**
   * 初始化 CA 证书（加载或生成）
   */
  async initialize(): Promise<CACertInfo> {
    const certPath = path.join(this.dataPath, CA_CERT_FILENAME)
    const keyPath = path.join(this.dataPath, CA_KEY_FILENAME)

    // 确保证书缓存目录存在
    const cachePath = path.join(this.dataPath, CERT_CACHE_DIR)
    if (!fs.existsSync(cachePath)) {
      fs.mkdirSync(cachePath, { recursive: true })
    }

    // 尝试加载现有证书
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      try {
        const certPem = fs.readFileSync(certPath, 'utf8')
        const keyPem = fs.readFileSync(keyPath, 'utf8')
        
        this.caCert = forge.pki.certificateFromPem(certPem)
        this.caKey = forge.pki.privateKeyFromPem(keyPem)

        // 检查证书是否过期
        const now = new Date()
        if (this.caCert.validity.notAfter > now) {
          this.caInfo = this.extractCertInfo(certPath, keyPath, certPem, keyPem)
          console.log('[CertManager] Loaded existing CA certificate')
          return this.caInfo
        }
        console.log('[CertManager] CA certificate expired, regenerating...')
      } catch (error) {
        console.error('[CertManager] Failed to load CA certificate:', error)
      }
    }

    // 生成新的 CA 证书
    return this.generateCACert(certPath, keyPath)
  }

  /**
   * 生成 CA 证书
   */
  private generateCACert(certPath: string, keyPath: string): CACertInfo {
    console.log('[CertManager] Generating new CA certificate...')

    // 生成 RSA 密钥对
    const keys = forge.pki.rsa.generateKeyPair(2048)
    
    // 创建证书
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = this.generateSerialNumber()
    
    // 设置有效期（10年）
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)

    // 设置证书属性
    const attrs = [
      { name: 'commonName', value: 'K-Proxy CA' },
      { name: 'organizationName', value: 'Kiro Account Manager' },
      { name: 'countryName', value: 'CN' }
    ]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)

    // 设置 CA 扩展
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        critical: true
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        critical: true
      },
      {
        name: 'subjectKeyIdentifier'
      }
    ])

    // 自签名
    cert.sign(keys.privateKey, forge.md.sha256.create())

    // 转换为 PEM 格式
    const certPem = forge.pki.certificateToPem(cert)
    const keyPem = forge.pki.privateKeyToPem(keys.privateKey)

    // 保存到文件
    fs.writeFileSync(certPath, certPem)
    fs.writeFileSync(keyPath, keyPem)

    this.caCert = cert
    this.caKey = keys.privateKey
    this.caInfo = this.extractCertInfo(certPath, keyPath, certPem, keyPem)

    console.log('[CertManager] CA certificate generated successfully')
    return this.caInfo
  }

  /**
   * 为指定域名生成证书
   */
  generateCertForHost(hostname: string): { cert: string; key: string } {
    // 检查缓存
    const cached = certCache.get(hostname)
    if (cached) {
      return cached
    }

    if (!this.caCert || !this.caKey) {
      throw new Error('CA certificate not initialized')
    }

    // 生成密钥对
    const keys = forge.pki.rsa.generateKeyPair(2048)
    
    // 创建证书
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = this.generateSerialNumber()
    
    // 设置有效期（1年）
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)

    // 设置证书属性
    const attrs = [
      { name: 'commonName', value: hostname },
      { name: 'organizationName', value: 'K-Proxy' }
    ]
    cert.setSubject(attrs)
    cert.setIssuer(this.caCert.subject.attributes)

    // 设置扩展
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: hostname }, // DNS
          { type: 2, value: '*.' + hostname } // 通配符
        ]
      }
    ])

    // 使用 CA 私钥签名
    cert.sign(this.caKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create())

    const result = {
      cert: forge.pki.certificateToPem(cert),
      key: forge.pki.privateKeyToPem(keys.privateKey)
    }

    // 缓存证书
    certCache.set(hostname, result)

    return result
  }

  /**
   * 获取 CA 证书信息
   */
  getCACertInfo(): CACertInfo | null {
    return this.caInfo
  }

  /**
   * 获取 CA 证书 PEM
   */
  getCACertPem(): string | null {
    return this.caInfo?.certPem || null
  }

  /**
   * 清除证书缓存
   */
  clearCache(): void {
    certCache.clear()
  }

  /**
   * 生成序列号
   */
  private generateSerialNumber(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * 提取证书信息
   */
  private extractCertInfo(certPath: string, keyPath: string, certPem: string, keyPem: string): CACertInfo {
    const cert = forge.pki.certificateFromPem(certPem)
    const fingerprint = forge.md.sha256.create()
      .update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
      .digest()
      .toHex()
      .match(/.{2}/g)!
      .join(':')
      .toUpperCase()

    return {
      certPath,
      keyPath,
      certPem,
      keyPem,
      fingerprint,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter
    }
  }
}

/**
 * 创建证书管理器实例
 */
export function createCertManager(dataPath: string): CertManager {
  return new CertManager(dataPath)
}
