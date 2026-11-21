# Team notes — The Champions Club

Live site: https://the-champions-club.vercel.app (auto-deploys from `main`)
Stack: Next.js + TypeScript + PostgreSQL (Prisma). No Odoo in the live code.

## Auth is done — please don't add another one

Sign-in is server-side and finished: email + password for staff, Google
sign-in for staff accounts, one-tap demo login on the sign-in page.
Members never log in; they book by name. Till PIN sign-in was removed.

Four parallel auth pushes (role gate, two duplicate auths, Better Auth OTP)
have been merged and removed so far — two of them committed git conflict
markers and broke `main`. If you think auth needs a change, ask first.

## Working rules

- Pull `main` before you start, every time.
- Small commits, short messages ("add court booking").
- Run `git status` before pushing — never commit `<<<<<<<` markers.
- Notion "Work done" + "Code map" pages track who did what; keep them current.

## Open lanes — pick one and say which

- CRM enquiries: a staff view for trial/website enquiries with follow-up status.
- Waitlist: let people join a waitlist when a slot is full.
- Razorpay test mode: online payment for memberships and shop orders (test keys only).

Everything else (courts, bookings, shop, bar tabs, members, dashboard)
is built and working.
