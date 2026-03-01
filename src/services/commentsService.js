import supabase from './supabaseClient.js'

export async function getByListing(listingId) {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, listing_id, author_id, content, created_at')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const commentsList = comments ?? []
  if (!commentsList.length) return []

  const uniqueAuthorIds = [...new Set(commentsList.map((item) => item.author_id).filter(Boolean))]
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', uniqueAuthorIds)

  if (profileError) throw profileError

  const displayNameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]))

  return commentsList.map((comment) => ({
    ...comment,
    author_name: displayNameById.get(comment.author_id) || 'Unknown user',
  }))
}

export async function add(listingId, authorId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      listing_id: listingId,
      author_id: authorId,
      content,
    })
    .select('id, listing_id, author_id, content, created_at')
    .single()

  if (error) throw error
  return data
}

export async function remove(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
