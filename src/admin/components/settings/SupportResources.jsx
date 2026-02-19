import React from 'react';
import { __ } from '@wordpress/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, MessageCircle, BookOpen, Mail, HelpCircle } from 'lucide-react';

const SupportResources = () => {
    // WordPress.org forum support - PRIMARY option for free users
    const wordpressForumResource = {
        icon: HelpCircle,
        title: __('WordPress.org Support Forum', 'gowishcart-wishlist-for-fluentcart'),
        description: __('Get free support from the community. Post your questions and get help from other users and our team.', 'gowishcart-wishlist-for-fluentcart'),
        actionLabel: __('Visit Support Forum', 'gowishcart-wishlist-for-fluentcart'),
        href: 'https://wordpress.org/support/plugin/wishcart/',
        isPrimary: true,
    };

    // Commercial/Pro support resources
    const commercialResources = [
        {
            icon: BookOpen,
            title: __('Documentation', 'gowishcart-wishlist-for-fluentcart'),
            description: __('Step-by-step guides to configure GoWishCart and FluentCart integrations.', 'gowishcart-wishlist-for-fluentcart'),
            actionLabel: __('View Docs', 'gowishcart-wishlist-for-fluentcart'),
            href: 'https://gowishcart.com/docs',
        },
        {
            icon: MessageCircle,
            title: __('Community', 'gowishcart-wishlist-for-fluentcart'),
            description: __('Join other store owners to share best practices and tips.', 'gowishcart-wishlist-for-fluentcart'),
            actionLabel: __('Join Community', 'gowishcart-wishlist-for-fluentcart'),
            href: 'https://gowishcart.com/community',
        },
        {
            icon: LifeBuoy,
            title: __('Commercial Support (Pro)gowishcart-wishlist-for-fluentcart'),
            description: __('Priority support for GoWishCart Pro users. Start a live chat and our team will assist you.', 'gowishcart-wishlist-for-fluentcart'),
            actionLabel: __('Get Pro Support', 'gowishcart-wishlist-for-fluentcart'),
            href: 'https://gowishcart.com/support',
        },
    ];

    const WordPressIcon = wordpressForumResource.icon;
    
    return (
        <div className="grid gap-6">
            {/* WordPress.org Support Forum - PRIMARY and most prominent */}
            <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader className="flex flex-row items-center gap-3">
                    <span className="rounded-full bg-blue-600 p-2 text-white">
                        <WordPressIcon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                        <CardTitle className="text-lg">{wordpressForumResource.title}</CardTitle>
                        <CardDescription>{wordpressForumResource.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                        <a href={wordpressForumResource.href} target="_blank" rel="noopener noreferrer">
                            {wordpressForumResource.actionLabel}
                        </a>
                    </Button>
                </CardContent>
            </Card>

            {/* Commercial Support Section - Clearly labeled as Pro/Commercial */}
            <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    {__('Commercial Support (GoWishCart Pro Users)gowishcart-wishlist-for-fluentcart')}
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                    {commercialResources.map((resource) => {
                        const Icon = resource.icon;
                        return (
                            <Card key={resource.title}>
                                <CardHeader className="flex flex-row items-center gap-3">
                                    <span className="rounded-full bg-gray-50 p-2 text-gray-600">
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
                            <CardTitle>{__('Email Support (Pro Users)gowishcart-wishlist-for-fluentcart')}</CardTitle>
                            <CardDescription>{__('Commercial email support for GoWishCart Pro users. We will respond within one business day.', 'gowishcart-wishlist-for-fluentcart')}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-gray-500" />
                                <a className="text-lg font-medium" href="mailto:support@gowishcart.com">
                                    support@gowishcart.com
                                </a>
                            </div>
                            <Button asChild variant="outline">
                                <a href="mailto:support@gowishcart.com">
                                    {__('Send Email', 'gowishcart-wishlist-for-fluentcart')}
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SupportResources;

