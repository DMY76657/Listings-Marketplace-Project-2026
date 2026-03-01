import supabase from '../services/supabaseClient.js'
import { requireAuth } from '../utils/guard.js'
import { getCurrentUser } from '../services/authService.js'
import { create as createListing } from '../services/listingsService.js'
import { uploadListingImages } from '../services/storageService.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

const elements = {
  createListingForm: document.getElementById('createListingForm'),
  submitBtn: document.getElementById('submitBtn'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  price: document.getElementById('price'),
  status: document.getElementById('status'),
  images: document.getElementById('images'),
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
  showLoader()

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
    showToast(error?.message || 'Failed to create listing.', 'danger')
    elements.submitBtn.disabled = false
  } finally {
    hideLoader()
  }
}

async function init() {
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

    elements.createListingForm?.addEventListener('submit', (event) => {
      handleSubmit(event, user)
    })
  } finally {
    hideLoader()
  }
}

init().catch((error) => {
  showToast(error?.message || 'Failed to load page.', 'danger')
})
