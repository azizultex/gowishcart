## Why

The free plugin still exposes Pro-oriented admin navigation and mixed upgrade messaging, which creates confusion and a fragmented settings experience. We need to simplify the free admin UI while keeping frontend wishlist behavior consistently available and allowing optional Pro plugin DOM rendering when the Pro class is present.

## What Changes

- Remove all Pro-related admin tabs/pages from the free plugin admin navigation and page-to-tab mapping.
- Keep free frontend wishlist behavior enabled and unaffected by Pro tab removal.
- Add a dedicated placeholder container in free admin rendering for feature-specific Pro DOM injection when `GoWishCart_Wishlist_Pro` is available.
- Define a safe detection and rendering contract so Pro DOM rendering is optional and does not break free-only installs.

## Capabilities

### New Capabilities
- `pro-extension-dom-bridge`: Provides a controlled admin container and detection flow so the Pro plugin can render feature-specific DOM only when `GoWishCart_Wishlist_Pro` exists.

### Modified Capabilities
- `free-admin-navigation`: Remove Pro-only tabs and route mappings from free admin navigation while preserving usable free settings paths.
- `free-frontend-availability`: Ensure frontend wishlist functionality remains enabled after admin Pro tab cleanup.

## Impact

- Affected code: `includes/class-gowishcart-admin.php`, frontend initialization flow in `gowishcart-wishlist-for-fluentcart.php`, and admin React bootstrap data passed to JS.
- No external API contract changes expected for public REST endpoints.
- Reduces UI clutter for free users and adds clear extension point for Pro plugin rendering.
