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
  SEND_OTP: `${API_BASE_URL}/api/auth/send-otp`,
  VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
  FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
  RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,

  // Google OAuth endpoints
  GOOGLE_AUTH: `${API_BASE_URL}/api/auth/google`,
  UPDATE_DEPARTMENT: `${API_BASE_URL}/api/auth/update-department`,

  FILES: `${API_BASE_URL}/api/files`,
  UPLOAD: `${API_BASE_URL}/api/files/upload`,
  DOWNLOAD: (fileId, version = null) => {
    if (version) {
      return `${API_BASE_URL}/api/files/download/${fileId}/version/${version}`;
    }
    return `${API_BASE_URL}/api/files/download/${fileId}`;
  },

  // ✅ ADD THESE NEW ENDPOINTS FOR EDIT AND DELETE
  DELETE_FILE: (fileId) => `${API_BASE_URL}/api/files/delete/${fileId}`,
  EDIT_FILE: (fileId) => `${API_BASE_URL}/api/files/edit/${fileId}`,
  // Share endpoints
  SHARE_FILE: (fileId) => `${API_BASE_URL}/api/files/share/${fileId}`,
  UNSHARE_FILE: (fileId) => `${API_BASE_URL}/api/files/unshare/${fileId}`,
  // Users endpoint
  USERS_BY_DEPARTMENT: (dept) => `${API_BASE_URL}/api/users/by-department?dept=${dept}`,
  // Download link endpoints
  SEND_DOWNLOAD_LINK: `${API_BASE_URL}/api/files/send-download-link`,
  DOWNLOAD_WITH_TOKEN: (token) => `${API_BASE_URL}/api/files/download-with-token/${token}`,
  DOWNLOAD_ALL_WITH_TOKEN: (token) => `${API_BASE_URL}/api/files/download-all-with-token/${token}`,
};

export default API_BASE_URL;