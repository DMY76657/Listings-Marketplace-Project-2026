import supabase from '../services/supabaseClient.js'
import { getById, remove as removeListing } from '../services/listingsService.js'
import { getDownloadUrl } from '../services/storageService.js'
import {
  getByListing as getCommentsByListing,
  add as addComment,
  remove as removeComment,
} from '../services/commentsService.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

const elements = {
  listingTitle: document.getElementById('listingTitle'),
  listingDescription: document.getElementById('listingDescription'),
  listingPrice: document.getElementById('listingPrice'),
  listingStatus: document.getElementById('listingStatus'),
  listingOwner: document.getElementById('listingOwner'),
  imageGallery: document.getElementById('imageGallery'),
  editListingBtn: document.getElementById('editListingBtn'),
  deleteListingBtn: document.getElementById('deleteListingBtn'),
  commentsList: document.getElementById('commentsList'),
  commentFormWrapper: document.getElementById('commentFormWrapper'),
  commentForm: document.getElementById('commentForm'),
  commentContent: document.getElementById('commentContent'),
}

const FALLBACK_IMAGE = 'https://via.placeholder.com/800x500?text=No+Image'

let listingId = null
let listing = null
let currentUser = null
let isAdmin = false

function toggleVisibility(element, shouldShow) {
  if (!element) return
  element.classList.toggle('d-none', !shouldShow)
}

function formatPrice(value) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 'N/A'
  return `$${numeric.toFixed(2)}`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US')
}

async function fetchIsAdmin(userId) {
  if (!userId) return false

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.role === 'admin'
}

async function fetchListingImages(targetListingId) {
  const { data, error } = await supabase
    .from('listing_images')
    .select('id, file_path, public_url, created_at')
    .eq('listing_id', targetListingId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

async function fetchOwnerDisplayName(ownerId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', ownerId)
    .maybeSingle()

  if (error) throw error
  return data?.display_name || 'Unknown user'
}

function renderListing(ownerName) {
  if (!listing) return

  elements.listingTitle.textContent = listing.title || 'Untitled'
  elements.listingDescription.textContent = listing.description || 'No description provided.'
  elements.listingPrice.textContent = formatPrice(listing.price)
  elements.listingStatus.textContent = listing.status || 'unknown'
  elements.listingOwner.textContent = ownerName
}

function renderImageGallery(images) {
  if (!elements.imageGallery) return

  if (!images.length) {
    const fallbackUrl = listing?.image_url || FALLBACK_IMAGE
    elements.imageGallery.innerHTML = `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card h-100">
          <img src="${fallbackUrl}" class="card-img-top" alt="Listing image" style="height: 220px; object-fit: cover;" />
        </div>
      </div>
    `
    return
  }

  elements.imageGallery.innerHTML = images
    .map(
      (image) => `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100">
            <img src="${image.public_url || FALLBACK_IMAGE}" class="card-img-top" alt="Listing image" style="height: 220px; object-fit: cover;" />
            <div class="card-body d-grid">
              <button
                type="button"
                class="btn btn-outline-primary"
                data-action="download-image"
                data-file-path="${image.file_path}"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      `
    )
    .join('')
}

function canManageListing() {
  if (!listing) return false
  return currentUser?.id === listing.owner_id
}

function renderListingActionButtons() {
  const canManage = canManageListing()
  toggleVisibility(elements.editListingBtn, canManage)
  toggleVisibility(elements.deleteListingBtn, canManage)
}

function canDeleteComment(comment) {
  if (!currentUser) return false
  return isAdmin || comment.author_id === currentUser.id
}

function renderComments(comments) {
  if (!elements.commentsList) return

  if (!comments.length) {
    elements.commentsList.innerHTML = '<div class="alert alert-secondary mb-0">No comments yet.</div>'
    return
  }

  elements.commentsList.innerHTML = comments
    .map(
      (comment) => `
        <div class="border rounded p-3 mb-3 bg-white">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
            <div>
              <div class="fw-semibold">${comment.author_name}</div>
              <div class="small text-muted">${formatDate(comment.created_at)}</div>
            </div>
            ${
              canDeleteComment(comment)
                ? `<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-comment" data-comment-id="${comment.id}">Delete</button>`
                : ''
            }
          </div>
          <div>${comment.content}</div>
        </div>
      `
    )
    .join('')
}

async function loadAndRenderComments() {
  const comments = await getCommentsByListing(listingId)
  renderComments(comments)
}

async function handleCommentSubmit(event) {
  event.preventDefault()

  if (!currentUser) {
    showToast('Please login to add a comment.', 'warning')
    return
  }

  const content = elements.commentContent?.value?.trim() || ''
  if (!content) {
    elements.commentForm?.reportValidity()
    return
  }

  try {
    showLoader()
    await addComment(listingId, currentUser.id, content)
    elements.commentForm.reset()
    await loadAndRenderComments()
  } catch (error) {
    showToast(error?.message || 'Failed to add comment.', 'danger')
  } finally {
    hideLoader()
  }
}

async function handleDeleteComment(commentId) {
  try {
    showLoader()
    await removeComment(commentId)
    await loadAndRenderComments()
  } catch (error) {
    showToast(error?.message || 'Failed to delete comment.', 'danger')
  } finally {
    hideLoader()
  }
}

async function handleDeleteListing() {
  const confirmed = window.confirm('Are you sure you want to delete this listing?')
  if (!confirmed) return

  try {
    showLoader()
    await removeListing(listing.id)
    window.location.href = '/index.html'
  } catch (error) {
    showToast(error?.message || 'Failed to delete listing.', 'danger')
  } finally {
    hideLoader()
  }
}

function bindEvents() {
  elements.editListingBtn?.addEventListener('click', () => {
    window.location.href = `/listing-edit.html?id=${listing.id}`
  })

  elements.deleteListingBtn?.addEventListener('click', () => {
    handleDeleteListing()
  })

  elements.imageGallery?.addEventListener('click', async (event) => {
    const downloadButton = event.target.closest('[data-action="download-image"]')
    if (!downloadButton) return

    const filePath = downloadButton.getAttribute('data-file-path')
    if (!filePath) return

    try {
      showLoader()
      const signedUrl = await getDownloadUrl(filePath, 'listing-images')
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      showToast(error?.message || 'Failed to generate download link.', 'danger')
    } finally {
      hideLoader()
    }
  })

  elements.commentsList?.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-action="delete-comment"]')
    if (!deleteButton) return
    const commentId = deleteButton.getAttribute('data-comment-id')
    if (!commentId) return
    handleDeleteComment(commentId)
  })

  elements.commentForm?.addEventListener('submit', handleCommentSubmit)
}

async function init() {
  showLoader()

  const params = new URLSearchParams(window.location.search)
  listingId = params.get('id')

  if (!listingId) {
    showToast('Missing listing id.', 'warning')
    window.location.href = '/index.html'
    hideLoader()
    return
  }

  try {
    const navbarState = await initNavbar()
    currentUser = navbarState.user
    toggleVisibility(elements.commentFormWrapper, Boolean(currentUser))

    isAdmin = currentUser ? await fetchIsAdmin(currentUser.id) : false

    listing = await getById(listingId)
    const [images, ownerName] = await Promise.all([
      fetchListingImages(listingId),
      fetchOwnerDisplayName(listing.owner_id),
    ])

    renderListing(ownerName)
    renderImageGallery(images)
    renderListingActionButtons()
    await loadAndRenderComments()
    bindEvents()
  } finally {
    hideLoader()
  }
}

init().catch((error) => {
  showToast(error?.message || 'Failed to load listing details.', 'danger')
})
