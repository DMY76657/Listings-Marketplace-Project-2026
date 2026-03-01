import supabase from './supabaseClient.js'

export async function getAllUsers() {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, created_at')
    .order('created_at', { ascending: false })

  if (profilesError) throw profilesError

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')

  if (rolesError) throw rolesError

  const roleByUserId = new Map((roles ?? []).map((item) => [item.user_id, item.role]))

  return (profiles ?? []).map((profile) => ({
    profile,
    role: roleByUserId.get(profile.id) || 'user',
  }))
}

export async function setRole(userId, role) {
  const { error } = await supabase
    .from('user_roles')
    .upsert(
      {
        user_id: userId,
        role,
      },
      { onConflict: 'user_id' }
    )

  if (error) throw error
}

export async function getAllListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, owner_id, title, price, status, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function setListingStatus(listingId, status) {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId)
  if (error) throw error
}

export async function deleteListing(listingId) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  if (error) throw error
}
