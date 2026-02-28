import supabase from './supabaseClient.js'

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error

  return data
}

export async function updateProfile(userId, data) {
  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error

  return updatedProfile
}
