<?php
/**
 * Bridges FluentCart orders to GoWishCart Pro analytics (purchase funnel).
 *
 * Listens for payment-confirmed and order-completed events so online checkouts,
 * offline/cash flows (after payment is marked paid or order completed), and
 * async payment hooks are all covered. Deduplicated per order ID.
 *
 * @package GoWishCart
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class GoWishCart_Analytics_Order_Bridge
 */
class GoWishCart_Analytics_Order_Bridge {

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public static function init() {
		if ( ! apply_filters( 'gowishcart_analytics_order_bridge_enabled', true ) ) {
			return;
		}
		// Paid online + async confirmation (recommended by FluentCart).
		add_action( 'fluent_cart/order_paid_done', array( __CLASS__, 'on_order_paid_done' ), 10, 1 );
		// When payment is marked paid (including manual/offline confirmation in admin).
		add_action( 'fluent_cart/payment_status_changed_to_paid', array( __CLASS__, 'on_payment_status_paid' ), 10, 1 );
		// When order is completed (covers some offline workflows where status moves to completed).
		add_action( 'fluent_cart/order_status_changed_to_completed', array( __CLASS__, 'on_order_status_completed' ), 10, 1 );
	}

	/**
	 * @param array $data FluentCart payload.
	 * @return void
	 */
	public static function on_order_paid_done( $data ) {
		self::track_order_line_purchases( $data );
	}

	/**
	 * @param array $data FluentCart payload.
	 * @return void
	 */
	public static function on_payment_status_paid( $data ) {
		self::track_order_line_purchases( $data );
	}

	/**
	 * @param array $data FluentCart payload.
	 * @return void
	 */
	public static function on_order_status_completed( $data ) {
		self::track_order_line_purchases( $data );
	}

	/**
	 * Record purchase analytics for wishlisted line items (once per order).
	 *
	 * @param array $data Must include Order model under 'order' key.
	 * @return void
	 */
	private static function track_order_line_purchases( $data ) {
		if ( ! class_exists( 'GoWishCart_Analytics_Handler' ) ) {
			return;
		}
		if ( ! is_array( $data ) || empty( $data['order'] ) || ! is_object( $data['order'] ) ) {
			return;
		}

		$fc_order = $data['order'];
		$order_id = isset( $fc_order->id ) ? (int) $fc_order->id : 0;
		if ( $order_id <= 0 ) {
			return;
		}

		$lock_key = 'gwc_analytics_purchase_trk_' . $order_id;
		if ( get_transient( $lock_key ) ) {
			return;
		}

		$wrapped = GoWishCart_FluentCart_Helper::get_order( $order_id );
		if ( ! $wrapped || ! method_exists( $wrapped, 'get_items' ) ) {
			return;
		}

		$items = $wrapped->get_items();
		if ( empty( $items ) ) {
			return;
		}

		set_transient( $lock_key, 1, WEEK_IN_SECONDS );

		$wp_user_id    = 0;
		$billing_email = '';

		if ( ! empty( $data['customer'] ) && is_object( $data['customer'] ) ) {
			if ( ! empty( $data['customer']->user_id ) ) {
				$wp_user_id = (int) $data['customer']->user_id;
			}
			if ( ! empty( $data['customer']->email ) && is_email( $data['customer']->email ) ) {
				$billing_email = sanitize_email( $data['customer']->email );
			}
		}

		if ( 0 === $wp_user_id && method_exists( $wrapped, 'get_customer_user_id' ) ) {
			$wp_user_id = (int) $wrapped->get_customer_user_id();
		}

		if ( '' === $billing_email && method_exists( $wrapped, 'get_billing_email' ) ) {
			$maybe = $wrapped->get_billing_email();
			if ( $maybe && is_email( $maybe ) ) {
				$billing_email = sanitize_email( $maybe );
			}
		}

		// FluentCart sometimes omits customer.user_id; map billing email to WP user for wishlist rows keyed by user_id.
		if ( 0 === $wp_user_id && $billing_email ) {
			$user = get_user_by( 'email', $billing_email );
			if ( $user ) {
				$wp_user_id = (int) $user->ID;
			}
		}

		foreach ( $items as $item ) {
			if ( ! is_object( $item ) || ! method_exists( $item, 'get_product_id' ) ) {
				continue;
			}
			$product_id   = (int) $item->get_product_id();
			$variation_id = method_exists( $item, 'get_variation_id' ) ? (int) $item->get_variation_id() : 0;
			if ( $product_id <= 0 ) {
				continue;
			}

			if ( ! self::line_item_matches_wishlist( $product_id, $variation_id, $wp_user_id, $billing_email ) ) {
				continue;
			}

			$event_type = apply_filters(
				'gowishcart_analytics_purchase_event_type',
				'purchase',
				$product_id,
				$variation_id,
				$order_id
			);

			$analytics = new GoWishCart_Analytics_Handler();
			$analytics->track_event( $product_id, $variation_id, $event_type );
		}

		do_action( 'gowishcart_analytics_after_order_paid_tracked', $order_id, $items, $data );
	}

	/**
	 * Whether this line item matches a wishlist row for the same buyer.
	 *
	 * @param int    $product_id    Product (post) ID.
	 * @param int    $variation_id  Variation ID or 0.
	 * @param int    $wp_user_id    WordPress user ID or 0.
	 * @param string $billing_email Customer email (guest checkout).
	 * @return bool
	 */
	private static function line_item_matches_wishlist( $product_id, $variation_id, $wp_user_id, $billing_email ) {
		global $wpdb;

		$items_table     = $wpdb->prefix . GoWishCart_Table_Names::WISHLIST_ITEMS;
		$wishlists_table = $wpdb->prefix . GoWishCart_Table_Names::WISHLISTS;
		$guest_table     = $wpdb->prefix . GoWishCart_Table_Names::WISHLIST_GUEST_USERS;

		if ( $variation_id > 0 ) {
			$var_clause = 'wi.variation_id = %d';
		} else {
			$var_clause = '( wi.variation_id = 0 OR wi.variation_id IS NULL )';
		}

		if ( $wp_user_id > 0 ) {
			$sql = "SELECT 1 FROM {$items_table} wi
				INNER JOIN {$wishlists_table} w ON w.id = wi.wishlist_id
				WHERE wi.product_id = %d AND {$var_clause} AND w.user_id = %d
				LIMIT 1";
			if ( $variation_id > 0 ) {
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- placeholders match $sql.
				$prepared = $wpdb->prepare( $sql, $product_id, $variation_id, $wp_user_id );
			} else {
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$prepared = $wpdb->prepare( $sql, $product_id, $wp_user_id );
			}
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			return (bool) $wpdb->get_var( $prepared );
		}

		if ( $billing_email && is_email( $billing_email ) ) {
			$sql = "SELECT 1 FROM {$items_table} wi
				INNER JOIN {$wishlists_table} w ON w.id = wi.wishlist_id
				INNER JOIN {$guest_table} g ON g.session_id = w.session_id
				WHERE wi.product_id = %d AND {$var_clause} AND g.guest_email = %s
				LIMIT 1";
			if ( $variation_id > 0 ) {
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$prepared = $wpdb->prepare( $sql, $product_id, $variation_id, $billing_email );
			} else {
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$prepared = $wpdb->prepare( $sql, $product_id, $billing_email );
			}
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			return (bool) $wpdb->get_var( $prepared );
		}

		return false;
	}
}
