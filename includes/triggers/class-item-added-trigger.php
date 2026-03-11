<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * GoWishCart Item Added Trigger
 *
 * Triggers when a product is added to a wishlist
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class GoWishCart_Item_Added_Trigger extends \FluentCrm\App\Services\Funnel\BaseTrigger {

    /**
     * Constructor
     */
    public function __construct() {
        $this->triggerName = 'gowishcart_item_added';
        $this->priority = 20;
        $this->actionArgNum = 1;
        
        parent::__construct();
    }

    /**
     * Get trigger
     *
     * @return array
     */
    public function getTrigger() {
        return array(
            'category'    => __( 'GoWishCart', 'gowishcart-wishlist-for-fluentcart' ),
            'label'       => __( 'Item Added to GoWishCart', 'gowishcart-wishlist-for-fluentcart' ),
            'description' => __( 'This funnel will be initiated when a product is added to a wishlist', 'gowishcart-wishlist-for-fluentcart' ),
            // 'icon'        => 'fc-icon-heart',
        );
    }

    /**
     * Get funnel settings defaults
     *
     * @return array
     */
    public function getFunnelSettingsDefaults() {
        return array();
    }

    /**
     * Get settings fields
     *
     * @param object $funnel Funnel object
     * @return array
     */
    public function getSettingsFields( $funnel ) {
        return array();
    }

    /**
     * Handle the trigger
     *
     * @param object $funnel Funnel object
     * @param array  $originalArgs Original trigger arguments
     * @return void
     */
    public function handle( $funnel, $originalArgs ) {
        // Extract item data from originalArgs
        // The data structure: $originalArgs[0] contains the trigger data array
        $item_data = isset( $originalArgs[0] ) && is_array( $originalArgs[0] ) ? $originalArgs[0] : array();
        
        // Validate that we have the required data
        if ( empty( $item_data ) || ! is_array( $item_data ) ) {
            return;
        }
        
        // Check if this funnel should process this trigger
        $willProcess = $this->isProcessable( $funnel, $item_data );
        
        // Allow filtering
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Calling FluentCRM filter, not creating new hook
        $willProcess = apply_filters( 'fluentcrm_funnel_will_process_' . $this->triggerName, $willProcess, $funnel, $originalArgs );
        
        if ( ! $willProcess ) {
            return;
        }
        
        // Get email from item data
        $email = isset( $item_data['email'] ) ? sanitize_email( $item_data['email'] ) : '';
        
        // If email not in item_data, try to get from user_id
        if ( empty( $email ) && ! empty( $item_data['user_id'] ) ) {
            $user = get_userdata( $item_data['user_id'] );
            if ( $user && $user->user_email ) {
                $email = $user->user_email;
            }
        }
        
        // If still no email, try to get from session_id (guest)
        if ( empty( $email ) && ! empty( $item_data['session_id'] ) && class_exists( 'GoWishCart_Guest_Handler' ) ) {
            $guest_handler = new GoWishCart_Guest_Handler();
            $guest = $guest_handler->get_guest_by_session( $item_data['session_id'] );
            if ( $guest && ! empty( $guest['guest_email'] ) && is_email( $guest['guest_email'] ) ) {
                $email = $guest['guest_email'];
            }
        }
        
        if ( empty( $email ) || ! is_email( $email ) ) {
            return;
        }
        
        // Get user data if available
        $user_id = isset( $item_data['user_id'] ) ? intval( $item_data['user_id'] ) : 0;
        $user = $user_id ? get_userdata( $user_id ) : null;
        
        // Prepare subscriber data array (similar to fluent-booking)
        // IMPORTANT: Only include simple scalar values (strings, ints) - no objects or complex arrays
        // Use array_filter() like fluent-booking to remove empty values
        $subscriberData = array_filter( array(
            'first_name' => $user ? $user->first_name : '',
            'last_name'  => $user ? $user->last_name : '',
            'email'      => $email,
            'user_id'    => $user_id > 0 ? $user_id : null,
            'status'     => 'subscribed', // Default status
        ) );
        
        // Use FunnelProcessor to start the funnel sequence (same as fluent-booking)
        // IMPORTANT: Only pass simple scalar values in the third parameter to avoid database serialization errors
        if ( class_exists( '\FluentCrm\App\Services\Funnel\FunnelProcessor' ) ) {
            try {
                $processor = new \FluentCrm\App\Services\Funnel\FunnelProcessor();
                
                // Only pass simple scalar values like fluent-booking does
                // Do NOT pass complex arrays/objects that cause preg_replace errors in FluentCRM's database layer
                // Use product_id as source_ref_id so SmartCode can retrieve product data for dynamic shortcodes
                $source_ref_id = isset( $item_data['product_id'] ) ? intval( $item_data['product_id'] ) : 0;
                
                $processor->startFunnelSequence( $funnel, $subscriberData, array(
                    'source_trigger_name' => $this->triggerName,
                    'source_ref_id'       => $source_ref_id,
                ) );
            } catch ( Exception $e ) {
                // Error handled silently
            }
        }
    }
    
    /**
     * Check if funnel should process this trigger
     *
     * @param object $funnel Funnel object
     * @param array  $item_data Item data
     * @return bool
     */
    private function isProcessable( $funnel, $item_data ) {
        // For now, all item added triggers are processable
        // Can add filtering logic here if needed (e.g., by product category, wishlist type, etc.)
        
        // Check if subscriber is already in this funnel
        if ( class_exists( '\FluentCrm\App\Services\Funnel\FunnelHelper' ) ) {
            $email = isset( $item_data['email'] ) ? sanitize_email( $item_data['email'] ) : '';
            
            // If email not in item_data, try to get from user_id
            if ( empty( $email ) && ! empty( $item_data['user_id'] ) ) {
                $user = get_userdata( $item_data['user_id'] );
                if ( $user && $user->user_email ) {
                    $email = $user->user_email;
                }
            }
            
            // If still no email, try to get from session_id (guest)
            if ( empty( $email ) && ! empty( $item_data['session_id'] ) && class_exists( 'GoWishCart_Guest_Handler' ) ) {
                $guest_handler = new GoWishCart_Guest_Handler();
                $guest = $guest_handler->get_guest_by_session( $item_data['session_id'] );
                if ( $guest && ! empty( $guest['guest_email'] ) && is_email( $guest['guest_email'] ) ) {
                    $email = $guest['guest_email'];
                }
            }
            
            if ( ! empty( $email ) ) {
                $subscriber = \FluentCrm\App\Services\Funnel\FunnelHelper::getSubscriber( $email );
                
                if ( $subscriber && \FluentCrm\App\Services\Funnel\FunnelHelper::ifAlreadyInFunnel( $funnel->id, $subscriber->id ) ) {
                    // Check if funnel allows multiple runs
                    $runOnlyOnce = isset( $funnel->conditions['run_only_one'] ) && $funnel->conditions['run_only_one'] === 'yes';
                    
                    if ( $runOnlyOnce ) {
                        return false; // Already in funnel and only allowed once
                    } else {
                        // Remove from funnel to allow re-entry
                        \FluentCrm\App\Services\Funnel\FunnelHelper::removeSubscribersFromFunnel( $funnel->id, array( $subscriber->id ) );
                        return true;
                    }
                }
            }
        }
        
        return true;
    }
}

