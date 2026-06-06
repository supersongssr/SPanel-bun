/**
 * Login Form Enhancement
 *
 * Enhances the static login form with validation and API integration
 */

import { useAuth } from '@/shared/composables/useAuth'

// ============================================
// 🛡️ Safe Form Submission
// ============================================
async function handleLogin(event: Event) {
  event.preventDefault()

  const form = document.getElementById('login-form') as HTMLFormElement
  const email = (form.elements.namedItem('email') as HTMLInputElement).value
  const password = (form.elements.namedItem('password') as HTMLInputElement).value
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement

  // Basic validation
  if (!email || !password) {
    showFieldError('email', '请填写所有字段')
    return
  }

  if (!isValidEmail(email)) {
    showFieldError('email', '请输入正确的邮箱格式')
    return
  }

  // Show loading state
  submitBtn.classList.add('loading')
  submitBtn.disabled = true

  try {
    // Import and use auth composable
    const { login } = useAuth()

    const response = await login({
      email,
      password
    })

    console.log('[Login] ✓ Login successful')

    // Unified redirect: All users (including admins) go to /user/index.html
    // Admins can access admin panel via navigation from user dashboard
    window.location.href = '/user/index.html'
  } catch (error: any) {
    console.error('[Login] ✗ Login failed:', error)
    showFieldError('email', error.message || '登录失败')
  } finally {
    submitBtn.classList.remove('loading')
    submitBtn.disabled = false
  }
}

// ============================================
// 📧 Email Validation
// ============================================
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ============================================
// ❌ Show Field Error
// ============================================
function showFieldError(fieldName: string, message: string) {
  const formGroup = document.querySelector(`#${fieldName}`)?.closest('.form-group') as HTMLElement
  if (formGroup) {
    formGroup.classList.add('has-error')
    const errorEl = formGroup.querySelector('.error-message') as HTMLElement
    if (errorEl) {
      errorEl.textContent = message
    }
  }

  // Clear error on input
  const input = document.getElementById(fieldName) as HTMLInputElement
  if (input) {
    input.addEventListener('input', () => {
      formGroup.classList.remove('has-error')
    }, { once: true })
  }
}

// ============================================
// 🎬 Initialize Form
// ============================================
function initLoginForm() {
  console.log('[Login] Enhancing login form...')

  const form = document.getElementById('login-form')
  if (form) {
    form.addEventListener('submit', handleLogin)
    console.log('[Login] ✓ Form handler attached')
  }

  // Clear errors on input
  const inputs = form?.querySelectorAll('input')
  inputs?.forEach(input => {
    input.addEventListener('input', (e) => {
      const formGroup = (e.target as HTMLElement).closest('.form-group') as HTMLElement
      if (formGroup) {
        formGroup.classList.remove('has-error')
      }
    })
  })
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginForm)
} else {
  initLoginForm()
}

export { initLoginForm }
