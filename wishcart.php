<?php

/**
 * Plugin Name:  WishCart - Wishlist for FluentCart
 * Plugin URI:  https://wishcart.chat
 * Description: Wishlist plugin for FluentCart. Add products to wishlist, manage your favorites, and share your wishlist with others.
 * Version:     1.0.0
 * Requires PHP: 7.4
 * Author:      WishCart Team <support@wishcart.chat>
 * Author URI:  https://wishcart.chat/
 * Contributors: wishcart, zrshishir, sabbirxprt
 * Text Domain:  wish-car
 * Domain Path: /languages/
 * License: GPL2
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 *
 * @category WordPress
 * @package  AISK
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://wishcart.chat
 *
 * Third-party Libraries:
 * - Smalot/PdfParser: Required for PDF text extraction and processing
 
 */


if (defined('WP_DEBUG') && WP_DEBUG) {
    ob_start();
    register_activation_hook(__FILE__, function() {
        $output = ob_get_contents();
        if (!empty($output)) {
            // Silent handling of activation output in production
            return;
        }
    });
}

if ( ! defined('ABSPATH') ) {
	exit;
}

// Load Composer autoloader if available
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
} else {
    // Log error but don't stop plugin execution
    if ( defined('WP_DEBUG') && WP_DEBUG ) {
        // error_log('WishCart: Composer autoloader not found. Some features may not work properly.');
    }
}

/**
 * Main plugin class for WishCart Wishlist
 *
 * Handles initialization, dependencies loading, and core functionality
 * of the WishCart wishlist plugin for WordPress and FluentCart.
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://wishcart.chat
 */
class WishCart_Wishlist {

    private static $instance = null;

    /**
     * Get singleton instance of this class
     *
     * @return WishCart_Wishlist Instance of this class
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor for initializing the plugin
     */
    private function __construct() {
        // Define constants
        define('WishCart_PLUGIN_FILE', __FILE__);
        define('WishCart_VERSION', '1.0.0');
        define('WishCart_PLUGIN_DIR', plugin_dir_path(__FILE__));
        define('WishCart_PLUGIN_URL', plugin_dir_url(__FILE__));
        define('WishCart_TEXT_DOMAIN', 'wishcart');


        // Initialize components
        add_action('init', [ $this, 'init' ]);
        register_activation_hook(__FILE__, [ $this, 'activate' ]);
        register_deactivation_hook(__FILE__, [ __CLASS__, 'deactivate' ]);

        // Load required files
        $this->load_dependencies();
    }
    
    /**
     * Initialize plugin hooks and features
     *
     * @return void
     */
    public function init() {
        // Clear FluentCart detection cache when plugins are activated/deactivated
        add_action('activated_plugin', [ $this, 'clear_fluentcart_cache' ]);
        add_action('deactivated_plugin', [ $this, 'clear_fluentcart_cache' ]);
        
        // Add custom cron schedules
        add_filter('cron_schedules', [ 'WishCart_Cron_Handler', 'add_cron_schedules' ]);
        
        // Initialize cron handler
        new WishCart_Cron_Handler();
    }

    /**
     * Clear FluentCart detection cache when plugins change
     *
     * @param string $plugin Plugin path
     * @return void
     */
    public function clear_fluentcart_cache( $plugin ) {
        // Clear cache if FluentCart or this plugin was activated/deactivated
        if ( strpos( $plugin, 'fluentcart' ) !== false || 
             strpos( $plugin, 'fluent-cart' ) !== false ||
             strpos( $plugin, 'wishcart' ) !== false ) {
            if ( class_exists( 'WishCart_FluentCart_Helper' ) ) {
                WishCart_FluentCart_Helper::clear_detection_cache();
            }
        }
    }

    /**
     * Load required plugin files and dependencies
     *
     * @return void
     */
    private function load_dependencies() {
        // Core classes
        include_once WishCart_PLUGIN_DIR . 'includes/class-database.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-database-migration.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-fluentcart-helper.php';
        
        // Handler classes
        include_once WishCart_PLUGIN_DIR . 'includes/class-wishlist-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-analytics-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-sharing-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-notifications-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-activity-logger.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-guest-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-cron-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-cart-tracking.php';
        
        // FluentCRM integration classes
        include_once WishCart_PLUGIN_DIR . 'includes/class-fluentcrm-integration.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-fluentcrm-triggers.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-fluentcrm-smartcode.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-crm-campaign-handler.php';
        
        // FluentCRM trigger classes (only load if FluentCRM BaseTrigger exists)
        if ( class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
            include_once WishCart_PLUGIN_DIR . 'includes/triggers/class-item-added-trigger.php';
            include_once WishCart_PLUGIN_DIR . 'includes/triggers/class-item-removed-trigger.php';
            include_once WishCart_PLUGIN_DIR . 'includes/triggers/class-price-drop-trigger.php';
            include_once WishCart_PLUGIN_DIR . 'includes/triggers/class-back-in-stock-trigger.php';
        }
        
        // Frontend classes
        include_once WishCart_PLUGIN_DIR . 'includes/class-wishlist-frontend.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-wishlist-page.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-shared-wishlist-page.php';
        include_once WishCart_PLUGIN_DIR . 'includes/class-share-page-handler.php';
        include_once WishCart_PLUGIN_DIR . 'includes/shortcodes/class-wishlist-shortcode.php';
        include_once WishCart_PLUGIN_DIR . 'includes/shortcodes/class-shared-wishlist-shortcode.php';
        include_once WishCart_PLUGIN_DIR . 'includes/shortcodes/class-wishlist-button-shortcode.php';
        
        // Admin class
        include_once WishCart_PLUGIN_DIR . 'includes/class-wishcart-admin.php';

        // Initialize admin/API class so REST routes register for all requests
        WishCart_Admin::get_instance();

        // Initialize frontend handler
        new WishCart_Wishlist_Frontend();

        // Initialize wishlist page handler (for rewrite rules)
        new WishCart_Wishlist_Page();
        
        // Initialize FluentCRM integration if available
        if (class_exists('WishCart_FluentCRM_Integration')) {
            new WishCart_FluentCRM_Integration();
        }

        // Initialize FluentCRM triggers if available
        if (class_exists('WishCart_FluentCRM_Triggers')) {
            new WishCart_FluentCRM_Triggers();
        }

        // Initialize FluentCRM SmartCode (dynamic shortcodes for email editor)
        if (class_exists('WishCart_FluentCRM_SmartCode')) {
            new WishCart_FluentCRM_SmartCode();
        }
        
        // Initialize CRM campaign handler
        if (class_exists('WishCart_CRM_Campaign_Handler')) {
            new WishCart_CRM_Campaign_Handler();
        }

        // Initialize cart and purchase tracking
        if (class_exists('WishCart_Cart_Tracking')) {
            new WishCart_Cart_Tracking();
        }

        // Ensure database tables exist even after updates (without reactivation)
        // Safe to call: dbDelta is idempotent
        try { new WishCart_Database(); } catch ( \Throwable $e ) {}
    }

    /**
     * Handle plugin activation
     *
     * @return void
     */
    public function activate() {
        // Ensure database tables exist
        new WishCart_Database();
        
        // Create wishlist page
        WishCart_Wishlist_Page::create_wishlist_page();
        
        // Create shared wishlist page
        WishCart_Shared_Wishlist_Page::create_shared_page();
        
        // Schedule cron events
        WishCart_Cron_Handler::schedule_events();
        
        // Flush rewrite rules to register new routes
        flush_rewrite_rules();
    }

    /**
     * Handle plugin deactivation
     *
     * @return void
     */
    public static function deactivate() {
        // Unschedule cron events
        WishCart_Cron_Handler::unschedule_events();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }

}

// Initialize the plugin
WishCart_Wishlist::get_instance();