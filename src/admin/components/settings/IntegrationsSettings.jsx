import React from 'react';
import { __ } from '@wordpress/i18n';
import FluentCRMSettings from './FluentCRMSettings';

const IntegrationsSettings = () => {
    // Define all available integrations
    // This array makes it easy to add more integrations in the future
    const integrations = [
        {
            id: 'fluentcrm',
            name: __('FluentCRMgowishcart-wishlist-for-fluentcart'),
            description: __('Connect with FluentCRM to sync wishlist contacts, automate campaigns, and send targeted emails for price drops, back-in-stock alerts, and more.', 'gowishcart-wishlist-for-fluentcart'),
            component: FluentCRMSettings,
        },
        // Future integrations can be added here:
        // {
        //     id: 'mailchimp',
        //     name: __('Mailchimp', 'gowishcart-wishlist-for-fluentcart'),
        //     description: __('Sync your wishlist with Mailchimp for email marketing campaigns.', 'gowishcart-wishlist-for-fluentcart'),
        //     component: MailchimpSettings,
        // },
    ];

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--wishcart-gray-900)',
                    marginBottom: '8px'
                }}>
                    {__('Integrations', 'gowishcart-wishlist-for-fluentcart')}
                </h3>
                <p style={{
                    fontSize: '13px',
                    color: 'var(--wishcart-text-secondary)',
                    lineHeight: '1.5',
                    margin: 0
                }}>
                    {__('Connect WishCart with your favorite marketing and CRM tools to automate your workflows and enhance customer engagement.', 'gowishcart-wishlist-for-fluentcart')}
                </p>
            </div>

            <div className="wishcart-integrations-list">
                {integrations.map((integration, index) => {
                    const IntegrationComponent = integration.component;
                    
                    return (
                        <div 
                            key={integration.id}
                            className="wishcart-settings-section"
                            style={{
                                marginBottom: index < integrations.length - 1 ? '32px' : '0',
                            }}
                        >
                            <div style={{ marginTop: '0' }}>
                                <IntegrationComponent embedded={true} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IntegrationsSettings;

