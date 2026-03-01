import supabase from './supabaseClient.js'

export async function uploadListingImages(userId, listingId, files) {
  const uploaded = []
  const fileList = Array.from(files || [])

  for (const file of fileList) {
    const filePath = `${userId}/${listingId}/${crypto.randomUUID()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage.from('listing-images').getPublicUrl(filePath)

    uploaded.push({
      file_path: filePath,
      public_url: publicData?.publicUrl || '',
    })
  }

  return uploaded
}

export async function uploadAvatar(userId, file) {
  const filePath = `${userId}/avatar.png`

  const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
    upsert: true,
    contentType: file?.type || 'image/png',
  })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return data?.publicUrl || ''
}

export async function deleteImage(filePath, bucket) {
  const { error } = await supabase.storage.from(bucket).remove([filePath])
  if (error) throw error
}

export async function getDownloadUrl(filePath, bucket) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60)
  if (error) throw error
  return data?.signedUrl || ''
}
