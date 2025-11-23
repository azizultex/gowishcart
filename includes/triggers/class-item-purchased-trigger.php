<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Wishlist Item Purchased Trigger
 *
 * FluentCRM trigger for when a wishlist item is purchased
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
if ( class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
    class WISHCART_Item_Purchased_Trigger extends FluentCrm\App\Services\Funnel\BaseTrigger {

        /**
         * Constructor
         */
        public function __construct() {
            $this->triggerName = 'wishcart_item_purchased';
            $this->priority = 20;
            $this->actionArgNum = 1;
            
            parent::__construct();
        }

        /**
         * Get trigger info
         *
         * @return array
         */
        public function getInfo() {
            return array(
                'title'       => __( 'Wishlist Item Purchased', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when any product from a user\'s wishlist is purchased.', 'wish-cart' ),
            );
        }

        /**
         * Get trigger
         *
         * @return array
         */
        public function getTrigger() {
            return array(
                'category'    => 'WishCart',
                'group'       => 'WishCart',
                'label'       => __( 'Wishlist Item Purchased', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when any product from a user\'s wishlist is purchased.', 'wish-cart' ),
                'icon'        => 'dashicons-cart',
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
         * Get trigger conditions
         *
         * @return array
         */
        public function getConditions() {
            return array();
        }

        /**
         * Handle trigger
         *
         * @param string $contact_email Contact email
         * @param array  $trigger_data Trigger data
         * @return void
         */
        public function handle( $contact_email, $trigger_data ) {
            if ( empty( $contact_email ) || ! is_email( $contact_email ) ) {
                return;
            }

            if ( function_exists( 'fluentCrmGetContact' ) ) {
                $contact = fluentCrmGetContact( $contact_email );
                if ( $contact ) {
                    do_action( 'fluentcrm_automation_trigger_wishcart_item_purchased', $contact_email, $trigger_data );
                }
            }
        }
    }
} else {
    class WISHCART_Item_Purchased_Trigger {
        public function __construct() {
            // Trigger registration handled via filter in main class
        }
    }
}

