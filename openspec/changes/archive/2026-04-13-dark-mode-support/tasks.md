## 1. Discovery and token plan

- [x] 1.1 Inventory hard-coded light colors across `src/admin/styles/`, `src/styles/`, and `assets/css/admin-style.css` (including inline PHP-generated CSS) that affect plugin UI in light mode today
- [x] 1.2 Decide per-surface mapping: extend `:root` / `.dark` / `@media (prefers-color-scheme: dark)` blocks in `gowishcart-theme.scss` and `main.scss` so storefront and admin share naming conventions

## 2. Admin dark mode

- [x] 2.1 Implement dark token overrides scoped to the plugin admin root wrapper, combining `prefers-color-scheme: dark` with detection for dark-oriented WordPress admin color schemes where practical
- [x] 2.2 Update Tailwind/shadcn HSL variables under dark conditions so cards, popovers, tables, and forms in `src/admin/` pick up the palette without one-off hacks
- [x] 2.3 Patch `assets/css/admin-style.css` / PHP inline styles for menu or icon backgrounds so assets stay visible on dark surfaces
- [x] 2.4 Rebuild admin bundle (`BUILD_TARGET=admin`) and smoke-test all plugin admin subpages for contrast, focus rings, and notices

## 3. Storefront wishlist dark mode

- [x] 3.1 Add `@media (prefers-color-scheme: dark)` layers to `WishlistButton.scss`, `WishlistPage.scss`, `WishlistSelectorModal.scss`, `ShareModal.scss`, `VariantSelector.scss`, `VariantWishlistButtons.scss`, and `Analytics.scss` (if surfaced on frontend) using shared tokens
- [x] 3.2 Ensure modal overlays, borders, and empty states remain distinguishable from host theme backgrounds
- [x] 3.3 Rebuild wishlist frontend bundle (default `BUILD_TARGET`) and verify button, modal, and shortcode flows in dark OS preference

## 4. QA and polish

- [x] 4.1 Cross-browser check (Chromium + Firefox + Safari) for `prefers-color-scheme` behavior and focus visibility
- [x] 4.2 Spot-check FluentCart product pages with wishlist enabled against at least one dark storefront theme (or forced dark via devtools) for double-darkening issues
- [x] 4.3 Update any developer-facing notes in `README` or internal comments only if the repo already documents styling workflow (optional; skip if no such section exists)
