import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidEmail = Deno.env.get("VAPID_EMAIL");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
async function sendToSubscription(subscription, payload) {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400
    });
    return {
      success: true,
      expired: false
    };
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    if (statusCode !== 404 && statusCode !== 410) {
      console.error("General push delivery failed:", error);
    }
    return {
      success: false,
      expired: statusCode === 404 || statusCode === 410
    };
  }
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  if (req.method !== "POST") return jsonResponse({
    success: false,
    error: "Method not allowed"
  }, 405);
  if (!supabaseUrl || !serviceRoleKey || !vapidPrivateKey || !vapidPublicKey || !vapidEmail) {
    console.error("Missing Supabase or VAPID configuration for general push.");
    return jsonResponse({
      success: false,
      error: "General push is not configured."
    }, 500);
  }
  const authorization = req.headers.get("Authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return jsonResponse({
      success: false,
      error: "Admin authentication is required."
    }, 401);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(tokenMatch[1]);
  if (userError || !userData.user) {
    return jsonResponse({
      success: false,
      error: "Admin authentication is invalid or expired."
    }, 401);
  }
  const { data: admin, error: adminError } = await supabase.from("admin_users").select("id").eq("id", userData.user.id).eq("is_active", true).maybeSingle();
  if (adminError) {
    console.error("Could not verify general push administrator:", adminError);
    return jsonResponse({
      success: false,
      error: "Could not verify admin access."
    }, 500);
  }
  if (!admin) return jsonResponse({
    success: false,
    error: "An active admin account is required."
  }, 403);
  let requestBody;
  try {
    requestBody = await req.json();
  } catch  {
    return jsonResponse({
      success: false,
      error: "Invalid notification request."
    }, 400);
  }
  const title = typeof requestBody.title === "string" ? requestBody.title.trim() : "";
  const message = typeof requestBody.body === "string" ? requestBody.body.trim() : "";
  const url = typeof requestBody.url === "string" ? requestBody.url.trim() : "/";
  const imageValue = typeof requestBody.image === "string" ? requestBody.image.trim() : "";
  const image = imageValue && imageValue.length <= 2048 ? imageValue : null;
  const typeValue = typeof requestBody.type === "string" ? requestBody.type.trim() : "general";
  const type = typeValue.length <= 40 ? typeValue : "general";
  if (!title || title.length > 120 || !message || message.length > 500) {
    return jsonResponse({
      success: false,
      error: "Title (1-120 chars) and body (1-500 chars) are required."
    }, 400);
  }
  if (!url || url.length > 2048 || !url.startsWith("/") && !url.startsWith("https://")) {
    return jsonResponse({
      success: false,
      error: "Notification URL must be a site path or HTTPS URL."
    }, 400);
  }
  try {
    webPush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
  } catch (error) {
    console.error("VAPID configuration is invalid:", error);
    return jsonResponse({
      success: false,
      error: "Push delivery is not configured correctly."
    }, 500);
  }
  const payload = {
    title,
    body: message,
    url,
    icon: image || "/favicon.png",
    badge: "/favicon.png",
    data: {
      url,
      image,
      type
    }
  };
  let sent = 0;
  let total = 0;
  let deleted = 0;
  const pageSize = 500;
  for(let offset = 0;; offset += pageSize){
    const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions_general").select("id, subscription").range(offset, offset + pageSize - 1);
    if (subscriptionError) {
      console.error("Could not read general push subscribers:", subscriptionError);
      return jsonResponse({
        success: false,
        error: "Could not load push subscribers."
      }, 500);
    }
    if (!subscriptions?.length) break;
    total += subscriptions.length;
    for(let start = 0; start < subscriptions.length; start += 20){
      const batch = subscriptions.slice(start, start + 20);
      const results = await Promise.all(batch.map(async (row)=>{
        let subscription = row.subscription;
        if (typeof subscription === "string") {
          try {
            subscription = JSON.parse(subscription);
          } catch (error) {
            console.error(`Invalid stored push subscription ${row.id}:`, error);
            return {
              id: row.id,
              success: false,
              expired: true
            };
          }
        }
        const result = await sendToSubscription(subscription, payload);
        return {
          id: row.id,
          ...result
        };
      }));
      sent += results.filter((result)=>result.success).length;
      const expiredIds = results.filter((result)=>result.expired).map((result)=>result.id);
      if (expiredIds.length) {
        const { error: deleteError } = await supabase.from("push_subscriptions_general").delete().in("id", expiredIds);
        if (deleteError) {
          console.error("Could not remove expired general push subscriptions:", deleteError);
        } else {
          deleted += expiredIds.length;
        }
      }
    }
    if (subscriptions.length < pageSize) break;
  }
  return jsonResponse({
    success: sent > 0,
    sent,
    total,
    deleted,
    message: total === 0 ? "There are no general push subscribers yet." : `${sent} of ${total} notifications sent.`
  });
});
