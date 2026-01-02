<?php

/**
 * Plugin Name:  WishCart Pro - Advanced Wishlist Features
 * Plugin URI:  https://gowishcart.com
 * Description: Pro features for WishCart including multiple wishlists, social sharing, analytics tracking, FluentCRM integration, and webhooks. Requires WishCart free plugin to be installed and activated.
 * Version:     1.0.0
 * Requires PHP: 7.4
 * Requires Plugins: wishcart/wishcart.php
 * Author:      WishCart Team <support@gowishcart.com>
 * Author URI:  https://gowishcart.com/
 * Contributors: wishcart, zrshishir, sabbirxprt
 * Text Domain:  wishcart-pro
 * Domain Path: /languages/
 * License: GPL2
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 *
 * @category WordPress
 * @package  WishCart_Pro
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://gowishcart.com
 */

if ( ! defined('ABSPATH') ) {
	exit;
}

// Check if free plugin is active
if ( ! defined('WishCart_PLUGIN_FILE') ) {
	add_action('admin_notices', function() {
		if ( current_user_can('manage_options') ) {
			?>
			<div class="notice notice-error">
				<p>
					<strong><?php esc_html_e( 'WishCart Pro requires WishCart', 'wishcart-pro' ); ?></strong>
				</p>
				<p>
					<?php esc_html_e( 'WishCart Pro plugin requires the free WishCart plugin to be installed and activated. Please install and activate WishCart first.', 'wishcart-pro' ); ?>
				</p>
			</div>
			<?php
		}
	});
	return;
}

/**
 * Main plugin class for WishCart Pro
 *
 * Handles initialization and loading of pro features
 *
 * @category WordPress
 * @package  WishCart_Pro
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ http://www.gnu.org/licenses/gpl-2.0.txt
 * @link     https://gowishcart.com
 */
class WishCart_Pro {

	private static $instance = null;

	/**
	 * Get singleton instance of this class
	 *
	 * @return WishCart_Pro Instance of this class
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Check if pro plugin is active
	 *
	 * @return bool
	 */
	public static function is_active() {
		return class_exists('WishCart_Pro') && self::get_instance() !== null;
	}

	/**
	 * Get pro plugin version
	 *
	 * @return string
	 */
	public static function get_version() {
		return '1.0.0';
	}

	/**
	 * Constructor for initializing the plugin
	 */
	private function __construct() {
		// Define constants
		if ( ! defined('WishCart_Pro_PLUGIN_FILE') ) {
			define('WishCart_Pro_PLUGIN_FILE', __FILE__);
		}
		if ( ! defined('WishCart_Pro_VERSION') ) {
			define('WishCart_Pro_VERSION', '1.0.0');
		}
		if ( ! defined('WishCart_Pro_PLUGIN_DIR') ) {
			define('WishCart_Pro_PLUGIN_DIR', plugin_dir_path(__FILE__));
		}
		if ( ! defined('WishCart_Pro_PLUGIN_URL') ) {
			define('WishCart_Pro_PLUGIN_URL', plugin_dir_url(__FILE__));
		}
		if ( ! defined('WishCart_Pro_TEXT_DOMAIN') ) {
			define('WishCart_Pro_TEXT_DOMAIN', 'wishcart-pro');
		}

		// Initialize components
		add_action('init', [ $this, 'init' ]);
		register_activation_hook(__FILE__, [ $this, 'activate' ]);
		register_deactivation_hook(__FILE__, [ $this, 'deactivate' ]);

		// Load required files
		$this->load_dependencies();
	}

	/**
	 * Initialize plugin hooks and features
	 *
	 * @return void
	 */
	public function init() {
		// Pro features will be initialized here
		do_action('wishcart_pro_init');
	}

	/**
	 * Load required plugin files and dependencies
	 *
	 * @return void
	 */
	private function load_dependencies() {
		// Core pro class
		include_once WishCart_Pro_PLUGIN_DIR . 'includes/class-wishcart-pro.php';

		// Initialize pro plugin handler
		WishCart_Pro_Handler::get_instance();
	}

	/**
	 * Handle plugin activation
	 *
	 * @return void
	 */
	public function activate() {
		// Check for free plugin dependency
		if ( ! defined('WishCart_PLUGIN_FILE') ) {
			deactivate_plugins( plugin_basename( __FILE__ ) );
			wp_die(
				sprintf(
					'<h1>%s</h1><p>%s</p><p><a href="%s">%s</a></p>',
					esc_html__( 'WishCart Pro Activation Failed', 'wishcart-pro' ),
					esc_html__( 'WishCart Pro requires the free WishCart plugin to be installed and activated. Please install and activate WishCart first, then try activating WishCart Pro again.', 'wishcart-pro' ),
					esc_url( admin_url( 'plugins.php' ) ),
					esc_html__( 'Return to Plugins', 'wishcart-pro' )
				),
				esc_html__( 'Plugin Activation Error', 'wishcart-pro' ),
				[ 'back_link' => true ]
			);
		}

		// Flush rewrite rules
		flush_rewrite_rules();
	}

	/**
	 * Handle plugin deactivation
	 *
	 * @return void
	 */
	public static function deactivate() {
		// Flush rewrite rules
		flush_rewrite_rules();
	}

}

// Initialize the plugin
WishCart_Pro::get_instance();


