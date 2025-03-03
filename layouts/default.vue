<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <NuxtLink to="/" class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-primary-600 dark:text-primary-400">Broadcast Intercom</h1>
            </NuxtLink>
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
          &copy; {{ new Date().getFullYear() }} Broadcast Intercom System
        </div>
      </div>
    </footer>
  </div>
</template>