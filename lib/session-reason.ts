// Why the last session ended, shown once on the login page. Kept in
// sessionStorage (not the URL) so other redirects to /login can't drop it.
export type SignOutReason = 'idle' | 'expired'

const REASON_KEY = 'mdmis_signout_reason'

export function rememberSignOutReason(reason: SignOutReason) {
  try {
    sessionStorage.setItem(REASON_KEY, reason)
  } catch {
    // storage unavailable: the login page just won't explain
  }
}

export function takeSignOutReason(): SignOutReason | null {
  try {
    const reason = sessionStorage.getItem(REASON_KEY)
    sessionStorage.removeItem(REASON_KEY)
    return reason === 'idle' || reason === 'expired' ? reason : null
  } catch {
    return null
  }
}
