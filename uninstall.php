<?php

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

class WishCart_Uninstaller {

    /**
     * Array of table names
     *
     * @var array
     */
    private $tables;

    /**
     * Array of option names
     *
     * @var array
     */
    private $options;

    /**
     * Initialize the uninstaller
     */
    public function __construct() {
        $this->tables = [
            'wc_wishlists',
            'wc_wishlist_items',
            'wc_wishlist_notifications',
            'wc_wishlist_guest_users',
            'wc_wishlist_crm_campaigns',
        ];

        $this->options = [
            'wishcart_settings',
        ];
    }

    /**
     * Run the uninstallation process
     */
    public function uninstall() {
        $this->drop_tables();
        $this->remove_options();
        $this->clear_cache();
    }

    /**
     * Drop all plugin tables
     */
    private function drop_tables() {
        global $wpdb;
        // @codingStandardsIgnoreStart
        foreach ( $this->tables as $table ) {
            $table_name = $wpdb->prefix . $table;
            $wpdb->query("DROP TABLE IF EXISTS `" . esc_sql($table_name) . "`");
        }
        // @codingStandardsIgnoreEnd
    }

    /**
     * Remove all plugin options
     */
    private function remove_options() {
        // @codingStandardsIgnoreStart
        foreach ( $this->options as $option ) {
			delete_option( $option );
        }
        // @codingStandardsIgnoreEnd
    }

    /**
     * Clear WordPress cache
     */
    private function clear_cache() {
        // @codingStandardsIgnoreStart
        wp_cache_flush();
        // @codingStandardsIgnoreEnd
    }
}

// Execute the uninstallation
$wishcart_uninstaller = new WishCart_Uninstaller();
$wishcart_uninstaller->uninstall();
