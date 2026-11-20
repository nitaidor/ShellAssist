/**
 * ShellAssist Update Checker Service
 * Compares semantic versioning (SemVer) against GitHub Releases.
 */

export const cleanVersion = (v) => (v || '').trim().replace(/^v/i, '');

/**
 * Compares two semantic version strings.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 == v2
 */
export const compareVersions = (v1, v2) => {
  const parse = (v) => cleanVersion(v).split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

/**
 * Checks GitHub repository releases for a newer release with a version tag.
 * @param {string} currentVersion - The current app version from package.json (e.g. "1.4.8")
 * @returns {Promise<{
 *   status: 'update-available' | 'up-to-date' | 'error',
 *   currentVersion: string,
 *   latestVersion?: string,
 *   releaseName?: string,
 *   releaseUrl?: string,
 *   publishedAt?: string,
 *   releaseNotes?: string,
 *   error?: string
 * }>}
 */
export const checkForUpdates = async (currentVersion) => {
  const cleanCurrent = cleanVersion(currentVersion);

  // Instant offline check if browser/device reports disconnected
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      status: 'error',
      currentVersion: cleanCurrent,
      error: 'No internet connection'
    };
  }

  let releases = null;

  // 1. In Electron Desktop: route through Main Process IPC (Zero CORS restrictions, direct network, clean bypass of browser cache)
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
    const ipcRes = await window.electronAPI.checkForUpdates();
    if (!ipcRes.ok) {
      return {
        status: 'error',
        currentVersion: cleanCurrent,
        error: ipcRes.error || 'Failed to check for updates'
      };
    }
    releases = ipcRes.releases;
  } else {
    // 2. Web / WebView Fallback: Simple GET request with cache-busting timestamp (NO custom headers that trigger CORS preflight)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const timestamp = Date.now();
      const url = `https://api.github.com/repos/nitaidor/ShellAssist/releases?per_page=15&_t=${timestamp}`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github+json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`GitHub API returned status ${res.status}`);
      }

      releases = await res.json();
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      let errorMessage = err.message || 'Failed to check for updates';
      if (isAbort) {
        errorMessage = 'Connection timed out';
      } else if (isOffline || errorMessage === 'Failed to fetch') {
        errorMessage = 'Failed to fetch';
      }

      return {
        status: 'error',
        currentVersion: cleanCurrent,
        error: errorMessage
      };
    }
  }

  if (!Array.isArray(releases) || releases.length === 0) {
    return {
      status: 'up-to-date',
      currentVersion: cleanCurrent,
      latestVersion: cleanCurrent
    };
  }

  // Only consider non-draft releases that follow version tagging (e.g. v1.4.10, v2.0.0)
  const validReleases = releases
    .filter(r => !r.draft && r.tag_name && /^v?\d+(\.\d+)+/i.test(r.tag_name))
    .sort((a, b) => compareVersions(b.tag_name, a.tag_name));

  if (validReleases.length === 0) {
    return {
      status: 'up-to-date',
      currentVersion: cleanCurrent,
      latestVersion: cleanCurrent
    };
  }

  const latest = validReleases[0];
  const latestClean = cleanVersion(latest.tag_name);
  const hasNewerVersion = compareVersions(latest.tag_name, cleanCurrent) > 0;

  return {
    status: hasNewerVersion ? 'update-available' : 'up-to-date',
    currentVersion: cleanCurrent,
    latestVersion: latestClean,
    rawTag: latest.tag_name,
    releaseName: latest.name || `Version ${latest.tag_name}`,
    releaseUrl: latest.html_url || `https://github.com/nitaidor/ShellAssist/releases/tag/${latest.tag_name}`,
    publishedAt: latest.published_at || '',
    releaseNotes: latest.body || ''
  };
};
