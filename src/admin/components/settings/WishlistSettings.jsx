import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ExternalLink } from "lucide-react";
import { __ } from '@wordpress/i18n';

const WishlistSettings = ({ settings, updateSettings }) => {
    const wishlistSettings = settings.wishlist || {
        enabled: true,
        shop_page_button: true,
        product_page_button: true,
        button_position: 'bottom',
        custom_css: '',
        wishlist_page_id: 0,
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
    const [creatingPage, setCreatingPage] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [pageName, setPageName] = useState('Wishlist');

    // Load pages for wishlist page selection
    const loadPages = async () => {
        setLoadingPages(true);
        try {
            const apiUrl =
                (typeof window !== 'undefined' &&
                    window.wishcartSettings &&
                    window.wishcartSettings.apiUrl) ||
                '/wp-json/wishcart/v1/';

            const response = await fetch(`${apiUrl}pages?per_page=100`, {
                headers: {
                    'X-WP-Nonce':
                        (window.wishcartSettings && window.wishcartSettings.nonce) ||
                        '',
                },
            });

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

    useEffect(() => {
        loadPages();
    }, []);

    const updateWishlistSetting = (key, value) => {
        updateSettings('wishlist', key, value);
    };

    // Get selected page details
    const selectedPageId = parseInt(wishlistSettings.wishlist_page_id || 0, 10);
    const selectedPage = wishlistPages.find((page) => page && page.id === selectedPageId);

    // Get page display text
    const getPageDisplayText = () => {
        if (!selectedPage || !selectedPageId) {
            return __('-- Select Page --', 'wishcart');
        }
        const title =
            (selectedPage.title && (selectedPage.title.rendered || selectedPage.title)) ||
            '';
        return `${title}( ${selectedPageId} )`;
    };

    // Create wishlist page
    const createWishlistPage = async () => {
        if (!pageName.trim()) {
            alert(__('Page name is required', 'wishcart'));
            return;
        }

        setCreatingPage(true);
        try {
            const apiUrl =
                (typeof window !== 'undefined' &&
                    window.wishcartSettings &&
                    window.wishcartSettings.apiUrl) ||
                '/wp-json/wishcart/v1/';

            const response = await fetch(`${apiUrl}pages/create-wishlist`, {
                method: 'POST',
                headers: {
                    'X-WP-Nonce':
                        (window.wishcartSettings && window.wishcartSettings.nonce) ||
                        '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    page_name: pageName.trim(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.page_id) {
                    // Refresh pages list
                    await loadPages();
                    // Select the newly created page
                    updateWishlistSetting('wishlist_page_id', data.page_id);
                    // Close modal and reset page name
                    setIsCreateModalOpen(false);
                    setPageName('Wishlist');
                    // Show success message
                    alert(__('Wishlist page created successfully!', 'wishcart'));
                } else {
                    alert(__('Failed to create wishlist page.', 'wishcart'));
                }
            } else {
                const error = await response.json();
                alert(
                    error.message ||
                        __('Failed to create wishlist page.', 'wishcart')
                );
            }
        } catch (error) {
            console.error('Error creating wishlist page:', error);
            alert(__('An error occurred while creating the wishlist page.', 'wishcart'));
        } finally {
            setCreatingPage(false);
        }
    };

    // Get edit and preview URLs
    const getEditUrl = () => {
        if (!selectedPageId) return '#';
        // WordPress admin URL is typically available via ajaxurl or we can construct it
        const adminUrl = (typeof window !== 'undefined' && window.ajaxurl) 
            ? window.ajaxurl.replace('/admin-ajax.php', '/')
            : '/wp-admin/';
        return `${adminUrl}post.php?post=${selectedPageId}&action=edit`;
    };

    const getPreviewUrl = () => {
        if (!selectedPageId) return '#';
        const siteUrl = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
        if (selectedPage && selectedPage.slug) {
            return `${siteUrl}/${selectedPage.slug}/?preview=true`;
        }
        return `${siteUrl}/?p=${selectedPageId}&preview=true`;
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

            {/* Shortcode */}
            <div className="fluentcart-form-group" style={{borderTop: '1px solid var(--fluentcart-gray-25)', paddingTop: '16px'}}>
                <label className="fluentcart-label">
                    {__('Shortcode', 'wishcart')}
                </label>
                <p className="fluentcart-form-helper" style={{marginTop: '8px'}}>
                    {__('You can add a button manually by using the shortcode', 'wishcart')}{' '}
                    <code style={{fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px'}}>
                        [wishcart_sc id="{'{'}product id{'}'}"]
                    </code>
                    {', '}
                    {__('e.g.', 'wishcart')}{' '}
                    <code style={{fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px'}}>
                        [wishcart_sc id="99"]
                    </code>
                    {' '}
                    {__('for the product whose ID is 99.', 'wishcart')}
                </p>
            </div>

            {/* Wishlist Page */}
            <div className="fluentcart-form-group" style={{borderTop: '1px solid var(--fluentcart-gray-25)', paddingTop: '16px'}}>
                <h4 style={{fontSize: '14px', fontWeight: '600', marginBottom: '4px'}}>
                    {__('Select Wishlist Page', 'wishcart')}
                </h4>
                <p style={{fontSize: '13px', color: '#666', marginBottom: '12px'}}>
                    {__('Select the page where the wishlist will be displayed.', 'wishcart')}
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <Select
                            value={String(wishlistSettings.wishlist_page_id || 0)}
                            onValueChange={(value) => updateWishlistSetting('wishlist_page_id', parseInt(value, 10))}
                            disabled={!wishlistSettings.enabled || loadingPages}
                        >
                            <SelectTrigger id="wishlist_page" className="fluentcart-select">
                                <SelectValue>
                                    {getPageDisplayText()}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">{__('-- Select Page --', 'wishcart')}</SelectItem>
                                {wishlistPages.map((page) => {
                                    const title =
                                        (page &&
                                            page.title &&
                                            (page.title.rendered || page.title)) ||
                                        '';
                                    const label = `${title}( ${page.id} )`;

                                    return (
                                        <SelectItem key={page.id} value={String(page.id)}>
                                            {label}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={!wishlistSettings.enabled || loadingPages}
                        variant="outline"
                        size="icon"
                        style={{ 
                            width: '32px', 
                            height: '32px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Plus size={16} />
                    </Button>
                </div>
                {selectedPageId > 0 && (
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
                        {__('Use', 'wishcart')}{' '}
                        <code style={{fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px'}}>
                            [WishCart_Wishlist]
                        </code>
                        {' '}
                        <a 
                            href={getEditUrl()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#2271b1', textDecoration: 'none', marginLeft: '8px' }}
                        >
                            {__('Edit', 'wishcart')}
                        </a>
                        {' | '}
                        <a 
                            href={getPreviewUrl()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#2271b1', textDecoration: 'none' }}
                        >
                            {__('Preview', 'wishcart')}
                            <ExternalLink size={12} style={{ display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle' }} />
                        </a>
                    </div>
                )}
            </div>

            {/* Create Wishlist Page Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__('Create Wishlist Page', 'wishcart')}</DialogTitle>
                    </DialogHeader>
                    <div style={{ marginTop: '16px' }}>
                        <label 
                            htmlFor="page_name" 
                            style={{ 
                                display: 'block', 
                                fontSize: '14px', 
                                fontWeight: '500', 
                                marginBottom: '8px' 
                            }}
                        >
                            {__('Page Name', 'wishcart')} <span style={{ color: '#dc3232' }}>*</span>
                        </label>
                        <Input
                            id="page_name"
                            type="text"
                            value={pageName}
                            onChange={(e) => setPageName(e.target.value)}
                            placeholder={__('Wishlist', 'wishcart')}
                            disabled={creatingPage}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <DialogFooter style={{ marginTop: '24px' }}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setPageName('Wishlist');
                            }}
                            disabled={creatingPage}
                        >
                            {__('Cancel', 'wishcart')}
                        </Button>
                        <Button
                            type="button"
                            onClick={createWishlistPage}
                            disabled={creatingPage || !pageName.trim()}
                        >
                            {creatingPage
                                ? __('Creating...', 'wishcart')
                                : __('Create Page', 'wishcart')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

