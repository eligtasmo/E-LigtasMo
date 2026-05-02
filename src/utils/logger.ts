// Utility function to log user activities
export const logActivity = async (
  action_type: string,
  action_description: string,
  resource_type?: string,
  resource_id?: string,
  status: 'success' | 'error' | 'warning' = 'success',
  error_message?: string
) => {
  try {
    const response = await fetch('/api/log-activity.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action_type,
        action_description,
        resource_type,
        resource_id,
        status,
        error_message
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to log activity:', data.message);
    }
    
    return data.success;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
};

// Predefined log actions for common activities
export const LogActions = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // User Management
  USER_CREATE: 'create',
  USER_UPDATE: 'update',
  USER_DELETE: 'delete',
  USER_STATUS_CHANGE: 'update',
  PASSWORD_CHANGE: 'update',
  
  // Incident Management
  INCIDENT_CREATE: 'create',
  INCIDENT_UPDATE: 'update',
  INCIDENT_APPROVE: 'approve',
  INCIDENT_REJECT: 'reject',
  INCIDENT_DELETE: 'delete',
  
  // Shelter Management
  SHELTER_CREATE: 'create',
  SHELTER_UPDATE: 'update',
  SHELTER_DELETE: 'delete',
  
  // Announcements
  ANNOUNCEMENT_CREATE: 'create',
  ANNOUNCEMENT_UPDATE: 'update',
  ANNOUNCEMENT_DELETE: 'delete',
  
  // Emergency Contacts
  CONTACT_CREATE: 'create',
  CONTACT_UPDATE: 'update',
  CONTACT_DELETE: 'delete',
  
  // Barangay Coordinators
  COORDINATOR_CREATE: 'create',
  COORDINATOR_UPDATE: 'update',
  COORDINATOR_DELETE: 'delete',
  
  // System
  SYSTEM_EXPORT: 'export',
  SYSTEM_VIEW: 'view',
  SYSTEM_ERROR: 'error'
};

// Resource types for better categorization
export const ResourceTypes = {
  USER: 'user',
  INCIDENT: 'incident',
  SHELTER: 'shelter',
  ANNOUNCEMENT: 'announcement',
  EMERGENCY_CONTACT: 'emergency_contact',
  BARANGAY_COORDINATOR: 'barangay_coordinator',
  SYSTEM: 'system'
}; 