import supabase from '../services/supabaseClient.js'
import { getSession } from '../services/authService.js'

const FALLBACK_IMAGE = 'https://via.placeholder.com/600x400?text=No+Image'

const elements = {
  navAddListing: document.getElementById('navAddListing'),
  navProfile: document.getElementById('navProfile'),
  navLogin: document.getElementById('navLogin'),
  navRegister: document.getElementById('navRegister'),
  navLogout: document.getElementById('navLogout'),
  searchInput: document.getElementById('searchInput'),
  minPriceInput: document.getElementById('minPriceInput'),
  maxPriceInput: document.getElementById('maxPriceInput'),
  searchBtn: document.getElementById('searchBtn'),
  listingsGrid: document.getElementById('listingsGrid'),
}

let allListings = []

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
  if (value === null || value === undefined || value === '') return 'N/A'
  const amount = Number(value)
  if (Number.isNaN(amount)) return 'N/A'
  return `$${amount.toFixed(2)}`
}

function createCard(listing) {
  const imageUrl = listing.image_url || FALLBACK_IMAGE

  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <img src="${imageUrl}" class="card-img-top" alt="${listing.title}" style="height: 220px; object-fit: cover;" />
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${listing.title}</h5>
          <p class="card-text text-muted mb-3">Price: ${formatPrice(listing.price)}</p>
          <a href="/listing-details.html?id=${listing.id}" class="btn btn-outline-primary mt-auto">View</a>
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

function applyClientFilters() {
  const searchTerm = elements.searchInput?.value?.trim().toLowerCase() ?? ''
  const minPriceRaw = elements.minPriceInput?.value
  const maxPriceRaw = elements.maxPriceInput?.value
  const minPrice = minPriceRaw ? Number(minPriceRaw) : null
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null

  const filtered = allListings.filter((listing) => {
    const title = (listing.title || '').toLowerCase()
    const price = Number(listing.price)
    const hasValidPrice = !Number.isNaN(price)

    const matchesTitle = !searchTerm || title.includes(searchTerm)
    const matchesMin = minPrice === null || (hasValidPrice && price >= minPrice)
    const matchesMax = maxPrice === null || (hasValidPrice && price <= maxPrice)

    return matchesTitle && matchesMin && matchesMax
  })

  renderListings(filtered)
}

async function fetchPublishedListings() {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, price, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw error

  if (!listings?.length) return []

  const listingsWithImage = await Promise.all(
    listings.map(async (listing) => {
      const { data: imageRows, error: imageError } = await supabase
        .from('listing_images')
        .select('public_url')
        .eq('listing_id', listing.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (imageError) throw imageError

      return {
        ...listing,
        image_url: imageRows?.[0]?.public_url || FALLBACK_IMAGE,
      }
    })
  )

  return listingsWithImage
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  window.location.reload()
}

async function init() {
  try {
    const session = await getSession()
    setNavbarByAuth(Boolean(session))

    allListings = await fetchPublishedListings()
    renderListings(allListings)

    elements.searchBtn?.addEventListener('click', applyClientFilters)
    elements.navLogout?.addEventListener('click', async () => {
      try {
        await handleLogout()
      } catch (error) {
        console.error('Logout failed:', error)
      }
    })
  } catch (error) {
    console.error('Failed to initialize homepage:', error)
    renderListings([])
  }
}

init()
