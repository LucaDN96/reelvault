# Auth Methods Expansion — Design Spec

**Date:** 2026-05-18
**Status:** Approved

## Overview

Expand ReelVault's authentication from magic-link-only to four methods: Email + Password, Google OAuth, Apple Sign In, and Magic Link (retained). All auth is handled through the Supabase JS client — no backend changes required.

---

## 1. AuthContext changes

`AuthContext.jsx` gains four new methods:

| Method | Supabase call |
|---|---|
| `signInWithPassword(email, password)` | `supabase.auth.signInWithPassword({ email, password })` |
| `signUpWithPassword(email, password)` | `supabase.auth.signUp({ email, password })` |
| `signInWithOAuth(provider)` | `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/auth/callback' } })` |
| `resetPassword(email)` | `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/app/auth/reset-password' })` |

The existing `signIn` (magic link OTP) and `signOut` are unchanged.

`onAuthStateChange` gains handling for the `PASSWORD_RECOVERY` event: when fired, navigate to `/app/auth/reset-password`.

**Supabase dashboard config required:**
- Enable Email provider with "Confirm email" disabled (immediate access on sign-up)
- Enable Google OAuth provider (Client ID + Secret from Google Cloud Console)
- Enable Apple OAuth provider (Service ID, Key ID, Private Key from Apple Developer account)

---

## 2. Routes & components

### New routes in `App.jsx`

| Path | Component | Guard |
|---|---|---|
| `/app/auth/forgot-password` | `ForgotPasswordScreen` | PublicRoute |
| `/app/auth/reset-password` | `ResetPasswordScreen` | PublicRoute (user not yet authenticated) |

Both are `PublicRoute` — the user arrives unauthenticated. The existing `/auth/callback` route handles OAuth redirects unchanged.

### New components

**`AuthScreen.jsx`** (refactored — shell only)
- Language bar (top-right, unchanged)
- Logo + tagline
- Sign In / Sign Up tab toggle (`activeTab` state: `'signin' | 'signup'`)
- Renders `<AuthSignInForm>` or `<AuthSignUpForm>` based on active tab

**`AuthSignInForm.jsx`**
- Google OAuth button
- Apple OAuth button
- "or" divider
- Email input
- Password input (min 6 chars)
- Primary CTA: "Sign in"
- "Forgot password?" link → navigates to `/app/auth/forgot-password`
- "Send magic link instead" link → calls `signIn(email, redirectTo)` from context (existing OTP flow)

**`AuthSignUpForm.jsx`**
- Google OAuth button
- Apple OAuth button
- "or" divider
- Email input
- Password input (min 6 chars)
- Primary CTA: "Create account"

**`ForgotPasswordScreen.jsx`**
- Back link to `/app/auth`
- Logo + instructional copy
- Email input
- "Send reset link" button → calls `resetPassword(email)`
- After submit: always shows confirmation message (prevents email enumeration)

**`ResetPasswordScreen.jsx`**
- Logo
- New password input (min 6 chars)
- Confirm new password input
- "Set new password" button → calls `supabase.auth.updateUser({ password })`
- On success: navigate to `/app`
- On failure (e.g. direct visit without valid token): show error + link back to forgot-password

---

## 3. UI layout

### AuthScreen (shell)
```
[ EN | IT ]                          ← top-right language bar

      ReelVault
  Save any reel in 2 seconds.

  [ Sign in ]  [ Sign up ]           ← tab toggle

  <AuthSignInForm or AuthSignUpForm>
```

### AuthSignInForm / AuthSignUpForm (shared structure)
```
  [ G  Continue with Google  ]
  [ A  Continue with Apple   ]

  ──────────── or ────────────

  Email
  Password
  [ Sign in / Create account ]

  Forgot password?                   ← sign-in only
  Send magic link instead            ← sign-in only
```

### ForgotPasswordScreen
```
  ← Back to sign in

  ReelVault
  Enter your email and we'll send a password reset link.

  Email
  [ Send reset link ]

  ✓ Check your email                 ← shown after submit (always)
```

### ResetPasswordScreen
```
  ReelVault

  New password
  Confirm new password
  [ Set new password ]
```

---

## 4. Styling

All new CSS goes in `App.css` under the existing `/* ── Auth screen */` block. New classes:

- `.auth-tabs` — tab toggle container
- `.auth-tab` — individual tab button (active state: `.auth-tab.active`)
- `.auth-divider` — "or" horizontal rule with label
- `.auth-oauth-btn` — OAuth provider button (icon + label, full width)
- `.auth-sub-links` — container for "Forgot password?" and "Send magic link instead" links below form

No new CSS files.

---

## 5. i18n

New keys added to both `en.js` and `it.js`:

```
auth_sign_in             Sign in
auth_sign_up             Sign up
auth_create_account      Create account
auth_password_placeholder  Password
auth_forgot_password     Forgot password?
auth_magic_link_instead  Send magic link instead
auth_continue_google     Continue with Google
auth_continue_apple      Continue with Apple
auth_forgot_title        Reset your password
auth_forgot_instructions Enter your email and we'll send a reset link.
auth_send_reset_link     Send reset link
auth_reset_check_email   Check your email for a password reset link.
auth_reset_title         Set new password
auth_new_password        New password
auth_confirm_password    Confirm new password
auth_set_password        Set new password
auth_back_to_signin      Back to sign in
error_invalid_credentials  Incorrect email or password.
error_email_taken        An account with this email already exists.
error_email_not_confirmed  Please verify your email before signing in.
```

---

## 6. Error handling

**Client-side validation (before Supabase call):**
- Email: must not be empty
- Password: minimum 6 characters
- Confirm password (reset screen): must match new password
- Errors shown inline with `.auth-error`

**Supabase error mapping:**

| Supabase message | i18n key |
|---|---|
| `Invalid login credentials` | `error_invalid_credentials` |
| `User already registered` | `error_email_taken` |
| `Email not confirmed` | `error_email_not_confirmed` |
| Any other | `error_generic` |

**OAuth edge cases:**
- User cancels OAuth popup: Supabase returns error silently — no error shown, form returns to normal state
- Provider not configured in Supabase: shown as `error_generic`

**Password reset edge cases:**
- `ForgotPasswordScreen` always shows confirmation (prevents email enumeration)
- `ResetPasswordScreen` visited without valid token: `updateUser()` fails → show `error_generic` + link to forgot-password

---

## 7. Out of scope

- Social account linking (connecting Google to an existing email account)
- "Remember me" / session duration preferences
- Rate limiting on sign-in attempts (handled by Supabase)
- Email change or account deletion flows
