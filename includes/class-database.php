<?php
if ( ! defined( 'ABSPATH' ) ) exit;
/**
 * Database handling class for WishCart plugin
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */

/**
 * WishCart_Database Class
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Database {

    private $wpdb;
    private $table_prefix;

    /**
     * Initialize the database class
     *
     * @return void
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->table_prefix = $wpdb->prefix;
		
		$this->create_tables();
    }

    /**
     * Create required database tables (7-table structure)
     *
     * @since 2.0.0
     *
     * @return void
     */
    public function create_tables() {
		$charset_collate = $this->wpdb->get_charset_collate();

        // 1. Main Wishlists Table (wc_wishlists)
        $sql_wishlists = "CREATE TABLE IF NOT EXISTS {$this->table_prefix}wc_wishlists (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            wishlist_token varchar(64) NOT NULL UNIQUE,
            user_id bigint(20) UNSIGNED NULL DEFAULT NULL,
            session_id varchar(255) NULL DEFAULT NULL,
            wishlist_name varchar(255) NOT NULL DEFAULT 'My Wishlist',
            wishlist_slug varchar(255) NOT NULL,
            description text NULL,
            privacy_status enum('public', 'shared', 'private') DEFAULT 'private',
            is_default tinyint(1) DEFAULT 0,
            expiration_date datetime NULL DEFAULT NULL,
            dateadded datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            date_modified datetime NULL ON UPDATE CURRENT_TIMESTAMP,
            menu_order int(11) NOT NULL DEFAULT 0,
            wishlist_type varchar(50) DEFAULT 'wishlist',
            status varchar(20) DEFAULT 'active',
            PRIMARY KEY (id),
            KEY user_id_idx (user_id),
            KEY session_id_idx (session_id),
            KEY wishlist_token_idx (wishlist_token),
            KEY privacy_status_idx (privacy_status),
            KEY is_default_idx (is_default),
            KEY status_idx (status),
            KEY wishlist_slug_idx (wishlist_slug)
        ) ENGINE=InnoDB $charset_collate;";

        // 2. Wishlist Items Table (wc_wishlist_items)
        $sql_wishlist_items = "CREATE TABLE IF NOT EXISTS {$this->table_prefix}wc_wishlist_items (
            item_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            wishlist_id bigint(20) UNSIGNED NOT NULL,
            product_id bigint(20) UNSIGNED NOT NULL,
            variation_id bigint(20) UNSIGNED NULL DEFAULT 0,
            variation_data longtext NULL,
            quantity int(11) NOT NULL DEFAULT 1,
            date_added datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            position int(11) DEFAULT 0,
            original_price decimal(19,4) NULL,
            original_currency varchar(10) NULL,
            on_sale tinyint(1) DEFAULT 0,
            notes text NULL,
            user_id bigint(20) UNSIGNED NULL,
            date_added_to_cart datetime NULL,
            cart_item_key varchar(255) NULL,
            custom_attributes text NULL,
            status varchar(20) DEFAULT 'active',
            PRIMARY KEY (item_id),
            UNIQUE KEY wishlist_product_unique (wishlist_id, product_id, variation_id),
            KEY wishlist_id_idx (wishlist_id),
            KEY product_id_idx (product_id),
            KEY variation_id_idx (variation_id),
            KEY date_added_idx (date_added),
            KEY user_id_idx (user_id),
            KEY status_idx (status)
        ) ENGINE=InnoDB $charset_collate;";

        // 3. Wishlist Notifications Table (wc_wishlist_notifications)
        $sql_wishlist_notifications = "CREATE TABLE IF NOT EXISTS {$this->table_prefix}wc_wishlist_notifications (
            notification_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NULL,
            wishlist_id bigint(20) UNSIGNED NULL,
            product_id bigint(20) UNSIGNED NULL,
            notification_type enum('price_drop', 'back_in_stock', 'promotional', 'reminder', 'share_notification', 'estimate_request') NOT NULL,
            email_to varchar(255) NOT NULL,
            email_subject varchar(255) NULL,
            email_content longtext NULL,
            trigger_data text NULL,
            scheduled_date datetime NULL,
            sent_date datetime NULL,
            opened_date datetime NULL,
            clicked_date datetime NULL,
            status enum('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
            attempts int(3) DEFAULT 0,
            error_message text NULL,
            crm_contact_id bigint(20) UNSIGNED NULL,
            crm_campaign_id bigint(20) UNSIGNED NULL,
            crm_email_id bigint(20) UNSIGNED NULL,
            discount_code varchar(50) NULL,
            discount_expires datetime NULL,
            engagement_score decimal(5,2) NULL,
            conversion_value decimal(19,4) NULL,
            date_created datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (notification_id),
            KEY user_id_idx (user_id),
            KEY wishlist_id_idx (wishlist_id),
            KEY product_id_idx (product_id),
            KEY notification_type_idx (notification_type),
            KEY status_idx (status),
            KEY scheduled_date_idx (scheduled_date),
            KEY crm_contact_id_idx (crm_contact_id),
            KEY crm_campaign_id_idx (crm_campaign_id)
        ) ENGINE=InnoDB $charset_collate;";

   

        // 7. Guest Users Table (wc_wishlist_guest_users)
        $sql_wishlist_guest_users = "CREATE TABLE IF NOT EXISTS {$this->table_prefix}wc_wishlist_guest_users (
            guest_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            session_id varchar(255) NOT NULL UNIQUE,
            guest_email varchar(255) NULL,
            guest_name varchar(255) NULL,
            ip_address varchar(45) NULL,
            user_agent text NULL,
            wishlist_data longtext NULL,
            conversion_user_id bigint(20) UNSIGNED NULL,
            date_created datetime DEFAULT CURRENT_TIMESTAMP,
            date_expires datetime NULL,
            last_activity datetime NULL,
            PRIMARY KEY (guest_id),
            KEY session_id_idx (session_id),
            KEY guest_email_idx (guest_email),
            KEY date_expires_idx (date_expires),
            KEY conversion_user_id_idx (conversion_user_id)
        ) ENGINE=InnoDB $charset_collate;";

        // 8. CRM Campaigns Table (wc_wishlist_crm_campaigns)
        $sql_crm_campaigns = "CREATE TABLE IF NOT EXISTS {$this->table_prefix}wc_wishlist_crm_campaigns (
            campaign_id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            crm_campaign_id bigint(20) UNSIGNED NULL,
            wishlist_trigger_type enum('item_added', 'price_drop', 'back_in_stock', 'time_based', 'cart_abandoned_with_wishlist', 'wishlist_anniversary', 'multiple_wishlists', 'high_value_wishlist') NOT NULL,
            trigger_conditions longtext NULL,
            discount_type enum('percentage', 'fixed', 'free_shipping', 'bogo') NULL,
            discount_value decimal(10,2) NULL,
            email_sequence longtext NULL,
            target_segment longtext NULL,
            status enum('active', 'paused', 'completed') DEFAULT 'active',
            stats longtext NULL,
            date_created datetime DEFAULT CURRENT_TIMESTAMP,
            date_modified datetime NULL ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (campaign_id),
            KEY crm_campaign_id_idx (crm_campaign_id),
            KEY wishlist_trigger_type_idx (wishlist_trigger_type),
            KEY status_idx (status)
        ) ENGINE=InnoDB $charset_collate;";

        include_once ABSPATH . 'wp-admin/includes/upgrade.php';

        dbDelta($sql_wishlists);
        dbDelta($sql_wishlist_items);
        dbDelta($sql_wishlist_notifications);
        dbDelta($sql_wishlist_guest_users);
        dbDelta($sql_crm_campaigns);
		
		// Migrate existing notifications table if needed
		$this->migrate_notifications_table();
    }

    /**
     * Migrate existing notifications table to add CRM columns
     *
     * @return void
     */
    private function migrate_notifications_table() {
        $table_name = $this->table_prefix . 'wc_wishlist_notifications';
        
        // Check if CRM columns exist
        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table name is an identifier, not user-supplied data, and cannot be escaped.
        $columns = $this->wpdb->get_col("DESCRIBE {$table_name}");
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        
        $crm_columns = array(
            'crm_contact_id' => "ALTER TABLE {$table_name} ADD COLUMN crm_contact_id bigint(20) UNSIGNED NULL AFTER error_message",
            'crm_campaign_id' => "ALTER TABLE {$table_name} ADD COLUMN crm_campaign_id bigint(20) UNSIGNED NULL AFTER crm_contact_id",
            'crm_email_id' => "ALTER TABLE {$table_name} ADD COLUMN crm_email_id bigint(20) UNSIGNED NULL AFTER crm_campaign_id",
            'discount_code' => "ALTER TABLE {$table_name} ADD COLUMN discount_code varchar(50) NULL AFTER crm_email_id",
            'discount_expires' => "ALTER TABLE {$table_name} ADD COLUMN discount_expires datetime NULL AFTER discount_code",
            'engagement_score' => "ALTER TABLE {$table_name} ADD COLUMN engagement_score decimal(5,2) NULL AFTER discount_expires",
            'conversion_value' => "ALTER TABLE {$table_name} ADD COLUMN conversion_value decimal(19,4) NULL AFTER engagement_score"
        );
        
        foreach ($crm_columns as $column => $sql) {
            if (!in_array($column, $columns)) {
                // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared
                // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- ALTER TABLE DDL statement contains table/column identifiers that cannot be escaped.
                $this->wpdb->query($sql);
                // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared
                // Add indexes if needed
                if (in_array($column, array('crm_contact_id', 'crm_campaign_id'))) {
                    $index_name = $column . '_idx';
                    // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                    // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table, index, and column names are identifiers, not user-supplied data, and cannot be escaped.
                    $this->wpdb->query("ALTER TABLE {$table_name} ADD INDEX {$index_name} ({$column})");
                    // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                }
            }
        }
    }
}
