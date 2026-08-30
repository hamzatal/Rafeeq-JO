# `parking/` — code that was removed, kept readable

This directory is **outside every build**. Nothing in `backend/`, `frontend/` or
`composer.json`/`package.json` references it: `backend/bootstrap/providers.php` does not
register these service providers, the migrations here are not in a scanned path, and the
two `.tsx` files are not inside any Expo app.

It exists because the phase 4 decision in [`docs/design/SCREENS.md`](../docs/design/SCREENS.md)
deleted two products, and deleting a product is not the same as pretending it was never
designed.

| what | why it was removed |
|---|---|
| `Exchange/` · `exchange.client.ts` · `exchange.screen.tsx` | Buying and selling between students — a marketplace inside a transport app. Different product, different moderation and liability surface. |
| `Parcels/` · `parcels.client.ts` · `parcels.screen.tsx` | Item delivery. Carries a **legal obligation** (chain of custody + a double OTP) and shipped with zero test coverage. |

## Why it is parked rather than deleted

Both were built, and both would be rebuilt from the same requirements if the company
ever chose to. What is preserved here is the SHAPE of that work — the tables, the state
machines, the OTP handshake on `Parcel` — so a future decision starts from what was
learned rather than from a blank file.

## The rule for anything in here

**It is not maintained.** No gate runs over it, no test covers it, `pint` and `phpstan`
do not read it, and the dependencies it names may no longer exist. Treat every file as a
DESIGN DOCUMENT written in PHP and TypeScript.

Reviving one means: re-reading it against the current `Modules/` conventions (this code
predates `Core\Services\BaseService::transaction`, the money `CHECK` constraints and the
`permission:` middleware), writing the tests it never had, and getting the legal question
answered before the first line ships — for `Parcels`, that question is who is liable for
a lost item.

If a revival is decided against for good, delete the directory. A parked product with no
owner and no date eventually reads as a promise.
