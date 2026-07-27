# Analytics and Consent

- Google Tag Manager: `GTM-5W74796T`
- GA4 measurement ID configured inside GTM: `G-5WHCJ6DCMF`

The site embeds only GTM. It does not embed GA4 `gtag.js` directly and does not include the GTM noscript iframe.

## Consent

Before GTM loads, Consent Mode defaults `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` to `denied`. A stored explicit grant may update only `analytics_storage` to `granted`. Advertising-related storage remains denied permanently.

The choice is stored under `thePanAnalyticsConsent` in `localStorage`. Visitors can reopen Privacy Settings at any time. Declining leaves every creative feature available.

## Event contract

Events use lowercase snake_case. `assets/js/analytics.js` enforces an allowlist and may add fixed `tool_id` and `tool_version` values. Parameter values are restricted identifiers, not free text.

Never send creative data, file content, filenames, user-entered text, personal data, or sensitive browser information.

| Event | Parameter | Meaning |
| --- | --- | --- |
| `image_upload` | — | Valid image decoded locally |
| `effect_used` | `effect_name` | Range control adjusted |
| `random_distort` | — | Random action used |
| `reset_tool` | — | Tool reset |
| `image_export` | — | PNG export completed |
| `tool_error` | `error_type` | User-facing error shown |

## GTM configuration

Configure the Google tag with `G-5WHCJ6DCMF`, require `analytics_storage`, and publish only non-advertising analytics tags. Create GA4 event tags for the allowlisted events and safe parameters. In Tag Assistant, verify default denial occurs before `gtm.js`, tags remain blocked after decline, a later allow updates analytics consent, and no duplicate direct GA4 request appears.
