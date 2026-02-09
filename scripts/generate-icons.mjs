import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pngToIco from 'png-to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, '..')
const svgPath = path.join(rootDir, 'src', 'assets', 'logo.svg')
const iconsDir = path.join(rootDir, 'src-tauri', 'icons')

// 确保图标目录存在
await fs.mkdir(iconsDir, { recursive: true })

// 读取 SVG 文件
const svgBuffer = await fs.readFile(svgPath)

// 生成各种尺寸的 PNG 图标，使用更高质量的设置
const sizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 24, name: 'icon_24x24.png' },
  { size: 32, name: '32x32.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 48, name: 'icon_48x48.png' },
  { size: 64, name: 'icon_64x64.png' },
  { size: 128, name: '128x128.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_1024x1024.png' },
  // Windows Store logos
  { size: 30, name: 'Square30x30Logo.png' },
  { size: 44, name: 'Square44x44Logo.png' },
  { size: 71, name: 'Square71x71Logo.png' },
  { size: 89, name: 'Square89x89Logo.png' },
  { size: 107, name: 'Square107x107Logo.png' },
  { size: 142, name: 'Square142x142Logo.png' },
  { size: 150, name: 'Square150x150Logo.png' },
  { size: 284, name: 'Square284x284Logo.png' },
  { size: 310, name: 'Square310x310Logo.png' },
  { size: 50, name: 'StoreLogo.png' }
]

console.log('生成 PNG 图标...')
for (const { size, name } of sizes) {
  const outputPath = path.join(iconsDir, name)
  await sharp(svgBuffer, { density: 600 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3
    })
    .png({
      compressionLevel: 9,
      quality: 100,
      palette: false
    })
    .toFile(outputPath)
  console.log(`✓ ${name}`)
}

// 生成 Windows ICO 文件（包含多个尺寸以提高清晰度）
console.log('\n生成 ICO 文件...')
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoBuffers = []

for (const size of icoSizes) {
  const buffer = await sharp(svgBuffer, { density: 600 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3
    })
    .png({
      compressionLevel: 9,
      quality: 100,
      palette: false
    })
    .toBuffer()
  icoBuffers.push(buffer)
}

const icoBuffer = await pngToIco(icoBuffers)
await fs.writeFile(path.join(iconsDir, 'icon.ico'), icoBuffer)
console.log('✓ icon.ico')

// 生成 macOS ICNS 所需的图标
console.log('\n生成 macOS ICNS 所需的图标...')
const icnsSizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' }
]

for (const { size, name } of icnsSizes) {
  const outputPath = path.join(iconsDir, name)
  await sharp(svgBuffer, { density: 600 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3
    })
    .png({
      compressionLevel: 9,
      quality: 100,
      palette: false
    })
    .toFile(outputPath)
  console.log(`✓ ${name}`)
}

console.log('\n所有图标生成完成！')
