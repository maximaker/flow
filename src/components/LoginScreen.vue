<template>
  <div class="login-screen" id="login-screen">
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
        <button class="btn-primary login-btn" @click="handleLogin">Sign In</button>
        <p v-if="store.loginError" class="login-error">Invalid password</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  await store.login(email.value, password.value)
}
</script>
