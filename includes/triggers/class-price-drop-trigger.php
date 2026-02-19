<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * GoWishCart Price Drop Trigger
 *
 * Triggers when a product in a wishlist has a price drop
 *
 * @category WordPress
 * @package  GoWishCart
 * @author   GoWishCart Team <support@gowishcart.com>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://gowishcart.com
 */
class wishcart_Price_Drop_Trigger extends \FluentCrm\App\Services\Funnel\BaseTrigger {

    /**
     * Constructor
     */
    public function __construct() {
        $this->triggerName = 'gowishcart_price_drop';
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
            'category'      => __( 'GoWishCart', 'gowishcart-wishlist-for-fluentcart' ),
            'label'         => __( 'Price Drop on Wishlist Item', 'gowishcart-wishlist-for-fluentcart' ) . ' (' . __( 'Upcoming', 'gowishcart-wishlist-for-fluentcart' ) . ')',
            'description'  => __( 'This funnel will be initiated when a product in a wishlist has a price drop', 'gowishcart-wishlist-for-fluentcart' ),
            // 'icon'          => 'fc-icon-heart',
            'upcoming'      => true,
            'upcoming_label' => __( 'Upcoming', 'gowishcart-wishlist-for-fluentcart' ),
            'badge'         => __( 'Upcoming', 'gowishcart-wishlist-for-fluentcart' ),
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

