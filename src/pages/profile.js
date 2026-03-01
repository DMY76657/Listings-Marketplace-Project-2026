import supabase from '../services/supabaseClient.js'
import { getCurrentUser } from '../services/authService.js'
import { getProfile, updateProfile } from '../services/profileService.js'
import { requireAuth } from '../utils/guard.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/120?text=Avatar'

function setAvatarImage(url) {
  const avatarImage = document.getElementById('avatarImage')
  if (!avatarImage) return
  avatarImage.src = url || PLACEHOLDER_AVATAR
}

async function uploadAvatar(userId, file) {
  const filePath = `${userId}/avatar.png`

  const { error: uploadError } = await supabase
    .storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return data?.publicUrl || null
}

async function initializePage() {
  showLoader()

  try {
    const session = await requireAuth()
    if (!session) return

    await initNavbar()

    const user = await getCurrentUser()
    if (!user) {
      window.location.href = '/login.html'
      return
    }

    const userId = user.id
    const profile = await getProfile(userId)

    const displayNameInput = document.getElementById('display_name')
    const avatarInput = document.getElementById('avatar')
    const form = document.getElementById('profileForm')

    if (displayNameInput) {
      displayNameInput.value = profile?.display_name || ''
    }

    setAvatarImage(profile?.avatar_url)

    if (avatarInput) {
      avatarInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
          showLoader()
          const avatarUrl = await uploadAvatar(userId, file)
          await updateProfile(userId, { avatar_url: avatarUrl })
          setAvatarImage(avatarUrl)
          showToast('Avatar updated successfully.', 'success')
        } catch (error) {
          showToast(error?.message || 'Failed to upload avatar.', 'danger')
        } finally {
          hideLoader()
        }
      })
    }

    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault()

        try {
          showLoader()
          const newDisplayName = displayNameInput?.value?.trim() || ''
          const updated = await updateProfile(userId, { display_name: newDisplayName })
          displayNameInput.value = updated?.display_name || ''
          showToast('Profile updated successfully.', 'success')
        } catch (error) {
          showToast(error?.message || 'Failed to update profile.', 'danger')
        } finally {
          hideLoader()
        }
      })
    }
  } catch (error) {
    showToast(error?.message || 'Failed to load profile page.', 'danger')
  } finally {
    hideLoader()
  }
}

initializePage()
