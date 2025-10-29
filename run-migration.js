// Run Supabase migration using the Supabase JS client
// This script reads supabase-migrations.sql and executes it

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get Supabase credentials from environment or .env.local
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials')
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  console.error('Or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('📖 Reading migration file...')
    const sql = readFileSync(join(__dirname, 'supabase-migrations.sql'), 'utf8')
    
    console.log('🚀 Executing migration...')
    
    // Split SQL into individual statements (split by semicolon and newline)
    // Remove comments and empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      if (statement.trim().length <= 1) continue
      
      try {
        console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''))
        
        // Use rpc to execute raw SQL (requires service role key)
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).catch(async () => {
          // If rpc doesn't exist, try direct query execution
          // Note: Supabase REST API doesn't support raw SQL execution directly
          // We need to use the SQL editor or management API
          console.warn('⚠️  Direct SQL execution not available via REST API')
          console.warn('⚠️  Please run the migration manually in Supabase Dashboard > SQL Editor')
          return { error: 'Cannot execute via REST API' }
        })
        
        if (error) {
          // Check if error is about rpc not existing
          if (error.message?.includes('function') || error.message?.includes('not found')) {
            console.warn('\n⚠️  Cannot execute SQL via REST API automatically')
            console.warn('⚠️  The Supabase REST API does not support direct SQL execution')
            console.warn('\n📋 Please run the migration manually:')
            console.warn('   1. Go to https://supabase.com/dashboard')
            console.warn('   2. Navigate to SQL Editor')
            console.warn('   3. Copy contents of supabase-migrations.sql')
            console.warn('   4. Paste and run')
            break
          }
          console.error(`Error executing statement ${i + 1}:`, error.message)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err.message)
      }
    }
    
    console.log('\n✨ Migration process completed!')
    console.log('📝 Note: If you see warnings above, please run the SQL manually in Supabase Dashboard')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\n📋 Please run the migration manually:')
    console.error('   1. Go to https://supabase.com/dashboard')
    console.error('   2. Navigate to SQL Editor')
    console.error('   3. Copy contents of supabase-migrations.sql')
    console.error('   4. Paste and run')
    process.exit(1)
  }
}

runMigration()

