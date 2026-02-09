import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 SVG 文件
const svgPath = join(__dirname, '../src/assets/logo.svg')
const svgBuffer = readFileSync(svgPath)

// Tauri 应用图标所需的所有尺寸
const iconSizes = [
  // 基础尺寸
  { name: 'icon_16x16', size: 16 },
  { name: 'icon_24x24', size: 24 },
  { name: 'icon_32x32', size: 32 },
  { name: 'icon_48x48', size: 48 },
  { name: 'icon_64x64', size: 64 },
  { name: 'icon_128x128', size: 128 },
  { name: 'icon_256x256', size: 256 },
  { name: 'icon_512x512', size: 512 },
  { name: 'icon_1024x1024', size: 1024 },
  
  // @2x 尺寸
  { name: 'icon_16x16@2x', size: 32 },
  { name: 'icon_32x32@2x', size: 64 },
  { name: 'icon_128x128@2x', size: 256 },
  { name: 'icon_256x256@2x', size: 512 },
  { name: 'icon_512x512@2x', size: 1024 },
  
  // 其他尺寸
  { name: '32x32', size: 32 },
  { name: '128x128', size: 128 },
  { name: '128x128@2x', size: 256 },
  { name: 'icon', size: 512 },
  
  // Windows Store Logo 尺寸
  { name: 'Square30x30Logo', size: 30 },
  { name: 'Square44x44Logo', size: 44 },
  { name: 'Square71x71Logo', size: 71 },
  { name: 'Square89x89Logo', size: 89 },
  { name: 'Square107x107Logo', size: 107 },
  { name: 'Square142x142Logo', size: 142 },
  { name: 'Square150x150Logo', size: 150 },
  { name: 'Square284x284Logo', size: 284 },
  { name: 'Square310x310Logo', size: 310 },
  { name: 'StoreLogo', size: 50 }
]

console.log('开始生成 Tauri 应用图标...')

const iconsDir = join(__dirname, '../src-tauri/icons')

for (const { name, size } of iconSizes) {
  const outputPath = join(iconsDir, `${name}.png`)
  
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath)
  
  console.log(`已生成: ${name}.png (${size}x${size})`)
}

console.log('图标生成完成！')

