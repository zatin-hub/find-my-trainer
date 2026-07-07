// Pluggable Instagram check. Instagram has no free official API for arbitrary
// public profiles, and they block datacenter IPs (Cloudflare Workers), so we
// CANNOT reliably read follower/post counts for free. The admin "verified"
// toggle is the source of truth; this is only a best-effort existence hint.
//
// To add real follower/activity data later, implement a provider keyed off an
// env var (e.g. IG_PROVIDER=rapidapi + IG_API_KEY) and return it from here —
// the call sites and storage already handle `followers`/`posts`.

const HANDLE = /^[a-zA-Z0-9._]{1,30}$/;

export interface IgResult {
  /** false = we couldn't determine anything (blocked/error) → trust manual. */
  checked: boolean;
  exists?: boolean;
  followers?: number;
  posts?: number;
  source: string;
  note?: string;
}

export function isValidHandle(handle: string): boolean {
  return HANDLE.test(handle);
}

/**
 * Best-effort: confirm the public profile URL is reachable. Returns
 * `checked: false` whenever the result is ambiguous (login wall, redirect,
 * timeout) so the admin never sees a false "doesn't exist".
 */
export async function verifyInstagram(handle: string): Promise<IgResult> {
  const clean = handle.trim().replace(/^@/, "");
  if (!isValidHandle(clean))
    return { checked: true, exists: false, source: "format", note: "Invalid handle format" };

  const url = `https://www.instagram.com/${clean}/`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        // A browser-ish UA improves the odds of a real response.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: ctrl.signal,
    });

    // A redirect to /accounts/login is IG's wall → indeterminate, not "absent".
    if (res.status >= 300 && res.status < 400)
      return { checked: false, source: "fetch", note: "Login wall / redirect" };

    if (res.status === 404)
      return { checked: true, exists: false, source: "fetch" };

    if (res.status === 200) {
      const html = await res.text();
      if (/Sorry, this page isn.?t available/i.test(html))
        return { checked: true, exists: false, source: "fetch" };
      if (/loginForm|accounts\/login/i.test(html) && html.length < 50_000)
        return { checked: false, source: "fetch", note: "Login wall" };
      return { checked: true, exists: true, source: "fetch" };
    }

    return { checked: false, source: "fetch", note: `HTTP ${res.status}` };
  } catch {
    return { checked: false, source: "fetch", note: "Unreachable / timeout" };
  } finally {
    clearTimeout(timer);
  }
}
