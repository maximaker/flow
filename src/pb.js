import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_PB_URL
if (!pbUrl) {
  // In dev mode, warn loudly. In production, fall back to the bundled default.
  console.warn('[Flow] VITE_PB_URL is not set. Using the built-in default. Add VITE_PB_URL to your .env — see .env.example.')
}
export const pb = new PocketBase(pbUrl || 'https://pb.thedigitalvitamins.com')
