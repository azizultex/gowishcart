<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * WishCart Price Drop Trigger
 *
 * Triggers when a product in a wishlist has a price drop
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class wishcart_Price_Drop_Trigger extends \FluentCrm\App\Services\Funnel\BaseTrigger {

    /**
     * Constructor
     */
    public function __construct() {
        $this->triggerName = 'wishcart_price_drop';
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
            'category'      => __( 'WishCart', 'wishcart' ),
            'label'         => __( 'Price Drop on Wishlist Item', 'wishcart' ) . ' (' . __( 'Upcoming', 'wishcart' ) . ')',
            'description'  => __( 'This funnel will be initiated when a product in a wishlist has a price drop', 'wishcart' ),
            // 'icon'          => 'fc-icon-heart',
            'upcoming'      => true,
            'upcoming_label' => __( 'Upcoming', 'wishcart' ),
            'badge'         => __( 'Upcoming', 'wishcart' ),
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

