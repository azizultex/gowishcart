import React, { useState, useEffect, useMemo } from 'react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Lock } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

const gowishcartSettings = typeof window !== 'undefined' ? window.gowishcartSettings || {} : {};

const resolveProStatus = () => {
    if (typeof gowishcartSettings === 'undefined' || !gowishcartSettings.apiUrl) {
        return false;
    }

    const {
        isProActive,
        isPro,
        hasPro,
        isWishcartPro
    } = gowishcartSettings;

    return Boolean(
        isProActive ??
        isPro ??
        hasPro ??
        isWishcartPro ??
        false
    );
};

const FluentCRMSettings = ({ embedded = false }) => {
    const [settings, setSettings] = useState({
        enabled: false,
        fluentcrm_list_id: 0,
        fluentcrm_tag_format: 'detailed',
        fluentcrm_custom_list_name: '',
        fluentcrm_custom_tag_format: '',
    });
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [lists, setLists] = useState([]);
    const [listsLoading, setListsLoading] = useState(true);
    const [wishlistUsersListId, setWishlistUsersListId] = useState(0);
    const isProActive = useMemo(() => resolveProStatus(), []);

    useEffect(() => {
        loadSettings();
        loadLists();
    }, []);

    // Set default to Wishlist Users list ID when lists are loaded and settings have no list selected
    // Also reset to Wishlist Users if current selection is not valid for simplified dropdown
    useEffect(() => {
        if (!listsLoading) {
            const currentListId = settings.fluentcrm_list_id;
            const targetListId = wishlistUsersListId || 0;
            const isValidSelection = currentListId === -1 || currentListId === targetListId;
            
            // If no valid selection or using default (0/undefined), set to Wishlist Users list ID
            // Only update if current value is different from target to prevent unnecessary updates
            if ((currentListId === 0 || currentListId === undefined || !isValidSelection) && currentListId !== targetListId) {
                setSettings(prev => ({
                    ...prev,
                    fluentcrm_list_id: targetListId
                }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listsLoading, wishlistUsersListId]);

    const loadSettings = async () => {
        try {
            const response = await fetch(`${gowishcartSettings.apiUrl}fluentcrm/settings`, {
                headers: {
                    'X-WP-Nonce': gowishcartSettings.nonce
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSettings(data.settings);
                    setIsAvailable(data.is_available);
                }
            }

        } catch (error) {
            console.error('Error loading FluentCRM settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLists = async () => {
        try {
            const response = await fetch(`${gowishcartSettings.apiUrl}fluentcrm/lists`, {
                headers: {
                    'X-WP-Nonce': gowishcartSettings.nonce
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.lists)) {
                    setLists(data.lists);
                    // Find "Wishlist Users" list ID
                    const wishlistUsersList = data.lists.find(list => list.title === 'Wishlist Users');
                    const foundListId = wishlistUsersList ? wishlistUsersList.id : 0;
                    setWishlistUsersListId(foundListId);
                }
            }
        } catch (error) {
            console.error('Error loading FluentCRM lists:', error);
        } finally {
            setListsLoading(false);
        }
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch(`${gowishcartSettings.apiUrl}fluentcrm/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': gowishcartSettings.nonce
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSaveMessage('success');
                    setTimeout(() => setSaveMessage(''), 3000);
                } else {
                    setSaveMessage('error');
                }
            } else {
                setSaveMessage('error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveMessage('error');
        } finally {
            setSaving(false);
        }
    };

    const renderContent = () => (
        <>
            {saveMessage === 'success' && (
                <div className="gowishcart-notice gowishcart-notice-success">
                    <CheckCircle2 style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Settings saved successfully!', 'gowishcart-wishlist-for-fluentcart')}</span>
                </div>
            )}

            {saveMessage === 'error' && (
                <div className="gowishcart-notice gowishcart-notice-error">
                    <XCircle style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Failed to save settings. Please try again.', 'gowishcart-wishlist-for-fluentcart')}</span>
                </div>
            )}

            <div className="gowishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Enable FluentCRM Integration', 'gowishcart-wishlist-for-fluentcart')}</h4>
                    <p>{__('Activate FluentCRM integration for automated campaigns, contact creation, welcome emails, price drops, back-in-stock alerts, time-based reminders, and progressive discounts', 'gowishcart-wishlist-for-fluentcart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        checked={settings.enabled}
                        onCheckedChange={(checked) => updateSetting('enabled', checked)}
                    />
                </div>
            </div>

            {settings.enabled && (
                <>
                    {/* WebHook Credentials Section - Pro/Upcoming Feature */}
                    <div className="gowishcart-notice gowishcart-notice-info" style={{marginTop: '16px'}}>
                        <Lock style={{width: '18px', height: '18px', flexShrink: 0}} />
                        <div style={{flex: 1}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                <strong>{__('WebHook Credentials', 'gowishcart-wishlist-for-fluentcart')}</strong>
                                <span className="gowishcart-badge gowishcart-badge-warning">{__('PRO GoWishCart')}</span>
                                <span className="gowishcart-badge gowishcart-badge-info">{__('COMING SOONgowishcart-wishlist-for-fluentcart')}</span>
                            </div>
                            <p style={{fontSize: '13px', margin: '0'}}>{__('This feature is available in GoWishCart Pro', 'gowishcart-wishlist-for-fluentcart')}</p>
                            <p style={{fontSize: '13px', margin: '4px 0 0', color: 'var(--gowishcart-text-muted)'}}>{__('Please upgrade to get all the advanced features.', 'gowishcart-wishlist-for-fluentcart')}</p>
                        </div>
                    </div>

                    {/* List & auto-tag configuration */}
                    <div style={{ marginTop: '24px' }}>
                <div className="gowishcart-form-group">
                    <div>
                        <label className="gowishcart-label" htmlFor="fluentcrm_list_id">
                            {__('List select', 'gowishcart-wishlist-for-fluentcart')}
                        </label>
                        <p className="gowishcart-form-helper">
                            {__('Choose which FluentCRM list wishlist contacts will be added to.', 'gowishcart-wishlist-for-fluentcart')}
                        </p>
                    </div>
                    <Select
                        value={String(settings.fluentcrm_list_id === -1 ? -1 : (settings.fluentcrm_list_id || wishlistUsersListId || 0))}
                        onValueChange={(value) => {
                            const intValue = parseInt(value, 10);
                            if (intValue === -1) {
                                // Custom selected
                                updateSetting('fluentcrm_list_id', -1);
                            } else {
                                // Wishlist Users selected (use the list ID, or 0 if not found)
                                updateSetting('fluentcrm_list_id', intValue);
                            }
                        }}
                        disabled={listsLoading}
                    >
                        <SelectTrigger id="fluentcrm_list_id" className="gowishcart-select">
                            <SelectValue placeholder={listsLoading ? __('Loading lists...', 'gowishcart-wishlist-for-fluentcart') : __('Wishlist Users', 'gowishcart-wishlist-for-fluentcart')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={String(wishlistUsersListId || 0)}>
                                {__('Wishlist Users', 'gowishcart-wishlist-for-fluentcart')}
                            </SelectItem>
                            <SelectItem value="-1">{__('Custom', 'gowishcart-wishlist-for-fluentcart')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {settings.fluentcrm_list_id === -1 && (
                    <div className="gowishcart-form-group" style={{marginTop: '16px'}}>
                        <div>
                            <label className="gowishcart-label" htmlFor="fluentcrm_custom_list_name">
                                {__('Custom list name', 'gowishcart-wishlist-for-fluentcart')}
                            </label>
                            <p className="gowishcart-form-helper">
                                {__('Enter the name of the list. If the list doesn\'t exist, it will be created automatically.', 'gowishcart-wishlist-for-fluentcart')}
                            </p>
                        </div>
                        <input
                            type="text"
                            id="fluentcrm_custom_list_name"
                            className="gowishcart-input"
                            placeholder={__('Enter custom list name', 'gowishcart-wishlist-for-fluentcart')}
                            value={settings.fluentcrm_custom_list_name || ''}
                            onChange={(e) => updateSetting('fluentcrm_custom_list_name', e.target.value)}
                        />
                    </div>
                )}

                <div className="gowishcart-form-group" style={{marginTop: '16px'}}>
                    <div>
                        <label className="gowishcart-label" htmlFor="fluentcrm_tag_format">
                            {__('Tag format', 'gowishcart-wishlist-for-fluentcart')}
                        </label>
                        <p className="gowishcart-form-helper">
                            {__('Choose how tags are stored in FluentCRM for wishlist products.', 'gowishcart-wishlist-for-fluentcart')}
                        </p>
                    </div>
                    <Select
                        value={settings.fluentcrm_tag_format || 'detailed'}
                        onValueChange={(value) => updateSetting('fluentcrm_tag_format', value)}
                    >
                        <SelectTrigger id="fluentcrm_tag_format" className="gowishcart-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="detailed">{__('Detailed Format', 'gowishcart-wishlist-for-fluentcart')}</SelectItem>
                            <SelectItem value="simple">{__('Simple Format', 'gowishcart-wishlist-for-fluentcart')}</SelectItem>
                            <SelectItem value="prefixed">{__('Prefixed Format', 'gowishcart-wishlist-for-fluentcart')}</SelectItem>
                            <SelectItem value="custom">{__('Custom', 'gowishcart-wishlist-for-fluentcart')}</SelectItem>
                        </SelectContent>
                    </Select>
                    {settings.fluentcrm_tag_format === 'detailed' && (
                        <p style={{fontSize: '12px', color: 'var(--gowishcart-text-muted)', marginTop: '8px', lineHeight: '1.5'}}>
                            {__('Example tags:', 'gowishcart-wishlist-for-fluentcart')} "Product: Cozy Fleece Hoodie", "Cozy Fleece Hoodie - Price: $4.00", "Cozy Fleece Hoodie - Stock: In Stock"
                        </p>
                    )}
                    {settings.fluentcrm_tag_format === 'simple' && (
                        <p style={{fontSize: '12px', color: 'var(--gowishcart-text-muted)', marginTop: '8px', lineHeight: '1.5'}}>
                            {__('Example tags:', 'gowishcart-wishlist-for-fluentcart')} "Cozy Fleece Hoodie"
                        </p>
                    )}
                    {settings.fluentcrm_tag_format === 'prefixed' && (
                        <p style={{fontSize: '12px', color: 'var(--gowishcart-text-muted)', marginTop: '8px', lineHeight: '1.5'}}>
                            {__('Example tags:', 'gowishcart-wishlist-for-fluentcart')} "Product: Cozy Fleece Hoodie", "Category: Clothing", "Price: $4.00", "Stock: In Stock"
                        </p>
                    )}
                    {settings.fluentcrm_tag_format === 'custom' && (
                        <div style={{marginTop: '16px'}}>
                            <label className="gowishcart-label" htmlFor="fluentcrm_custom_tag_format" style={{display: 'block', marginBottom: '8px'}}>
                                {__('Custom tag format', 'gowishcart-wishlist-for-fluentcart')}
                            </label>
                            <textarea
                                id="fluentcrm_custom_tag_format"
                                className="gowishcart-textarea"
                                rows={4}
                                placeholder={__('Example: {product_name} - {price}', 'gowishcart-wishlist-for-fluentcart')}
                                value={settings.fluentcrm_custom_tag_format || ''}
                                onChange={(e) => updateSetting('fluentcrm_custom_tag_format', e.target.value)}
                                style={{width: '100%', resize: 'vertical'}}
                            />
                            <p style={{fontSize: '12px', color: 'var(--gowishcart-text-muted)', marginTop: '8px', lineHeight: '1.5'}}>
                                {__('Available placeholders:', 'gowishcart-wishlist-for-fluentcart')} {'{product_name}, {price}, {category}, {stock}, {sku}, {type}'}
                                <br />
                                {__('Enter one tag per line or separate multiple tags with commas.', 'gowishcart-wishlist-for-fluentcart')}
                            </p>
                        </div>
                    )}
                </div>
                    </div>

                    <div className="gowishcart-card-footer">
                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            className="gowishcart-button gowishcart-button-primary"
                        >
                            {saving ? __('Saving...', 'gowishcart-wishlist-for-fluentcart') : __('Save Settings', 'gowishcart-wishlist-for-fluentcart')}
                        </button>
                    </div>
                </>
            )}
        </>
    );

    if (loading) {
        const LoadingWrapper = embedded ? React.Fragment : ({ children }) => <div className="gowishcart-settings-section">{children}</div>;
        return (
            <LoadingWrapper>
                <div className="gowishcart-flex-center" style={{padding: '40px'}}>
                    <Loader2 style={{width: '24px', height: '24px'}} className="animate-spin" />
                </div>
            </LoadingWrapper>
        );
    }

    if (!isAvailable) {
        const NotAvailableWrapper = embedded ? React.Fragment : ({ children }) => <div className="gowishcart-settings-section">{children}</div>;
        return (
            <NotAvailableWrapper>
                <div className="gowishcart-notice gowishcart-notice-warning">
                    <AlertCircle style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <div>
                        <strong>{__('FluentCRM Not Available', 'gowishcart-wishlist-for-fluentcart')}</strong>
                        <p style={{margin: '4px 0 0'}}>
                            {__('FluentCRM plugin is not installed or activated. Please install FluentCRM to use this integration.', 'gowishcart-wishlist-for-fluentcart')}
                        </p>
                    </div>
                </div>
            </NotAvailableWrapper>
        );
    }

    if (embedded) {
        return renderContent();
    }

    return (
        <div className="gowishcart-settings-section">
            {renderContent()}
        </div>
    );
};

export default FluentCRMSettings;
