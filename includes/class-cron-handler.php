<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Cron Handler Class
 *
 * Manages WordPress cron jobs for background processing
 *
 * @category WordPress
 * @package  WishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Cron_Handler {

    /**
     * Constructor
     */
    public function __construct() {
        // Register cron hooks
        add_action('gowishcart_process_notifications', array($this, 'process_notifications'));
        add_action('gowishcart_check_price_drops', array($this, 'check_price_drops'));
        add_action('gowishcart_check_back_in_stock', array($this, 'check_back_in_stock'));
        add_action('gowishcart_cleanup_expired_guests', array($this, 'cleanup_expired_guests'));
        add_action('gowishcart_cleanup_expired_shares', array($this, 'cleanup_expired_shares'));
        add_action('gowishcart_recalculate_analytics', array($this, 'recalculate_analytics'));
        add_action('gowishcart_cleanup_old_data', array($this, 'cleanup_old_data'));
        add_action('gowishcart_process_time_based_campaigns', array($this, 'process_time_based_campaigns'));
        add_action('gowishcart_send_scheduled_email', array($this, 'send_scheduled_email'), 10, 4);
    }

    /**
     * Schedule all cron jobs
     *
     * @return void
     */
    public static function schedule_events() {
        // Process notification queue (every 5 minutes)
        if (!wp_next_scheduled('gowishcart_process_notifications')) {
            wp_schedule_event(time(), 'gowishcart_5min', 'gowishcart_process_notifications');
        }

        // Check for price drops (hourly)
        if (!wp_next_scheduled('gowishcart_check_price_drops')) {
            wp_schedule_event(time(), 'hourly', 'gowishcart_check_price_drops');
        }

        // Check for back-in-stock products (hourly)
        if (!wp_next_scheduled('gowishcart_check_back_in_stock')) {
            wp_schedule_event(time(), 'hourly', 'gowishcart_check_back_in_stock');
        }

        // Cleanup expired guest sessions (daily)
        if (!wp_next_scheduled('gowishcart_cleanup_expired_guests')) {
            wp_schedule_event(time(), 'daily', 'gowishcart_cleanup_expired_guests');
        }

        // Cleanup expired shares (daily)
        if (!wp_next_scheduled('gowishcart_cleanup_expired_shares')) {
            wp_schedule_event(time(), 'daily', 'gowishcart_cleanup_expired_shares');
        }

        // Recalculate analytics (daily)
        if (!wp_next_scheduled('gowishcart_recalculate_analytics')) {
            wp_schedule_event(time(), 'daily', 'gowishcart_recalculate_analytics');
        }

        // Cleanup old data (weekly)
        if (!wp_next_scheduled('gowishcart_cleanup_old_data')) {
            wp_schedule_event(time(), 'weekly', 'gowishcart_cleanup_old_data');
        }

        // Process time-based campaigns (daily)
        if (!wp_next_scheduled('gowishcart_process_time_based_campaigns')) {
            wp_schedule_event(time(), 'daily', 'gowishcart_process_time_based_campaigns');
        }
    }

    /**
     * Unschedule all cron jobs
     *
     * @return void
     */
    public static function unschedule_events() {
        $events = array(
            'gowishcart_process_notifications',
            'gowishcart_check_price_drops',
            'gowishcart_check_back_in_stock',
            'gowishcart_cleanup_expired_guests',
            'gowishcart_cleanup_expired_shares',
            'gowishcart_recalculate_analytics',
            'gowishcart_cleanup_old_data',
            'gowishcart_process_time_based_campaigns',
        );

        foreach ($events as $event) {
            $timestamp = wp_next_scheduled($event);
            if ($timestamp) {
                wp_unschedule_event($timestamp, $event);
            }
        }
    }

    /**
     * Register custom cron schedules
     *
     * @param array $schedules Existing schedules
     * @return array Modified schedules
     */
    public static function add_cron_schedules($schedules) {
        // Add 5-minute interval
        if (!isset($schedules['gowishcart_5min'])) {
            $schedules['gowishcart_5min'] = array(
                'interval' => 300, // 5 minutes in seconds
                'display' => __('Every 5 Minutes', 'gowishcart-wishlist-for-fluentcart'),
            );
        }

        return $schedules;
    }

    /**
     * Process notification queue
     *
     * @return void
     */
    public function process_notifications() {
        $notifications = new WishCart_Notifications_Handler();
        $result = $notifications->process_queue(10); // Process up to 10 notifications per run
    }

    /**
     * Check for price drops
     *
     * @return void
     */
    public function check_price_drops() {
        $notifications = new WishCart_Notifications_Handler();
        $result = $notifications->check_price_drops();
    }

    /**
     * Check for back-in-stock products
     *
     * @return void
     */
    public function check_back_in_stock() {
        $notifications = new WishCart_Notifications_Handler();
        $result = $notifications->check_back_in_stock();
    }

    /**
     * Cleanup expired guest sessions
     *
     * @return void
     */
    public function cleanup_expired_guests() {
        $guest_handler = new WishCart_Guest_Handler();
        
        // Get settings
        $settings = get_option('gowishcart_settings', array());
        $delete_data = isset($settings['wishlist']['delete_expired_guests']) ? (bool) $settings['wishlist']['delete_expired_guests'] : false;
        
        $result = $guest_handler->cleanup_expired_sessions($delete_data);
    }

    /**
     * Cleanup expired shares (Pro feature)
     *
     * @return void
     */
    public function cleanup_expired_shares() {
        // Sharing handler is a Pro feature - skip in free version
        if ( ! class_exists('WishCart_Sharing_Handler') ) {
            return;
        }
        
        $sharing = new WishCart_Sharing_Handler();
        $result = $sharing->cleanup_expired_shares();
    }

    /**
     * Recalculate analytics (Pro feature)
     *
     * @return void
     */
    public function recalculate_analytics() {
        // Analytics handler is a Pro feature - skip in free version
        if ( ! class_exists('WishCart_Analytics_Handler') ) {
            return;
        }
        
        $analytics = new WishCart_Analytics_Handler();
        $result = $analytics->recalculate_all_analytics();
    }

    /**
     * Cleanup old data (weekly maintenance)
     *
     * @return void
     */
    public function cleanup_old_data() {
        // Get settings
        $settings = get_option('gowishcart_settings', array());
        $activity_retention_days = isset($settings['wishlist']['activity_retention_days']) ? intval($settings['wishlist']['activity_retention_days']) : 365;
        $notification_retention_days = isset($settings['wishlist']['notification_retention_days']) ? intval($settings['wishlist']['notification_retention_days']) : 90;
        $analytics_retention_days = isset($settings['wishlist']['analytics_retention_days']) ? intval($settings['wishlist']['analytics_retention_days']) : 365;
        
        // Cleanup activities (anonymize instead of delete for audit)
        $activity_logger = new WishCart_Activity_Logger();
        $activity_result = $activity_logger->cleanup_old_activities($activity_retention_days, true);
        
        // Cleanup notifications
        $notifications = new WishCart_Notifications_Handler();
        $notification_result = $notifications->cleanup_old_notifications($notification_retention_days);
        
        // Cleanup analytics (Pro feature)
        $analytics_result = array('deleted' => 0);
        if ( class_exists('WishCart_Analytics_Handler') ) {
            $analytics = new WishCart_Analytics_Handler();
            $analytics_result = $analytics->cleanup_old_analytics($analytics_retention_days);
        }
        
        // Anonymize old guest data
        $guest_handler = new WishCart_Guest_Handler();
        $guest_result = $guest_handler->anonymize_old_guests(90);
    }

    /**
     * Get cron status
     *
     * @return array Status of all cron jobs
     */
    public static function get_cron_status() {
        $events = array(
            'gowishcart_process_notifications' => __('Process Notifications', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_check_price_drops' => __('Check Price Drops', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_check_back_in_stock' => __('Check Back in Stock', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_cleanup_expired_guests' => __('Cleanup Expired Guests', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_cleanup_expired_shares' => __('Cleanup Expired Shares', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_recalculate_analytics' => __('Recalculate Analytics', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_cleanup_old_data' => __('Cleanup Old Data', 'gowishcart-wishlist-for-fluentcart'),
            'gowishcart_process_time_based_campaigns' => __('Process Time-Based Campaigns', 'gowishcart-wishlist-for-fluentcart'),
        );

        $status = array();
        foreach ($events as $hook => $label) {
            $timestamp = wp_next_scheduled($hook);
            $status[] = array(
                'hook' => $hook,
                'label' => $label,
                'scheduled' => (bool) $timestamp,
                'next_run' => $timestamp ? gmdate('Y-m-d H:i:s', $timestamp) : null,
                'next_run_relative' => $timestamp ? human_time_diff($timestamp, time()) : null,
            );
        }

        return $status;
    }

    /**
     * Manually trigger a cron job (for testing/debugging)
     *
     * @param string $hook Cron hook name
     * @return array Result
     */
    public static function trigger_cron($hook) {
        $valid_hooks = array(
            'gowishcart_process_notifications',
            'gowishcart_check_price_drops',
            'gowishcart_check_back_in_stock',
            'gowishcart_cleanup_expired_guests',
            'gowishcart_cleanup_expired_shares',
            'gowishcart_recalculate_analytics',
            'gowishcart_cleanup_old_data',
            'gowishcart_process_time_based_campaigns',
        );

        if (!in_array($hook, $valid_hooks)) {
            return array(
                'success' => false,
                'message' => __('Invalid cron hook', 'gowishcart-wishlist-for-fluentcart'),
            );
        }

        // Trigger the action
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound
        do_action($hook);

        return array(
            'success' => true,
            /* translators: %s: cron job hook name */
            'message' => sprintf(__('Cron job %s triggered successfully', 'gowishcart-wishlist-for-fluentcart'), $hook),
        );
    }

    /**
     * Process time-based campaigns
     *
     * @return void
     */
    public function process_time_based_campaigns() {
        if (class_exists('WishCart_CRM_Campaign_Handler')) {
            $campaign_handler = new WishCart_CRM_Campaign_Handler();
            $campaign_handler->process_time_based_campaigns();
        }
    }

    /**
     * Send scheduled email
     *
     * @param int $contact_id Contact ID
     * @param string $subject Email subject
     * @param string $body Email body
     * @param array $event_data Event data
     * @return void
     */
    public function send_scheduled_email($contact_id, $subject, $body, $event_data) {
        if (class_exists('WishCart_FluentCRM_Integration')) {
            $fluentcrm = new WishCart_FluentCRM_Integration();
            $options = array();
            if (isset($event_data['campaign_id'])) {
                $options['campaign_id'] = $event_data['campaign_id'];
            }
            $fluentcrm->send_email($contact_id, $subject, $body, $options);
        }
    }
}

