# Enable Neatly private bookings

1. Run `neatly-bookings.sql` in the existing Supabase project's SQL Editor before deploying these pages. It keeps older requests without owners private and preserves the older anonymous intake for unclaimed requests.
2. In Authentication → URL Configuration, set the Site URL to the Neatly production origin. Add the production and exact preview redirect URLs used for testing, including the homepage and `/bookings.html`. Enable email sign-in and verify delivery of the link.
3. For each approved specialist, set the public directory entry's `id` to the matching UUID from Supabase `cleaners`. Set `approved` to true on both the public directory entry and the matching database cleaner. To stop online requests for a specialist, set the database cleaner’s `approved` field to false and remove the public directory entry. Use Supabase Table Editor to assign a specialist to a connection request and to update its status.
4. Test with two accounts. Create a specialist-specific request and a Neatly connection request. Verify account B cannot read account A's requests. Assign and confirm a specialist, then confirm Book again preselects that same UUID. Verify an unlisted specialist cannot receive a new request.
5. Enable the updated site after successful testing. The public application form retains its email workflow. The booking form writes to Supabase, so Neatly should monitor the booking table. Requests created before the update are not assigned to accounts automatically.

## Foundation verification

Use the root website and root setup SQL for Neatly. The nested `sparkl-mvp/sparkl` directory is an older Hamilton prototype. Its schema and demo data are separate from the Jamaica deployment.

For an existing database, reapply the root booking SQL to install the restrictive ownership rule. Run `neatly-booking-access-audit.sql` in Supabase SQL Editor to inspect permissions without selecting customer records. Confirm row-level security is enabled, the restrictive SELECT policy covers both `anon` and `authenticated`, and anonymous SELECT access is absent. The signed-in SELECT grant should cover only booking history fields. Then complete the two-account test above before accepting customer bookings.
