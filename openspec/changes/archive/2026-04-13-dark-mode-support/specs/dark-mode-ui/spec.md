## ADDED Requirements

### Requirement: Dark appearance detection

The plugin SHALL apply its dark visual tokens when the shopper’s environment prefers dark mode on the storefront, and when the administrator’s WordPress admin context indicates a dark appearance or the administrator’s OS prefers dark mode, limited to plugin-owned admin UI containers.

#### Scenario: Storefront follows system dark preference

- **WHEN** a page loads the wishlist frontend assets and the user agent reports `prefers-color-scheme: dark`
- **THEN** wishlist UI controlled by the plugin (button, modals, lists, notices) SHALL render using the dark token set without requiring a plugin setting

#### Scenario: Storefront stays light when system prefers light

- **WHEN** `prefers-color-scheme` is light or not supported
- **THEN** the plugin SHALL keep the existing light palette as the default for storefront UI

### Requirement: Admin settings UI dark styling

The plugin SHALL ensure admin React settings screens and co-located plugin chrome use readable dark backgrounds, borders, and text when dark appearance is active, without reducing wp-admin accessibility for surrounding core UI.

#### Scenario: Dark admin surfaces remain legible

- **WHEN** dark appearance is active inside the plugin’s admin root container
- **THEN** body text, headings, form labels, tables, cards, and primary buttons SHALL meet contrast expectations suitable for extended reading (target at least WCAG AA for normal text on primary surfaces)

#### Scenario: Admin light appearance unchanged

- **WHEN** dark appearance is not active
- **THEN** existing light styling SHALL remain visually equivalent to the pre-change baseline for the same screens

### Requirement: Shared token architecture

The plugin SHALL centralize light and dark colors in CSS custom properties (or equivalent SCSS variables compiled to custom properties) consumed by admin and storefront bundles so future palette tweaks do not require scattered literal colors.

#### Scenario: Components consume tokens

- **WHEN** new or existing plugin UI elements need background, border, or text color
- **THEN** authors SHALL prefer existing `--gowishcart-*` / Tailwind HSL tokens (or their dark overrides) over hard-coded hex values except for one-off brand accents documented in the theme file

### Requirement: Interactive and focus states

The plugin SHALL preserve visible hover, focus, active, and disabled states for interactive controls in dark mode, including keyboard focus rings.

#### Scenario: Keyboard user sees focus

- **WHEN** a user tabs through wishlist controls or admin forms in dark mode
- **THEN** focused elements SHALL display a visible focus treatment distinct from the default idle styling

### Requirement: Asset compatibility

The plugin SHALL audit and update raster or CSS background treatments used for plugin icons or badges so they remain visible on dark surfaces (for example by adjusting background-position, filters, or providing dark variants).

#### Scenario: Menu or header icons remain visible

- **WHEN** dark appearance is active and the plugin renders admin menu or toolbar-related imagery defined in plugin CSS
- **THEN** those assets SHALL remain discernible without clipping essential glyph contrast
