import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { __ } from '@wordpress/i18n';
const MiscSettings = ({ settings, updateSettings }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{__('Miscellaneous Settings', 'wishcart')}</CardTitle>
                <CardDescription>{__('Additional configuration options', 'wishcart')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="custom_css">{__('Custom CSS', 'wishcart')}</Label>
                    <Textarea
                        id="custom_css"
                        value={settings.misc.custom_css}
                        onChange={(e) => updateSettings('misc', 'custom_css', e.target.value)}
                        placeholder={__('Add your custom CSS', 'wishcart')}
                        className="font-mono h-[480px]"
                        spellCheck="false"
                    />
                    <div className="mt-2 text-sm text-muted-foreground">
                        <p>{__('Available CSS classes for customization:', 'wishcart')}</p>
                        <ul className="mt-2 list-disc pl-4 space-y-1">
                            <li><code>.wishcart-wishlist-button</code> - {__('Main wishlist button', 'wishcart')}</li>
                            <li><code>.wishcart-wishlist-button--active</code> - {__('Active state (item in wishlist)', 'wishcart')}</li>
                            <li><code>.wishcart-wishlist-button__icon</code> - {__('Button icon', 'wishcart')}</li>
                            <li><code>.wishcart-wishlist-button__label</code> - {__('Button text label', 'wishcart')}</li>
                            <li><code>.wishcart-placement-top</code> - {__('Top positioned button', 'wishcart')}</li>
                            <li><code>.wishcart-placement-bottom</code> - {__('Bottom positioned button', 'wishcart')}</li>
                            <li><code>.wishcart-wishlist-page</code> - {__('Wishlist page container', 'wishcart')}</li>
                            <li><code>.wishcart-variant-wishlist-button</code> - {__('Variant wishlist button', 'wishcart')}</li>
                        </ul>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        {__('Add custom CSS to modify the wishlist button and page appearance. Changes will be applied to the frontend wishlist components.', 'wishcart')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default MiscSettings;