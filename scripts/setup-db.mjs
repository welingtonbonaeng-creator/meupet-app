// Script de setup do banco MeuPet+ no Supabase
// Roda: node scripts/setup-db.mjs

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const sql   = readFileSync(join(__dir, '../schema.sql'), 'utf8')

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  await client.connect()
  console.log('Conectado ao Supabase!')

  // Executar SQL em blocos (separados por ;)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let ok = 0, skip = 0
  for (const stmt of statements) {
    try {
      await client.query(stmt)
      ok++
    } catch (e) {
      if (e.code === '42P07' || e.message.includes('already exists')) {
        skip++
      } else {
        console.error('ERRO:', e.message.slice(0, 100))
        console.error('Statement:', stmt.slice(0, 80))
      }
    }
  }

  console.log(`✓ ${ok} statements executados, ${skip} já existiam`)
  console.log('Setup concluído!')
} finally {
  await client.end()
}
