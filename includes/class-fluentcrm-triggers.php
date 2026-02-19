<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * FluentCRM Triggers Registration Class
 *
 * Registers GoWishCart events as triggers in FluentCRM automation funnel
 * Uses FluentCRM's BaseTrigger class approach
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
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
            return;
        }

        // Register triggers via filter early (before FluentCRM queries for triggers)
        // This ensures triggers are available when FluentCRM loads
        add_filter( 'fluentcrm/available_triggers', array( $this, 'add_triggers_to_fluentcrm' ), 10, 1 );

        // Register triggers after FluentCRM initializes
        add_action( 'fluent_crm/after_init', array( $this, 'register_triggers' ), 20 );
        
        // Also try to register on init in case fluent_crm/after_init doesn't fire
        add_action( 'init', array( $this, 'register_triggers' ), 30 );
        
        // Add CSS class to GoWishCart category icon in FluentCRM interface
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_category_icon_script' ), 20 );
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
     * Register all GoWishCart triggers with FluentCRM
     *
     * @return void
     */
    public function register_triggers() {
        // Prevent duplicate registration (method is called on multiple hooks)
        if ( self::$triggers_registered ) {
            return;
        }

        // Check if BaseTrigger class exists
        if ( ! class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
            return;
        }

        // Mark as registered to prevent duplicate registration
        self::$triggers_registered = true;

        // Filter is already registered in constructor, no need to add it again

        // Also instantiate trigger classes so they can set up their hooks
        // FluentCRM will automatically detect and register triggers that extend BaseTrigger
        if ( class_exists( 'gowishcart_Item_Added_Trigger' ) ) {
            new wishcart_Item_Added_Trigger();
        }

        if ( class_exists( 'gowishcart_Item_Removed_Trigger' ) ) {
            new wishcart_Item_Removed_Trigger();
        }

        if ( class_exists( 'gowishcart_Price_Drop_Trigger' ) ) {
            new wishcart_Price_Drop_Trigger();
        }

        if ( class_exists( 'gowishcart_Back_In_Stock_Trigger' ) ) {
            new wishcart_Back_In_Stock_Trigger();
        }
    }

    /**
     * Add GoWishCart triggers to FluentCRM's available triggers list
     *
     * @param array $triggers Existing triggers
     * @return array Triggers with GoWishCart triggers added
     */
    public function add_triggers_to_fluentcrm( $triggers ) {
        if ( ! is_array( $triggers ) ) {
            $triggers = array();
        }

        // Register each trigger with its key and class name
        if ( class_exists( 'gowishcart_Item_Added_Trigger' ) ) {
            $triggers['gowishcart_item_added'] = 'gowishcart_Item_Added_Trigger';
        }

        if ( class_exists( 'gowishcart_Item_Removed_Trigger' ) ) {
            $triggers['gowishcart_item_removed'] = 'gowishcart_Item_Removed_Trigger';
        }

        if ( class_exists( 'gowishcart_Price_Drop_Trigger' ) ) {
            $triggers['gowishcart_price_drop'] = 'gowishcart_Price_Drop_Trigger';
        }

        if ( class_exists( 'gowishcart_Back_In_Stock_Trigger' ) ) {
            $triggers['gowishcart_back_in_stock'] = 'gowishcart_Back_In_Stock_Trigger';
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
        elseif ( ! empty( $data['session_id'] ) && class_exists( 'gowishcart_Guest_Handler' ) ) {
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

        // If no email found, return early
        if ( empty( $user_email ) ) {
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
                        }
                    } else {
                        // Contact exists, get contact ID
                        $contact_id = is_object( $subscriber ) ? $subscriber->id : ( isset( $subscriber['id'] ) ? $subscriber['id'] : null );
                    }
                }
            }
        }

        // If still no subscriber, cannot proceed
        if ( ! $subscriber ) {
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
            // Fire the action hook that FluentCRM BaseTrigger listens to
            // BaseTrigger listens to the triggerName directly (like fluent-booking does)
            // The action hook should match the triggerName: 'gowishcart_item_added'
            // BaseTrigger will catch this and call handle() for each active funnel
            // The handle() method receives ($funnel, $originalArgs) where $originalArgs[0] is the data
            $action_hook = $trigger_key;
            
            // Prepare the data - it will be passed as the first argument
            // BaseTrigger will wrap it in $originalArgs array, so handle() will receive it as $originalArgs[0]
            // We include email in the data so handle() can get the subscriber
            $trigger_data = $data;
            $trigger_data['email'] = $user_email; // Ensure email is in data
            
            // Fire the action hook - BaseTrigger will catch this and call handle() for each active funnel
            // This matches the pattern used by fluent-booking: do_action('fluent_booking/after_booking_scheduled', $booking)
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Hook name is dynamically constructed from $trigger_key which is always prefixed with 'gowishcart_'
            do_action( $action_hook, $trigger_data );
        }

        // Fire custom hook for extensions (does not trigger FluentCRM funnels)
        do_action( 'gowishcart_trigger_' . $trigger_key, $data );
    }

    /**
     * Enqueue script to add CSS class to GoWishCart category icon in FluentCRM interface
     *
     * @param string $hook Current admin page hook
     * @return void
     */
    public function enqueue_category_icon_script( $hook ) {
        // Only run on FluentCRM admin pages
        if ( strpos( $hook, 'fluentcrm' ) === false ) {
            return;
        }

        // Enqueue jQuery if not already enqueued (it's usually available but ensure it)
        wp_enqueue_script( 'jquery' );

        // Inline JavaScript to add wishcart-trigger-icon class to category icon
        $script = "
        (function() {
            function addCategoryIconClass() {
                // Find menu items containing 'GoWishCart' text
                const menuItems = document.querySelectorAll('.el-menu-item, .el-menu-item--horizontal');
                menuItems.forEach(function(item) {
                    const textContent = item.textContent || item.innerText || '';
                    if (textContent.indexOf('GoWishCart') !== -1) {
                        // Find icon element within this menu item
                        const iconElement = item.querySelector('.el-icon, .fc_trigger_icon, i');
                        if (iconElement && !iconElement.classList.contains('gowishcart-trigger-icon')) {
                            iconElement.classList.add('gowishcart-trigger-icon');
                        }
                    }
                });
            }

            // Run immediately if DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addCategoryIconClass);
            } else {
                addCategoryIconClass();
            }

            // Also use MutationObserver to handle dynamically loaded content
            if (typeof MutationObserver !== 'undefined') {
                const observer = new MutationObserver(function(mutations) {
                    addCategoryIconClass();
                });

                // Start observing when DOM is ready
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                } else {
                    document.addEventListener('DOMContentLoaded', function() {
                        observer.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    });
                }
            }

            // Fallback: run periodically for dynamic content
            setTimeout(addCategoryIconClass, 500);
            setTimeout(addCategoryIconClass, 1000);
            setTimeout(addCategoryIconClass, 2000);
        })();
        ";

        wp_add_inline_script( 'jquery', $script );
    }
}
