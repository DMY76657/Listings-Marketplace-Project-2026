import { login } from '../services/authService.js'
import { redirectIfLoggedIn } from '../utils/guard.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

async function initializePage() {
  showLoader()

  try {
    await initNavbar()
    await redirectIfLoggedIn()

    const form = document.getElementById('loginForm')
    if (!form) return

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const email = document.getElementById('email')?.value?.trim()
      const password = document.getElementById('password')?.value

      try {
        showLoader()
        await login(email, password)
        window.location.href = '/index.html'
      } catch (error) {
        showToast(error?.message || 'Login failed.', 'danger')
      } finally {
        hideLoader()
      }
    })
  } catch (error) {
    showToast(error?.message || 'Unable to load login page.', 'danger')
  } finally {
    hideLoader()
  }
}

initializePage()
