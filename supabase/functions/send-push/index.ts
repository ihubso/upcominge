// supabase/functions/send-push/index.ts
// This is a Supabase Edge Function for sending push notifications

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Your VAPID private key - keep this secure!
const VAPID_PRIVATE_KEY = "Y0tevI6hf8uyKQr1rqOzXjTOGTBKT4Fz_VV9jnYrlOs";
const VAPID_PUBLIC_KEY = "BI-tM9VQcqAeco67R9VhA9TxByJyFjPgcMcqS_dhfOsve-BcVA5G_0fQIK9uVcECs_sbqnUGWOa1t5kFs-94FRg";
const VAPID_EMAIL = "austinlebechi02@gmail.com";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://bulprhgwuwatzobiojwz.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "your-service-role-key";

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to send a push notification via Web Push API
async function sendPushNotification(subscription: any, payload: any) {
    const webPush = await import("https://esm.sh/web-push@3.4.5");
    
    webPush.setVapidDetails(
        `mailto:${VAPID_EMAIL}`,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    
    const options = {
        TTL: 86400, // 24 hours
        vapidDetails: {
            subject: `mailto:${VAPID_EMAIL}`,
            publicKey: VAPID_PUBLIC_KEY,
            privateKey: VAPID_PRIVATE_KEY
        }
    };
    
    try {
        const result = await webPush.sendNotification(
            subscription,
            JSON.stringify(payload),
            options
        );
        
        return { success: true, result };
    } catch (error) {
        console.error("Error sending push notification:", error);
        return { success: false, error: error.message };
    }
}

serve(async (req) => {
    try {
        const { userId, title, body, data, targetUserId } = await req.json();
        
        console.log("📤 Sending push notification:", { userId, targetUserId, title });
        
        // Determine which user to send to
        const targetUser = targetUserId || userId;
        
        // Get the subscription from Supabase
        const { data: subscriptionData, error: subscriptionError } = await supabase
            .from("push_subscriptions")
            .select("subscription")
            .eq("user_id", targetUser)
            .single();
        
        if (subscriptionError) {
            console.error("❌ Error fetching subscription:", subscriptionError);
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: "Subscription not found",
                    details: subscriptionError.message
                }),
                { 
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }
        
        if (!subscriptionData || !subscriptionData.subscription) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: "No active subscription found for this user" 
                }),
                { 
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }
        
        // Prepare the notification payload
        const payload = {
            title: title || "Sucess Technology",
            body: body || "You have a new notification",
            icon: "/favicon.png",
            badge: "/favicon.png",
            data: data || {}
        };
        
        // Send the notification
        const result = await sendPushNotification(
            subscriptionData.subscription,
            payload
        );
        
        // Log the notification
        await supabase
            .from("push_notifications")
            .insert({
                user_id: targetUser,
                title: payload.title,
                body: payload.body,
                data: payload.data,
                sent_at: new Date().toISOString(),
                delivered: result.success
            });
        
        return new Response(
            JSON.stringify({ 
                success: result.success,
                message: result.success ? "Notification sent" : "Failed to send notification",
                result: result.result || null,
                error: result.error || null
            }),
            { 
                status: result.success ? 200 : 500,
                headers: { "Content-Type": "application/json" }
            }
        );
        
    } catch (error) {
        console.error("❌ Error in send-push function:", error);
        
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message,
                stack: error.stack 
            }),
            { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
});