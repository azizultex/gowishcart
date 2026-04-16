## ADDED Requirements

### Requirement: Pro class conditional DOM bridge
The free plugin SHALL expose a dedicated admin DOM container for Pro extension rendering only when `GoWishCart_Wishlist_Pro` is available.

#### Scenario: Pro plugin class is available
- **WHEN** an admin page is rendered and `GoWishCart_Wishlist_Pro` exists
- **THEN** the free plugin outputs a uniquely identifiable Pro bridge container for feature-scoped Pro DOM rendering

#### Scenario: Pro plugin class is not available
- **WHEN** an admin page is rendered and `GoWishCart_Wishlist_Pro` does not exist
- **THEN** the free plugin does not execute any direct Pro rendering call and admin UI remains functional
