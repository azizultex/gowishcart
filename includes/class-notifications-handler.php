<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Notifications Handler Class
 *
 * Handles email notifications for wishlist events
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class GoWishCart_Notifications_Handler {

    private $wpdb;
    private $notifications_table;
    private $fluentcrm;

    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->notifications_table = $wpdb->prefix . 'gwc_wishlist_notifications';
        
        // Initialize FluentCRM integration if available
        if (class_exists('GoWishCart_FluentCRM_Integration')) {
            $this->fluentcrm = new GoWishCart_FluentCRM_Integration();
        }
    }

    /**
     * Queue notification
     *
     * @param string $notification_type Type of notification
     * @param string $email_to Recipient email
     * @param array $data Notification data
     * @return int|WP_Error Notification ID or error
     */
    public function queue_notification($notification_type, $email_to, $data = array()) {
        $valid_types = array('price_drop', 'back_in_stock', 'promotional', 'reminder', 'share_notification', 'estimate_request');
        
        if (!in_array($notification_type, $valid_types)) {
            return new WP_Error('invalid_type', __('Invalid notification type', 'gowishcart-wishlist-for-fluentcart'));
        }

        if (!is_email($email_to)) {
            return new WP_Error('invalid_email', __('Invalid email address', 'gowishcart-wishlist-for-fluentcart'));
        }

        $user_id = isset($data['user_id']) ? intval($data['user_id']) : null;
        $wishlist_id = isset($data['wishlist_id']) ? intval($data['wishlist_id']) : null;
        $product_id = isset($data['product_id']) ? intval($data['product_id']) : null;

        // Generate email content based on type
        $email_data = $this->generate_email_content($notification_type, $data);

        $insert_data = array(
            'user_id' => $user_id,
            'wishlist_id' => $wishlist_id,
            'product_id' => $product_id,
            'notification_type' => $notification_type,
            'email_to' => $email_to,
            'email_subject' => $email_data['subject'],
            'email_content' => $email_data['content'],
            'trigger_data' => isset($data['trigger_data']) ? wp_json_encode($data['trigger_data']) : null,
            'scheduled_date' => isset($data['scheduled_date']) ? $data['scheduled_date'] : current_time('mysql'),
            'status' => 'pending',
        );

        $format = array('%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s');

        $result = $this->wpdb->insert($this->notifications_table, $insert_data, $format);

        if (false === $result) {
            return new WP_Error('db_error', __('Failed to queue notification', 'gowishcart-wishlist-for-fluentcart'));
        }

        return $this->wpdb->insert_id;
    }

    /**
     * Generate email content based on notification type
     *
     * @param string $notification_type Notification type
     * @param array $data Data for email generation
     * @return array Array with 'subject' and 'content'
     */
    private function generate_email_content($notification_type, $data) {
        $site_name = get_bloginfo('name');
        $subject = '';
        $content = '';

        switch ($notification_type) {
            case 'price_drop':
                $product_name = isset($data['product_name']) ? $data['product_name'] : __('Product', 'gowishcart-wishlist-for-fluentcart');
                $old_price = isset($data['old_price']) ? $data['old_price'] : '';
                $new_price = isset($data['new_price']) ? $data['new_price'] : '';
                $product_url = isset($data['product_url']) ? $data['product_url'] : '';

                /* translators: %1$s: Product name */
                $subject = sprintf(__('Price Drop Alert: %1$s', 'gowishcart-wishlist-for-fluentcart'), $product_name);
                $content = sprintf(
                    /* translators: %1$s: Newline, %2$s: Newline, %3$s: Product name, %4$s: Newline, %5$s: Old price, %6$s: Newline, %7$s: New price, %8$s: Newlines, %9$s: Newline, %10$s: Product URL */
                    __('Good news! A product in your wishlist has dropped in price.%1$s%2$sProduct: %3$s%4$sOld Price: %5$s%6$sNew Price: %7$s%8$s%9$sView Product: %10$s', 'gowishcart-wishlist-for-fluentcart'),
                    "\n\n",
                    "\n",
                    $product_name,
                    "\n",
                    $old_price,
                    "\n",
                    $new_price,
                    "\n\n",
                    "\n",
                    $product_url
                );
                break;

            case 'back_in_stock':
                $product_name = isset($data['product_name']) ? $data['product_name'] : __('Product', 'gowishcart-wishlist-for-fluentcart');
                $product_url = isset($data['product_url']) ? $data['product_url'] : '';

                /* translators: %1$s: Product name */
                $subject = sprintf(__('Back in Stock: %1$s', 'gowishcart-wishlist-for-fluentcart'), $product_name);
                $content = sprintf(
                    /* translators: %1$s: Newline, %2$s: Newline, %3$s: Product name, %4$s: Newlines, %5$s: Newline, %6$s: Product URL */
                    __('Great news! A product in your wishlist is back in stock.%1$s%2$sProduct: %3$s%4$s%5$sView Product: %6$s', 'gowishcart-wishlist-for-fluentcart'),
                    "\n\n",
                    "\n",
                    $product_name,
                    "\n\n",
                    "\n",
                    $product_url
                );
                break;

            case 'promotional':
                $subject = isset($data['subject']) ? $data['subject'] : __('Special Offer on Your Wishlist', 'gowishcart-wishlist-for-fluentcart');
                $content = isset($data['message']) ? $data['message'] : '';
                break;

            case 'reminder':
                $wishlist_name = isset($data['wishlist_name']) ? $data['wishlist_name'] : __('Your Wishlist', 'gowishcart-wishlist-for-fluentcart');
                $wishlist_url = isset($data['wishlist_url']) ? $data['wishlist_url'] : '';
                $item_count = isset($data['item_count']) ? intval($data['item_count']) : 0;

                /* translators: %1$d: Item count */
                $subject = sprintf(__('Reminder: You have %1$d items in your wishlist', 'gowishcart-wishlist-for-fluentcart'), $item_count);
                $content = sprintf(
                    /* translators: %1$s: Newline, %2$s: Newline, %3$d: Item count, %4$s: Wishlist name, %5$s: Newlines, %6$s: Newline, %7$s: Wishlist URL */
                    __('Hi there,%1$s%2$sJust a friendly reminder that you have %3$d items waiting in your wishlist "%4$s".%5$s%6$sView Your Wishlist: %7$s', 'gowishcart-wishlist-for-fluentcart'),
                    "\n\n",
                    "\n\n",
                    $item_count,
                    $wishlist_name,
                    "\n\n",
                    "\n",
                    $wishlist_url
                );
                break;

            case 'share_notification':
                $shared_by = isset($data['shared_by']) ? $data['shared_by'] : __('Someone', 'gowishcart-wishlist-for-fluentcart');
                $wishlist_name = isset($data['wishlist_name']) ? $data['wishlist_name'] : __('a wishlist', 'gowishcart-wishlist-for-fluentcart');
                $wishlist_url = isset($data['wishlist_url']) ? $data['wishlist_url'] : '';
                $message = isset($data['message']) ? $data['message'] : '';

                /* translators: %1$s: Shared by name, %2$s: Wishlist name */
                $subject = sprintf(__('%1$s shared %2$s with you', 'gowishcart-wishlist-for-fluentcart'), $shared_by, $wishlist_name);
                $content = sprintf(
                    /* translators: %1$s: Newline, %2$s: Newline, %3$s: Shared by name, %4$s: Wishlist name */
                    __('Hi,%1$s%2$s%3$s has shared a wishlist with you: "%4$s"', 'gowishcart-wishlist-for-fluentcart'),
                    "\n\n",
                    "\n\n",
                    $shared_by,
                    $wishlist_name
                );

                if (!empty($message)) {
                    $content .= "\n\n" . __('Message:', 'gowishcart-wishlist-for-fluentcart') . "\n" . $message;
                }

                $content .= "\n\n" . __('View Wishlist:', 'gowishcart-wishlist-for-fluentcart') . "\n" . $wishlist_url;
                break;

            case 'estimate_request':
                $subject = __('Wishlist Estimate Request', 'gowishcart-wishlist-for-fluentcart');
                $content = isset($data['message']) ? $data['message'] : '';
                break;

            default:
                $subject = __('Wishlist Notification', 'gowishcart-wishlist-for-fluentcart');
                $content = isset($data['message']) ? $data['message'] : '';
        }

        // Add footer
        /* translators: %1$s: Site name */
        $content .= "\n\n---\n" . sprintf(__('This email was sent by %1$s', 'gowishcart-wishlist-for-fluentcart'), $site_name);

        return array(
            'subject' => $subject,
            'content' => $content,
        );
    }

    /**
     * Process notification queue (send pending notifications)
     *
     * @param int $limit Number of notifications to process
     * @return array Results
     */
    public function process_queue($limit = 10) {
        $results = array(
            'success' => true,
            'sent' => 0,
            'failed' => 0,
            'errors' => array(),
        );

        // Get pending notifications
        // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $notifications = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM " . esc_sql($this->notifications_table) . "
                WHERE status = 'pending'
                    AND scheduled_date <= NOW()
                    AND attempts < 3
                ORDER BY scheduled_date ASC
                LIMIT %d",
                $limit
            ),
            ARRAY_A
        );
        // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        foreach ($notifications as $notification) {
            $send_result = $this->send_notification($notification['notification_id']);
            
            if (is_wp_error($send_result)) {
                $results['failed']++;
                $results['errors'][] = sprintf(
                    'Notification %d failed: %s',
                    $notification['notification_id'],
                    $send_result->get_error_message()
                );
            } else {
                $results['sent']++;
            }
        }

        return $results;
    }

    /**
     * Send notification
     *
     * @param int $notification_id Notification ID
     * @return bool|WP_Error Success or error
     */
    public function send_notification($notification_id) {
        $notification = $this->get_notification($notification_id);
        
        if (!$notification) {
            return new WP_Error('not_found', __('Notification not found', 'gowishcart-wishlist-for-fluentcart'));
        }

        // Increment attempts
        $this->wpdb->update(
            $this->notifications_table,
            array('attempts' => $notification['attempts'] + 1),
            array('notification_id' => $notification_id),
            array('%d'),
            array('%d')
        );

        // Try FluentCRM first if available and enabled
        $result = $this->send_via_fluentcrm($notification);
        
        // Fallback to wp_mail if FluentCRM fails or is not available
        if (is_wp_error($result)) {
            $result = wp_mail(
                $notification['email_to'],
                $notification['email_subject'],
                $notification['email_content'],
                array('Content-Type: text/plain; charset=UTF-8')
            );
        }

        if ($result && !is_wp_error($result)) {
            // Mark as sent
            $update_data = array(
                'status' => 'sent',
                'sent_date' => current_time('mysql'),
            );
            
            // Update CRM fields if available
            if (isset($notification['crm_contact_id']) && $notification['crm_contact_id']) {
                $update_data['crm_contact_id'] = $notification['crm_contact_id'];
            }
            if (isset($notification['crm_campaign_id']) && $notification['crm_campaign_id']) {
                $update_data['crm_campaign_id'] = $notification['crm_campaign_id'];
            }
            if (isset($notification['crm_email_id']) && $notification['crm_email_id']) {
                $update_data['crm_email_id'] = $notification['crm_email_id'];
            }
            
            $this->wpdb->update(
                $this->notifications_table,
                $update_data,
                array('notification_id' => $notification_id),
                array('%s', '%s', '%d', '%d', '%d'),
                array('%d')
            );

            return true;
        } else {
            // Mark as failed
            $error_message = is_wp_error($result) ? $result->get_error_message() : __('Failed to send email', 'gowishcart-wishlist-for-fluentcart');
            $this->wpdb->update(
                $this->notifications_table,
                array(
                    'status' => 'failed',
                    'error_message' => $error_message,
                ),
                array('notification_id' => $notification_id),
                array('%s', '%s'),
                array('%d')
            );

            return new WP_Error('send_failed', $error_message);
        }
    }

    /**
     * Send notification via FluentCRM
     *
     * @param array $notification Notification data
     * @return bool|WP_Error Success or error
     */
    public function send_via_fluentcrm($notification) {
        if (!$this->fluentcrm || !$this->fluentcrm->is_available()) {
            return new WP_Error('fluentcrm_not_available', __('FluentCRM is not available', 'gowishcart-wishlist-for-fluentcart'));
        }

        $settings = $this->fluentcrm->get_settings();
        if (!$settings['enabled']) {
            return new WP_Error('integration_disabled', __('FluentCRM integration is disabled', 'gowishcart-wishlist-for-fluentcart'));
        }

        // Get or create contact
        $contact_id = null;
        
        // Check if we already have a contact ID
        if (!empty($notification['crm_contact_id'])) {
            $contact_id = intval($notification['crm_contact_id']);
        } else {
            // Get contact by email or create new
            $contact = $this->fluentcrm->get_contact($notification['email_to']);
            
            if ($contact) {
                $contact_id = $contact->id;
            } else {
                // Create contact if user exists
                if (!empty($notification['user_id'])) {
                    $contact_id = $this->fluentcrm->sync_wishlist_user($notification['user_id']);
                    if (is_wp_error($contact_id)) {
                        return $contact_id;
                    }
                } else {
                    // Create contact from email
                    $contact_id = $this->fluentcrm->create_or_update_contact(null, $notification['email_to']);
                    if (is_wp_error($contact_id)) {
                        return $contact_id;
                    }
                }
            }
            
            // Update notification with contact ID
            if ($contact_id) {
                $this->wpdb->update(
                    $this->notifications_table,
                    array('crm_contact_id' => $contact_id),
                    array('notification_id' => $notification['notification_id']),
                    array('%d'),
                    array('%d')
                );
            }
        }

        if (!$contact_id) {
            return new WP_Error('no_contact', __('Could not create or find contact', 'gowishcart-wishlist-for-fluentcart'));
        }

        // Send email via FluentCRM
        $options = array();
        if (!empty($notification['crm_campaign_id'])) {
            $options['campaign_id'] = intval($notification['crm_campaign_id']);
        }

        $email_id = $this->fluentcrm->send_email(
            $contact_id,
            $notification['email_subject'],
            $notification['email_content'],
            $options
        );

        if (is_wp_error($email_id)) {
            return $email_id;
        }

        // Update notification with email ID
        if ($email_id && is_numeric($email_id)) {
            $this->wpdb->update(
                $this->notifications_table,
                array('crm_email_id' => $email_id),
                array('notification_id' => $notification['notification_id']),
                array('%d'),
                array('%d')
            );
        }

        return true;
    }

    /**
     * Get notification by ID
     *
     * @param int $notification_id Notification ID
     * @return array|null Notification data
     */
    public function get_notification($notification_id) {
        // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM " . esc_sql($this->notifications_table) . " WHERE notification_id = %d",
                $notification_id
            ),
            ARRAY_A
        );
        // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    }

    /**
     * Get user's notifications
     *
     * @param int $user_id User ID
     * @param string $status Status filter (pending, sent, failed, cancelled)
     * @return array Array of notifications
     */
    public function get_user_notifications($user_id, $status = null) {
        $params = array($user_id);
        $query = "SELECT * FROM " . esc_sql($this->notifications_table) . " WHERE user_id = %d";

        if ($status) {
            // Validate status against whitelist
            $allowed_statuses = array('pending', 'sent', 'failed', 'cancelled');
            
            if (in_array($status, $allowed_statuses, true)) {
                $query .= " AND status = %s";
                $params[] = $status;
            }
        }

        $query .= " ORDER BY date_created DESC LIMIT 100";

        // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Status is validated against whitelist and $wpdb->prepare() handles escaping
        return $this->wpdb->get_results(
            $this->wpdb->prepare($query, $params),
            ARRAY_A
        );
        // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    }

    /**
     * Track email open
     *
     * @param int $notification_id Notification ID
     * @return bool Success
     */
    public function track_email_open($notification_id) {
        $result = $this->wpdb->update(
            $this->notifications_table,
            array('opened_date' => current_time('mysql')),
            array('notification_id' => $notification_id),
            array('%s'),
            array('%d')
        );

        return $result !== false;
    }

    /**
     * Track email click
     *
     * @param int $notification_id Notification ID
     * @return bool Success
     */
    public function track_email_click($notification_id) {
        $result = $this->wpdb->update(
            $this->notifications_table,
            array('clicked_date' => current_time('mysql')),
            array('notification_id' => $notification_id),
            array('%s'),
            array('%d')
        );

        return $result !== false;
    }

    /**
     * Cancel notification
     *
     * @param int $notification_id Notification ID
     * @return bool|WP_Error Success or error
     */
    public function cancel_notification($notification_id) {
        $result = $this->wpdb->update(
            $this->notifications_table,
            array('status' => 'cancelled'),
            array('notification_id' => $notification_id),
            array('%s'),
            array('%d')
        );

        if (false === $result) {
            return new WP_Error('db_error', __('Failed to cancel notification', 'gowishcart-wishlist-for-fluentcart'));
        }

        return true;
    }

    /**
     * Check for price drops and queue notifications
     *
     * @return array Results
     */
    public function check_price_drops() {
        $results = array(
            'success' => true,
            'notifications_queued' => 0,
            'errors' => array(),
        );

        // Get all active wishlist items with prices
        $items_table = GoWishCart_Table_Names::get_table( GoWishCart_Table_Names::WISHLIST_ITEMS );
        $wishlists_table = GoWishCart_Table_Names::get_table( GoWishCart_Table_Names::WISHLISTS );

        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $items = $this->wpdb->get_results(
            "SELECT wi.*, w.user_id, w.wishlist_token
            FROM " . esc_sql($items_table) . " wi
            JOIN " . esc_sql($wishlists_table) . " w ON wi.wishlist_id = w.id
            WHERE wi.status = 'active'
                AND wi.original_price IS NOT NULL
                AND w.status = 'active'",
            ARRAY_A
        );
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        foreach ($items as $item) {
            $product = GoWishCart_FluentCart_Helper::get_product($item['product_id']);
            
            if (!$product) {
                continue;
            }

            $current_price = $product->get_price();
            $original_price = floatval($item['original_price']);

            // Check if price dropped
            if ($current_price < $original_price) {
                // Get user email
                if ($item['user_id']) {
                    $user = get_userdata($item['user_id']);
                    if ($user && $user->user_email) {
                        // Queue notification
                        $notification_data = array(
                            'user_id' => $item['user_id'],
                            'wishlist_id' => $item['wishlist_id'],
                            'product_id' => $item['product_id'],
                            'product_name' => $product->get_name(),
                            'old_price' => $original_price,
                            'new_price' => $current_price,
                            'product_url' => get_permalink($item['product_id']),
                        );

                        $queue_result = $this->queue_notification('price_drop', $user->user_email, $notification_data);
                        
                        if (!is_wp_error($queue_result)) {
                            $results['notifications_queued']++;
                            
                            // Update original price
                            $this->wpdb->update(
                                $items_table,
                                array('original_price' => $current_price),
                                array('item_id' => $item['item_id']),
                                array('%f'),
                                array('%d')
                            );
                            
                            // Trigger CRM price drop event
                            $price_data = array(
                                'user_id' => $item['user_id'],
                                'wishlist_id' => $item['wishlist_id'],
                                'product_id' => $item['product_id'],
                                'product_name' => $product->get_name(),
                                'product_url' => get_permalink($item['product_id']),
                                'old_price' => $original_price,
                                'new_price' => $current_price,
                            );
                            do_action('gowishcart_price_drop_detected', $price_data);

                            // Fire FluentCRM automation trigger
                            if ( class_exists( 'GoWishCart_FluentCRM_Triggers' ) ) {
                                GoWishCart_FluentCRM_Triggers::fire_trigger( 'gowishcart_price_drop', $price_data );
                            }
                        }
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Check for back-in-stock products and queue notifications
     *
     * @return array Results
     */
    public function check_back_in_stock() {
        $results = array(
            'success' => true,
            'notifications_queued' => 0,
            'errors' => array(),
        );

        // Get all wishlist items
        $items_table = GoWishCart_Table_Names::get_table( GoWishCart_Table_Names::WISHLIST_ITEMS );
        $wishlists_table = GoWishCart_Table_Names::get_table( GoWishCart_Table_Names::WISHLISTS );

        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $items = $this->wpdb->get_results(
            "SELECT wi.*, w.user_id
            FROM " . esc_sql($items_table) . " wi
            JOIN " . esc_sql($wishlists_table) . " w ON wi.wishlist_id = w.id
            WHERE wi.status = 'active'
                AND w.status = 'active'",
            ARRAY_A
        );
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        foreach ($items as $item) {
            $product = GoWishCart_FluentCart_Helper::get_product($item['product_id']);
            
            if (!$product) {
                continue;
            }

            // Check if product is now in stock (and was out of stock before)
            // This requires tracking stock status changes - simplified version
            if ($product->is_in_stock()) {
                // Get user email
                if ($item['user_id']) {
                    $user = get_userdata($item['user_id']);
                    if ($user && $user->user_email) {
                        // Check if we already sent a notification recently (avoid spam)
                        // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                        $recent_notification = $this->wpdb->get_var(
                            $this->wpdb->prepare(
                                "SELECT COUNT(*) FROM " . esc_sql($this->notifications_table) . "
                                WHERE user_id = %d
                                    AND product_id = %d
                                    AND notification_type = 'back_in_stock'
                                    AND date_created > DATE_SUB(NOW(), INTERVAL 7 DAY)",
                                $item['user_id'],
                                $item['product_id']
                            )
                        );
                        // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared

                        if ($recent_notification > 0) {
                            continue; // Skip if already notified recently
                        }

                        // Queue notification
                        $notification_data = array(
                            'user_id' => $item['user_id'],
                            'wishlist_id' => $item['wishlist_id'],
                            'product_id' => $item['product_id'],
                            'product_name' => $product->get_name(),
                            'product_url' => get_permalink($item['product_id']),
                        );

                        $queue_result = $this->queue_notification('back_in_stock', $user->user_email, $notification_data);
                        
                        if (!is_wp_error($queue_result)) {
                            $results['notifications_queued']++;
                            
                            // Trigger CRM back in stock event
                            $stock_data = array(
                                'user_id' => $item['user_id'],
                                'wishlist_id' => $item['wishlist_id'],
                                'product_id' => $item['product_id'],
                                'product_name' => $product->get_name(),
                                'product_url' => get_permalink($item['product_id']),
                            );
                            do_action('gowishcart_back_in_stock', $stock_data);

                            // Fire FluentCRM automation trigger
                            if ( class_exists( 'GoWishCart_FluentCRM_Triggers' ) ) {
                                GoWishCart_FluentCRM_Triggers::fire_trigger( 'gowishcart_back_in_stock', $stock_data );
                            }
                        }
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Get notification statistics
     *
     * @return array Statistics
     */
    public function get_statistics() {
        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $stats = $this->wpdb->get_row(
            "SELECT 
                COUNT(*) as total_notifications,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN opened_date IS NOT NULL THEN 1 ELSE 0 END) as opened_count,
                SUM(CASE WHEN clicked_date IS NOT NULL THEN 1 ELSE 0 END) as clicked_count
            FROM " . esc_sql($this->notifications_table),
            ARRAY_A
        );
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        // Calculate rates
        $sent_count = intval($stats['sent_count']);
        $stats['open_rate'] = $sent_count > 0 ? round((intval($stats['opened_count']) / $sent_count) * 100, 2) : 0;
        $stats['click_rate'] = $sent_count > 0 ? round((intval($stats['clicked_count']) / $sent_count) * 100, 2) : 0;

        return $stats;
    }

    /**
     * Clean up old notifications
     *
     * @param int $days Delete notifications older than X days
     * @return array Results
     */
    public function cleanup_old_notifications($days = 90) {
        $results = array(
            'success' => true,
            'deleted' => 0,
        );

        // Delete old sent/failed notifications
        // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $this->wpdb->query(
            $this->wpdb->prepare(
                "DELETE FROM " . esc_sql($this->notifications_table) . "
                WHERE status IN ('sent', 'failed', 'cancelled')
                    AND date_created < DATE_SUB(NOW(), INTERVAL %d DAY)",
                $days
            )
        );
        // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        $results['deleted'] = $result !== false ? $result : 0;

        return $results;
    }
}

