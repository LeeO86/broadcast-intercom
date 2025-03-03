import { Production, Group, ProductionWithGroups, GroupType } from '~/types';

export const useProduction = () => {
  const production = ref<ProductionWithGroups | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Get production by access code
  const getProductionByCode = async (code: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch(`/api/productions/code/${code}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch production');
      }
      
      production.value = response.data;
      return production.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch production';
      console.error('Error fetching production:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Get production by ID
  const getProductionById = async (id: number | null) => {
    if (id === null) {
      error.value = 'Invalid production ID';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch(`/api/productions/${id}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch production');
      }
      
      production.value = response.data;
      return production.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch production';
      console.error('Error fetching production:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Get all productions
  const getAllProductions = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch('/api/productions');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch productions');
      }
      
      return response.data as Production[];
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch productions';
      console.error('Error fetching productions:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Create a new production
  const createProduction = async (name: string, accessCode: string): Promise<Production> => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch('/api/productions', {
        method: 'POST',
        body: {
          name,
          access_code: accessCode,
        },
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create production');
      }
      
      return response.data as Production;
    } catch (err: any) {
      error.value = err.message || 'Failed to create production';
      console.error('Error creating production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update a production
  const updateProduction = async (id: number | null, name: string, accessCode: string, templateId?: number) => {
    if (id === null) {
      throw new Error('Invalid production ID');
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch(`/api/productions/${id}`, {
        method: 'PUT',
        body: {
          name,
          access_code: accessCode,
          template_id: templateId
        },
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update production');
      }
      
      return response.data as Production;
    } catch (err: any) {
      error.value = err.message || 'Failed to update production';
      console.error('Error updating production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Delete a production
  const deleteProduction = async (id: number) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch(`/api/productions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete production');
      }
      
      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to delete production';
      console.error('Error deleting production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get groups for a production
  const getProductionGroups = async (productionId: number) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch(`/api/groups/production/${productionId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch groups');
      }
      
      return response.data as Group[];
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch groups';
      console.error('Error fetching groups:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Create a new group for a production
  const createGroup = async (productionId: number, name: string, type: GroupType = GroupType.INTERCOM) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch('/api/groups', {
        method: 'POST',
        body: {
          production_id: productionId,
          name,
          type
        },
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create group');
      }
      
      // Refresh production data
      if (production.value && production.value.id === productionId) {
        await getProductionById(productionId);
      }
      
      return response.data as Group;
    } catch (err: any) {
      error.value = err.message || 'Failed to create group';
      console.error('Error creating group:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update a group
  const updateGroup = async (
    id: number, 
    name: string, 
    settings?: any, 
    uiSettings?: any,
    type?: GroupType
  ) => {
    loading.value = true;
    error.value = null;
    
    try {
      const body: any = { name };
      
      if (settings) body.settings = settings;
      if (uiSettings) body.ui_settings = uiSettings;
      if (type) body.type = type;
      
      const response = await $fetch(`/api/groups/${id}`, {
        method: 'PUT',
        body
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update group');
      }
      
      // Refresh production data if we have a production loaded
      if (production.value) {
        await getProductionById(production.value.id);
      }
      
      return response.data as Group;
    } catch (err: any) {
      error.value = err.message || 'Failed to update group';
      console.error('Error updating group:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Delete a group
  const deleteGroup = async (id: number) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch(`/api/groups/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete group');
      }
      
      // Refresh production data if we have a production loaded
      if (production.value) {
        await getProductionById(production.value.id);
      }
      
      return true;
    } catch (err: any) {
      error.value = err.message || 'Failed to delete group';
      console.error('Error deleting group:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    production,
    loading,
    error,
    getProductionByCode,
    getProductionById,
    getAllProductions,
    createProduction,
    updateProduction,
    deleteProduction,
    getProductionGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
};