import supabase from './supabaseClient.js'

export async function getPublished(search, minPrice, maxPrice, category) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    query = query.gte('price', Number(minPrice))
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    query = query.lte('price', Number(maxPrice))
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getById(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getByOwner(userId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getAll() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function create(data) {
  const { data: inserted, error } = await supabase
    .from('listings')
    .insert(data)
    .select('*')
    .single()

  if (error) throw error
  return inserted
}

export async function update(id, data) {
  const { data: updated, error } = await supabase
    .from('listings')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return updated
}

export async function remove(id) {
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}
