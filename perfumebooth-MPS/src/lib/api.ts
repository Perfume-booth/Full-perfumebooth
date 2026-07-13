import { useAuthStore } from '@/store/useAuthStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Extract and append CSRF token for state-changing requests
  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken);
    }
  }

  // Convert Headers instance to a plain object for fetch
  const headersObject: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersObject[key] = value;
  });

  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
  };

  if (Object.keys(headersObject).length > 0) {
    fetchOptions.headers = headersObject;
  }

  // Ensure cookies (sessionid, csrftoken) are sent with cross-origin requests
  const response = await fetch(`${BASE_URL}${path}`, fetchOptions);

  if (response.status === 401 || response.status === 403) {
    // Session expired or CSRF failed
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMsg = `Error: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  const cleanedText = text.replace(/http:\/\/django:8000/g, '').replace(/http:\/\/localhost:8000/g, '');
  return JSON.parse(cleanedText);
}

