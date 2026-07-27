# Release Checklist

## Desktop

- [ ] Studio workspace fits a normal laptop viewport
- [ ] Preview remains visible while the control bank scrolls
- [ ] Action area remains reachable

## Mobile

- [ ] 390px and 320px widths have no horizontal overflow
- [ ] Sticky preview uses roughly 35–42dvh
- [ ] Sticky action bar respects `safe-area-inset-bottom`
- [ ] Page and controls remain scrollable

## Keyboard and accessibility

- [ ] Skip link, upload, sliders, actions, navigation, and footer are keyboard reachable
- [ ] Focus indicators are visible
- [ ] Errors and busy states announce correctly
- [ ] Consent and fullscreen dialogs trap focus, close with Escape, and restore focus
- [ ] Fullscreen Original / Current / Compare controls and split handle work
- [ ] Gallery compare handle works with pointer, touch, and arrow keys
- [ ] Reduced-motion preference is honored

## Tool behavior

- [ ] File selection and drag/drop work
- [ ] Every existing effect works
- [ ] Presets, Surprise Me, section resets, and Reset All work
- [ ] PNG export opens a valid file
- [ ] Oversized images are scaled within limits
- [ ] Unsupported and invalid files show useful errors

## Privacy and analytics

- [ ] Creative files never leave the browser
- [ ] Allow, decline, stored choice, and Privacy Settings work
- [ ] Ad-related consent always remains denied
- [ ] GTM is present and direct GA4 `gtag.js` is absent
- [ ] Events contain only allowlisted safe parameters

## SEO and pages

- [ ] Image Machine, Tools, About, and 404 render
- [ ] Titles, descriptions, canonicals, Open Graph, Twitter, robots, and JSON-LD are correct
- [ ] Sitemap contains only real indexable pages
- [ ] Internal links resolve

## Performance and release

- [ ] Slider work is coalesced by animation frame
- [ ] Temporary canvases are reused
- [ ] Maximum-size images remain usable while presets and Surprise Me are repeated
- [ ] Critical CSS and JavaScript URLs carry the current cache version
- [ ] No unexpected console errors or external CDN dependencies
- [ ] `python3 scripts/check-site.py` passes
- [ ] All JavaScript passes `node --check`
- [ ] GitHub Pages workflow passes before deployment
