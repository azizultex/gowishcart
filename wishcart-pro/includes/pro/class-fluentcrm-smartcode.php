<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * FluentCRM SmartCode Integration Class (Pro)
 *
 * Provides dynamic shortcodes for WishCart triggers in FluentCRM email editor
 * Similar to FluentBooking's Booking Data shortcodes
 *
 * @category WordPress
 * @package  WishCart_Pro
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Pro_FluentCRM_SmartCode {

    /**
     * Constructor
     */
    public function __construct() {
        $this->register();
    }

    /**
     * Register hooks for FluentCRM smart codes
     *
     * @return void
     */
    public function register() {
        // Register the Wishlist Data tab in FluentCRM email editor for our triggers
        add_filter( 'fluent_crm_funnel_context_smart_codes', array( $this, 'push_context_codes' ), 10, 2 );
        
        // Register the callback to parse WishCart shortcodes
        add_filter( 'fluent_crm/smartcode_group_callback_wishcart', array( $this, 'parse_wishlist_data' ), 10, 4 );
    }

    /**
     * Add WishCart shortcode group to FluentCRM context
     *
     * This adds the "Wishlist Data" tab when editing email actions
     * in automations triggered by WishCart events
     *
     * @param array  $codes   Existing shortcode groups
     * @param string $context The trigger context (trigger name)
     * @return array Modified shortcode groups
     */
    public function push_context_codes( $codes, $context ) {
        // Only add our shortcodes for WishCart triggers
        $wishcart_triggers = array(
            'wishcart_item_added',
            'wishcart_item_removed',
            'wishcart_price_drop',
            'wishcart_back_in_stock',
        );

        if ( ! in_array( $context, $wishcart_triggers, true ) ) {
            return $codes;
        }

        // Add the Wishlist Data group
        $codes[] = array(
            'key'        => 'wishcart',
            'title'      => __( 'Wishlist Data', 'wishcart' ),
            'shortcodes' => $this->get_smart_codes(),
        );

        return $codes;
    }

    /**
     * Parse WishCart shortcode values
     *
     * This callback is triggered when FluentCRM encounters a {{wishcart.*}} shortcode
     *
     * @param string $code         The full shortcode
     * @param string $valueKey     The key after 'wishcart.' (e.g., 'product.name')
     * @param string $defaultValue Default value if parsing fails
     * @param object $subscriber   The FluentCRM subscriber object
     * @return string Parsed value
     */
    public function parse_wishlist_data( $code, $valueKey, $defaultValue, $subscriber ) {
        // Get the product from the funnel subscriber's source_ref_id
        $product = $this->get_product_from_subscriber( $subscriber );
        
        // Parse the shortcode based on the key
        $value = $this->parse_shortcode( $valueKey, $product, $subscriber );

        if ( empty( $value ) && '' !== $value ) {
            return $defaultValue;
        }

        return $value;
    }

    /**
     * Get product from funnel subscriber data
     *
     * @param object $subscriber FluentCRM subscriber object
     * @return object|null WooCommerce/FluentCart product object or null
     */
    private function get_product_from_subscriber( $subscriber ) {
        if ( empty( $subscriber->funnel_subscriber_id ) ) {
            return null;
        }

        // Get the funnel subscriber to access source_ref_id (product_id)
        if ( ! class_exists( '\FluentCrm\App\Models\FunnelSubscriber' ) ) {
            return null;
        }

        $funnelSub = \FluentCrm\App\Models\FunnelSubscriber::where( 'id', $subscriber->funnel_subscriber_id )->first();

        if ( ! $funnelSub || empty( $funnelSub->source_ref_id ) ) {
            return null;
        }

        $product_id = intval( $funnelSub->source_ref_id );

        // Get the product using FluentCart helper or WooCommerce
        if ( class_exists( 'WishCart_FluentCart_Helper' ) ) {
            return WishCart_FluentCart_Helper::get_product( $product_id );
        }

        // Fallback to WooCommerce
        if ( function_exists( 'wc_get_product' ) ) {
            return wc_get_product( $product_id );
        }

        return null;
    }

    /**
     * Parse individual shortcode value
     *
     * @param string $valueKey   The shortcode key (e.g., 'product.name')
     * @param object $product    Product object
     * @param object $subscriber FluentCRM subscriber
     * @return string Parsed value
     */
    private function parse_shortcode( $valueKey, $product, $subscriber ) {
        // Split the key into category and property
        $parts = explode( '.', $valueKey, 2 );
        
        if ( count( $parts ) < 2 ) {
            return '';
        }

        $category = $parts[0];
        $property = $parts[1];

        switch ( $category ) {
            case 'customer':
                return $this->get_customer_data( $property, $subscriber );
            
            case 'product':
                return $this->get_product_data( $property, $product );
            
            case 'wishlist':
                return $this->get_wishlist_data( $property, $subscriber );
            
            default:
                return '';
        }
    }

    /**
     * Get customer data
     *
     * @param string $property   Property name (first_name, last_name, etc.)
     * @param object $subscriber FluentCRM subscriber
     * @return string Value
     */
    private function get_customer_data( $property, $subscriber ) {
        if ( ! $subscriber ) {
            return '';
        }

        switch ( $property ) {
            case 'first_name':
                return isset( $subscriber->first_name ) ? $subscriber->first_name : '';
            
            case 'last_name':
                return isset( $subscriber->last_name ) ? $subscriber->last_name : '';
            
            case 'full_name':
                $first = isset( $subscriber->first_name ) ? $subscriber->first_name : '';
                $last = isset( $subscriber->last_name ) ? $subscriber->last_name : '';
                return trim( $first . ' ' . $last );
            
            case 'email':
                return isset( $subscriber->email ) ? $subscriber->email : '';
            
            default:
                // Try to get from subscriber object directly
                return isset( $subscriber->{$property} ) ? $subscriber->{$property} : '';
        }
    }

    /**
     * Get product data
     *
     * @param string $property Property name (name, price, etc.)
     * @param object $product  Product object
     * @return string Value
     */
    private function get_product_data( $property, $product ) {
        if ( ! $product ) {
            return '';
        }

        switch ( $property ) {
            case 'name':
                return $product->get_name();
            
            case 'price':
                return $this->format_price( $product->get_price() );
            
            case 'regular_price':
                return $this->format_price( $product->get_regular_price() );
            
            case 'sale_price':
                $sale_price = $product->get_sale_price();
                return $sale_price ? $this->format_price( $sale_price ) : '';
            
            case 'sku':
                return $product->get_sku();
            
            case 'url':
                return get_permalink( $product->get_id() );
            
            case 'image_url':
                $image_id = $product->get_image_id();
                if ( $image_id ) {
                    $image_url = wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
                    return $image_url ? $image_url : '';
                }
                return wc_placeholder_img_src( 'woocommerce_thumbnail' );
            
            case 'add_to_cart_url':
                return $product->add_to_cart_url();
            
            case 'description':
                return $product->get_short_description();
            
            case 'id':
                return $product->get_id();
            
            default:
                return '';
        }
    }

    /**
     * Get wishlist data
     *
     * @param string $property   Property name (item_count, url)
     * @param object $subscriber FluentCRM subscriber
     * @return string Value
     */
    private function get_wishlist_data( $property, $subscriber ) {
        switch ( $property ) {
            case 'item_count':
                return $this->get_wishlist_item_count( $subscriber );
            
            case 'url':
                return $this->get_wishlist_url();
            
            default:
                return '';
        }
    }

    /**
     * Get wishlist item count for subscriber
     *
     * @param object $subscriber FluentCRM subscriber
     * @return string Item count
     */
    private function get_wishlist_item_count( $subscriber ) {
        if ( ! $subscriber || ! class_exists( 'WishCart_Wishlist_Handler' ) ) {
            return '0';
        }

        $email = isset( $subscriber->email ) ? $subscriber->email : '';
        
        if ( empty( $email ) ) {
            return '0';
        }

        // Try to get user by email
        $user = get_user_by( 'email', $email );
        $user_id = $user ? $user->ID : null;
        $session_id = null;

        // If no user, try to find guest session
        if ( ! $user_id && class_exists( 'wishcart_Guest_Handler' ) ) {
            global $wpdb;
            $guests_table = $wpdb->prefix . 'wishcart_guests';
            $guest = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT session_id FROM {$guests_table} WHERE guest_email = %s ORDER BY created_at DESC LIMIT 1",
                    $email
                ),
                ARRAY_A
            );
            if ( $guest ) {
                $session_id = $guest['session_id'];
            }
        }

        // Get wishlist handler
        $handler = new WishCart_Wishlist_Handler();
        $wishlists = $handler->get_wishlists( $user_id, $session_id );

        if ( empty( $wishlists ) ) {
            return '0';
        }

        // Count items in default wishlist
        $default_wishlist = $wishlists[0];
        $items = $handler->get_wishlist_items( $default_wishlist['id'] );

        return strval( count( $items ) );
    }

    /**
     * Get wishlist page URL
     *
     * @return string Wishlist URL
     */
    private function get_wishlist_url() {
        // Get wishlist page ID from options
        $page_id = get_option( 'wishcart_wishlist_page_id' );
        
        if ( $page_id ) {
            return get_permalink( $page_id );
        }

        // Fallback to site URL with wishlist path
        return home_url( '/wishlist/' );
    }

    /**
     * Format price with currency
     *
     * @param float $price Price value
     * @return string Formatted price
     */
    private function format_price( $price ) {
        if ( empty( $price ) && 0 !== $price && '0' !== $price ) {
            return '';
        }

        if ( function_exists( 'wc_price' ) ) {
            return strip_tags( wc_price( $price ) );
        }

        return number_format( floatval( $price ), 2 );
    }

    /**
     * Get available smart codes for the editor
     *
     * @return array Smart codes array
     */
    private function get_smart_codes() {
        return array(
            // Customer Data
            '{{wishcart.customer.first_name}}'  => __( 'Customer First Name', 'wishcart' ),
            '{{wishcart.customer.last_name}}'   => __( 'Customer Last Name', 'wishcart' ),
            '{{wishcart.customer.full_name}}'   => __( 'Customer Full Name', 'wishcart' ),
            '{{wishcart.customer.email}}'       => __( 'Customer Email', 'wishcart' ),
            
            // Product Data
            '{{wishcart.product.name}}'           => __( 'Product Name', 'wishcart' ),
            '{{wishcart.product.price}}'          => __( 'Current Product Price', 'wishcart' ),
            '{{wishcart.product.regular_price}}'  => __( 'Regular Price', 'wishcart' ),
            '{{wishcart.product.sale_price}}'     => __( 'Sale Price (if on sale)', 'wishcart' ),
            '{{wishcart.product.sku}}'            => __( 'Product SKU', 'wishcart' ),
            '##wishcart.product.url##'            => __( 'Product URL (button/link)', 'wishcart' ),
            '{{wishcart.product.image_url}}'      => __( 'Product Image URL', 'wishcart' ),
            '##wishcart.product.add_to_cart_url##' => __( 'Add to Cart URL (button/link)', 'wishcart' ),
            
            // Wishlist Data
            '{{wishcart.wishlist.item_count}}'  => __( 'Total Items in Wishlist', 'wishcart' ),
            '##wishcart.wishlist.url##'         => __( 'Wishlist Page URL (button/link)', 'wishcart' ),
        );
    }
}


