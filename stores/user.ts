import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

export const useUserStore = defineStore('user', {
  state: () => ({
    id: '',
    displayName: '',
    lastActive: '',
    createdAt: ''
  }),
  
  getters: {
    isInitialized: (state) => !!state.id
  },
  
  actions: {
    initialize() {
      if (!this.id) {
        this.id = uuidv4()
        this.createdAt = new Date().toISOString()
        this.lastActive = new Date().toISOString()
      }
    },
    
    setDisplayName(name: string) {
      this.displayName = name
      this.updateLastActive()
    },
    
    updateLastActive() {
      this.lastActive = new Date().toISOString()
    },
    
    // Update ID from server if provided
    setId(id: string) {
      // Only update if we don't have an ID yet
      if (!this.id) {
        this.id = id
        this.createdAt = new Date().toISOString()
        this.lastActive = new Date().toISOString()
      }
    }
  },
  
  persist: {
    // Only persist in client-side
    storage: process.client ? localStorage : null
  }
})