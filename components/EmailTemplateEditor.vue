<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">Email Template</h3>
      <div class="flex space-x-2">
        <button
          type="button"
          class="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          @click="resetToDefault"
        >
          Reset to Default
        </button>
        <button
          type="button"
          class="px-3 py-1 text-xs border border-transparent rounded-md shadow-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          @click="saveTemplate"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Save Template' }}
        </button>
      </div>
    </div>
    
    <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-xs">
      <p class="mb-2 text-gray-600 dark:text-gray-300">Available variables:</p>
      <ul class="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
        <li><code>{production_name}</code> - The name of the production</li>
        <li><code>{join_url}</code> - The URL to join the production</li>
        <li><code>{access_code}</code> - The access code for the production</li>
        <li><code>{sender_name}</code> - Your name (from settings)</li>
      </ul>
    </div>
    
    <div>
      <label for="email-subject" class="block text-sm font-medium mb-1">
        Email Subject
      </label>
      <input
        id="email-subject"
        v-model="subject"
        type="text"
        class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        placeholder="Enter email subject"
      />
    </div>
    
    <div>
      <label for="email-content" class="block text-sm font-medium mb-1">
        Email Content
      </label>
      <textarea
        id="email-content"
        v-model="content"
        rows="10"
        class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm font-mono"
        placeholder="Enter email template"
      ></textarea>
    </div>
    
    <div>
      <h4 class="text-sm font-medium mb-2">Preview:</h4>
      <div class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-3">
        <div class="font-medium mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          Subject: {{ previewSubject }}
        </div>
        <div class="whitespace-pre-wrap text-sm">
          {{ previewContent }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_EMAIL_TEMPLATE, DEFAULT_EMAIL_SUBJECT } from '~/types';
import { toast } from 'vue-sonner';

const props = defineProps({
  productionId: {
    type: Number,
    required: true
  },
  initialTemplate: {
    type: String,
    default: DEFAULT_EMAIL_TEMPLATE
  },
  initialSubject: {
    type: String,
    default: DEFAULT_EMAIL_SUBJECT
  },
  productionName: {
    type: String,
    default: 'Example Production'
  },
  accessCode: {
    type: String,
    default: 'ABC123'
  }
});

const emit = defineEmits(['template-updated']);

// Local state
const content = ref(props.initialTemplate || DEFAULT_EMAIL_TEMPLATE);
const subject = ref(props.initialSubject || DEFAULT_EMAIL_SUBJECT);
const saving = ref(false);

// Get username from settings
const userSettings = useUserSettings();
const username = computed(() => userSettings.settings.value.displayName || 'Admin');

// Generate join URL for preview
const joinUrl = computed(() => {
  return `${window.location.origin}/production/${props.accessCode}`;
});

// Generate preview with variables replaced
const previewContent = computed(() => {
  return content.value
    .replace(/{production_name}/g, props.productionName)
    .replace(/{join_url}/g, joinUrl.value)
    .replace(/{access_code}/g, props.accessCode)
    .replace(/{sender_name}/g, username.value);
});

// Generate subject preview with variables replaced
const previewSubject = computed(() => {
  return subject.value
    .replace(/{production_name}/g, props.productionName)
    .replace(/{join_url}/g, joinUrl.value)
    .replace(/{access_code}/g, props.accessCode)
    .replace(/{sender_name}/g, username.value);
});

// Reset to default template
const resetToDefault = () => {
  content.value = DEFAULT_EMAIL_TEMPLATE;
  subject.value = DEFAULT_EMAIL_SUBJECT;
};

// Save template
const saveTemplate = async () => {
  saving.value = true;
  
  try {
    const response = await $fetch(`/api/productions/${props.productionId}/email-template`, {
      method: 'PUT',
      body: {
        email_template: content.value,
        email_subject: subject.value
      }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to save email template');
    }
    
    emit('template-updated', { content: content.value, subject: subject.value });
    toast.success('Email template saved successfully');
  } catch (err: any) {
    toast.error(err.message || 'Failed to save email template');
    console.error('Error saving email template:', err);
  } finally {
    saving.value = false;
  }
};

// Update local template when props change
watch(() => props.initialTemplate, (newTemplate) => {
  if (newTemplate && newTemplate !== content.value) {
    content.value = newTemplate;
  }
});

watch(() => props.initialSubject, (newSubject) => {
  if (newSubject && newSubject !== subject.value) {
    subject.value = newSubject;
  }
});
</script>