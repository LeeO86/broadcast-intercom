import { createPersistedState } from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin(({ $pinia }) => {
  // Only use localStorage in the browser environment
  if (process.client) {
    $pinia.use(createPersistedState({
      storage: localStorage,
      key: prefix => `intercom-${prefix}`
    }))
  } else {
    // Use a no-op storage for SSR
    $pinia.use(createPersistedState({
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      },
      key: prefix => `intercom-${prefix}`
    }))
  }
})