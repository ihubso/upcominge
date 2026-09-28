drop extension if exists "pg_net";

create sequence "public"."cart_id_seq";

create sequence "public"."push_notifications_id_seq";

create sequence "public"."push_subscriptions_id_seq";

create sequence "public"."wishlist_id_seq";


  create table "public"."admin_users" (
    "id" uuid not null,
    "email" text not null,
    "full_name" text,
    "role" text not null default 'admin'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."admin_users" enable row level security;


  create table "public"."business_info" (
    "id" integer not null default 1,
    "shop_name" text default 'ShopBoss'::text,
    "email" text default 'hello@shopboss.com'::text,
    "phone" text default '+1234567890'::text,
    "address" text default '123 Commerce St'::text,
    "facebook" text default ''::text,
    "instagram" text default ''::text,
    "tiktok" text default ''::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."business_info" enable row level security;


  create table "public"."cart" (
    "id" integer not null default nextval('public.cart_id_seq'::regclass),
    "customer_id" text not null default ''::text,
    "product_id" text not null default ''::text,
    "name" text not null default ''::text,
    "price" numeric default 0,
    "qty" integer default 1,
    "image" text default ''::text,
    "created_at" timestamp with time zone default now(),
    "variants" jsonb default '{}'::jsonb,
    "is_deal" boolean default false,
    "original_price" numeric,
    "discount" integer,
    "session_id" text,
    "brand" text
      );


alter table "public"."cart" enable row level security;


  create table "public"."category_showcase_config" (
    "id" integer not null default 1,
    "filter_type" text default 'category'::text,
    "filter_value" text default 'smartphone'::text,
    "title" text default 'Smartphones & Tablets'::text,
    "subtitle" text default 'Hurry! Take advantage of discounts of up to 50% on our collection.'::text,
    "badge" text default '🔥 Limited Time Offer'::text,
    "countdown_hours" integer default 24,
    "max_products" integer default 8,
    "cta_text" text default 'Shop Now →'::text,
    "cta_secondary_text" text default 'View All'::text,
    "view_all_link" text default '/category/?category=smartphone'::text,
    "show_hero" boolean default true,
    "hero_images" jsonb default '["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80", "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80"]'::jsonb,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now()
      );


alter table "public"."category_showcase_config" enable row level security;


  create table "public"."contact_info" (
    "id" integer not null default 1,
    "latitude" numeric default 40.7128,
    "longitude" numeric default '-74.0060'::numeric,
    "hours" text default 'Mon - Fri: 9:00 AM - 6:00 PM\nSat: 10:00 AM - 4:00 PM\nSun: Closed'::text,
    "description" text default ''::text,
    "shop_photo" text default ''::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."contact_info" enable row level security;


  create table "public"."customer_accounts" (
    "id" uuid not null,
    "email" text not null,
    "password_hash" text not null,
    "name" text not null,
    "phone" text default ''::text,
    "address" text default ''::text,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "status" text default 'active'::text,
    "bio" text,
    "country" text,
    "st_terms_accepted" text,
    "st_terms_accepted_date" text
      );


alter table "public"."customer_accounts" enable row level security;


  create table "public"."deals" (
    "product_id" text not null,
    "discount" integer not null
      );


alter table "public"."deals" enable row level security;


  create table "public"."failed_searches" (
    "query" text not null,
    "count" integer default 1,
    "last_searched" text default ''::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."failed_searches" enable row level security;


  create table "public"."featured_products" (
    "product_id" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."featured_products" enable row level security;


  create table "public"."j0" (
    "id" uuid not null default gen_random_uuid(),
    "product_name" text not null,
    "productname" text,
    "quantity" integer default 1,
    "price" numeric(10,2) default 0,
    "total_amount" numeric(10,2) default 0,
    "totalamount" numeric(10,2),
    "payment_type" text default 'Cash'::text,
    "paymenttype" text,
    "customer_name" text default ''::text,
    "customername" text,
    "customer_phone" text default ''::text,
    "type" text default 'product'::text,
    "tax_rate" numeric default 0,
    "tax_amount" numeric default 0,
    "credit_balance" numeric default 0,
    "amount_paid" numeric default 0,
    "balance_due" numeric default 0,
    "advance_payment" numeric default 0,
    "advance_payment_date" date,
    "mobile_money_type" text default ''::text,
    "hybrid_breakdown" jsonb default '{}'::jsonb,
    "receipt_id" text,
    "serial_number" text,
    "refund_of" text,
    "refund_reason" text,
    "exchange_with" text,
    "extra_paid" numeric default 0,
    "product_id" uuid,
    "exchange_product_id" uuid,
    "is_exchange_extra" boolean default false,
    "is_loan_repayment" boolean default false,
    "loan_id" uuid,
    "credit_sale_ref_id" text,
    "credit_remaining" numeric,
    "credit_status" text,
    "notes" text,
    "metadata" jsonb default '{}'::jsonb,
    "username" text default ''::text,
    "sold_by" uuid,
    "business_id" uuid,
    "date_sold" date default CURRENT_DATE,
    "datesold" text,
    "created_at" timestamp with time zone default now(),
    "category" character varying(255),
    "unit_price" numeric(10,2),
    "total_price" numeric(10,2),
    "subtotal" numeric(10,2)
      );


alter table "public"."j0" enable row level security;


  create table "public"."jb" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."jb" enable row level security;


  create table "public"."notifications" (
    "id" text not null,
    "user_id" text not null,
    "title" text not null,
    "text" text,
    "link" text,
    "image" text,
    "read" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."orders" (
    "id" text not null,
    "customer_name" text not null,
    "phone" text not null,
    "address" text default ''::text,
    "email" text default ''::text,
    "items" jsonb default '[]'::jsonb,
    "total" numeric default 0,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone default now(),
    "customer_id" text,
    "notes" text,
    "payment_method" text,
    "orderid" text
      );


alter table "public"."orders" enable row level security;


  create table "public"."products" (
    "id" text not null,
    "name" text not null,
    "price" numeric not null,
    "category" text default 'phone'::text,
    "description" text default ''::text,
    "stock" integer default 0,
    "image" text default 'https://placehold.co/600x400'::text,
    "images" jsonb default '[]'::jsonb,
    "isHot" boolean default false,
    "isNew" boolean default false,
    "brand" text default ''::text,
    "os" text default ''::text,
    "cpu" text default ''::text,
    "specs" text default ''::text,
    "variants" jsonb default '[]'::jsonb,
    "deliveryEstimate" text default ''::text,
    "created_at" timestamp with time zone default now(),
    "view" numeric,
    "rating" numeric default 0,
    "review_count" bigint default 0,
    "updated_at" text
      );


alter table "public"."products" enable row level security;


  create table "public"."push_notifications" (
    "id" bigint not null default nextval('public.push_notifications_id_seq'::regclass),
    "user_id" text not null,
    "title" text not null,
    "body" text not null,
    "data" jsonb,
    "sent_at" timestamp with time zone default now(),
    "delivered" boolean default false,
    "error" text
      );


alter table "public"."push_notifications" enable row level security;


  create table "public"."push_subscriptions" (
    "id" bigint not null default nextval('public.push_subscriptions_id_seq'::regclass),
    "user_id" text not null,
    "subscription" jsonb not null,
    "endpoint" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."push_subscriptions" enable row level security;


  create table "public"."reviews" (
    "id" bigint not null,
    "product_id" text not null,
    "user_name" text not null,
    "rating" integer not null,
    "comment" text default ''::text,
    "date" text default ''::text,
    "created_at" timestamp with time zone default now(),
    "approved" text
      );


alter table "public"."reviews" enable row level security;


  create table "public"."search_analytics" (
    "query" text not null,
    "count" integer default 0,
    "last_searched" timestamp with time zone default now(),
    "results" integer default 0
      );


alter table "public"."search_analytics" enable row level security;


  create table "public"."view_analytics" (
    "product_id" text not null,
    "count" integer default 1,
    "first_viewed" text default ''::text,
    "last_viewed" text default ''::text
      );


alter table "public"."view_analytics" enable row level security;


  create table "public"."wishlist" (
    "customer_id" text,
    "product_id" text not null,
    "session_id" text,
    "id" integer not null default nextval('public.wishlist_id_seq'::regclass)
      );


alter table "public"."wishlist" enable row level security;

alter sequence "public"."cart_id_seq" owned by "public"."cart"."id";

alter sequence "public"."push_notifications_id_seq" owned by "public"."push_notifications"."id";

alter sequence "public"."push_subscriptions_id_seq" owned by "public"."push_subscriptions"."id";

alter sequence "public"."wishlist_id_seq" owned by "public"."wishlist"."id";

CREATE INDEX admin_users_email_idx ON public.admin_users USING btree (email);

CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (id);

CREATE UNIQUE INDEX business_info_pkey ON public.business_info USING btree (id);

CREATE UNIQUE INDEX cart_pkey ON public.cart USING btree (id);

CREATE UNIQUE INDEX category_showcase_config_pkey ON public.category_showcase_config USING btree (id);

CREATE UNIQUE INDEX contact_info_pkey ON public.contact_info USING btree (id);

CREATE UNIQUE INDEX customer_accounts_email_key ON public.customer_accounts USING btree (email);

CREATE UNIQUE INDEX customer_accounts_pkey ON public.customer_accounts USING btree (id);

CREATE UNIQUE INDEX deals_pkey ON public.deals USING btree (product_id);

CREATE UNIQUE INDEX failed_searches_pkey ON public.failed_searches USING btree (query);

CREATE UNIQUE INDEX featured_products_pkey ON public.featured_products USING btree (product_id);

CREATE INDEX idx_cart_session ON public.cart USING btree (customer_id);

CREATE INDEX idx_customer_accounts_email ON public.customer_accounts USING btree (email);

CREATE INDEX idx_deals_product_id ON public.deals USING btree (product_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);

CREATE INDEX idx_orders_customer_name ON public.orders USING btree (customer_name);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_products_id ON public.products USING btree (id);

CREATE INDEX idx_push_notifications_sent_at ON public.push_notifications USING btree (sent_at);

CREATE INDEX idx_push_notifications_user_id ON public.push_notifications USING btree (user_id);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);

CREATE INDEX idx_reviews_product ON public.reviews USING btree (product_id);

CREATE INDEX idx_wishlist_session ON public.wishlist USING btree (customer_id);

CREATE UNIQUE INDEX jb_pkey ON public.jb USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX push_notifications_pkey ON public.push_notifications USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id);

CREATE UNIQUE INDEX sales_pkey ON public.j0 USING btree (id);

CREATE UNIQUE INDEX search_analytics_pkey ON public.search_analytics USING btree (query);

CREATE UNIQUE INDEX view_analytics_pkey ON public.view_analytics USING btree (product_id);

CREATE UNIQUE INDEX wishlist_pkey ON public.wishlist USING btree (id);

alter table "public"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY using index "admin_users_pkey";

alter table "public"."business_info" add constraint "business_info_pkey" PRIMARY KEY using index "business_info_pkey";

alter table "public"."cart" add constraint "cart_pkey" PRIMARY KEY using index "cart_pkey";

alter table "public"."category_showcase_config" add constraint "category_showcase_config_pkey" PRIMARY KEY using index "category_showcase_config_pkey";

alter table "public"."contact_info" add constraint "contact_info_pkey" PRIMARY KEY using index "contact_info_pkey";

alter table "public"."customer_accounts" add constraint "customer_accounts_pkey" PRIMARY KEY using index "customer_accounts_pkey";

alter table "public"."deals" add constraint "deals_pkey" PRIMARY KEY using index "deals_pkey";

alter table "public"."failed_searches" add constraint "failed_searches_pkey" PRIMARY KEY using index "failed_searches_pkey";

alter table "public"."featured_products" add constraint "featured_products_pkey" PRIMARY KEY using index "featured_products_pkey";

alter table "public"."j0" add constraint "sales_pkey" PRIMARY KEY using index "sales_pkey";

alter table "public"."jb" add constraint "jb_pkey" PRIMARY KEY using index "jb_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."push_notifications" add constraint "push_notifications_pkey" PRIMARY KEY using index "push_notifications_pkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY using index "push_subscriptions_pkey";

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."search_analytics" add constraint "search_analytics_pkey" PRIMARY KEY using index "search_analytics_pkey";

alter table "public"."view_analytics" add constraint "view_analytics_pkey" PRIMARY KEY using index "view_analytics_pkey";

alter table "public"."wishlist" add constraint "wishlist_pkey" PRIMARY KEY using index "wishlist_pkey";

alter table "public"."admin_users" add constraint "admin_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_users" validate constraint "admin_users_id_fkey";

alter table "public"."admin_users" add constraint "admin_users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'super_admin'::text]))) not valid;

alter table "public"."admin_users" validate constraint "admin_users_role_check";

alter table "public"."customer_accounts" add constraint "customer_accounts_email_key" UNIQUE using index "customer_accounts_email_key";

alter table "public"."deals" add constraint "deals_discount_check" CHECK (((discount >= 1) AND (discount <= 95))) not valid;

alter table "public"."deals" validate constraint "deals_discount_check";

alter table "public"."featured_products" add constraint "featured_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."featured_products" validate constraint "featured_products_product_id_fkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_endpoint_key" UNIQUE using index "push_subscriptions_endpoint_key";

alter table "public"."reviews" add constraint "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_rating_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_add_featured(p_product_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_product_id, '') = '' THEN
        RAISE EXCEPTION 'Missing product_id';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.products WHERE id::text = p_product_id
    ) THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    INSERT INTO public.featured_products (product_id)
    VALUES (p_product_id)
    ON CONFLICT (product_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_analytics_orders()
 RETURNS TABLE(id text, customer_id text, customer_name text, total numeric, status text, items jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    RETURN QUERY
    SELECT
        o.id::text,
        o.customer_id::text,      -- cast uuid -> text
        o.customer_name::text,
        o.total::numeric,
        o.status::text,
        o.items::jsonb,           -- cast text -> jsonb (if column is text)
        o.created_at::timestamptz
    FROM public.orders o
    ORDER BY o.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_analytics_products()
 RETURNS TABLE(id text, name text, price numeric, category text, image text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT p.id::text, p.name::text, p.price::numeric,
           p.category::text, p.image::text
    FROM public.products p;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_clear_search_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    DELETE FROM public.search_analytics;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_clear_view_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    DELETE FROM public.view_analytics;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_product(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_id text;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_payload->>'id', '')       = ''
       OR COALESCE(p_payload->>'name', '')  = ''
       OR COALESCE(p_payload->>'brand', '') = ''
       OR COALESCE(p_payload->>'category', '') = ''
    THEN
        RAISE EXCEPTION 'Missing required fields (id, name, brand, category)';
    END IF;

    v_id := p_payload->>'id';

    INSERT INTO public.products (
        id, name, brand, price, stock, category,
        image, images, description, cpu, os, specs,
        "isHot", "isNew", "deliveryEstimate", variants, created_at
    )
    VALUES (
        v_id,
        p_payload->>'name',
        p_payload->>'brand',

        -- price is TEXT in your schema — pass through
        COALESCE(NULLIF(p_payload->>'price', '')::numeric, 0),

        COALESCE((p_payload->>'stock')::int, 0),
        p_payload->>'category',
        COALESCE(p_payload->>'image', ''),

        -- images is TEXT storing JSON — convert jsonb array to text
         COALESCE(p_payload->'images', '[]'::jsonb),

        COALESCE(p_payload->>'description', ''),

        -- cpu / os are nullable — NULL instead of ''
        NULLIF(p_payload->>'cpu', ''),
        NULLIF(p_payload->>'os', ''),

        COALESCE(p_payload->>'specs', ''),
        COALESCE((p_payload->>'isHot')::boolean, false),
        COALESCE((p_payload->>'isNew')::boolean, false),
        COALESCE(p_payload->>'deliveryEstimate', ''),

        -- variants is TEXT storing JSON — convert jsonb array to text
            COALESCE(p_payload->'variants', '[]'::jsonb),

        COALESCE((p_payload->>'created_at')::timestamptz, now())
    );

    RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS TABLE(total_orders bigint, total_customers bigint, total_products bigint, total_reviews bigint, total_revenue numeric, pending_orders bigint, orders_this_month bigint, customers_this_month bigint, revenue_this_month numeric, total_views bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.orders)::bigint,
        (SELECT COUNT(*) FROM public.customer_accounts)::bigint,
        (SELECT COUNT(*) FROM public.products)::bigint,
        (SELECT COUNT(*) FROM public.reviews)::bigint,
        (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE status = 'delivered')::numeric,
        (SELECT COUNT(*) FROM public.orders WHERE status = 'pending')::bigint,
        (SELECT COUNT(*) FROM public.orders
            WHERE created_at >= date_trunc('month', now()))::bigint,
        (SELECT COUNT(*) FROM public.customer_accounts
            WHERE created_at >= date_trunc('month', now()))::bigint,
        (SELECT COALESCE(SUM(total), 0) FROM public.orders
            WHERE status = 'delivered'
              AND created_at >= date_trunc('month', now()))::numeric,
        (SELECT COALESCE(SUM(COALESCE(view, 0)), 0) FROM public.products)::bigint;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    DELETE FROM public.orders WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    RETURN json_build_object('success', true, 'id', p_order_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_product(p_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    DELETE FROM public.deals    WHERE product_id::text = p_id;
    DELETE FROM public.products WHERE id::text         = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_review(p_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    DELETE FROM public.reviews WHERE id::text = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_business_info()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    SELECT to_jsonb(b)
      INTO v_result
      FROM public.business_info b
     WHERE b.id = 1;

    -- Return an empty object rather than null so the client can treat uniformly
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_category_showcase()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    SELECT to_jsonb(c)
      INTO v_result
      FROM public.category_showcase_config c
     WHERE c.id = 1;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_contact_info()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    SELECT to_jsonb(c)
      INTO v_result
      FROM public.contact_info c
     WHERE c.id = 1;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_order(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_id, '') = '' THEN
        RAISE EXCEPTION 'Missing order id';
    END IF;

    SELECT to_jsonb(o)
      INTO v_result
      FROM public.orders o
     WHERE o.id::text = p_id;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_product(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_id, '') = '' THEN
        RAISE EXCEPTION 'Missing product id';
    END IF;

    SELECT to_jsonb(p)
      INTO v_result
      FROM public.products p
     WHERE p.id::text = p_id;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_customers(p_search text DEFAULT ''::text, p_limit integer DEFAULT 12, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, email text, phone text, address text, country text, status text, created_at timestamp with time zone, last_login timestamp with time zone, order_count bigint, total_spent numeric, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_search text := LOWER(TRIM(COALESCE(p_search, '')));
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            ca.id,
            ca.name::text,
            ca.email::text,
            ca.phone::text,
            ca.address::text,
            ca.country::text,
            COALESCE(ca.status, 'active')::text AS status,
            ca.created_at::timestamptz,
            ca.last_login::timestamptz
        FROM public.customer_accounts ca
        WHERE
            v_search = ''
            OR LOWER(COALESCE(ca.name,''))     LIKE '%' || v_search || '%'
            OR LOWER(COALESCE(ca.email,''))    LIKE '%' || v_search || '%'
            OR LOWER(COALESCE(ca.phone,''))    LIKE '%' || v_search || '%'
            OR LOWER(COALESCE(ca.address,''))  LIKE '%' || v_search || '%'
    ),
    stats AS (
        SELECT
            f.id,
            COUNT(o.id)::bigint AS order_count,
            COALESCE(SUM(o.total), 0)::numeric AS total_spent
        FROM filtered f
        LEFT JOIN public.orders o ON o.customer_id::text = f.id::text
        GROUP BY f.id
    )
    SELECT
        f.id, f.name, f.email, f.phone, f.address, f.country, f.status,
        f.created_at, f.last_login,
        COALESCE(s.order_count, 0)::bigint,
        COALESCE(s.total_spent, 0)::numeric,
        COUNT(*) OVER ()::bigint AS total_count
    FROM filtered f
    LEFT JOIN stats s ON s.id = f.id
    ORDER BY f.created_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_featured()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      INTO v_result
      FROM (
        SELECT
            fp.product_id::text                       AS product_id,
            COALESCE(p.name,  'Unknown Product')::text AS name,
            COALESCE(p.image, '')::text                AS image,
            COALESCE(fp.created_at, now())             AS created_at
        FROM public.featured_products fp
        LEFT JOIN public.products p ON p.id::text = fp.product_id::text
        ORDER BY fp.created_at DESC
      ) t;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_orders(p_status text DEFAULT 'all'::text, p_search text DEFAULT ''::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, customer_name text, customer_id text, email text, phone text, address text, items jsonb, total numeric, status text, notes text, payment_method text, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_search text := LOWER(TRIM(COALESCE(p_search, '')));
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            o.id::text            AS id,
            o.customer_name::text AS customer_name,
            o.customer_id::text   AS customer_id,
            o.email::text         AS email,
            o.phone::text         AS phone,
            o.address::text       AS address,
            o.items::jsonb        AS items,
            o.total::numeric      AS total,
            o.status::text        AS status,
            o.notes::text         AS notes,
            o.payment_method::text AS payment_method,
            o.created_at::timestamptz AS created_at
        FROM public.orders o
        WHERE
            (p_status IS NULL OR p_status = '' OR p_status = 'all'
                OR LOWER(o.status) = LOWER(p_status))
            AND (
                v_search = ''
                OR LOWER(o.id)            LIKE '%' || v_search || '%'
                OR LOWER(COALESCE(o.customer_name,'')) LIKE '%' || v_search || '%'
                OR LOWER(COALESCE(o.email,''))         LIKE '%' || v_search || '%'
                OR LOWER(COALESCE(o.phone,''))         LIKE '%' || v_search || '%'
            )
    )
    SELECT
        f.id, f.customer_name, f.customer_id, f.email, f.phone, f.address,
        f.items, f.total, f.status, f.notes, f.payment_method, f.created_at,
        COUNT(*) OVER ()::bigint AS total_count
    FROM filtered f
    ORDER BY f.created_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_product_categories()
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_cats text[];
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    SELECT ARRAY_AGG(DISTINCT category ORDER BY category)
      INTO v_cats
      FROM public.products
     WHERE category IS NOT NULL AND category <> '';

    RETURN COALESCE(v_cats, ARRAY[]::text[]);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_products(p_search text DEFAULT ''::text, p_category text DEFAULT ''::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, name text, brand text, category text, price numeric, stock integer, image text, description text, "isHot" boolean, "isNew" boolean, "deliveryEstimate" text, deal_discount integer, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_search   text := LOWER(TRIM(COALESCE(p_search, '')));
    v_category text := TRIM(COALESCE(p_category, ''));
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            p.id::text                                   AS id,
            COALESCE(p.name, 'Unknown')::text            AS name,
            COALESCE(p.brand, '')::text                  AS brand,
            COALESCE(p.category, '')::text               AS category,
            COALESCE(p.price, 0)::numeric                AS price,
            COALESCE(p.stock, 0)::int                    AS stock,
            COALESCE(p.image, '')::text                  AS image,
            COALESCE(p.description, '')::text            AS description,
            COALESCE(p."isHot", false)::boolean          AS "isHot",
            COALESCE(p."isNew", false)::boolean          AS "isNew",
            COALESCE(p."deliveryEstimate", '')::text     AS "deliveryEstimate",
            COALESCE(p.created_at, now())::timestamptz   AS created_at
        FROM public.products p
        WHERE
            (v_category = '' OR p.category = v_category)
            AND (
                v_search = ''
                OR LOWER(COALESCE(p.name, ''))        LIKE '%' || v_search || '%'
                OR LOWER(COALESCE(p.brand, ''))       LIKE '%' || v_search || '%'
                OR LOWER(COALESCE(p.description, '')) LIKE '%' || v_search || '%'
                OR LOWER(COALESCE(p.category, ''))    LIKE '%' || v_search || '%'
            )
    )
    SELECT
        f.id, f.name, f.brand, f.category, f.price, f.stock, f.image,
        f.description, f."isHot", f."isNew", f."deliveryEstimate",
        d.discount::int      AS deal_discount,
        f.created_at,
        COUNT(*) OVER ()::bigint AS total_count
    FROM filtered f
    LEFT JOIN public.deals d ON d.product_id::text = f.id
    ORDER BY f.created_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_reviews(p_search text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, product_id text, product_name text, product_image text, user_name text, rating integer, comment text, approved boolean, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_search text := LOWER(TRIM(COALESCE(p_search, '')));
    v_status text := LOWER(TRIM(COALESCE(p_status, 'all')));
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    WITH joined AS (
        SELECT
            r.id::text                                   AS id,
            r.product_id::text                           AS product_id,
            COALESCE(p.name,  'Unknown Product')::text   AS product_name,
            COALESCE(p.image, '')::text                  AS product_image,
            COALESCE(r.user_name, 'Anonymous')::text     AS user_name,
            COALESCE(r.rating, 0)::int                   AS rating,
            COALESCE(r.comment, '')::text                AS comment,
            CASE
                WHEN LOWER(COALESCE(r.approved::text, ''))
                     IN ('true','t','1','yes','y','approved') THEN true
                ELSE false
            END                                          AS approved,
            COALESCE(r.created_at, now())::timestamptz   AS created_at
        FROM public.reviews r
        LEFT JOIN public.products p
               ON p.id::text = r.product_id::text
    ),
    filtered AS (
        SELECT *
        FROM joined j
        WHERE
            (
                v_status = 'all'
                OR (v_status = 'approved' AND j.approved = true)
                OR (v_status = 'pending'  AND j.approved = false)
            )
            AND (
                v_search = ''
                OR LOWER(j.user_name)    LIKE '%' || v_search || '%'
                OR LOWER(j.comment)      LIKE '%' || v_search || '%'
                OR LOWER(j.product_name) LIKE '%' || v_search || '%'
            )
    )
    SELECT
        f.id, f.product_id, f.product_name, f.product_image,
        f.user_name, f.rating, f.comment, f.approved, f.created_at,
        COUNT(*) OVER ()::bigint AS total_count
    FROM filtered f
    ORDER BY f.created_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_unfeatured_products()
 RETURNS TABLE(id text, name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    SELECT
        p.id::text                        AS id,
        COALESCE(p.name, 'Unknown')::text AS name
    FROM public.products p
    WHERE NOT EXISTS (
        SELECT 1 FROM public.featured_products fp
        WHERE fp.product_id::text = p.id::text
    )
    ORDER BY name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_low_stock_products(p_threshold integer DEFAULT 10, p_limit integer DEFAULT 5)
 RETURNS TABLE(id text, name text, stock integer, image text, price numeric, category text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    SELECT
        p.id::text, p.name::text, p.stock::int,
        p.image::text, p.price::numeric, p.category::text
    FROM public.products p
    WHERE p.stock <= p_threshold
    ORDER BY p.stock ASC
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_me()
 RETURNS TABLE(id uuid, email text, full_name text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT a.id, a.email, a.full_name, a.role
    FROM public.admin_users a
    WHERE a.id = auth.uid()
      AND a.is_active = true
    LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_most_viewed_products(p_limit integer DEFAULT 10)
 RETURNS TABLE(id text, name text, brand text, category text, image text, price numeric, stock integer, view integer, rating numeric, review_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    SELECT
        p.id::text,
        p.name::text,
        p.brand::text,
        p.category::text,
        p.image::text,
        p.price::numeric,
        p.stock::int,
        COALESCE(p.view, 0)::int,
        COALESCE((SELECT AVG(r.rating)::numeric FROM public.reviews r WHERE r.product_id = p.id), 0)::numeric,
        COALESCE((SELECT COUNT(*)::bigint FROM public.reviews r WHERE r.product_id = p.id), 0)::bigint
    FROM public.products p
    ORDER BY COALESCE(p.view, 0) DESC, p.created_at DESC
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_product_options()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_categories text[];
    v_brands     text[];
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    SELECT ARRAY_AGG(DISTINCT category ORDER BY category)
      INTO v_categories
      FROM public.products
     WHERE category IS NOT NULL AND category <> '';

    SELECT ARRAY_AGG(DISTINCT brand ORDER BY brand)
      INTO v_brands
      FROM public.products
     WHERE brand IS NOT NULL AND brand <> '';

    RETURN jsonb_build_object(
        'categories', COALESCE(to_jsonb(v_categories), '[]'::jsonb),
        'brands',     COALESCE(to_jsonb(v_brands),     '[]'::jsonb)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_recent_orders(p_limit integer DEFAULT 5)
 RETURNS TABLE(id text, customer_name text, customer_id text, total numeric, status text, created_at timestamp with time zone, items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    SELECT
        o.id::text,
        o.customer_name::text,
        o.customer_id::text,     -- ✅ cast text
        o.total::numeric,
        o.status::text,
        o.created_at::timestamptz,
        o.items::jsonb
    FROM public.orders o
    ORDER BY o.created_at DESC
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_recent_searches(p_limit integer DEFAULT 10)
 RETURNS TABLE(query text, count integer, results integer, last_searched timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT s.query::text, s.count::int, COALESCE(s.results, 0)::int, s.last_searched
    FROM public.search_analytics s
    WHERE s.query IS NOT NULL
    ORDER BY s.last_searched DESC NULLS LAST
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_remove_featured(p_product_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    DELETE FROM public.featured_products
     WHERE product_id::text = p_product_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_remove_product_deal(p_product_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    DELETE FROM public.deals WHERE product_id::text = p_product_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_business_info(p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_payload->>'shop_name', '') = ''
       OR COALESCE(p_payload->>'email', '')     = ''
       OR COALESCE(p_payload->>'phone', '')     = ''
    THEN
        RAISE EXCEPTION 'Missing required fields (shop_name, email, phone)';
    END IF;

    INSERT INTO public.business_info (
        id, shop_name, email, phone, address,
        facebook, instagram, tiktok
    )
    VALUES (
        1,
        p_payload->>'shop_name',
        p_payload->>'email',
        p_payload->>'phone',
        COALESCE(p_payload->>'address',   ''),
        COALESCE(p_payload->>'facebook',  ''),
        COALESCE(p_payload->>'instagram', ''),
        COALESCE(p_payload->>'tiktok',    '')
    )
    ON CONFLICT (id) DO UPDATE SET
        shop_name = EXCLUDED.shop_name,
        email     = EXCLUDED.email,
        phone     = EXCLUDED.phone,
        address   = EXCLUDED.address,
        facebook  = EXCLUDED.facebook,
        instagram = EXCLUDED.instagram,
        tiktok    = EXCLUDED.tiktok;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_category_showcase(p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_payload->>'filter_type', '') = '' THEN
        RAISE EXCEPTION 'filter_type is required';
    END IF;

    IF COALESCE(p_payload->>'title', '') = '' THEN
        RAISE EXCEPTION 'title is required';
    END IF;

    INSERT INTO public.category_showcase_config (
        id, filter_type, filter_value, title, subtitle, badge,
        countdown_hours, max_products, cta_text, cta_secondary_text,
        view_all_link, show_hero, hero_images, updated_at
    )
    VALUES (
        1,
        p_payload->>'filter_type',
        COALESCE(p_payload->>'filter_value', ''),
        p_payload->>'title',
        COALESCE(p_payload->>'subtitle', ''),
        COALESCE(p_payload->>'badge', ''),
        COALESCE((p_payload->>'countdown_hours')::int, 24),
        COALESCE((p_payload->>'max_products')::int, 8),
        COALESCE(p_payload->>'cta_text', ''),
        COALESCE(p_payload->>'cta_secondary_text', ''),
        COALESCE(p_payload->>'view_all_link', ''),
        COALESCE((p_payload->>'show_hero')::boolean, true),
        COALESCE(p_payload->'hero_images', '[]'::jsonb),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        filter_type         = EXCLUDED.filter_type,
        filter_value        = EXCLUDED.filter_value,
        title               = EXCLUDED.title,
        subtitle            = EXCLUDED.subtitle,
        badge               = EXCLUDED.badge,
        countdown_hours     = EXCLUDED.countdown_hours,
        max_products        = EXCLUDED.max_products,
        cta_text            = EXCLUDED.cta_text,
        cta_secondary_text  = EXCLUDED.cta_secondary_text,
        view_all_link       = EXCLUDED.view_all_link,
        show_hero           = EXCLUDED.show_hero,
        hero_images         = EXCLUDED.hero_images,
        updated_at          = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_save_contact_info(p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    INSERT INTO public.contact_info (
        id, description, latitude, longitude, hours, shop_photo
    )
    VALUES (
        1,
        COALESCE(p_payload->>'description', ''),
        NULLIF(p_payload->>'latitude',  ''),
        NULLIF(p_payload->>'longitude', ''),
        COALESCE(p_payload->>'hours', ''),
        COALESCE(p_payload->>'shop_photo', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        latitude    = EXCLUDED.latitude,
        longitude   = EXCLUDED.longitude,
        hours       = EXCLUDED.hours,
        shop_photo  = EXCLUDED.shop_photo;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_searches_with_no_results(p_limit integer DEFAULT 10)
 RETURNS TABLE(query text, count integer, last_searched timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT s.query::text, s.count::int, s.last_searched
    FROM public.search_analytics s
    WHERE s.query IS NOT NULL AND COALESCE(s.results, 0) = 0
    ORDER BY s.count DESC, s.last_searched DESC NULLS LAST
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_id text, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF LOWER(COALESCE(p_status, '')) NOT IN
       ('pending','confirmed','processing','shipped','delivered','cancelled')
    THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    UPDATE public.orders
       SET status = LOWER(p_status)
     WHERE id::text = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_product_deal(p_product_id text, p_discount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF p_discount IS NULL OR p_discount < 1 OR p_discount > 95 THEN
        RAISE EXCEPTION 'Discount must be between 1 and 95';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id::text = p_product_id) THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    INSERT INTO public.deals (product_id, discount)
    VALUES (p_product_id, p_discount)
    ON CONFLICT (product_id) DO UPDATE SET discount = EXCLUDED.discount;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_review_approved(p_id text, p_approved boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    UPDATE public.reviews
       SET approved = CASE WHEN p_approved THEN 'true' ELSE 'false' END
     WHERE id::text = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_top_searches(p_limit integer DEFAULT 10)
 RETURNS TABLE(query text, count integer, results integer, last_searched timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT s.query::text, s.count::int, COALESCE(s.results, 0)::int, s.last_searched
    FROM public.search_analytics s
    WHERE s.query IS NOT NULL
    ORDER BY s.count DESC, s.last_searched DESC NULLS LAST
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_trending_searches(p_limit integer DEFAULT 8)
 RETURNS TABLE(query text, count integer, last_searched timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    RETURN QUERY
    SELECT
        s.query::text,
        s.count::int,
        s.last_searched::timestamptz
    FROM public.search_analytics s
    WHERE s.query IS NOT NULL
      AND length(trim(s.query)) >= 3
      AND s.query !~* '^[a-z]{1,2}$'   -- filter out 1-2 letter junk
    ORDER BY s.count DESC, s.last_searched DESC
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id text, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF p_status NOT IN ('pending','confirmed','processing','shipped','delivered','cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    UPDATE public.orders
    SET status = p_status
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    RETURN json_build_object('success', true, 'id', p_order_id, 'status', p_status);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_product(p_id text, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    IF COALESCE(p_id, '') = '' THEN
        RAISE EXCEPTION 'Missing product id';
    END IF;

    IF COALESCE(p_payload->>'name', '')     = ''
       OR COALESCE(p_payload->>'brand', '') = ''
       OR COALESCE(p_payload->>'category', '') = ''
    THEN
        RAISE EXCEPTION 'Missing required fields (name, brand, category)';
    END IF;

    UPDATE public.products
       SET name               = p_payload->>'name',
           brand              = p_payload->>'brand',
           price              = COALESCE(NULLIF(p_payload->>'price', '')::numeric, 0),
           stock              = COALESCE((p_payload->>'stock')::int, 0),
           category           = p_payload->>'category',
           image              = COALESCE(p_payload->>'image', ''),
           images             = COALESCE(p_payload->'images',   '[]'::jsonb),
           description        = COALESCE(p_payload->>'description', ''),
           cpu                = NULLIF(p_payload->>'cpu', ''),
           os                 = NULLIF(p_payload->>'os',  ''),
           specs              = COALESCE(p_payload->>'specs', ''),
           "isHot"            = COALESCE((p_payload->>'isHot')::boolean, false),
           "isNew"            = COALESCE((p_payload->>'isNew')::boolean, false),
           "deliveryEstimate" = COALESCE(p_payload->>'deliveryEstimate', ''),
           variants           = COALESCE(p_payload->'variants', '[]'::jsonb),
           updated_at         = now()
     WHERE id::text = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_view_analytics(p_limit integer DEFAULT 10)
 RETURNS TABLE(product_id text, product_name text, product_image text, count integer, last_viewed timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    RETURN QUERY
    SELECT
        v.product_id::text,
        COALESCE(p.name, 'Deleted Product')::text,
        COALESCE(p.image, '')::text,
        v.count::int,
        v.last_viewed::timestamptz
    FROM public.view_analytics v
    LEFT JOIN public.products p ON p.id = v.product_id
    ORDER BY v.count DESC
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
 RETURNS TABLE(id uuid, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT ca.id, ca.email FROM public.customer_accounts ca WHERE ca.email = p_email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_wishlist(p_customer_id text, p_session_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.wishlist
    WHERE (p_customer_id IS NOT NULL AND customer_id = p_customer_id)
       OR (p_session_id IS NOT NULL AND session_id = p_session_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_customer_account(p_id uuid, p_name text, p_email text, p_phone text, p_address text, p_country text, p_password text, p_st_terms_accepted text, p_st_terms_accepted_date timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.customer_accounts (
        id, name, email, phone, address, country, password_hash,
        st_terms_accepted, st_terms_accepted_date, status
    ) VALUES (
        p_id, p_name, p_email, p_phone, p_address, p_country, p_password,
        p_st_terms_accepted, p_st_terms_accepted_date, 'active'
    );
    RETURN json_build_object('success', true, 'id', p_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_order(p_id text, p_orderid text, p_customer_id uuid, p_customer_name text, p_phone text, p_address text, p_email text, p_items jsonb, p_total numeric, p_status text, p_payment_method text, p_notes text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_customer_exists boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.customer_accounts WHERE id = p_customer_id) INTO v_customer_exists;
    IF NOT v_customer_exists THEN
        RAISE EXCEPTION 'Invalid customer_id: You must be logged in with a valid account to place an order.';
    END IF;

    INSERT INTO public.orders (
        id, orderid, customer_id, customer_name, phone, address, email,
        items, total, status, payment_method, notes, created_at
    ) VALUES (
        p_id, p_orderid, p_customer_id, p_customer_name, p_phone, p_address,
        p_email, p_items, p_total, p_status, p_payment_method, p_notes, NOW()
    );

    RETURN json_build_object('success', true, 'order_id', p_orderid);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_order_status_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Only create notification if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.notifications (
            id,
            user_id,
            title,
            text,
            link,
            created_at
        ) VALUES (
            'notif_' || EXTRACT(EPOCH FROM NOW())::text || '_' || substr(md5(random()::text), 1, 6),
            NEW.customer_id,
            '📦 Order ' || NEW.id || ' is now ' || NEW.status,
            'Your order #' || NEW.id || ' status changed to ' || NEW.status || '.',
            '/orders/?order=' || NEW.id,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_customer_account(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.customer_accounts WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_deals()
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, rating numeric, review_count bigint, deal_discount numeric, original_price numeric, discounted_price numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::text, 
        p.name::text, 
        p.price::numeric, 
        p.category::text, 
        p.description::text, 
        p.stock::int, 
        p.image::text, 
        p.images::jsonb, 
        COALESCE(p."isHot", false)::boolean, 
        COALESCE(p."isNew", false)::boolean, 
        p.brand::text, 
        COALESCE(p.rating, 0)::numeric, 
        COALESCE(p.review_count, 0)::bigint, 
        COALESCE(d.discount, 0)::numeric, 
        p.price::numeric, 
        (p.price * (1 - COALESCE(d.discount, 0) / 100))::numeric
    FROM public.deals d
    JOIN public.products p ON p.id = d.product_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_products()
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ BEGIN RETURN QUERY SELECT p.id::text, p.name::text, p.price::numeric, p.category::text, p.description::text, p.stock::int, p.image::text, p.images::jsonb, p."isHot"::boolean, p."isNew"::boolean, p.brand::text, p.os::text, p.cpu::text, p.specs::text, p.variants::jsonb, p."deliveryEstimate"::text, p.created_at::timestamptz FROM public.products p ORDER BY p.created_at DESC; END; $function$
;

CREATE OR REPLACE FUNCTION public.get_all_reviews()
 RETURNS TABLE(id bigint, product_id text, user_name text, rating integer, comment text, date text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        r.id::bigint,
        r.product_id::text,
        r.user_name::text,
        r.rating::int,
        r.comment::text,
        r.date::text,
        r.created_at::timestamptz
    FROM public.reviews r
    ORDER BY r.created_at DESC NULLS LAST;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_best_categories()
 RETURNS TABLE(name text, count bigint, image text, product_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.category as name, 
        COUNT(*) as count, 
        (ARRAY_AGG(p.image ORDER BY p.created_at DESC) FILTER (WHERE p.image IS NOT NULL))[1] as image,
        (ARRAY_AGG(p.id ORDER BY p.created_at DESC))[1] as product_id
    FROM public.products p
    WHERE p.category IS NOT NULL
    GROUP BY p.category
    ORDER BY count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_business_info()
 RETURNS TABLE(id integer, shop_name text, email text, phone text, address text, facebook text, instagram text, tiktok text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.shop_name::text,
        b.email::text,
        b.phone::text,
        b.address::text,
        b.facebook::text,
        b.instagram::text,
        b.tiktok::text,
        b.created_at::timestamptz
    FROM public.business_info b
    ORDER BY b.id ASC
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_categories_with_counts()
 RETURNS TABLE(category text, product_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        LOWER(TRIM(prod.category))::text AS category,
        COUNT(*)::bigint                  AS product_count
    FROM public.products prod
    WHERE prod.category IS NOT NULL AND TRIM(prod.category) <> ''
    GROUP BY LOWER(TRIM(prod.category))
    ORDER BY product_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_category_products(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 12, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone, view integer, rating numeric, review_count bigint, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_category text := LOWER(TRIM(COALESCE(p_category, 'all')));
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT
            prod.id::text            AS id,
            prod.name::text          AS name,
            prod.price::numeric      AS price,
            prod.category::text      AS category,
            prod.description::text   AS description,
            prod.stock::int          AS stock,
            prod.image::text         AS image,
            prod.images::jsonb       AS images,
            prod."isHot"::boolean    AS "isHot",
            prod."isNew"::boolean    AS "isNew",
            prod.brand::text         AS brand,
            prod.os::text            AS os,
            prod.cpu::text           AS cpu,
            prod.specs::text         AS specs,
            prod.variants::jsonb     AS variants,
            prod."deliveryEstimate"::text AS "deliveryEstimate",
            prod.created_at::timestamptz  AS created_at,
            COALESCE(prod.view, 0)::int   AS view,
            COALESCE((SELECT AVG(r.rating)::numeric FROM public.reviews r WHERE r.product_id = prod.id), 0)::numeric AS rating,
            COALESCE((SELECT COUNT(*)::bigint  FROM public.reviews r WHERE r.product_id = prod.id), 0)::bigint AS review_count
        FROM public.products prod
        WHERE 
            v_category = 'all'
            OR v_category = ''
            OR LOWER(TRIM(COALESCE(prod.category, ''))) = v_category
    )
    SELECT 
        f.id, f.name, f.price, f.category, f.description, f.stock,
        f.image, f.images, f."isHot", f."isNew", f.brand, f.os, f.cpu,
        f.specs, f.variants, f."deliveryEstimate", f.created_at, f.view,
        f.rating, f.review_count,
        COUNT(*) OVER ()::bigint AS total_count
    FROM filtered f
    ORDER BY f.created_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_contact_business_info()
 RETURNS TABLE(id integer, shop_name text, email text, phone text, address text, facebook text, instagram text, tiktok text, latitude text, longitude text, hours text, description text, shop_photo text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.shop_name::text,
        b.email::text,
        b.phone::text,
        b.address::text,
        b.facebook::text,
        b.instagram::text,
        b.tiktok::text,
        c.latitude::text,
        c.longitude::text,
        c.hours::text,
        c.description::text,
        c.shop_photo::text
    FROM public.business_info b
    LEFT JOIN public.contact_info c ON c.id = b.id
    WHERE b.id = 1
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_customer_by_email(p_email text)
 RETURNS TABLE(id uuid, name text, email text, phone text, address text, country text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT ca.id, ca.name, ca.email, ca.phone, ca.address, ca.country, ca.status
    FROM public.customer_accounts ca WHERE ca.email = p_email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_customer_by_id(p_id uuid)
 RETURNS TABLE(id uuid, email text, name text, phone text, address text, last_login timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, status text, bio text, country text, st_terms_accepted text, st_terms_accepted_date timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,                                                        -- already uuid
        ca.email::text, 
        ca.name::text, 
        ca.phone::text, 
        ca.address::text,
        ca.last_login::timestamptz, 
        ca.created_at::timestamptz, 
        ca.updated_at::timestamptz,
        ca.status::text, 
        ca.bio::text, 
        ca.country::text,
        ca.st_terms_accepted::text,
        NULLIF(ca.st_terms_accepted_date, '')::timestamptz            -- safe cast
    FROM public.customer_accounts ca 
    WHERE ca.id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_customer_for_login(p_email text)
 RETURNS TABLE(id uuid, email text, name text, phone text, address text, country text, bio text, password_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT ca.id, ca.email, ca.name, ca.phone, ca.address, ca.country, ca.bio, ca.password_hash
    FROM public.customer_accounts ca WHERE ca.email = p_email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_customer_orders(p_customer_id uuid)
 RETURNS TABLE(id text, customer_name text, phone text, address text, email text, items jsonb, total numeric, status text, created_at timestamp with time zone, customer_id text, notes text, payment_method text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        o.id::text, 
        o.customer_name::text, 
        o.phone::text, 
        o.address::text,
        o.email::text, 
        o.items::jsonb, 
        o.total::numeric, 
        o.status::text,
        o.created_at::timestamptz, 
        o.customer_id::text,     -- cast the text column explicitly
        o.notes::text, 
        o.payment_method::text
    FROM public.orders o
    WHERE o.customer_id = p_customer_id::text   -- compare as text
    ORDER BY o.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_featured_products()
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::text, p.name::text, p.price::numeric, p.category::text, 
        p.description::text, p.stock::int, p.image::text, p.images::jsonb, 
        p."isHot"::boolean, p."isNew"::boolean, p.brand::text, p.os::text, 
        p.cpu::text, p.specs::text, p.variants::jsonb, p."deliveryEstimate"::text, 
        p.created_at::timestamptz
    FROM public.featured_products fp
    JOIN public.products p ON p.id = fp.product_id
    ORDER BY fp.created_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_hot_products()
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone, view integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        prod.id::text, prod.name::text, prod.price::numeric, prod.category::text,
        prod.description::text, prod.stock::int, prod.image::text, prod.images::jsonb,
        prod."isHot"::boolean, prod."isNew"::boolean, prod.brand::text, prod.os::text,
        prod.cpu::text, prod.specs::text, prod.variants::jsonb, prod."deliveryEstimate"::text,
        prod.created_at::timestamptz, COALESCE(prod.view, 0)::int
    FROM public.products prod
    WHERE prod."isHot" = true
    ORDER BY prod.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_product()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id',    p.id::text,
        'name',  COALESCE(p.name, 'A new product'),
        'image', COALESCE(p.image, '')
    )
    INTO v_result
    FROM public.products p
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_by_id(p_id text)
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.name, p.price, p.category, p.description, p.stock, p.image, 
        p.images, p."isHot", p."isNew", p.brand, p.os, p.cpu, p.specs, 
        p.variants, p."deliveryEstimate", p.created_at
    FROM public.products p
    WHERE p.id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_details_and_increment_views(p_product_id text)
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone, view integer, rating numeric, review_count bigint, deal_discount numeric, is_deal boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- ✅ Increment view count (fully qualified alias)
    UPDATE public.products AS prod
    SET view = COALESCE(prod.view, 0) + 1
    WHERE prod.id = p_product_id;

    -- ✅ Fetch everything in one go, using scalar subqueries for
    --    reviews and deals so we never multiply rows
    RETURN QUERY
    SELECT 
        prod.id::text,
        prod.name::text,
        prod.price::numeric,
        prod.category::text,
        prod.description::text,
        prod.stock::int,
        prod.image::text,
        prod.images::jsonb,
        prod."isHot"::boolean,
        prod."isNew"::boolean,
        prod.brand::text,
        prod.os::text,
        prod.cpu::text,
        prod.specs::text,
        prod.variants::jsonb,
        prod."deliveryEstimate"::text,
        prod.created_at::timestamptz,
        COALESCE(prod.view, 0)::int,

        -- ⭐ Compute rating from reviews table
        COALESCE((
            SELECT AVG(r.rating)::numeric
            FROM public.reviews r
            WHERE r.product_id = prod.id
        ), 0)::numeric AS rating,

        -- ⭐ Count reviews
        COALESCE((
            SELECT COUNT(*)::bigint
            FROM public.reviews r
            WHERE r.product_id = prod.id
        ), 0)::bigint AS review_count,

        -- 💸 Deal discount (take the highest if multiple exist)
        COALESCE((
            SELECT MAX(d.discount)::numeric
            FROM public.deals d
            WHERE d.product_id = prod.id
        ), 0)::numeric AS deal_discount,

        -- 💸 Is there any active deal?
        EXISTS (
            SELECT 1 FROM public.deals d
            WHERE d.product_id = prod.id AND d.discount > 0
        ) AS is_deal

    FROM public.products prod
    WHERE prod.id = p_product_id
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_by_category(p_category text)
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ BEGIN RETURN QUERY SELECT p.id::text, p.name::text, p.price::numeric, p.category::text, p.description::text, p.stock::int, p.image::text, p.images::jsonb, p."isHot"::boolean, p."isNew"::boolean, p.brand::text, p.os::text, p.cpu::text, p.specs::text, p.variants::jsonb, p."deliveryEstimate"::text, p.created_at::timestamptz FROM public.products p WHERE LOWER(p.category) = LOWER(p_category) ORDER BY p.created_at DESC; END; $function$
;

CREATE OR REPLACE FUNCTION public.get_related_products(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 16)
 RETURNS TABLE(id text, name text, price numeric, category text, image text, brand text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_category text := LOWER(TRIM(COALESCE(p_category, 'all')));
    v_same_count int := GREATEST(p_limit / 2, 4);
BEGIN
    -- 1. Same category, random
    RETURN QUERY
    SELECT 
        prod.id::text, prod.name::text, prod.price::numeric,
        prod.category::text, prod.image::text, prod.brand::text
    FROM public.products prod
    WHERE v_category <> 'all'
      AND v_category <> ''
      AND LOWER(TRIM(COALESCE(prod.category, ''))) = v_category
    ORDER BY random()
    LIMIT v_same_count;

    -- 2. Fill remainder with other categories, random
    RETURN QUERY
    SELECT 
        prod.id::text, prod.name::text, prod.price::numeric,
        prod.category::text, prod.image::text, prod.brand::text
    FROM public.products prod
    WHERE v_category = 'all'
       OR v_category = ''
       OR LOWER(TRIM(COALESCE(prod.category, ''))) <> v_category
    ORDER BY random()
    LIMIT GREATEST(p_limit, 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_showcase_config()
 RETURNS TABLE(id integer, filter_type text, filter_value text, title text, subtitle text, badge text, countdown_hours integer, max_products integer, cta_text text, cta_secondary_text text, view_all_link text, show_hero boolean, hero_images jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.filter_type::text,
        c.filter_value::text,
        c.title::text,
        c.subtitle::text,
        c.badge::text,
        c.countdown_hours::int,
        c.max_products::int,
        c.cta_text::text,
        c.cta_secondary_text::text,
        c.view_all_link::text,
        c.show_hero::boolean,
        c.hero_images::jsonb,
        c.created_at::timestamptz,
        c.updated_at::timestamptz
    FROM public.category_showcase_config c
    WHERE c.id = 1
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_cart(p_customer_id text, p_session_id text)
 RETURNS TABLE(id bigint, customer_id text, product_id text, name text, price numeric, qty integer, image text, created_at timestamp with time zone, variants jsonb, is_deal boolean, original_price numeric, discount numeric, session_id text, brand text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id::bigint,
        COALESCE(c.customer_id::text, ''),
        c.product_id::text,
        c.name::text,
        c.price::numeric,
        c.qty::int,
        c.image::text,
        c.created_at::timestamptz,
        c.variants::jsonb,
        c.is_deal::boolean,
        c.original_price::numeric,
        c.discount::numeric,
        COALESCE(c.session_id::text, ''),
        c.brand::text
    FROM public.cart c
    WHERE (p_customer_id IS NOT NULL AND p_customer_id != '' AND c.customer_id::text = p_customer_id)
       OR (p_session_id IS NOT NULL AND p_session_id != '' AND c.session_id::text = p_session_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_wishlist(p_customer_id text, p_session_id text)
 RETURNS TABLE(product_id text, name text, price numeric, image text, brand text, category text, "isHot" boolean, "isNew" boolean, "isDeal" boolean, discount numeric, "originalPrice" numeric, rating numeric, "reviewCount" bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::text AS product_id,
        p.name::text,
        p.price::numeric,
        p.image::text,
        p.brand::text,
        p.category::text,
        p."isHot"::boolean,
        p."isNew"::boolean,
        (COALESCE(d.discount, 0) > 0)::boolean AS "isDeal",
        COALESCE(d.discount, 0)::numeric      AS discount,
        p.price::numeric                      AS "originalPrice",
        COALESCE((
            SELECT AVG(r.rating)::numeric
            FROM public.reviews r
            WHERE r.product_id = p.id
        ), 0)::numeric AS rating,
        COALESCE((
            SELECT COUNT(*)::bigint
            FROM public.reviews r
            WHERE r.product_id = p.id
        ), 0)::bigint AS "reviewCount"
    FROM public.wishlist w
    JOIN public.products p ON p.id = w.product_id
    LEFT JOIN public.deals d ON d.product_id = p.id
    WHERE 
        (p_customer_id IS NOT NULL AND p_customer_id != '' 
            AND w.customer_id::text = p_customer_id)
        OR 
        (p_session_id IS NOT NULL AND p_session_id != '' 
            AND w.session_id::text = p_session_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
          AND is_active = true
    );
$function$
;

CREATE OR REPLACE FUNCTION public.login_customer(p_email text, p_password text)
 RETURNS TABLE(id uuid, email text, name text, phone text, address text, country text, bio text, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_customer RECORD;
    v_valid boolean;
BEGIN
    SELECT c.id, c.email, c.name, c.phone, c.address, c.country, c.bio, c.password_hash
    INTO v_customer
    FROM public.customer_accounts c
    WHERE LOWER(c.email) = LOWER(p_email) LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text,
                            NULL::text, NULL::text, NULL::text,
                            FALSE, 'Invalid email or password'::text;
        RETURN;
    END IF;

    v_valid := (v_customer.password_hash = crypt(p_password, v_customer.password_hash));

    IF NOT v_valid THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text,
                            NULL::text, NULL::text, NULL::text,
                            FALSE, 'Invalid email or password'::text;
        RETURN;
    END IF;

    UPDATE public.customer_accounts SET last_login = NOW(), updated_at = NOW() WHERE id = v_customer.id;

    RETURN QUERY SELECT v_customer.id, v_customer.email, v_customer.name, v_customer.phone,
                        v_customer.address, v_customer.country, v_customer.bio,
                        TRUE, 'Login successful'::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_from_wishlist(p_customer_id text, p_session_id text, p_product_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.wishlist
    WHERE product_id = p_product_id
      AND (
          (p_customer_id IS NOT NULL AND customer_id = p_customer_id)
          OR 
          (p_session_id IS NOT NULL AND session_id = p_session_id)
      );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_products_paginated(p_query text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, name text, price numeric, category text, description text, stock integer, image text, images jsonb, "isHot" boolean, "isNew" boolean, brand text, os text, cpu text, specs text, variants jsonb, "deliveryEstimate" text, created_at timestamp with time zone, view integer, rating numeric, review_count bigint, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_q     text := LOWER(TRIM(COALESCE(p_query, '')));
    v_terms text[];
BEGIN
    -- Split query into words ("baseus premium juicer v744" → 4 tokens)
    v_terms := regexp_split_to_array(v_q, '\s+');
    IF v_q = '' THEN v_terms := ARRAY[]::text[]; END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            prod.id::text            AS id,
            prod.name::text          AS name,
            prod.price::numeric      AS price,
            prod.category::text      AS category,
            prod.description::text   AS description,
            prod.stock::int          AS stock,
            prod.image::text         AS image,
            prod.images::jsonb       AS images,
            prod."isHot"::boolean    AS "isHot",
            prod."isNew"::boolean    AS "isNew",
            prod.brand::text         AS brand,
            prod.os::text            AS os,
            prod.cpu::text           AS cpu,
            prod.specs::text         AS specs,
            prod.variants::jsonb     AS variants,
            prod."deliveryEstimate"::text AS "deliveryEstimate",
            prod.created_at::timestamptz  AS created_at,
            COALESCE(prod.view, 0)::int   AS view,
            COALESCE((SELECT AVG(r.rating)::numeric FROM public.reviews r WHERE r.product_id = prod.id), 0)::numeric AS rating,
            COALESCE((SELECT COUNT(*)::bigint FROM public.reviews r WHERE r.product_id = prod.id), 0)::bigint AS review_count
        FROM public.products prod
        WHERE
            -- Empty query → return everything
            cardinality(v_terms) = 0
            OR (
                -- Every token must match at least one of: name/brand/category/description
                SELECT bool_and(
                    LOWER(COALESCE(prod.name,''))        LIKE '%' || term || '%'
                 OR LOWER(COALESCE(prod.brand,''))       LIKE '%' || term || '%'
                 OR LOWER(COALESCE(prod.category,''))    LIKE '%' || term || '%'
                 OR LOWER(COALESCE(prod.description,'')) LIKE '%' || term || '%'
                )
                FROM unnest(v_terms) AS term
            )
    )
    SELECT
        f.id, f.name, f.price, f.category, f.description, f.stock,
        f.image, f.images, f."isHot", f."isNew", f.brand, f.os, f.cpu,
        f.specs, f.variants, f."deliveryEstimate", f.created_at, f.view,
        f.rating, f.review_count,
        COUNT(*) OVER ()::bigint AS total_count
    FROM filtered f
    ORDER BY f.created_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_review(p_id bigint, p_product_id text, p_user_name text, p_rating integer, p_comment text, p_date text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_new_id bigint;
BEGIN
    -- Basic validation
    IF p_product_id IS NULL OR TRIM(p_product_id) = '' THEN
        RAISE EXCEPTION 'product_id is required';
    END IF;
    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'rating must be between 1 and 5';
    END IF;
    IF p_comment IS NULL OR TRIM(p_comment) = '' THEN
        RAISE EXCEPTION 'comment is required';
    END IF;

    v_new_id := COALESCE(p_id, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint);

    INSERT INTO public.reviews (
        id, product_id, user_name, rating, comment, date, created_at
    ) VALUES (
        v_new_id,
        p_product_id,
        COALESCE(NULLIF(TRIM(p_user_name), ''), 'Anonymous'),
        p_rating,
        TRIM(p_comment),
        COALESCE(p_date, to_char(NOW(), 'MM/DD/YYYY')),
        NOW()
    );

    RETURN json_build_object(
        'success', true,
        'id', v_new_id
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_cart(p_customer_id text, p_session_id text, p_cart_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Delete existing cart for this user/session
    DELETE FROM public.cart
    WHERE (p_customer_id IS NOT NULL AND p_customer_id != '' AND customer_id::text = p_customer_id)
       OR (p_session_id IS NOT NULL AND p_session_id != '' AND session_id::text = p_session_id);
       
    -- Insert new items if the array is not empty
    IF p_cart_items IS NOT NULL AND jsonb_array_length(p_cart_items) > 0 THEN
        INSERT INTO public.cart (
            customer_id, session_id, product_id, name, price, qty, image, 
            variants, is_deal, original_price, discount, brand
        )
        SELECT 
            CASE WHEN p_customer_id IS NOT NULL AND p_customer_id != '' THEN p_customer_id ELSE NULL END,
            CASE WHEN p_session_id IS NOT NULL AND p_session_id != '' THEN p_session_id ELSE NULL END,
            item->>'product_id',
            item->>'name',
            (item->>'price')::numeric,
            (item->>'qty')::int,
            item->>'image',
            (item->>'variants')::jsonb,
            (item->>'is_deal')::boolean,
            (item->>'original_price')::numeric,
            (item->>'discount')::numeric,
            item->>'brand'
        FROM jsonb_array_elements(p_cart_items) AS item;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_customer_last_login(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.customer_accounts SET last_login = NOW() WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_customer_profile(p_id uuid, p_name text, p_phone text, p_address text, p_bio text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.customer_accounts
    SET name = p_name, phone = p_phone, address = p_address, bio = p_bio, updated_at = NOW()
    WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_customer_password(p_email text, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_stored_hash text;
BEGIN
    SELECT password_hash INTO v_stored_hash
    FROM public.customer_accounts WHERE email = p_email;
    IF v_stored_hash IS NULL THEN RETURN false; END IF;
    RETURN v_stored_hash = crypt(p_password, v_stored_hash);
END;
$function$
;

grant delete on table "public"."admin_users" to "service_role";

grant insert on table "public"."admin_users" to "service_role";

grant references on table "public"."admin_users" to "service_role";

grant select on table "public"."admin_users" to "service_role";

grant trigger on table "public"."admin_users" to "service_role";

grant truncate on table "public"."admin_users" to "service_role";

grant update on table "public"."admin_users" to "service_role";

grant delete on table "public"."business_info" to "service_role";

grant insert on table "public"."business_info" to "service_role";

grant references on table "public"."business_info" to "service_role";

grant select on table "public"."business_info" to "service_role";

grant trigger on table "public"."business_info" to "service_role";

grant truncate on table "public"."business_info" to "service_role";

grant update on table "public"."business_info" to "service_role";

grant delete on table "public"."cart" to "anon";

grant insert on table "public"."cart" to "anon";

grant references on table "public"."cart" to "anon";

grant select on table "public"."cart" to "anon";

grant trigger on table "public"."cart" to "anon";

grant truncate on table "public"."cart" to "anon";

grant update on table "public"."cart" to "anon";

grant delete on table "public"."cart" to "authenticated";

grant insert on table "public"."cart" to "authenticated";

grant references on table "public"."cart" to "authenticated";

grant select on table "public"."cart" to "authenticated";

grant trigger on table "public"."cart" to "authenticated";

grant truncate on table "public"."cart" to "authenticated";

grant update on table "public"."cart" to "authenticated";

grant delete on table "public"."cart" to "service_role";

grant insert on table "public"."cart" to "service_role";

grant references on table "public"."cart" to "service_role";

grant select on table "public"."cart" to "service_role";

grant trigger on table "public"."cart" to "service_role";

grant truncate on table "public"."cart" to "service_role";

grant update on table "public"."cart" to "service_role";

grant delete on table "public"."category_showcase_config" to "service_role";

grant insert on table "public"."category_showcase_config" to "service_role";

grant references on table "public"."category_showcase_config" to "service_role";

grant select on table "public"."category_showcase_config" to "service_role";

grant trigger on table "public"."category_showcase_config" to "service_role";

grant truncate on table "public"."category_showcase_config" to "service_role";

grant update on table "public"."category_showcase_config" to "service_role";

grant delete on table "public"."contact_info" to "service_role";

grant insert on table "public"."contact_info" to "service_role";

grant references on table "public"."contact_info" to "service_role";

grant select on table "public"."contact_info" to "service_role";

grant trigger on table "public"."contact_info" to "service_role";

grant truncate on table "public"."contact_info" to "service_role";

grant update on table "public"."contact_info" to "service_role";

grant delete on table "public"."customer_accounts" to "service_role";

grant insert on table "public"."customer_accounts" to "service_role";

grant references on table "public"."customer_accounts" to "service_role";

grant select on table "public"."customer_accounts" to "service_role";

grant trigger on table "public"."customer_accounts" to "service_role";

grant truncate on table "public"."customer_accounts" to "service_role";

grant update on table "public"."customer_accounts" to "service_role";

grant delete on table "public"."deals" to "service_role";

grant insert on table "public"."deals" to "service_role";

grant references on table "public"."deals" to "service_role";

grant select on table "public"."deals" to "service_role";

grant trigger on table "public"."deals" to "service_role";

grant truncate on table "public"."deals" to "service_role";

grant update on table "public"."deals" to "service_role";

grant delete on table "public"."failed_searches" to "anon";

grant insert on table "public"."failed_searches" to "anon";

grant references on table "public"."failed_searches" to "anon";

grant select on table "public"."failed_searches" to "anon";

grant trigger on table "public"."failed_searches" to "anon";

grant truncate on table "public"."failed_searches" to "anon";

grant update on table "public"."failed_searches" to "anon";

grant delete on table "public"."failed_searches" to "authenticated";

grant insert on table "public"."failed_searches" to "authenticated";

grant references on table "public"."failed_searches" to "authenticated";

grant select on table "public"."failed_searches" to "authenticated";

grant trigger on table "public"."failed_searches" to "authenticated";

grant truncate on table "public"."failed_searches" to "authenticated";

grant update on table "public"."failed_searches" to "authenticated";

grant delete on table "public"."failed_searches" to "service_role";

grant insert on table "public"."failed_searches" to "service_role";

grant references on table "public"."failed_searches" to "service_role";

grant select on table "public"."failed_searches" to "service_role";

grant trigger on table "public"."failed_searches" to "service_role";

grant truncate on table "public"."failed_searches" to "service_role";

grant update on table "public"."failed_searches" to "service_role";

grant delete on table "public"."featured_products" to "service_role";

grant insert on table "public"."featured_products" to "service_role";

grant references on table "public"."featured_products" to "service_role";

grant select on table "public"."featured_products" to "service_role";

grant trigger on table "public"."featured_products" to "service_role";

grant truncate on table "public"."featured_products" to "service_role";

grant update on table "public"."featured_products" to "service_role";

grant delete on table "public"."j0" to "anon";

grant insert on table "public"."j0" to "anon";

grant references on table "public"."j0" to "anon";

grant select on table "public"."j0" to "anon";

grant trigger on table "public"."j0" to "anon";

grant truncate on table "public"."j0" to "anon";

grant update on table "public"."j0" to "anon";

grant delete on table "public"."j0" to "authenticated";

grant insert on table "public"."j0" to "authenticated";

grant references on table "public"."j0" to "authenticated";

grant select on table "public"."j0" to "authenticated";

grant trigger on table "public"."j0" to "authenticated";

grant truncate on table "public"."j0" to "authenticated";

grant update on table "public"."j0" to "authenticated";

grant delete on table "public"."j0" to "service_role";

grant insert on table "public"."j0" to "service_role";

grant references on table "public"."j0" to "service_role";

grant select on table "public"."j0" to "service_role";

grant trigger on table "public"."j0" to "service_role";

grant truncate on table "public"."j0" to "service_role";

grant update on table "public"."j0" to "service_role";

grant delete on table "public"."jb" to "anon";

grant insert on table "public"."jb" to "anon";

grant references on table "public"."jb" to "anon";

grant select on table "public"."jb" to "anon";

grant trigger on table "public"."jb" to "anon";

grant truncate on table "public"."jb" to "anon";

grant update on table "public"."jb" to "anon";

grant delete on table "public"."jb" to "authenticated";

grant insert on table "public"."jb" to "authenticated";

grant references on table "public"."jb" to "authenticated";

grant select on table "public"."jb" to "authenticated";

grant trigger on table "public"."jb" to "authenticated";

grant truncate on table "public"."jb" to "authenticated";

grant update on table "public"."jb" to "authenticated";

grant delete on table "public"."jb" to "service_role";

grant insert on table "public"."jb" to "service_role";

grant references on table "public"."jb" to "service_role";

grant select on table "public"."jb" to "service_role";

grant trigger on table "public"."jb" to "service_role";

grant truncate on table "public"."jb" to "service_role";

grant update on table "public"."jb" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."push_notifications" to "anon";

grant insert on table "public"."push_notifications" to "anon";

grant references on table "public"."push_notifications" to "anon";

grant select on table "public"."push_notifications" to "anon";

grant trigger on table "public"."push_notifications" to "anon";

grant truncate on table "public"."push_notifications" to "anon";

grant update on table "public"."push_notifications" to "anon";

grant delete on table "public"."push_notifications" to "authenticated";

grant insert on table "public"."push_notifications" to "authenticated";

grant references on table "public"."push_notifications" to "authenticated";

grant select on table "public"."push_notifications" to "authenticated";

grant trigger on table "public"."push_notifications" to "authenticated";

grant truncate on table "public"."push_notifications" to "authenticated";

grant update on table "public"."push_notifications" to "authenticated";

grant delete on table "public"."push_notifications" to "service_role";

grant insert on table "public"."push_notifications" to "service_role";

grant references on table "public"."push_notifications" to "service_role";

grant select on table "public"."push_notifications" to "service_role";

grant trigger on table "public"."push_notifications" to "service_role";

grant truncate on table "public"."push_notifications" to "service_role";

grant update on table "public"."push_notifications" to "service_role";

grant delete on table "public"."push_subscriptions" to "anon";

grant insert on table "public"."push_subscriptions" to "anon";

grant references on table "public"."push_subscriptions" to "anon";

grant select on table "public"."push_subscriptions" to "anon";

grant trigger on table "public"."push_subscriptions" to "anon";

grant truncate on table "public"."push_subscriptions" to "anon";

grant update on table "public"."push_subscriptions" to "anon";

grant delete on table "public"."push_subscriptions" to "authenticated";

grant insert on table "public"."push_subscriptions" to "authenticated";

grant references on table "public"."push_subscriptions" to "authenticated";

grant select on table "public"."push_subscriptions" to "authenticated";

grant trigger on table "public"."push_subscriptions" to "authenticated";

grant truncate on table "public"."push_subscriptions" to "authenticated";

grant update on table "public"."push_subscriptions" to "authenticated";

grant delete on table "public"."push_subscriptions" to "service_role";

grant insert on table "public"."push_subscriptions" to "service_role";

grant references on table "public"."push_subscriptions" to "service_role";

grant select on table "public"."push_subscriptions" to "service_role";

grant trigger on table "public"."push_subscriptions" to "service_role";

grant truncate on table "public"."push_subscriptions" to "service_role";

grant update on table "public"."push_subscriptions" to "service_role";

grant delete on table "public"."reviews" to "service_role";

grant insert on table "public"."reviews" to "service_role";

grant references on table "public"."reviews" to "service_role";

grant select on table "public"."reviews" to "service_role";

grant trigger on table "public"."reviews" to "service_role";

grant truncate on table "public"."reviews" to "service_role";

grant update on table "public"."reviews" to "service_role";

grant delete on table "public"."search_analytics" to "anon";

grant insert on table "public"."search_analytics" to "anon";

grant references on table "public"."search_analytics" to "anon";

grant select on table "public"."search_analytics" to "anon";

grant trigger on table "public"."search_analytics" to "anon";

grant truncate on table "public"."search_analytics" to "anon";

grant update on table "public"."search_analytics" to "anon";

grant delete on table "public"."search_analytics" to "authenticated";

grant insert on table "public"."search_analytics" to "authenticated";

grant references on table "public"."search_analytics" to "authenticated";

grant select on table "public"."search_analytics" to "authenticated";

grant trigger on table "public"."search_analytics" to "authenticated";

grant truncate on table "public"."search_analytics" to "authenticated";

grant update on table "public"."search_analytics" to "authenticated";

grant delete on table "public"."search_analytics" to "service_role";

grant insert on table "public"."search_analytics" to "service_role";

grant references on table "public"."search_analytics" to "service_role";

grant select on table "public"."search_analytics" to "service_role";

grant trigger on table "public"."search_analytics" to "service_role";

grant truncate on table "public"."search_analytics" to "service_role";

grant update on table "public"."search_analytics" to "service_role";

grant delete on table "public"."view_analytics" to "anon";

grant insert on table "public"."view_analytics" to "anon";

grant references on table "public"."view_analytics" to "anon";

grant select on table "public"."view_analytics" to "anon";

grant trigger on table "public"."view_analytics" to "anon";

grant truncate on table "public"."view_analytics" to "anon";

grant update on table "public"."view_analytics" to "anon";

grant delete on table "public"."view_analytics" to "authenticated";

grant insert on table "public"."view_analytics" to "authenticated";

grant references on table "public"."view_analytics" to "authenticated";

grant select on table "public"."view_analytics" to "authenticated";

grant trigger on table "public"."view_analytics" to "authenticated";

grant truncate on table "public"."view_analytics" to "authenticated";

grant update on table "public"."view_analytics" to "authenticated";

grant delete on table "public"."view_analytics" to "service_role";

grant insert on table "public"."view_analytics" to "service_role";

grant references on table "public"."view_analytics" to "service_role";

grant select on table "public"."view_analytics" to "service_role";

grant trigger on table "public"."view_analytics" to "service_role";

grant truncate on table "public"."view_analytics" to "service_role";

grant update on table "public"."view_analytics" to "service_role";

grant delete on table "public"."wishlist" to "service_role";

grant insert on table "public"."wishlist" to "service_role";

grant references on table "public"."wishlist" to "service_role";

grant select on table "public"."wishlist" to "service_role";

grant trigger on table "public"."wishlist" to "service_role";

grant truncate on table "public"."wishlist" to "service_role";

grant update on table "public"."wishlist" to "service_role";


  create policy "Admin reads own row"
  on "public"."admin_users"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "Allow all on business_info"
  on "public"."business_info"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on cart"
  on "public"."cart"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow admin write access"
  on "public"."category_showcase_config"
  as permissive
  for all
  to public
using (true);



  create policy "Allow public read access"
  on "public"."category_showcase_config"
  as permissive
  for select
  to public
using (true);



  create policy "Allow all on contact_info"
  on "public"."contact_info"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can update own data"
  on "public"."customer_accounts"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id));



  create policy "Users can view own data"
  on "public"."customer_accounts"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "Allow all on deals"
  on "public"."deals"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on failed_searches"
  on "public"."failed_searches"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on featured_products"
  on "public"."featured_products"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Service role can delete notifications"
  on "public"."notifications"
  as permissive
  for delete
  to public
using (true);



  create policy "Service role can insert notifications"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can read own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using (((auth.uid())::text = user_id));



  create policy "Users can update own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using (((auth.uid())::text = user_id));



  create policy "Allow all on orders"
  on "public"."orders"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on products"
  on "public"."products"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow anon to delete push subscriptions"
  on "public"."push_subscriptions"
  as permissive
  for delete
  to anon
using (true);



  create policy "Allow anon to insert push subscriptions"
  on "public"."push_subscriptions"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Allow anon to read push subscriptions"
  on "public"."push_subscriptions"
  as permissive
  for select
  to anon
using (true);



  create policy "Allow anon to update push subscriptions"
  on "public"."push_subscriptions"
  as permissive
  for update
  to anon
using (true)
with check (true);



  create policy "Allow all on reviews"
  on "public"."reviews"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on search_analytics"
  on "public"."search_analytics"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on view_analytics"
  on "public"."view_analytics"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all on wishlist"
  on "public"."wishlist"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER trigger_order_status_notification AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.create_order_status_notification();


  create policy "Allow delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'product-images'::text));



  create policy "Allow upload"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'product-images'::text));



  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'product-images'::text));



