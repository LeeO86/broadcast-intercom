<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Create Email Template</h1>
      <NuxtLink 
        to="/admin/email-templates" 
        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Back to Templates
      </NuxtLink>
    </div>
    
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <form @submit.prevent="createTemplate" class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium mb-1">
            Template Name
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Enter template name"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label for="description" class="block text-sm font-medium mb-1">
            Description
          </label>
          <input
            id="description"
            v-model="form.description"
            type="text"
            placeholder="Enter template description"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label for="subject" class="block text-sm font-medium mb-1">
            Email Subject
          </label>
          <input
            id="subject"
            v-model="form.subject"
            type="text"
            placeholder="Enter email subject"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            You can use the same variables as in the content.
          </p>
        </div>
        
        <div>
          <div class="flex justify-between items-center mb-1">
            <label for="content" class="block text-sm font-medium">
              Template Content
            </label>
            <button
              type="button"
              class="text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              @click="resetToDefault"
            >
              Reset to Default
            </button>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-xs mb-2">
            <p class="mb-2 text-gray-600 dark:text-gray-300">Available variables:</p>
            <ul class="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
              <li><code>{production_name}</code> - The name of the production</li>
              <li><code>{join_url}</code> - The URL to join the production</li>
              <li><code>{access_code}</code> - The access code for the production</li>
              <li><code>{sender_name}</code> - The name of the sender</li>
            </ul>
          </div>
          <textarea
            id="content"
            v-model="form.content"
            rows="10"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm font-mono"
            placeholder="Enter template content"
            required
          ></textarea>
        </div>
        
        <div>
          <h3 class="text-sm font-medium mb-2">Preview:</h3>
          <div class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3">
            <div class="font-medium mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              Subject: {{ previewSubject }}
            </div>
            <div class="whitespace-pre-wrap text-sm">
              {{ previewContent }}
            </div>
          </div>
        </div>
        
        <div class="pt-4">
          <button
            type="submit"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            :disabled="loading"
          >
            <span v-if="loading" class="mr-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
            {{ loading ? 'Creating...' : 'Create Template' }}
          </button>
        </div>
      </form>
      
      <div v-if="error" class="mt-4 p-3 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded-md text-sm">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_EMAIL_TEMPLATE, DEFAULT_EMAIL_SUBJECT } from '~/types';
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = reactive({
  name: '',
  description: '',
  subject: DEFAULT_EMAIL_SUBJECT,
  content: DEFAULT_EMAIL_TEMPLATE,
});

// Preview content with example values
const previewContent = computed(() => {
  return form.content
    .replace(/{production_name}/g, 'Example Production')
    .replace(/{join_url}/g, 'https://example.com/production/ABC123')
    .replace(/{access_code}/g, 'ABC123')
    .replace(/{sender_name}/g, 'John Doe');
});

// Preview subject with example values
const previewSubject = computed(() => {
  return form.subject
    .replace(/{production_name}/g, 'Example Production')
    .replace(/{join_url}/g, 'https://example.com/production/ABC123')
    .replace(/{access_code}/g, 'ABC123')
    .replace(/{sender_name}/g, 'John Doe');
});

// Reset to default content
const resetToDefault = () => {
  form.content = DEFAULT_EMAIL_TEMPLATE;
  form.subject = DEFAULT_EMAIL_SUBJECT;
};

// Create template
const createTemplate = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await $fetch('/api/email-templates', {
      method: 'POST',
      body: {
        name: form.name,
        description: form.description,
        subject: form.subject,
        content: form.content,
      },
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create template');
    }
    
    toast.success('Template created successfully');
    router.push(`/admin/email-templates/${response.data.id}`);
  } catch (err: any) {
    error.value = err.message || 'Failed to create template';
    toast.error(error.value);
    console.error('Error creating template:', err);
  } finally {
    loading.value = false;
  }
};
</script>