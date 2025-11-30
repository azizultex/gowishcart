import { __ } from '@wordpress/i18n';
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/hooks/use-toast"
import {
    Heart,
    CheckCircle2,
    XCircle,
    Palette,
    BarChart3,
    Mail
} from 'lucide-react';

import WishlistSettings from './WishlistSettings';
import ButtonCustomizationSettings from './ButtonCustomizationSettings';
import FluentCRMSettings from './FluentCRMSettings';
import { AnalyticsDashboard } from '../AnalyticsDashboard';


const SettingsApp = () => {
    const { toast } = useToast()
    const [settings, setSettings] = useState({
        wishlist: {
            enabled: true,
            shop_page_button: true,
            product_page_button: true,
            button_position: 'bottom',
            custom_css: '',
            wishlist_page_id: 0,
            shared_wishlist_page_id: 0,
            guest_cookie_expiry: 30,
        },
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [activeTab, setActiveTab] = useState("settings");

    useEffect(() => {
        // Load settings from WordPress on mount
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/wp-json/wishcart/v1/settings', {
                headers: {
                    'X-WP-Nonce': WishCartSettings.nonce
                }
            });
            const data = await response.json();
            if (data) {
                const normalizedData = { ...data };

                if (normalizedData.wishlist) {
                    normalizedData.wishlist = { ...normalizedData.wishlist };
                    const position = normalizedData.wishlist.button_position || 'bottom';
                    switch (position) {
                        case 'before':
                            normalizedData.wishlist.button_position = 'top';
                            break;
                        case 'after':
                            normalizedData.wishlist.button_position = 'bottom';
                            break;
                        case 'top':
                        case 'bottom':
                        case 'left':
                        case 'right':
                            normalizedData.wishlist.button_position = position;
                            break;
                        default:
                            normalizedData.wishlist.button_position = 'bottom';
                            break;
                    }
                }

                setSettings(prevSettings => ({
                    ...prevSettings,
                    ...normalizedData
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    // Validate inputs before saving
    const validateBeforeSave = () => {
        // Add validation if needed
        return true;
    };

    const saveSettings = async () => {
        if (!validateBeforeSave()) return;
        setIsSaving(true);
        try {
            const response = await fetch('/wp-json/wishcart/v1/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': WishCartSettings.nonce
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast({
                    title: (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{__('Settings saved successfully!', 'wish-car')}</span>
                        </div>
                    ),
                    description: __('Your changes have been applied.', 'wish-car'),
                    className: "bg-green-50 border-green-200"
                });
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            toast({
                title: (
                    <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>{__('Failed to save settings', 'wish-car')}</span>
                    </div>
                ),
                description: __('Please try again or contact support if the problem persists.', 'wish-car'),
                className: "bg-red-50 border-red-200"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateSettings = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const tabs = [
        { id: 'settings', label: __('Settings', 'wish-car'), icon: Heart },
        { id: 'button-customization', label: __('Button Customization', 'wish-car'), icon: Palette },
        { id: 'analytics', label: __('Analytics', 'wish-car'), icon: BarChart3 },
        { id: 'fluentcrm', label: __('FluentCRM', 'wish-car'), icon: Mail },
    ];

    const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];

    return (
        <>
            <div className="wishcart-admin-shell fluentcart-admin-page">
                {/* Navigation Tabs - WordPress/FluentCart Style */}
                <nav className="fluentcart-nav-tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`fluentcart-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <Icon />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Active Tab Header */}
                <div className="fluentcart-admin-page-header">
                    <div className="fluentcart-admin-page-header-content">
                        <h1 className="fluentcart-admin-page-title">
                            {activeTabData.label}
                        </h1>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="fluentcart-admin-body">
                    <div className="fluentcart-admin-content">
                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <WishlistSettings
                                settings={settings}
                                updateSettings={updateSettings}
                            />
                        )}

                        {/* Button Customization Tab */}
                        {activeTab === 'button-customization' && (
                            <ButtonCustomizationSettings
                                settings={settings}
                                updateSettings={updateSettings}
                            />
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <AnalyticsDashboard />
                        )}

                        {/* FluentCRM Tab */}
                        {activeTab === 'fluentcrm' && (
                            <FluentCRMSettings />
                        )}

                        {/* Save Button - Only show for tabs that need it */}
                        {activeTab !== 'fluentcrm' && activeTab !== 'analytics' && (
                            <div className="fluentcart-card-footer" style={{ marginTop: '24px' }}>
                                <button
                                    onClick={saveSettings}
                                    disabled={isSaving}
                                    className="fluentcart-button fluentcart-button-primary"
                                >
                                    {isSaving ? __('Saving...', 'wish-car') : __('Save Settings', 'wish-car')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Toaster />
        </>
    );
};

export default SettingsApp;