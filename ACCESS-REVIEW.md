# Neatly access review

Checked November 5, 2026. The review used root SQL and JavaScript on main and anonymous, zero-row API queries. No database changes or customer-data reads were performed. Live catalog policies/grants and authenticated cross-account tests remain unverified. Run review/neatly-access-audit.sql to inspect metadata in Supabase.

| Table | Anonymous | Customer | Specialist | Staff through privileged Supabase access |
| --- | --- | --- | --- | --- |
| applications | Zero-row SELECT accepted by live API; row access unknown. Archived schema permits INSERT. | Active application uses email; live table rights unknown. | Same authenticated database role as customers; no application ownership flow. | Intended review and write access; confirm live grants. |
| booking_requests | Live SELECT denied. Root SQL retains unclaimed pending INSERTs for the old path. | Read own allowed history fields. Authenticated RPC creates requests and supports completion/problem reports on own eligible bookings. Ordinary updates/deletes are blocked by root policies. | Same own-customer rights; assigned jobs can be read/responded to through restricted RPCs after account mapping and approval. | Assign, quote, verify payment and record payouts via privileged administration. |
| booking_service_addresses | Live SELECT denied; root SQL revokes browser access. | Address is saved with the request through neatly_request; no direct reads/writes. | Only the assigned approved specialist receives the address through RPC when payment is paid and booking status is confirmed. | Read/write via privileged access. |
| neatly_booking_payment_links | Live SELECT denied. | Own payment URL returned by RPC only after acceptance while unpaid and pending; no direct writes. | No special access. | Create/update links. |
| neatly_service_rates | Live SELECT denied. | Authenticated quote RPC returns a calculated public-facing quote; no direct configuration access. | Same quote access; no rate editing. | Configure rates and fees. |
| neatly_specialist_accounts | Live SELECT denied. | No direct access. | Own mapping is used internally by RPCs; cannot self-assign an approved profile. | Manage user-to-specialist mapping. |

Customer and specialist are business roles. Both use Supabase authenticated sessions. An ordinary login called “staff” has no privileged rights just from its email or name.

## Gaps and proposed changes

1. applications needs live grants and RLS confirmation. HTTP 200 for a query requesting zero rows proves neither exposure nor privacy.
2. Anonymous booking insertion is retained in the root setup but unused by the current signed-in form. The proposal closes that path.
3. Restrictive booking ownership policies and column grants are in the root SQL. Confirm they were applied to the live database.
4. Security-definer RPCs can bypass table RLS. Inspect their actual definitions/grants, including any older functions, with the audit query.
5. There is no staff portal or specialist self-service approval flow. Staff currently use privileged Supabase administration.
6. Denied anonymous queries are verified; two-account isolation, field-level protection and private address release require the manual tests.

review/proposed-access-hardening.sql is a proposal only. It makes application rows staff-only and closes anonymous direct booking insertion. The application stays email-based. A future applicant database flow would need a separately designed ownership policy. Unknown live definer functions need review before this proposal can be considered a complete security fix.

## Free-text address check

neatly_request stores Cleaning details in booking_requests.notes. Neither neatly_specialist_requests nor neatly_booking_progress returns notes. The current root booking grants do not allow browser roles to SELECT notes. Thus notes are not directly sent to specialists, including after payment. No notes were read or modified in this audit.

However, the specialist RPC returns parish/neighbourhood area and property_type before payment. These are client-entered strings, so a caller can place an exact address in them. The browser dropdown does not enforce a server-side property allowlist. The RPC also returns service_type; assisted requests must be checked before quoting.

Recommended follow-up: keep notes private, validate property/service against controlled choices, and use curated locality IDs or staff-reviewed coarse area text for the prepayment view. Rejecting address-looking strings with a regular expression would not establish a reliable privacy boundary. The manual tests explicitly cover this known gap.

## Code and branch work

All ten branches before this task were main, codex/neatly-booking-record, codex/neatly-booking-security-foundation, codex/neatly-four-booking-screens, codex/neatly-jamaica-launch, codex/neatly-private-bookings, codex/neatly-private-specialist-documents, codex/neatly-rebrand, codex/neatly-sign-in-status and codex/sync-neatly-booking-setup. Branch pagination was exhausted.

The only existing open PR was #7, private specialist documents. It remains open and unmerged. PR #11 merged the two corrected delimiters from codex/neatly-booking-record to main. main was read back and the corrected block verified. The legacy sparkl-mvp/README.md was added to main. This review branch adds documentation and SQL for review only.
