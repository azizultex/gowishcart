<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * WishCart Back in Stock Trigger
 *
 * Triggers when a product in a wishlist comes back in stock
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
class WISHCART_Back_In_Stock_Trigger extends \FluentCrm\App\Services\Funnel\BaseTrigger {

    /**
     * Constructor
     */
    public function __construct() {
        $this->triggerName = 'wishcart_back_in_stock';
        $this->priority = 20;
        $this->actionArgNum = 2;
        parent::__construct();
    }

    /**
     * Get trigger
     *
     * @return array
     */
    public function getTrigger() {
        return array(
            'category'      => __( 'WishCart', 'wish-cart' ),
            'label'         => __( 'Item Back in Stock', 'wish-cart' ) . ' (' . __( 'Upcoming', 'wish-cart' ) . ')',
            'description'  => __( 'This funnel will be initiated when a product in a wishlist comes back in stock', 'wish-cart' ),
            'icon'          => 'fc-icon-heart',
            'upcoming'      => true,
            'upcoming_label' => __( 'Upcoming', 'wish-cart' ),
            'badge'         => __( 'Upcoming', 'wish-cart' ),
            'is_pro'        => false,
            'disabled'      => true,
            'is_disabled'   => true,
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
     * @param object $funnelSubscriber Funnel subscriber object
     * @param array  $originalArgs     Original trigger arguments
     * @return void
     */
    public function handle( $funnelSubscriber, $originalArgs ) {
        // This method is called when the trigger fires
        // The actual funnel processing is handled by FluentCRM
    }
}

