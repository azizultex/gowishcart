<?php
if ( ! defined( 'ABSPATH' ) ) exit;
/**
 * Table name constants and helper for GoWishCart plugin
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */

/**
 * GoWishCart_Table_Names Class
 *
 * Centralizes database table base names (without wpdb prefix).
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class GoWishCart_Table_Names {

    const WISHLISTS              = 'gwc_wishlists';
    const WISHLIST_ITEMS         = 'gwc_wishlist_items';
    const WISHLIST_NOTIFICATIONS = 'gwc_wishlist_notifications';
    const WISHLIST_GUEST_USERS   = 'gwc_wishlist_guest_users';
    const WISHLIST_CRM_CAMPAIGNS = 'gwc_wishlist_crm_campaigns';

    /**
     * Return full table name including WordPress prefix.
     *
     * @param string $table_name One of the WISHLISTS, WISHLIST_ITEMS, etc. constants.
     * @return string Prefixed table name.
     */
    public static function get_table( $table_name ) {
        global $wpdb;
        return $wpdb->prefix . $table_name;
    }
}
