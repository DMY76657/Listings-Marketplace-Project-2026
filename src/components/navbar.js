import supabase from '../services/supabaseClient.js'
import { getSession } from '../services/authService.js'

function toggleVisibility(element, shouldShow) {
  if (!element) return
  element.classList.toggle('d-none', !shouldShow)
}

function getNavbarElements() {
  return {
    navAddListing: document.getElementById('navAddListing'),
    navProfile: document.getElementById('navProfile'),
    navLogin: document.getElementById('navLogin'),
    navRegister: document.getElementById('navRegister'),
    navLogout: document.getElementById('navLogout'),
  }
}

function applyAuthVisibility(elements, isLoggedIn) {
  toggleVisibility(elements.navAddListing, isLoggedIn)
  toggleVisibility(elements.navProfile, isLoggedIn)
  toggleVisibility(elements.navLogout, isLoggedIn)
  toggleVisibility(elements.navLogin, !isLoggedIn)
  toggleVisibility(elements.navRegister, !isLoggedIn)
}

export async function initNavbar(options = {}) {
  const elements = getNavbarElements()
  const session = await getSession()
  const isLoggedIn = Boolean(session)
  const user = session?.user ?? null

  applyAuthVisibility(elements, isLoggedIn)

  if (elements.navLogout && !elements.navLogout.dataset.navbarBound) {
    elements.navLogout.dataset.navbarBound = 'true'
    elements.navLogout.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        if (typeof options.onLogout === 'function') {
          await options.onLogout()
        } else {
          window.location.reload()
        }
      } catch (error) {
        if (typeof options.onLogoutError === 'function') {
          options.onLogoutError(error)
        } else {
          alert(error?.message || 'Logout failed.')
        }
      }
    })
  }

  return { session, user, isLoggedIn, elements }
}
