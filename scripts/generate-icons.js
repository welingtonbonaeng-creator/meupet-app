// Generates icon-192.png and icon-512.png in public/icons/ without external deps.
// Blue background (#2563eb) with a white paw shape drawn via pixels.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crcChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcVal = zlib.crc32(crcInput) >>> 0
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crcVal)
  return Buffer.concat([len, typeBuf, data, crc])
}

// Draw a simple blue square PNG with white "M+" text approximated as pixels
function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)  // width
  ihdr.writeUInt32BE(size, 4)  // height
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Blue: #2563eb
  const BR = 37, BG = 99, BB = 235
  // White
  const WR = 255, WG = 255, WB = 255

  // Draw a paw with filled circles: center pad + 4 toe pads
  function isPaw(x, y) {
    const cx = size / 2, cy = size * 0.58
    const r = size * 0.22
    // Main pad
    if (Math.hypot(x - cx, y - cy) < r) return true
    // 4 toes
    const toeR = r * 0.38
    const toes = [
      [cx - r * 0.8, cy - r * 1.1],
      [cx - r * 0.28, cy - r * 1.38],
      [cx + r * 0.28, cy - r * 1.38],
      [cx + r * 0.8, cy - r * 1.1],
    ]
    for (const [tx, ty] of toes) {
      if (Math.hypot(x - tx, y - ty) < toeR) return true
    }
    return false
  }

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0 // filter
    for (let x = 0; x < size; x++) {
      const w = isPaw(x, y)
      row[1 + x * 3]     = w ? WR : BR
      row[2 + x * 3]     = w ? WG : BG
      row[3 + x * 3]     = w ? WB : BB
    }
    rows.push(row)
  }

  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    crcChunk('IHDR', ihdr),
    crcChunk('IDAT', compressed),
    crcChunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, '../public/icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const buf = createPNG(size)
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf)
  console.log(`icon-${size}.png  (${buf.length} bytes)`)
}
