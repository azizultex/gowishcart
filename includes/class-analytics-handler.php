<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Analytics Handler Class
 *
 * Handles wishlist analytics tracking and reporting
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Analytics_Handler {

    private $wpdb;
    private $analytics_table;
    private $items_table;
    private $wishlists_table;
    private $shares_table;
    private $guest_users_table;
    private $notifications_table;

    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->analytics_table = $wpdb->prefix . 'fc_wishlist_analytics';
        $this->items_table = $wpdb->prefix . 'fc_wishlist_items';
        $this->wishlists_table = $wpdb->prefix . 'fc_wishlists';
        $this->shares_table = $wpdb->prefix . 'fc_wishlist_shares';
        $this->guest_users_table = $wpdb->prefix . 'fc_wishlist_guest_users';
        $this->notifications_table = $wpdb->prefix . 'fc_wishlist_notifications';
    }

    /**
     * Track event (add, remove, view, cart, purchase, share)
     *
     * @param int $product_id Product ID
     * @param int $variation_id Variation ID
     * @param string $event_type Event type
     * @return bool Success
     */
    public function track_event($product_id, $variation_id = 0, $event_type = 'view') {
        // Get or create analytics record
        $analytics = $this->get_or_create_analytics($product_id, $variation_id);
        
        if (!$analytics) {
            return false;
        }

        $update_data = array();
        $update_format = array();

        switch ($event_type) {
            case 'add':
                $update_data['wishlist_count'] = $analytics['wishlist_count'] + 1;
                $update_data['last_added_date'] = current_time('mysql');
                if (empty($analytics['first_added_date'])) {
                    $update_data['first_added_date'] = current_time('mysql');
                }
                $update_format = array('%d', '%s', '%s');
                break;

            case 'remove':
                $update_data['wishlist_count'] = max(0, $analytics['wishlist_count'] - 1);
                $update_format = array('%d');
                break;

            case 'view':
            case 'click':
                $update_data['click_count'] = $analytics['click_count'] + 1;
                $update_format = array('%d');
                break;

            case 'cart':
                $update_data['add_to_cart_count'] = $analytics['add_to_cart_count'] + 1;
                $update_format = array('%d');
                break;

            case 'purchase':
                $update_data['purchase_count'] = $analytics['purchase_count'] + 1;
                $update_data['last_purchased_date'] = current_time('mysql');
                $update_format = array('%d', '%s');
                break;

            case 'share':
                $update_data['share_count'] = $analytics['share_count'] + 1;
                $update_format = array('%d');
                break;

            default:
                return false;
        }

        // Calculate conversion rate
        if (isset($update_data['purchase_count']) || isset($update_data['wishlist_count'])) {
            $wishlist_count = isset($update_data['wishlist_count']) ? $update_data['wishlist_count'] : $analytics['wishlist_count'];
            $purchase_count = isset($update_data['purchase_count']) ? $update_data['purchase_count'] : $analytics['purchase_count'];
            
            if ($wishlist_count > 0) {
                $update_data['conversion_rate'] = round(($purchase_count / $wishlist_count) * 100, 2);
                $update_format[] = '%f';
            }
        }

        if (empty($update_data)) {
            return false;
        }

        $result = $this->wpdb->update(
            $this->analytics_table,
            $update_data,
            array(
                'product_id' => $product_id,
                'variation_id' => $variation_id,
            ),
            $update_format,
            array('%d', '%d')
        );

        return $result !== false;
    }

    /**
     * Get or create analytics record for product
     *
     * @param int $product_id Product ID
     * @param int $variation_id Variation ID
     * @return array|null Analytics data
     */
    private function get_or_create_analytics($product_id, $variation_id = 0) {
        $analytics = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->analytics_table} WHERE product_id = %d AND variation_id = %d",
                $product_id,
                $variation_id
            ),
            ARRAY_A
        );

        if (!$analytics) {
            // Create new analytics record
            $result = $this->wpdb->insert(
                $this->analytics_table,
                array(
                    'product_id' => $product_id,
                    'variation_id' => $variation_id,
                    'wishlist_count' => 0,
                    'click_count' => 0,
                    'add_to_cart_count' => 0,
                    'purchase_count' => 0,
                    'share_count' => 0,
                    'average_days_in_wishlist' => 0,
                    'conversion_rate' => 0,
                ),
                array('%d', '%d', '%d', '%d', '%d', '%d', '%d', '%f', '%f')
            );

            if ($result) {
                $analytics = $this->wpdb->get_row(
                    $this->wpdb->prepare(
                        "SELECT * FROM {$this->analytics_table} WHERE product_id = %d AND variation_id = %d",
                        $product_id,
                        $variation_id
                    ),
                    ARRAY_A
                );
            }
        }

        return $analytics;
    }

    /**
     * Get date range from time period string
     *
     * @param string $time_period Time period string (7days, 30days, 90days, 365days, all)
     * @return array Array with 'date_from' or null for 'all'
     */
    private function get_date_range_from_period($time_period) {
        if (empty($time_period) || $time_period === 'all') {
            return null;
        }

        $days = intval($time_period);
        if ($days <= 0) {
            return null;
        }

        $date_from = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        return $date_from;
    }

    /**
     * Get user information (name and email) from user_id or session_id
     *
     * @param int|null $user_id User ID
     * @param string|null $session_id Session ID
     * @param int|null $wishlist_id Optional wishlist ID for notification fallback
     * @return array Array with 'user_name' and 'email'
     */
    private function get_user_info($user_id = null, $session_id = null, $wishlist_id = null) {
        $user_name = null;
        $email = null;

        // If user_id exists, get from WordPress users table
        if (!empty($user_id)) {
            $user = get_userdata($user_id);
            if ($user) {
                $user_name = $user->display_name ? $user->display_name : $user->user_login;
                $email = $user->user_email;
            }
        }
        // If session_id exists, get from guest users table
        elseif (!empty($session_id)) {
            $guest = $this->wpdb->get_row(
                $this->wpdb->prepare(
                    "SELECT guest_email, guest_name FROM {$this->guest_users_table} WHERE session_id = %s ORDER BY date_created DESC LIMIT 1",
                    $session_id
                ),
                ARRAY_A
            );

            if ($guest) {
                $user_name = !empty($guest['guest_name']) ? $guest['guest_name'] : __('Guest', 'wishcart');
                $email = !empty($guest['guest_email']) ? $guest['guest_email'] : null;
            }

            // If no email found in guest_users, check notifications table as fallback
            if (empty($email)) {
                if (!empty($wishlist_id)) {
                    // Use wishlist_id directly if provided (more efficient)
                    $notification = $this->wpdb->get_var(
                        $this->wpdb->prepare(
                            "SELECT email_to FROM {$this->notifications_table} 
                            WHERE wishlist_id = %d
                            AND email_to IS NOT NULL AND email_to != ''
                            ORDER BY date_created DESC LIMIT 1",
                            $wishlist_id
                        )
                    );
                } else {
                    // Fallback to subquery if wishlist_id not provided
                    $notification = $this->wpdb->get_var(
                        $this->wpdb->prepare(
                            "SELECT email_to FROM {$this->notifications_table} 
                            WHERE wishlist_id IN (SELECT id FROM {$this->wishlists_table} WHERE session_id = %s)
                            AND email_to IS NOT NULL AND email_to != ''
                            ORDER BY date_created DESC LIMIT 1",
                            $session_id
                        )
                    );
                }

                if ($notification) {
                    $email = $notification;
                }
            }
        }

        return array(
            'user_name' => $user_name ? $user_name : __('Guest', 'wishcart'),
            'email' => $email ? $email : null,
            'is_guest' => empty($user_id),
        );
    }

    /**
     * Get popular products
     *
     * @param int $limit Number of products to return (deprecated, use $per_page)
     * @param string $order_by Order by field (wishlist_count, conversion_rate, share_count)
     * @param int $page Current page number
     * @param int $per_page Number of products per page
     * @param string $time_period Time period filter (7days, 30days, 90days, 365days, all)
     * @return array Array of popular products with analytics and pagination info
     */
    public function get_popular_products($limit = 10, $order_by = 'wishlist_count', $page = 1, $per_page = 10, $time_period = 'all') {
        $valid_order_fields = array('wishlist_count', 'conversion_rate', 'share_count', 'add_to_cart_count', 'purchase_count');
        
        if (!in_array($order_by, $valid_order_fields)) {
            $order_by = 'wishlist_count';
        }

        // Use per_page if provided, otherwise fall back to limit for backward compatibility
        $items_per_page = $per_page > 0 ? $per_page : ($limit > 0 ? $limit : 10);
        $current_page = max(1, intval($page));
        $offset = ($current_page - 1) * $items_per_page;

        // Get date range filter
        $date_from = $this->get_date_range_from_period($time_period);
        
        // Build WHERE clause and prepare parameters
        $where_conditions = array('wishlist_count > 0');
        $where_values = array();
        
        if ($date_from) {
            $where_conditions[] = "(last_added_date >= %s OR first_added_date >= %s)";
            $where_values[] = $date_from;
            $where_values[] = $date_from;
        }
        
        $where_clause = implode(' AND ', $where_conditions);

        // Get total count of unique products (grouped by product_id)
        if (!empty($where_values)) {
            $total = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT COUNT(DISTINCT product_id) FROM {$this->analytics_table} WHERE {$where_clause}",
                    $where_values
                )
            );
        } else {
            $total = $this->wpdb->get_var(
                "SELECT COUNT(DISTINCT product_id) FROM {$this->analytics_table} WHERE {$where_clause}"
            );
        }

        // Build ORDER BY clause for aggregated query
        // For aggregated fields, we need to use SUM() in ORDER BY
        $order_by_clause = '';
        if ($order_by === 'wishlist_count') {
            $order_by_clause = 'SUM(wishlist_count)';
        } elseif ($order_by === 'add_to_cart_count') {
            $order_by_clause = 'SUM(add_to_cart_count)';
        } elseif ($order_by === 'purchase_count') {
            $order_by_clause = 'SUM(purchase_count)';
        } elseif ($order_by === 'share_count') {
            $order_by_clause = 'SUM(share_count)';
        } elseif ($order_by === 'conversion_rate') {
            // For conversion_rate, calculate it from aggregated values
            $order_by_clause = 'CASE WHEN SUM(wishlist_count) > 0 THEN (SUM(purchase_count) / SUM(wishlist_count)) * 100 ELSE 0 END';
        } else {
            $order_by_clause = 'SUM(wishlist_count)';
        }

        // Get paginated results grouped by product_id
        // First, get product IDs that match the main filter (for pagination)
        // This determines which products to show in the list
        $product_ids_query = '';
        if (!empty($where_values)) {
            $product_ids_query = $this->wpdb->prepare(
                "SELECT DISTINCT product_id FROM {$this->analytics_table} WHERE {$where_clause}",
                $where_values
            );
        } else {
            $product_ids_query = "SELECT DISTINCT product_id FROM {$this->analytics_table} WHERE {$where_clause}";
        }
        
        $product_ids = $this->wpdb->get_col($product_ids_query);
        
        if (empty($product_ids)) {
            return array(
                'products' => array(),
                'pagination' => array(
                    'total' => 0,
                    'total_pages' => 0,
                    'current_page' => $current_page,
                    'per_page' => $items_per_page,
                ),
            );
        }
        
        // Now get aggregated data for these products, including ALL their variations
        // We don't filter variations here - we sum ALL variations for products that match the filter
        $placeholders = implode(',', array_fill(0, count($product_ids), '%d'));
        
        // Get all aggregated data for matching products (all variations included)
        $aggregation_query = $this->wpdb->prepare(
            "SELECT 
                product_id,
                SUM(wishlist_count) as wishlist_count,
                SUM(click_count) as click_count,
                SUM(add_to_cart_count) as add_to_cart_count,
                SUM(purchase_count) as purchase_count,
                SUM(share_count) as share_count,
                CASE WHEN SUM(wishlist_count) > 0 THEN (SUM(purchase_count) / SUM(wishlist_count)) * 100 ELSE 0 END as conversion_rate,
                AVG(average_days_in_wishlist) as average_days_in_wishlist
            FROM {$this->analytics_table} 
            WHERE product_id IN ($placeholders)
            GROUP BY product_id
            ORDER BY {$order_by_clause} DESC 
            LIMIT %d OFFSET %d",
            array_merge($product_ids, array($items_per_page, $offset))
        );
        
        $results = $this->wpdb->get_results($aggregation_query, ARRAY_A);

        // Enrich with product data and variations breakdown
        $products = array();
        foreach ($results as $row) {
            $product = WishCart_FluentCart_Helper::get_product($row['product_id']);
            if ($product) {
                // Get all wishlist items for this product (across all variations)
                $items = $this->wpdb->get_results(
                    $this->wpdb->prepare(
                        "SELECT i.wishlist_id, w.user_id, w.session_id
                        FROM {$this->items_table} i
                        INNER JOIN {$this->wishlists_table} w ON i.wishlist_id = w.id
                        WHERE i.product_id = %d 
                        AND i.status = 'active' AND w.status = 'active'",
                        $row['product_id']
                    ),
                    ARRAY_A
                );

                // Aggregate unique users/emails for this product (across all variations)
                $users_map = array();
                foreach ($items as $item) {
                    $user_info = $this->get_user_info(
                        !empty($item['user_id']) ? intval($item['user_id']) : null,
                        !empty($item['session_id']) ? $item['session_id'] : null,
                        !empty($item['wishlist_id']) ? intval($item['wishlist_id']) : null
                    );

                    // Use email as key to avoid duplicates, or user_id/session_id if no email
                    $key = $user_info['email'] ? $user_info['email'] : 
                           (!empty($item['user_id']) ? 'user_' . $item['user_id'] : 'session_' . $item['session_id']);

                    if (!isset($users_map[$key])) {
                        $users_map[$key] = $user_info;
                    }
                }

                // Convert map to array
                $users = array_values($users_map);

                // Get variations breakdown for this product
                $variations_breakdown = array();
                $all_variations = $this->wpdb->get_results(
                    $this->wpdb->prepare(
                        "SELECT 
                            variation_id,
                            purchase_count,
                            add_to_cart_count
                        FROM {$this->analytics_table}
                        WHERE product_id = %d",
                        $row['product_id']
                    ),
                    ARRAY_A
                );

                foreach ($all_variations as $variation_row) {
                    $variation_id = intval($variation_row['variation_id']);
                    $variation_name = '';
                    
                    // Get variation name
                    if ($variation_id > 0) {
                        $variation_product = WishCart_FluentCart_Helper::get_product($variation_id);
                        if ($variation_product) {
                            $variation_name = $variation_product->get_name();
                        } else {
                            $variation_name = sprintf(__('Variation #%d', 'wishcart'), $variation_id);
                        }
                    } else {
                        $variation_name = __('Default', 'wishcart');
                    }

                    $variations_breakdown[] = array(
                        'variation_id' => $variation_id,
                        'variation_name' => $variation_name,
                        'purchase_count' => intval($variation_row['purchase_count']),
                        'add_to_cart_count' => intval($variation_row['add_to_cart_count']),
                    );
                }

                $products[] = array(
                    'product_id' => intval($row['product_id']),
                    'variation_id' => 0, // Set to 0 since we're aggregating across variations
                    'product_name' => $product->get_name(),
                    'product_url' => get_permalink($row['product_id']),
                    'wishlist_count' => intval($row['wishlist_count']),
                    'click_count' => intval($row['click_count']),
                    'add_to_cart_count' => intval($row['add_to_cart_count']),
                    'purchase_count' => intval($row['purchase_count']),
                    'share_count' => intval($row['share_count']),
                    'conversion_rate' => round(floatval($row['conversion_rate']), 2),
                    'average_days_in_wishlist' => round(floatval($row['average_days_in_wishlist']), 2),
                    'users' => $users,
                    'variations' => $variations_breakdown,
                );
            }
        }

        $total_pages = $items_per_page > 0 ? ceil($total / $items_per_page) : 1;

        return array(
            'products' => $products,
            'pagination' => array(
                'total' => intval($total),
                'total_pages' => intval($total_pages),
                'current_page' => $current_page,
                'per_page' => $items_per_page,
            ),
        );
    }

    /**
     * Get analytics for specific product
     *
     * @param int $product_id Product ID
     * @param int $variation_id Variation ID
     * @return array|null Analytics data
     */
    public function get_product_analytics($product_id, $variation_id = 0) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->analytics_table} WHERE product_id = %d AND variation_id = %d",
                $product_id,
                $variation_id
            ),
            ARRAY_A
        );
    }

    /**
     * Get analytics overview/dashboard data
     *
     * @return array Overview statistics
     */
    public function get_overview() {
        // Total wishlists
        $total_wishlists = $this->wpdb->get_var(
            "SELECT COUNT(*) FROM {$this->wishlists_table} WHERE status = 'active'"
        );

        // Total items in wishlists
        $total_items = $this->wpdb->get_var(
            "SELECT COUNT(*) FROM {$this->items_table} WHERE status = 'active'"
        );

        // Total unique products wishlisted
        $unique_products = $this->wpdb->get_var(
            "SELECT COUNT(DISTINCT product_id) FROM {$this->items_table} WHERE status = 'active'"
        );

        // Average items per wishlist
        $avg_items = $total_wishlists > 0 ? round($total_items / $total_wishlists, 2) : 0;

        // Total conversions (purchases)
        $total_purchases = $this->wpdb->get_var(
            "SELECT SUM(purchase_count) FROM {$this->analytics_table}"
        );

        // Overall conversion rate
        $total_wishlist_adds = $this->wpdb->get_var(
            "SELECT SUM(wishlist_count) FROM {$this->analytics_table}"
        );
        $overall_conversion_rate = $total_wishlist_adds > 0 ? round(($total_purchases / $total_wishlist_adds) * 100, 2) : 0;

        // Total shares
        $total_shares = $this->wpdb->get_var(
            "SELECT SUM(share_count) FROM {$this->analytics_table}"
        );

        // Get growth data (last 30 days)
        $growth_data = $this->get_growth_data(30);

        return array(
            'total_wishlists' => intval($total_wishlists),
            'total_items' => intval($total_items),
            'unique_products' => intval($unique_products),
            'avg_items_per_wishlist' => $avg_items,
            'total_purchases' => intval($total_purchases),
            'overall_conversion_rate' => $overall_conversion_rate,
            'total_shares' => intval($total_shares),
            'growth_data' => $growth_data,
        );
    }

    /**
     * Get growth data for chart
     *
     * @param int $days Number of days to look back
     * @return array Daily growth data
     */
    public function get_growth_data($days = 30) {
        $results = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT 
                    DATE(dateadded) as date,
                    COUNT(*) as wishlists_created
                FROM {$this->wishlists_table}
                WHERE dateadded >= DATE_SUB(NOW(), INTERVAL %d DAY)
                    AND status = 'active'
                GROUP BY DATE(dateadded)
                ORDER BY date ASC",
                $days
            ),
            ARRAY_A
        );

        $data = array();
        foreach ($results as $row) {
            $data[] = array(
                'date' => $row['date'],
                'wishlists_created' => intval($row['wishlists_created']),
            );
        }

        return $data;
    }

    /**
     * Get conversion funnel data
     *
     * @return array Funnel statistics
     */
    public function get_conversion_funnel() {
        // Total products added to wishlist
        $added_to_wishlist = $this->wpdb->get_var(
            "SELECT SUM(wishlist_count) FROM {$this->analytics_table}"
        );

        // Total product clicks from analytics table
        $product_clicks = $this->wpdb->get_var(
            "SELECT SUM(click_count) FROM {$this->analytics_table}"
        );

        // Total share link clicks from shares table
        $share_clicks = $this->wpdb->get_var(
            "SELECT SUM(click_count) FROM {$this->shares_table} WHERE status = 'active'"
        );

        // Combine product clicks and share link clicks
        $total_clicks = intval($product_clicks) + intval($share_clicks);

        // Total added to cart from wishlist
        $added_to_cart = $this->wpdb->get_var(
            "SELECT SUM(add_to_cart_count) FROM {$this->analytics_table}"
        );

        // Total purchased
        $purchased = $this->wpdb->get_var(
            "SELECT SUM(purchase_count) FROM {$this->analytics_table}"
        );

        return array(
            'added_to_wishlist' => intval($added_to_wishlist),
            'clicked' => $total_clicks,
            'added_to_cart' => intval($added_to_cart),
            'purchased' => intval($purchased),
            'wishlist_to_cart_rate' => $added_to_wishlist > 0 ? round(($added_to_cart / $added_to_wishlist) * 100, 2) : 0,
            'cart_to_purchase_rate' => $added_to_cart > 0 ? round(($purchased / $added_to_cart) * 100, 2) : 0,
            'overall_conversion_rate' => $added_to_wishlist > 0 ? round(($purchased / $added_to_wishlist) * 100, 2) : 0,
        );
    }

    /**
     * Calculate and update average days in wishlist
     *
     * @param int $product_id Product ID
     * @param int $variation_id Variation ID
     * @return bool Success
     */
    public function calculate_average_days($product_id, $variation_id = 0) {
        // Get all items for this product that have been added to cart or purchased
        $results = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT 
                    DATEDIFF(COALESCE(date_added_to_cart, NOW()), date_added) as days_in_wishlist
                FROM {$this->items_table}
                WHERE product_id = %d AND variation_id = %d
                    AND (date_added_to_cart IS NOT NULL OR status = 'purchased')",
                $product_id,
                $variation_id
            ),
            ARRAY_A
        );

        if (empty($results)) {
            return false;
        }

        $total_days = 0;
        $count = 0;

        foreach ($results as $row) {
            if (isset($row['days_in_wishlist']) && $row['days_in_wishlist'] >= 0) {
                $total_days += intval($row['days_in_wishlist']);
                $count++;
            }
        }

        if ($count === 0) {
            return false;
        }

        $average_days = round($total_days / $count, 2);

        // Update analytics
        $result = $this->wpdb->update(
            $this->analytics_table,
            array('average_days_in_wishlist' => $average_days),
            array(
                'product_id' => $product_id,
                'variation_id' => $variation_id,
            ),
            array('%f'),
            array('%d', '%d')
        );

        return $result !== false;
    }

    /**
     * Recalculate all analytics (for cron job)
     *
     * @return array Results
     */
    public function recalculate_all_analytics() {
        $results = array(
            'success' => true,
            'updated' => 0,
            'errors' => array(),
        );

        // Get all products in analytics
        $products = $this->wpdb->get_results(
            "SELECT DISTINCT product_id, variation_id FROM {$this->analytics_table}",
            ARRAY_A
        );

        foreach ($products as $product) {
            // Recalculate wishlist count
            $wishlist_count = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT COUNT(*) FROM {$this->items_table} WHERE product_id = %d AND variation_id = %d AND status = 'active'",
                    $product['product_id'],
                    $product['variation_id']
                )
            );

            // Get purchase count and calculate conversion rate
            $analytics = $this->get_product_analytics($product['product_id'], $product['variation_id']);
            $purchase_count = $analytics ? intval($analytics['purchase_count']) : 0;
            $conversion_rate = $wishlist_count > 0 ? round(($purchase_count / $wishlist_count) * 100, 2) : 0;

            // Update analytics
            $update_result = $this->wpdb->update(
                $this->analytics_table,
                array(
                    'wishlist_count' => $wishlist_count,
                    'conversion_rate' => $conversion_rate,
                ),
                array(
                    'product_id' => $product['product_id'],
                    'variation_id' => $product['variation_id'],
                ),
                array('%d', '%f'),
                array('%d', '%d')
            );

            if ($update_result !== false) {
                $results['updated']++;
                // Calculate average days
                $this->calculate_average_days($product['product_id'], $product['variation_id']);
            } else {
                $results['errors'][] = "Failed to update product {$product['product_id']}";
            }
        }

        return $results;
    }

    /**
     * Clean up old analytics data
     *
     * @param int $days Delete analytics older than X days
     * @return array Results
     */
    public function cleanup_old_analytics($days = 365) {
        $results = array(
            'success' => true,
            'deleted' => 0,
        );

        // Delete analytics for products that are no longer in any wishlist and haven't been updated in X days
        $result = $this->wpdb->query(
            $this->wpdb->prepare(
                "DELETE FROM {$this->analytics_table}
                WHERE wishlist_count = 0
                    AND date_updated < DATE_SUB(NOW(), INTERVAL %d DAY)",
                $days
            )
        );

        $results['deleted'] = $result !== false ? $result : 0;

        return $results;
    }

    /**
     * Get link details with items and click counts
     *
     * @param int $page Current page number
     * @param int $per_page Number of links per page
     * @param string $time_period Time period filter (7days, 30days, 90days, 365days, all)
     * @return array Link details with items and pagination info
     */
    public function get_link_details($page = 1, $per_page = 10, $time_period = 'all') {
        $current_page = max(1, intval($page));
        $items_per_page = $per_page > 0 ? $per_page : 10;
        $offset = ($current_page - 1) * $items_per_page;

        // Get date range filter
        $date_from = $this->get_date_range_from_period($time_period);
        
        // Build WHERE clause and prepare parameters
        $where_conditions = array("s.status = 'active'", "w.status = 'active'");
        $where_values = array();
        
        if ($date_from) {
            $where_conditions[] = "s.date_created >= %s";
            $where_values[] = $date_from;
        }
        
        $where_clause = implode(' AND ', $where_conditions);

        // Get total count
        if (!empty($where_values)) {
            $total = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT COUNT(*) 
                    FROM {$this->shares_table} s
                    INNER JOIN {$this->wishlists_table} w ON s.wishlist_id = w.id
                    WHERE {$where_clause}",
                    $where_values
                )
            );
        } else {
            $total = $this->wpdb->get_var(
                "SELECT COUNT(*) 
                FROM {$this->shares_table} s
                INNER JOIN {$this->wishlists_table} w ON s.wishlist_id = w.id
                WHERE {$where_clause}"
            );
        }

        // Get paginated shares
        $query_values = array_merge($where_values, array($items_per_page, $offset));
        if (!empty($where_values)) {
            $shares = $this->wpdb->get_results(
                $this->wpdb->prepare(
                    "SELECT 
                        s.share_id,
                        s.wishlist_id,
                        s.share_token,
                        s.share_type,
                        s.click_count,
                        s.conversion_count,
                        s.date_created,
                        s.last_clicked,
                        w.wishlist_name,
                        w.user_id,
                        w.session_id
                    FROM {$this->shares_table} s
                    INNER JOIN {$this->wishlists_table} w ON s.wishlist_id = w.id
                    WHERE {$where_clause}
                    ORDER BY s.date_created DESC
                    LIMIT %d OFFSET %d",
                    $query_values
                ),
                ARRAY_A
            );
        } else {
            $shares = $this->wpdb->get_results(
                $this->wpdb->prepare(
                    "SELECT 
                        s.share_id,
                        s.wishlist_id,
                        s.share_token,
                        s.share_type,
                        s.click_count,
                        s.conversion_count,
                        s.date_created,
                        s.last_clicked,
                        w.wishlist_name,
                        w.user_id,
                        w.session_id
                    FROM {$this->shares_table} s
                    INNER JOIN {$this->wishlists_table} w ON s.wishlist_id = w.id
                    WHERE {$where_clause}
                    ORDER BY s.date_created DESC
                    LIMIT %d OFFSET %d",
                    $items_per_page,
                    $offset
                ),
                ARRAY_A
            );
        }

        if (empty($shares)) {
            return array(
                'total_links' => 0,
                'links' => array(),
                'pagination' => array(
                    'total' => 0,
                    'total_pages' => 0,
                    'current_page' => $current_page,
                    'per_page' => $items_per_page,
                ),
            );
        }

        $links_data = array();
        $sharing_handler = new WishCart_Sharing_Handler();

        foreach ($shares as $share) {
            // Get items for this wishlist
            $items = $this->wpdb->get_results(
                $this->wpdb->prepare(
                    "SELECT 
                        item_id,
                        product_id,
                        variation_id,
                        quantity
                    FROM {$this->items_table}
                    WHERE wishlist_id = %d AND status = 'active'
                    ORDER BY date_added ASC",
                    $share['wishlist_id']
                ),
                ARRAY_A
            );

            $items_data = array();
            foreach ($items as $item) {
                // Get product name
                $product_name = '';
                if (class_exists('WishCart_FluentCart_Helper')) {
                    $product = WishCart_FluentCart_Helper::get_product($item['product_id']);
                    if ($product) {
                        $product_name = $product->get_name();
                    }
                } else {
                    // Fallback to post title
                    $product_name = get_the_title($item['product_id']);
                }

                $items_data[] = array(
                    'product_id' => intval($item['product_id']),
                    'product_name' => $product_name ? $product_name : __('Product #' . $item['product_id'], 'wishcart'),
                    'variation_id' => intval($item['variation_id']),
                    'quantity' => intval($item['quantity']),
                );
            }

            // Get share URL
            $share_url = '';
            if (method_exists($sharing_handler, 'get_share_url')) {
                $share_url = $sharing_handler->get_share_url($share['share_token'], $share['share_type']);
            } else {
                // Fallback URL construction
                if (class_exists('WishCart_Shared_Wishlist_Page')) {
                    $share_url = WishCart_Shared_Wishlist_Page::get_share_url($share['share_token']);
                } else {
                    $share_url = home_url('/wishlist/share/' . $share['share_token']);
                }
            }

            // Get user information
            $user_info = $this->get_user_info(
                !empty($share['user_id']) ? intval($share['user_id']) : null,
                !empty($share['session_id']) ? $share['session_id'] : null,
                !empty($share['wishlist_id']) ? intval($share['wishlist_id']) : null
            );

            $links_data[] = array(
                'share_id' => intval($share['share_id']),
                'share_token' => $share['share_token'],
                'share_url' => $share_url,
                'wishlist_id' => intval($share['wishlist_id']),
                'wishlist_name' => $share['wishlist_name'],
                'share_type' => $share['share_type'],
                'click_count' => intval($share['click_count']),
                'conversion_count' => intval($share['conversion_count']),
                'items_count' => count($items_data),
                'items' => $items_data,
                'date_created' => $share['date_created'],
                'last_clicked' => $share['last_clicked'],
                'user_name' => $user_info['user_name'],
                'user_email' => $user_info['email'],
            );
        }

        $total_pages = $items_per_page > 0 ? ceil($total / $items_per_page) : 1;

        return array(
            'total_links' => intval($total),
            'links' => $links_data,
            'pagination' => array(
                'total' => intval($total),
                'total_pages' => intval($total_pages),
                'current_page' => $current_page,
                'per_page' => $items_per_page,
            ),
        );
    }
}

