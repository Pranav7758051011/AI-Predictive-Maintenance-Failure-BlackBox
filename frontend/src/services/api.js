/**
 * Centralized API Client with JWT Bearer Token Injection and Error Normalization
 * Connected to Flask Backend running on VITE_API_URL or http://localhost:5000
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Token storage helpers
export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem('access_token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

/**
 * Standardized HTTP request wrapper
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new Error(`Unable to connect to backend at ${API_BASE_URL}. Please ensure Flask backend is running.`);
  }

  // Handle 401 Unauthorized -> Attempt token refresh
  if (response.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/refresh')) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
        });

        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          const newAccessToken = refreshJson?.data?.access_token || refreshJson?.access_token;
          if (newAccessToken) {
            setTokens(newAccessToken);
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            // Retry original request
            response = await fetch(url, { ...config, headers });
          }
        } else {
          clearTokens();
        }
      } catch (refreshErr) {
        clearTokens();
      }
    }
  }

  // Parse JSON response
  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { success: false, message: response.statusText || 'Unknown server response' };
  }

  if (!response.ok) {
    const errorMessage = data.message || data.error || `HTTP ${response.status}: Request failed`;
    const appError = new Error(errorMessage);
    appError.status = response.status;
    appError.errorCode = data.error_code;
    appError.errors = data.errors || [];
    throw appError;
  }

  return data?.data !== undefined ? data.data : data;
}

export async function fetchHealth() {
  try {
    return await apiRequest('/api/health');
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}
