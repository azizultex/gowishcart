<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * WishCart Pro Handler Class
 *
 * Handles initialization and loading of all pro features
 *
 * @category WordPress
 * @package  WishCart_Pro
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Pro_Handler {

	private static $instance = null;

	/**
	 * Get singleton instance of this class
	 *
	 * @return WishCart_Pro_Handler Instance of this class
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
	private function __construct() {
		// Load pro features
		add_action('init', [ $this, 'load_pro_features' ], 20);
		add_action('wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ]);
		add_action('admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ]);
	}

	/**
	 * Load all pro features
	 *
	 * @return void
	 */
    public function load_pro_features() {
        // Multiple Wishlist Feature
        if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-multiple-wishlist-rest-api.php' ) ) {
            include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-multiple-wishlist-rest-api.php';
            new WishCart_Pro_Multiple_Wishlist_REST_API();
        }

        // Share Wishlist Feature
        if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-sharing-handler.php' ) ) {
            include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-sharing-handler.php';
            new WishCart_Pro_Sharing_Handler();
        }

        if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-shared-wishlist-page.php' ) ) {
            include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-shared-wishlist-page.php';
        }

        if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/shortcodes/class-shared-wishlist-shortcode.php' ) ) {
            include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/shortcodes/class-shared-wishlist-shortcode.php';
            new WishCart_Pro_Shared_Wishlist_Shortcode();
        }

        if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-share-rest-api.php' ) ) {
            include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-share-rest-api.php';
            new WishCart_Pro_Share_REST_API();
        }

		// FluentCRM Integration
		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-integration.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-integration.php';
			if ( class_exists('WishCart_Pro_FluentCRM_Integration') ) {
				new WishCart_Pro_FluentCRM_Integration();
			}
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-triggers.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-triggers.php';
			if ( class_exists('WishCart_Pro_FluentCRM_Triggers') ) {
				new WishCart_Pro_FluentCRM_Triggers();
			}
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-smartcode.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-smartcode.php';
			if ( class_exists('WishCart_Pro_FluentCRM_SmartCode') ) {
				new WishCart_Pro_FluentCRM_SmartCode();
			}
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-crm-campaign-handler.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-crm-campaign-handler.php';
			if ( class_exists('WishCart_Pro_CRM_Campaign_Handler') ) {
				new WishCart_Pro_CRM_Campaign_Handler();
			}
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-rest-api.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-fluentcrm-rest-api.php';
			if ( class_exists('WishCart_Pro_FluentCRM_REST_API') ) {
				new WishCart_Pro_FluentCRM_REST_API();
			}
		}

		// Webhook Handler
		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-webhook-handler.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-webhook-handler.php';
			if ( class_exists('WishCart_Pro_Webhook_Handler') ) {
				new WishCart_Pro_Webhook_Handler();
			}
		}

		// Analytics Feature
		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-analytics-handler.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-analytics-handler.php';
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-analytics-rest-api.php' ) ) {
			include_once WishCart_Pro_PLUGIN_DIR . 'includes/pro/class-analytics-rest-api.php';
			if ( class_exists('WishCart_Pro_Analytics_REST_API') ) {
				new WishCart_Pro_Analytics_REST_API();
			}
		}

		// Load FluentCRM triggers if available
		if ( class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
			$trigger_files = glob( WishCart_Pro_PLUGIN_DIR . 'includes/pro/triggers/*.php' );
			if ( $trigger_files ) {
				foreach ( $trigger_files as $file ) {
					include_once $file;
				}
			}
		}
	}

	/**
	 * Enqueue frontend assets
	 *
	 * @return void
	 */
	public function enqueue_frontend_assets() {
		// Enqueue pro frontend assets if built
		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'build/wishlist-frontend-pro.css' ) ) {
			wp_enqueue_style(
				'wishcart-pro-frontend',
				WishCart_Pro_PLUGIN_URL . 'build/wishlist-frontend-pro.css',
				[],
				WishCart_Pro_VERSION
			);
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'build/wishlist-frontend-pro.js' ) ) {
			wp_enqueue_script(
				'wishcart-pro-frontend',
				WishCart_Pro_PLUGIN_URL . 'build/wishlist-frontend-pro.js',
				['jquery'],
				WishCart_Pro_VERSION,
				true
			);

			// Localize script
			wp_localize_script(
				'wishcart-pro-frontend',
				'wishcartPro',
				[
					'isActive' => true,
					'version' => WishCart_Pro_VERSION,
					'apiUrl' => trailingslashit( rest_url( 'wishcart-pro/v1' ) ),
					'nonce' => wp_create_nonce('wp_rest'),
				]
			);
		}
	}

	/**
	 * Enqueue admin assets
	 *
	 * @return void
	 */
	public function enqueue_admin_assets( $hook ) {
		// Only load on WishCart admin pages
		if ( strpos( $hook, 'wishcart' ) === false ) {
			return;
		}

		// Enqueue pro admin assets if built
		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'build/admin-pro.css' ) ) {
			wp_enqueue_style(
				'wishcart-pro-admin',
				WishCart_Pro_PLUGIN_URL . 'build/admin-pro.css',
				[],
				WishCart_Pro_VERSION
			);
		}

		if ( file_exists( WishCart_Pro_PLUGIN_DIR . 'build/admin-pro.js' ) ) {
			wp_enqueue_script(
				'wishcart-pro-admin',
				WishCart_Pro_PLUGIN_URL . 'build/admin-pro.js',
				['wp-element', 'wp-components', 'wp-api-fetch', 'wp-i18n'],
				WishCart_Pro_VERSION,
				true
			);

			// Localize script
			wp_localize_script(
				'wishcart-pro-admin',
				'wishcartPro',
				[
					'isActive' => true,
					'version' => WishCart_Pro_VERSION,
					'apiUrl' => trailingslashit( rest_url( 'wishcart-pro/v1' ) ),
					'nonce' => wp_create_nonce('wp_rest'),
				]
			);
		}
	}

}

