import React from 'react';
import { __ } from '@wordpress/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, MessageCircle, BookOpen, Mail } from 'lucide-react';

const SupportResources = () => {
    const resources = [
        {
            icon: BookOpen,
            title: __('Documentation', 'wishcart'),
            description: __('Step-by-step guides to configure WishCart and FluentCart integrations.', 'wishcart'),
            actionLabel: __('View Docs', 'wishcart'),
            href: 'https://gowishcart.com/docs',
        },
        {
            icon: MessageCircle,
            title: __('Community', 'wishcart'),
            description: __('Join other store owners to share best practices and tips.', 'wishcart'),
            actionLabel: __('Join Community', 'wishcart'),
            href: 'https://gowishcart.com/community',
        },
        {
            icon: LifeBuoy,
            title: __('Priority Support', 'wishcart'),
            description: __('Need help? Start a live chat and our team will assist you.', 'wishcart'),
            actionLabel: __('Chat With Us', 'wishcart'),
            href: 'https://gowishcart.com/support',
        },
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {resources.map((resource) => {
                const Icon = resource.icon;
                return (
                    <Card key={resource.title}>
                        <CardHeader className="flex flex-row items-center gap-3">
                            <span className="rounded-full bg-blue-50 p-2 text-blue-600">
                                <Icon className="h-5 w-5" />
                            </span>
                            <div>
                                <CardTitle>{resource.title}</CardTitle>
                                <CardDescription>{resource.description}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="outline">
                                <a href={resource.href} target="_blank" rel="noopener noreferrer">
                                    {resource.actionLabel}
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>{__('Email Support', 'wishcart')}</CardTitle>
                    <CardDescription>{__('Prefer email? Send us a message and we will respond within one business day.', 'wishcart')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <a className="text-lg font-medium" href="mailto:support@gowishcart.com">
                            support@gowishcart.com
                        </a>
                    </div>
                    <Button asChild>
                        <a href="mailto:support@gowishcart.com">
                            {__('Send Email', 'wishcart')}
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default SupportResources;

