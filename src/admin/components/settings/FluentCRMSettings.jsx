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
                <div className="fluentcart-flex-center" style={{padding: '40px'}}>
                    <Loader2 style={{width: '24px', height: '24px'}} className="animate-spin" />
                </div>
            </div>
        );
    }

    if (!isAvailable) {
        return (
            <div className="wishcart-settings-section">
                <div className="fluentcart-notice fluentcart-notice-warning">
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
                <div className="fluentcart-notice fluentcart-notice-success">
                    <CheckCircle2 style={{width: '18px', height: '18px', flexShrink: 0}} />
                    <span>{__('Settings saved successfully!', 'wishcart')}</span>
                </div>
            )}

            {saveMessage === 'error' && (
                <div className="fluentcart-notice fluentcart-notice-error">
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

            {/* REST API Credentials Section - Pro/Upcoming Feature */}
            <div className="fluentcart-notice fluentcart-notice-info" style={{marginTop: '16px'}}>
                <Lock style={{width: '18px', height: '18px', flexShrink: 0}} />
                <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                        <strong>{__('REST API Credentials', 'wishcart')}</strong>
                        <span className="fluentcart-badge fluentcart-badge-warning">{__('PRO', 'wishcart')}</span>
                        <span className="fluentcart-badge fluentcart-badge-info">{__('COMING SOON', 'wishcart')}</span>
                    </div>
                    <p style={{fontSize: '13px', margin: '0'}}>{__('This feature is available in WishCart Pro', 'wishcart')}</p>
                    <p style={{fontSize: '13px', margin: '4px 0 0', color: 'var(--fluentcart-text-muted)'}}>{__('Please upgrade to get all the advanced features.', 'wishcart')}</p>
                </div>
            </div>

            <div className="fluentcart-card-footer">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="fluentcart-button fluentcart-button-primary"
                >
                    {saving ? __('Saving...', 'wishcart') : __('Save Settings', 'wishcart')}
                </button>
            </div>
        </div>
    );
};

export default FluentCRMSettings;

