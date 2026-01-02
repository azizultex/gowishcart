<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Share Wishlist REST API Handler (Pro Feature)
 *
 * Handles REST API endpoints for wishlist sharing
 *
 * @category WordPress
 * @package  WishCart_Pro
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Pro_Share_REST_API {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('rest_api_init', [ $this, 'register_routes' ]);
    }

    /**
     * Register REST API routes for sharing
     *
     * @return void
     */
    public function register_routes() {
        // Sharing endpoints
        register_rest_route('wishcart/v1', '/share/create', array(
            'methods' => 'POST',
            'callback' => [ $this, 'share_create' ],
            'permission_callback' => '__return_true',
        ));

        register_rest_route('wishcart/v1', '/share/(?P<share_token>[a-zA-Z0-9]+)/stats', array(
            'methods' => 'GET',
            'callback' => [ $this, 'share_get_stats' ],
            'permission_callback' => '__return_true',
        ));

        register_rest_route('wishcart/v1', '/share/(?P<share_token>[a-zA-Z0-9]+)/click', array(
            'methods' => 'POST',
            'callback' => [ $this, 'share_track_click' ],
            'permission_callback' => '__return_true',
        ));

        // Public share view endpoint (no authentication required)
        register_rest_route('wishcart/v1', '/share/(?P<share_token>[a-zA-Z0-9]+)/view', array(
            'methods' => 'GET',
            'callback' => [ $this, 'share_view_wishlist' ],
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Create share link
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function share_create($request) {
        if ( ! class_exists('WishCart_Pro_Sharing_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Sharing handler not available', 'wishcart-pro'),
                array('status' => 500)
            );
        }

        $sharing = new WishCart_Pro_Sharing_Handler();
        $params = $request->get_json_params();
        
        $wishlist_id = isset($params['wishlist_id']) ? intval($params['wishlist_id']) : 0;
        $share_type = isset($params['share_type']) ? sanitize_text_field($params['share_type']) : 'link';
        
        $options = array();
        if (isset($params['shared_with_email'])) {
            $options['shared_with_email'] = sanitize_email($params['shared_with_email']);
        }
        if (isset($params['share_message'])) {
            $options['share_message'] = sanitize_textarea_field($params['share_message']);
        }
        if (isset($params['expiration_days'])) {
            $options['expiration_days'] = intval($params['expiration_days']);
        }
        
        $result = $sharing->create_share($wishlist_id, $share_type, $options);
        
        if (is_wp_error($result)) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array('status' => 400)
            );
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'share' => $result,
            'share_url' => $sharing->get_share_url($result['share_token'], $share_type),
        ));
    }

    /**
     * Get share statistics
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function share_get_stats($request) {
        if ( ! class_exists('WishCart_Pro_Sharing_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Sharing handler not available', 'wishcart-pro'),
                array('status' => 500)
            );
        }

        $sharing = new WishCart_Pro_Sharing_Handler();
        $share_token = $request->get_param('share_token');
        
        $share = $sharing->get_share_by_token($share_token);
        if (!$share) {
            return new WP_Error('not_found', __('Share not found', 'wishcart-pro'), array('status' => 404));
        }
        
        $stats = $sharing->get_share_statistics($share['wishlist_id']);
        
        return rest_ensure_response(array(
            'success' => true,
            'share' => $share,
            'stats' => $stats,
        ));
    }

    /**
     * Track share click
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function share_track_click($request) {
        if ( ! class_exists('WishCart_Pro_Sharing_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Sharing handler not available', 'wishcart-pro'),
                array('status' => 500)
            );
        }

        $sharing = new WishCart_Pro_Sharing_Handler();
        $share_token = $request->get_param('share_token');
        
        $share = $sharing->get_share_by_token($share_token);
        if (!$share) {
            return new WP_Error('not_found', __('Share not found', 'wishcart-pro'), array('status' => 404));
        }
        
        $sharing->track_share_click($share['share_id']);
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Click tracked', 'wishcart-pro'),
        ));
    }

    /**
     * View shared wishlist publicly
     * 
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function share_view_wishlist($request) {
        global $wpdb;
        
        if ( ! class_exists('WishCart_Pro_Sharing_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Sharing handler not available', 'wishcart-pro'),
                array('status' => 500)
            );
        }

        $share_token = $request->get_param('share_token');
        $sharing = new WishCart_Pro_Sharing_Handler();
        
        // Get share by token
        $share = $sharing->get_share_by_token($share_token);
        if (!$share) {
            return new WP_Error('not_found', __('Shared wishlist not found or has expired', 'wishcart-pro'), array('status' => 404));
        }
        
        // Get wishlist details
        $wishlists_table = $wpdb->prefix . 'fc_wishlists';
        $wishlist = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$wishlists_table} WHERE id = %d AND status = 'active'",
                $share['wishlist_id']
            ),
            ARRAY_A
        );
        
        if (!$wishlist) {
            return new WP_Error('not_found', __('Wishlist not found', 'wishcart-pro'), array('status' => 404));
        }
        
        // Check privacy status - only public and shared wishlists can be viewed via share link
        if ($wishlist['privacy_status'] === 'private') {
            return new WP_Error('forbidden', __('This wishlist is private', 'wishcart-pro'), array('status' => 403));
        }
        
        // Get wishlist items with product details
        $items_table = $wpdb->prefix . 'fc_wishlist_items';
        $items = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$items_table} WHERE wishlist_id = %d AND status = 'active' ORDER BY position ASC, date_added DESC",
                $share['wishlist_id']
            ),
            ARRAY_A
        );
        
        // Enrich items with product data
        $products = array();
        foreach ($items as $item) {
            $product_id = $item['product_id'];
            $product = class_exists('WishCart_FluentCart_Helper') ? WishCart_FluentCart_Helper::get_product($product_id) : null;
            
            if (!$product) {
                continue;
            }
            
            $product_data = array(
                'id' => $product_id,
                'name' => $product->get_name(),
                'permalink' => get_permalink($product_id),
                'price' => $product->get_price(),
                'regular_price' => $product->get_regular_price(),
                'sale_price' => $product->get_sale_price(),
                'is_on_sale' => $product->is_on_sale(),
                'stock_status' => $product->get_stock_status(),
                'image_url' => wp_get_attachment_url($product->get_image_id()),
                'quantity' => $item['quantity'],
                'notes' => $item['notes'],
                'date_added' => $item['date_added'],
                'variation_id' => $item['variation_id'],
            );
            
            // If it's a variation, get variation details
            if ($item['variation_id'] && $item['variation_id'] > 0) {
                $variation = class_exists('WishCart_FluentCart_Helper') ? WishCart_FluentCart_Helper::get_product($item['variation_id']) : null;
                if ($variation) {
                    // For variations, update prices
                    $product_data['price'] = $variation->get_price();
                    $product_data['regular_price'] = $variation->get_regular_price();
                    $product_data['sale_price'] = $variation->get_sale_price();
                }
            }
            
            $products[] = $product_data;
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'wishlist' => $wishlist,
            'products' => $products,
            'share' => $share,
        ));
    }

}


