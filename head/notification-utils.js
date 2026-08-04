const VAPID_CONFIG = {
    publicKey: 'BI-tM9VQcqAeco67R9VhA9TxByJyFjPgcMcqS_dhfOsve-BcVA5G_0fQIK9uVcECs_sbqnUGWOa1t5kFs-94FRg',  // REPLACE with your VAPID public key
    privateKey: 'Y0tevI6hf8uyKQr1rqOzXjTOGTBKT4Fz_VV9jnYrlOs', // REPLACE with your VAPID private key (KEEP SECRET!)
    email: 'austinlebechi02@gmail.com' // Your contact email
};


supabase secrets set SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUwNzM0OSwiZXhwIjoyMDkyMDgzMzQ5fQ.aouRSPkRdEaAztp_-OC4MpHS7TwNW3QHa377wQgSbNs
supabase secrets set VAPID_PUBLIC_KEY=BI-tM9VQcqAeco67R9VhA9TxByJyFjPgcMcqS_dhfOsve-BcVA5G_0fQIK9uVcECs_sbqnUGWOa1t5kFs-94FRg
supabase secrets set VAPID_EMAIL=austinlebechi02@gmail.com