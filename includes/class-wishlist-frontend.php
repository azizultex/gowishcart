<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Wishlist Frontend Handler Class
 *
 * Handles frontend wishlist button rendering and hooks
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Wishlist_Frontend {

    private $handler;

    /**
     * Constructor
     */
    public function __construct() {
        $this->handler = new WishCart_Wishlist_Handler();
        
        // Enqueue scripts and styles
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
        
        // Output custom CSS
        add_action( 'wp_head', array( $this, 'output_custom_css' ) );
        
        // Hook into FluentCart product display
        $this->add_product_hooks();
        
        // Sync guest wishlist on login
        add_action( 'wp_login', array( $this, 'sync_on_login' ), 10, 2 );
    }

    /**
     * Get the configured wishlist button position with backwards compatibility.
     *
     * @param array|null $wishlist_settings Optional wishlist settings array.
     * @return string
     */
    private function get_button_position( $wishlist_settings = null ) {
        if ( null === $wishlist_settings ) {
            $settings = get_option( 'wishcart_settings', array() );
            $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();
        }

        $position = isset( $wishlist_settings['button_position'] ) ? $wishlist_settings['button_position'] : 'bottom';

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
    public function enqueue_scripts() {
        $settings = get_option( 'wishcart_settings', array() );
        $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();

        if ( empty( $wishlist_settings['enabled'] ) ) {
            return;
        }

        // Enqueue wishlist frontend script
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
        $session_id = $this->handler->get_or_create_session_id();
        
        // Get button customization settings
        $button_customization = isset( $wishlist_settings['button_customization'] ) ? $wishlist_settings['button_customization'] : array();
        $default_customization = WishCart_Wishlist_Page::get_default_settings();
        $button_customization = wp_parse_args( $button_customization, isset( $default_customization['button_customization'] ) ? $default_customization['button_customization'] : array() );
        
        wp_localize_script(
            'wishcart-wishlist-frontend',
            'wishcartWishlist',
            array(
                'apiUrl' => trailingslashit( rest_url( 'wishcart/v1' ) ),
                'nonce' => wp_create_nonce( 'wp_rest' ),
                'sessionId' => $session_id,
                'isLoggedIn' => is_user_logged_in(),
                'userId' => get_current_user_id(),
                'buttonPosition' => $this->get_button_position(),
                'enabled' => ! empty( $wishlist_settings['enabled'] ),
                'showOnProduct' => ! empty( $wishlist_settings['product_page_button'] ),
                'showOnShop' => ! empty( $wishlist_settings['shop_page_button'] ),
                'enableMultipleWishlists' => ! empty( $wishlist_settings['enable_multiple_wishlists'] ),
                'buttonCustomization' => array(
                    'product_page' => isset( $button_customization['product_page'] ) ? $button_customization['product_page'] : array(),
                    'product_listing' => isset( $button_customization['product_listing'] ) ? $button_customization['product_listing'] : array(),
                    'saved_product_page' => isset( $button_customization['saved_product_page'] ) ? $button_customization['saved_product_page'] : array(),
                    'saved_product_listing' => isset( $button_customization['saved_product_listing'] ) ? $button_customization['saved_product_listing'] : array(),
                    'colors' => isset( $button_customization['colors'] ) ? $button_customization['colors'] : array(), // Keep for backwards compatibility
                    'icon' => isset( $button_customization['icon'] ) ? $button_customization['icon'] : array(),
                    'labels' => isset( $button_customization['labels'] ) ? $button_customization['labels'] : array(),
                ),
            )
        );
    }

    /**
     * Add product hooks for wishlist button
     *
     * @return void
     */
    private function add_product_hooks() {
        $settings = get_option( 'wishcart_settings', array() );
        $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();
        
        if ( empty( $wishlist_settings['enabled'] ) ) {
            return;
        }

        // Hook for shop page (archive)
        if ( ! empty( $wishlist_settings['shop_page_button'] ) ) {
            // FluentCart shop hooks - try common hooks
            add_action( 'fluentcart_after_product_loop_item', array( $this, 'render_wishlist_button' ), 10 );
            add_action( 'woocommerce_after_shop_loop_item', array( $this, 'render_wishlist_button' ), 10 );
            add_action( 'fc_product_loop_item_end', array( $this, 'render_wishlist_button' ), 10 );
        }

        // Hook for product detail page
        if ( ! empty( $wishlist_settings['product_page_button'] ) ) {
            $position = $this->get_button_position( $wishlist_settings );

            $hook_map = array(
                'top' => array(
                    'fluentcart_before_add_to_cart_button',
                    'woocommerce_before_add_to_cart_button',
                ),
                'left' => array(
                    'fluentcart_before_add_to_cart_button',
                    'woocommerce_before_add_to_cart_button',
                ),
                'bottom' => array(
                    'fluentcart_after_add_to_cart_button',
                    'woocommerce_after_add_to_cart_button',
                ),
                'right' => array(
                    'fluentcart_after_add_to_cart_button',
                    'woocommerce_after_add_to_cart_button',
                ),
            );

            $selected_hooks = isset( $hook_map[ $position ] ) ? $hook_map[ $position ] : $hook_map['bottom'];

            foreach ( $selected_hooks as $hook_name ) {
                add_action( $hook_name, array( $this, 'render_wishlist_button' ), 10 );
            }
        }
    }

    /**
     * Render wishlist button
     *
     * @param int|null $product_id Product ID (optional, will try to get from global)
     * @return void
     */
    public function render_wishlist_button( $product_id = null ) {
        if ( empty( $product_id ) ) {
            global $product, $post;
            
            if ( is_object( $product ) && method_exists( $product, 'get_id' ) ) {
                $product_id = $product->get_id();
            } elseif ( $post ) {
                $product_id = $post->ID;
            }
        }

        if ( empty( $product_id ) ) {
            return;
        }

        // Check if it's a FluentCart product
        $product_type = WishCart_FluentCart_Helper::get_product_post_type();
        $post_type = get_post_type( $product_id );
        
        if ( $post_type !== $product_type && $post_type !== 'product' ) {
            return;
        }

        $position = $this->get_button_position();
        $classes = array(
            'wishcart-wishlist-button-container',
            'wishcart-position-' . $position,
        );

        // Render button container (React will mount here)
        echo '<div class="' . esc_attr( implode( ' ', $classes ) ) . '" data-product-id="' . esc_attr( $product_id ) . '" data-position="' . esc_attr( $position ) . '"></div>';
    }

    /**
     * Sync guest wishlist on user login
     *
     * @param string $user_login User login name
     * @param WP_User $user User object
     * @return void
     */
    public function sync_on_login( $user_login, $user ) {
        // Get session ID from cookie
        $cookie_name = 'wishcart_session_id';
        if ( ! isset( $_COOKIE[ $cookie_name ] ) || empty( $_COOKIE[ $cookie_name ] ) ) {
            return;
        }

        $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ $cookie_name ] ) );
        
        // Sync wishlist
        $this->handler->sync_guest_wishlist_to_user( $session_id, $user->ID );
    }

    /**
     * Output custom CSS from settings
     *
     * @return void
     */
    public function output_custom_css() {
        $settings = get_option( 'wishcart_settings', array() );
        $wishlist_settings = isset( $settings['wishlist'] ) ? $settings['wishlist'] : array();
        $button_customization = isset( $wishlist_settings['button_customization'] ) ? $wishlist_settings['button_customization'] : array();
        
        $css_parts = array();
        
        // Generate CSS from product_page customization settings
        // Note: Product listing styles come after and have higher specificity (.wishcart-card-container .wishcart-wishlist-button)
        $product_page = isset( $button_customization['product_page'] ) ? $button_customization['product_page'] : array();
        if ( ! empty( $product_page ) ) {
            $css_parts[] = '/* Product Page Button Styles */';
            // Product page buttons are those NOT inside .wishcart-card-container
            // Since listing styles come after with higher specificity, they will override when applicable
            $css_parts[] = '.wishcart-wishlist-button-container:not(.wishcart-card-container) .wishcart-wishlist-button {';

            if ( ! empty( $product_page['backgroundColor'] ) ) {
                $background = $product_page['backgroundColor'];
                // Use background for gradients, background-color for solid colors
                if ( false !== stripos( $background, 'gradient(' ) ) {
                    $css_parts[] = '  background: ' . esc_attr( $background ) . ';';
                } else {
                    $css_parts[] = '  background-color: ' . esc_attr( $background ) . ';';
                }
            }
            if ( ! empty( $product_page['buttonTextColor'] ) ) {
                $css_parts[] = '  color: ' . esc_attr( $product_page['buttonTextColor'] ) . ';';
            }
            if ( ! empty( $product_page['font'] ) && $product_page['font'] !== 'default' ) {
                $css_parts[] = '  font-family: ' . esc_attr( $product_page['font'] ) . ';';
            }
            if ( ! empty( $product_page['fontSize'] ) ) {
                $css_parts[] = '  font-size: ' . esc_attr( $product_page['fontSize'] ) . ';';
            }
            if ( ! empty( $product_page['borderRadius'] ) ) {
                $css_parts[] = '  border-radius: ' . esc_attr( $product_page['borderRadius'] ) . ';';
            }
            
            $css_parts[] = '}';
            
            // Hover state
            if ( ! empty( $product_page['backgroundHoverColor'] ) || ! empty( $product_page['buttonTextHoverColor'] ) ) {
                $css_parts[] = '.wishcart-wishlist-button-container:not(.wishcart-card-container) .wishcart-wishlist-button:hover:not(:disabled) {';
                if ( ! empty( $product_page['backgroundHoverColor'] ) ) {
                    $background_hover = $product_page['backgroundHoverColor'];
                    // Use background for gradients, background-color for solid colors
                    if ( false !== stripos( $background_hover, 'gradient(' ) ) {
                        $css_parts[] = '  background: ' . esc_attr( $background_hover ) . ';';
                    } else {
                        $css_parts[] = '  background-color: ' . esc_attr( $background_hover ) . ';';
                    }
                }
                if ( ! empty( $product_page['buttonTextHoverColor'] ) ) {
                    $css_parts[] = '  color: ' . esc_attr( $product_page['buttonTextHoverColor'] ) . ';';
                }
                $css_parts[] = '}';
            }
            
            // Icon size for product page
            if ( ! empty( $product_page['iconSize'] ) ) {
                $css_parts[] = '.wishcart-wishlist-button-container:not(.wishcart-card-container) .wishcart-wishlist-button .wishcart-wishlist-button__icon {';
                $css_parts[] = '  width: ' . esc_attr( $product_page['iconSize'] ) . ';';
                $css_parts[] = '  height: ' . esc_attr( $product_page['iconSize'] ) . ';';
                $css_parts[] = '}';
            }
        }
        
        // Generate CSS from product_listing customization settings
        // This comes after product_page styles and uses more specific selector to override
        $product_listing = isset( $button_customization['product_listing'] ) ? $button_customization['product_listing'] : array();
        if ( ! empty( $product_listing ) ) {
            $css_parts[] = '/* Product Listing Button Styles */';
            // More specific selector will override product page styles when button is inside .wishcart-card-container
            $css_parts[] = '.wishcart-card-container .wishcart-wishlist-button {';

            if ( ! empty( $product_listing['backgroundColor'] ) ) {
                $background = $product_listing['backgroundColor'];
                // Use background for gradients, background-color for solid colors
                if ( false !== stripos( $background, 'gradient(' ) ) {
                    $css_parts[] = '  background: ' . esc_attr( $background ) . ';';
                } else {
                    $css_parts[] = '  background-color: ' . esc_attr( $background ) . ';';
                }
            }
            if ( ! empty( $product_listing['buttonTextColor'] ) ) {
                $css_parts[] = '  color: ' . esc_attr( $product_listing['buttonTextColor'] ) . ';';
            }
            if ( ! empty( $product_listing['font'] ) && $product_listing['font'] !== 'default' ) {
                $css_parts[] = '  font-family: ' . esc_attr( $product_listing['font'] ) . ';';
            }
            if ( ! empty( $product_listing['fontSize'] ) ) {
                $css_parts[] = '  font-size: ' . esc_attr( $product_listing['fontSize'] ) . ';';
            }
            if ( ! empty( $product_listing['borderRadius'] ) ) {
                $css_parts[] = '  border-radius: ' . esc_attr( $product_listing['borderRadius'] ) . ';';
            }
            
            $css_parts[] = '}';
            
            // Hover state for product listing
            if ( ! empty( $product_listing['backgroundHoverColor'] ) || ! empty( $product_listing['buttonTextHoverColor'] ) ) {
                $css_parts[] = '.wishcart-card-container .wishcart-wishlist-button:hover:not(:disabled) {';
                if ( ! empty( $product_listing['backgroundHoverColor'] ) ) {
                    $background_hover = $product_listing['backgroundHoverColor'];
                    // Use background for gradients, background-color for solid colors
                    if ( false !== stripos( $background_hover, 'gradient(' ) ) {
                        $css_parts[] = '  background: ' . esc_attr( $background_hover ) . ';';
                    } else {
                        $css_parts[] = '  background-color: ' . esc_attr( $background_hover ) . ';';
                    }
                }
                if ( ! empty( $product_listing['buttonTextHoverColor'] ) ) {
                    $css_parts[] = '  color: ' . esc_attr( $product_listing['buttonTextHoverColor'] ) . ';';
                }
                $css_parts[] = '}';
            }
            
            // Icon size for product listing
            if ( ! empty( $product_listing['iconSize'] ) ) {
                $css_parts[] = '.wishcart-card-container .wishcart-wishlist-button .wishcart-wishlist-button__icon {';
                $css_parts[] = '  width: ' . esc_attr( $product_listing['iconSize'] ) . ';';
                $css_parts[] = '  height: ' . esc_attr( $product_listing['iconSize'] ) . ';';
                $css_parts[] = '}';
            }
        }
        
        // Output generated CSS
        if ( ! empty( $css_parts ) ) {
            echo '<style id="wishcart-wishlist-generated-css">' . "\n";
            echo implode( "\n", $css_parts ) . "\n";
            echo '</style>' . "\n";
        }
        
        // Output custom CSS from text field
        $custom_css = isset( $wishlist_settings['custom_css'] ) ? $wishlist_settings['custom_css'] : '';
        if ( ! empty( $custom_css ) ) {
            echo '<style id="wishcart-wishlist-custom-css">' . wp_strip_all_tags( $custom_css ) . '</style>' . "\n";
        }
    }

    /**
     * Check if current page is a product page
     *
     * @return bool
     */
    private function is_product_page() {
        $product_type = WishCart_FluentCart_Helper::get_product_post_type();
        
        return is_singular( $product_type ) || 
               is_singular( 'product' ) || 
               is_post_type_archive( $product_type ) ||
               is_post_type_archive( 'product' ) ||
               ( function_exists( 'is_shop' ) && is_shop() );
    }
}

