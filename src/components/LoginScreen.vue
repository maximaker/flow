<template>
  <div class="login-screen" id="login-screen" style="display:flex">
    <div class="login-card">
      <div class="login-logo">
        <svg class="flow-logo" width="36" height="36" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="flow-grad-login" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:var(--accent);stop-opacity:1" />
              <stop offset="100%" style="stop-color:var(--accent);stop-opacity:0.8" />
            </linearGradient>
          </defs>
          <path class="flow-path" d="M6 8 C10 8, 12 6, 16 6 C20 6, 22 10, 26 10 M6 16 C10 16, 12 14, 16 14 C20 14, 22 18, 26 18 M6 24 C10 24, 12 22, 16 22 C20 22, 22 26, 26 26"
            fill="none" stroke="url(#flow-grad-login)" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <h1>Flow</h1>
      </div>
      <p class="login-subtitle">Sign in to your workspace</p>
      <div class="login-form">
        <div class="form-group">
          <label>Email</label>
          <input
            type="email"
            id="login-email"
            v-model="email"
            class="login-input"
            placeholder="you@flow.io"
            autocomplete="email"
            @keydown.enter="handleLogin"
          >
        </div>
        <div class="form-group">
          <label>Password</label>
          <input
            type="password"
            id="login-password"
            v-model="password"
            class="login-input"
            placeholder="Enter your password"
            autocomplete="current-password"
            @keydown.enter="handleLogin"
          >
        </div>
        <button class="btn-primary login-btn" @click="handleLogin" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
        <p v-if="store.loginError" class="login-error">Incorrect email or password</p>
        <button class="login-forgot-btn" @click="showReset = !showReset" type="button">
          Forgot your password?
        </button>
        <div v-if="showReset" class="login-reset-form">
          <p class="login-reset-hint">Enter your email and we'll send a reset link.</p>
          <div class="login-reset-row">
            <input
              type="email"
              v-model="resetEmail"
              class="login-input"
              placeholder="you@flow.io"
              @keydown.enter="handleReset"
            >
            <button class="btn-secondary" @click="handleReset" :disabled="resetSent">
              {{ resetSent ? 'Sent ✓' : 'Send link' }}
            </button>
          </div>
          <p v-if="resetError" class="login-error">{{ resetError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import { pb } from '../pb.js'

const store = useAppStore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const showReset = ref(false)
const resetEmail = ref('')
const resetSent = ref(false)
const resetError = ref('')

const handleLogin = async () => {
  loading.value = true
  await store.login(email.value, password.value)
  loading.value = false
}

const handleReset = async () => {
  resetError.value = ''
  const addr = resetEmail.value.trim() || email.value.trim()
  if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
    resetError.value = 'Please enter a valid email address.'
    return
  }
  try {
    await pb.collection('users').requestPasswordReset(addr)
    resetSent.value = true
  } catch (e) {
    // PocketBase returns 200 even for unknown emails (security best practice),
    // but if it does fail surface a friendly message
    resetError.value = 'Could not send reset email. Please try again or contact your admin.'
  }
}
</script>
