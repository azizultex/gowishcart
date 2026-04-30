## ADDED Requirements

### Requirement: Frontend wishlist remains enabled in free plugin
The free plugin SHALL keep frontend wishlist handlers, page rendering, and shortcodes active after Pro tab cleanup changes.

#### Scenario: Free plugin initializes on supported site
- **WHEN** plugin dependencies are satisfied and the free plugin loads
- **THEN** frontend wishlist components are initialized as before without requiring Pro plugin presence

#### Scenario: Admin cleanup deployment
- **WHEN** Pro-related admin tabs are removed in free plugin
- **THEN** no regression occurs in free frontend wishlist interactions for shop and product pages
