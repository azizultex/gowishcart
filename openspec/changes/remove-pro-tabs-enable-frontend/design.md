## Context

The free plugin admin controller currently includes tabs and mappings that reference Pro-oriented experiences (such as `get-pro`), while the core free plugin already initializes frontend handlers from the main bootstrap flow. The requested change is to simplify free admin navigation by removing Pro-related tabs and to introduce a controlled extension point that only activates when `GoWishCart_Wishlist_Pro` exists, allowing Pro plugin-specific DOM rendering without coupling free and Pro codebases.

## Goals / Non-Goals

**Goals:**
- Remove Pro-related tab definitions and page-to-tab mappings from the free admin navigation.
- Preserve all existing free frontend wishlist runtime behavior and initialization.
- Provide a stable DOM bridge in admin rendering that Pro can target when `GoWishCart_Wishlist_Pro` is detected.
- Keep free-only installations stable with no fatal errors or broken admin pages.

**Non-Goals:**
- Implement Pro plugin feature markup in the free plugin.
- Add new REST endpoints specifically for Pro behavior.
- Re-architect the full admin React SPA.

## Decisions

1. **Admin tab cleanup in free controller**
   - Remove explicit Pro tab entries and related route aliases from `GoWishCart_Admin` tab/page maps.
   - Rationale: ensures free admin reflects only free capabilities and avoids dead-end navigation.
   - Alternative considered: hide Pro tabs conditionally in JS; rejected because server-side tab registration would still expose routes and increase complexity.

2. **Server-side Pro class detection contract**
   - Use class existence checks and/or a lightweight filter guard to determine whether Pro bridge markup should be emitted.
   - Rationale: this keeps free plugin independent while enabling optional enhancement.
   - Alternative considered: hard dependency call into Pro class methods; rejected to avoid fatal errors when Pro is not installed.

3. **Dedicated DOM bridge container**
   - Add a specific div container in admin rendering context for feature-scoped Pro DOM injection.
   - Rationale: gives Pro plugin a deterministic mounting point and avoids invasive DOM targeting.
   - Alternative considered: reuse root app container; rejected to prevent collisions with free React rendering lifecycle.

4. **Frontend availability preservation**
   - Keep current frontend initialization flow unchanged and explicitly guard against accidental disablement when admin code is adjusted.
   - Rationale: user-requested focus is admin cleanup while keeping frontend enabled.

## Risks / Trade-offs

- **[Risk] Admin routing regression after tab removal** → Mitigation: update both tab list and page-to-tab map together; verify default fallback page remains valid.
- **[Risk] Pro bridge markup creates duplicate mounts** → Mitigation: use a unique container ID and require Pro renderer to check mount state.
- **[Risk] Hidden coupling between free and Pro scripts** → Mitigation: use class/filter detection and no direct hard-coded Pro file includes in free plugin.
- **[Trade-off] Less upgrade discovery by removing Get Pro surfaces** → Mitigation: if needed later, expose upgrade CTA in non-tab inline components instead of dedicated Pro navigation tabs.
