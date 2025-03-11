import { ref, computed } from 'vue';
import { JanusError, JanusErrorType } from '~/types';

export const useJanusErrors = () => {
  // Store errors by group ID
  const groupErrors = ref<Map<number, JanusError>>(new Map());
  
  // Global connection error
  const globalError = ref<JanusError | null>(null);
  
  // Check if there's a global error
  const hasGlobalError = computed(() => globalError.value !== null);
  
  // Get error for a specific group
  const getGroupError = (groupId: number): JanusError | undefined => {
    return groupErrors.value.get(groupId);
  };
  
  // Set error for a specific group
  const setGroupError = (groupId: number, error: JanusError) => {
    groupErrors.value.set(groupId, error);
  };
  
  // Clear error for a specific group
  const clearGroupError = (groupId: number) => {
    groupErrors.value.delete(groupId);
  };
  
  // Set global error
  const setGlobalError = (error: JanusError) => {
    globalError.value = error;
  };
  
  // Clear global error
  const clearGlobalError = () => {
    globalError.value = null;
  };
  
  // Clear all errors
  const clearAllErrors = () => {
    groupErrors.value.clear();
    globalError.value = null;
  };
  
  // Get user-friendly error message
  const getErrorMessage = (error: JanusError): string => {
    switch (error.type) {
      case JanusErrorType.CONNECTION:
        return 'Unable to connect to the audio server. Please check your internet connection and try again.';
      case JanusErrorType.ROOM:
        return 'Unable to join the audio room. The room may be unavailable or full.';
      case JanusErrorType.MEDIA:
        return 'Unable to access your microphone. Please check your microphone settings and permissions.';
      case JanusErrorType.WEBRTC:
        return 'Unable to establish audio connection. This may be due to network issues or browser restrictions.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  };
  
  // Get user-friendly error title
  const getErrorTitle = (error: JanusError): string => {
    switch (error.type) {
      case JanusErrorType.CONNECTION:
        return 'Connection Error';
      case JanusErrorType.ROOM:
        return 'Room Error';
      case JanusErrorType.MEDIA:
        return 'Microphone Error';
      case JanusErrorType.WEBRTC:
        return 'Audio Connection Error';
      default:
        return 'Error';
    }
  };
  
  return {
    groupErrors,
    globalError,
    hasGlobalError,
    getGroupError,
    setGroupError,
    clearGroupError,
    setGlobalError,
    clearGlobalError,
    clearAllErrors,
    getErrorMessage,
    getErrorTitle
  };
};