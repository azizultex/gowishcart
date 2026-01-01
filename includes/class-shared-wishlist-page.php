<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Shared Wishlist Page Handler
 *
 * Manages shared wishlist page functionality and URLs
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Shared_Wishlist_Page {

    /**
     * Get shared wishlist page ID
     *
     * @return int Page ID
     */
    public static function get_shared_page_id() {
        /**
         * New behavior:
         * Always prefer the main Wishlist Page as the target for shared wishlists.
         * This ensures the share URL uses the existing wishlist page URL
         * (with a query parameter) instead of a separate "Shareable Page".
         */
        if ( class_exists( 'WishCart_Wishlist_Page' ) ) {
            $wishlist_page_id = WishCart_Wishlist_Page::get_wishlist_page_id();
            if ( $wishlist_page_id ) {
                return intval( $wishlist_page_id );
            }
        }

        /**
         * Backward compatibility:
         * If no wishlist page is configured for some reason, fall back to any
         * legacy shared wishlist page configuration so existing installs keep working.
         */
        $settings = get_option( 'wishcart_settings', array() );

        if ( isset( $settings['wishlist']['shared_wishlist_page_id'] ) && $settings['wishlist']['shared_wishlist_page_id'] > 0 ) {
            return intval( $settings['wishlist']['shared_wishlist_page_id'] );
        }

        // Fallback to legacy option.
        return intval( get_option( 'wishcart_shared_wishlist_page_id', 0 ) );
    }

    /**
     * Get shared wishlist page URL
     *
     * @param string $token Share token
     * @return string Page URL with token parameter
     */
    public static function get_share_url( $token ) {
        $page_id = self::get_shared_page_id();

        if ( ! $page_id ) {
            // Fallback to /share?token={token}
            return home_url( '/share?token=' . urlencode( $token ) );
        }

        $page_url = get_permalink( $page_id );
        if ( ! $page_url ) {
            return home_url( '/share?token=' . urlencode( $token ) );
        }

        // Add token as query parameter to the wishlist page URL.
        return add_query_arg( 'token', $token, $page_url );
    }
}

