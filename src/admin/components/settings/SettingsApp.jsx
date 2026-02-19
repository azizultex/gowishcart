import { __ } from '@wordpress/i18n';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/hooks/use-toast";
import {
    CheckCircle2,
    XCircle,
    Palette,
    BarChart3,
    LifeBuoy,
    Sparkles,
    Settings,
    Plug
} from 'lucide-react';

import WishlistSettings from './WishlistSettings';
import ButtonCustomizationSettings from './ButtonCustomizationSettings';
import IntegrationsSettings from './IntegrationsSettings';
import SupportResources from './SupportResources';
import UpgradePrompt from './UpgradePrompt';
import AnalyticsProMessage from './AnalyticsProMessage';

const localizedTabPageMap = (typeof window !== 'undefined' && window.wishcartSettings && window.wishcartSettings.tabPageMap) || {};

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
            guest_cookie_expiry: 30,
        }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(() => wishcartSettings?.defaultTab || 'settings');
    const baseMenuSlug = wishcartSettings?.menuSlug || 'gowishcart-wishlist-for-fluentcart';
    const fallbackTabPageMap = useMemo(() => ({
        settings: `${baseMenuSlug}-settings`,
        customization: `${baseMenuSlug}-customization`,
        integrations: `${baseMenuSlug}-integrations`,
        analytics: `${baseMenuSlug}-analytics`,
        support: `${baseMenuSlug}-support`,
        'get-pro': `${baseMenuSlug}-get-pro`,
    }), [baseMenuSlug]);

    const tabPageMap = useMemo(() => {
        if (localizedTabPageMap && Object.keys(localizedTabPageMap).length > 0) {
            return localizedTabPageMap;
        }
        return fallbackTabPageMap;
    }, [fallbackTabPageMap]);

    useEffect(() => {
        // Load settings from WordPress on mount
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/wp-json/wishcart/v1/settings', {
                headers: {
                    'X-WP-Nonce': wishcartSettings.nonce
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
                    ...normalizedData,
                    wishlist: {
                        ...prevSettings.wishlist,
                        ...(normalizedData.wishlist || {})
                    }
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    useEffect(() => {
        const slug = tabPageMap[activeTab] || tabPageMap.settings || fallbackTabPageMap.settings;
        const url = new URL(window.location.href);
        url.searchParams.set('page', slug);
        window.history.replaceState({}, '', url.toString());
    }, [activeTab, tabPageMap, fallbackTabPageMap]);

    useEffect(() => {
        if (typeof window !== 'undefined' && typeof window.wishcartSetActiveMenu === 'function') {
            window.wishcartSetActiveMenu(activeTab);
        }
    }, [activeTab]);

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
                    'X-WP-Nonce': wishcartSettings.nonce
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast({
                    title: (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{__('Settings saved successfully!', 'gowishcart-wishlist-for-fluentcart')}</span>
                        </div>
                    ),
                    description: __('Your changes have been applied.', 'gowishcart-wishlist-for-fluentcart'),
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
                        <span>{__('Failed to save settings', 'gowishcart-wishlist-for-fluentcart')}</span>
                    </div>
                ),
                description: __('Please try again or contact support if the problem persists.', 'gowishcart-wishlist-for-fluentcart'),
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

    const tabs = useMemo(() => ([
        { id: 'settings', label: __('Settings', 'gowishcart-wishlist-for-fluentcart'), icon: Settings },
        { id: 'customization', label: __('Customization', 'gowishcart-wishlist-for-fluentcart'), icon: Palette },
        { id: 'integrations', label: __('Integrations', 'gowishcart-wishlist-for-fluentcart'), icon: Plug },
        { id: 'analytics', label: __('Analytics', 'gowishcart-wishlist-for-fluentcart'), icon: BarChart3 },
        { id: 'support', label: __('Support', 'gowishcart-wishlist-for-fluentcart'), icon: LifeBuoy },
        { id: 'get-pro', label: __('Get Pro', 'gowishcart-wishlist-for-fluentcart'), icon: Sparkles },
    ]), []);

    const navigateToTab = useCallback((tabId) => {
        const exists = tabs.some(tab => tab.id === tabId);
        if (!exists) {
            return false;
        }
        setActiveTab(tabId);
        return true;
    }, [tabs]);

    useEffect(() => {
        window.wishcartNavigateToTab = navigateToTab;
        return () => {
            if (window.wishcartNavigateToTab === navigateToTab) {
                delete window.wishcartNavigateToTab;
            }
        };
    }, [navigateToTab]);

    const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];
    const tabsWithSave = ['settings', 'customization'];
    const shouldShowSave = tabsWithSave.includes(activeTab);

    return (
        <>
            <div className="gowishcart-admin-shell gowishcart-admin-page">
                {/* Navigation Tabs - WordPress/FluentCart Style */}
                <nav className="gowishcart-nav-tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`wishcart-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <Icon />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Active Tab Header */}
                <div className="gowishcart-admin-page-header">
                    <div className="gowishcart-admin-page-header-content">
                        <h1 className="gowishcart-admin-page-title">
                            {activeTabData.label}
                        </h1>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="gowishcart-admin-body">
                    <div className="gowishcart-admin-content">
                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <WishlistSettings
                                settings={settings}
                                updateSettings={updateSettings}
                            />
                        )}

                        {/* Button Customization Tab */}
                        {activeTab === 'customization' && (
                            <ButtonCustomizationSettings
                                settings={settings}
                                updateSettings={updateSettings}
                            />
                        )}

                        {/* Integrations Tab */}
                        {activeTab === 'integrations' && (
                            <IntegrationsSettings />
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <AnalyticsProMessage />
                        )}

                        {/* Support Tab */}
                        {activeTab === 'support' && (
                            <SupportResources />
                        )}

                        {/* Get Pro Tab */}
                        {activeTab === 'get-pro' && (
                            <UpgradePrompt />
                        )}

                        {/* Save Button - Only show for tabs that need it */}
                        {shouldShowSave && (
                            <div className="gowishcart-card-footer" style={{ marginTop: '24px' }}>
                                <button
                                    onClick={saveSettings}
                                    disabled={isSaving}
                                    className="gowishcart-button gowishcart-button-primary"
                                >
                                    {isSaving ? __('Saving...', 'gowishcart-wishlist-for-fluentcart') : __('Save Settings', 'gowishcart-wishlist-for-fluentcart')}
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