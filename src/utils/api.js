// API configuration utility
const getApiBaseUrl = () => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    // For localhost development
    return 'http://localhost:8080';
  } else {
    // For production deployment
    return 'https://backend-app-602854698306.asia-south1.run.app';
  }
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/login`,
  SIGNUP: `${API_BASE_URL}/api/signup`,
  FILES: `${API_BASE_URL}/api/files`,
  UPLOAD: `${API_BASE_URL}/api/files/upload`,
  DOWNLOAD: (fileId, version = null) => {
    if (version) {
      return `${API_BASE_URL}/api/files/download/${fileId}/version/${version}`;
    }
    return `${API_BASE_URL}/api/files/download/${fileId}`;
  }
};

export default API_BASE_URL;
