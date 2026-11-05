# Manual access and booking test

Use the current preview or production origin consistently. Use fabricated names, addresses and files. Run the read-only audit first and compare its policies and grants with ACCESS-REVIEW.md. Do not run the proposed hardening SQL until it has been reviewed and approved.

## Setup performed by the owner

- Use four separate browser profiles or containers, so sessions do not overwrite one another. Two private windows in the same browser may share a session.
- Sign in customer C1, customer C2, specialist S1 and specialist S2 with four different test email addresses.
- Staff approve two dummy cleaners and map S1/S2 to their respective cleaner UUIDs in neatly_specialist_accounts.
- Publish those UUIDs in cleaners.json, then deploy. Configure each specialist's Standard cleaning rate in neatly_service_rates. For test data use JMD, hourly_minor 250000, fee_bps 1200. Three hours should quote J$7,500 + J$900 = J$8,400.
- Use a date of today in Jamaica for the completion test, and set allowed sign-in redirects for the exact origins/paths used.
- Keep a staff-only list of test booking IDs, owner IDs and assigned specialist IDs. Never use a service-role key in a customer or specialist browser.

## 1. Anonymous visitor

Open the site in a fifth signed-out browser. Public service pages and approved directory profiles should be visible. My Bookings, specialist requests, exact addresses, account mappings and payment links should not be visible.

Attempt the same read requests observed in the browser Network panel with only the public anon authorization. Bookings and private tables should return denial or no data. Anonymous dashboard RPCs should be denied. The current application table requires inspection; do not interpret an empty result alone as proof of privacy.

The current root SQL allows anonymous unclaimed booking insertion. After approved hardening, that insert must be denied. Do not run a real anonymous insert without an explicitly disposable test fixture.

## 2. Customer ownership

C1 requests S1 for three hours and C2 requests S2. Use distinct fake street addresses and distinct note markers such as C1-NOTE-PRIVATE and C2-NOTE-PRIVATE. Each request should appear only in its customer's My Bookings.

Refresh and sign out/in. History must remain private. Copying C1's booking ID into a request made with C2's session must not return C1's booking or change it.

Using DevTools Network replay with C2's own session, call neatly_client_action with C1's booking ID. It must fail. Replay C1's own history request as C2; the function must return only C2's rows, even if a forged client identifier is added.

Attempt a direct PATCH to booking_requests for a disposable booking with payment_status paid or a changed total. Customer browser credentials must not change it. Staff verify values remain unchanged.

## 3. Specialist ownership and quote

S1 should see only requests assigned to S1; S2 should see only requests assigned to S2. Both should see service/date/time/coarse area/property and payout, with no full address or notes before payment.

In S2's browser, replay neatly_specialist_respond with C1/S1's booking ID. It must fail and leave the booking unchanged. An ordinary unmapped customer visiting specialist.html must see no assigned jobs.

S1 accepts C1's request. C1 should see accepted and unpaid; the booking should still be awaiting payment. A repeated accept or decline on that same request must fail without reversing the first response. Use a separate request to test Decline; the customer should see declined and a way to choose another specialist.

## 4. Payment and private address release

Staff add a sandbox/test HTTPS payment link for the accepted C1 booking. C1 should see it; C2 and S2 must not. S1 must still have no full address.

Staff verify the test payment externally, then record it with the existing staff-only function described in NEATLY-BOOKING-FLOW.md. This is a manual test action, not an automatic charge. The booking should become confirmed and paid. S1 should now see C1's fake service address. S2 must not see it.

Customer and specialist browsers must be unable to call the staff payment/payout functions or read the address table directly.

## 5. Free-text boundary

Before payment, place the private marker and fake street address only in Cleaning details. Inspect S1's page AND the JSON response of neatly_specialist_requests. Neither should contain the note marker or street address.

Known gap: on a separate disposable assisted request, put a fake street address in City/town/community. Have staff assign/quote it for S1. That area text is currently returned before payment. Record this as FAIL until controlled locality values or staff review prevent the leak. The same applies to tampered property text. Do not mistake hiding the address field for protecting every free-text field.

## 6. Completion, report and rebooking

After payment and on/after the requested date, C1 confirms the clean. The booking becomes completed. C2 cannot confirm C1's job.

Book again should return to the form with S1 selected, require a new date/time and quote, and save a new booking only after explicit submission.

On a separate paid booking, C1 reports a problem. The payout becomes on_hold; staff payout recording must reject it. Use a separate clean completed booking to record a manually verified test payout. It should become sent, and a repeated payout-record action must fail. No test button should transfer real funds.

The current specialist address RPC returns the address only while status is confirmed. After completion the address disappears from that view. Record whether that behavior meets the intended business workflow.

## 7. Applications and pending document work

The active application prepares an email; it should not create an applications row. Do not expect upload controls because PR #7 is intentionally unmerged.

After any future database application flow, test that one applicant cannot read another applicant's record and cannot read admin notes. Confirm the current applications policy using the audit query before storing sensitive test records.

## Record results

For each test record PASS/FAIL, browser/account, test booking ID, expected result, actual result and timestamp. Use screenshots with test data only. Record failures and stop before launch if ownership, payment-write protection or full-address isolation fails.

This file documents manual checks. They have not been executed by the assistant, and database policies were not changed during this repository task.
