---
name: wp-readme
description: >
  Generates fully compliant WordPress.org plugin readme.txt files and reviews existing ones for violations.
  Use this skill whenever the user wants to write, update, audit, or fix a WordPress plugin readme, plugin name,
  plugin description, or any WordPress.org submission content. Also trigger when the user mentions WordPress.org
  compliance, plugin directory, readme.txt, plugin listing, banner/icon guidelines, trademark issues, keyword
  stuffing, third-party service disclosure, or source code requirements. If the user is preparing to submit or
  resubmit a plugin to WordPress.org, always use this skill — do not rely on general knowledge alone.
  Also trigger when the user uploads or shares plugin source code files (.php, .js, plugin folder) and wants
  a readme generated from them — this skill reads the code to extract plugin name, features, hooks, and
  third-party dependencies automatically.
---

# WordPress.org README Skill

This skill helps you write and audit WordPress plugin `readme.txt` files that are fully compliant with WordPress.org guidelines. It can read plugin source code to auto-extract features, hooks, and dependencies — then generate a complete, compliant readme from that analysis.

---

## What This Skill Does

1. **Reads plugin source code** to auto-extract plugin name, features, hooks, shortcodes, settings, and third-party dependencies — then generates a readme from those findings
2. **Generates** a complete, compliant `readme.txt` from scratch (with or without source code)
3. **Audits** existing readme files or plugin metadata for violations
4. **Fixes** specific sections that were flagged by WordPress.org reviewers

---

## Step 0: Reading Plugin Code (When Source Files Are Provided)

When the user uploads or shares plugin source code, **always perform code analysis before writing the readme**. This is the most important step — it ensures the readme accurately reflects what the plugin actually does.

### How to Extract Information from Plugin Code

**1. Read the main plugin file first** (the `.php` file with the plugin header):
```php
/*
 * Plugin Name: My Plugin
 * Description: Does something useful
 * Version: 1.0.0
 * Author: John Doe
 * ...
 */
```
Extract: plugin name, version, author, license, description, text domain.

**2. Scan for features by looking for:**
- `add_shortcode(...)` → document each shortcode as a feature
- `register_post_type(...)` → custom post types
- `add_settings_section(...)` / `register_setting(...)` → settings/options
- `add_menu_page(...)` / `add_submenu_page(...)` → admin pages
- `wp_enqueue_script(...)` / `wp_enqueue_style(...)` → front-end assets loaded
- `add_action(...)` / `add_filter(...)` with public hooks → extensibility features
- REST API routes: `register_rest_route(...)` → API endpoints
- Blocks: `register_block_type(...)` → Gutenberg blocks

**3. Scan for third-party dependencies by looking for:**
- `require` / `include` of non-WordPress files in `/vendor`, `/lib`, `/includes`
- `wp_remote_get(...)` / `wp_remote_post(...)` calls → external API calls (note the URL)
- `new \GuzzleHttp\...`, `use Stripe\...`, `use Google\...` → composer packages
- `wp_enqueue_script('...', 'https://...')` → CDN-loaded external scripts
- Any hardcoded URLs that are not the site's own domain
- `composer.json` if present → list all `require` entries

**4. Build a feature list from what you find:**
- Be specific: instead of "has settings", write "provides a Settings page under Settings → [Plugin Name]"
- Instead of "has shortcodes", write "provides `[plugin_name]` shortcode to embed X anywhere"
- List each discovered shortcode, block, API endpoint, or CPT as its own feature bullet

**5. Map dependencies to the Third-Party Services section:**
- For each external URL or library found, create a disclosure entry
- If you find `wp_remote_get('https://api.openai.com/...')`, disclose OpenAI API
- If you find `/vendor/stripe/stripe-php`, disclose Stripe library

### Code Analysis Output Format

Before writing the readme, output a brief **Code Analysis Summary** like this:

```
### Code Analysis Summary
- Plugin Name: [from header]
- Version: [from header]
- Features found: [list]
- Shortcodes: [list or "none"]
- Admin pages: [list or "none"]
- Gutenberg blocks: [list or "none"]
- External API calls: [list of URLs or "none"]
- Third-party libraries: [list or "none"]
- REST endpoints: [list or "none"]
```

Then proceed to generate the readme using this extracted data.

---

## Known Violation Categories (Always Check These)

### 1. Trademark Abuse ⚠️ (Most Common / Most Severe)
Never use another company's trademark in:
- Plugin **slug** (the folder name / URL)
- Plugin **display name**
- Banner or icon images
- Screenshots

**Banned patterns:**
- Plugin names like `speed-booster-for-elementor` → uses "Elementor" trademark
- Plugin names starting with `cloudflare-`, `turnstile-`, `google-sheets-` → implies official affiliation
- Using the WordPress logo (W mark) in plugin icons
- Icons visually similar to Google Sheets, Google Drive, Slack, etc.

**Compliant pattern:**
- Use a unique, brandable name: `FlexTable`, `FlexOrder`, `WP Dark Mode` (generic descriptors OK, brand names NOT)
- If integration is needed in the name, use: `[YourBrand] for [Service]` only if trademarked term is not first

---

### 2. Keyword Stuffing ⚠️
The plugin **name** field must be short, factual, and non-promotional.

**Violation example:**
```
=== Bulk Order Sync for WooCommerce with Google Sheets | Bulk Edit WooCommerce Orders, Manage Orders, Sync Order Details & More – FlexOrder ===
```

**Compliant example:**
```
=== FlexOrder – WooCommerce Order Sync for Google Sheets ===
```

**Rules:**
- No pipe `|` separated keyword lists in the name
- No superlative claims: "best", "easiest", "#1", "most powerful", "the only"
- Short description (under the name) should be one factual sentence, max ~150 chars
- Tags section: max 5 relevant tags, no repetition of the plugin name

---

### 3. Support Forum Redirects ⚠️
The `== Support ==` section must NOT redirect free users away from the WordPress.org forum as the first option.

**Violation:**
```
For support, please contact us at https://yoursite.com/support
```

**Compliant pattern:**
```
== Support ==

For free version support, please use the [WordPress.org support forum](https://wordpress.org/support/plugin/your-plugin/).

Check the [FAQ section](#faq) first — your question may already be answered there.

For the **premium version**, contact us at https://yoursite.com/support
```

---

### 4. Third-Party Service Disclosure ⚠️ (Required)
If your plugin uses **any** external library, API, or service, you MUST disclose it.

**Required section in readme.txt:**
```
== Third-Party Services & Libraries ==

This plugin uses the following external services:

* **Jitsi Meet** – Used for video call functionality.
  - Service URL: https://jitsi.org
  - Terms of Service: https://jitsi.org/terms-of-service/
  - Privacy Policy: https://jitsi.org/privacy/

* **[Library Name]** – [What it does in this plugin]
  - Source: https://example.com
  - License: MIT – https://opensource.org/licenses/MIT
```

Failure to include this section is a common reason for plugin rejection.

---

### 5. Source Code Requirement
Your deployed plugin must include full source code, not just compiled/minified assets.

**In readme.txt**, make clear to contributors:
```
== Development ==

The source code for this plugin is available on [GitHub/GitLab](https://link-to-repo).

To build from source:
1. Run `npm install`
2. Run `npm run build`

The `src/` directory contains all unminified source files.
```

---

## Full Compliant readme.txt Template

```
=== [Plugin Display Name] – [Short Factual Tagline] ===
Contributors: yourwporgusername
Donate link: https://yoursite.com/donate (optional)
Tags: tag1, tag2, tag3, tag4, tag5
Requires at least: 5.0
Tested up to: 6.5
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

One-sentence description of what the plugin does. Keep it factual and under 150 characters.

== Description ==

[Explain what the plugin does. Be factual. No superlatives. No keyword stuffing.]

Key features:
* Feature one
* Feature two
* Feature three

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Go to Settings → [Plugin Name] to configure

== Frequently Asked Questions ==

= How do I do X? =
Answer here.

= Is this compatible with Y? =
Answer here.

== Screenshots ==

1. Description of screenshot 1
2. Description of screenshot 2

== Changelog ==

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.0.0 =
Initial release.

== Support ==

For free version support, please use the [WordPress.org support forum](https://wordpress.org/support/plugin/your-plugin-slug/).

Please check the FAQ above before posting — your question may already be answered.

For **premium version** support, visit https://yoursite.com/support

== Third-Party Services & Libraries ==

This plugin uses the following external services or libraries:

* **[Service/Library Name]** – [What it does]
  - URL: https://example.com
  - Terms of Service: https://example.com/tos
  - Privacy Policy: https://example.com/privacy

== Development ==

Source code is available at: https://github.com/yourorg/your-plugin

To build from source:
1. `npm install`
2. `npm run build`

The `src/` directory contains all uncompiled source files.
```

---

## Audit Checklist

When auditing an existing readme or plugin submission, check every item:

**Name & Metadata**
- [ ] Plugin name contains no third-party trademarks
- [ ] Plugin name is not keyword-stuffed (no `|` lists, no superlatives)
- [ ] Short description is under 150 chars and factual
- [ ] Tags: 5 or fewer, relevant, not repeating the plugin name
- [ ] Single WordPress.org account owns this plugin (not multiple org accounts)

**Icon & Banner**
- [ ] No WordPress logo (W mark) used
- [ ] No other company's logo/color scheme replicated
- [ ] Icon is original artwork

**Support Section**
- [ ] Free support links to WordPress.org forum FIRST
- [ ] Premium support link is clearly labeled as premium-only

**Technical Sections**
- [ ] All third-party services/libraries disclosed with ToS links
- [ ] Source code / build instructions referenced
- [ ] No duplicate of an existing plugin in the directory

**Prohibited Claims**
- [ ] No "best", "#1", "most powerful", "easiest", "only" claims
- [ ] No fake reviews or sockpuppet accounts referenced
- [ ] No admin access requested in support forums

---

## Step-by-Step: How to Use This Skill

### To GENERATE from Plugin Source Code (new primary workflow):
1. Read all provided source files using the file-reading skill
2. Run the **Code Analysis** from Step 0 above — output the summary first
3. Use the extracted data to fill in every section of the compliant readme template
4. For any information not found in code (e.g. WP.org username, screenshots, donate link), use sensible placeholders and flag them with `[TODO: fill in]`
5. Run the audit checklist before delivering the final readme

### To GENERATE without source code:
1. Ask the user for: plugin name, description, features, WP.org username, external APIs/libraries used
2. Apply the full compliant template
3. Run the audit checklist before delivering

### To AUDIT an existing readme.txt:
1. Read the user's current readme content
2. Go through every item in the Audit Checklist
3. Flag all violations with ⚠️ and explain why it's a problem
4. Offer a corrected version of each violating section

### To FIX a flagged section:
1. Identify which of the 5 violation categories applies
2. Rewrite only the flagged section using the compliant pattern shown above
3. Confirm the fix passes the checklist before returning it

---

## Final Warning Triggers (Avoid At All Costs)

WordPress.org can revoke developer rights permanently for:
1. Plugin duplication (submitting a copy of another existing plugin)
2. Multiple accounts for the same organization
3. Sockpuppeting / fake reviews
4. Repeated trademark abuse after warnings
5. Repeated support forum violations

If the user's plugin has already received a warning, flag this and recommend conservative compliance on every single point before resubmission.