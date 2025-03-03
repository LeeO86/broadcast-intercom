<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <NuxtLink to="/" class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-primary-600 dark:text-primary-400">Broadcast Intercom Admin</h1>
            </NuxtLink>
            <nav class="ml-6 flex space-x-4">
              <NuxtLink 
                to="/admin" 
                class="px-3 py-2 rounded-md text-sm font-medium"
                :class="$route.path === '/admin' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink 
                to="/admin/productions" 
                class="px-3 py-2 rounded-md text-sm font-medium"
                :class="$route.path.startsWith('/admin/productions') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              >
                Productions
              </NuxtLink>
              <NuxtLink 
                to="/admin/groups" 
                class="px-3 py-2 rounded-md text-sm font-medium"
                :class="$route.path.startsWith('/admin/groups') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              >
                Groups
              </NuxtLink>
              <NuxtLink 
                to="/admin/email-templates" 
                class="px-3 py-2 rounded-md text-sm font-medium"
                :class="$route.path.startsWith('/admin/email-templates') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              >
                Email Templates
              </NuxtLink>
              <NuxtLink 
                to="/admin/janus" 
                class="px-3 py-2 rounded-md text-sm font-medium"
                :class="$route.path.startsWith('/admin/janus') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              >
                Janus Rooms
              </NuxtLink>
            </nav>
          </div>
          <div class="flex items-center">
            <ThemeSelector />
          </div>
        </div>
      </div>
    </header>
    
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </div>
    </main>
    
    <footer class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {{ new Date().getFullYear() }} Broadcast Intercom System - Admin Panel
        </div>
      </div>
    </footer>
  </div>
</template>