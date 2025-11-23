<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Cart and Purchase Tracking Class
 *
 * Handles tracking of wishlist items when they are added to cart or purchased
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
class WISHCART_Cart_Tracking {

    private $wpdb;
    private $analytics_handler;
    private $items_table;
    private $wishlists_table;

    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->analytics_handler = new WISHCART_Analytics_Handler();
        $this->items_table = $wpdb->prefix . 'fc_wishlist_items';
        $this->wishlists_table = $wpdb->prefix . 'fc_wishlists';

        // Hook into WooCommerce order completion
        add_action( 'woocommerce_order_status_completed', array( $this, 'track_woocommerce_purchase' ), 10, 1 );
        add_action( 'woocommerce_thankyou', array( $this, 'track_woocommerce_purchase_on_thankyou' ), 10, 1 );

        // Hook into FluentCart order completion
        // FluentCart uses different hooks - check for order status changes
        add_action( 'fluentcart_order_status_completed', array( $this, 'track_fluentcart_purchase' ), 10, 1 );
        add_action( 'fluentcart_order_created', array( $this, 'track_fluentcart_purchase_on_create' ), 10, 1 );
        
        // Also hook into order status changes for FluentCart
        if ( class_exists( '\FluentCart\App\Models\Order' ) ) {
            // FluentCart may use model events
            add_action( 'fluentcart_order_status_changed', array( $this, 'track_fluentcart_purchase_on_status_change' ), 10, 2 );
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
        $order = WISHCART_FluentCart_Helper::get_order( $order_id );
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
        $order = WISHCART_FluentCart_Helper::get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        // Only track if order is completed or processing
        $status = $this->get_order_status( $order );
        if ( ! in_array( $status, array( 'completed', 'processing', 'paid' ) ) ) {
            return;
        }

        $this->track_order_items( $order );
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

        $order = WISHCART_FluentCart_Helper::get_order( $order_id );
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

        // Get customer/user ID
        $user_id = $this->get_order_user_id( $order );

        // Get order ID
        $order_id = $this->get_order_id( $order );

        // Get contact email from order
        $contact_email = $this->get_order_email( $order, $user_id );

        // Track each product
        foreach ( $items as $item ) {
            $product_id = $this->get_item_product_id( $item );
            $variation_id = $this->get_item_variation_id( $item );

            if ( ! $product_id ) {
                continue;
            }

            // Track analytics event
            $this->analytics_handler->track_event( $product_id, $variation_id, 'purchase' );

            // Update wishlist items status if they exist
            $this->update_wishlist_items_on_purchase( $product_id, $variation_id, $user_id );

            // Check if this product was in any wishlist for this user
            // If so, fire the purchase trigger
            if ( $user_id || $contact_email ) {
                $wishlist_item = $this->find_wishlist_item( $product_id, $variation_id, $user_id );
                
                if ( $wishlist_item ) {
                    // Get product information
                    $product = WISHCART_FluentCart_Helper::get_product( $product_id );
                    $product_name = $product ? $product->get_name() : '';
                    $product_url = $product ? get_permalink( $product_id ) : '';

                    // Fire purchase trigger
                    $purchase_data = array(
                        'user_id'       => $user_id,
                        'contact_email' => $contact_email,
                        'product_id'    => $product_id,
                        'variation_id'  => $variation_id,
                        'product_name'  => $product_name,
                        'product_url'   => $product_url,
                        'order_id'      => $order_id,
                        'wishlist_id'   => $wishlist_item['wishlist_id'],
                    );

                    do_action( 'wishcart_item_purchased', $purchase_data );
                }
            }
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
        if ( method_exists( $item, 'get_variation_id' ) ) {
            $variation_id = $item->get_variation_id();
            return $variation_id > 0 ? $variation_id : 0;
        }

        // FluentCart may store variation in product_id or separately
        if ( is_object( $item ) && isset( $item->variation_id ) ) {
            return intval( $item->variation_id );
        }

        if ( is_array( $item ) && isset( $item['variation_id'] ) ) {
            return intval( $item['variation_id'] );
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
     * Get order ID
     *
     * @param object $order Order object
     * @return int Order ID
     */
    private function get_order_id( $order ) {
        if ( method_exists( $order, 'get_id' ) ) {
            return $order->get_id();
        }

        if ( is_object( $order ) && isset( $order->id ) ) {
            return intval( $order->id );
        }

        if ( is_object( $order ) && isset( $order->ID ) ) {
            return intval( $order->ID );
        }

        return 0;
    }

    /**
     * Get order email
     *
     * @param object $order Order object
     * @param int|null $user_id User ID
     * @return string|null Email address
     */
    private function get_order_email( $order, $user_id = null ) {
        // If user_id is provided, get email from user
        if ( $user_id ) {
            $user = get_userdata( $user_id );
            if ( $user && ! empty( $user->user_email ) ) {
                return sanitize_email( $user->user_email );
            }
        }

        // Try to get email from order
        if ( method_exists( $order, 'get_billing_email' ) ) {
            $email = $order->get_billing_email();
            if ( ! empty( $email ) ) {
                return sanitize_email( $email );
            }
        }

        if ( method_exists( $order, 'get_email' ) ) {
            $email = $order->get_email();
            if ( ! empty( $email ) ) {
                return sanitize_email( $email );
            }
        }

        // Check order object properties
        if ( is_object( $order ) && isset( $order->billing_email ) ) {
            return sanitize_email( $order->billing_email );
        }

        if ( is_object( $order ) && isset( $order->email ) ) {
            return sanitize_email( $order->email );
        }

        return null;
    }

    /**
     * Find wishlist item for product
     *
     * @param int $product_id Product ID
     * @param int $variation_id Variation ID
     * @param int|null $user_id User ID
     * @return array|null Wishlist item data or null
     */
    private function find_wishlist_item( $product_id, $variation_id, $user_id = null ) {
        if ( ! $product_id ) {
            return null;
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
        $where_clauses[] = "w.status = 'active'";

        if ( $user_id ) {
            $where_clauses[] = "w.user_id = %d";
            $where_values[] = $user_id;
        }

        $where_sql = implode( ' AND ', $where_clauses );

        $query = $this->wpdb->prepare(
            "SELECT wi.*, w.user_id
            FROM {$this->items_table} wi
            INNER JOIN {$this->wishlists_table} w ON wi.wishlist_id = w.id
            WHERE {$where_sql}
            LIMIT 1",
            $where_values
        );

        $result = $this->wpdb->get_row( $query, ARRAY_A );

        return $result ? $result : null;
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
}

