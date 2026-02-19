<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Wishlist Button Shortcode Handler
 *
 * Provides shortcode [wishcart_sc id="99"] to manually add wishlist buttons
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class GoWishCart_Wishlist_Button_Shortcode {

    /**
     * Constructor
     */
    public function __construct() {
        add_shortcode( 'gowishcart_sc', array( $this, 'render_button' ) );
    }

    /**
     * Render wishlist button shortcode
     *
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_button( $atts ) {
        $atts = shortcode_atts( array(
            'id' => '',
            'position' => '',
        ), $atts, 'gowishcart_sc' );

        // Product ID is required
        $product_id = ! empty( $atts['id'] ) ? intval( $atts['id'] ) : 0;
        if ( empty( $product_id ) ) {
            return '';
        }

        // Validate product exists and is a valid product type
        $product = GoWishCart_FluentCart_Helper::get_product( $product_id );
        if ( ! $product ) {
            return '';
        }

        // Check if wishlist is enabled
        $settings = get_option( 'gowishcart_settings', array() );
        $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();
        if ( empty( $wishlist_settings['enabled'] ) ) {
            return '';
        }

        // Enqueue scripts and styles
        $this->enqueue_scripts();

        // Get position (use provided position or default from settings)
        $position = ! empty( $atts['position'] ) ? sanitize_text_field( $atts['position'] ) : $this->get_default_position( $wishlist_settings );
        
        // Validate position
        $valid_positions = array( 'top', 'bottom', 'left', 'right' );
        if ( ! in_array( $position, $valid_positions, true ) ) {
            $position = 'bottom';
        }

        // Render button container (React will mount here)
        $classes = array(
            'gowishcart-wishlist-button-container',
            'gowishcart-position-' . $position,
            'gowishcart-shortcode-button',
        );

        return '<div class="' . esc_attr( implode( ' ', $classes ) ) . '" data-product-id="' . esc_attr( $product_id ) . '" data-position="' . esc_attr( $position ) . '"></div>';
    }

    /**
     * Get default button position from settings
     *
     * @param array $wishlist_settings Wishlist settings array
     * @return string Position value
     */
    private function get_default_position( $wishlist_settings ) {
        $position = isset( $wishlist_settings['button_position'] ) ? $wishlist_settings['button_position'] : 'bottom';

        // Handle backwards compatibility
        if ( 'before' === $position ) {
            $position = 'top';
        } elseif ( 'after' === $position ) {
            $position = 'bottom';
        }

        $valid_positions = array( 'top', 'bottom', 'left', 'right' );
        if ( ! in_array( $position, $valid_positions, true ) ) {
            $position = 'bottom';
        }

        return $position;
    }

    /**
     * Enqueue frontend scripts and styles
     *
     * @return void
     */
    private function enqueue_scripts() {
        // Check if scripts are already enqueued
        if ( wp_script_is( 'gowishcart-wishlist-frontend', 'enqueued' ) ) {
            return;
        }

        // Enqueue wishlist frontend script
        wp_enqueue_script(
            'gowishcart-wishlist-frontend',
            GoWishCart_PLUGIN_URL . 'build/wishlist-frontend.js',
            array( 'wp-element', 'wp-api-fetch' ),
            GoWishCart_VERSION,
            true
        );

        wp_enqueue_style(
            'gowishcart-wishlist-frontend',
            GoWishCart_PLUGIN_URL . 'build/wishlist-frontend.css',
            array(),
            GoWishCart_VERSION
        );

        // Localize script if not already localized
        if ( ! wp_script_is( 'gowishcart-wishlist-frontend', 'localized' ) ) {
            $handler = new GoWishCart_Wishlist_Handler();
            $session_id = $handler->get_or_create_session_id();
            
            $settings = get_option( 'gowishcart_settings', array() );
            $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();
            
            // Get button customization settings
            $button_customization = isset( $wishlist_settings['button_customization'] ) ? $wishlist_settings['button_customization'] : array();
            $default_customization = GoWishCart_Wishlist_Page::get_default_settings();
            $button_customization = wp_parse_args( $button_customization, isset( $default_customization['button_customization'] ) ? $default_customization['button_customization'] : array() );
            
            wp_localize_script(
                'gowishcart-wishlist-frontend',
                'gowishcartWishlist',
                array(
                    'apiUrl' => trailingslashit( rest_url( 'gowishcart/v1' ) ),
                    'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                    'nonce' => wp_create_nonce( 'wp_rest' ),
                    'sessionId' => $session_id,
                    'isLoggedIn' => is_user_logged_in(),
                    'userId' => get_current_user_id(),
                    'buttonPosition' => $this->get_default_position( $wishlist_settings ),
                    'enabled' => ! empty( $wishlist_settings['enabled'] ),
                    'showOnProduct' => ! empty( $wishlist_settings['product_page_button'] ),
                    'showOnShop' => ! empty( $wishlist_settings['shop_page_button'] ),
                    'enableMultipleWishlists' => ! empty( $wishlist_settings['enable_multiple_wishlists'] ),
                    'buttonCustomization' => array(
                        'product_page' => isset( $button_customization['product_page'] ) ? $button_customization['product_page'] : array(),
                        'product_listing' => isset( $button_customization['product_listing'] ) ? $button_customization['product_listing'] : array(),
                        'saved_product_page' => isset( $button_customization['saved_product_page'] ) ? $button_customization['saved_product_page'] : array(),
                        'saved_product_listing' => isset( $button_customization['saved_product_listing'] ) ? $button_customization['saved_product_listing'] : array(),
                        'colors' => isset( $button_customization['colors'] ) ? $button_customization['colors'] : array(),
                        'icon' => isset( $button_customization['icon'] ) ? $button_customization['icon'] : array(),
                        'labels' => isset( $button_customization['labels'] ) ? $button_customization['labels'] : array(),
                        'buttonStyle' => isset( $button_customization['buttonStyle'] ) ? $button_customization['buttonStyle'] : 'button',
                    ),
                )
            );
        }
    }
}

new GoWishCart_Wishlist_Button_Shortcode();

