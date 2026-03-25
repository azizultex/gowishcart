import React from 'react';
import { __ } from '@wordpress/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, Layers, Flame } from 'lucide-react';

const features = [
    {
        icon: Layers,
        title: __('Multiple Wishlist Collections', 'gowishcart-wishlist-for-fluentcart'),
        description: __('Segment shoppers with unlimited wishlist collections, share links, and automation triggers.', 'gowishcart-wishlist-for-fluentcart'),
    },
    {
        icon: ShieldCheck,
        title: __('Advanced Analytics', 'gowishcart-wishlist-for-fluentcart'),
        description: __('Track add-to-cart conversions, revenue per wishlist, and subscriber growth in real-time.', 'gowishcart-wishlist-for-fluentcart'),
    },
    {
        icon: Flame,
        title: __('Automation Recipes', 'gowishcart-wishlist-for-fluentcart'),
        description: __('Plug-and-play FluentCRM workflows for reminders, low stock alerts, and VIP sequences.', 'gowishcart-wishlist-for-fluentcart'),
    },
];

const UpgradePrompt = () => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">
                        <Sparkles className="h-4 w-4" />
                        <span>{__('GoWishCart Pro', 'gowishcart-wishlist-for-fluentcart')}</span>
                    </div>
                    <CardTitle>{__('Unlock the full wishlist experience', 'gowishcart-wishlist-for-fluentcart')}</CardTitle>
                    <CardDescription>
                        {__('Upgrade to automate follow-ups, sync advanced customer data, and supercharge your revenue from wishlists.', 'gowishcart-wishlist-for-fluentcart')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-3">
                        <Button asChild variant="outline">
                            <a href="https://gowishcart.com/demo" target="_blank" rel="noopener noreferrer">
                                {__('Book Demo', 'gowishcart-wishlist-for-fluentcart')}
                            </a>
                        </Button>
                        <Button asChild>
                            <a href="https://gowishcart.com/pricing" target="_blank" rel="noopener noreferrer">
                                {__('Upgrade Now', 'gowishcart-wishlist-for-fluentcart')}
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                {features.map((feature) => {
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

export default UpgradePrompt;

