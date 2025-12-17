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

const resolveProStatus = () => {
    if (typeof wishcartSettings === 'undefined' || !wishcartSettings) {
        return false;
    }

    const {
        isProActive,
        isPro,
        hasPro,
        isWishcartPro
    } = wishcartSettings;

    return Boolean(
        isProActive ??
        isPro ??
        hasPro ??
        isWishcartPro ??
        false
    );
};

const FluentCRMSettings = () => {
    const [settings, setSettings] = useState({
        enabled: false,
        fluentcrm_list_id: 0,
        fluentcrm_auto_tag_by_product_name: false,
        fluentcrm_auto_tag_by_product_tags: false,
        fluentcrm_auto_tag_by_product_categories: false,
    });
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [lists, setLists] = useState([]);
    const [listsLoading, setListsLoading] = useState(true);
    const isProActive = useMemo(() => resolveProStatus(), []);

    useEffect(() => {
        loadSettings();
        loadLists();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch(`${wishcartSettings.apiUrl}fluentcrm/settings`, {
                headers: {
                    'X-WP-Nonce': wishcartSettings.nonce
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
            const response = await fetch(`${wishcartSettings.apiUrl}fluentcrm/lists`, {
                headers: {
                    'X-WP-Nonce': wishcartSettings.nonce
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.lists)) {
                    setLists(data.lists);
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
            const response = await fetch(`${wishcartSettings.apiUrl}fluentcrm/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': wishcartSettings.nonce
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

    if (loading) {
        return (
            <div className="wishcart-settings-section">
                <div className="wishcart-flex-center" style={{padding: '40px'}}>
                    <Loader2 style={{width: '24px', height: '24px'}} className="animate-spin" />
                </div>
            </div>
        );
    }

    if (!isAvailable) {
        return (
            <div className="wishcart-settings-section">
                <div className="wishcart-notice wishcart-notice-warning">
                    <AlertCircle style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <div>
                        <strong>{__('FluentCRM Not Available', 'wishcart')}</strong>
                        <p style={{margin: '4px 0 0'}}>
                            {__('FluentCRM plugin is not installed or activated. Please install FluentCRM to use this integration.', 'wishcart')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="wishcart-settings-section">
            {saveMessage === 'success' && (
                <div className="wishcart-notice wishcart-notice-success">
                    <CheckCircle2 style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Settings saved successfully!', 'wishcart')}</span>
                </div>
            )}

            {saveMessage === 'error' && (
                <div className="wishcart-notice wishcart-notice-error">
                    <XCircle style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Failed to save settings. Please try again.', 'wishcart')}</span>
                </div>
            )}

            <div className="wishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Enable FluentCRM Integration', 'wishcart')}</h4>
                    <p>{__('Activate FluentCRM integration for automated campaigns, contact creation, welcome emails, price drops, back-in-stock alerts, time-based reminders, and progressive discounts', 'wishcart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        checked={settings.enabled}
                        onCheckedChange={(checked) => updateSetting('enabled', checked)}
                    />
                </div>
            </div>

            {/* WebHook Credentials Section - Pro/Upcoming Feature */}
            <div className="wishcart-notice wishcart-notice-info" style={{marginTop: '16px'}}>
                <Lock style={{width: '18px', height: '18px', flexShrink: 0}} />
                <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                        <strong>{__('WebHook Credentials', 'wishcart')}</strong>
                        <span className="wishcart-badge wishcart-badge-warning">{__('PRO', 'wishcart')}</span>
                        <span className="wishcart-badge wishcart-badge-info">{__('COMING SOON', 'wishcart')}</span>
                    </div>
                    <p style={{fontSize: '13px', margin: '0'}}>{__('This feature is available in WishCart Pro', 'wishcart')}</p>
                    <p style={{fontSize: '13px', margin: '4px 0 0', color: 'var(--wishcart-text-muted)'}}>{__('Please upgrade to get all the advanced features.', 'wishcart')}</p>
                </div>
            </div>

            {/* List & auto-tag configuration */}
            <div style={{ marginTop: '24px' }}>
                <div className={`wishcart-form-group wishcart-pro-field ${!isProActive ? 'is-locked' : ''}`}>
                    <div className="wishcart-pro-field__header">
                        <div>
                            <label className="wishcart-label" htmlFor="fluentcrm_list_id">
                                {__('List select', 'wishcart')}
                            </label>
                            <p className="wishcart-form-helper">
                                {__('Choose which FluentCRM list wishlist contacts will be added to.', 'wishcart')}
                            </p>
                        </div>
                        <div className="wishcart-pro-field__badges">
                            <span className="wishcart-badge wishcart-badge-warning">{__('PRO', 'wishcart')}</span>
                            {!isProActive && <Lock style={{width: '16px', height: '16px'}} />}
                        </div>
                    </div>
                    <Select
                        value={String(settings.fluentcrm_list_id || 0)}
                        onValueChange={(value) => updateSetting('fluentcrm_list_id', parseInt(value, 10))}
                        disabled={!isProActive || listsLoading || !lists.length}
                    >
                        <SelectTrigger id="fluentcrm_list_id" className="wishcart-select">
                            <SelectValue placeholder={listsLoading ? __('Loading lists...', 'wishcart') : __('Select a list', 'wishcart')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{__('Select a list', 'wishcart')}</SelectItem>
                            {lists.map((list) => (
                                <SelectItem key={list.id} value={String(list.id)}>
                                    {list.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!isProActive && (
                        <p className="wishcart-pro-field__upsell">
                            {__('Available in WishCart Pro. Upgrade to assign FluentCRM lists automatically.', 'wishcart')}
                        </p>
                    )}
                </div>

                <div className={`wishcart-form-group wishcart-pro-field ${!isProActive ? 'is-locked' : ''}`}>
                    <div className="wishcart-pro-field__header">
                        <div>
                            <label className="wishcart-label" htmlFor="fluentcrm_auto_tag_by_product_name">
                                {__('Auto tags by product name', 'wishcart')}
                            </label>
                            <p className="wishcart-form-helper">
                                {__('Automatically tag contacts using the exact product names from their wishlists.', 'wishcart')}
                            </p>
                        </div>
                        <div className="wishcart-pro-field__badges">
                            <span className="wishcart-badge wishcart-badge-warning">{__('PRO', 'wishcart')}</span>
                            {!isProActive && <Lock style={{width: '16px', height: '16px'}} />}
                        </div>
                    </div>
                    <Select
                        value={settings.fluentcrm_auto_tag_by_product_name ? '1' : '0'}
                        onValueChange={(value) => updateSetting('fluentcrm_auto_tag_by_product_name', value === '1')}
                        disabled={!isProActive}
                    >
                        <SelectTrigger id="fluentcrm_auto_tag_by_product_name" className="wishcart-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{__('Disabled', 'wishcart')}</SelectItem>
                            <SelectItem value="1">{__('Enabled', 'wishcart')}</SelectItem>
                        </SelectContent>
                    </Select>
                    {!isProActive && (
                        <p className="wishcart-pro-field__upsell">
                            {__('Upgrade to WishCart Pro to unlock dynamic tagging by product name.', 'wishcart')}
                        </p>
                    )}
                </div>

                <div className={`wishcart-form-group wishcart-pro-field ${!isProActive ? 'is-locked' : ''}`}>
                    <div className="wishcart-pro-field__header">
                        <div>
                            <label className="wishcart-label" htmlFor="fluentcrm_auto_tag_by_product_tags">
                                {__('Auto tag by product tags', 'wishcart')}
                            </label>
                            <p className="wishcart-form-helper">
                                {__('Sync WooCommerce product tags as FluentCRM contact tags.', 'wishcart')}
                            </p>
                        </div>
                        <div className="wishcart-pro-field__badges">
                            <span className="wishcart-badge wishcart-badge-warning">{__('PRO', 'wishcart')}</span>
                            {!isProActive && <Lock style={{width: '16px', height: '16px'}} />}
                        </div>
                    </div>
                    <Select
                        value={settings.fluentcrm_auto_tag_by_product_tags ? '1' : '0'}
                        onValueChange={(value) => updateSetting('fluentcrm_auto_tag_by_product_tags', value === '1')}
                        disabled={!isProActive}
                    >
                        <SelectTrigger id="fluentcrm_auto_tag_by_product_tags" className="wishcart-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{__('Disabled', 'wishcart')}</SelectItem>
                            <SelectItem value="1">{__('Enabled', 'wishcart')}</SelectItem>
                        </SelectContent>
                    </Select>
                    {!isProActive && (
                        <p className="wishcart-pro-field__upsell">
                            {__('Upgrade to WishCart Pro to sync WooCommerce product tags into FluentCRM.', 'wishcart')}
                        </p>
                    )}
                </div>

                <div className={`wishcart-form-group wishcart-pro-field ${!isProActive ? 'is-locked' : ''}`}>
                    <div className="wishcart-pro-field__header">
                        <div>
                            <label className="wishcart-label" htmlFor="fluentcrm_auto_tag_by_product_categories">
                                {__('Auto tag by products category', 'wishcart')}
                            </label>
                            <p className="wishcart-form-helper">
                                {__('Apply FluentCRM tags that mirror the product categories users save.', 'wishcart')}
                            </p>
                        </div>
                        <div className="wishcart-pro-field__badges">
                            <span className="wishcart-badge wishcart-badge-warning">{__('PRO', 'wishcart')}</span>
                            {!isProActive && <Lock style={{width: '16px', height: '16px'}} />}
                        </div>
                    </div>
                    <Select
                        value={settings.fluentcrm_auto_tag_by_product_categories ? '1' : '0'}
                        onValueChange={(value) => updateSetting('fluentcrm_auto_tag_by_product_categories', value === '1')}
                        disabled={!isProActive}
                    >
                        <SelectTrigger id="fluentcrm_auto_tag_by_product_categories" className="wishcart-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{__('Disabled', 'wishcart')}</SelectItem>
                            <SelectItem value="1">{__('Enabled', 'wishcart')}</SelectItem>
                        </SelectContent>
                    </Select>
                    {!isProActive && (
                        <p className="wishcart-pro-field__upsell">
                            {__('Upgrade to WishCart Pro to categorize FluentCRM contacts based on wishlist products.', 'wishcart')}
                        </p>
                    )}
                </div>
            </div>

            <div className="wishcart-card-footer">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="wishcart-button wishcart-button-primary"
                >
                    {saving ? __('Saving...', 'wishcart') : __('Save Settings', 'wishcart')}
                </button>
            </div>
        </div>
    );
};

export default FluentCRMSettings;

