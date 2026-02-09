import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const iconsDir = join(__dirname, '../src-tauri/icons')

// 读取不同尺寸的 PNG 文件，包含更多高清尺寸
const pngFiles = [
  join(iconsDir, 'icon_16x16.png'),
  join(iconsDir, 'icon_32x32.png'),
  join(iconsDir, 'icon_48x48.png'),
  join(iconsDir, 'icon_64x64.png'),
  join(iconsDir, 'icon_128x128.png'),
  join(iconsDir, 'icon_256x256.png')
]

console.log('开始生成 .ico 文件...')

const buf = await pngToIco(pngFiles)
writeFileSync(join(iconsDir, 'icon.ico'), buf)

console.log('已生成: icon.ico (包含 16, 32, 48, 64, 128, 256 尺寸)')
console.log('.ico 文件生成完成！')
