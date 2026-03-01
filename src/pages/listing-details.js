import supabase from '../services/supabaseClient.js'
import { getSession } from '../services/authService.js'
import { getById, remove as removeListing } from '../services/listingsService.js'
import { getDownloadUrl } from '../services/storageService.js'
import {
  getByListing as getCommentsByListing,
  add as addComment,
  remove as removeComment,
} from '../services/commentsService.js'

const elements = {
  navAddListing: document.getElementById('navAddListing'),
  navProfile: document.getElementById('navProfile'),
  navLogin: document.getElementById('navLogin'),
  navRegister: document.getElementById('navRegister'),
  navLogout: document.getElementById('navLogout'),
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

function setNavbarByAuth(isLoggedIn) {
  toggleVisibility(elements.navAddListing, isLoggedIn)
  toggleVisibility(elements.navProfile, isLoggedIn)
  toggleVisibility(elements.navLogout, isLoggedIn)
  toggleVisibility(elements.navLogin, !isLoggedIn)
  toggleVisibility(elements.navRegister, !isLoggedIn)
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
    elements.imageGallery.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0">No images available.</div>
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
  return isAdmin || currentUser?.id === listing.owner_id
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
    alert('Please login to add a comment.')
    return
  }

  const content = elements.commentContent?.value?.trim() || ''
  if (!content) {
    elements.commentForm?.reportValidity()
    return
  }

  try {
    await addComment(listingId, currentUser.id, content)
    elements.commentForm.reset()
    await loadAndRenderComments()
  } catch (error) {
    alert(error?.message || 'Failed to add comment.')
  }
}

async function handleDeleteComment(commentId) {
  try {
    await removeComment(commentId)
    await loadAndRenderComments()
  } catch (error) {
    alert(error?.message || 'Failed to delete comment.')
  }
}

async function handleDeleteListing() {
  try {
    await removeListing(listing.id)
    window.location.href = '/index.html'
  } catch (error) {
    alert(error?.message || 'Failed to delete listing.')
  }
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  window.location.reload()
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
      const signedUrl = await getDownloadUrl(filePath, 'listing-images')
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      alert(error?.message || 'Failed to generate download link.')
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

  elements.navLogout?.addEventListener('click', async () => {
    try {
      await handleLogout()
    } catch (error) {
      alert(error?.message || 'Logout failed.')
    }
  })
}

async function init() {
  const params = new URLSearchParams(window.location.search)
  listingId = params.get('id')

  if (!listingId) {
    alert('Missing listing id.')
    window.location.href = '/index.html'
    return
  }

  const session = await getSession()
  currentUser = session?.user ?? null
  setNavbarByAuth(Boolean(currentUser))
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
}

init().catch((error) => {
  alert(error?.message || 'Failed to load listing details.')
})
