import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Lock } from 'lucide-react';
import { __ } from '@wordpress/i18n';

const FluentCRMSettings = () => {
    const [settings, setSettings] = useState({
        enabled: false,
    });
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch(`${WishCartSettings.apiUrl}fluentcrm/settings`, {
                headers: {
                    'X-WP-Nonce': WishCartSettings.nonce
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
            const response = await fetch(`${WishCartSettings.apiUrl}fluentcrm/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': WishCartSettings.nonce
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
                <div className="fluentcrm-flex-center" style={{padding: '40px'}}>
                    <Loader2 style={{width: '24px', height: '24px'}} className="animate-spin" />
                </div>
            </div>
        );
    }

    if (!isAvailable) {
        return (
            <div className="wishcart-settings-section">
                <div className="fluentcrm-notice fluentcrm-notice-warning">
                    <AlertCircle style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <div>
                        <strong>{__('FluentCRM Not Available', 'wish-cart')}</strong>
                        <p style={{margin: '4px 0 0'}}>
                            {__('FluentCRM plugin is not installed or activated. Please install FluentCRM to use this integration.', 'wish-cart')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="wishcart-settings-section">
            {saveMessage === 'success' && (
                <div className="fluentcrm-notice fluentcrm-notice-success">
                    <CheckCircle2 style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Settings saved successfully!', 'wish-cart')}</span>
                </div>
            )}

            {saveMessage === 'error' && (
                <div className="fluentcrm-notice fluentcrm-notice-error">
                    <XCircle style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Failed to save settings. Please try again.', 'wish-cart')}</span>
                </div>
            )}

            <div className="wishcart-toggle-row">
                <div className="toggle-info">
                    <h4>{__('Enable FluentCRM Integration', 'wish-cart')}</h4>
                    <p>{__('Activate FluentCRM integration for automated campaigns, contact creation, welcome emails, price drops, back-in-stock alerts, time-based reminders, and progressive discounts', 'wish-cart')}</p>
                </div>
                <div className="toggle-control">
                    <Switch
                        checked={settings.enabled}
                        onCheckedChange={(checked) => updateSetting('enabled', checked)}
                    />
                </div>
            </div>

            {/* REST API Credentials Section - Pro/Upcoming Feature */}
            <div className="fluentcrm-notice fluentcrm-notice-info" style={{marginTop: '16px'}}>
                <Lock style={{width: '18px', height: '18px', flexShrink: 0}} />
                <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                        <strong>{__('REST API Credentials', 'wish-cart')}</strong>
                        <span className="fluentcrm-badge fluentcrm-badge-warning">{__('PRO', 'wish-cart')}</span>
                        <span className="fluentcrm-badge fluentcrm-badge-info">{__('COMING SOON', 'wish-cart')}</span>
                    </div>
                    <p style={{fontSize: '13px', margin: '0'}}>{__('This feature is available in WishCart Pro', 'wish-cart')}</p>
                    <p style={{fontSize: '13px', margin: '4px 0 0', color: 'var(--fluentcrm-text-muted)'}}>{__('Please upgrade to get all the advanced features.', 'wish-cart')}</p>
                </div>
            </div>

            <div className="fluentcrm-card-footer">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="fluentcrm-button fluentcrm-button-primary"
                >
                    {saving ? __('Saving...', 'wish-cart') : __('Save Settings', 'wish-cart')}
                </button>
            </div>
        </div>
    );
};

export default FluentCRMSettings;

