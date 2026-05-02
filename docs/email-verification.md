# Resident Email Verification – Test Guide

## Overview
Residents must verify their email before accessing resident features. Unverified residents are redirected to `/verify-email/pending`. Admin and Barangay users keep their existing flows.

## Prerequisites
- Run the SQL migration `db/migrations/2025-12-12_resident_email_verification.sql` on the `eligtasmo` database.
- Configure mail in `api/config.mail.php`:
  - Set `use_smtp=true` and provide `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`.
  - Or leave `use_smtp=false` to use PHP `mail()` locally.
- Ensure the app is served from `http://localhost/eligtasmo` so links render correctly.

## Verification Flow
1. Go to `/brgy-signin?mode=resident`.
2. Register with a valid email address.
3. You will be redirected to `/verify-email/pending`.
4. Check inbox for “Verify your E-LigtasMo resident account”.
5. Click the verification link. You’ll be redirected to `/verify-email/success`.
6. Sign in at `/signin` and access resident pages.

## Edge Cases
- Expired link (after 24 hours) → `/verify-email/expired`.
- Invalid token or mismatched email → `/verify-email/failed`.
- Attempt to sign in before verifying → redirected to `/verify-email/pending`.

## Resend Verification
- On `/verify-email/pending`, `/verify-email/failed`, or `/verify-email/expired`:
  - Enter your email and use the resend form.
  - Rate limit: once per 5 minutes per email address.

## Troubleshooting
- If emails don’t arrive:
  - Check SMTP credentials and firewall.
  - Verify `from_email` domain is allowed by your SMTP provider.
  - Inspect server logs and network restrictions.
- If links redirect incorrectly:
  - Confirm your base URL and that PHP `$_SERVER['HTTP_HOST']` resolves to your host.
  - Ensure the app runs under `/eligtasmo` path.


