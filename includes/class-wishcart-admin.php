<?php
/**
 * WishCart Admin Class
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://wishcart.com
 */

if ( ! defined('ABSPATH') ) {
	exit;
}

/**
 * WishCart Admin Class handles all admin-related functionality
 *
 * @category Class
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://wishcart.com
 */
class wishcart_Admin {


    private $plugin_slug = 'wishcart';
    private static $instance = null;

    /**
     * Get singleton instance of the class
     *
     * @since 1.0.0
     *
     * @return wishcart_Admin Instance of the class
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    public function __construct() {
        if ( is_admin() ) {
            add_action('admin_menu', [ $this, 'register_admin_menu' ]);
            add_action('admin_enqueue_scripts', [ $this, 'enqueue_admin_scripts' ]);
            add_action('admin_enqueue_scripts', [ $this, 'enqueue_admin_styles' ]);
        }

        add_action('rest_api_init', [ $this, 'wishcart_register_settings_endpoints' ]);
    }
    
    /**
     * Menu Left Style
     */
    public function enqueue_admin_styles( $hook_suffix ) {
        wp_enqueue_style( 
            'wishcart-admin-style', 
            plugin_dir_url( dirname( __FILE__ ) ) . 'assets/css/admin-style.css',
            [],
            WishCart_VERSION
        );

        // Add inline CSS with dynamic URL for trigger icon background image
        $icon_url = WishCart_PLUGIN_URL . 'assets/images/icons/menu-icon-short.svg';
        $inline_css = "
        .wishcart-trigger-icon i {
            background-image: url('" . esc_url( $icon_url ) . "');
        }";

        wp_add_inline_style( 'wishcart-admin-style', $inline_css );
    }

    /**
     * Register admin menu items
     *
     * @since 1.0.0
     *
     * @return void
     */
    public function register_admin_menu() {

        add_menu_page(
            esc_html__( 'WishCart', 'wishcart' ),
            esc_html__( 'WishCart', 'wishcart' ),
            'manage_options',
            $this->plugin_slug,
            [ $this, 'render_settings_page' ],
            plugin_dir_url( dirname( __FILE__ ) ) . 'assets/images/icons/menu-icon-short.svg', 
            30
        );

        // Primary tabs rendered via React SPA
        $subpages = array(
            'settings'       => __( 'Settings', 'wishcart' ),
            'customization'  => __( 'Customization', 'wishcart' ),
            'integrations'   => __( 'Integrations', 'wishcart' ),
            'analytics'      => __( 'Analytics', 'wishcart' ),
            'support'        => __( 'Support', 'wishcart' ),
            'get-pro'        => __( 'Get Pro', 'wishcart' ),
        );

        foreach ( $subpages as $slug_suffix => $label ) {
        add_submenu_page(
            $this->plugin_slug,
                $label,
                $label,
            'manage_options',
                $this->plugin_slug . '-' . $slug_suffix,
            [ $this, 'render_settings_page' ]
        );
        }
    }
    /**
     * Enqueue admin scripts and styles
     *
     * @param string $hook Current admin page hook
     *
     * @since 1.0.0
     *
     * @return void
     */
    public function enqueue_admin_scripts($hook) {
        $allowed_hooks = [
            'toplevel_page_' . $this->plugin_slug,
        ];

        $subpages = [ 'settings', 'customization', 'integrations', 'analytics', 'support', 'get-pro' ];
        foreach ( $subpages as $slug_suffix ) {
            $allowed_hooks[] = $this->plugin_slug . '_page_' . $this->plugin_slug . '-' . $slug_suffix;
        }

        if (!in_array($hook, $allowed_hooks)) {
            return;
        }

        // Load admin-specific assets
        wp_enqueue_media();

        // Register and enqueue admin styles
        wp_register_style(
            'wishcart-admin',
            WishCart_PLUGIN_URL . 'build/admin.css',
            [],
            WishCart_VERSION
        );
        wp_enqueue_style('wishcart-admin');

        // Register and enqueue admin scripts
        wp_register_script(
            'wishcart-admin',
            WishCart_PLUGIN_URL . 'build/admin.js',
            ['wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n'],
            WishCart_VERSION,
            [
                'in_footer' => true,
                'strategy' => 'defer'
            ]
        );
        wp_enqueue_script('wishcart-admin');

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading query parameter, not processing form data
        $requested_page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : $this->plugin_slug . '-settings';
        $page_to_tab = array(
            $this->plugin_slug                     => 'settings',
            $this->plugin_slug . '-settings'       => 'settings',
            $this->plugin_slug . '-customization'  => 'customization',
            $this->plugin_slug . '-integrations'   => 'integrations',
            $this->plugin_slug . '-analytics'      => 'analytics',
            $this->plugin_slug . '-support'        => 'support',
            $this->plugin_slug . '-get-pro'        => 'get-pro',
        );
        $default_tab = isset( $page_to_tab[ $requested_page ] ) ? $page_to_tab[ $requested_page ] : 'settings';

        $tab_to_page = array();
        foreach ( $page_to_tab as $page_slug => $tab_id ) {
            if ( ! isset( $tab_to_page[ $tab_id ] ) ) {
                $tab_to_page[ $tab_id ] = $page_slug;
            }
        }

        wp_localize_script(
            'wishcart-admin',
            'wishcartSettings',
            [
                'apiUrl' => trailingslashit( rest_url( 'wishcart/v1' ) ),
                'nonce' => wp_create_nonce('wp_rest'),
                'pluginUrl' => WishCart_PLUGIN_URL,
                'isFluentCartActive' => WishCart_FluentCart_Helper::is_fluentcart_active(),
                'maxUploadSize' => wp_max_upload_size(),
                'menuSlug' => $this->plugin_slug,
                'defaultTab' => $default_tab,
                'menuTabMap' => $page_to_tab,
                'tabPageMap' => $tab_to_page,
            ]
        );

        $submenu_navigation_js = '(function(){
    if (typeof window === \'undefined\') {
        return;
    }
    window.addEventListener(\'DOMContentLoaded\', function(){
        if (!window.wishcartSettings || !window.wishcartSettings.menuTabMap) {
            return;
        }
        var submenu = document.querySelector(\'#toplevel_page_' . esc_js( $this->plugin_slug ) . ' .wp-submenu\');
        if (!submenu) {
            return;
        }
        function setActiveMenuByPage(pageSlug){
            if (!submenu) {
                return;
            }
            var items = submenu.querySelectorAll(\'li\');
            if (items && items.forEach) {
                items.forEach(function(item){ item.classList.remove(\'current\'); });
            }
            var links = submenu.querySelectorAll(\'a\');
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                try {
                    var url = new URL(link.href, window.location.origin);
                    var linkPage = url.searchParams.get(\'page\') || \'' . esc_js( $this->plugin_slug ) . '-settings\';
                    if (linkPage === pageSlug) {
                        if (link.parentElement) {
                            link.parentElement.classList.add(\'current\');
                        }
                        break;
                    }
                } catch (err) {}
            }
        }
        function setActiveMenuByTab(tabId){
            var map = window.wishcartSettings && window.wishcartSettings.tabPageMap;
            if (!map || !map[tabId]) {
                return;
            }
            setActiveMenuByPage(map[tabId]);
        }
        window.wishcartSetActiveMenu = setActiveMenuByTab;
        setActiveMenuByTab(window.wishcartSettings.defaultTab);
        submenu.addEventListener(\'click\', function(event){
            if (typeof window.wishcartNavigateToTab !== \'function\') {
                return;
            }
            var link = event.target.closest(\'a\');
            if (!link) {
                return;
            }
            try {
                var url = new URL(link.href, window.location.origin);
                var page = url.searchParams.get(\'page\') || \'' . esc_js( $this->plugin_slug ) . '-settings\';
                var tab = window.wishcartSettings.menuTabMap[page];
                if (!tab) {
                    return;
                }
                event.preventDefault();
                window.wishcartNavigateToTab(tab);
                setActiveMenuByPage(page);
            } catch (err) {
                // Fail silently and allow navigation
            }
        });
    });
})();';
        wp_add_inline_script( 'wishcart-admin', $submenu_navigation_js );
        wp_set_script_translations('wishcart-admin', 'wishcart');
    }

    /**
     * Register REST API endpoints for settings
     *
     * @since 1.0.0
     *
     * @return void
     */
    public function wishcart_register_settings_endpoints() {
        register_rest_route(
            'wishcart/v1', '/settings', [
				[
					'methods' => 'GET',
					'callback' => [ $this, 'wishcart_get_settings' ],
					'permission_callback' => function () {
						return current_user_can('manage_options');
					},
				],
				[
					'methods' => 'POST',
					'callback' => [ $this, 'wishcart_update_settings' ],
					'permission_callback' => function () {
						return current_user_can('manage_options');
					},
				],
            ]
        );

        // Pages endpoint for admin UI (used to detect wishlist page with shortcode)
        register_rest_route(
            'wishcart/v1',
            '/pages',
            array(
                'methods'             => 'GET',
                'callback'            => array( $this, 'get_pages_with_wishlist_shortcode' ),
                'permission_callback' => function () {
                    return current_user_can( 'manage_options' );
                },
                'args'                => array(
                    'per_page' => array(
                        'description'       => __( 'Number of pages to return', 'wishcart' ),
                        'type'              => 'integer',
                        'required'          => false,
                        'sanitize_callback' => 'absint',
                    ),
                ),
            )
        );
        register_rest_route(
            'wishcart/v1',
            '/pages/create-wishlist',
            array(
                'methods'             => 'POST',
                'callback'            => array( $this, 'create_wishlist_page_endpoint' ),
                'permission_callback' => function () {
                    return current_user_can( 'manage_options' );
                },
            )
        );
        register_rest_route('wishcart/v1', '/install-fluentcart', array(
            'methods' => 'POST',
            'callback' => array( $this, 'install_fluentcart' ),
            'permission_callback' => function () {
                return current_user_can('activate_plugins');
            },
        ));

        register_rest_route('wishcart/v1', '/check-fluentcart', array(
            'methods' => 'GET',
            'callback' => array( $this, 'check_fluentcart_status' ),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        register_rest_route('wishcart/v1', '/products', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_products'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        // Wishlist endpoints
        register_rest_route('wishcart/v1', '/wishlist/add', array(
            'methods' => 'POST',
            'callback' => array($this, 'wishlist_add'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/wishlist/remove', array(
            'methods' => 'POST',
            'callback' => array($this, 'wishlist_remove'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/wishlist/track-cart', array(
            'methods' => 'POST',
            'callback' => array($this, 'wishlist_track_cart'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/wishlist', array(
            'methods' => 'GET',
            'callback' => array($this, 'wishlist_get'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/wishlist/check/(?P<product_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'wishlist_check'),
            'permission_callback' => '__return_true', // Public endpoint
            'args' => array(
                'product_id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/product/(?P<product_id>\d+)/variants', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_variants'),
            'permission_callback' => '__return_true', // Public endpoint
            'args' => array(
                'product_id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/wishlist/sync', array(
            'methods' => 'POST',
            'callback' => array($this, 'wishlist_sync'),
            'permission_callback' => function () {
                return is_user_logged_in();
            },
        ));

        register_rest_route('wishcart/v1', '/wishlist/users', array(
            'methods' => 'GET',
            'callback' => array($this, 'wishlist_get_users'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        // Guest email endpoints
        register_rest_route('wishcart/v1', '/guest/check-email', array(
            'methods' => 'GET',
            'callback' => array($this, 'guest_check_email'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/guest/update-email', array(
            'methods' => 'POST',
            'callback' => array($this, 'guest_update_email'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        // FluentCRM endpoints
        register_rest_route('wishcart/v1', '/fluentcrm/settings', array(
            'methods' => 'GET',
            'callback' => array($this, 'fluentcrm_get_settings'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        register_rest_route('wishcart/v1', '/fluentcrm/settings', array(
            'methods' => 'POST',
            'callback' => array($this, 'fluentcrm_update_settings'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        register_rest_route('wishcart/v1', '/fluentcrm/tags', array(
            'methods' => 'GET',
            'callback' => array($this, 'fluentcrm_get_tags'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        register_rest_route('wishcart/v1', '/fluentcrm/lists', array(
            'methods' => 'GET',
            'callback' => array($this, 'fluentcrm_get_lists'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        // Campaign endpoints
        register_rest_route('wishcart/v1', '/campaigns', array(
            'methods' => 'GET',
            'callback' => array($this, 'campaigns_get'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'args' => array(
                'trigger_type' => array(
                    'description' => __('Filter campaigns by trigger type', 'wishcart'),
                    'type' => 'string',
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function($param) {
                        if (empty($param)) {
                            return true; // Allow empty/null
                        }
                        $allowed_triggers = array('item_added', 'item_removed', 'price_drop', 'back_in_stock', 'time_based');
                        return in_array($param, $allowed_triggers, true);
                    },
                ),
                'status' => array(
                    'description' => __('Filter campaigns by status', 'wishcart'),
                    'type' => 'string',
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function($param) {
                        if (empty($param)) {
                            return true; // Allow empty/null
                        }
                        $allowed_statuses = array('active', 'paused', 'completed', 'draft');
                        return in_array($param, $allowed_statuses, true);
                    },
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/campaigns', array(
            'methods' => 'POST',
            'callback' => array($this, 'campaigns_create'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        register_rest_route('wishcart/v1', '/campaigns/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'campaigns_get_single'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/campaigns/(?P<id>\d+)', array(
            'methods' => 'PUT',
            'callback' => array($this, 'campaigns_update'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/campaigns/(?P<id>\d+)', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'campaigns_delete'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/campaigns/(?P<id>\d+)/analytics', array(
            'methods' => 'GET',
            'callback' => array($this, 'campaigns_get_analytics'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        // Notification endpoints
        register_rest_route('wishcart/v1', '/notifications/subscribe', array(
            'methods' => 'POST',
            'callback' => array($this, 'notifications_subscribe'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('wishcart/v1', '/notifications', array(
            'methods' => 'GET',
            'callback' => array($this, 'notifications_get'),
            'permission_callback' => function () {
                return is_user_logged_in();
            },
            'args' => array(
                'status' => array(
                    'description' => __('Filter notifications by status', 'wishcart'),
                    'type' => 'string',
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => function($param) {
                        if (empty($param)) {
                            return true; // Allow empty/null
                        }
                        $allowed_statuses = array('pending', 'sent', 'failed', 'cancelled');
                        return in_array($param, $allowed_statuses, true);
                    },
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/notifications/stats', array(
            'methods' => 'GET',
            'callback' => array($this, 'notifications_get_stats'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        // Activity endpoints
        register_rest_route('wishcart/v1', '/activity/wishlist/(?P<wishlist_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'activity_get_wishlist'),
            'permission_callback' => '__return_true',
            'args' => array(
                'wishlist_id' => array(
                    'description' => __('Wishlist ID', 'wishcart'),
                    'type' => 'integer',
                    'required' => true,
                    'sanitize_callback' => 'absint',
                ),
                'limit' => array(
                    'description' => __('Number of activities to return', 'wishcart'),
                    'type' => 'integer',
                    'required' => false,
                    'sanitize_callback' => 'absint',
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param > 0 && $param <= 100;
                    },
                    'default' => 50,
                ),
                'offset' => array(
                    'description' => __('Number of activities to skip', 'wishcart'),
                    'type' => 'integer',
                    'required' => false,
                    'sanitize_callback' => 'absint',
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param >= 0;
                    },
                    'default' => 0,
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/activity/recent', array(
            'methods' => 'GET',
            'callback' => array($this, 'activity_get_recent'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'args' => array(
                'limit' => array(
                    'description' => __('Number of activities to return', 'wishcart'),
                    'type' => 'integer',
                    'required' => false,
                    'sanitize_callback' => 'absint',
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param > 0 && $param <= 100;
                    },
                    'default' => 20,
                ),
                'type' => array(
                    'description' => __('Filter activities by type', 'wishcart'),
                    'type' => 'string',
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));

    }

    public function install_fluentcart() {
        // Include plugin.php for is_plugin_active() checks
        if ( ! function_exists( 'is_plugin_active' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Clear detection cache to ensure we get the latest status
        WishCart_FluentCart_Helper::clear_detection_cache();
        
        // Check current status
        $is_active = WishCart_FluentCart_Helper::is_fluentcart_active();

        // Check if FluentCart is installed but not active
        $possible_paths = [
            'fluent-cart/fluent-cart.php', // WordPress.org version
            'fluentcart/fluentcart.php',
            'fluentcart-pro/fluentcart-pro.php',
        ];
        
        $found_path = null;
        foreach ( $possible_paths as $path ) {
            if ( file_exists( trailingslashit( WP_PLUGIN_DIR ) . $path ) ) {
                $found_path = $path;
                break;
            }
        }

        // If FluentCart is installed but not active, provide activation link
        if ( $found_path && ! $is_active ) {
            return new WP_Error(
                'activation_required',
                sprintf(
                    // translators: %s: Plugin activation URL
                    __(
                        'FluentCart is installed but not activated. Please <a href="%s">activate it</a>, then click "Refresh" to continue.',
                        'wishcart'
                    ),
                    esc_url( wp_nonce_url(
                        admin_url( 'plugins.php?action=activate&plugin=' . urlencode( $found_path ) ),
                        'activate-plugin_' . $found_path
                    ) )
                )
            );
        }

        // If FluentCart is not found, provide installation instructions
        if ( ! $found_path ) {
            $install_url = wp_nonce_url(
                self_admin_url( 'update.php?action=install-plugin&plugin=fluent-cart' ),
                'install-plugin_fluent-cart'
            );
            
            return new WP_Error(
                'not_installed',
                sprintf(
                    // translators: %s: Plugin installation URL
                    __(
                        'FluentCart is not installed. Please <a href="%s">install FluentCart</a> first. WordPress will handle the installation automatically when you activate WishCart if you have the "Requires Plugins" feature enabled.',
                        'wishcart'
                    ),
                    esc_url( $install_url )
                )
            );
        }

        // FluentCart is installed and active
        return array(
            'success' => true,
            'message' => 'FluentCart is installed and activated',
            'isActive' => true,
        );
    }

    /**
     * Check FluentCart status endpoint
     *
     * @return WP_REST_Response
     */
    public function check_fluentcart_status() {
        // Clear cache before checking to ensure fresh status
        WishCart_FluentCart_Helper::clear_detection_cache();
        
        $is_active = WishCart_FluentCart_Helper::is_fluentcart_active();
        
        return rest_ensure_response(array(
            'success' => true,
            'isActive' => $is_active,
            'message' => $is_active ? 'FluentCart is active' : 'FluentCart is not installed or not active',
        ));
    }

    /**
     * Render settings admin page
     *
     * @since 1.0.0
     *
     * @return void
     */
    public function render_settings_page() {
        echo '<div id="wishcart-settings-app"></div>';
    }

    /**
     * Recursively sanitize settings array
     *
     * @param mixed $data Data to sanitize
     * @return mixed Sanitized data
     * @since 1.0.0
     */
    private function sanitize_settings_recursive( $data ) {
        if ( is_array( $data ) ) {
            $sanitized = array();
            foreach ( $data as $key => $value ) {
                // Sanitize array keys
                $sanitized_key = sanitize_key( $key );
                // Recursively sanitize values
                $sanitized[ $sanitized_key ] = $this->sanitize_settings_recursive( $value );
            }
            return $sanitized;
        } elseif ( is_string( $data ) ) {
            // Sanitize strings - use textarea for longer content, text_field for shorter
            // Check if it looks like HTML/CSS (contains tags or CSS properties)
            if ( preg_match( '/<[^>]+>|#[0-9a-f]{3,6}|rgba?\(|url\(/i', $data ) ) {
                // Likely HTML or CSS, use wp_kses_post for HTML or sanitize_textarea_field for CSS
                if ( preg_match( '/<[^>]+>/', $data ) ) {
                    return wp_kses_post( $data );
                } else {
                    // CSS or color values
                    return sanitize_textarea_field( $data );
                }
            } else {
                // Regular text
                return sanitize_text_field( $data );
            }
        } elseif ( is_int( $data ) ) {
            return intval( $data );
        } elseif ( is_float( $data ) ) {
            return floatval( $data );
        } elseif ( is_bool( $data ) ) {
            return (bool) $data;
        } elseif ( is_null( $data ) ) {
            return null;
        } else {
            // For other types (objects, etc.), convert to string and sanitize
            return sanitize_text_field( (string) $data );
        }
    }

    /**
     * Validate and sanitize settings structure
     *
     * @param array $settings Raw settings from request
     * @return array Sanitized and validated settings
     * @since 1.0.0
     */
    private function validate_and_sanitize_settings( $settings ) {
        if ( ! is_array( $settings ) ) {
            return array();
        }

        // Get existing settings to merge with defaults
        $existing_settings = get_option( 'wishcart_settings', array() );
        
        // Recursively sanitize the input
        // $sanitized = $this->sanitize_settings_recursive( $settings );

        // Merge with existing settings to preserve structure
        $merged = wp_parse_args( $settings, $existing_settings );

        // Validate specific fields that need special handling
        if ( isset( $merged['wishlist'] ) && is_array( $merged['wishlist'] ) ) {
            // Validate wishlist_page_id
            if ( isset( $merged['wishlist']['wishlist_page_id'] ) ) {
                $merged['wishlist']['wishlist_page_id'] = absint( $merged['wishlist']['wishlist_page_id'] );
            }
            
            // Validate guest_cookie_expiry
            if ( isset( $merged['wishlist']['guest_cookie_expiry'] ) ) {
                $merged['wishlist']['guest_cookie_expiry'] = absint( $merged['wishlist']['guest_cookie_expiry'] );
                // Ensure reasonable bounds (1-365 days)
                if ( $merged['wishlist']['guest_cookie_expiry'] < 1 ) {
                    $merged['wishlist']['guest_cookie_expiry'] = 1;
                } elseif ( $merged['wishlist']['guest_cookie_expiry'] > 365 ) {
                    $merged['wishlist']['guest_cookie_expiry'] = 365;
                }
            }

            // Validate boolean fields
            $boolean_fields = array( 'enabled', 'shop_page_button', 'product_page_button' );
            foreach ( $boolean_fields as $field ) {
                if ( isset( $merged['wishlist'][ $field ] ) ) {
                    $merged['wishlist'][ $field ] = (bool) $merged['wishlist'][ $field ];
                }
            }

            // Validate button_position
            if ( isset( $merged['wishlist']['button_position'] ) ) {
                $allowed_positions = array( 'top', 'bottom', 'before', 'after', 'custom' );
                if ( ! in_array( $merged['wishlist']['button_position'], $allowed_positions, true ) ) {
                    $merged['wishlist']['button_position'] = 'bottom';
                }
            }
        }

        return $merged;
    }

    /**
     * Get plugin settings
     *
     * @since 1.0.0
     *
     * @return WP_REST_Response
     */
    public function wishcart_get_settings() {
        $settings = get_option('wishcart_settings', []);
        
        // Only create default page if no wishlist_page_id is set
        $existing_page_id = isset( $settings['wishlist']['wishlist_page_id'] ) 
            ? intval( $settings['wishlist']['wishlist_page_id'] ) 
            : 0;
        
        $page_id = $existing_page_id > 0 
            ? $existing_page_id 
            : WishCart_Wishlist_Page::create_wishlist_page();

        $defaults = WishCart_Wishlist_Page::get_default_settings( $page_id );
        $changed  = false;

        if ( ! isset( $settings['wishlist'] ) || ! is_array( $settings['wishlist'] ) ) {
            $settings['wishlist'] = array();
            $changed               = true;
        }

        $merged = wp_parse_args( $settings['wishlist'], $defaults );

        // Only set default page_id if no page is currently selected
        if ( intval( $merged['wishlist_page_id'] ) === 0 ) {
            $merged['wishlist_page_id'] = intval( $page_id );
            $changed = true;
        }

        if ( $settings['wishlist'] !== $merged ) {
            $settings['wishlist'] = $merged;
            $changed               = true;
        }

        if ( $changed ) {
            update_option( 'wishcart_settings', $settings );
        }

        return rest_ensure_response( $settings );
    }

    /**
     * Verify REST API nonce from request header.
     *
     * This helper enforces a fail-early pattern: missing or invalid
     * nonces immediately return a WP_Error that callers should return.
     *
     * @param WP_REST_Request $request Request object.
     *
     * @return true|WP_Error True on success, WP_Error on failure.
     */
    private function verify_rest_nonce( $request ) {
        $nonce = $request->get_header( 'X-WP-Nonce' );

        if ( ! $nonce || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $nonce ) ), 'wp_rest' ) ) {
            return new WP_Error(
                'rest_cookie_invalid_nonce',
                __( 'Cookie nonce is invalid', 'wishcart' ),
                array( 'status' => 403 )
            );
        }

        return true;
    }

    /**
     * Update plugin settings
     *
     * @param WP_REST_Request $request Request object
     *
     * @since 1.0.0
     *
     * @return WP_REST_Response
     */
    public function wishcart_update_settings( $request ) {
        // Verify nonce for CSRF protection.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $raw_settings = $request->get_json_params();

        // Validate and sanitize settings before saving
        $settings = $this->validate_and_sanitize_settings( $raw_settings );

        // Merge with existing settings to preserve structure
        $existing_settings = get_option( 'wishcart_settings', array() );
        $settings = wp_parse_args( $settings, $existing_settings );

        update_option( 'wishcart_settings', $settings );
        return rest_ensure_response( array( 'success' => true ) );
    }

    /**
     * Get products for FluentCart only (used by admin settings UI)
     *
     * @param WP_REST_Request $request Request object
     *
     * @since 1.0.0
     *
     * @return WP_REST_Response
     */
    public function get_products( $request ) {
        $product_post_type = WishCart_FluentCart_Helper::get_product_post_type();

        $search = is_string( $request->get_param( 'search' ) ) ? sanitize_text_field( $request->get_param( 'search' ) ) : '';
        $per_page = intval( $request->get_param( 'per_page' ) );
        if ( $per_page <= 0 || $per_page > 100 ) {
            $per_page = 100;
        }

        // Allow explicit override for debugging (not exposed in UI)
        $forced_type = is_string( $request->get_param( 'post_type' ) ) ? sanitize_key( $request->get_param( 'post_type' ) ) : '';
        $candidates = array_unique( array_filter( [
            $forced_type,
            $product_post_type,
            'fc_product',
            'fluent-products',
            'fluent_product',
            'fluentcart_product',
        ] ) );

        $products = array();

        foreach ( $candidates as $candidate_type ) {
            $args = array(
                'post_type' => array( $candidate_type ),
                'post_status' => 'publish',
                'posts_per_page' => $per_page,
                'orderby' => 'title',
                'order' => 'ASC',
                's' => $search,
                'no_found_rows' => true,
            );

            // Remove empty search to avoid slow queries
            if ( '' === $search ) {
                unset( $args['s'] );
            }

            $query = new WP_Query( $args );

            if ( $query->have_posts() ) {
                while ( $query->have_posts() ) {
                    $query->the_post();
                    $products[] = array(
                        'id' => get_the_ID(),
                        'name' => get_the_title(),
                        'type' => 'product',
                    );
                }
                wp_reset_postdata();
                break; // we found the correct type
            }
            wp_reset_postdata();
        }

        return rest_ensure_response( $products );
    }

    /**
     * Get WordPress pages and flag if they contain the wishlist shortcode
     *
     * Used by the admin settings UI to auto-select the Wishlist page.
     *
     * @param WP_REST_Request $request Request object
     *
     * @return WP_REST_Response
     */
    public function get_pages_with_wishlist_shortcode( $request ) {
        $per_page = absint( $request->get_param( 'per_page' ) );
        if ( $per_page <= 0 || $per_page > 200 ) {
            $per_page = 100;
        }

        $query = new WP_Query(
            array(
                'post_type'      => 'page',
                'post_status'    => 'publish',
                'posts_per_page' => $per_page,
                'orderby'        => 'title',
                'order'          => 'ASC',
                'no_found_rows'  => true,
                'fields'         => 'all',
            )
        );

        $pages = array();

        if ( $query->have_posts() ) {
            foreach ( $query->posts as $page ) {
                $content        = isset( $page->post_content ) ? $page->post_content : '';
                $has_shortcode  = false;

                if ( ! empty( $content ) ) {
                    // Prefer has_shortcode when available
                    if ( function_exists( 'has_shortcode' ) ) {
                        $has_shortcode = has_shortcode( $content, 'wishcart_wishlist' );
                    } else {
                        $has_shortcode = ( false !== strpos( $content, '[wishcart_wishlist' ) );
                    }
                }

                $pages[] = array(
                    'id'            => intval( $page->ID ),
                    'title'         => array(
                        'rendered' => get_the_title( $page ),
                    ),
                    'slug'          => $page->post_name,
                    'has_shortcode' => (bool) $has_shortcode,
                );
            }
        }

        wp_reset_postdata();

        return rest_ensure_response( $pages );
    }

    /**
     * Create wishlist page endpoint
     *
     * Creates a new WordPress page with the [wishcart_wishlist] shortcode
     *
     * @param WP_REST_Request $request Request object
     *
     * @return WP_REST_Response|WP_Error
     */
    public function create_wishlist_page_endpoint( $request ) {
        $params    = $request->get_json_params();
        $page_name = isset( $params['page_name'] ) ? sanitize_text_field( wp_unslash( $params['page_name'] ) ) : '';

        // Validate page name
        if ( empty( $page_name ) ) {
            $page_name = __( 'Wishlist', 'wishcart' );
        }

        // Always create a new page (don't check for existing pages)
        $page_data = array(
            'post_title'   => $page_name,
            'post_content' => '[wishcart_wishlist]',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_name'    => sanitize_title( $page_name ),
        );

        $page_id = wp_insert_post( $page_data );

        if ( is_wp_error( $page_id ) || ! $page_id || $page_id <= 0 ) {
            return new WP_Error(
                'create_failed',
                __( 'Failed to create wishlist page', 'wishcart' ),
                array( 'status' => 500 )
            );
        }

        // Get the created page details
        $page = get_post( $page_id );
        if ( ! $page ) {
            return new WP_Error(
                'page_not_found',
                __( 'Page was created but could not be retrieved', 'wishcart' ),
                array( 'status' => 500 )
            );
        }

        return rest_ensure_response(
            array(
                'success' => true,
                'page_id' => intval( $page_id ),
                'page'    => array(
                    'id'    => intval( $page_id ),
                    'title' => get_the_title( $page_id ),
                    'slug'  => $page->post_name,
                    'url'   => get_permalink( $page_id ),
                ),
                'message' => __( 'Wishlist page created successfully', 'wishcart' ),
            )
        );
    }

    /**
     * Add product to wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_add( $request ) {
        // Enforce REST nonce verification for public write endpoint.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $handler = new WishCart_Wishlist_Handler();
        $params = $request->get_json_params();
        $product_id = isset( $params['product_id'] ) ? intval( $params['product_id'] ) : 0;
        $session_id = isset( $params['session_id'] ) ? sanitize_text_field( wp_unslash( $params['session_id'] ) ) : null;
        $wishlist_id = isset( $params['wishlist_id'] ) ? intval( $params['wishlist_id'] ) : null;
        $guest_email = isset( $params['guest_email'] ) ? sanitize_email( wp_unslash( $params['guest_email'] ) ) : null;
        $variation_id = isset( $params['variation_id'] ) ? intval( $params['variation_id'] ) : 0;
        
        // Prepare options array with guest_email and variation_id if provided
        $options = array();
        if ( ! empty( $guest_email ) && is_email( $guest_email ) ) {
            $options['guest_email'] = $guest_email;
        }
        if ( $variation_id > 0 ) {
            $options['variation_id'] = $variation_id;
        }
        
        // Handler will determine user_id or session_id automatically
        $result = $handler->add_to_wishlist( $product_id, null, $session_id, $wishlist_id, $options );

        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }

        // Get wishlist information to return
        $user_id = is_user_logged_in() ? get_current_user_id() : null;
        $wishlist_info = null;
        
        if ($wishlist_id) {
            $wishlist_info = $handler->get_wishlist($wishlist_id);
        } else {
            // Get default wishlist
            $default_wishlist = $handler->get_default_wishlist($user_id, $session_id);
            if ($default_wishlist) {
                $wishlist_info = $default_wishlist;
            }
        }

        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Product added to wishlist', 'wishcart' ),
            'wishlist' => $wishlist_info,
        ) );
    }

    /**
     * Remove product from wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_remove( $request ) {
        // Enforce REST nonce verification for public write endpoint.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $handler = new WishCart_Wishlist_Handler();
        $params = $request->get_json_params();
        $product_id = isset( $params['product_id'] ) ? intval( $params['product_id'] ) : 0;
        $variation_id = isset( $params['variation_id'] ) ? intval( $params['variation_id'] ) : 0;
        $session_id = isset( $params['session_id'] ) ? sanitize_text_field( wp_unslash( $params['session_id'] ) ) : null;
        $wishlist_id = isset( $params['wishlist_id'] ) ? intval( $params['wishlist_id'] ) : null;
        
        // Handler will determine user_id or session_id automatically
        $result = $handler->remove_from_wishlist( $product_id, null, $session_id, $wishlist_id, $variation_id );

        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }

        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Product removed from wishlist', 'wishcart' ),
        ) );
    }

    /**
     * Track when wishlist item is added to cart
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_track_cart( $request ) {
        // Enforce REST nonce verification for public write endpoint.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        global $wpdb;
        // Pro Feature: Analytics handler tracks wishlist-to-cart conversions and engagement
        // Available in WishCart Pro - provides insights into customer behavior and popular products
        // Gracefully skipped in free version without errors
        $analytics_handler = class_exists('WishCart_Analytics_Handler') ? new WishCart_Analytics_Handler() : null;
        $handler = new WishCart_Wishlist_Handler();
        
        $params = $request->get_json_params();
        $product_id = isset( $params['product_id'] ) ? intval( $params['product_id'] ) : 0;
        $variation_id = isset( $params['variation_id'] ) ? intval( $params['variation_id'] ) : 0;
        
        if ( $product_id <= 0 ) {
            return new WP_Error(
                'invalid_product',
                __( 'Invalid product ID', 'wishcart' ),
                array( 'status' => 400 )
            );
        }
        
        // Pro Feature: Track analytics event for wishlist-to-cart conversions
        // Available in WishCart Pro - provides valuable insights into conversion rates
        // Gracefully skipped in free version without affecting functionality
        if ( $analytics_handler ) {
            $track_result = $analytics_handler->track_event( $product_id, $variation_id, 'cart' );
            // Silently skip if tracking fails - no errors to user (Pro feature)
        }
        
        // Update wishlist item's date_added_to_cart if item exists in wishlist
        $user_id = is_user_logged_in() ? get_current_user_id() : null;
        $session_id = null;
        
        if ( ! $user_id ) {
            // Try to get session_id from cookie or request
            $cookie_name = 'wishcart_session_id';
            if ( isset( $_COOKIE[ $cookie_name ] ) && ! empty( $_COOKIE[ $cookie_name ] ) ) {
                $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ $cookie_name ] ) );
            } elseif ( isset( $params['session_id'] ) ) {
                $session_id = sanitize_text_field( wp_unslash( $params['session_id'] ) );
            }
        }
        
        // Only update wishlist items if we have user_id or session_id
        if ( $user_id || $session_id ) {
            // Find wishlist items for this product
            $items_table = $wpdb->prefix . 'wc_wishlist_items';
            $wishlists_table = $wpdb->prefix . 'wc_wishlists';
            
            $where_clauses = array();
            $where_values = array();
            
            $where_clauses[] = "wi.product_id = %d";
            $where_values[] = $product_id;
            
            if ( $variation_id > 0 ) {
                $where_clauses[] = "wi.variation_id = %d";
                $where_values[] = $variation_id;
            } else {
                $where_clauses[] = "(wi.variation_id = 0 OR wi.variation_id IS NULL)";
            }
            
            $where_clauses[] = "wi.status = 'active'";
            $where_clauses[] = "wi.date_added_to_cart IS NULL";
            
            if ( $user_id ) {
                $where_clauses[] = "w.user_id = %d";
                $where_values[] = $user_id;
            } elseif ( $session_id ) {
                $where_clauses[] = "w.session_id = %s";
                $where_values[] = $session_id;
            }
            
            $where_sql = implode( ' AND ', $where_clauses );
            
            // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
            $query = $wpdb->prepare(
                "UPDATE {$items_table} wi
                INNER JOIN {$wishlists_table} w ON wi.wishlist_id = w.id
                SET wi.date_added_to_cart = NOW()
                WHERE {$where_sql}",
                $where_values
            );
            // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
            
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
            $wpdb->query( $query );
        }
        
        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Cart event tracked successfully', 'wishcart' ),
        ) );
    }

    /**
     * Get user's wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_get( $request ) {
        global $wpdb;
        $handler = new WishCart_Wishlist_Handler();
        $session_id = $request->get_param( 'session_id' );
        $session_id = is_string( $session_id ) ? sanitize_text_field( wp_unslash( $session_id ) ) : null;
        
        // If session_id not provided in query, try to read from cookie
        if ( empty( $session_id ) && ! is_user_logged_in() ) {
            $cookie_name = 'wishcart_session_id';
            if ( isset( $_COOKIE[ $cookie_name ] ) && ! empty( $_COOKIE[ $cookie_name ] ) ) {
                $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ $cookie_name ] ) );
            }
        }
        
        // Check for wishlist_id
        $wishlist_id = $request->get_param( 'wishlist_id' );
        $wishlist_id = ! empty( $wishlist_id ) ? intval( $wishlist_id ) : null;
        
        // Check if user_id is provided (for viewing other users' wishlists)
        $requested_user_id = $request->get_param( 'user_id' );
        $requested_user_id = ! empty( $requested_user_id ) ? intval( $requested_user_id ) : null;
        
        $wishlist_items = array();
        $current_wishlist = null;
        
        // If wishlist_id is provided, fetch that wishlist's items
        if ( $wishlist_id ) {
            $items_table = $wpdb->prefix . 'wc_wishlist_items';
            
            // Check cache first
            $cache_key = 'wishcart_items_' . $wishlist_id;
            $cached = wp_cache_get( $cache_key, 'wishcart_wishlist' );
            
            if ( false !== $cached ) {
                $results = $cached;
            } else {
                // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                $results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                    $wpdb->prepare(
                        "SELECT product_id, variation_id, date_added FROM {$items_table} WHERE wishlist_id = %d AND status = 'active' ORDER BY position ASC, date_added DESC",
                        $wishlist_id
                    ),
                    ARRAY_A
                );
                // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                
                // Cache for 5 minutes
                wp_cache_set( $cache_key, $results, 'wishcart_wishlist', 300 );
            }
            
            if ( $results ) {
                foreach ( $results as $row ) {
                    $wishlist_items[] = array(
                        'product_id' => intval( $row['product_id'] ),
                        'variation_id' => isset( $row['variation_id'] ) ? intval( $row['variation_id'] ) : 0,
                        'created_at' => $row['date_added'],
                    );
                }
            }
            
            // Get wishlist info
            $current_wishlist = $handler->get_wishlist( $wishlist_id );
        } elseif ( $requested_user_id ) {
            // If user_id is provided, get that user's default wishlist and fetch its items
            $user_default_wishlist = $handler->get_default_wishlist( $requested_user_id, null );
            if ( $user_default_wishlist && isset( $user_default_wishlist['id'] ) ) {
                $items_table = $wpdb->prefix . 'wc_wishlist_items';
                
                // Check cache first
                $cache_key = 'wishcart_items_user_' . $requested_user_id;
                $cached = wp_cache_get( $cache_key, 'wishcart_wishlist' );
                
                if ( false !== $cached ) {
                    $results = $cached;
                } else {
                    // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                    $results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                        $wpdb->prepare(
                            "SELECT product_id, variation_id, date_added FROM {$items_table} WHERE wishlist_id = %d AND status = 'active' ORDER BY position ASC, date_added DESC",
                            $user_default_wishlist['id']
                        ),
                        ARRAY_A
                    );
                    // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                    
                    // Cache for 5 minutes
                    wp_cache_set( $cache_key, $results, 'wishcart_wishlist', 300 );
                }
                
                if ( $results ) {
                    foreach ( $results as $row ) {
                        $wishlist_items[] = array(
                            'product_id' => intval( $row['product_id'] ),
                            'variation_id' => isset( $row['variation_id'] ) ? intval( $row['variation_id'] ) : 0,
                            'created_at' => $row['date_added'],
                        );
                    }
                }
                
                // Set current wishlist for response
                if ( ! $current_wishlist ) {
                    $current_wishlist = $user_default_wishlist;
                }
            }
        } else {
            // Get default wishlist for current user/session
            $default_wishlist = $handler->get_default_wishlist( null, $session_id );
            if ( $default_wishlist ) {
                $wishlist_id = $default_wishlist['id'];
                $current_wishlist = $default_wishlist;
                
                $items_table = $wpdb->prefix . 'wc_wishlist_items';
                
                // Determine cache key based on user or session
                $user_id = is_user_logged_in() ? get_current_user_id() : null;
                if ( $user_id ) {
                    $cache_key = 'wishcart_items_user_' . $user_id;
                } else {
                    $cache_key = 'wishcart_items_session_' . md5( $session_id );
                }
                
                // Check cache first
                $cached = wp_cache_get( $cache_key, 'wishcart_wishlist' );
                
                if ( false !== $cached ) {
                    $results = $cached;
                } else {
                    // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                    $results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                        $wpdb->prepare(
                            "SELECT product_id, variation_id, date_added FROM {$items_table} WHERE wishlist_id = %d AND status = 'active' ORDER BY position ASC, date_added DESC",
                            $wishlist_id
                        ),
                        ARRAY_A
                    );
                    // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                    
                    // Cache for 5 minutes
                    wp_cache_set( $cache_key, $results, 'wishcart_wishlist', 300 );
                }
                
                if ( $results ) {
                    foreach ( $results as $row ) {
                        $wishlist_items[] = array(
                            'product_id' => intval( $row['product_id'] ),
                            'variation_id' => isset( $row['variation_id'] ) ? intval( $row['variation_id'] ) : 0,
                            'created_at' => $row['date_added'],
                        );
                    }
                }
            } else {
                // Fallback to old method for backward compatibility
                $wishlist_items = $handler->get_user_wishlist_with_dates( null, $session_id );
            }
        }

        // Get product details
        $products = array();
        foreach ( $wishlist_items as $item ) {
            $product_id = $item['product_id'];
            $variation_id = isset( $item['variation_id'] ) ? intval( $item['variation_id'] ) : 0;
            $created_at = $item['created_at'];
            
            $product = WishCart_FluentCart_Helper::get_product( $product_id );
            if ( $product ) {
                $image_id = $product->get_image_id();
                $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';
                
                // Format date added
                $date_added = '';
                if ( $created_at ) {
                    $date_obj = new DateTime( $created_at );
                    $date_added = $date_obj->format( 'F j, Y' ); // Format: "November 16, 2025"
                }
                
                // Get product price (use variation price if variation exists)
                $price = $product->get_price();
                $regular_price = $product->get_regular_price();
                $sale_price = $product->get_sale_price();
                $is_on_sale = $product->is_on_sale();
                $variation_name = '';
                
                // If variation exists, get variation details
                if ( $variation_id > 0 ) {
                    $variation = WishCart_FluentCart_Helper::get_product( $variation_id );
                    if ( $variation ) {
                        $price = $variation->get_price();
                        $regular_price = $variation->get_regular_price();
                        $sale_price = $variation->get_sale_price();
                        $is_on_sale = $variation->is_on_sale();
                        $variation_name = $variation->get_name();
                    }
                }
                
                // Get available variants for this product
                $variants = array();
                if ( method_exists( $product, 'get_variants' ) || class_exists( 'WishCart_FluentCart_Product' ) ) {
                    // Try to get variants using reflection or helper
                    global $wpdb;
                    $variants_table = $wpdb->prefix . 'fct_product_variations';
                    
                    // Check cache for table existence
                    $table_cache_key = 'wishcart_table_exists_' . $variants_table;
                    $table_exists = wp_cache_get( $table_cache_key, 'wishcart_system' );
                    
                    if ( false === $table_exists ) {
                        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                        $table_exists = ( $wpdb->get_var( "SHOW TABLES LIKE '" . esc_sql( $variants_table ) . "'" ) === $variants_table );
                        // Cache for 1 hour (table structure rarely changes)
                        wp_cache_set( $table_cache_key, $table_exists, 'wishcart_system', 3600 );
                    }
                    
                    if ( $table_exists ) {
                        // Check cache first
                        $variants_cache_key = 'wishcart_variants_' . $product_id;
                        $cached_variants = wp_cache_get( $variants_cache_key, 'wishcart_variants' );
                        
                        if ( false !== $cached_variants ) {
                            $variants_data = $cached_variants;
                        } else {
                            // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                            $variants_data = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                                $wpdb->prepare(
                                    "SELECT id, item_price, compare_price, stock_status FROM {$variants_table} WHERE post_id = %d ORDER BY serial_index ASC",
                                    $product_id
                                ),
                                ARRAY_A
                            );
                            // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                            
                            // Cache for 5 minutes
                            wp_cache_set( $variants_cache_key, $variants_data, 'wishcart_variants', 300 );
                        }
                        
                        foreach ( $variants_data as $variant_data ) {
                            $variant_price = isset( $variant_data['item_price'] ) ? $variant_data['item_price'] / 100 : 0;
                            $variant_regular_price = isset( $variant_data['compare_price'] ) && $variant_data['compare_price'] > 0 ? $variant_data['compare_price'] / 100 : $variant_price;
                            
                            // Variant name/title is not available in the database table, use empty string
                            // The variant can be identified by its ID, and the product name is already available
                            $variants[] = array(
                                'id' => intval( $variant_data['id'] ),
                                'variation_id' => intval( $variant_data['id'] ),
                                'name' => '',
                                'title' => '',
                                'price' => $variant_price,
                                'regular_price' => $variant_regular_price,
                                'item_price' => $variant_data['item_price'],
                                'compare_price' => isset( $variant_data['compare_price'] ) ? $variant_data['compare_price'] : 0,
                                'stock_status' => isset( $variant_data['stock_status'] ) ? $variant_data['stock_status'] : 'in-stock',
                            );
                        }
                    }
                }
                
                $products[] = array(
                    'id' => $product_id,
                    'name' => $product->get_name(),
                    'price' => $price,
                    'regular_price' => $regular_price,
                    'sale_price' => $sale_price,
                    'is_on_sale' => $is_on_sale,
                    'image_url' => $image_url,
                    'permalink' => get_permalink( $product_id ),
                    'stock_status' => $product->get_stock_status(),
                    'date_added' => $date_added,
                    'variation_id' => $variation_id,
                    'variation_name' => $variation_name,
                    'variants' => $variants,
                );
            }
        }

        $response_data = array(
            'success' => true,
            'products' => $products,
            'count' => count( $products ),
        );

        // Include wishlist info if available
        if ( $current_wishlist ) {
            $response_data['wishlist'] = $current_wishlist;
        }

        return rest_ensure_response( $response_data );
    }

    /**
     * Check if product is in wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_check( $request ) {
        $handler = new WishCart_Wishlist_Handler();
        $product_id = intval( $request->get_param( 'product_id' ) );
        $variation_id = intval( $request->get_param( 'variation_id' ) );
        $session_id = $request->get_param( 'session_id' );
        $session_id = is_string( $session_id ) ? sanitize_text_field( wp_unslash( $session_id ) ) : null;
        
        // Handler will determine user_id or session_id automatically
        $is_in_wishlist = $handler->is_in_wishlist( $product_id, null, $session_id, $variation_id );

        return rest_ensure_response( array(
            'success' => true,
            'in_wishlist' => $is_in_wishlist,
        ) );
    }

    /**
     * Get product variants
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function get_product_variants( $request ) {
        $product_id = intval( $request->get_param( 'product_id' ) );
        
        if ( $product_id <= 0 ) {
            return new WP_Error(
                'invalid_product_id',
                __( 'Invalid product ID', 'wishcart' ),
                array( 'status' => 400 )
            );
        }

        // Check cache first
        $cache_key = 'wishcart_variants_' . $product_id;
        $cached = get_transient( $cache_key );
        
        if ( $cached !== false ) {
            // Return cached response
            return rest_ensure_response( $cached );
        }

        $product = WishCart_FluentCart_Helper::get_product( $product_id );
        if ( ! $product ) {
            return new WP_Error(
                'product_not_found',
                __( 'Product not found', 'wishcart' ),
                array( 'status' => 404 )
            );
        }

        // Get variants using reflection to access private method
        $reflection = new ReflectionClass( $product );
        $get_variants_method = $reflection->getMethod( 'get_variants' );
        $get_variants_method->setAccessible( true );
        $variants_data = $get_variants_method->invoke( $product );

        if ( ! $variants_data || ! is_array( $variants_data ) ) {
            $response_data = array(
                'success' => true,
                'variants' => array(),
            );
            // Cache empty result for 1 hour
            set_transient( $cache_key, $response_data, HOUR_IN_SECONDS );
            return rest_ensure_response( $response_data );
        }

        // Format variants for response
        $variants = array();
        foreach ( $variants_data as $variant ) {
            $variant_id = isset( $variant['id'] ) ? intval( $variant['id'] ) : ( isset( $variant['ID'] ) ? intval( $variant['ID'] ) : 0 );
            $item_price = isset( $variant['item_price'] ) ? $variant['item_price'] : 0;
            $compare_price = isset( $variant['compare_price'] ) ? $variant['compare_price'] : 0;
            
            $variants[] = array(
                'id' => $variant_id,
                'variation_id' => $variant_id,
                'name' => isset( $variant['title'] ) ? $variant['title'] : ( isset( $variant['name'] ) ? $variant['name'] : '' ),
                'title' => isset( $variant['title'] ) ? $variant['title'] : ( isset( $variant['name'] ) ? $variant['name'] : '' ),
                'price' => $item_price ? $item_price / 100 : 0,
                'regular_price' => $compare_price && $compare_price > 0 ? $compare_price / 100 : ( $item_price ? $item_price / 100 : 0 ),
                'item_price' => $item_price,
                'compare_price' => $compare_price,
                'stock_status' => isset( $variant['stock_status'] ) ? $variant['stock_status'] : 'in-stock',
            );
        }

        $response_data = array(
            'success' => true,
            'variants' => $variants,
        );

        // Cache the response for 1 hour (variants don't change frequently)
        set_transient( $cache_key, $response_data, HOUR_IN_SECONDS );

        return rest_ensure_response( $response_data );
    }

    /**
     * Sync guest wishlist to user account
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_sync( $request ) {
        if ( ! is_user_logged_in() ) {
            return new WP_Error(
                'not_logged_in',
                __( 'User must be logged in', 'wishcart' ),
                array( 'status' => 401 )
            );
        }

        // Verify REST nonce after authentication check.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $handler = new WishCart_Wishlist_Handler();
        $params = $request->get_json_params();
        $session_id = isset( $params['session_id'] ) ? sanitize_text_field( wp_unslash( $params['session_id'] ) ) : null;
        $user_id = get_current_user_id();

        if ( empty( $session_id ) ) {
            return new WP_Error(
                'missing_session_id',
                __( 'Session ID is required', 'wishcart' ),
                array( 'status' => 400 )
            );
        }

        $result = $handler->sync_guest_wishlist_to_user( $session_id, $user_id );

        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }

        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Wishlist synced successfully', 'wishcart' ),
        ) );
    }

    /**
     * Get list of users with wishlist items
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlist_get_users( $request ) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'WishCart_Wishlist';
        
        // Check cache first
        $cache_key = 'wishcart_users_list';
        $cached = wp_cache_get( $cache_key, 'wishcart_users' );
        
        if ( false !== $cached ) {
            $user_ids = $cached;
        } else {
            // Get distinct user IDs that have wishlist items (excluding NULL and session-based entries)
            // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
            $user_ids = $wpdb->get_results(
                "SELECT DISTINCT user_id, COUNT(*) as wishlist_count 
                 FROM {$table_name} 
                 WHERE user_id IS NOT NULL 
                 GROUP BY user_id 
                 ORDER BY wishlist_count DESC",
                ARRAY_A
            );
            // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
            
            // Cache for 15 minutes
            wp_cache_set( $cache_key, $user_ids, 'wishcart_users', 900 );
        }

        $users = array();
        foreach ( $user_ids as $row ) {
            $user_id = intval( $row['user_id'] );
            $user = get_userdata( $user_id );
            
            if ( $user ) {
                $users[] = array(
                    'id' => $user_id,
                    'name' => $user->display_name,
                    'wishlist_count' => intval( $row['wishlist_count'] ),
                );
            }
        }

        return rest_ensure_response( array(
            'success' => true,
            'users' => $users,
            'count' => count( $users ),
        ) );
    }

    /**
     * Subscribe to notifications
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function notifications_subscribe($request) {
        // Enforce REST nonce verification for public write endpoint.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $notifications = new wishcart_Notifications_Handler();
        $params = $request->get_json_params();
        
        $notification_type = isset($params['notification_type']) ? sanitize_text_field(wp_unslash($params['notification_type'])) : '';
        $email_to = isset($params['email']) ? sanitize_email(wp_unslash($params['email'])) : '';
        
        $data = array(
            'product_id' => isset($params['product_id']) ? intval($params['product_id']) : null,
            'wishlist_id' => isset($params['wishlist_id']) ? intval($params['wishlist_id']) : null,
            'user_id' => is_user_logged_in() ? get_current_user_id() : null,
        );
        
        $result = $notifications->queue_notification($notification_type, $email_to, $data);
        
        if (is_wp_error($result)) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array('status' => 400)
            );
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Subscription created', 'wishcart'),
            'notification_id' => $result,
        ));
    }

    /**
     * Get user notifications
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function notifications_get($request) {
        if (!is_user_logged_in()) {
            return new WP_Error('not_logged_in', __('User must be logged in', 'wishcart'), array('status' => 401));
        }
        
        $notifications = new wishcart_Notifications_Handler();
        $user_id = get_current_user_id();
        $status = $request->get_param('status');
        
        // Sanitize status parameter
        if ($status) {
            $status = sanitize_text_field($status);
            // Validate against allowed values if needed
            $allowed_statuses = array('pending', 'sent', 'failed', 'cancelled');
            if (!in_array($status, $allowed_statuses, true)) {
                $status = null; // Use null if invalid
            }
        }
        
        $user_notifications = $notifications->get_user_notifications($user_id, $status);
        
        return rest_ensure_response(array(
            'success' => true,
            'notifications' => $user_notifications,
            'count' => count($user_notifications),
        ));
    }

    /**
     * Get notification statistics
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function notifications_get_stats($request) {
        $notifications = new wishcart_Notifications_Handler();
        $stats = $notifications->get_statistics();
        
        return rest_ensure_response(array(
            'success' => true,
            'stats' => $stats,
        ));
    }

    /**
     * Get wishlist activity
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function activity_get_wishlist($request) {
        $logger = new wishcart_Activity_Logger();
        $wishlist_id = intval($request->get_param('wishlist_id'));
        $limit = $request->get_param('limit') ? intval($request->get_param('limit')) : 50;
        $offset = $request->get_param('offset') ? intval($request->get_param('offset')) : 0;
        
        $activities = $logger->get_wishlist_activities($wishlist_id, $limit, $offset);
        
        return rest_ensure_response(array(
            'success' => true,
            'activities' => $activities,
            'count' => count($activities),
        ));
    }

    /**
     * Get recent activities
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function activity_get_recent($request) {
        $logger = new wishcart_Activity_Logger();
        $limit = $request->get_param('limit') ? intval($request->get_param('limit')) : 20;
        $activity_type = $request->get_param('type');
        
        // Sanitize activity_type parameter
        if ($activity_type) {
            $activity_type = sanitize_text_field($activity_type);
        }
        
        $activities = $logger->get_recent_activities($limit, $activity_type);
        
        return rest_ensure_response(array(
            'success' => true,
            'activities' => $activities,
            'count' => count($activities),
        ));
    }

    /**
     * Get FluentCRM settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function fluentcrm_get_settings($request) {
        if (!class_exists('WishCart_FluentCRM_Integration')) {
            return new WP_Error('not_available', __('FluentCRM integration not available', 'wishcart'), array('status' => 404));
        }

        // Clear cache to force fresh detection
        WishCart_FluentCRM_Integration::clear_detection_cache();
        
        $fluentcrm = new WishCart_FluentCRM_Integration();
        $settings = $fluentcrm->get_settings();
        $is_available = $fluentcrm->is_available();

        return rest_ensure_response(array(
            'success' => true,
            'settings' => $settings,
            'is_available' => $is_available,
        ));
    }

    /**
     * Update FluentCRM settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function fluentcrm_update_settings($request) {
        if (!class_exists('WishCart_FluentCRM_Integration')) {
            return new WP_Error('not_available', __('FluentCRM integration not available', 'wishcart'), array('status' => 404));
        }

        // Verify REST nonce after integration availability check.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $fluentcrm = new WishCart_FluentCRM_Integration();
        $raw_params = $request->get_json_params();
        
        // Sanitize params before passing to handler
        $params = $this->sanitize_settings_recursive($raw_params);
        
        // Validate required structure
        if (!is_array($params)) {
            return new WP_Error('invalid_params', __('Invalid parameters provided', 'wishcart'), array('status' => 400));
        }
        
        $result = $fluentcrm->update_settings($params);

        if (!$result) {
            return new WP_Error('update_failed', __('Failed to update settings', 'wishcart'), array('status' => 500));
        }

        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Settings updated successfully', 'wishcart'),
        ));
    }

    /**
     * Get FluentCRM tags
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function fluentcrm_get_tags($request) {
        if (!class_exists('WishCart_FluentCRM_Integration')) {
            return new WP_Error('not_available', __('FluentCRM integration not available', 'wishcart'), array('status' => 404));
        }

        $fluentcrm = new WishCart_FluentCRM_Integration();
        $tags = $fluentcrm->get_tags();

        return rest_ensure_response(array(
            'success' => true,
            'tags' => $tags,
        ));
    }

    /**
     * Get FluentCRM lists
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function fluentcrm_get_lists($request) {
        if (!class_exists('WishCart_FluentCRM_Integration')) {
            return new WP_Error('not_available', __('FluentCRM integration not available', 'wishcart'), array('status' => 404));
        }

        $fluentcrm = new WishCart_FluentCRM_Integration();
        $lists = $fluentcrm->get_lists();

        return rest_ensure_response(array(
            'success' => true,
            'lists' => $lists,
        ));
    }

    /**
     * Get campaigns
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function campaigns_get($request) {
        if (!class_exists('wishcart_CRM_Campaign_Handler')) {
            return new WP_Error('not_available', __('Campaign handler not available', 'wishcart'), array('status' => 404));
        }

        $campaign_handler = new wishcart_CRM_Campaign_Handler();
        $trigger_type = $request->get_param('trigger_type');
        $status = $request->get_param('status');

        // Sanitize trigger_type parameter
        if ($trigger_type) {
            $trigger_type = sanitize_text_field($trigger_type);
            // Validate against allowed values
            $allowed_triggers = array('item_added', 'item_removed', 'price_drop', 'back_in_stock', 'time_based');
            if (!in_array($trigger_type, $allowed_triggers, true)) {
                $trigger_type = null; // Use null if invalid
            }
        }

        // Sanitize status parameter
        if ($status) {
            $status = sanitize_text_field($status);
            // Validate against allowed values
            $allowed_statuses = array('active', 'paused', 'completed', 'draft');
            if (!in_array($status, $allowed_statuses, true)) {
                $status = null; // Use null if invalid
            }
        }

        if ($trigger_type) {
            $campaigns = $campaign_handler->get_campaigns_by_trigger($trigger_type, $status);
        } else {
            global $wpdb;
            $table = $wpdb->prefix . 'wc_wishlist_crm_campaigns';
            
            // Determine cache key based on status
            $cache_key = $status ? 'wishcart_campaigns_' . $status : 'wishcart_campaigns_all';
            $cached = wp_cache_get( $cache_key, 'wishcart_campaigns' );
            
            if ( false !== $cached ) {
                $campaigns = $cached;
            } else {
                $where = '1=1';
                $params = array();

                if ($status) {
                    $where .= ' AND status = %s';
                    $params[] = $status;
                }

                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name cannot be prepared.
                $query = "SELECT * FROM {$table} WHERE {$where} ORDER BY date_created DESC";
                // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
                $campaigns = $wpdb->get_results(
                    // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Query is prepared on next line, table name must be interpolated.
                    $wpdb->prepare($query, $params),
                    ARRAY_A
                );
                // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter

                foreach ($campaigns as &$campaign) {
                    $campaign['trigger_conditions'] = json_decode($campaign['trigger_conditions'], true);
                    $campaign['email_sequence'] = json_decode($campaign['email_sequence'], true);
                    $campaign['target_segment'] = json_decode($campaign['target_segment'], true);
                    $campaign['stats'] = json_decode($campaign['stats'], true);
                }
                
                // Cache for 5 minutes
                wp_cache_set( $cache_key, $campaigns, 'wishcart_campaigns', 300 );
            }
        }

        return rest_ensure_response(array(
            'success' => true,
            'campaigns' => $campaigns,
            'count' => count($campaigns),
        ));
    }

    /**
     * Create campaign
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function campaigns_create($request) {
        if (!class_exists('wishcart_CRM_Campaign_Handler')) {
            return new WP_Error('not_available', __('Campaign handler not available', 'wishcart'), array('status' => 404));
        }

        // Verify REST nonce after campaign handler availability check.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $campaign_handler = new wishcart_CRM_Campaign_Handler();
        $raw_params = $request->get_json_params();

        // Validate input structure
        if (!is_array($raw_params)) {
            return new WP_Error('invalid_params', __('Invalid parameters provided', 'wishcart'), array('status' => 400));
        }

        // Sanitize params before passing to handler
        $params = $this->sanitize_settings_recursive($raw_params);

        // Validate required fields
        if (empty($params['wishlist_trigger_type'])) {
            return new WP_Error('missing_field', __('Missing required field: wishlist_trigger_type', 'wishcart'), array('status' => 400));
        }

        if (empty($params['status'])) {
            return new WP_Error('missing_field', __('Missing required field: status', 'wishcart'), array('status' => 400));
        }

        // Validate status value
        $allowed_statuses = array('active', 'paused', 'completed', 'draft');
        if (!in_array($params['status'], $allowed_statuses, true)) {
            return new WP_Error('invalid_status', __('Invalid status value', 'wishcart'), array('status' => 400));
        }

        // Validate trigger_type if provided
        $allowed_triggers = array('item_added', 'item_removed', 'price_drop', 'back_in_stock', 'time_based');
        if (!in_array($params['wishlist_trigger_type'], $allowed_triggers, true)) {
            return new WP_Error('invalid_trigger', __('Invalid trigger type', 'wishcart'), array('status' => 400));
        }

        $result = $campaign_handler->create_campaign($params);

        if (is_wp_error($result)) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array('status' => 400)
            );
        }

        return rest_ensure_response(array(
            'success' => true,
            'campaign_id' => $result,
            'message' => __('Campaign created successfully', 'wishcart'),
        ));
    }

    /**
     * Get single campaign
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function campaigns_get_single($request) {
        if (!class_exists('wishcart_CRM_Campaign_Handler')) {
            return new WP_Error('not_available', __('Campaign handler not available', 'wishcart'), array('status' => 404));
        }

        $campaign_handler = new wishcart_CRM_Campaign_Handler();
        $campaign_id = intval($request->get_param('id'));

        $campaign = $campaign_handler->get_campaign($campaign_id);

        if (!$campaign) {
            return new WP_Error('not_found', __('Campaign not found', 'wishcart'), array('status' => 404));
        }

        return rest_ensure_response(array(
            'success' => true,
            'campaign' => $campaign,
        ));
    }

    /**
     * Update campaign
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function campaigns_update($request) {
        if (!class_exists('wishcart_CRM_Campaign_Handler')) {
            return new WP_Error('not_available', __('Campaign handler not available', 'wishcart'), array('status' => 404));
        }

        // Verify REST nonce after campaign handler availability check.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $campaign_handler = new wishcart_CRM_Campaign_Handler();
        $campaign_id = intval($request->get_param('id'));
        $raw_params = $request->get_json_params();

        // Validate campaign ID
        if ($campaign_id <= 0) {
            return new WP_Error('invalid_id', __('Invalid campaign ID', 'wishcart'), array('status' => 400));
        }

        // Validate input structure
        if (!is_array($raw_params)) {
            return new WP_Error('invalid_params', __('Invalid parameters provided', 'wishcart'), array('status' => 400));
        }

        // Sanitize params before passing to handler
        $params = $this->sanitize_settings_recursive($raw_params);

        // Validate status if provided
        if (isset($params['status'])) {
            $allowed_statuses = array('active', 'paused', 'completed', 'draft');
            if (!in_array($params['status'], $allowed_statuses, true)) {
                return new WP_Error('invalid_status', __('Invalid status value', 'wishcart'), array('status' => 400));
            }
        }

        // Validate trigger_type if provided
        if (isset($params['wishlist_trigger_type'])) {
            $allowed_triggers = array('item_added', 'item_removed', 'price_drop', 'back_in_stock', 'time_based');
            if (!in_array($params['wishlist_trigger_type'], $allowed_triggers, true)) {
                return new WP_Error('invalid_trigger', __('Invalid trigger type', 'wishcart'), array('status' => 400));
            }
        }

        $result = $campaign_handler->update_campaign($campaign_id, $params);

        if (is_wp_error($result)) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array('status' => 400)
            );
        }

        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Campaign updated successfully', 'wishcart'),
        ));
    }

    /**
     * Delete campaign
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function campaigns_delete($request) {
        if (!class_exists('wishcart_CRM_Campaign_Handler')) {
            return new WP_Error('not_available', __('Campaign handler not available', 'wishcart'), array('status' => 404));
        }

        // Verify REST nonce after campaign handler availability check.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $campaign_id = intval($request->get_param('id'));
        global $wpdb;
        $table = $wpdb->prefix . 'wc_wishlist_crm_campaigns';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
        $result = $wpdb->delete($table, array('campaign_id' => $campaign_id), array('%d'));

        if (false === $result) {
            return new WP_Error('delete_failed', __('Failed to delete campaign', 'wishcart'), array('status' => 500));
        }
        
        // Clear campaign cache after deletion
        wp_cache_delete('wishcart_campaigns_all', 'wishcart_campaigns');
        wp_cache_delete('wishcart_campaigns_active', 'wishcart_campaigns');
        wp_cache_delete('wishcart_campaigns_paused', 'wishcart_campaigns');
        wp_cache_delete('wishcart_campaigns_completed', 'wishcart_campaigns');

        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Campaign deleted successfully', 'wishcart'),
        ));
    }

    /**
     * Get campaign analytics
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function campaigns_get_analytics($request) {
        if (!class_exists('wishcart_CRM_Campaign_Handler')) {
            return new WP_Error('not_available', __('Campaign handler not available', 'wishcart'), array('status' => 404));
        }

        $campaign_handler = new wishcart_CRM_Campaign_Handler();
        $campaign_id = intval($request->get_param('id'));

        $campaign = $campaign_handler->get_campaign($campaign_id);

        if (!$campaign) {
            return new WP_Error('not_found', __('Campaign not found', 'wishcart'), array('status' => 404));
        }

        $stats = $campaign['stats'] ? $campaign['stats'] : array();

        return rest_ensure_response(array(
            'success' => true,
            'analytics' => $stats,
            'campaign' => array(
                'id' => $campaign['campaign_id'],
                'trigger_type' => $campaign['wishlist_trigger_type'],
                'status' => $campaign['status'],
            ),
        ));
    }

    /**
     * Check if guest has email
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function guest_check_email( $request ) {
        $session_id = $request->get_param( 'session_id' );
        $session_id = is_string( $session_id ) ? sanitize_text_field( wp_unslash( $session_id ) ) : null;

        if ( empty( $session_id ) ) {
            return rest_ensure_response( array(
                'has_email' => false,
                'email' => null,
            ) );
        }

        $guest_handler = new wishcart_Guest_Handler();
        $guest = $guest_handler->get_guest_by_session( $session_id );

        if ( $guest && ! empty( $guest['guest_email'] ) ) {
            return rest_ensure_response( array(
                'has_email' => true,
                'email' => sanitize_email($guest['guest_email']),
            ) );
        }

        return rest_ensure_response( array(
            'has_email' => false,
            'email' => null,
        ) );
    }

    /**
     * Update guest email
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function guest_update_email( $request ) {
        // Enforce REST nonce verification for public write endpoint.
        $nonce_check = $this->verify_rest_nonce( $request );
        if ( is_wp_error( $nonce_check ) ) {
            return $nonce_check;
        }

        $params = $request->get_json_params();
        $email = isset( $params['email'] ) ? sanitize_email( wp_unslash( $params['email'] ) ) : null;
        $session_id = isset( $params['session_id'] ) ? sanitize_text_field( wp_unslash( $params['session_id'] ) ) : null;

        if ( empty( $email ) || ! is_email( $email ) ) {
            return new WP_Error(
                'invalid_email',
                __( 'Invalid email address', 'wishcart' ),
                array( 'status' => 400 )
            );
        }

        if ( empty( $session_id ) ) {
            return new WP_Error(
                'invalid_session',
                __( 'Session ID is required', 'wishcart' ),
                array( 'status' => 400 )
            );
        }

        $guest_handler = new wishcart_Guest_Handler();
        $result = $guest_handler->create_or_update_guest( $session_id, array(
            'guest_email' => $email,
        ) );

        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }

        // Sync to FluentCRM if available
        if ( class_exists( 'WishCart_FluentCRM_Integration' ) ) {
            $fluentcrm = new WishCart_FluentCRM_Integration();
            if ( $fluentcrm->is_available() ) {
                $settings = $fluentcrm->get_settings();
                if ( $settings['enabled'] ) {
                    // Create or update contact in FluentCRM
                    $contact_id = $fluentcrm->create_or_update_contact( null, $email, array() );
                    if ( ! is_wp_error( $contact_id ) ) {
                        // Ensure contact is added to default list
                        $default_list_id = $fluentcrm->get_or_create_default_list();
                        if ( ! is_wp_error( $default_list_id ) ) {
                            $fluentcrm->attach_lists( $contact_id, array( $default_list_id ) );
                        }
                    }
                }
            }
        }

        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Email saved successfully', 'wishcart' ),
            'email' => $email,
        ) );
    }
}

wishcart_Admin::get_instance();
