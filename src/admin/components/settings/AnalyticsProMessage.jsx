import React from 'react';
import { __ } from '@wordpress/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles, TrendingUp, Users, ShoppingCart, Link as LinkIcon } from 'lucide-react';

const AnalyticsProMessage = () => {
    const analyticsFeatures = [
        {
            icon: TrendingUp,
            title: __('Overview Dashboard', 'wishcart'),
            description: __('Track total wishlists, items, and conversion metrics at a glance.', 'wishcart'),
        },
        {
            icon: ShoppingCart,
            title: __('Popular Products', 'wishcart'),
            description: __('See which products are most wishlisted and have the highest conversion rates.', 'wishcart'),
        },
        {
            icon: Users,
            title: __('Conversion Funnel', 'wishcart'),
            description: __('Analyze the complete customer journey from wishlist to purchase.', 'wishcart'),
        },
        {
            icon: LinkIcon,
            title: __('Share Link Analytics', 'wishcart'),
            description: __('Track clicks, views, and conversions from shared wishlist links.', 'wishcart'),
        },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">
                        <Sparkles className="h-4 w-4" />
                        <span>{__('Pro Feature', 'wishcart')}</span>
                    </div>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        {__('Analytics Dashboard', 'wishcart')}
                    </CardTitle>
                    <CardDescription>
                        {__('Advanced analytics and insights are available in WishCart Pro. Upgrade to track wishlist performance, conversion rates, and customer behavior.', 'wishcart')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {__('Unlock powerful analytics features to understand your customers better and optimize your sales strategy.', 'wishcart')}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button asChild variant="outline">
                            <a href="https://gowishcart.com/demo" target="_blank" rel="noopener noreferrer">
                                {__('Book Demo', 'wishcart')}
                            </a>
                        </Button>
                        <Button asChild>
                            <a href="https://gowishcart.com/pricing" target="_blank" rel="noopener noreferrer">
                                {__('Upgrade to Pro', 'wishcart')}
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                {analyticsFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <Card key={feature.title}>
                            <CardHeader className="flex flex-row items-center gap-3">
                                <span className="rounded-full bg-purple-50 p-2 text-purple-600">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <CardTitle className="text-base">{feature.title}</CardTitle>
                                    <CardDescription>{feature.description}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default AnalyticsProMessage;

