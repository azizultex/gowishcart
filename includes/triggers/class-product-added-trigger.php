<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Product Added to Wishlist Trigger
 *
 * FluentCRM trigger for when a product is added to wishlist
 * This class extends FluentCRM's BaseTrigger if available, otherwise uses filter-based registration
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
if ( class_exists( '\FluentCrm\App\Services\Funnel\BaseTrigger' ) ) {
    class WISHCART_Product_Added_Trigger extends FluentCrm\App\Services\Funnel\BaseTrigger {

        /**
         * Constructor
         */
        public function __construct() {
            $this->triggerName = 'wishcart_product_added';
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
                'title'       => __( 'Product Added to Wishlist', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when a product is added to a wishlist.', 'wish-cart' ),
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
                'label'       => __( 'Product Added to Wishlist', 'wish-cart' ),
                'description' => __( 'This funnel will be initiated when a product is added to a wishlist.', 'wish-cart' ),
                'icon'        => 'dashicons-heart',
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

            // Get contact by email
            if ( function_exists( 'fluentCrmGetContact' ) ) {
                $contact = fluentCrmGetContact( $contact_email );
                if ( $contact ) {
                    // Trigger will be handled by FluentCRM's funnel system
                    do_action( 'fluentcrm_automation_trigger_wishcart_product_added', $contact_email, $trigger_data );
                }
            }
        }
    }
} else {
    // Fallback: Create a stub class if BaseTrigger is not available
    class WISHCART_Product_Added_Trigger {
        public function __construct() {
            // Trigger registration handled via filter in main class
        }
    }
}

