<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * WishCart Item Removed Trigger
 *
 * Triggers when a product is removed from a wishlist
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
class WISHCART_Item_Removed_Trigger extends \FluentCrm\App\Services\Funnel\BaseTrigger {

    /**
     * Constructor
     */
    public function __construct() {
        $this->triggerName = 'wishcart_item_removed';
        $this->priority = 20;
        $this->actionArgNum = 1;
        
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] WISHCART_Item_Removed_Trigger constructor called' );
            error_log( '[WishCart] Trigger name: ' . $this->triggerName );
        }
        
        parent::__construct();
        
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] WISHCART_Item_Removed_Trigger initialized successfully' );
        }
    }

    /**
     * Get trigger
     *
     * @return array
     */
    public function getTrigger() {
        return array(
            'category'    => __( 'WishCart', 'wish-cart' ),
            'label'       => __( 'Item Removed from Wishlist', 'wish-cart' ),
            'description' => __( 'This funnel will be initiated when a product is removed from a wishlist', 'wish-cart' ),
            'icon'        => 'fc-icon-heart',
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
        
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] Item Removed Trigger - handle() method called' );
            error_log( '[WishCart] Funnel ID: ' . ( isset( $funnel->id ) ? $funnel->id : 'N/A' ) );
            error_log( '[WishCart] Item data: ' . print_r( $item_data, true ) );
        }
        
        // Validate that we have the required data
        if ( empty( $item_data ) || ! is_array( $item_data ) ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] Warning: Item data is empty or not an array' );
            }
            return;
        }
        
        // Check if this funnel should process this trigger
        $willProcess = $this->isProcessable( $funnel, $item_data );
        
        // Allow filtering
        $willProcess = apply_filters( 'fluentcrm_funnel_will_process_' . $this->triggerName, $willProcess, $funnel, $originalArgs );
        
        if ( ! $willProcess ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] Funnel will not process this trigger' );
            }
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
        if ( empty( $email ) && ! empty( $item_data['session_id'] ) && class_exists( 'WISHCART_Guest_Handler' ) ) {
            $guest_handler = new WISHCART_Guest_Handler();
            $guest = $guest_handler->get_guest_by_session( $item_data['session_id'] );
            if ( $guest && ! empty( $guest['guest_email'] ) && is_email( $guest['guest_email'] ) ) {
                $email = $guest['guest_email'];
            }
        }
        
        if ( empty( $email ) || ! is_email( $email ) ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] Cannot process trigger: No valid email found' );
            }
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
        
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[WishCart] Subscriber data: ' . print_r( $subscriberData, true ) );
        }
        
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
                
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( '[WishCart] FunnelProcessor->startFunnelSequence() called successfully' );
                }
            } catch ( Exception $e ) {
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( '[WishCart] Error in FunnelProcessor: ' . $e->getMessage() );
                    error_log( '[WishCart] Error trace: ' . $e->getTraceAsString() );
                }
            }
        } else {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[WishCart] FunnelProcessor class not found' );
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
        // For now, all item removed triggers are processable
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
            if ( empty( $email ) && ! empty( $item_data['session_id'] ) && class_exists( 'WISHCART_Guest_Handler' ) ) {
                $guest_handler = new WISHCART_Guest_Handler();
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

