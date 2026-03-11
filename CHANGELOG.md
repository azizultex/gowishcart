# Changelog

All notable changes to the GoWishCart Wishlist plugin will be documented in this file.

## [1.1.2] - 2026-03-09

### Fixed
- Fix unsafe SQL
- Escape output late
- Replace WP_PLUGIN_DIR / hardcoded plugin path logic

## [1.1.1] - 2026-02-25

### Fixed
- Improved REST API security by adding proper permission and nonce checks.
- Removed hardcoded `/wp-admin/` path and ensured admin URLs work on all WordPress setups.


## [1.1.0] - 2026-02-22

### Changed
- Plugin display name updated across the admin and public-facing areas

### Fixed
- REST API routes: added missing `permission_callback` for WordPress 5.5+ compatibility
- AJAX endpoint: corrected link/URL used in endpoint configuration


## [1.0.0] - 2025-11-04

### Added
- Initial release of GoWishCart Wishlist for FluentCart
- Guest user wishlist support with email tracking
- Product variation support in wishlists
- Price drop alerts and notifications
- Back in stock notifications
- FluentCRM integration with triggers
- FluentCRM SmartCode support for email campaigns
- Wishlist page with customizable URL
- Shortcode support for wishlist button and wishlist display
- Admin dashboard for wishlist management
- Analytics and reporting features
- Customizable button appearance and positioning
- Multiple wishlist support per user
- Product sharing capabilities
