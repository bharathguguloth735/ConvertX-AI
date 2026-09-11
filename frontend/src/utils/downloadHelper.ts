// DocuFlow AI — Robust File Downloader Utility
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

/**
 * Clean up and guarantee a safe, user-friendly filename with extension.
 */
export function sanitizeDownloadFilename(filename?: string, fallbackExt?: string): string {
  if (!filename || !filename.trim()) {
    return `docuflow_download${fallbackExt ? (fallbackExt.startsWith('.') ? fallbackExt : `.${fallbackExt}`) : ''}`;
  }

  // Trim whitespace and remove path traversal characters
  let clean = filename.trim().replace(/^.*[\\/]/, '');

  // If there's an extension fallback and the filename does not have it, append
  if (fallbackExt) {
    const ext = fallbackExt.startsWith('.') ? fallbackExt : `.${fallbackExt}`;
    if (!clean.toLowerCase().endsWith(ext.toLowerCase())) {
      clean = `${clean}${ext}`;
    }
  }

  return clean;
}

/**
 * Resolves a direct, secure download URL with safe filename in the path segment
 * and authenticated with token query parameter.
 */
export function getDownloadUrlWithToken(url: string, preferredFilename?: string): string {
  const token = useAuthStore.getState().accessToken;
  const cleanFilename = sanitizeDownloadFilename(preferredFilename);
  let finalUrl = url;

  // If filename is not in path, append it for maximum URL-based resilience
  if (cleanFilename && !finalUrl.includes(encodeURIComponent(cleanFilename))) {
    const isDownloadEndpoint = finalUrl.includes('/api/files/download/');
    if (isDownloadEndpoint) {
      const parts = finalUrl.split('?');
      const basePath = parts[0].replace(/\/+$/, '');
      const query = parts[1] ? `?${parts[1]}` : '';
      const pathSegments = basePath.split('/');
      const lastSeg = pathSegments[pathSegments.length - 1];
      if (lastSeg !== encodeURIComponent(cleanFilename) && lastSeg.length >= 30) {
        finalUrl = `${basePath}/${encodeURIComponent(cleanFilename)}${query}`;
      }
    }
  }

  // Attach token query param if token exists and not already present
  if (token && !finalUrl.includes('token=')) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  return finalUrl;
}

/**
 * Downloads a file safely by invoking native browser download directly
 * from the HTTP URL, preventing Edge/Chromium from falling back to internal
 * blob UUIDs (e.g. ad9f8977-fd6d-4ccb-be79-d85a7087176d).
 */
export async function downloadFile(
  url: string,
  preferredFilename?: string
): Promise<void> {
  const cleanFilename = sanitizeDownloadFilename(preferredFilename);

  try {
    const finalUrl = getDownloadUrlWithToken(url, preferredFilename);

    // Trigger native browser download directly via anchor
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = finalUrl;
    if (cleanFilename) {
      a.setAttribute('download', cleanFilename);
    }
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 2000);

    toast.success(`Downloading ${cleanFilename}...`, { id: 'download-progress', duration: 2500 });
  } catch (err: unknown) {
    console.error('Download error:', err);
    toast.error('Unable to initiate download. Please check server connection.');
  }
}
