import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function parseEnv(content) {
  const env = {}
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    env[key] = value
  }

  return env
}

async function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env')

  try {
    const fileContent = await readFile(envPath, 'utf-8')
    return parseEnv(fileContent)
  } catch (error) {
    throw new Error(`Unable to read .env file at ${envPath}. ${error.message}`)
  }
}

async function findUserByEmail(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) throw error

  const users = data?.users || []
  return users.find((user) => user.email === email) || null
}

async function getOrCreateUser(supabase, email, password, displayName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
    },
  })

  if (!error && data?.user) {
    console.log(`Created user: ${email}`)
    return data.user
  }

  if (error) {
    const existingUser = await findUserByEmail(supabase, email)
    if (existingUser) {
      console.log(`User already exists: ${email}`)
      return existingUser
    }

    throw new Error(`Failed to create user ${email}: ${error.message}`)
  }

  throw new Error(`Unexpected user creation state for ${email}.`)
}

async function upsertProfile(supabase, userId, displayName) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      display_name: displayName,
    },
    { onConflict: 'id' }
  )

  if (error) throw error
}

async function upsertRole(supabase, userId, role) {
  const { error } = await supabase.from('user_roles').upsert(
    {
      user_id: userId,
      role,
    },
    { onConflict: 'user_id' }
  )

  if (error) throw error
}

async function ensureSampleListings(supabase, ownerId) {
  const sampleListings = [
    {
      title: 'iPhone 14 Pro 128GB',
      description: 'Excellent condition, unlocked, battery health 91%. Includes original box.',
      price: 799.0,
      status: 'published',
    },
    {
      title: 'Mountain Bike 29-inch',
      description: 'Lightly used bike with hydraulic brakes and upgraded tires.',
      price: 540.0,
      status: 'published',
    },
    {
      title: 'Gaming Desk 140cm',
      description: 'Spacious gaming/work desk with cable tray and cup holder.',
      price: 180.0,
      status: 'published',
    },
  ]

  for (const listing of sampleListings) {
    const { data: existing, error: existingError } = await supabase
      .from('listings')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('title', listing.title)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      console.log(`Listing already exists: ${listing.title}`)
      continue
    }

    const { error: insertError } = await supabase.from('listings').insert({
      owner_id: ownerId,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      status: listing.status,
    })

    if (insertError) throw insertError

    console.log(`Created listing: ${listing.title}`)
  }
}

async function main() {
  try {
    const envFromFile = await loadEnvFile()

    const supabaseUrl = process.env.VITE_SUPABASE_URL || envFromFile.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_KEY || envFromFile.VITE_SUPABASE_SERVICE_KEY

    if (!supabaseUrl) {
      throw new Error('Missing VITE_SUPABASE_URL in .env file.')
    }

    if (!serviceRoleKey) {
      throw new Error('Missing VITE_SUPABASE_SERVICE_KEY in .env file.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const demoUser = await getOrCreateUser(supabase, 'user@demo.com', 'demo123', 'Demo User')
    const adminUser = await getOrCreateUser(supabase, 'admin@demo.com', 'admin123', 'Demo Admin')

    await upsertProfile(supabase, demoUser.id, 'Demo User')
    await upsertProfile(supabase, adminUser.id, 'Demo Admin')
    console.log('Profiles upserted successfully.')

    await upsertRole(supabase, demoUser.id, 'user')
    await upsertRole(supabase, adminUser.id, 'admin')
    console.log('User roles upserted successfully.')

    await ensureSampleListings(supabase, demoUser.id)

    console.log('Demo data setup completed successfully.')
  } catch (error) {
    console.error('Demo data setup failed:', error.message)
    process.exitCode = 1
  }
}

main()
