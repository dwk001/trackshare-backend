// Check existing tables and provide SQL to create missing ones
// This uses Supabase REST API to check what exists, then provides SQL for missing tables

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xlhneoxxvdjylinwdidm.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaG5lb3h4dmRqeWxpbndkaWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTU3MjcsImV4cCI6MjA3Njg5MTcyN30.QFtPTq6wDSxgpr9CkjAHw7uo1em4FuhWY7FKPsqtp8k'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  const tables = ['profiles', 'provider_tokens', 'posts', 'post_likes', 'post_comments']
  const results = {}
  
  console.log('🔍 Checking Supabase tables...\n')
  
  for (const table of tables) {
    try {
      // Try to query the table (will fail if it doesn't exist)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0)
      
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not found')) {
          results[table] = { exists: false, error: error.message }
          console.log(`❌ ${table}: NOT FOUND`)
        } else {
          results[table] = { exists: true, error: null }
          console.log(`✅ ${table}: EXISTS`)
        }
      } else {
        results[table] = { exists: true, error: null }
        console.log(`✅ ${table}: EXISTS`)
      }
    } catch (err) {
      results[table] = { exists: false, error: err.message }
      console.log(`❌ ${table}: ERROR - ${err.message}`)
    }
  }
  
  console.log('\n📊 Summary:')
  const missingTables = Object.entries(results).filter(([_, r]) => !r.exists)
  
  if (missingTables.length === 0) {
    console.log('✨ All required tables exist!')
  } else {
    console.log(`\n⚠️  Missing ${missingTables.length} table(s):`)
    missingTables.forEach(([table, _]) => console.log(`   - ${table}`))
    console.log('\n📋 To create missing tables:')
    console.log('   1. Go to https://supabase.com/dashboard/project/xlhneoxxvdjylinwdidm')
    console.log('   2. Click "SQL Editor" in the left sidebar')
    console.log('   3. Click "New query"')
    console.log('   4. Copy and paste the contents of supabase-migrations.sql')
    console.log('   5. Click "Run" to execute')
    console.log('\n   Or use Supabase CLI:')
    console.log('   supabase db push supabase-migrations.sql')
  }
  
  return results
}

checkTables().catch(console.error)

