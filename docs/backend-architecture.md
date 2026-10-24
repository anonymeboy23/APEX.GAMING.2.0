# Apex Gaming backend architecture

The site uses Supabase as the single source of truth for customer accounts, favorites, orders, reviews, catalog availability, inventory, promotions, and store settings. Cloudflare Pages hosts the static frontend; it does not require D1 for these workflows.

The browser uses only the public Supabase key in `supabase-config.js`. Never put a Supabase `service_role` key in the frontend. Supabase RLS and `SECURITY DEFINER` RPCs enforce administrator access.

## Supabase setup

1. Run the current `supabase.sql` from Supabase > SQL Editor. It is designed to be rerunnable and adds central settings, secure admin RPCs, guest/account order creation, and policies.
2. In Authentication > URL Configuration, set the Cloudflare Pages URL as the Site URL and add it to Redirect URLs.
3. Create and confirm an account, then grant the first admin role from SQL Editor using the documented statement at the end of `supabase.sql`.
4. From the admin dashboard, promote additional accounts by email. The account must already exist.
5. Test guest and signed-in ordering, order status updates, inventory and product visibility, payment settings, promotions, and review moderation.

## Data flows

- Every order is written to Supabase before the WhatsApp link is opened. The order RPC validates product availability and reserves stock atomically; a failed save prevents opening the order message.
- Admin settings and product inventory are saved transactionally to Supabase and loaded by the public store on every visit.
- Guest order lookup uses the order reference and phone number. Customer accounts see only their own orders; administrators can manage all orders.
- Reviews are stored centrally and require administrator approval before appearing publicly.

Cloudflare D1 functions remain only for older deployments; the storefront/admin workflow described above uses Supabase.
