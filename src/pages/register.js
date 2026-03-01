import { register } from '../services/authService.js'
import { redirectIfLoggedIn } from '../utils/guard.js'
import { initNavbar } from '../components/navbar.js'
import { showToast } from '../components/toast.js'
import { showLoader, hideLoader } from '../components/loader.js'

async function initializePage() {
  showLoader()

  try {
    await initNavbar()
    await redirectIfLoggedIn()

    const form = document.getElementById('register-form')
    if (!form) return

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const displayName = document.getElementById('display_name')?.value?.trim()
      const email = document.getElementById('email')?.value?.trim()
      const password = document.getElementById('password')?.value
      const confirmPassword = document.getElementById('confirm_password')?.value

      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'warning')
        return
      }

      try {
        showLoader()
        await register(email, password, displayName)
        window.location.href = '/index.html'
      } catch (error) {
        showToast(error?.message || 'Registration failed.', 'danger')
      } finally {
        hideLoader()
      }
    })
  } catch (error) {
    showToast(error?.message || 'Unable to load registration page.', 'danger')
  } finally {
    hideLoader()
  }
}

initializePage()
