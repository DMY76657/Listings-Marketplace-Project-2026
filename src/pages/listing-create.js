import supabase from '../services/supabaseClient.js'
import { requireAuth } from '../utils/guard.js'
import { getCurrentUser } from '../services/authService.js'
import { create as createListing } from '../services/listingsService.js'
import { uploadListingImages } from '../services/storageService.js'

const elements = {
  navAddListing: document.getElementById('navAddListing'),
  navProfile: document.getElementById('navProfile'),
  navLogin: document.getElementById('navLogin'),
  navRegister: document.getElementById('navRegister'),
  navLogout: document.getElementById('navLogout'),
  createListingForm: document.getElementById('createListingForm'),
  submitBtn: document.getElementById('submitBtn'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  price: document.getElementById('price'),
  status: document.getElementById('status'),
  images: document.getElementById('images'),
}

function toggleVisibility(element, shouldShow) {
  if (!element) return
  element.classList.toggle('d-none', !shouldShow)
}

function setNavbarByAuth(isLoggedIn) {
  toggleVisibility(elements.navAddListing, isLoggedIn)
  toggleVisibility(elements.navProfile, isLoggedIn)
  toggleVisibility(elements.navLogout, isLoggedIn)

  toggleVisibility(elements.navLogin, !isLoggedIn)
  toggleVisibility(elements.navRegister, !isLoggedIn)
}

async function logoutAndReload() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  window.location.reload()
}

async function insertListingImagesRows(listingId, ownerId, imagesMeta) {
  if (!imagesMeta.length) return

  const rows = imagesMeta.map((item) => ({
    listing_id: listingId,
    owner_id: ownerId,
    file_path: item.file_path,
    public_url: item.public_url,
  }))

  const { error } = await supabase.from('listing_images').insert(rows)
  if (error) throw error
}

async function handleSubmit(event, user) {
  event.preventDefault()

  if (!elements.createListingForm?.checkValidity()) {
    elements.createListingForm?.reportValidity()
    return
  }

  const files = Array.from(elements.images?.files || [])

  elements.submitBtn.disabled = true

  try {
    const listing = await createListing({
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      price: Number(elements.price.value),
      status: elements.status.value,
      owner_id: user.id,
    })

    const uploadedImages = await uploadListingImages(user.id, listing.id, files)
    await insertListingImagesRows(listing.id, user.id, uploadedImages)

    window.location.href = `/listing-details.html?id=${listing.id}`
  } catch (error) {
    alert(error?.message || 'Failed to create listing.')
    elements.submitBtn.disabled = false
  }
}

async function init() {
  const session = await requireAuth()
  if (!session) return

  setNavbarByAuth(true)

  const user = await getCurrentUser()
  if (!user) {
    window.location.href = '/login.html'
    return
  }

  elements.createListingForm?.addEventListener('submit', (event) => {
    handleSubmit(event, user)
  })

  elements.navLogout?.addEventListener('click', async () => {
    try {
      await logoutAndReload()
    } catch (error) {
      alert(error?.message || 'Logout failed.')
    }
  })
}

init().catch((error) => {
  alert(error?.message || 'Failed to load page.')
})
