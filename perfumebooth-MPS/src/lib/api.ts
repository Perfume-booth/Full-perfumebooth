import { useAuthStore } from '@/store/useAuthStore';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
}

export function formatProductImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/')) return `http://localhost:8000${url}`;
  if (url.startsWith('media/')) return `http://localhost:8000/${url}`;
  if (url.startsWith('products/') || url.startsWith('variants/')) {
    return `http://localhost:8000/media/${url}`;
  }
  if (url.startsWith('/products/') || url.startsWith('/variants/')) {
    return `http://localhost:8000/media${url}`;
  }
  return url;
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl().replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function connectionError(error: unknown): Error {
  const baseUrl = getApiBaseUrl();
  const detail = error instanceof Error ? ` (${error.message})` : '';
  return new Error(
    `Cannot connect to the API at ${baseUrl}. Make sure the Django service is running and reachable${detail}`
  );
}

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
  let response: Response;
  try {
    response = await fetch(apiUrl(path), fetchOptions);
  } catch (error) {
    throw connectionError(error);
  }

  if (response.status === 401) {
    // Session expired or unauthenticated
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
  const parsed = JSON.parse(cleanedText);

  // If response conforms to standard { data: ..., meta: ... } envelope, unwrap data
  if (parsed && typeof parsed === 'object' && 'data' in parsed && 'meta' in parsed) {
    return parsed.data as T;
  }
  return parsed as T;
}

export async function apiDownload(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { credentials: 'include' });
  } catch (error) {
    throw connectionError(error);
  }
  if (!response.ok) {
    let message = `Download failed: ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch { /* response was not JSON */ }
    throw new Error(message);
  }
  return response.blob();
}
