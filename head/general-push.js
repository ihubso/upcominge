(function () {
    'use strict';

    function getClient() {
        if (typeof getSupabaseClient !== 'function') {
            throw new Error('Supabase client is not available.');
        }

        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is not initialized.');
        }

        return client;
    }

    async function registerGeneralPushSubscription(subscription) {
        if (!subscription?.endpoint || !subscription?.keys) {
            throw new Error('A valid browser push subscription is required.');
        }

        const { data, error } = await getClient().functions.invoke('register-general-push', {
            body: { subscription }
        });

        if (error) throw error;
        if (!data?.success) {
            throw new Error(data?.error || 'Could not register this device for general notifications.');
        }

        return data;
    }


    window.registerGeneralPushSubscription = registerGeneralPushSubscription;

    window.GeneralPush = {
        registerSubscription: registerGeneralPushSubscription,
      
    };
})();
