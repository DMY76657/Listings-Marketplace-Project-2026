import supabase from '../services/supabaseClient.js'
import { requireAuth } from '../utils/guard.js'
import { getCurrentUser } from '../services/authService.js'
import { getById, update as updateListing } from '../services/listingsService.js'
import { uploadListingImages, deleteImage } from '../services/storageService.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

const elements = {
  editListingForm: document.getElementById('editListingForm'),
  saveBtn: document.getElementById('saveBtn'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  price: document.getElementById('price'),
  category: document.getElementById('category'),
  status: document.getElementById('status'),
  newImages: document.getElementById('newImages'),
  existingImagesGrid: document.getElementById('existingImagesGrid'),
}

let listingId = null
let currentUser = null
let listing = null

async function fetchListingImages(targetListingId) {
  const { data, error } = await supabase
    .from('listing_images')
    .select('id, file_path, public_url, created_at')
    .eq('listing_id', targetListingId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

function renderExistingImages(images) {
  if (!elements.existingImagesGrid) return

  if (!images.length) {
    elements.existingImagesGrid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0">No images uploaded yet.</div>
      </div>
    `
    return
  }

  elements.existingImagesGrid.innerHTML = images
    .map(
      (image) => `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100">
            <img src="${image.public_url}" class="card-img-top" alt="Listing image" style="height: 180px; object-fit: cover;" />
            <div class="card-body d-grid">
              <button
                type="button"
                class="btn btn-outline-danger"
                data-action="delete-image"
                data-image-id="${image.id}"
                data-file-path="${image.file_path}"
              >
                Delete Image
              </button>
            </div>
          </div>
        </div>
      `
    )
    .join('')
}

function fillForm() {
  elements.title.value = listing.title || ''
  elements.description.value = listing.description || ''
  elements.price.value = listing.price ?? ''
  elements.category.value = listing.category || 'Electronics'
  elements.status.value = listing.status || 'draft'
}

async function removeListingImage(imageId, filePath) {
  await deleteImage(filePath, 'listing-images')

  const { error } = await supabase.from('listing_images').delete().eq('id', imageId)
  if (error) throw error
}

async function insertListingImagesRows(imagesMeta) {
  if (!imagesMeta.length) return

  const rows = imagesMeta.map((item) => ({
    listing_id: listingId,
    owner_id: listing.owner_id,
    file_path: item.file_path,
    public_url: item.public_url,
  }))

  const { error } = await supabase.from('listing_images').insert(rows)
  if (error) throw error
}

async function refreshImages() {
  const images = await fetchListingImages(listingId)
  renderExistingImages(images)
}

async function handleDeleteImageClick(event) {
  const button = event.target.closest('[data-action="delete-image"]')
  if (!button) return

  const imageId = button.getAttribute('data-image-id')
  const filePath = button.getAttribute('data-file-path')
  if (!imageId || !filePath) return

  try {
    showLoader()
    await removeListingImage(imageId, filePath)
    await refreshImages()
  } catch (error) {
    showToast(error?.message || 'Failed to delete image.', 'danger')
  } finally {
    hideLoader()
  }
}

async function handleSave(event) {
  event.preventDefault()

  if (!elements.editListingForm?.checkValidity()) {
    elements.editListingForm?.reportValidity()
    return
  }

  elements.saveBtn.disabled = true
  showLoader()

  try {
    let coverImageUrl = listing.image_url || null

    const files = Array.from(elements.newImages?.files || [])
    if (files.length) {
      const uploaded = await uploadListingImages(listing.owner_id, listingId, files)
      await insertListingImagesRows(uploaded)
      elements.newImages.value = ''
      coverImageUrl = uploaded[0]?.public_url || coverImageUrl
    }

    await updateListing(listingId, {
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      price: Number(elements.price.value),
      category: elements.category.value,
      image_url: coverImageUrl,
      status: elements.status.value,
    })

    window.location.href = `/listing-details.html?id=${listingId}`
  } catch (error) {
    showToast(error?.message || 'Failed to update listing.', 'danger')
    elements.saveBtn.disabled = false
  } finally {
    hideLoader()
  }
}

async function init() {
  showLoader()

  try {
    const session = await requireAuth()
    if (!session) return

    currentUser = await getCurrentUser()
    if (!currentUser) {
      window.location.href = '/login.html'
      return
    }

    await initNavbar()

    const params = new URLSearchParams(window.location.search)
    listingId = params.get('id')

    if (!listingId) {
      showToast('Missing listing id.', 'warning')
      window.location.href = '/index.html'
      return
    }

    listing = await getById(listingId)

    const canEdit = listing.owner_id === currentUser.id
    if (!canEdit) {
      showToast('You do not have access to edit this listing.', 'warning')
      window.location.href = '/index.html'
      return
    }

    fillForm()
    await refreshImages()

    elements.editListingForm?.addEventListener('submit', handleSave)
    elements.existingImagesGrid?.addEventListener('click', handleDeleteImageClick)
  } finally {
    hideLoader()
  }
}

init().catch((error) => {
  showToast(error?.message || 'Failed to load listing edit page.', 'danger')
})
