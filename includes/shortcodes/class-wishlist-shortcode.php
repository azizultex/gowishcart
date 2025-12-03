<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Wishlist Shortcode Handler
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Wishlist_Shortcode {

    /**
     * Constructor
     */
    public function __construct() {
        add_shortcode( 'WishCart_Wishlist', array( $this, 'render_wishlist' ) );
    }

    /**
     * Render wishlist shortcode
     *
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_wishlist( $atts ) {
        $atts = shortcode_atts( array(
            'share_code' => '',
        ), $atts, 'WishCart_Wishlist' );

        // Check for token query parameter first (shareable link)
        if ( isset( $_GET['token'] ) ) {
            $token = sanitize_text_field( $_GET['token'] );
            return $this->render_shared_wishlist_view( $token );
        }

        // Get share code from query var if not in shortcode
        if ( empty( $atts['share_code'] ) ) {
            $atts['share_code'] = get_query_var( 'wishlist_share_code', '' );
        }

        // Enqueue scripts and styles
        wp_enqueue_script(
            'wishcart-wishlist-frontend',
            WishCart_PLUGIN_URL . 'build/wishlist-frontend.js',
            array( 'wp-element', 'wp-api-fetch' ),
            WishCart_VERSION,
            true
        );

        wp_enqueue_style(
            'wishcart-wishlist-frontend',
            WishCart_PLUGIN_URL . 'build/wishlist-frontend.css',
            array(),
            WishCart_VERSION
        );

        // Localize script
        $handler = new WishCart_Wishlist_Handler();
        $session_id = $handler->get_or_create_session_id();
        
        // Get settings for enableMultipleWishlists
        $settings = get_option( 'wishcart_settings', array() );
        $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();
        $default_settings = WishCart_Wishlist_Page::get_default_settings();
        $wishlist_settings = wp_parse_args( $wishlist_settings, $default_settings );
        
        wp_localize_script(
            'wishcart-wishlist-frontend',
            'wishcartWishlist',
            array(
                'apiUrl' => trailingslashit( rest_url( 'wishcart/v1' ) ),
                'nonce' => wp_create_nonce( 'wp_rest' ),
                'sessionId' => $session_id,
                'isLoggedIn' => is_user_logged_in(),
                'userId' => get_current_user_id(),
                'shareCode' => sanitize_text_field( $atts['share_code'] ),
                'enableMultipleWishlists' => ! empty( $wishlist_settings['enable_multiple_wishlists'] ),
            )
        );

        // Return container for React component
        return '<div id="wishcart-wishlist-page"></div>';
    }

    /**
     * Render shared wishlist view for token-based shareable links
     *
     * @param string $token Share token
     * @return string HTML output
     */
    private function render_shared_wishlist_view( $token ) {
        // Enqueue scripts and styles for SharedWishlistView
        wp_enqueue_script(
            'wishcart-shared-wishlist',
            WishCart_PLUGIN_URL . 'build/wishlist-frontend.js',
            array( 'wp-element' ),
            WishCart_VERSION,
            true
        );

        wp_enqueue_style(
            'wishcart-shared-wishlist',
            WishCart_PLUGIN_URL . 'build/wishlist-frontend.css',
            array(),
            WishCart_VERSION
        );

        // Localize script for SharedWishlistView
        wp_localize_script(
            'wishcart-shared-wishlist',
            'wishcartShared',
            array(
                'apiUrl' => trailingslashit( rest_url( 'wishcart/v1' ) ),
                'shareToken' => sanitize_text_field( $token ),
                'nonce' => wp_create_nonce( 'wp_rest' ),
                'siteUrl' => home_url(),
                'isUserLoggedIn' => is_user_logged_in(),
            )
        );

        // Return SharedWishlistView container
        return '<div id="shared-wishlist-app" data-share-token="' . esc_attr( $token ) . '"></div>';
    }
}

new WishCart_Wishlist_Shortcode();

