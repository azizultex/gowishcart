import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { __ } from '@wordpress/i18n';

const WishlistSettings = ({ settings, updateSettings }) => {
    const wishlistSettings = settings.wishlist || {
        enabled: true,
        shop_page_button: true,
        product_page_button: true,
        button_position: 'bottom',
        custom_css: '',
        wishlist_page_id: 0,
        shared_wishlist_page_id: 0,
        guest_cookie_expiry: 30,
        enable_multiple_wishlists: false,
        button_customization: {
            colors: {
                background: '#ffffff',
                text: '#374151',
                border: 'rgba(107, 114, 128, 0.3)',
                hoverBackground: '#f3f4f6',
                hoverText: '#374151',
                activeBackground: '#fef2f2',
                activeText: '#991b1b',
                activeBorder: 'rgba(220, 38, 38, 0.4)',
                focusBorder: '#3b82f6',
            },
            icon: {
                type: 'predefined',
                value: 'heart',
                customUrl: '',
            },
            labels: {
                add: __('Add to Wishlist', 'wishcart'),
                saved: __('Saved to Wishlist', 'wishcart'),
            },
        },
    };

    const resolveButtonPosition = (value) => {
        switch (value) {
            case 'before':
                return 'top';
            case 'after':
                return 'bottom';
            case 'top':
            case 'bottom':
            case 'left':
            case 'right':
                return value;
            default:
                return 'bottom';
        }
    };

    const buttonPosition = resolveButtonPosition(wishlistSettings.button_position);

    const [wishlistPages, setWishlistPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(false);

    // Load pages for wishlist page selection
    useEffect(() => {
        const loadPages = async () => {
            setLoadingPages(true);
            try {
                const response = await fetch('/wp-json/wp/v2/pages?per_page=100&status=publish');
                if (response.ok) {
                    const pages = await response.json();
                    setWishlistPages(pages);
                }
            } catch (error) {
                console.error('Error loading pages:', error);
            } finally {
                setLoadingPages(false);
            }
        };
        loadPages();
    }, []);

    const updateWishlistSetting = (key, value) => {
        updateSettings('wishlist', key, value);
    };

    return (
        <div className="wishcart-settings-section">
            {/* Enable Wishlist */}
            <div className="wishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Enable Wishlist', 'wishcart')}</h4>
                    <p>{__('Enable or disable wishlist functionality', 'wishcart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        id="wishlist_enabled"
                        checked={wishlistSettings.enabled || false}
                        onCheckedChange={(checked) => updateWishlistSetting('enabled', checked)}
                    />
                </div>
            </div>

            {/* Enable Multiple Wishlists */}
            <div className="wishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Enable Multiple Wishlists', 'wishcart')}</h4>
                    <p>{__('Allow users to create and manage multiple wishlists. When disabled, products are added directly to the default wishlist.', 'wishcart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        id="enable_multiple_wishlists"
                        checked={wishlistSettings.enable_multiple_wishlists || false}
                        onCheckedChange={(checked) => updateWishlistSetting('enable_multiple_wishlists', checked)}
                        disabled={!wishlistSettings.enabled}
                    />
                </div>
            </div>

            {/* Shop Page Button */}
            <div className="wishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Show Button on Shop Page', 'wishcart')}</h4>
                    <p>{__('Display wishlist button on product archive/shop pages', 'wishcart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        id="shop_page_button"
                        checked={wishlistSettings.shop_page_button !== false}
                        onCheckedChange={(checked) => updateWishlistSetting('shop_page_button', checked)}
                        disabled={!wishlistSettings.enabled}
                    />
                </div>
            </div>

            {/* Product Page Button */}
            <div className="wishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Show Button on Product Page', 'wishcart')}</h4>
                    <p>{__('Display wishlist button on single product pages', 'wishcart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        id="product_page_button"
                        checked={wishlistSettings.product_page_button !== false}
                        onCheckedChange={(checked) => updateWishlistSetting('product_page_button', checked)}
                        disabled={!wishlistSettings.enabled}
                    />
                </div>
            </div>

            {/* Button Position */}
            {wishlistSettings.product_page_button && (
                <div className="fluentcart-form-group" style={{borderTop: '1px solid var(--fluentcart-gray-25)', paddingTop: '16px'}}>
                    <label className="fluentcart-label" htmlFor="button_position">
                        {__('Button Position', 'wishcart')}
                    </label>
                    <Select
                        value={buttonPosition}
                        onValueChange={(value) => updateWishlistSetting('button_position', value)}
                        disabled={!wishlistSettings.enabled}
                    >
                        <SelectTrigger id="button_position" className="fluentcart-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="top">
                                {__('Above product actions', 'wishcart')}
                            </SelectItem>
                            <SelectItem value="bottom">
                                {__('Below product actions', 'wishcart')}
                            </SelectItem>
                            <SelectItem value="left">
                                {__('Left of Add to Cart button', 'wishcart')}
                            </SelectItem>
                            <SelectItem value="right">
                                {__('Right of Add to Cart button', 'wishcart')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="fluentcart-form-helper">
                        {__('Choose where to display the wishlist button relative to the purchase actions.', 'wishcart')}
                    </p>
                </div>
            )}

            {/* Wishlist Page */}
            <div className="fluentcart-form-group" style={{borderTop: '1px solid var(--fluentcart-gray-25)', paddingTop: '16px'}}>
                <label className="fluentcart-label" htmlFor="wishlist_page">
                    {__('Wishlist Page', 'wishcart')}
                </label>
                <Select
                    value={String(wishlistSettings.wishlist_page_id || 0)}
                    onValueChange={(value) => updateWishlistSetting('wishlist_page_id', parseInt(value, 10))}
                    disabled={!wishlistSettings.enabled || loadingPages}
                >
                    <SelectTrigger id="wishlist_page" className="fluentcart-select">
                        <SelectValue placeholder={__('Select a page', 'wishcart')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">{__('-- Select Page --', 'wishcart')}</SelectItem>
                        {wishlistPages.map((page) => (
                            <SelectItem key={page.id} value={String(page.id)}>
                                {page.title.rendered}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="fluentcart-form-helper">
                    {__('Select the page where the wishlist will be displayed. Make sure the page contains the [WishCart_Wishlist] shortcode.', 'wishcart')}
                </p>
            </div>

            {/* Shareable Page */}
            <div className="fluentcart-form-group">
                <label className="fluentcart-label" htmlFor="shared_wishlist_page">
                    {__('Shareable Page', 'wishcart')}
                </label>
                <Select
                    value={String(wishlistSettings.shared_wishlist_page_id || 0)}
                    onValueChange={(value) => updateWishlistSetting('shared_wishlist_page_id', parseInt(value, 10))}
                    disabled={!wishlistSettings.enabled || loadingPages}
                >
                    <SelectTrigger id="shared_wishlist_page" className="fluentcart-select">
                        <SelectValue placeholder={__('Select a page', 'wishcart')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">{__('-- Select Page --', 'wishcart')}</SelectItem>
                        {wishlistPages.map((page) => (
                            <SelectItem key={page.id} value={String(page.id)}>
                                {page.title.rendered}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="fluentcart-form-helper">
                    {__('Select the page where shared wishlists will be displayed. Make sure the page contains the [wishcart_shared_wishlist] shortcode.', 'wishcart')}
                </p>
            </div>

            {/* Guest Cookie Expiry */}
            <div className="fluentcart-form-group">
                <label className="fluentcart-label" htmlFor="guest_cookie_expiry">
                    {__('Guest Wishlist Expiry (Days)', 'wishcart')}
                </label>
                <Input
                    id="guest_cookie_expiry"
                    type="number"
                    min="1"
                    max="365"
                    value={wishlistSettings.guest_cookie_expiry || 30}
                    onChange={(e) => updateWishlistSetting('guest_cookie_expiry', parseInt(e.target.value, 10))}
                    disabled={!wishlistSettings.enabled}
                    className="fluentcart-input"
                    style={{maxWidth: '200px'}}
                />
                <p className="fluentcart-form-helper">
                    {__('Number of days guest wishlists are stored in cookies', 'wishcart')}
                </p>
            </div>

            {/* Custom CSS */}
            <div className="fluentcart-form-group wishcart-code-editor">
                <label className="fluentcart-label" htmlFor="custom_css">
                    {__('Custom CSS', 'wishcart')}
                </label>
                <Textarea
                    id="custom_css"
                    rows={8}
                    value={wishlistSettings.custom_css || ''}
                    onChange={(e) => updateWishlistSetting('custom_css', e.target.value)}
                    placeholder={__('Add custom CSS for wishlist button styling...', 'wishcart')}
                    disabled={!wishlistSettings.enabled}
                    className="fluentcart-textarea"
                />
                <p className="fluentcart-form-helper">
                    {__('Add custom CSS to style the wishlist button. Use selector: .wishcart-wishlist-button', 'wishcart')}
                </p>
            </div>
        </div>
    );
};

export default WishlistSettings;

