# Test Neatly’s booking flow

1. Apply the root booking privacy and booking record migrations, then run `neatly-booking-flow.sql` in Supabase SQL Editor. Test on the pull request preview before merging.
2. Allow the preview and production sign-in redirects for the homepage, `bookings.html` and `specialist.html`. Both account types use the existing email sign-in.
3. In Supabase, add the test specialist's Auth user UUID and approved cleaner UUID to `neatly_specialist_accounts`. Use the same cleaner UUID in the public directory. Add a rate in `neatly_service_rates` with a service label that exactly matches the request form. For the sample, use JMD, hourly_minor = 250000 and fee_bps = 1200. Three hours should quote J$7,500 + J$900 = J$8,400. These values are test data.
4. Submit a customer request. Verify that another customer cannot see it and an unrelated specialist cannot see or respond to it. For an assisted request, staff set the approved cleaner ID, currency, and all four quote amounts together in Supabase before the assigned specialist can see it.
5. Accept in the specialist dashboard and verify the address remains hidden. Add the booking ID and the provider's HTTPS test payment link to `neatly_booking_payment_links`. Check that it is available only to the booking customer after acceptance.
6. After verifying the exact amount and currency externally, staff can run `select public.neatly_staff_record_payment('<booking UUID>', '<provider reference>');`. This confirms the booking and releases the address to the assigned specialist.
7. On or after the requested date, confirm completion as the customer and verify Book again. On a separate paid test booking, report a problem and verify payout moves to on hold. After a manual payout for an eligible booking, staff record it using `select public.neatly_staff_record_payout('<booking UUID>', '<payout reference>');`.

The staff commands record external actions. They do not charge a customer or send a payout. Disputes stay with staff. Legacy bookings may lack quotes and payment records.
