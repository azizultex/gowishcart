<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Cart and Purchase Tracking Class
 *
 * Handles tracking of wishlist items when they are added to cart or purchased
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Cart_Tracking {

    private $wpdb;
    private $analytics_handler;
    private $items_table;
    private $wishlists_table;
    private $guest_users_table;

    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->analytics_handler = new WishCart_Analytics_Handler();
        $this->items_table = $wpdb->prefix . 'fc_wishlist_items';
        $this->wishlists_table = $wpdb->prefix . 'fc_wishlists';
        $this->guest_users_table = $wpdb->prefix . 'fc_wishlist_guest_users';

        // Hook into WooCommerce order completion
        add_action( 'woocommerce_order_status_completed', array( $this, 'track_woocommerce_purchase' ), 10, 1 );
        add_action( 'woocommerce_thankyou', array( $this, 'track_woocommerce_purchase_on_thankyou' ), 10, 1 );

        // Hook into FluentCart order completion
        // FluentCart uses different hooks - check for order status changes
        add_action( 'fluentcart_order_status_completed', array( $this, 'track_fluentcart_purchase' ), 10, 1 );
        add_action( 'fluentcart_order_created', array( $this, 'track_fluentcart_purchase_on_create' ), 10, 1 );
        
        // Also support alternative hook format with slash (fluentcart/order_created)
        add_action( 'fluentcart/order_created', array( $this, 'track_fluentcart_purchase_on_create' ), 10, 1 );
        
        // FluentCart actually uses fluent_cart/order_created (with underscore) and passes array with 'order' key
        add_action( 'fluent_cart/order_created', array( $this, 'track_fluentcart_purchase_on_create_array' ), 10, 1 );
        
        // Hook into WordPress post save for FluentCart orders (fc_order post type)
        add_action( 'save_post_fc_order', array( $this, 'track_fluentcart_purchase_on_post_save' ), 10, 3 );
        
        // Also hook into order status changes for FluentCart
        if ( class_exists( '\FluentCart\App\Models\Order' ) ) {
            // FluentCart may use model events
            add_action( 'fluentcart_order_status_changed', array( $this, 'track_fluentcart_purchase_on_status_change' ), 10, 2 );
        }
        
        // Add test hooks to identify available FluentCart actions (debugging only)
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            $this->add_test_hooks();
        }
    }

    /**
     * Track WooCommerce purchase
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function track_woocommerce_purchase( $order_id ) {
        if ( ! function_exists( 'wc_get_order' ) ) {
            return;
        }

        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        $this->track_order_items( $order );
    }

    /**
     * Track WooCommerce purchase on thank you page
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function track_woocommerce_purchase_on_thankyou( $order_id ) {
        if ( ! function_exists( 'wc_get_order' ) ) {
            return;
        }

        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        // Only track if order is completed or processing
        $status = $order->get_status();
        if ( ! in_array( $status, array( 'completed', 'processing' ) ) ) {
            return;
        }

        $this->track_order_items( $order );
    }

    /**
     * Track FluentCart purchase
     *
     * @param int|object $order_id Order ID or order object
     * @return void
     */
    public function track_fluentcart_purchase( $order_id ) {
        $order = WishCart_FluentCart_Helper::get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        $this->track_order_items( $order );
    }

    /**
     * Track FluentCart purchase on order creation
     *
     * @param int|object $order_id Order ID or order object
     * @return void
     */
    public function track_fluentcart_purchase_on_create( $order_id ) {
        $order = WishCart_FluentCart_Helper::get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        // Track all orders regardless of status (status filtering happens on status change hook)
        $this->track_order_items( $order );
    }

    /**
     * Track FluentCart purchase on order creation (when hook passes array with 'order' key)
     * This handles fluent_cart/order_created hook which passes array(['order' => Order Object])
     *
     * @param array $data Array containing 'order' key with FluentCart Order object
     * @return void
     */
    public function track_fluentcart_purchase_on_create_array( $data ) {
        // Extract order from array if it's an array
        if ( is_array( $data ) && isset( $data['order'] ) ) {
            $fc_order = $data['order'];
            // Get order ID from the FluentCart order object
            if ( is_object( $fc_order ) && isset( $fc_order->id ) ) {
                $order_id = $fc_order->id;
                // Use the existing method to get wrapped order and track
                $this->track_fluentcart_purchase_on_create( $order_id );
                return;
            }
        }

        // Fallback: try to treat it as order_id directly
        $this->track_fluentcart_purchase_on_create( $data );
    }

    /**
     * Track FluentCart purchase on status change
     *
     * @param int $order_id Order ID
     * @param string $new_status New order status
     * @return void
     */
    public function track_fluentcart_purchase_on_status_change( $order_id, $new_status ) {
        if ( ! in_array( $new_status, array( 'completed', 'processing', 'paid' ) ) ) {
            return;
        }

        $order = WishCart_FluentCart_Helper::get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        $this->track_order_items( $order );
    }

    /**
     * Track order items for purchase analytics
     *
     * @param object $order Order object (WooCommerce or FluentCart)
     * @return void
     */
    private function track_order_items( $order ) {
        if ( ! $order ) {
            return;
        }

        // Get order items
        $items = $this->get_order_items( $order );
        if ( empty( $items ) ) {
            return;
        }

        // Get customer email from order
        $order_email = $this->get_order_email( $order );
        if ( empty( $order_email ) || ! is_email( $order_email ) ) {
            return;
        }

        // Get customer/user ID
        $user_id = $this->get_order_user_id( $order );

        // Track each product
        foreach ( $items as $item ) {
            $product_id = $this->get_item_product_id( $item );
            $variation_id = $this->get_item_variation_id( $item );

            if ( ! $product_id ) {
                continue;
            }

            // Debug: Log variation_id extraction
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] track_order_items: Extracted product_id=' . $product_id . ', variation_id=' . $variation_id . ' from order item' );
            }

            // Check if this product has been added to cart by this email
            $has_add_to_cart = $this->has_add_to_cart_for_email( $product_id, $order_email );
            if ( ! $has_add_to_cart ) {
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( '[WishCart] track_order_items: Product ' . $product_id . ' was not added to cart by email ' . $order_email . ' - skipping purchase tracking' );
                }
                continue;
            }

            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] track_order_items: Product ' . $product_id . ' (variation_id=' . $variation_id . ') has add-to-cart for email ' . $order_email . ' - tracking purchase for specific variation' );
            }

            // Track analytics event for the specific variation_id
            $track_result = $this->analytics_handler->track_event( $product_id, $variation_id, 'purchase' );
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] track_order_items: Purchase tracking result for product ' . $product_id . ' variation_id=' . $variation_id . ': ' . ( $track_result ? 'success' : 'failed' ) );
            }

            // Update wishlist items status if they exist
            $this->update_wishlist_items_on_purchase( $product_id, $variation_id, $user_id );
        }
    }

    /**
     * Get order items
     *
     * @param object $order Order object
     * @return array Order items
     */
    private function get_order_items( $order ) {
        if ( method_exists( $order, 'get_items' ) ) {
            return $order->get_items();
        }

        // FluentCart order items
        if ( method_exists( $order, 'get_items' ) && is_callable( array( $order, 'get_items' ) ) ) {
            return $order->get_items();
        }

        return array();
    }

    /**
     * Get order user ID
     *
     * @param object $order Order object
     * @return int|null User ID
     */
    private function get_order_user_id( $order ) {
        if ( method_exists( $order, 'get_user_id' ) ) {
            return $order->get_user_id();
        }

        if ( method_exists( $order, 'get_customer_id' ) ) {
            return $order->get_customer_id();
        }

        return null;
    }

    /**
     * Get item product ID
     *
     * @param object $item Order item
     * @return int Product ID
     */
    private function get_item_product_id( $item ) {
        if ( method_exists( $item, 'get_product_id' ) ) {
            return $item->get_product_id();
        }

        if ( method_exists( $item, 'get_product' ) ) {
            $product = $item->get_product();
            if ( $product && method_exists( $product, 'get_id' ) ) {
                return $product->get_id();
            }
        }

        // FluentCart order item
        if ( is_object( $item ) && isset( $item->product_id ) ) {
            return intval( $item->product_id );
        }

        if ( is_array( $item ) && isset( $item['product_id'] ) ) {
            return intval( $item['product_id'] );
        }

        return 0;
    }

    /**
     * Get item variation ID
     *
     * @param object $item Order item
     * @return int Variation ID
     */
    private function get_item_variation_id( $item ) {
        // Debug: Log item type
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            $item_type = is_object( $item ) ? get_class( $item ) : ( is_array( $item ) ? 'array' : gettype( $item ) );
            error_log( '[WishCart] get_item_variation_id: Item type=' . $item_type );
        }
        
        // Try method first (WooCommerce or WishCart_FluentCart_Order_Item)
        if ( method_exists( $item, 'get_variation_id' ) ) {
            $variation_id = $item->get_variation_id();
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] get_item_variation_id: From get_variation_id() method: ' . $variation_id );
            }
            return $variation_id > 0 ? $variation_id : 0;
        }

        // For WishCart_FluentCart_Order_Item, check internal item_data array as fallback
        if ( is_object( $item ) && $item instanceof WishCart_FluentCart_Order_Item ) {
            // Use reflection to access private item_data property
            try {
                $reflection = new ReflectionClass( $item );
                if ( $reflection->hasProperty( 'item_data' ) ) {
                    $property = $reflection->getProperty( 'item_data' );
                    $property->setAccessible( true );
                    $item_data = $property->getValue( $item );
                    if ( isset( $item_data['variation_id'] ) ) {
                        $variation_id = intval( $item_data['variation_id'] );
                        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                            error_log( '[WishCart] get_item_variation_id: From WishCart_FluentCart_Order_Item item_data: ' . $variation_id );
                        }
                        return $variation_id > 0 ? $variation_id : 0;
                    }
                }
            } catch ( Exception $e ) {
                // Reflection failed, continue with other checks
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( '[WishCart] get_item_variation_id: Reflection failed: ' . $e->getMessage() );
                }
            }
        }

        // FluentCart may store variation in product_id or separately
        if ( is_object( $item ) && isset( $item->variation_id ) ) {
            $variation_id = intval( $item->variation_id );
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] get_item_variation_id: From object->variation_id property: ' . $variation_id );
            }
            return $variation_id > 0 ? $variation_id : 0;
        }

        if ( is_array( $item ) && isset( $item['variation_id'] ) ) {
            $variation_id = intval( $item['variation_id'] );
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] get_item_variation_id: From array[\'variation_id\']: ' . $variation_id );
            }
            return $variation_id > 0 ? $variation_id : 0;
        }

        // Debug: Log that no variation_id was found
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] get_item_variation_id: No variation_id found, returning 0' );
        }

        return 0;
    }

    /**
     * Get order status
     *
     * @param object $order Order object
     * @return string Order status
     */
    private function get_order_status( $order ) {
        if ( method_exists( $order, 'get_status' ) ) {
            return $order->get_status();
        }

        if ( is_object( $order ) && isset( $order->status ) ) {
            return $order->status;
        }

        return '';
    }

    /**
     * Get order email address
     *
     * @param object $order Order object (WooCommerce or FluentCart)
     * @return string Customer email address
     */
    private function get_order_email( $order ) {
        if ( ! $order ) {
            return '';
        }

        // Check if it's a FluentCart order
        if ( is_a( $order, 'WishCart_FluentCart_Order' ) || method_exists( $order, 'get_billing_email' ) ) {
            // For FluentCart, use get_billing_email method
            if ( method_exists( $order, 'get_billing_email' ) ) {
                $email = $order->get_billing_email();
                if ( ! empty( $email ) && is_email( $email ) ) {
                    return $email;
                }
            }
        }

        // For WooCommerce orders
        if ( method_exists( $order, 'get_billing_email' ) ) {
            $email = $order->get_billing_email();
            if ( ! empty( $email ) && is_email( $email ) ) {
                return $email;
            }
        }

        // Fallback: Try to get email from user_id
        $user_id = $this->get_order_user_id( $order );
        if ( $user_id ) {
            $user = get_userdata( $user_id );
            if ( $user && ! empty( $user->user_email ) && is_email( $user->user_email ) ) {
                return $user->user_email;
            }
        }

        return '';
    }

    /**
     * Check if product has been added to cart by a specific email
     *
     * @param int $product_id Product ID
     * @param string $email Customer email address
     * @return bool True if product has add-to-cart events for this email
     */
    private function has_add_to_cart_for_email( $product_id, $email ) {
        if ( ! $product_id || empty( $email ) || ! is_email( $email ) ) {
            return false;
        }

        // Build WHERE clause for product only (ignore variation_id)
        $where_clauses = array();
        $where_values = array();

        $where_clauses[] = "wi.product_id = %d";
        $where_values[] = $product_id;

        // Check for items that were added to cart
        $where_clauses[] = "wi.date_added_to_cart IS NOT NULL";

        // Match by email - either from logged-in user or guest (case-insensitive)
        // Also check if wishlist session_id matches any guest_users record with this email
        $where_clauses[] = "(LOWER(u.user_email) = LOWER(%s) OR LOWER(gu.guest_email) = LOWER(%s) OR w.session_id IN (SELECT session_id FROM {$this->guest_users_table} WHERE LOWER(guest_email) = LOWER(%s)))";
        $where_values[] = $email;
        $where_values[] = $email;
        $where_values[] = $email;

        $where_sql = implode( ' AND ', $where_clauses );

        // Query to check if any matching items exist
        $query = $this->wpdb->prepare(
            "SELECT COUNT(*) 
            FROM {$this->items_table} wi
            INNER JOIN {$this->wishlists_table} w ON wi.wishlist_id = w.id
            LEFT JOIN {$this->wpdb->users} u ON w.user_id = u.ID
            LEFT JOIN {$this->guest_users_table} gu ON w.session_id = gu.session_id
            WHERE {$where_sql}",
            $where_values
        );

        $count = $this->wpdb->get_var( $query );

        // If we found matches, return true
        if ( intval( $count ) > 0 ) {
            return true;
        }

        // Fallback: Check if product exists in wishlist for this email (even without date_added_to_cart)
        // This ensures purchases are tracked even if add-to-cart tracking failed

        // Build WHERE clause for fallback (without date_added_to_cart requirement)
        $fallback_where_clauses = array();
        $fallback_where_values = array();

        $fallback_where_clauses[] = "wi.product_id = %d";
        $fallback_where_values[] = $product_id;

        // Match by email - either from logged-in user or guest (case-insensitive)
        // Also check if wishlist session_id matches any guest_users record with this email
        $fallback_where_clauses[] = "(LOWER(u.user_email) = LOWER(%s) OR LOWER(gu.guest_email) = LOWER(%s) OR w.session_id IN (SELECT session_id FROM {$this->guest_users_table} WHERE LOWER(guest_email) = LOWER(%s)))";
        $fallback_where_values[] = $email;
        $fallback_where_values[] = $email;
        $fallback_where_values[] = $email;

        $fallback_where_sql = implode( ' AND ', $fallback_where_clauses );

        // Fallback query (without date_added_to_cart requirement)
        $fallback_query = $this->wpdb->prepare(
            "SELECT COUNT(*) 
            FROM {$this->items_table} wi
            INNER JOIN {$this->wishlists_table} w ON wi.wishlist_id = w.id
            LEFT JOIN {$this->wpdb->users} u ON w.user_id = u.ID
            LEFT JOIN {$this->guest_users_table} gu ON w.session_id = gu.session_id
            WHERE {$fallback_where_sql}",
            $fallback_where_values
        );

        $fallback_count = $this->wpdb->get_var( $fallback_query );

        return intval( $fallback_count ) > 0;
    }

    /**
     * Update wishlist items when product is purchased
     *
     * @param int $product_id Product ID
     * @param int $variation_id Variation ID
     * @param int|null $user_id User ID
     * @return void
     */
    private function update_wishlist_items_on_purchase( $product_id, $variation_id, $user_id = null ) {
        if ( ! $product_id ) {
            return;
        }

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

        if ( $user_id ) {
            $where_clauses[] = "w.user_id = %d";
            $where_values[] = $user_id;
        }

        $where_sql = implode( ' AND ', $where_clauses );

        if ( ! empty( $where_values ) ) {
            $query = $this->wpdb->prepare(
                "UPDATE {$this->items_table} wi
                INNER JOIN {$this->wishlists_table} w ON wi.wishlist_id = w.id
                SET wi.status = 'purchased'
                WHERE {$where_sql}",
                $where_values
            );

            $this->wpdb->query( $query );
        }
    }

    /**
     * Track FluentCart purchase on WordPress post save
     * This catches orders when they are saved as WordPress posts
     *
     * @param int $post_id Post ID
     * @param WP_Post $post Post object
     * @param bool $update Whether this is an update or new post
     * @return void
     */
    public function track_fluentcart_purchase_on_post_save( $post_id, $post, $update ) {
        // Only track new posts, not updates (to avoid duplicate tracking)
        if ( $update ) {
            return;
        }

        // Skip autosaves and revisions
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }

        if ( wp_is_post_revision( $post_id ) ) {
            return;
        }

        // Get order using post_id
        $order = WishCart_FluentCart_Helper::get_order( $post_id );
        if ( ! $order ) {
            return;
        }

        // Track the order
        $this->track_order_items( $order );
    }

    /**
     * Add test hooks to identify available FluentCart actions
     * This is for debugging purposes only
     *
     * @return void
     */
    private function add_test_hooks() {
        // List of potential FluentCart hook names to test
        $test_hooks = array(
            'fluentcart_order_created',
            'fluentcart/order_created',
            'fluentcart_order_saved',
            'fluentcart/order_saved',
            'fluentcart_order_completed',
            'fluentcart/order_completed',
            'fluentcart_order_paid',
            'fluentcart/order_paid',
            'fct_order_created',
            'fct/order_created',
            'fluent_cart_order_created',
            'fluent_cart/order_created',
        );

        // Test hooks removed - no longer needed
    }
}

