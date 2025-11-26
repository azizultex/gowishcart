<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Product Tag Generator Class
 *
 * Generates FluentCRM tags from product data for automated contact segmentation
 *
 * @category WordPress
 * @package  WishCart
 * @author   WishCart Team <support@wishcart.chat>
 * @license  GPL-2.0+ https://www.gnu.org/licenses/gpl-2.0.html
 * @link     https://wishcart.chat
 */
class WISHCART_Product_Tag_Generator {

    /**
     * Default tag prefixes
     *
     * @var array
     */
    private $tag_prefixes;

    /**
     * Price ranges configuration
     *
     * @var array
     */
    private $price_ranges;

    /**
     * Constructor
     */
    public function __construct() {
        $this->tag_prefixes = $this->get_tag_prefixes();
        $this->price_ranges = $this->get_price_ranges();
    }

    /**
     * Get tag prefixes from settings
     *
     * @return array
     */
    private function get_tag_prefixes() {
        $defaults = array(
            'product' => 'Product:',
            'category' => 'Category:',
            'price_range' => 'Price Range:',
            'sku' => 'SKU:',
            'brand' => 'Brand:',
            'stock_status' => 'Stock Status:',
        );

        $settings = get_option('wishcart_fluentcrm_settings', array());
        $prefixes = isset($settings['tag_prefixes']) ? $settings['tag_prefixes'] : array();

        return wp_parse_args($prefixes, $defaults);
    }

    /**
     * Get price ranges configuration
     *
     * @return array
     */
    private function get_price_ranges() {
        $defaults = array(
            array('min' => 0, 'max' => 50, 'label' => 'Under $50'),
            array('min' => 50, 'max' => 100, 'label' => '$50-$100'),
            array('min' => 100, 'max' => 200, 'label' => '$100-$200'),
            array('min' => 200, 'max' => 500, 'label' => '$200-$500'),
            array('min' => 500, 'max' => PHP_INT_MAX, 'label' => 'Over $500'),
        );

        $settings = get_option('wishcart_fluentcrm_settings', array());
        $ranges = isset($settings['price_ranges']) ? $settings['price_ranges'] : array();

        return !empty($ranges) ? $ranges : $defaults;
    }

    /**
     * Generate tags from product
     *
     * @param int|WISHCART_FluentCart_Product $product Product ID or product object
     * @param array $options Options for tag generation
     * @return array Array of tag strings
     */
    public function generate_tags_from_product($product, $options = array()) {
        $tags = array();

        // Get product object if ID was passed
        if (is_numeric($product)) {
            $product = WISHCART_FluentCart_Helper::get_product($product);
        }

        if (!$product) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[WishCart] Product Tag Generator: Invalid product provided');
            }
            return $tags;
        }

        $product_id = $product->get_id();
        $settings = get_option('wishcart_fluentcrm_settings', array());
        $tagging_enabled = isset($settings['product_tagging_enabled']) ? $settings['product_tagging_enabled'] : true;

        if (!$tagging_enabled) {
            return $tags;
        }

        // Generate product name tag
        if ($this->should_include_tag('product_name', $settings)) {
            $product_name = $this->sanitize_tag($product->get_name());
            if (!empty($product_name)) {
                $tags[] = $this->tag_prefixes['product'] . ' ' . $product_name;
            }
        }

        // Generate category tags
        if ($this->should_include_tag('categories', $settings)) {
            $category_tags = $this->get_category_tags($product_id);
            $tags = array_merge($tags, $category_tags);
        }

        // Generate price range tag
        if ($this->should_include_tag('price_range', $settings)) {
            $price = $product->get_price();
            $price_range = $this->get_price_range($price);
            if (!empty($price_range)) {
                $tags[] = $this->tag_prefixes['price_range'] . ' ' . $price_range;
            }
        }

        // Generate SKU tag
        if ($this->should_include_tag('sku', $settings)) {
            $sku = $this->get_product_sku($product_id);
            if (!empty($sku)) {
                $tags[] = $this->tag_prefixes['sku'] . ' ' . $this->sanitize_tag($sku);
            }
        }

        // Generate brand tag (if available)
        if ($this->should_include_tag('brand', $settings)) {
            $brand = $this->get_product_brand($product_id);
            if (!empty($brand)) {
                $tags[] = $this->tag_prefixes['brand'] . ' ' . $this->sanitize_tag($brand);
            }
        }

        // Generate stock status tag
        if ($this->should_include_tag('stock_status', $settings)) {
            $stock_status = $this->get_stock_status($product);
            if (!empty($stock_status)) {
                $tags[] = $this->tag_prefixes['stock_status'] . ' ' . $stock_status;
            }
        }

        // Allow filtering of generated tags
        $tags = apply_filters('wishcart_product_tags', $tags, $product, $options);

        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[WishCart] Product Tag Generator: Generated tags: ' . print_r($tags, true));
        }

        return array_unique($tags);
    }

    /**
     * Check if a tag type should be included
     *
     * @param string $tag_type Tag type
     * @param array $settings Settings array
     * @return bool
     */
    private function should_include_tag($tag_type, $settings) {
        $include_tags = isset($settings['include_tags']) ? $settings['include_tags'] : array();

        // If no specific settings, include all by default
        if (empty($include_tags)) {
            return true;
        }

        return in_array($tag_type, $include_tags, true);
    }

    /**
     * Get category tags for a product
     *
     * @param int $product_id Product ID
     * @return array Array of category tag strings
     */
    private function get_category_tags($product_id) {
        $tags = array();

        // Try multiple possible taxonomy names for FluentCart
        $taxonomies = array('fc_product_category', 'product_cat', 'fc_category');

        foreach ($taxonomies as $taxonomy) {
            if (taxonomy_exists($taxonomy)) {
                $terms = wp_get_post_terms($product_id, $taxonomy, array('fields' => 'names'));

                if (!is_wp_error($terms) && !empty($terms)) {
                    foreach ($terms as $term_name) {
                        $sanitized_term = $this->sanitize_tag($term_name);
                        if (!empty($sanitized_term)) {
                            $tags[] = $this->tag_prefixes['category'] . ' ' . $sanitized_term;
                        }
                    }
                    break; // Stop after finding first valid taxonomy
                }
            }
        }

        return array_unique($tags);
    }

    /**
     * Get price range label for a price
     *
     * @param float $price Product price
     * @return string Price range label
     */
    public function get_price_range($price) {
        $price = floatval($price);

        foreach ($this->price_ranges as $range) {
            if ($price >= $range['min'] && $price < $range['max']) {
                return $range['label'];
            }
        }

        return '';
    }

    /**
     * Get product SKU
     *
     * @param int $product_id Product ID
     * @return string SKU or empty string
     */
    private function get_product_sku($product_id) {
        // Try to get SKU from post meta
        $sku = get_post_meta($product_id, '_sku', true);

        if (empty($sku)) {
            // Try alternative meta key for FluentCart
            $sku = get_post_meta($product_id, 'sku', true);
        }

        return $sku ? sanitize_text_field($sku) : '';
    }

    /**
     * Get product brand
     *
     * @param int $product_id Product ID
     * @return string Brand or empty string
     */
    private function get_product_brand($product_id) {
        // Try to get brand from taxonomy
        $taxonomies = array('fc_product_brand', 'product_brand', 'brand');

        foreach ($taxonomies as $taxonomy) {
            if (taxonomy_exists($taxonomy)) {
                $terms = wp_get_post_terms($product_id, $taxonomy, array('fields' => 'names'));

                if (!is_wp_error($terms) && !empty($terms)) {
                    return $terms[0]; // Return first brand
                }
            }
        }

        // Try to get brand from post meta
        $brand = get_post_meta($product_id, '_brand', true);

        if (empty($brand)) {
            $brand = get_post_meta($product_id, 'brand', true);
        }

        return $brand ? sanitize_text_field($brand) : '';
    }

    /**
     * Get stock status
     *
     * @param WISHCART_FluentCart_Product $product Product object
     * @return string Stock status
     */
    private function get_stock_status($product) {
        // Check if product has is_in_stock method
        if (method_exists($product, 'is_in_stock')) {
            return $product->is_in_stock() ? 'In Stock' : 'Out of Stock';
        }

        // Try to get stock status from meta
        $product_id = $product->get_id();
        $stock_status = get_post_meta($product_id, '_stock_status', true);

        if ($stock_status === 'instock') {
            return 'In Stock';
        } elseif ($stock_status === 'outofstock') {
            return 'Out of Stock';
        }

        // Default to in stock if unknown
        return 'In Stock';
    }

    /**
     * Sanitize tag name
     *
     * @param string $tag Tag name
     * @return string Sanitized tag
     */
    public function sanitize_tag($tag) {
        // Remove extra whitespace
        $tag = trim($tag);

        // Remove special characters that might cause issues
        $tag = preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $tag);

        // Limit length to 100 characters
        if (strlen($tag) > 100) {
            $tag = substr($tag, 0, 100);
        }

        return $tag;
    }

    /**
     * Get or create tags in FluentCRM
     *
     * This method ensures tags exist in FluentCRM before attaching them to contacts
     *
     * @param array $tag_names Array of tag names
     * @return array Array of tag IDs
     */
    public function get_or_create_tags($tag_names) {
        $tag_ids = array();

        if (empty($tag_names) || !class_exists('\FluentCrm\App\Models\Tag')) {
            return $tag_ids;
        }

        foreach ($tag_names as $tag_name) {
            if (empty($tag_name)) {
                continue;
            }

            try {
                // Check if tag exists
                $tag = \FluentCrm\App\Models\Tag::where('title', $tag_name)->first();

                if (!$tag) {
                    // Create new tag
                    $tag = \FluentCrm\App\Models\Tag::create(array(
                        'title' => $tag_name,
                        'slug' => sanitize_title($tag_name),
                    ));
                }

                if ($tag && isset($tag->id)) {
                    $tag_ids[] = $tag->id;
                }
            } catch (Exception $e) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[WishCart] Error creating/fetching tag: ' . $e->getMessage());
                }
            }
        }

        return $tag_ids;
    }
}

