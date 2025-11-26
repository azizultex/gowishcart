import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (!isAvailable) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{__('FluentCRM Integration', 'wish-cart')}</CardTitle>
                    <CardDescription>{__('Connect WishCart with FluentCRM for automated marketing campaigns', 'wish-cart')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {__('FluentCRM plugin is not installed or activated. Please install FluentCRM to use this integration.', 'wish-cart')}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{__('FluentCRM Integration', 'wish-cart')}</CardTitle>
                <CardDescription>{__('Configure FluentCRM integration for automated marketing campaigns', 'wish-cart')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {saveMessage === 'success' && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            {__('Settings saved successfully!', 'wish-cart')}
                        </AlertDescription>
                    </Alert>
                )}

                {saveMessage === 'error' && (
                    <Alert className="bg-red-50 border-red-200">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            {__('Failed to save settings. Please try again.', 'wish-cart')}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>{__('Enable FluentCRM Integration', 'wish-cart')}</Label>
                        <p className="text-sm text-gray-500">
                            {__('Activate FluentCRM integration for automated campaigns, contact creation, welcome emails, price drops, back-in-stock alerts, time-based reminders, and progressive discounts', 'wish-cart')}
                        </p>
                    </div>
                    <Switch
                        checked={settings.enabled}
                        onCheckedChange={(checked) => updateSetting('enabled', checked)}
                    />
                </div>

                {/* REST API Credentials Section - Pro/Upcoming Feature */}
                <Alert className="bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Lock className="h-4 w-4" />
                                <span className="font-semibold">{__('REST API Credentials', 'wish-cart')}</span>
                                <Badge variant="pro">{__('PRO', 'wish-cart')}</Badge>
                                <Badge variant="secondary">{__('COMING SOON', 'wish-cart')}</Badge>
                            </div>
                            <p className="text-sm">{__('This feature is available in WishCart Pro', 'wish-cart')}</p>
                            <p className="text-sm text-gray-600">{__('Please upgrade to get all the advanced features.', 'wish-cart')}</p>
                        </div>
                    </div>
                </Alert>
            </CardContent>
            <CardFooter className="flex justify-end border-t bg-slate-50/50 pt-4">
                <Button
                    onClick={saveSettings}
                    disabled={saving}
                >
                    {saving ? __('Saving...', 'wish-cart') : __('Save Settings', 'wish-cart')}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default FluentCRMSettings;

