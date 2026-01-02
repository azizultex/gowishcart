<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Multiple Wishlist REST API Handler
 *
 * Handles REST API endpoints for multiple wishlist management (Pro feature)
 *
 * @category WordPress
 * @package  WishCart_Pro
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_Pro_Multiple_Wishlist_REST_API {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('rest_api_init', [ $this, 'register_routes' ]);
    }

    /**
     * Register REST API routes for multiple wishlists
     *
     * @return void
     */
    public function register_routes() {
        // Multiple wishlists endpoints
        register_rest_route('wishcart/v1', '/wishlists', array(
            'methods' => 'GET',
            'callback' => [ $this, 'wishlists_get' ],
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/wishlists', array(
            'methods' => 'POST',
            'callback' => [ $this, 'wishlists_create' ],
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('wishcart/v1', '/wishlists/(?P<id>\d+)', array(
            'methods' => 'PUT',
            'callback' => [ $this, 'wishlists_update' ],
            'permission_callback' => '__return_true', // Public endpoint
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));

        register_rest_route('wishcart/v1', '/wishlists/(?P<id>\d+)', array(
            'methods' => 'DELETE',
            'callback' => [ $this, 'wishlists_delete' ],
            'permission_callback' => '__return_true', // Public endpoint
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                ),
            ),
        ));
    }

    /**
     * Get user's wishlists
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlists_get( $request ) {
        if ( ! class_exists('WishCart_Wishlist_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Wishlist handler not available', 'wishcart-pro'),
                array( 'status' => 500 )
            );
        }

        $handler = new WishCart_Wishlist_Handler();
        $session_id = $request->get_param( 'session_id' );
        $session_id = is_string( $session_id ) ? sanitize_text_field( wp_unslash( $session_id ) ) : null;
        
        // If session_id not provided in query, try to read from cookie
        if ( empty( $session_id ) && ! is_user_logged_in() ) {
            $cookie_name = 'wishcart_session_id';
            if ( isset( $_COOKIE[ $cookie_name ] ) && ! empty( $_COOKIE[ $cookie_name ] ) ) {
                $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ $cookie_name ] ) );
            }
        }
        
        $wishlists = $handler->get_user_wishlists( null, $session_id );
        
        return rest_ensure_response( array(
            'success' => true,
            'wishlists' => $wishlists,
            'count' => count( $wishlists ),
        ) );
    }

    /**
     * Create new wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlists_create( $request ) {
        if ( ! class_exists('WishCart_Wishlist_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Wishlist handler not available', 'wishcart-pro'),
                array( 'status' => 500 )
            );
        }

        $handler = new WishCart_Wishlist_Handler();
        $params = $request->get_json_params();
        
        $name = isset( $params['name'] ) ? sanitize_text_field( $params['name'] ) : 'New Wishlist';
        $is_default = isset( $params['is_default'] ) ? (bool) $params['is_default'] : false;
        $session_id = isset( $params['session_id'] ) ? sanitize_text_field( $params['session_id'] ) : null;
        
        // If session_id not provided in request body, try to read from cookie
        if ( empty( $session_id ) && ! is_user_logged_in() ) {
            $cookie_name = 'wishcart_session_id';
            if ( isset( $_COOKIE[ $cookie_name ] ) && ! empty( $_COOKIE[ $cookie_name ] ) ) {
                $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ $cookie_name ] ) );
            }
        }
        
        $result = $handler->create_wishlist( $name, null, $session_id, $is_default );
        
        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }
        
        return rest_ensure_response( array(
            'success' => true,
            'wishlist' => $result,
            'message' => __( 'Wishlist created successfully', 'wishcart-pro' ),
        ) );
    }

    /**
     * Update wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlists_update( $request ) {
        if ( ! class_exists('WishCart_Wishlist_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Wishlist handler not available', 'wishcart-pro'),
                array( 'status' => 500 )
            );
        }

        $handler = new WishCart_Wishlist_Handler();
        $wishlist_id = intval( $request->get_param( 'id' ) );
        $params = $request->get_json_params();
        
        $result = $handler->update_wishlist( $wishlist_id, $params );
        
        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }
        
        $wishlist = $handler->get_wishlist( $wishlist_id );
        
        return rest_ensure_response( array(
            'success' => true,
            'wishlist' => $wishlist,
            'message' => __( 'Wishlist updated successfully', 'wishcart-pro' ),
        ) );
    }

    /**
     * Delete wishlist
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function wishlists_delete( $request ) {
        if ( ! class_exists('WishCart_Wishlist_Handler') ) {
            return new WP_Error(
                'handler_not_found',
                __('Wishlist handler not available', 'wishcart-pro'),
                array( 'status' => 500 )
            );
        }

        $handler = new WishCart_Wishlist_Handler();
        $wishlist_id = intval( $request->get_param( 'id' ) );
        
        $result = $handler->delete_wishlist( $wishlist_id );
        
        if ( is_wp_error( $result ) ) {
            return new WP_Error(
                $result->get_error_code(),
                $result->get_error_message(),
                array( 'status' => 400 )
            );
        }
        
        return rest_ensure_response( array(
            'success' => true,
            'message' => __( 'Wishlist deleted successfully', 'wishcart-pro' ),
        ) );
    }

}


