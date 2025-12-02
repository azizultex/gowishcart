<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * CRM Campaign Handler Class
 *
 * Handles campaign rule engine, trigger evaluation, and campaign execution
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_CRM_Campaign_Handler {

    private $wpdb;
    private $campaigns_table;
    private $fluentcrm;

    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->campaigns_table = $wpdb->prefix . 'fc_wishlist_crm_campaigns';
        
        // Initialize FluentCRM integration
        if (class_exists('WishCart_FluentCRM_Integration')) {
            $this->fluentcrm = new WishCart_FluentCRM_Integration();
        }

        // Hook into wishlist events
        add_action('wishcart_item_added', array($this, 'handle_item_added'), 10, 1);
        add_action('wishcart_item_removed', array($this, 'handle_item_removed'), 10, 1);
        add_action('wishcart_price_drop_detected', array($this, 'handle_price_drop'), 10, 1);
        add_action('wishcart_back_in_stock', array($this, 'handle_back_in_stock'), 10, 1);
    }

    /**
     * Create campaign
     *
     * @param array $data Campaign data
     * @return int|WP_Error Campaign ID or error
     */
    public function create_campaign($data) {
        $required_fields = array('wishlist_trigger_type', 'status');
        foreach ($required_fields as $field) {
            if (!isset($data[$field])) {
                return new WP_Error('missing_field', sprintf(__('Missing required field: %s', 'wishcart'), $field));
            }
        }

        $insert_data = array(
            'wishlist_trigger_type' => sanitize_text_field($data['wishlist_trigger_type']),
            'trigger_conditions' => isset($data['trigger_conditions']) ? wp_json_encode($data['trigger_conditions']) : null,
            'discount_type' => isset($data['discount_type']) ? sanitize_text_field($data['discount_type']) : null,
            'discount_value' => isset($data['discount_value']) ? floatval($data['discount_value']) : null,
            'email_sequence' => isset($data['email_sequence']) ? wp_json_encode($data['email_sequence']) : null,
            'target_segment' => isset($data['target_segment']) ? wp_json_encode($data['target_segment']) : null,
            'status' => sanitize_text_field($data['status']),
            'stats' => isset($data['stats']) ? wp_json_encode($data['stats']) : null,
        );

        if (isset($data['crm_campaign_id'])) {
            $insert_data['crm_campaign_id'] = intval($data['crm_campaign_id']);
        }

        $format = array('%s', '%s', '%s', '%f', '%s', '%s', '%s', '%s', '%d');

        $result = $this->wpdb->insert($this->campaigns_table, $insert_data, $format);

        if (false === $result) {
            return new WP_Error('db_error', __('Failed to create campaign', 'wishcart'));
        }

        return $this->wpdb->insert_id;
    }

    /**
     * Update campaign
     *
     * @param int $campaign_id Campaign ID
     * @param array $data Campaign data
     * @return bool|WP_Error
     */
    public function update_campaign($campaign_id, $data) {
        $campaign = $this->get_campaign($campaign_id);
        if (!$campaign) {
            return new WP_Error('not_found', __('Campaign not found', 'wishcart'));
        }

        $update_data = array();
        $format = array();

        if (isset($data['wishlist_trigger_type'])) {
            $update_data['wishlist_trigger_type'] = sanitize_text_field($data['wishlist_trigger_type']);
            $format[] = '%s';
        }

        if (isset($data['trigger_conditions'])) {
            $update_data['trigger_conditions'] = wp_json_encode($data['trigger_conditions']);
            $format[] = '%s';
        }

        if (isset($data['discount_type'])) {
            $update_data['discount_type'] = sanitize_text_field($data['discount_type']);
            $format[] = '%s';
        }

        if (isset($data['discount_value'])) {
            $update_data['discount_value'] = floatval($data['discount_value']);
            $format[] = '%f';
        }

        if (isset($data['email_sequence'])) {
            $update_data['email_sequence'] = wp_json_encode($data['email_sequence']);
            $format[] = '%s';
        }

        if (isset($data['target_segment'])) {
            $update_data['target_segment'] = wp_json_encode($data['target_segment']);
            $format[] = '%s';
        }

        if (isset($data['status'])) {
            $update_data['status'] = sanitize_text_field($data['status']);
            $format[] = '%s';
        }

        if (isset($data['stats'])) {
            $update_data['stats'] = wp_json_encode($data['stats']);
            $format[] = '%s';
        }

        if (empty($update_data)) {
            return true; // Nothing to update
        }

        $where = array('campaign_id' => $campaign_id);
        $where_format = array('%d');

        $result = $this->wpdb->update($this->campaigns_table, $update_data, $where, $format, $where_format);

        return $result !== false;
    }

    /**
     * Get campaign
     *
     * @param int $campaign_id Campaign ID
     * @return array|null Campaign data or null
     */
    public function get_campaign($campaign_id) {
        $campaign = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->campaigns_table} WHERE campaign_id = %d",
                $campaign_id
            ),
            ARRAY_A
        );

        if ($campaign) {
            $campaign['trigger_conditions'] = json_decode($campaign['trigger_conditions'], true);
            $campaign['email_sequence'] = json_decode($campaign['email_sequence'], true);
            $campaign['target_segment'] = json_decode($campaign['target_segment'], true);
            $campaign['stats'] = json_decode($campaign['stats'], true);
        }

        return $campaign;
    }

    /**
     * Get campaigns by trigger type
     *
     * @param string $trigger_type Trigger type
     * @param string $status Status filter
     * @return array
     */
    public function get_campaigns_by_trigger($trigger_type, $status = 'active') {
        $where = "wishlist_trigger_type = %s";
        $params = array($trigger_type);

        if ($status) {
            $where .= " AND status = %s";
            $params[] = $status;
        }

        $query = "SELECT * FROM {$this->campaigns_table} WHERE {$where} ORDER BY date_created DESC";
        
        $campaigns = $this->wpdb->get_results(
            $this->wpdb->prepare($query, $params),
            ARRAY_A
        );

        foreach ($campaigns as &$campaign) {
            $campaign['trigger_conditions'] = json_decode($campaign['trigger_conditions'], true);
            $campaign['email_sequence'] = json_decode($campaign['email_sequence'], true);
            $campaign['target_segment'] = json_decode($campaign['target_segment'], true);
            $campaign['stats'] = json_decode($campaign['stats'], true);
        }

        return $campaigns;
    }

    /**
     * Evaluate trigger conditions
     *
     * @param array $campaign Campaign data
     * @param array $event_data Event data
     * @return bool
     */
    public function evaluate_conditions($campaign, $event_data) {
        $conditions = $campaign['trigger_conditions'];
        if (empty($conditions)) {
            return true; // No conditions means always trigger
        }

        // Evaluate each condition
        foreach ($conditions as $condition) {
            $field = isset($condition['field']) ? $condition['field'] : '';
            $operator = isset($condition['operator']) ? $condition['operator'] : 'equals';
            $value = isset($condition['value']) ? $condition['value'] : '';

            $event_value = isset($event_data[$field]) ? $event_data[$field] : null;

            if (!$this->evaluate_condition($event_value, $operator, $value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluate single condition
     *
     * @param mixed $event_value Event value
     * @param string $operator Operator
     * @param mixed $value Comparison value
     * @return bool
     */
    private function evaluate_condition($event_value, $operator, $value) {
        switch ($operator) {
            case 'equals':
                return $event_value == $value;
            case 'not_equals':
                return $event_value != $value;
            case 'greater_than':
                return floatval($event_value) > floatval($value);
            case 'less_than':
                return floatval($event_value) < floatval($value);
            case 'greater_than_or_equal':
                return floatval($event_value) >= floatval($value);
            case 'less_than_or_equal':
                return floatval($event_value) <= floatval($value);
            case 'contains':
                return strpos($event_value, $value) !== false;
            case 'not_contains':
                return strpos($event_value, $value) === false;
            case 'in':
                return in_array($event_value, (array)$value);
            case 'not_in':
                return !in_array($event_value, (array)$value);
            default:
                return true;
        }
    }

    /**
     * Execute campaign
     *
     * @param int $campaign_id Campaign ID
     * @param array $event_data Event data
     * @return bool|WP_Error
     */
    public function execute_campaign($campaign_id, $event_data) {
        $campaign = $this->get_campaign($campaign_id);
        if (!$campaign) {
            return new WP_Error('campaign_not_found', __('Campaign not found', 'wishcart'));
        }

        if ($campaign['status'] !== 'active') {
            return new WP_Error('campaign_inactive', __('Campaign is not active', 'wishcart'));
        }

        // Evaluate conditions
        if (!$this->evaluate_conditions($campaign, $event_data)) {
            return false; // Conditions not met
        }

        // Get contact
        $contact_id = null;
        if (isset($event_data['user_id']) && $event_data['user_id']) {
            $user = get_userdata($event_data['user_id']);
            if ($user && $this->fluentcrm) {
                $contact = $this->fluentcrm->get_contact($user->user_email);
                if ($contact) {
                    $contact_id = $contact->id;
                } else {
                    // Create contact if auto-create is enabled
                    $contact_id = $this->fluentcrm->sync_wishlist_user($event_data['user_id']);
                    if (is_wp_error($contact_id)) {
                        return $contact_id;
                    }
                }
            }
        } elseif (isset($event_data['email'])) {
            if ($this->fluentcrm) {
                $contact = $this->fluentcrm->get_contact($event_data['email']);
                if ($contact) {
                    $contact_id = $contact->id;
                }
            }
        }

        if (!$contact_id) {
            return new WP_Error('no_contact', __('No contact found for campaign execution', 'wishcart'));
        }

        // Generate discount code if needed
        $discount_code = null;
        if ($campaign['discount_type'] && $campaign['discount_value']) {
            $discount_code = $this->generate_discount_code($campaign, $contact_id);
        }

        // Send email sequence
        $email_sequence = $campaign['email_sequence'];
        if (!empty($email_sequence) && is_array($email_sequence)) {
            $this->send_email_sequence($contact_id, $email_sequence, $event_data, $discount_code);
        }

        // Update campaign stats
        $this->update_campaign_stats($campaign_id, 'executed');

        return true;
    }

    /**
     * Generate discount code
     *
     * @param array $campaign Campaign data
     * @param int $contact_id Contact ID
     * @return string
     */
    private function generate_discount_code($campaign, $contact_id) {
        $settings = $this->fluentcrm ? $this->fluentcrm->get_settings() : array();
        $prefix = isset($settings['discount_code_prefix']) ? $settings['discount_code_prefix'] : 'WISHLIST';
        
        $code = $prefix . '-' . strtoupper(wp_generate_password(8, false));
        
        // Store discount code in notification or custom field
        // This would integrate with your coupon system
        
        return $code;
    }

    /**
     * Send email sequence
     *
     * @param int $contact_id Contact ID
     * @param array $sequence Email sequence
     * @param array $event_data Event data
     * @param string $discount_code Discount code
     * @return void
     */
    private function send_email_sequence($contact_id, $sequence, $event_data, $discount_code = null) {
        if (!$this->fluentcrm) {
            return;
        }

        foreach ($sequence as $email) {
            $delay = isset($email['delay']) ? intval($email['delay']) : 0;
            $subject = isset($email['subject']) ? $this->replace_merge_tags($email['subject'], $event_data, $discount_code) : '';
            $body = isset($email['body']) ? $this->replace_merge_tags($email['body'], $event_data, $discount_code) : '';

            if ($delay > 0) {
                // Schedule email
                wp_schedule_single_event(time() + ($delay * 3600), 'wishcart_send_scheduled_email', array(
                    $contact_id,
                    $subject,
                    $body,
                    $event_data
                ));
            } else {
                // Send immediately
                $this->fluentcrm->send_email($contact_id, $subject, $body, array('campaign_id' => isset($event_data['campaign_id']) ? $event_data['campaign_id'] : null));
            }
        }
    }

    /**
     * Replace merge tags in content
     *
     * @param string $content Content with merge tags
     * @param array $event_data Event data
     * @param string $discount_code Discount code
     * @return string
     */
    private function replace_merge_tags($content, $event_data, $discount_code = null) {
        $replacements = array(
            '{product_name}' => isset($event_data['product_name']) ? $event_data['product_name'] : '',
            '{product_url}' => isset($event_data['product_url']) ? $event_data['product_url'] : '',
            '{old_price}' => isset($event_data['old_price']) ? wc_price($event_data['old_price']) : '',
            '{new_price}' => isset($event_data['new_price']) ? wc_price($event_data['new_price']) : '',
            '{discount_percentage}' => isset($event_data['discount_percentage']) ? $event_data['discount_percentage'] : '',
            '{discount_code}' => $discount_code ? $discount_code : '',
            '{wishlist_name}' => isset($event_data['wishlist_name']) ? $event_data['wishlist_name'] : '',
            '{site_name}' => get_bloginfo('name'),
        );

        return str_replace(array_keys($replacements), array_values($replacements), $content);
    }

    /**
     * Update campaign statistics
     *
     * @param int $campaign_id Campaign ID
     * @param string $action Action type
     * @return void
     */
    private function update_campaign_stats($campaign_id, $action) {
        $campaign = $this->get_campaign($campaign_id);
        if (!$campaign) {
            return;
        }

        $stats = $campaign['stats'] ? $campaign['stats'] : array();
        
        if (!isset($stats[$action])) {
            $stats[$action] = 0;
        }
        $stats[$action]++;

        $this->update_campaign($campaign_id, array('stats' => $stats));
    }

    /**
     * Build product tags from product object (supports both WooCommerce and FluentCart)
     *
     * @param WC_Product|WishCart_FluentCart_Product $product Product object
     * @return array Array of formatted tag strings
     */
    private function build_product_tags($product) {
        $tags = array();
        
        if (!$product || !is_object($product)) {
            return $tags;
        }
        
        // Get product ID
        $product_id = method_exists($product, 'get_id') ? $product->get_id() : 0;
        
        // Get Product Name first - we'll use it as prefix for clarity
        $product_name = '';
        if (method_exists($product, 'get_name')) {
            $product_name = $product->get_name();
        }
        
        // If no product name, we can't create clear tags
        if (empty($product_name)) {
            return $tags;
        }
        
        // Truncate long product names for readability (keep first 30 chars)
        $product_prefix = strlen($product_name) > 30 ? substr($product_name, 0, 30) . '...' : $product_name;
        
        // Add main product tag
        $tags[] = 'Product: ' . $product_name;
        
        // Product Categories - prefixed with product name
        // For FluentCart/WordPress custom post types, use wp_get_post_terms
        if ($product_id) {
            // Try multiple taxonomy names (product_cat for WooCommerce, fc_product_cat for FluentCart)
            $taxonomy_names = array('product_cat', 'fc_product_cat', 'product_category');
            
            foreach ($taxonomy_names as $taxonomy) {
                if (taxonomy_exists($taxonomy)) {
                    $categories = wp_get_post_terms($product_id, $taxonomy);
                    if (!empty($categories) && !is_wp_error($categories)) {
                        foreach ($categories as $category) {
                            $tags[] = $product_prefix . ' - Category: ' . $category->name;
                        }
                        break; // Found categories, stop checking other taxonomies
                    }
                }
            }
        }
        
        // SKU - check both method and post meta
        $sku = '';
        if (method_exists($product, 'get_sku')) {
            $sku = $product->get_sku();
        } elseif ($product_id) {
            $sku = get_post_meta($product_id, '_sku', true);
        }
        if (!empty($sku)) {
            $tags[] = $product_prefix . ' - SKU: ' . $sku;
        }
        
        // Price - prefixed with product name
        if (method_exists($product, 'get_price')) {
            $price = $product->get_price();
            if (!empty($price) && $price > 0) {
                // Format price properly
                if (function_exists('wc_price')) {
                    $formatted_price = wc_price($price);
                    $price_text = strip_tags($formatted_price);
                } else {
                    // Fallback formatting
                    $price_text = '$' . number_format($price, 2);
                }
                $tags[] = $product_prefix . ' - Price: ' . $price_text;
            }
        }
        
        // Stock Status - prefixed with product name
        if (method_exists($product, 'get_stock_status')) {
            $stock_status = $product->get_stock_status();
            if (!empty($stock_status)) {
                // FluentCart returns "In stock" or "Out of stock" as text
                // WooCommerce returns "instock", "outofstock", "onbackorder"
                if (is_string($stock_status)) {
                    if (strpos(strtolower($stock_status), 'in stock') !== false || $stock_status === 'instock') {
                        $tags[] = $product_prefix . ' - Stock: In Stock';
                    } elseif (strpos(strtolower($stock_status), 'out') !== false || $stock_status === 'outofstock') {
                        $tags[] = $product_prefix . ' - Stock: Out of Stock';
                    } elseif ($stock_status === 'onbackorder') {
                        $tags[] = $product_prefix . ' - Stock: On Backorder';
                    } else {
                        $tags[] = $product_prefix . ' - Stock: ' . ucfirst($stock_status);
                    }
                }
            }
        } elseif (method_exists($product, 'is_in_stock')) {
            $in_stock = $product->is_in_stock();
            $tags[] = $product_prefix . ' - Stock: ' . ($in_stock ? 'In Stock' : 'Out of Stock');
        }
        
        // Product Type - prefixed with product name
        if (method_exists($product, 'get_type')) {
            $product_type = $product->get_type();
            if (!empty($product_type)) {
                $type_label = ucfirst($product_type);
                $tags[] = $product_prefix . ' - Type: ' . $type_label;
            }
        } elseif ($product_id) {
            // For FluentCart, get post type
            $post = get_post($product_id);
            if ($post) {
                $post_type_obj = get_post_type_object($post->post_type);
                if ($post_type_obj) {
                    $tags[] = $product_prefix . ' - Type: ' . $post_type_obj->labels->singular_name;
                }
            }
        }
        
        // Check if product is on sale (FluentCart specific) - prefixed with product name
        if (method_exists($product, 'is_on_sale')) {
            $on_sale = $product->is_on_sale();
            if ($on_sale) {
                $tags[] = $product_prefix . ' - On Sale';
            }
        }
        
        return $tags;
    }

    /**
     * Handle item added event
     *
     * @param array $item_data Item data
     * @return void
     */
    public function handle_item_added($item_data) {
        // Always sync user to FluentCRM if enabled (even without campaigns)
        $contact_id = null;
        $user_email = null;
        $user_name = null;
        
        // Get product object to build tags
        $product = null;
        $product_tags = array();
        if (!empty($item_data['product_id'])) {
            // Try to get product from item_data first (if passed)
            if (!empty($item_data['product'])) {
                $product = $item_data['product'];
            } else {
                // Otherwise, get product using helper
                $product = wc_get_product($item_data['product_id']);
            }
            
            if ($product) {
                $product_tags = $this->build_product_tags($product);
            }
        }
        
        if ($this->fluentcrm && $this->fluentcrm->is_available()) {
            $settings = $this->fluentcrm->get_settings();
            
            if ($settings['enabled']) {
                // Handle logged-in users
                if (!empty($item_data['user_id'])) {
                    $user = get_userdata($item_data['user_id']);
                    if ($user && $user->user_email) {
                        $user_email = $user->user_email;
                        $user_name = array(
                            'first_name' => $user->first_name,
                            'last_name' => $user->last_name,
                        );

                        // Sync user to FluentCRM (creates or updates contact)
                        if ($settings['auto_create_contacts']) {
                            $sync_result = $this->fluentcrm->sync_wishlist_user($item_data['user_id']);
                            
                            // Extract contact ID from result
                            if (!is_wp_error($sync_result) && $sync_result) {
                                $contact_id = $sync_result;
                            } else {
                                // If sync failed, try to get existing contact
                                $contact = $this->fluentcrm->get_contact($user->user_email);
                                if ($contact) {
                                    $contact_id = is_object($contact) ? $contact->id : (isset($contact['id']) ? $contact['id'] : null);
                                }
                            }
                            
                            // Add product tags to contact
                            if ($contact_id && !empty($product_tags)) {
                                $this->fluentcrm->attach_tags($contact_id, $product_tags);
                            }
                        } else {
                            // Just get existing contact
                            $contact = $this->fluentcrm->get_contact($user->user_email);
                            if ($contact) {
                                $contact_id = is_object($contact) ? $contact->id : (isset($contact['id']) ? $contact['id'] : null);
                                
                                // Add product tags to contact
                                if ($contact_id && !empty($product_tags)) {
                                    $this->fluentcrm->attach_tags($contact_id, $product_tags);
                                }
                            }
                        }
                    }
                } 
                // Handle guest users with email addresses
                else if (!empty($item_data['session_id'])) {
                    // Check if guest user has email in guest_users table
                    $guest_handler = new WishCart_Guest_Handler();
                    $guest = $guest_handler->get_guest_by_session($item_data['session_id']);
                    
                    if ($guest && !empty($guest['guest_email']) && is_email($guest['guest_email'])) {
                        $user_email = $guest['guest_email'];
                        $user_name = array(
                            'first_name' => !empty($guest['guest_name']) ? $guest['guest_name'] : '',
                            'last_name' => '',
                        );

                        // Create or update contact for guest user
                        if ($settings['auto_create_contacts']) {
                            // Merge product tags with default tags
                            $all_tags = array_merge(array('Wishlist User', 'Guest User'), $product_tags);
                            
                            $contact_data = array(
                                'first_name' => $user_name['first_name'],
                                'last_name' => $user_name['last_name'],
                                'tags' => $all_tags,
                            );
                            
                            $sync_result = $this->fluentcrm->create_or_update_contact(null, $user_email, $contact_data);
                            
                            // Extract contact ID from result
                            if (!is_wp_error($sync_result) && $sync_result) {
                                $contact_id = $sync_result;
                            } else {
                                // If sync failed, try to get existing contact
                                $contact = $this->fluentcrm->get_contact($user_email);
                                if ($contact) {
                                    $contact_id = is_object($contact) ? $contact->id : (isset($contact['id']) ? $contact['id'] : null);
                                    
                                    // Add product tags to existing contact
                                    if ($contact_id && !empty($product_tags)) {
                                        $this->fluentcrm->attach_tags($contact_id, $product_tags);
                                    }
                                }
                            }
                        } else {
                            // Just get existing contact
                            $contact = $this->fluentcrm->get_contact($user_email);
                            if ($contact) {
                                $contact_id = is_object($contact) ? $contact->id : (isset($contact['id']) ? $contact['id'] : null);
                                
                                // Add product tags to contact
                                if ($contact_id && !empty($product_tags)) {
                                    $this->fluentcrm->attach_tags($contact_id, $product_tags);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Check for campaigns
        $campaigns = $this->get_campaigns_by_trigger('item_added', 'active');
        
        if (!empty($campaigns)) {
            // Execute campaigns
            foreach ($campaigns as $campaign) {
                $event_data = array(
                    'user_id' => $item_data['user_id'],
                    'product_id' => isset($item_data['product_id']) ? $item_data['product_id'] : null,
                    'wishlist_id' => isset($item_data['wishlist_id']) ? $item_data['wishlist_id'] : null,
                    'product_name' => isset($item_data['product_name']) ? $item_data['product_name'] : '',
                    'product_url' => isset($item_data['product_url']) ? $item_data['product_url'] : '',
                );
                
                $this->execute_campaign($campaign['campaign_id'], $event_data);
            }
        } else {
            // No campaigns configured, send default welcome email if enabled
            if ($this->fluentcrm && $this->fluentcrm->is_available() && $contact_id) {
                $settings = $this->fluentcrm->get_settings();
                
                if ($settings['enabled'] && isset($settings['send_welcome_email']) && $settings['send_welcome_email']) {
                    // Send default welcome email
                    $product_name = isset($item_data['product_name']) ? $item_data['product_name'] : __('Product', 'wishcart');
                    $product_url = isset($item_data['product_url']) ? $item_data['product_url'] : '';
                    $site_name = get_bloginfo('name');
                    
                    $subject = sprintf(__('You added %s to your wishlist!', 'wishcart'), $product_name);
                    $body = sprintf(
                        __('Hi there,%s%sGreat news! You just added "%s" to your wishlist.%s%sView Product: %s%s%sThank you for using %s!', 'wishcart'),
                        "\n\n",
                        "\n",
                        $product_name,
                        "\n\n",
                        "\n",
                        $product_url,
                        "\n\n",
                        "\n",
                        $site_name
                    );
                    
                    $this->fluentcrm->send_email($contact_id, $subject, $body);
                }
            }
        }
    }

    /**
     * Handle item removed event
     *
     * @param array $item_data Item data
     * @return void
     */
    public function handle_item_removed($item_data) {
        // Handle item removal if needed
    }

    /**
     * Handle price drop event
     *
     * @param array $price_data Price data
     * @return void
     */
    public function handle_price_drop($price_data) {
        $campaigns = $this->get_campaigns_by_trigger('price_drop', 'active');
        
        foreach ($campaigns as $campaign) {
            $event_data = array(
                'user_id' => isset($price_data['user_id']) ? $price_data['user_id'] : null,
                'product_id' => isset($price_data['product_id']) ? $price_data['product_id'] : null,
                'product_name' => isset($price_data['product_name']) ? $price_data['product_name'] : '',
                'product_url' => isset($price_data['product_url']) ? $price_data['product_url'] : '',
                'old_price' => isset($price_data['old_price']) ? $price_data['old_price'] : 0,
                'new_price' => isset($price_data['new_price']) ? $price_data['new_price'] : 0,
                'discount_percentage' => isset($price_data['old_price']) && isset($price_data['new_price']) && $price_data['old_price'] > 0 
                    ? round((($price_data['old_price'] - $price_data['new_price']) / $price_data['old_price']) * 100, 2)
                    : 0,
            );
            
            $this->execute_campaign($campaign['campaign_id'], $event_data);
        }
    }

    /**
     * Handle back in stock event
     *
     * @param array $stock_data Stock data
     * @return void
     */
    public function handle_back_in_stock($stock_data) {
        $campaigns = $this->get_campaigns_by_trigger('back_in_stock', 'active');
        
        foreach ($campaigns as $campaign) {
            $event_data = array(
                'user_id' => isset($stock_data['user_id']) ? $stock_data['user_id'] : null,
                'product_id' => isset($stock_data['product_id']) ? $stock_data['product_id'] : null,
                'product_name' => isset($stock_data['product_name']) ? $stock_data['product_name'] : '',
                'product_url' => isset($stock_data['product_url']) ? $stock_data['product_url'] : '',
            );
            
            $this->execute_campaign($campaign['campaign_id'], $event_data);
        }
    }

    /**
     * Process time-based campaigns
     *
     * @return void
     */
    public function process_time_based_campaigns() {
        $campaigns = $this->get_campaigns_by_trigger('time_based', 'active');
        
        foreach ($campaigns as $campaign) {
            $conditions = $campaign['trigger_conditions'];
            if (empty($conditions)) {
                continue;
            }

            // Get users matching time-based conditions
            $users = $this->get_users_for_time_based_campaign($campaign);
            
            foreach ($users as $user_data) {
                $event_data = array(
                    'user_id' => $user_data['user_id'],
                    'wishlist_id' => $user_data['wishlist_id'],
                    'wishlist_name' => $user_data['wishlist_name'],
                    'days_since_added' => $user_data['days_since_added'],
                );
                
                $this->execute_campaign($campaign['campaign_id'], $event_data);
            }
        }
    }

    /**
     * Get users for time-based campaign
     *
     * @param array $campaign Campaign data
     * @return array
     */
    private function get_users_for_time_based_campaign($campaign) {
        $conditions = $campaign['trigger_conditions'];
        $days = 7; // Default
        
        foreach ($conditions as $condition) {
            if ($condition['field'] === 'days_since_added') {
                $days = intval($condition['value']);
                break;
            }
        }

        $items_table = $this->wpdb->prefix . 'fc_wishlist_items';
        $wishlists_table = $this->wpdb->prefix . 'fc_wishlists';
        
        $query = $this->wpdb->prepare(
            "SELECT wi.user_id, wi.wishlist_id, w.wishlist_name, DATEDIFF(NOW(), wi.date_added) as days_since_added
            FROM {$items_table} wi
            JOIN {$wishlists_table} w ON wi.wishlist_id = w.id
            WHERE wi.status = 'active'
                AND w.status = 'active'
                AND wi.user_id IS NOT NULL
                AND DATEDIFF(NOW(), wi.date_added) = %d
            GROUP BY wi.user_id, wi.wishlist_id",
            $days
        );

        return $this->wpdb->get_results($query, ARRAY_A);
    }
}

