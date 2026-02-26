<?php

/**
 * Plugin Name:  GoWishCart - Wishlist for FluentCart
 * Plugin URI:  https://gowishcart.com
 * Description: Wishlist plugin for FluentCart with guest support, product variations, price drop alerts, and FluentCRM integration.
 * Version:     1.1.1
 * Requires PHP: 7.4
 * Requires Plugins: fluent-cart
 * Author:      GoWishCart Team <support@gowishcart.com>
 * Author URI:  https://gowishcart.com/
 * Contributors: azizultex, sabbirxprt
 * Text Domain:  gowishcart-wishlist-for-fluentcart
 * Domain Path: /languages/
 * License: GPL2
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://gowishcart.com
 *
 */



if ( ! defined('ABSPATH') ) {
	exit;
}

// Load Composer autoloader if available
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

/**
 * Main plugin class for GoWishCart Wishlist
 *
 * Handles initialization, dependencies loading, and core functionality
 * of the GoWishCart wishlist plugin for WordPress and FluentCart.
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://gowishcart.com
 */
class GoWishCart_Wishlist {

    private static $instance = null;

    /**
     * Get singleton instance of this class
     *
     * @return GoWishCart_Wishlist Instance of this class
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
        define('GoWishCart_PLUGIN_FILE', __FILE__);
        define('GoWishCart_VERSION', '1.1.1');
        define('GoWishCart_PLUGIN_DIR', plugin_dir_path(__FILE__));
        define('GoWishCart_PLUGIN_URL', plugin_dir_url(__FILE__));
        define('GoWishCart_TEXT_DOMAIN', 'gowishcart-wishlist-for-fluentcart');

        // Check for FluentCart dependency first (before loading other dependencies)
        if ( ! $this->check_fluentcart_dependency() ) {
            // Add admin notice and prevent main functionality from loading
            add_action('admin_notices', [ $this, 'fluentcart_missing_notice' ]);
            return;
        }

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
        add_filter('cron_schedules', [ 'GoWishCart_Cron_Handler', 'add_cron_schedules' ]);
        
        // Initialize cron handler
        new GoWishCart_Cron_Handler();
    }

    /**
     * Check if FluentCart plugin is active
     *
     * @return bool True if FluentCart is active, false otherwise
     */
    private function check_fluentcart_dependency() {
        // Include plugin.php if needed
        if ( ! function_exists( 'is_plugin_active' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        // Check for all possible FluentCart plugin paths
        $possible_paths = [
            'fluent-cart/fluent-cart.php',      // WordPress.org version
            'fluentcart/fluentcart.php',        // Alternative version
            'fluentcart-pro/fluentcart-pro.php', // Pro version
        ];

        foreach ( $possible_paths as $path ) {
            if ( is_plugin_active( $path ) ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Display admin notice when FluentCart is missing
     *
     * @return void
     */
    public function fluentcart_missing_notice() {
        // Only show to administrators
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $plugin_file = 'fluent-cart/fluent-cart.php';
        $install_url = wp_nonce_url(
            self_admin_url( 'update.php?action=install-plugin&plugin=fluent-cart' ),
            'install-plugin_fluent-cart'
        );
        $activate_url = wp_nonce_url(
            self_admin_url( 'plugins.php?action=activate&plugin=' . $plugin_file ),
            'activate-plugin_' . $plugin_file
        );

        // Check if plugin is installed but not active
        $is_installed = file_exists( trailingslashit( WP_PLUGIN_DIR ) . $plugin_file );
        
        ?>
        <div class="notice notice-error">
            <p>
                <strong><?php esc_html_e( 'GoWishCart requires FluentCart', 'gowishcart-wishlist-for-fluentcart' ); ?></strong>
            </p>
            <p>
                <?php esc_html_e( 'GoWishCart plugin requires FluentCart to be installed and activated. Please install and activate FluentCart to use GoWishCart features.', 'gowishcart-wishlist-for-fluentcart' ); ?>
            </p>
            <p>
                <?php if ( $is_installed ) : ?>
                    <a href="<?php echo esc_url( $activate_url ); ?>" class="button button-primary">
                        <?php esc_html_e( 'Activate FluentCart', 'gowishcart-wishlist-for-fluentcart' ); ?>
                    </a>
                <?php else : ?>
                    <a href="<?php echo esc_url( $install_url ); ?>" class="button button-primary">
                        <?php esc_html_e( 'Install FluentCart', 'gowishcart-wishlist-for-fluentcart' ); ?>
                    </a>
                <?php endif; ?>
                <a href="<?php echo esc_url( admin_url( 'plugins.php' ) ); ?>" class="button">
                    <?php esc_html_e( 'Go to Plugins', 'gowishcart-wishlist-for-fluentcart' ); ?>
                </a>
            </p>
        </div>
        <?php
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
             strpos( $plugin, 'gowishcart-wishlist-for-fluentcart' ) !== false ) {
            if ( class_exists( 'GoWishCart_FluentCart_Helper' ) ) {
                GoWishCart_FluentCart_Helper::clear_detection_cache();
            }
        }
    }

    /**
     * Load required plugin files and dependencies
     *
     * @return void
     */
    private function load_dependencies() {
        // Table name constants (must load before class-database.php)
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-table-names.php';
        // Core classes
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-database.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-database-migration.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-fluentcart-helper.php';
        
        // Handler classes
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-wishlist-handler.php';
        // Analytics handler is a Pro feature - removed from free version
        // Sharing handler is a Pro feature - removed from free version
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-notifications-handler.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-guest-handler.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-cron-handler.php';
        
        // FluentCRM integration classes
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-fluentcrm-integration.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-fluentcrm-triggers.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-fluentcrm-smartcode.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-crm-campaign-handler.php';
        
        // FluentCRM trigger classes (only load if FluentCRM BaseTrigger exists)
        if ( class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
            include_once GoWishCart_PLUGIN_DIR . 'includes/triggers/class-item-added-trigger.php';
            include_once GoWishCart_PLUGIN_DIR . 'includes/triggers/class-item-removed-trigger.php';
            include_once GoWishCart_PLUGIN_DIR . 'includes/triggers/class-price-drop-trigger.php';
            include_once GoWishCart_PLUGIN_DIR . 'includes/triggers/class-back-in-stock-trigger.php';
        }
        
        // Frontend classes
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-wishlist-frontend.php';
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-wishlist-page.php';
        // Shared wishlist page is a Pro feature - removed from free version
        // Share page handler is a Pro feature - removed from free version
        include_once GoWishCart_PLUGIN_DIR . 'includes/shortcodes/class-wishlist-shortcode.php';
        // Shared wishlist shortcode is a Pro feature - removed from free version
        include_once GoWishCart_PLUGIN_DIR . 'includes/shortcodes/class-wishlist-button-shortcode.php';
        
        // Admin class
        include_once GoWishCart_PLUGIN_DIR . 'includes/class-gowishcart-admin.php';

        // Initialize admin/API class so REST routes register for all requests
        GoWishCart_Admin::get_instance();

        // Initialize frontend handler
        new GoWishCart_Wishlist_Frontend();

        // Initialize wishlist page handler (for rewrite rules)
        new GoWishCart_Wishlist_Page();
        
        // Initialize FluentCRM integration if available
        if (class_exists('GoWishCart_FluentCRM_Integration')) {
            new GoWishCart_FluentCRM_Integration();
        }

        // Initialize FluentCRM triggers if available
        if (class_exists('GoWishCart_FluentCRM_Triggers')) {
            new GoWishCart_FluentCRM_Triggers();
        }

        // Initialize FluentCRM SmartCode (dynamic shortcodes for email editor)
        if (class_exists('GoWishCart_FluentCRM_SmartCode')) {
            new GoWishCart_FluentCRM_SmartCode();
        }
        
        // Initialize CRM campaign handler
        if (class_exists('GoWishCart_CRM_Campaign_Handler')) {
            new GoWishCart_CRM_Campaign_Handler();
        }

        // Ensure database tables exist even after updates (without reactivation)
        // Safe to call: dbDelta is idempotent
        try { new GoWishCart_Database(); } catch ( \Throwable $e ) {}
    }

    /**
     * Handle plugin activation
     *
     * @return void
     */
    public function activate() {
        // Check for FluentCart dependency before activation
        if ( ! $this->check_fluentcart_dependency() ) {
            // Deactivate this plugin
            deactivate_plugins( plugin_basename( __FILE__ ) );
            
            // Display error message
            wp_die(
                sprintf(
                    '<h1>%s</h1><p>%s</p><p><a href="%s">%s</a></p>',
                    esc_html__( 'GoWishCart Activation Failed', 'gowishcart-wishlist-for-fluentcart' ),
                    esc_html__( 'GoWishCart requires FluentCart plugin to be installed and activated. Please install and activate FluentCart first, then try activating GoWishCart again.', 'gowishcart-wishlist-for-fluentcart' ),
                    esc_url( admin_url( 'plugins.php' ) ),
                    esc_html__( 'Return to Plugins', 'gowishcart-wishlist-for-fluentcart' )
                ),
                esc_html__( 'Plugin Activation Error', 'gowishcart-wishlist-for-fluentcart' ),
                [ 'back_link' => true ]
            );
        }

        // Ensure database tables exist
        new GoWishCart_Database();
        
        // Create wishlist page
        GoWishCart_Wishlist_Page::create_wishlist_page();
        
        // Schedule cron events
        GoWishCart_Cron_Handler::schedule_events();
        
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
        GoWishCart_Cron_Handler::unschedule_events();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }

}

// Initialize the plugin
GoWishCart_Wishlist::get_instance();