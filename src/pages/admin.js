import { requireAdmin } from '../utils/guard.js'
import { initNavbar } from '../components/navbar.js'
import { getSession } from '../services/authService.js'
import {
  getAllUsers,
  setRole,
  getAllListings,
  setListingStatus,
  deleteListing,
} from '../services/adminService.js'

const elements = {
  usersTableBody: document.getElementById('usersTableBody'),
  listingsTableBody: document.getElementById('listingsTableBody'),
}

let currentUserId = null

function formatPrice(value) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 'N/A'
  return `$${numeric.toFixed(2)}`
}

function escapeHtml(value) {
  const raw = String(value ?? '')
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderUsers(users) {
  if (!elements.usersTableBody) return

  if (!users.length) {
    elements.usersTableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="alert alert-secondary mb-0">No users found.</div>
        </td>
      </tr>
    `
    return
  }

  elements.usersTableBody.innerHTML = users
    .map((item) => {
      const userId = item.profile?.id || ''
      const displayName = item.profile?.display_name || 'No name'
      const role = item.role || 'user'
      const nextRole = role === 'admin' ? 'user' : 'admin'
      const actionLabel = role === 'admin' ? 'Set as User' : 'Set as Admin'
      const isSelf = userId === currentUserId

      return `
        <tr>
          <td>${escapeHtml(displayName)}</td>
          <td><small class="text-muted">${escapeHtml(userId)}</small></td>
          <td><span class="badge text-bg-${role === 'admin' ? 'danger' : 'secondary'}">${escapeHtml(role)}</span></td>
          <td>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              data-action="change-role"
              data-user-id="${escapeHtml(userId)}"
              data-next-role="${escapeHtml(nextRole)}"
              ${isSelf ? 'disabled' : ''}
            >
              ${actionLabel}
            </button>
          </td>
        </tr>
      `
    })
    .join('')
}

function renderListings(listings, ownerNameById) {
  if (!elements.listingsTableBody) return

  if (!listings.length) {
    elements.listingsTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="alert alert-secondary mb-0">No listings found.</div>
        </td>
      </tr>
    `
    return
  }

  elements.listingsTableBody.innerHTML = listings
    .map((listing) => {
      const ownerName = ownerNameById.get(listing.owner_id) || 'Unknown user'

      return `
        <tr>
          <td>${escapeHtml(listing.title || 'Untitled')}</td>
          <td>${escapeHtml(ownerName)}</td>
          <td>${formatPrice(listing.price)}</td>
          <td style="min-width: 170px;">
            <select class="form-select form-select-sm" data-action="status-select" data-listing-id="${escapeHtml(listing.id)}">
              <option value="draft" ${listing.status === 'draft' ? 'selected' : ''}>draft</option>
              <option value="published" ${listing.status === 'published' ? 'selected' : ''}>published</option>
              <option value="archived" ${listing.status === 'archived' ? 'selected' : ''}>archived</option>
            </select>
          </td>
          <td style="min-width: 210px;">
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                data-action="save-status"
                data-listing-id="${escapeHtml(listing.id)}"
              >
                Save Status
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                data-action="delete-listing"
                data-listing-id="${escapeHtml(listing.id)}"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      `
    })
    .join('')
}

async function loadUsers() {
  const users = await getAllUsers()
  renderUsers(users)
  return users
}

async function loadListings(ownerNameById) {
  const listings = await getAllListings()
  renderListings(listings, ownerNameById)
}

function bindUsersActions() {
  elements.usersTableBody?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="change-role"]')
    if (!button) return

    const userId = button.getAttribute('data-user-id')
    const nextRole = button.getAttribute('data-next-role')
    if (!userId || !nextRole) return

    button.disabled = true

    try {
      await setRole(userId, nextRole)
      const users = await loadUsers()
      const ownerNameById = new Map(users.map((item) => [item.profile.id, item.profile.display_name || 'No name']))
      await loadListings(ownerNameById)
    } catch (error) {
      alert(error?.message || 'Failed to update user role.')
      button.disabled = false
    }
  })
}

function bindListingsActions(ownerNameById) {
  elements.listingsTableBody?.addEventListener('click', async (event) => {
    const saveButton = event.target.closest('[data-action="save-status"]')
    if (saveButton) {
      const listingId = saveButton.getAttribute('data-listing-id')
      if (!listingId) return

      const select = elements.listingsTableBody.querySelector(
        `[data-action="status-select"][data-listing-id="${listingId}"]`
      )
      const status = select?.value
      if (!status) return

      saveButton.disabled = true

      try {
        await setListingStatus(listingId, status)
        await loadListings(ownerNameById)
      } catch (error) {
        alert(error?.message || 'Failed to update listing status.')
        saveButton.disabled = false
      }

      return
    }

    const deleteButton = event.target.closest('[data-action="delete-listing"]')
    if (!deleteButton) return

    const listingId = deleteButton.getAttribute('data-listing-id')
    if (!listingId) return

    deleteButton.disabled = true

    try {
      await deleteListing(listingId)
      await loadListings(ownerNameById)
    } catch (error) {
      alert(error?.message || 'Failed to delete listing.')
      deleteButton.disabled = false
    }
  })
}

async function initializePage() {
  try {
    const adminSession = await requireAdmin()
    if (!adminSession) return

    await initNavbar()

    const session = await getSession()
    currentUserId = session?.user?.id || null

    const users = await loadUsers()
    const ownerNameById = new Map(users.map((item) => [item.profile.id, item.profile.display_name || 'No name']))

    await loadListings(ownerNameById)

    bindUsersActions()
    bindListingsActions(ownerNameById)
  } catch (error) {
    alert(error?.message || 'Failed to load admin page.')
  }
}

initializePage()
