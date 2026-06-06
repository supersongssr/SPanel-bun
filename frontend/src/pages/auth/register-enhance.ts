/**
 * Register Form Enhancement
 *
 * Enhances the static register form with validation and API integration
 */

import { useAuth } from '@/shared/composables/useAuth'

// ============================================
// 🛡️ Safe Form Submission
// ============================================
async function handleRegister(event: Event) {
  event.preventDefault()

  const form = document.getElementById('register-form') as HTMLFormElement
  const email = (form.elements.namedItem('email') as HTMLInputElement).value
  const username = (form.elements.namedItem('username') as HTMLInputElement).value
  const password = (form.elements.namedItem('password') as HTMLInputElement).value
  const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
  const inviteCode = (form.elements.namedItem('inviteCode') as HTMLInputElement).value
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement

  // Clear previous errors
  clearAllErrors()

  // Validation
  let hasError = false

  if (!email) {
    showFieldError('email', '请输入邮箱')
    hasError = true
  } else if (!isValidEmail(email)) {
    showFieldError('email', '请输入正确的邮箱格式')
    hasError = true
  }

  if (!username) {
    showFieldError('username', '请输入用户名')
    hasError = true
  } else if (username.length < 3 || username.length > 20) {
    showFieldError('username', '用户名长度为3-20个字符')
    hasError = true
  }

  if (!password) {
    showFieldError('password', '请输入密码')
    hasError = true
  } else if (password.length < 8) {
    showFieldError('password', '密码至少8位')
    hasError = true
  }

  if (!confirmPassword) {
    showFieldError('confirmPassword', '请确认密码')
    hasError = true
  } else if (password !== confirmPassword) {
    showFieldError('confirmPassword', '两次输入的密码不一致')
    hasError = true
  }

  if (hasError) return

  // Show loading state
  submitBtn.classList.add('loading')
  submitBtn.disabled = true

  try {
    // Import and use auth composable
    const { register } = useAuth()

    const registrationData = {
      email: email || undefined,
      user_name: String(username),
      password: String(password),
      inviteCode: inviteCode || undefined,
    }

    console.log('[Register] Submitting registration...')

    await register(registrationData)

    console.log('[Register] ✓ Registration successful')

    // Show success message and redirect
    alert('注册成功！请登录')
    setTimeout(() => {
      window.location.href = '/auth/login.html'
    }, 500)
  } catch (error: any) {
    console.error('[Register] ✗ Registration failed:', error)
    showFieldError('email', error.message || '注册失败，请重试')
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
}

// ============================================
// 🧹 Clear All Errors
// ============================================
function clearAllErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(group => {
    group.classList.remove('has-error')
  })
}

// ============================================
// 🎬 Initialize Form
// ============================================
function initRegisterForm() {
  console.log('[Register] Enhancing register form...')

  const form = document.getElementById('register-form')
  if (form) {
    form.addEventListener('submit', handleRegister)
    console.log('[Register] ✓ Form handler attached')
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

  // Real-time password confirmation check
  const passwordInput = document.getElementById('password') as HTMLInputElement
  const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement

  confirmPasswordInput?.addEventListener('input', () => {
    if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
      showFieldError('confirmPassword', '两次输入的密码不一致')
    } else {
      const formGroup = confirmPasswordInput.closest('.form-group') as HTMLElement
      formGroup?.classList.remove('has-error')
    }
  })
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegisterForm)
} else {
  initRegisterForm()
}

export { initRegisterForm }
