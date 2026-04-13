## Why

Store owners and shoppers increasingly use dark system themes and WordPress admin color schemes. The plugin’s admin screens (React settings) and storefront wishlist UI are tuned for light backgrounds, which causes eye strain and visual inconsistency when the rest of the site or admin is dark. Adding dark-mode support aligns the plugin with OS and WordPress preferences and improves accessibility in low-light environments.

## What Changes

- Introduce a coherent dark appearance for plugin-owned UI: WordPress admin settings pages built with `@wordpress/components` / custom CSS, global admin menu styling hooks, and storefront wishlist button, modal, and list surfaces.
- Prefer standards-based detection: `prefers-color-scheme: dark` on the frontend; align admin styling with the active WordPress admin color scheme and/or `prefers-color-scheme` where appropriate.
- Define CSS variables (or equivalent design tokens) for backgrounds, borders, text, and accent colors so light and dark themes stay maintainable.
- Ensure contrast for interactive states (hover, focus, disabled) and WCAG-oriented readability in dark palettes.
- Document any new settings (only if we add an explicit “force light/dark/follow system” toggle); default behavior should follow system and WordPress without requiring configuration.

## Capabilities

### New Capabilities

- `dark-mode-ui`: End-user and admin-visible appearance of GoWishCart surfaces in dark contexts—detection strategy, color tokens, scope (admin app, menu assets, frontend wishlist), accessibility, and testing expectations.

### Modified Capabilities

- None. There are no existing capability specs in `openspec/specs/` for this repository yet.

## Impact

- **Admin**: `includes/class-gowishcart-admin.php` (enqueue of `build/admin.css`, `assets/css/admin-style.css`), React sources under `src/admin/`, and compiled `build/admin.css` / `admin.js` after rebuild.
- **Frontend**: `includes/class-wishlist-frontend.php`, shortcode handlers, `build/wishlist-frontend.css`, and related SCSS/CSS sources if present.
- **Build**: Possible updates to Vite/webpack entry styles or shared tokens.
- **Dependencies**: No new runtime PHP dependencies anticipated; styling uses CSS and existing WordPress packages.
