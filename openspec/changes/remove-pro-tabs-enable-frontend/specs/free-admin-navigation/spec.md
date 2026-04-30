## ADDED Requirements

### Requirement: Free admin excludes Pro tabs
The free plugin admin navigation SHALL exclude Pro-related tabs and route aliases from tab registration and default tab mapping.

#### Scenario: Admin menu and tabs are registered
- **WHEN** the free plugin registers admin tabs and page mappings
- **THEN** Pro-specific tabs (including Get Pro and other Pro-only sections) are not included in the free navigation set

#### Scenario: User loads a removed Pro tab route
- **WHEN** an admin request targets a removed Pro tab/page key
- **THEN** the free plugin falls back to a valid free tab without rendering a broken view
