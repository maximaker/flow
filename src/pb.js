import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_PB_URL

if (!pbUrl) {
  if (import.meta.env.PROD) {
    // Surface a visible error so a misconfigured deploy is immediately obvious
    document.addEventListener('DOMContentLoaded', () => {
      document.body.innerHTML = `<div style="font-family:sans-serif;padding:40px;max-width:480px;margin:60px auto;border:1px solid #f5c6cb;background:#fff5f5;border-radius:8px;color:#721c24">
        <h2 style="margin:0 0 12px">Configuration error</h2>
        <p>The <code>VITE_PB_URL</code> environment variable is not set. The app cannot start without a backend URL.</p>
        <p style="font-size:13px;color:#888">Add <code>VITE_PB_URL=https://your-pb-instance.com</code> to your Netlify environment variables and redeploy.</p>
      </div>`;
    });
    throw new Error('[Flow] VITE_PB_URL is required in production. Set it in your Netlify environment variables.');
  } else {
    console.warn('[Flow] VITE_PB_URL is not set. Add it to your .env file — see .env.example.');
  }
}

export const pb = new PocketBase(pbUrl || 'http://127.0.0.1:8090')
