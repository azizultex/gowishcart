<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * FluentCRM Automation Triggers Class
 *
 * Registers custom automation triggers for WishCart events in FluentCRM
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
class WISHCART_FluentCRM_Triggers {

    /**
     * Constructor
     */
    public function __construct() {
        // Only register triggers if FluentCRM is available
        if ( ! $this->is_fluentcrm_available() ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] FluentCRM not available, triggers not registered' );
            }
            return;
        }

        // Register triggers using multiple methods to ensure they appear
        // Method 1: Filter-based registration (most compatible)
        add_filter( 'fluentcrm_automation_triggers', array( $this, 'register_triggers' ), 10, 1 );
        add_filter( 'fluentcrm_funnel_triggers', array( $this, 'register_triggers' ), 10, 1 );
        
        // Method 2: Register BaseTrigger classes after FluentCRM initializes
        add_action( 'fluent_crm/after_init', array( $this, 'register_trigger_classes' ), 20 );
        add_action( 'fluentcrm_loaded', array( $this, 'register_trigger_classes' ), 20 );
        
        // Method 3: Early registration on init (for admin pages)
        add_action( 'init', array( $this, 'register_triggers_early' ), 5 );
        
        // Method 4: Admin-specific registration
        if ( is_admin() ) {
            add_action( 'admin_init', array( $this, 'register_triggers_direct' ), 5 );
        }

        // Hook into WishCart events to fire triggers
        add_action( 'wishcart_item_added', array( $this, 'fire_product_added_trigger' ), 10, 1 );
        add_action( 'wishcart_item_purchased', array( $this, 'fire_item_purchased_trigger' ), 10, 1 );
        add_action( 'wishcart_back_in_stock', array( $this, 'fire_back_in_stock_trigger' ), 10, 1 );
    }

    /**
     * Register trigger classes using FluentCRM's BaseTrigger API
     *
     * @return void
     */
    public function register_trigger_classes() {
        // Load trigger classes
        $this->load_trigger_classes();

        // Check if BaseTrigger class exists
        if ( ! class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] FluentCRM BaseTrigger class not found, using filter method only' );
            }
            return;
        }

        // Instantiate trigger classes (FluentCRM will auto-register them)
        try {
            if ( class_exists( 'WISHCART_Product_Added_Trigger' ) ) {
                new WISHCART_Product_Added_Trigger();
            }
            if ( class_exists( 'WISHCART_Item_Purchased_Trigger' ) ) {
                new WISHCART_Item_Purchased_Trigger();
            }
            if ( class_exists( 'WISHCART_Back_In_Stock_Trigger' ) ) {
                new WISHCART_Back_In_Stock_Trigger();
            }

            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] FluentCRM trigger classes instantiated successfully' );
            }
        } catch ( Exception $e ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] Error instantiating trigger classes: ' . $e->getMessage() );
            }
        }
    }

    /**
     * Check if FluentCRM is available
     *
     * @return bool
     */
    private function is_fluentcrm_available() {
        if ( ! function_exists( 'is_plugin_active' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $possible_paths = array(
            'fluent-crm/fluent-crm.php',
            'fluentcrm/fluentcrm.php',
            'fluentcrm-pro/fluentcrm-pro.php',
        );

        foreach ( $possible_paths as $path ) {
            if ( is_plugin_active( $path ) ) {
                return true;
            }
        }

        // Check if FluentCRM classes are available
        if ( class_exists( 'FluentCrm\App\Services\FluentCrm' ) ||
             class_exists( 'FluentCrm\Framework\Foundation\Application' ) ||
             function_exists( 'fluentcrm' ) ||
             defined( 'FLUENTCRM' ) ) {
            return true;
        }

        return false;
    }

    /**
     * Register custom triggers with FluentCRM (filter-based method)
     *
     * @param array $triggers Existing triggers
     * @return array Modified triggers
     */
    public function register_triggers( $triggers ) {
        if ( ! is_array( $triggers ) ) {
            $triggers = array();
        }

        // Ensure trigger classes are loaded
        $this->load_trigger_classes();

        // Register triggers using class-based approach (preferred by FluentCRM)
        if ( class_exists( 'WISHCART_Product_Added_Trigger' ) ) {
            $triggers['wishcart_product_added'] = array(
                'class'       => 'WISHCART_Product_Added_Trigger',
                'category'    => 'WishCart',
                'title'       => __( 'Product Added to Wishlist', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when a product is added to a wishlist.', 'wish-cart' ),
            );
        }

        if ( class_exists( 'WISHCART_Item_Purchased_Trigger' ) ) {
            $triggers['wishcart_item_purchased'] = array(
                'class'       => 'WISHCART_Item_Purchased_Trigger',
                'category'    => 'WishCart',
                'title'       => __( 'Wishlist Item Purchased', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when any product from a user\'s wishlist is purchased.', 'wish-cart' ),
            );
        }

        if ( class_exists( 'WISHCART_Back_In_Stock_Trigger' ) ) {
            $triggers['wishcart_back_in_stock'] = array(
                'class'       => 'WISHCART_Back_In_Stock_Trigger',
                'category'    => 'WishCart',
                'title'       => __( 'Product Back in Stock', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when an out-of-stock product in a wishlist comes back in stock.', 'wish-cart' ),
            );
        }

        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] Registered triggers via filter. Total triggers: ' . count( $triggers ) );
            $wishcart_triggers = array_filter( $triggers, function( $trigger ) {
                return isset( $trigger['category'] ) && $trigger['category'] === 'WishCart';
            } );
            error_log( '[WishCart] WishCart triggers registered: ' . count( $wishcart_triggers ) );
        }

        return $triggers;
    }

    /**
     * Load trigger class files
     *
     * @return void
     */
    private function load_trigger_classes() {
        static $loaded = false;
        if ( $loaded ) {
            return;
        }

        $trigger_files = array(
            'triggers/class-product-added-trigger.php',
            'triggers/class-item-purchased-trigger.php',
            'triggers/class-back-in-stock-trigger.php',
        );

        foreach ( $trigger_files as $file ) {
            $file_path = WISHCART_PLUGIN_DIR . 'includes/' . $file;
            if ( file_exists( $file_path ) ) {
                include_once $file_path;
            }
        }

        $loaded = true;
    }

    /**
     * Early trigger registration
     *
     * @return void
     */
    public function register_triggers_early() {
        // Force trigger registration by applying filter
        $triggers = apply_filters( 'fluentcrm_automation_triggers', array() );
        
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] Early registration - triggers count: ' . count( $triggers ) );
        }
    }

    /**
     * Direct trigger registration (alternative method)
     *
     * @return void
     */
    public function register_triggers_direct() {
        // Try to register triggers directly if FluentCRM API is available
        if ( function_exists( 'fluentCrm' ) || class_exists( '\FluentCrm\App\Services\Funnel\FunnelHelper' ) ) {
            // Triggers will be registered via filter, this is just for initialization
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] Direct trigger registration attempted' );
            }
        }
    }

    /**
     * Fire trigger when product is added to wishlist
     *
     * @param array $item_data Item data from wishcart_item_added hook
     * @return void
     */
    public function fire_product_added_trigger( $item_data ) {
        if ( ! is_array( $item_data ) ) {
            return;
        }

        $contact_email = $this->get_contact_email( $item_data );
        if ( ! $contact_email ) {
            return;
        }

        $trigger_data = array(
            'trigger_key'   => 'wishcart_product_added',
            'contact_email' => $contact_email,
            'user_id'       => isset( $item_data['user_id'] ) ? intval( $item_data['user_id'] ) : null,
            'product_id'    => isset( $item_data['product_id'] ) ? intval( $item_data['product_id'] ) : 0,
            'variation_id'  => isset( $item_data['variation_id'] ) ? intval( $item_data['variation_id'] ) : 0,
            'product_name'  => isset( $item_data['product_name'] ) ? sanitize_text_field( $item_data['product_name'] ) : '',
            'product_url'   => isset( $item_data['product_url'] ) ? esc_url_raw( $item_data['product_url'] ) : '',
            'wishlist_id'   => isset( $item_data['wishlist_id'] ) ? intval( $item_data['wishlist_id'] ) : 0,
            'item_id'       => isset( $item_data['item_id'] ) ? intval( $item_data['item_id'] ) : 0,
        );

        $this->fire_fluentcrm_trigger( 'wishcart_product_added', $contact_email, $trigger_data );
    }

    /**
     * Fire trigger when wishlist item is purchased
     *
     * @param array $purchase_data Purchase data from wishcart_item_purchased hook
     * @return void
     */
    public function fire_item_purchased_trigger( $purchase_data ) {
        if ( ! is_array( $purchase_data ) ) {
            return;
        }

        $contact_email = $this->get_contact_email( $purchase_data );
        if ( ! $contact_email ) {
            return;
        }

        $trigger_data = array(
            'trigger_key'   => 'wishcart_item_purchased',
            'contact_email' => $contact_email,
            'user_id'       => isset( $purchase_data['user_id'] ) ? intval( $purchase_data['user_id'] ) : null,
            'product_id'    => isset( $purchase_data['product_id'] ) ? intval( $purchase_data['product_id'] ) : 0,
            'variation_id'  => isset( $purchase_data['variation_id'] ) ? intval( $purchase_data['variation_id'] ) : 0,
            'product_name'  => isset( $purchase_data['product_name'] ) ? sanitize_text_field( $purchase_data['product_name'] ) : '',
            'product_url'   => isset( $purchase_data['product_url'] ) ? esc_url_raw( $purchase_data['product_url'] ) : '',
            'order_id'      => isset( $purchase_data['order_id'] ) ? intval( $purchase_data['order_id'] ) : 0,
            'wishlist_id'   => isset( $purchase_data['wishlist_id'] ) ? intval( $purchase_data['wishlist_id'] ) : 0,
        );

        $this->fire_fluentcrm_trigger( 'wishcart_item_purchased', $contact_email, $trigger_data );
    }

    /**
     * Fire trigger when product comes back in stock
     *
     * @param array $stock_data Stock data from wishcart_back_in_stock hook
     * @return void
     */
    public function fire_back_in_stock_trigger( $stock_data ) {
        if ( ! is_array( $stock_data ) ) {
            return;
        }

        $contact_email = $this->get_contact_email( $stock_data );
        if ( ! $contact_email ) {
            return;
        }

        $trigger_data = array(
            'trigger_key'   => 'wishcart_back_in_stock',
            'contact_email' => $contact_email,
            'user_id'       => isset( $stock_data['user_id'] ) ? intval( $stock_data['user_id'] ) : null,
            'product_id'    => isset( $stock_data['product_id'] ) ? intval( $stock_data['product_id'] ) : 0,
            'product_name'  => isset( $stock_data['product_name'] ) ? sanitize_text_field( $stock_data['product_name'] ) : '',
            'product_url'   => isset( $stock_data['product_url'] ) ? esc_url_raw( $stock_data['product_url'] ) : '',
            'wishlist_id'   => isset( $stock_data['wishlist_id'] ) ? intval( $stock_data['wishlist_id'] ) : 0,
        );

        $this->fire_fluentcrm_trigger( 'wishcart_back_in_stock', $contact_email, $trigger_data );
    }

    /**
     * Get contact email from event data
     *
     * @param array $data Event data
     * @return string|null Contact email
     */
    private function get_contact_email( $data ) {
        // If user_id is provided, get email from user
        if ( ! empty( $data['user_id'] ) ) {
            $user = get_userdata( intval( $data['user_id'] ) );
            if ( $user && ! empty( $user->user_email ) ) {
                return sanitize_email( $user->user_email );
            }
        }

        // If email is directly provided
        if ( ! empty( $data['contact_email'] ) ) {
            return sanitize_email( $data['contact_email'] );
        }

        if ( ! empty( $data['email'] ) ) {
            return sanitize_email( $data['email'] );
        }

        // If session_id is provided, try to get guest email
        if ( ! empty( $data['session_id'] ) ) {
            $guest_handler = new WISHCART_Guest_Handler();
            $guest = $guest_handler->get_guest_by_session( $data['session_id'] );
            if ( $guest && ! empty( $guest['guest_email'] ) ) {
                return sanitize_email( $guest['guest_email'] );
            }
        }

        return null;
    }

    /**
     * Fire FluentCRM automation trigger
     *
     * @param string $trigger_key Trigger key
     * @param string $contact_email Contact email
     * @param array  $trigger_data Trigger data
     * @return void
     */
    private function fire_fluentcrm_trigger( $trigger_key, $contact_email, $trigger_data ) {
        if ( empty( $contact_email ) || ! is_email( $contact_email ) ) {
            return;
        }

        // Fire FluentCRM trigger using their hook system
        // FluentCRM uses: fluentcrm_automation_trigger_{trigger_key}
        $hook_name = 'fluentcrm_automation_trigger_' . $trigger_key;
        
        // Pass contact email and trigger data
        do_action( $hook_name, $contact_email, $trigger_data );

        // Also try alternative hook format if the above doesn't work
        // Some FluentCRM versions may use different hook patterns
        do_action( 'fluentcrm_trigger_' . $trigger_key, $contact_email, $trigger_data );
    }
}

