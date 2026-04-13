## Context

GoWishCart ships two styled surfaces: a WordPress admin React app (`src/admin/`, built to `build/admin.css`) and storefront wishlist UI (`src/styles/*.scss`, built to `build/wishlist-frontend.css`). Design tokens live primarily in `src/admin/styles/gowishcart-theme.scss` and Tailwind-oriented HSL variables in `src/admin/styles/main.scss`. The latter already defines a `.dark` selector with a short comment implying WordPress admin rarely uses it; storefront and modal surfaces still assume light backgrounds in several components.

## Goals / Non-Goals

**Goals:**

- Provide readable, consistent dark palettes for all plugin-controlled chrome: admin pages, menu-related admin CSS, wishlist button, modals, and list/table views.
- Prefer CSS variables and layered overrides so light mode remains the default and dark mode is additive.
- On the public site, follow `prefers-color-scheme: dark` unless an explicit user/store toggle is introduced later.
- In wp-admin, respect the user’s effective appearance: combine WordPress admin color scheme cues (modern schemes that use dark surfaces) with `prefers-color-scheme` where the admin body does not expose a reliable class, without fighting core WordPress layout.

**Non-Goals:**

- Redesigning FluentCart or third-party theme templates outside plugin markup.
- Adding a full theme builder or per-control color pickers for dark mode (unless deferred as a follow-up product decision).
- Supporting legacy browsers without `prefers-color-scheme` (those simply keep the light stylesheet).

## Decisions

1. **Token strategy**: Extend existing `--gowishcart-*` and Tailwind HSL variables with a dark variant layer. Prefer `@media (prefers-color-scheme: dark)` for frontend bundles. For admin, mirror dark tokens when `body.admin-color-*` indicates dark UI (e.g. modern dark schemes) and/or under `prefers-color-scheme: dark` scoped to `#wpbody-content .gowishcart-admin-root` (or the plugin’s root wrapper class) to avoid breaking unrelated wp-admin pages.

2. **Class vs. media query**: Use media-query-first on the storefront to avoid JavaScript. Optionally add a `.gowishcart-dark` utility class on a wrapper if merchants need to force dark styling when OS preference is light (hook for future setting).

3. **WordPress components**: Rely on `@wordpress/components` where possible; supplement with scoped SCSS overrides for cards, tables, and notices so they pick up the same tokens as the Tailwind layer.

4. **Build pipeline**: No new npm dependencies by default; implement with SCSS/CSS. If contrast utilities are needed, use native `color-mix()` only with a documented fallback for older Safari if required, or stick to fixed hex/HSL pairs for maximum compatibility.

5. **Images and icons**: Prefer currentColor or CSS-masked icons for strokes; audit PNG/SVG backgrounds in `admin-style.css` inline rules for hard-coded light backgrounds.

## Risks / Trade-offs

- **[Risk] Double darkening** when a theme already applies a dark page background → **Mitigation**: keep wishlist surfaces slightly elevated (border + subtle background) and ensure button outlines remain visible.
- **[Risk] Admin color scheme matrix** is large and fluid across WP versions → **Mitigation**: scope overrides to plugin containers; test against default, modern, and one dark-oriented scheme.
- **[Risk] Specificity wars** with Tailwind utilities → **Mitigation**: define dark tokens at `:root` / wrapper level and use low-specificity custom properties consumed by components.

## Migration Plan

1. Land SCSS/CSS changes and rebuild `admin` and `wishlist-frontend` targets (`BUILD_TARGET=admin` / default) so `build/*.css` updates ship together.
2. No database migration. If a future setting is added, default remains “follow system”.
3. Rollback: revert CSS bundle and SCSS; no persisted state.

## Open Questions

- Whether merchants want an explicit “Force dark / Force light” setting independent of OS; leave out of initial scope unless product requests it.
- Whether FluentCart storefront blocks inject their own dark context class the plugin should detect—needs a quick runtime check on a FluentCart demo.
