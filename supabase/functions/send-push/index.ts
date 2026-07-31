import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "Y0tevI6hf8uyKQr1rqOzXjTOGTBKT4Fz_VV9jnYrlOs";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BI-tM9VQcqAeco67R9VhA9TxByJyFjPgcMcqS_dhfOsve-BcVA5G_0fQIK9uVcECs_sbqnUGWOa1t5kFs-94FRg";
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "austinlebechi02@gmail.com";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://bulprhgwuwatzobiojwz.supabase.co";
const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

// Configure VAPID once globally
webPush.setVapidDetails(
    `mailto:${VAPID_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function sendPushNotification(subscription: any, payload: any) {
    try {
        const result = await webPush.sendNotification(
            subscription,
            JSON.stringify(payload),
            { TTL: 86400 }
        );
        return { success: true, result };
    } catch (error: any) {
        console.error("❌ Push Gateway Error:", error.statusCode || error.message, error.body);
        return { 
            success: false, 
            statusCode: error.statusCode || 500,
            error: error.message || "Failed to deliver notification" 
        };
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseClient = createClient(supabaseUrl, supabaseKey || token);

        const body = await req.json();
        const { userId, targetUserId, title, body: messageBody, data } = body;
        const targetUser = targetUserId || userId;

        if (!targetUser) {
            return new Response(
                JSON.stringify({ success: false, error: "No target user ID provided" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Retrieve token
        const { data: subscriptionData, error: subscriptionError } = await supabaseClient
            .from("push_subscriptions")
            .select("subscription")
            .eq("user_id", targetUser)
            .maybeSingle();

        if (subscriptionError || !subscriptionData?.subscription) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: subscriptionError ? subscriptionError.message : "No active push subscription found for this user" 
                }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const payload = {
            title: title || "Sucess Technology",
            body: messageBody || "You have a new notification",
            icon: "/favicon.png",
            badge: "/favicon.png",
            data: data || {}
        };

        const result = await sendPushNotification(subscriptionData.subscription, payload);

        // Remove stale/expired subscriptions if endpoint returned 404 or 410
        if (!result.success && (result.statusCode === 404 || result.statusCode === 410)) {
            console.warn(`🗑️ Cleaning up expired push token for user: ${targetUser}`);
            await supabaseClient
                .from("push_subscriptions")
                .delete()
                .eq("user_id", targetUser);
        }

        // Log result to push_notifications table
        await supabaseClient
            .from("push_notifications")
            .insert({
                user_id: targetUser,
                title: payload.title,
                body: payload.body,
                data: payload.data,
                sent_at: new Date().toISOString(),
                delivered: result.success,
                error: result.error || null
            });

        return new Response(
            JSON.stringify({ 
                success: result.success,
                message: result.success ? "Notification sent successfully" : "Failed push gateway delivery",
                error: result.error || null
            }),
            { 
                status: 200, // Return 200 so admin JS receives actionable JSON rather than unhandled fetch 500
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
        );

    } catch (error: any) {
        console.error("❌ Fatal Error in Edge Function:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});