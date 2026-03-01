import { createClient } from '@supabase/supabase-js'
import { showToast } from '../components/toast.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function warnMissingEnvVars() {
	const missing = []

	if (!supabaseUrl) {
		missing.push('VITE_SUPABASE_URL')
	}

	if (!supabaseAnonKey) {
		missing.push('VITE_SUPABASE_ANON_KEY')
	}

	if (!missing.length) {
		return
	}

	const message = `Missing environment variables: ${missing.join(', ')}`

	const showWarning = () => {
		showToast(message, 'warning')
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', showWarning, { once: true })
		return
	}

	showWarning()
}

warnMissingEnvVars()

const supabase = createClient(
	supabaseUrl || 'https://example.supabase.co',
	supabaseAnonKey || 'missing-supabase-anon-key'
)

export default supabase
