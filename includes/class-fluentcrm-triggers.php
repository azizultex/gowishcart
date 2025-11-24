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
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
class WISHCART_FluentCRM_Triggers {

    /**
     * Constructor
     */
    public function __construct() {
        // Only register if FluentCRM is available
        if ( ! $this->is_fluentcrm_available() ) {
            return;
        }

        // Register triggers after FluentCRM initializes
        add_action( 'fluent_crm/after_init', array( $this, 'register_triggers' ), 20 );
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
        // Check if BaseTrigger class exists
        if ( ! class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
            return;
        }

        // Register each trigger by instantiating the class
        // FluentCRM will automatically detect and register triggers that extend BaseTrigger
        if ( class_exists( 'WISHCART_Item_Added_Trigger' ) ) {
            new WISHCART_Item_Added_Trigger();
        }

        if ( class_exists( 'WISHCART_Item_Removed_Trigger' ) ) {
            new WISHCART_Item_Removed_Trigger();
        }

        if ( class_exists( 'WISHCART_Price_Drop_Trigger' ) ) {
            new WISHCART_Price_Drop_Trigger();
        }

        if ( class_exists( 'WISHCART_Back_In_Stock_Trigger' ) ) {
            new WISHCART_Back_In_Stock_Trigger();
        }
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
        if ( ! empty( $data['user_id'] ) ) {
            $user = get_userdata( $data['user_id'] );
            if ( $user && $user->user_email ) {
                $user_email = $user->user_email;
            }
        }

        // Prepare trigger data for FluentCRM
        $trigger_data = array(
            'trigger_key' => $trigger_key,
            'data' => $data,
            'user_email' => $user_email,
            'user_id' => isset( $data['user_id'] ) ? $data['user_id'] : null,
        );

        // Use FluentCRM's FunnelHelper to process the trigger
        if ( class_exists( '\FluentCrm\App\Services\Funnel\FunnelHelper' ) ) {
            try {
                \FluentCrm\App\Services\Funnel\FunnelHelper::maybeProcessTrigger( $trigger_key, $trigger_data );
            } catch ( Exception $e ) {
                // Log error but don't break execution
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( '[WishCart] FluentCRM trigger error: ' . $e->getMessage() );
                }
            }
        }

        // Also fire the action hook for backward compatibility
        do_action( 'fluentcrm_automation_trigger_' . $trigger_key, $trigger_data );
        do_action( 'wishcart_trigger_' . $trigger_key, $data );
    }
}
