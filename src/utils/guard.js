import supabase from '../services/supabaseClient.js'

async function fetchSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data?.session ?? null
}

export async function requireAuth() {
  const session = await fetchSession()

  if (!session) {
    window.location.href = '/login.html'
    return null
  }

  return session
}

export async function requireAdmin() {
  const session = await fetchSession()

  if (!session) {
    window.location.href = '/login.html'
    return null
  }

  const userId = session.user?.id

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || data?.role !== 'admin') {
    window.location.href = '/index.html'
    return null
  }

  return session
}

export async function redirectIfLoggedIn() {
  const session = await fetchSession()

  if (session) {
    window.location.href = '/index.html'
    return session
  }

  return null
}
