<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * FluentCRM Triggers Registration Class
 *
 * Registers WishCart events as triggers in FluentCRM automation funnel
 * Uses FluentCRM's BaseTrigger class approach
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class WishCart_FluentCRM_Triggers {

    /**
     * Flag to prevent duplicate trigger registration
     *
     * @var bool
     */
    private static $triggers_registered = false;

    /**
     * Constructor
     */
    public function __construct() {
        // Only register if FluentCRM is available
        if ( ! $this->is_fluentcrm_available() ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] FluentCRM not available. Triggers will not be registered.' );
            }
            return;
        }

        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[wishcart] FluentCRM detected. Initializing trigger registration...' );
        }

        // Register triggers via filter early (before FluentCRM queries for triggers)
        // This ensures triggers are available when FluentCRM loads
        add_filter( 'fluentcrm/available_triggers', array( $this, 'add_triggers_to_fluentcrm' ), 10, 1 );

        // Register triggers after FluentCRM initializes
        add_action( 'fluent_crm/after_init', array( $this, 'register_triggers' ), 20 );
        
        // Also try to register on init in case fluent_crm/after_init doesn't fire
        add_action( 'init', array( $this, 'register_triggers' ), 30 );
    }

    /**
     * Check if FluentCRM is available
     *
     * @return bool
     */
    private function is_fluentcrm_available() {
        return class_exists( 'FluentCrm\App\Services\FluentCrm' ) ||
               class_exists( 'FluentCrm\Framework\Foundation\Application' ) ||
               class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ||
               function_exists( 'fluentcrm' ) ||
               defined( 'FLUENTCRM' );
    }

    /**
     * Register all WishCart triggers with FluentCRM
     *
     * @return void
     */
    public function register_triggers() {
        // Prevent duplicate registration (method is called on multiple hooks)
        if ( self::$triggers_registered ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Triggers already registered, skipping duplicate registration.' );
            }
            return;
        }

        // Check if BaseTrigger class exists
        if ( ! class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] FluentCRM BaseTrigger class not found. Triggers cannot be registered.' );
            }
            return;
        }

        // Mark as registered to prevent duplicate registration
        self::$triggers_registered = true;

        // Filter is already registered in constructor, no need to add it again

        // Also instantiate trigger classes so they can set up their hooks
        // FluentCRM will automatically detect and register triggers that extend BaseTrigger
        if ( class_exists( 'wishcart_Item_Added_Trigger' ) ) {
            new wishcart_Item_Added_Trigger();
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] wishcart_Item_Added_Trigger instantiated' );
            }
        }

        if ( class_exists( 'wishcart_Item_Removed_Trigger' ) ) {
            new wishcart_Item_Removed_Trigger();
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] wishcart_Item_Removed_Trigger instantiated' );
            }
        }

        if ( class_exists( 'wishcart_Price_Drop_Trigger' ) ) {
            new wishcart_Price_Drop_Trigger();
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] wishcart_Price_Drop_Trigger instantiated' );
            }
        }

        if ( class_exists( 'wishcart_Back_In_Stock_Trigger' ) ) {
            new wishcart_Back_In_Stock_Trigger();
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] wishcart_Back_In_Stock_Trigger instantiated' );
            }
        }

        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[wishcart] All triggers registered with FluentCRM' );
        }
    }

    /**
     * Add WishCart triggers to FluentCRM's available triggers list
     *
     * @param array $triggers Existing triggers
     * @return array Triggers with WishCart triggers added
     */
    public function add_triggers_to_fluentcrm( $triggers ) {
        if ( ! is_array( $triggers ) ) {
            $triggers = array();
        }

        // Register each trigger with its key and class name
        if ( class_exists( 'wishcart_Item_Added_Trigger' ) ) {
            $triggers['wishcart_item_added'] = 'wishcart_Item_Added_Trigger';
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Registered trigger: wishcart_item_added' );
            }
        }

        if ( class_exists( 'wishcart_Item_Removed_Trigger' ) ) {
            $triggers['wishcart_item_removed'] = 'wishcart_Item_Removed_Trigger';
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Registered trigger: wishcart_item_removed' );
            }
        }

        if ( class_exists( 'wishcart_Price_Drop_Trigger' ) ) {
            $triggers['wishcart_price_drop'] = 'wishcart_Price_Drop_Trigger';
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Registered trigger: wishcart_price_drop' );
            }
        }

        if ( class_exists( 'wishcart_Back_In_Stock_Trigger' ) ) {
            $triggers['wishcart_back_in_stock'] = 'wishcart_Back_In_Stock_Trigger';
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Registered trigger: wishcart_back_in_stock' );
            }
        }

        return $triggers;
    }

    /**
     * Fire FluentCRM automation trigger
     *
     * @param string $trigger_key Trigger key
     * @param array  $data        Trigger data
     * @return void
     */
    public static function fire_trigger( $trigger_key, $data = array() ) {
        // Debug logging
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[wishcart] ========================================' );
            error_log( '[wishcart] Firing trigger: ' . $trigger_key );
            error_log( '[wishcart] Trigger data received: ' . print_r( $data, true ) );
            error_log( '[wishcart] ========================================' );
        }

        // Get user email from data if available
        $user_email = null;
        $contact_id = null;
        $subscriber = null;

        // For logged-in users, get email from user_id
        if ( ! empty( $data['user_id'] ) ) {
            $user = get_userdata( $data['user_id'] );
            if ( $user && $user->user_email ) {
                $user_email = $user->user_email;
            }
        }
        // For guest users, get email from session_id or email field
        elseif ( ! empty( $data['session_id'] ) && class_exists( 'wishcart_Guest_Handler' ) ) {
            $guest_handler = new wishcart_Guest_Handler();
            $guest = $guest_handler->get_guest_by_session( $data['session_id'] );
            if ( $guest && ! empty( $guest['guest_email'] ) && is_email( $guest['guest_email'] ) ) {
                $user_email = $guest['guest_email'];
            }
        }
        // Also check if email is directly in data (from add_to_wishlist)
        if ( empty( $user_email ) && ! empty( $data['email'] ) && is_email( $data['email'] ) ) {
            $user_email = $data['email'];
        }

        // If no email found, log and return early
        if ( empty( $user_email ) ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Cannot fire trigger: No email found for trigger ' . $trigger_key );
            }
            return;
        }

        // Ensure contact exists in FluentCRM BEFORE firing trigger
        if ( ! empty( $user_email ) && class_exists( 'WishCart_FluentCRM_Integration' ) ) {
            $fluentcrm = new WishCart_FluentCRM_Integration();
            if ( $fluentcrm->is_available() ) {
                $settings = $fluentcrm->get_settings();
                if ( $settings['enabled'] ) {
                    // Try to get existing contact
                    $subscriber = $fluentcrm->get_contact( $user_email );
                    
                    // If contact doesn't exist, create it
                    if ( ! $subscriber ) {
                        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                            error_log( '[wishcart] Contact not found, creating: ' . $user_email );
                        }
                        
                        // Get user_id if available for contact creation
                        $user_id_for_contact = isset( $data['user_id'] ) ? $data['user_id'] : null;
                        
                        // Create or update contact in FluentCRM
                        $contact_id = $fluentcrm->create_or_update_contact( $user_id_for_contact, $user_email, array() );
                        
                        if ( ! is_wp_error( $contact_id ) && $contact_id ) {
                            // Get the newly created contact
                            $subscriber = $fluentcrm->get_contact( $user_email );
                            
                            // Ensure contact is added to default list
                            $default_list_id = $fluentcrm->get_or_create_default_list();
                            if ( ! is_wp_error( $default_list_id ) ) {
                                $fluentcrm->attach_lists( $contact_id, array( $default_list_id ) );
                            }
                        } else {
                            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                                error_log( '[wishcart] Failed to create contact: ' . ( is_wp_error( $contact_id ) ? $contact_id->get_error_message() : 'Unknown error' ) );
                            }
                        }
                    } else {
                        // Contact exists, get contact ID
                        $contact_id = is_object( $subscriber ) ? $subscriber->id : ( isset( $subscriber['id'] ) ? $subscriber['id'] : null );
                        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                            error_log( '[wishcart] Contact found: ' . $user_email . ' (ID: ' . $contact_id . ')' );
                        }
                    }
                }
            }
        }

        // If still no subscriber, cannot proceed
        if ( ! $subscriber ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Cannot fire trigger: No subscriber found for ' . $user_email );
            }
            return;
        }

        // Prepare trigger data for FluentCRM
        $trigger_data = array(
            'trigger_key' => $trigger_key,
            'data' => $data,
            'user_email' => $user_email,
            'user_id' => isset( $data['user_id'] ) ? $data['user_id'] : null,
            'email' => $user_email, // Ensure email is in the data
        );

        // Add contact/subscriber information (FluentCRM expects these)
        if ( $contact_id ) {
            $trigger_data['contact_id'] = $contact_id;
        }
        if ( $subscriber ) {
            $trigger_data['subscriber'] = $subscriber;
            $trigger_data['contact'] = $subscriber; // Some FluentCRM versions use 'contact'
        }

        // Fire FluentCRM's expected action hook format
        // FluentCRM BaseTrigger automatically listens for action hooks when trigger is registered
        // The action hook format is: fluentcrm_funnel_trigger_{trigger_key}
        // BaseTrigger's parent constructor sets up listeners for these hooks
        // The handle() method in the trigger class will process the funnel using FunnelProcessor
        if ( $subscriber ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Preparing to fire trigger: ' . $trigger_key );
                error_log( '[wishcart] Subscriber email: ' . $user_email );
            }
            
            // Fire the action hook that FluentCRM BaseTrigger listens to
            // BaseTrigger listens to the triggerName directly (like fluent-booking does)
            // The action hook should match the triggerName: 'wishcart_item_added'
            // BaseTrigger will catch this and call handle() for each active funnel
            // The handle() method receives ($funnel, $originalArgs) where $originalArgs[0] is the data
            $action_hook = $trigger_key;
            
            // Prepare the data - it will be passed as the first argument
            // BaseTrigger will wrap it in $originalArgs array, so handle() will receive it as $originalArgs[0]
            // We include email in the data so handle() can get the subscriber
            $trigger_data = $data;
            $trigger_data['email'] = $user_email; // Ensure email is in data
            
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Firing FluentCRM trigger action hook: ' . $action_hook );
                error_log( '[wishcart] Trigger data: ' . print_r( $trigger_data, true ) );
            }
            
            // Fire the action hook - BaseTrigger will catch this and call handle() for each active funnel
            // This matches the pattern used by fluent-booking: do_action('fluent_booking/after_booking_scheduled', $booking)
            do_action( $action_hook, $trigger_data );
            
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Trigger action hook fired successfully: ' . $action_hook );
            }
        } else {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( '[wishcart] Cannot fire trigger: No subscriber object available' );
            }
        }

        // Fire custom hook for extensions (does not trigger FluentCRM funnels)
        do_action( 'wishcart_trigger_' . $trigger_key, $data );
    }
}
