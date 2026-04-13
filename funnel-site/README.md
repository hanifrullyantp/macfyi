# Macfyi marketing funnel (static)

- **`index.html`** — landing + placeholder checkout section (wire your payment provider).
- **`styles.css`** — minimal dark styling aligned with the desktop app.
- **`templates/confirmation-email.html`** — HTML for the post-purchase email (placeholders `{{download_url}}`, `{{license_key}}`, `{{customer_email}}`).

## Flow

1. Host these files on any static host (S3, Cloudflare Pages, Netlify).
2. Point the checkout form `action` to your gateway’s hosted payment or API.
3. Configure the **payment webhook** Edge Function (`supabase/functions/payment-webhook`) with `RESEND_API_KEY` and `EMAIL_FROM` so buyers receive the DMG link and license key.
4. Set **`download_base_url`** in Supabase `app_settings` (via admin UI or SQL) to your signed DMG URL.

## Activation in the app

Users enter email + license key on the first-run **Activation** screen inside Macfyi (not in this site). Optional deep link `macfyi://activate` can be added in Tauri configuration later.
