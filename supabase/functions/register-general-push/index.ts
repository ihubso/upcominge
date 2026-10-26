import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  if (req.method !== "POST") return jsonResponse({
    success: false,
    error: "Method not allowed"
  }, 405);
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase service configuration for general push registration.");
    return jsonResponse({
      success: false,
      error: "Push registration is not configured."
    }, 500);
  }
  try {
    const body = await req.json();
    const subscription = body?.subscription;
    const endpoint = subscription?.endpoint;
    const keys = subscription?.keys;
    if (typeof endpoint !== "string" || endpoint.length > 2048 || !endpoint.startsWith("https://") || typeof keys?.p256dh !== "string" || keys.p256dh.length < 16 || keys.p256dh.length > 512 || typeof keys?.auth !== "string" || keys.auth.length < 8 || keys.auth.length > 256) {
      return jsonResponse({
        success: false,
        error: "Invalid push subscription."
      }, 400);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("push_subscriptions_general").upsert({
      endpoint,
      subscription,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "endpoint"
    });
    if (error) {
      console.error("Could not save general push subscription:", error);
      return jsonResponse({
        success: false,
        error: "Could not save this device subscription."
      }, 500);
    }
    return jsonResponse({
      success: true
    });
  } catch (error) {
    console.error("General push registration failed:", error);
    return jsonResponse({
      success: false,
      error: "Invalid registration request."
    }, 400);
  }
});
