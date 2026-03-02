import { getPublished, remove as removeListing } from '../services/listingsService.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

const FALLBACK_IMAGE = 'https://via.placeholder.com/600x400?text=No+Image'

const elements = {
  searchInput: document.getElementById('searchInput'),
  minPriceInput: document.getElementById('minPriceInput'),
  maxPriceInput: document.getElementById('maxPriceInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  searchBtn: document.getElementById('searchBtn'),
  listingsGrid: document.getElementById('listingsGrid'),
}

let allListings = []
let currentUser = null

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return 'N/A'
  const amount = Number(value)
  if (Number.isNaN(amount)) return 'N/A'
  return `$${amount.toFixed(2)}`
}

function canManageListing(listing) {
  return Boolean(currentUser?.id) && currentUser.id === listing.owner_id
}

function createCard(listing) {
  const imageUrl = listing.image_url || FALLBACK_IMAGE
  const showOwnerActions = canManageListing(listing)

  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <img src="${imageUrl}" class="card-img-top" alt="${listing.title}" style="height: 220px; object-fit: cover;" />
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${listing.title}</h5>
          <p class="card-text text-muted mb-1">Category: ${listing.category || 'N/A'}</p>
          <p class="card-text text-muted mb-3">Price: ${formatPrice(listing.price)}</p>
          <div class="d-grid gap-2 mt-auto">
            <a href="/listing-details.html?id=${listing.id}" class="btn btn-outline-primary">View</a>
            ${
              showOwnerActions
                ? `<button type="button" class="btn btn-outline-secondary" data-action="edit-listing" data-listing-id="${listing.id}">Edit</button>
                   <button type="button" class="btn btn-outline-danger" data-action="delete-listing" data-listing-id="${listing.id}">Delete</button>`
                : ''
            }
          </div>
        </div>
      </div>
    </div>
  `
}

function renderListings(listings) {
  if (!elements.listingsGrid) return

  if (!listings.length) {
    elements.listingsGrid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0">No listings found.</div>
      </div>
    `
    return
  }

  elements.listingsGrid.innerHTML = listings.map(createCard).join('')
}

function getFilters() {
  return {
    search: elements.searchInput?.value?.trim() || '',
    minPrice: elements.minPriceInput?.value || null,
    maxPrice: elements.maxPriceInput?.value || null,
    category: elements.categoryFilter?.value || '',
  }
}

async function loadListings() {
  const { search, minPrice, maxPrice, category } = getFilters()

  allListings = await getPublished(search, minPrice, maxPrice, category)
  renderListings(allListings)
}

async function handleDeleteListing(listingId) {
  const listing = allListings.find((item) => item.id === listingId)
  if (!listing) return

  if (!canManageListing(listing)) {
    showToast('You can delete only your own listings.', 'warning')
    return
  }

  const confirmed = window.confirm('Are you sure you want to delete this listing?')
  if (!confirmed) return

  try {
    showLoader()
    await removeListing(listingId)
    showToast('Listing deleted successfully.', 'success')
    await loadListings()
  } catch (error) {
    showToast(error?.message || 'Failed to delete listing.', 'danger')
  } finally {
    hideLoader()
  }
}

function bindEvents() {
  elements.searchBtn?.addEventListener('click', () => {
    showLoader()
    loadListings()
      .catch((error) => {
        showToast(error?.message || 'Failed to search listings.', 'danger')
      })
      .finally(() => {
        hideLoader()
      })
  })

  elements.categoryFilter?.addEventListener('change', () => {
    showLoader()
    loadListings()
      .catch((error) => {
        showToast(error?.message || 'Failed to filter listings.', 'danger')
      })
      .finally(() => {
        hideLoader()
      })
  })

  elements.listingsGrid?.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-action="edit-listing"]')
    if (editButton) {
      const listingId = editButton.getAttribute('data-listing-id')
      if (listingId) {
        window.location.href = `/listing-edit.html?id=${listingId}`
      }
      return
    }

    const deleteButton = event.target.closest('[data-action="delete-listing"]')
    if (deleteButton) {
      const listingId = deleteButton.getAttribute('data-listing-id')
      if (listingId) {
        handleDeleteListing(listingId)
      }
    }
  })
}

async function init() {
  showLoader()

  try {
    const navbarState = await initNavbar()
    currentUser = navbarState.user

    await loadListings()
    bindEvents()
  } catch (error) {
    console.error('Failed to initialize homepage:', error)
    showToast(error?.message || 'Failed to initialize homepage.', 'danger')
    renderListings([])
  } finally {
    hideLoader()
  }
}

init()
