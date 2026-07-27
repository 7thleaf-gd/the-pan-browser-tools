# THE PAN IMAGE MACHINE v0

**CREATE. PLAY. DISTORT.**

THE PAN IMAGE MACHINE is the first release in **THE PAN Browser Tools**—free, installation-free creative software from **7thleaf Records**. It is a static HTML/CSS/JavaScript application designed to run directly on GitHub Pages.

## Concept

An image-processing control panel inspired by DIY labels, photocopiers, experimental music, analog noise, and old studio machinery. No account, installation, build step, or server is required.

## Features

- Image upload, file selection, and drag-and-drop
- Live before-processing source and processed Canvas preview
- Pixelate, ordered dither, noise, RGB split, scanline, contrast, and brightness controls
- Random Distort and Reset controls
- PNG export
- Automatic resizing of very large images (maximum 2048 px on the longest side and 4 megapixels)
- Responsive interface for desktop and mobile
- User-facing validation and processing errors
- Keyboard-accessible upload and controls

## Privacy

All image processing runs locally in the browser with the Canvas API. Uploaded images are never sent to an external server. Image data, filenames, and personal information are never added to `dataLayer` or analytics events. Declining analytics does not disable any tool feature.

Optional, consent-based analytics are loaded through Google Tag Manager:

- GTM container: `GTM-5W74796T`
- GA4 measurement ID configured in GTM: `G-5WHCJ6DCMF`

The site does **not** load GA4 `gtag.js` directly, preventing double measurement. Google Consent Mode defaults are set before GTM loads. The initial values of `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` are all `denied`. Only `analytics_storage` changes to `granted` after the visitor explicitly accepts analytics. The choice is saved in `localStorage` and can be changed later from **Privacy settings** in the footer. Advertising tags are not used.

### GTM / GA4 setup

Inside GTM:

1. Create a **Google tag** using measurement ID `G-5WHCJ6DCMF`.
2. Set its consent requirement to `analytics_storage`.
3. Use the Consent Initialization event only for consent-management tags; the site's default Consent Mode command already runs before the container.
4. Create GA4 event tags or a lookup-driven event tag for the custom events below.
5. Require `analytics_storage` for every GA4 tag. Do not create advertising tags.
6. Publish the container.

Events pushed to `dataLayer`:

| Event | Parameter | Purpose |
| --- | --- | --- |
| `image_upload` | — | A valid image was loaded |
| `effect_used` | `effect_name` | A processing control was adjusted |
| `random_distort` | — | Random Distort was used |
| `reset_tool` | — | Controls were reset |
| `image_export` | — | A PNG export completed |
| `tool_error` | `error_type` | A user-facing tool error occurred |

No event contains image data, a filename, or personal information.

### Verify with Tag Assistant

1. Open GTM Preview / [Tag Assistant](https://tagassistant.google.com/) and connect the deployed URL.
2. Clear the site's local storage or open a private window.
3. Confirm the default consent state is denied before the `gtm.js` event.
4. Decline analytics and verify GA4 tags do not fire while all image tools still work.
5. Open **Privacy settings**, allow analytics, and verify `analytics_storage` updates to granted.
6. Use each tool action and inspect the event names and safe parameters in the data layer.
7. Confirm the Google tag uses `G-5WHCJ6DCMF` and that no separately embedded GA4 script fires.

## Run locally

No build is required. From the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys the repository root whenever `main` is pushed.

1. In the GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or manually run the **Deploy static site to Pages** workflow.

The workflow grants only the required `contents: read`, `pages: write`, and `id-token: write` permissions, uploads the static site as a Pages artifact, and deploys it with `deploy-pages`.

## Planned Browser Tools

- Audio waveform and destruction machine
- GIF loop and frame processor
- Type/poster generator
- Color sampling and palette machine
- Video feedback and scanline processor

---

THE PAN Browser Tools / **7thleaf Records**
