# Third-party in-app notification services: free tier + React Router SSR fit

**Checked on 2026-11-12.** Pricing pages, docs and npm metadata were read on that date. Pricing changes often, so re-check before committing.

## Question

Which hosted in-app notification services (a) have a usable **free tier** and (b) fit this frontend?

- React 19
- React Router 8 framework mode with SSR (`react-router-serve`, Node)
- Tailwind + Radix/shadcn
- `sonner` for toasts
- Node + SQLite/Drizzle backend

Scope is in-app only: a bell, an inbox/feed, and real-time updates. Email, push and SMS are out of scope.

## How to read this

- Each claim cites its primary source: the vendor pricing page, official docs, or npm registry metadata (`npm view <pkg> peerDependencies`, run on 2026-11-12).
- **UNVERIFIED** marks anything a primary source did not confirm.
- "SSR" means: can the component be imported into a route module that `react-router-serve` renders on the server, without crashing?
  - None of the vendors document React Router or Remix SSR.
  - The safe pattern for all of them is the same; see [SSR workaround](#ssr-workaround-applies-to-every-vendor).

## Summary table

| Service | Free tier (permanent?) | In-app feed on free | React pkg | React 19 peer dep | Prebuilt UI / headless | Node SDK | Real-time | EU region on free |
|---|---|---|---|---|---|---|---|---|
| **Knock** | 10k messages/mo, unlimited users & seats, no stated expiry | Yes | `@knocklabs/react` (+ `@knocklabs/react-core`) | Yes (`^17 \|\| ^18 \|\| ^19`) | Both | `@knocklabs/node` | Socket (WebSocket) | No (EU "coming soon, end of 2026") |
| **Novu** | 10k workflow runs/mo, unlimited subscribers, 3 seats, 5 workflows, no stated expiry | Yes ("In-app" channel) | `@novu/react` | Yes (`^18 \|\| ^19`) | Both (`<Inbox/>` + hooks) | `@novu/api` | WebSocket | **Yes** (US & EU on all plans) |
| **Courier** | 10k sends/mo, no stated expiry | **UNVERIFIED** (pricing page silent) | `@trycourier/courier-react` | Yes (`>=18`) | Both (`CourierInbox` + `useCourier`) | `@trycourier/courier` | WebSocket | No (EU = Business plan) |
| **SuprSend** | 10k notifications/mo, unlimited seats, no stated expiry (30-day premium trial then Free) | Yes (with SuprSend branding) | `@suprsend/react` | Yes (`>=16.8`, open range) | Both (drop-in + `@suprsend/react-core` hooks) | `@suprsend/node-sdk` | UNVERIFIED | UNVERIFIED (EU workspaces exist; plan gating unclear) |
| **MagicBell** | 1,000 deliveries/mo, unlimited users & seats, 1 project | **UNVERIFIED** | `@magicbell/react` (v1) | **No peerDependencies declared** | Prebuilt (+ `unstyled`) | `magicbell` | WebSocket (dep `reconnecting-websocket`) | UNVERIFIED / not documented |
| **Stream Activity Feeds** | Build plan: 5k activities/mo, 125k API calls/mo, overages "not allowed" | Yes (notification feeds) | `@stream-io/feeds-react-sdk` | Yes (`^17 \|\| ^18 \|\| ^19`) | Hooks only (no prebuilt bell) | `@stream-io/node-sdk` | WebSocket | Region chosen per app (Dublin documented); plan gating UNVERIFIED |
| **Engagespot** | ~10k triggers/mo ("Free Forever"). **UNVERIFIED**: the official pricing page was unreachable | UNVERIFIED | `@engagespot/react-component` | Range `>=16.8.3` allows 19, last published 2025-05 | Both (`@engagespot/react-hooks`) | `@engagespot/node` (last published 2024-11) | UNVERIFIED | UNVERIFIED |
| Ably (DIY transport) | 500 MAU free | N/A: you build the feed | `ably` (has React hooks) | Yes (`>=16.8`) | Headless transport only | `ably` | WebSocket | Regional routing = Business plan |
| Pusher Channels (DIY transport) | Sandbox: 200k msgs/day, 100 concurrent connections | N/A | `pusher-js` | N/A | Transport only | `pusher` | WebSocket | Cluster choice UNVERIFIED on Sandbox |

## Per-service detail

### Knock

- **Free tier.** The Free plan (formerly "Developer") is $0/mo with no credit card. It includes:
  - 10,000 messages/mo
  - unlimited stored profiles and team members
  - unlimited feeds per recipient, with the Feed API, pre-built and BYO components, and unlimited feed retention
  - no stated time limit
  - 30-day log retention. Knock branding is removed only on paid plans.
  - No hard cap: Knock contacts you if you exceed the limit.
  - Source: https://knock.app/pricing. The plan rename is noted at https://docs.knock.app/manage-your-account/knock-plans.
- **React.**
  - `@knocklabs/react` v0.15.1 provides prebuilt `NotificationFeedPopover`, `NotificationFeed` and `NotificationIconButton`, plus headless hooks (https://docs.knock.app/in-app-ui/react/overview).
  - `@knocklabs/react-core` v0.17.1 holds the hooks/state (`useKnockFeed`, `useCreateNotificationStore`, `useAuthenticatedKnockClient`, …). These hook names come from the package's `.d.ts`.
  - **React 19:** peerDependencies are `react: ^17 || ^18 || ^19`, with `next` and `@tanstack/react-router` as optional peers (npm, `peerDependenciesMeta`).
  - Dependencies include `@radix-ui/react-dialog`, `lucide-react` and Knock's own `@telegraph/*` design system (npm).
- **SSR.** The docs don't mention SSR, Next.js or React Router (https://docs.knock.app/in-app-ui/react/feed).
  - The package's `dist/esm/index.mjs` carries a `"use client"` directive (inspected in the npm tarball).
  - That directive only matters to RSC bundlers. It does not stop React Router from SSR-rendering the component.
  - Use the client-only mount below.
- **Styling.**
  - Import `@knocklabs/react/dist/index.css` and override the `--rnf-*` CSS variables, or replace the CSS entirely.
  - All classes are prefixed `rnf-`. Use `colorMode="dark"` for dark mode (https://docs.knock.app/in-app-ui/react/feed).
  - For a fully shadcn-native look, use the `react-core` hooks and build the bell with your own Radix Popover.
- **Node SDK.** `@knocklabs/node` v1.41.1 (npm).
- **Real-time.** Socket connections. `auto_manage_socket_connection` disconnects sockets in inactive tabs and reconnects them later. There is also an experimental BroadcastChannel cross-tab sync (https://docs.knock.app/in-app-ui/react/feed).
- **Region.** US only today. "EU data residency is coming soon", expected by end of 2026, with plan unspecified (https://docs.knock.app/manage-your-account/knock-plans).
- **Toasts with sonner.** No built-in toast is documented here. Subscribe to feed events and call `toast()` yourself. The exact event API is UNVERIFIED in this pass.

### Novu

- **Free tier.** $0/mo with no credit card (https://novu.co/pricing). It includes:
  - 10,000 workflow runs/mo
  - unlimited subscribers
  - up to 3 team members
  - up to 5 workflows
  - 2 environments
  - the In-app channel
  - 24h activity-feed retention. This refers to the dashboard activity log; whether it also limits inbox message retention is UNVERIFIED.
  - 60 events RPS
  - no stated expiry
  - **US and EU data residency are both listed for Free.**
  - Novu branding is removed on Pro.
- **React.**
  - `@novu/react` v3.19.2: peerDependencies are `react` and `react-dom` at `^18.0.0 || ^19.0.0 || ^19.0.0-0` (npm). Docs: "React 18.0.0 or later, including 19" (https://docs.novu.co/platform/sdks/react).
  - Components: `Inbox`, `Bell`, `Notifications`, `InboxContent`, `Subscription` (same page).
  - Headless hooks exported in the `.d.ts` include `useNotifications`, `useCounts`, `usePreferences`, `useNovu` and `useRealtime`.
  - `Inbox` takes a `routerPush` prop, and the quickstart wires it to React Router's `useNavigate` (https://docs.novu.co/platform/quickstart/react).
- **SSR.** Not documented. The quickstart covers Vite SPA only. Use the client-only mount.
- **Styling.**
  - Style through the `appearance` prop, which has `baseTheme` (`dark` from `@novu/react/themes`), `variables`, `elements`, `icons` and `animations`.
  - `elements` accepts **Tailwind class strings** or callbacks that return classes (https://docs.novu.co/platform/inbox/configuration/styling).
  - This is the closest to a native Tailwind/shadcn fit of the prebuilt inboxes.
- **Node SDK.** `@novu/api` v3.19.1 (npm). The older `@novu/node` was last published 2025-12.
- **Real-time.** WebSocket. The US socket is `wss://ws.novu.co`; the EU socket is `wss://eu.socket.novu.co` (https://docs.novu.co/platform/additional-resources/security).
- **Region.**
  - US and EU are self-serve and "available on all plans". Other regions are enterprise-only.
  - The EU API is `https://eu.api.novu.co/v1`, and API keys are region-bound (https://docs.novu.co/platform/additional-resources/security).
  - The Inbox needs `backendUrl`/`socketUrl` for EU (https://docs.novu.co/platform/inbox/setup-inbox).
  - The docs are inconsistent about `apiUrl` vs `backendUrl` (https://docs.novu.co/platform/inbox/prepare-for-production), so check against your installed version.
- **Note.** Novu is open source and self-hostable, which is an exit path if the free tier changes. The self-host claim comes from the vendor's general positioning and was not re-verified in this pass.

### Courier

- **Free tier.** Developer plan: 10,000 sends/mo. One send is one template delivered to one recipient, across any number of channels, and test environments count toward the limit (https://www.courier.com/pricing).
  - The pricing page does not state seats, expiry, or **whether Inbox is included on free**: UNVERIFIED.
  - EU Data Residency is a **Business**-plan feature.
- **React.**
  - `@trycourier/courier-react` v9.3.5 for React 18+. Its peerDependency is `react >=18.0.0` (npm), which admits 19.
  - Components: `CourierInbox`, `CourierInboxPopupMenu`, `CourierToast` and `CourierPreferences`. `useCourier()` supports a custom UI (https://www.courier.com/docs/sdk-libraries/courier-react-web).
  - It wraps `@trycourier/courier-ui-*` web-component packages (npm deps).
- **SSR.** Docs: Inbox and Toast "render only on the client". In Next.js 13+, add `"use client"` (same page). Use the client-only mount.
- **Styling.**
  - Theme objects (`CourierInboxTheme`, …) and custom render slots (same page).
  - Theming is not class-based, so Tailwind tokens must be mapped into the theme object.
- **Toasts.** It ships its own `CourierToast`, which would duplicate `sonner`. You would disable it and pipe events into `sonner` instead; the event API for that is UNVERIFIED.
- **Node SDK.** `@trycourier/courier` v10.0.0 (npm). Auth is a JWT minted by your backend (docs page above).
- **Real-time.** WebSocket via `inbox.listenForUpdates()` (docs page above).
- **Region.** EU is Business plan only, so it is not available on free (pricing page).

### SuprSend

- **Free tier.** $0/mo with no credit card (https://www.suprsend.com/pricing). It includes:
  - 10,000 notifications/mo
  - unlimited team members
  - in-app feed included **with SuprSend branding**
  - 30-day log retention
  - no stated expiry
  - Premium features are unlocked for a 30-day trial, after which the account falls back to Free.
  - No hard stop on overage.
  - Gated to paid plans: batching/digest, **user preferences**, i18n.
- **React.**
  - `@suprsend/react` v1.5.0 is the current SDK. `@suprsend/react-inbox` is end-of-support (https://docs.suprsend.com/docs/inbox-react).
  - Drop-in `Inbox`, `NotificationsFeed` and `Preferences`, built on `@suprsend/react-core` (providers and hooks: `SuprSendProvider`, `useSuprSendClient`, `useAuthenticateUser`, `SuprSendFeedProvider`) (https://docs.suprsend.com/docs/react-sdk).
  - Auth uses signed JWT user tokens.
  - **React 19:** peerDependency is `react >= 16.8.0` (npm). The range is open, but React 19 is not explicitly mentioned in the docs.
  - It depends on `@emotion/react`/`@emotion/styled` (npm). That adds a CSS-in-JS runtime next to Tailwind.
- **SSR.** Not documented. Emotion plus DOM access make a client-only mount the safe choice.
- **Styling.** Not covered on the pages read. The drop-in components have "customizable options"; headless is via `react-core`.
- **Node SDK.** `@suprsend/node-sdk` v1.15.1 (npm).
- **Real-time.** Not stated on the pages read: UNVERIFIED.
- **Region.**
  - The docs say each workspace has a data region, including the EU (https://docs.suprsend.com/docs/what-is-suprsend). The enterprise page lists US or EU data residency (https://www.suprsend.com/enterprise).
  - The pricing page lists a "Custom Data Center Region" only for Enterprise.
  - **Whether a Free workspace can pick EU: UNVERIFIED.**

### MagicBell

- **Free tier.** Builder plan at $0/mo: **1,000 deliveries/mo**, counted per channel. It includes unlimited users, unlimited team members and 1 project (https://www.magicbell.com/pricing).
  - Inbox inclusion on Builder is not explicitly listed: UNVERIFIED.
  - No expiry is stated.
  - The Builder overage rate is not given.
- **React.**
  - `@magicbell/react` v1.14.0 (subpath imports: `/context-provider`, `/inbox`, `/floating-inbox`, …) (https://www.magicbell.com/docs/libraries/magicbell-react).
  - **No `peerDependencies` declared on npm**, so React 19 compatibility is UNVERIFIED.
  - The legacy `@magicbell/magicbell-react` v11.5.1 and `@magicbell/react-headless` v5.5.1 declare `react >= 18.3.1`, which admits 19 (npm).
  - Prebuilt: `FloatingInbox`, `Inbox`, `ToastContainer`, `UserPreferences`, … (docs).
- **SSR.** Not documented. Some ESM entry files (`floating-inbox.js`, …) carry `"use client"` (tarball). Use the client-only mount.
- **Styling.** Per-component CSS files, `magicbell--*` class names, `--magicbell-*` CSS variables, and `className`/`unstyled` props (docs). Reasonably Tailwind-friendly.
- **Node SDK.** `magicbell` v4.5.1 (npm). Docs list a "Browser/Node Client" (https://www.magicbell.com/docs).
- **Real-time.** WebSocket, inferred from the `reconnecting-websocket` dependency (npm). The docs don't state it.
- **Region.** Not documented on any primary page found: UNVERIFIED.

### Stream (Activity Feeds v3)

- **Free tier.** "Build" plan: 5,000 activities/mo and 125,000 API calls/mo, with overages **"Not allowed"** (https://getstream.io/activity-feeds/pricing/).
  - It includes notification and aggregated feeds. No time limit is stated.
  - The separate **Maker** program ($100/mo credit) requires fewer than 5 team members and under $10k monthly revenue, and has "limited availability".
- **React.**
  - `@stream-io/feeds-react-sdk` v1.0.23: peerDependency is `react ^17 || ^18 || ^19` (npm).
  - Hooks such as `useFeedActivities`. Notification feed group `"notification"` with `markActivity` (https://getstream.io/activity-feeds/docs/react/).
  - **No prebuilt bell/inbox UI is documented for v3.** You build the UI.
  - The old `react-activity-feed` v1.4.0 only supports React `^16.8 || ^17` (npm), so it is not usable.
- **SSR.** Not documented. Use the client-only mount.
- **Styling.** Fully headless, so it fits Tailwind/shadcn natively.
- **Node SDK.** `@stream-io/node-sdk` v0.9.1 (npm).
- **Real-time.** WebSocket with `getOrCreate({ watch: true })` (https://getstream.io/activity-feeds/docs/react/).
- **Region.**
  - The region is picked per app at creation. `dublin` (EU) is documented for v2 (https://getstream.io/activity-feeds/docs/javascript/v2/performance/).
  - v3 apps only see "regions that support Feeds v3" (https://getstream.io/activity-feeds/docs/dotnet-csharp/v2-to-v3-migration/).
  - EU availability on the free Build plan for v3: UNVERIFIED.
- **Fit.** This is an activity-feed product, not a notification-workflow product: no preferences, digests or templates. It is overkill for a bell.

### Engagespot

- **Free tier.** The official pricing page could not be fetched (https://engagespot.co/pricing returned 404, and an SSL error on the .com domain).
  - Third-party directories report a "Free Forever" tier of about 10k triggers/mo with an in-app inbox. This is secondary-source only: **UNVERIFIED**.
- **React.**
  - `@engagespot/react-component` v3.0.1 and `@engagespot/react-hooks` v3.0.1: peer is `react >=16.8.3` (npm). The range admits 19, but React 19 is not tested or claimed.
  - **Last published 2025-05-09.** `@engagespot/node` v1.7.0 was last published 2024-11.
- **SSR, styling, real-time, region:** not verified.
- **Verdict.** Packages look stale and pricing is unverifiable, so this is not recommended.

### DIY transports (Ably, Pusher Channels, Supabase Realtime, Firebase)

These are not notification services. You would own the feed table in SQLite/Drizzle, the read/unread state, and the UI. They only replace the "real-time push" piece.

- **Ably.**
  - Free plan: 500 MAU (https://ably.com/pricing).
  - `ably` v2.30.0 ships React hooks, with peer `react >=16.8.0` (npm).
  - EU/US/AUS regional routing is a Business-plan feature.
- **Pusher Channels.** Sandbox: 200k messages/day and 100 concurrent connections (https://pusher.com/channels/pricing/). EU cluster on Sandbox: UNVERIFIED.
- **Supabase Realtime / Firebase.** Both would add a second datastore next to SQLite. This was not investigated further because it conflicts with the existing Drizzle/SQLite backend.
- **No-vendor option.** A plain SSE endpoint from the React Router Node server plus a Drizzle `notifications` table needs no vendor at all. It is the zero-cost baseline that every hosted option should beat.

## SSR workaround (applies to every vendor)

None of the hosted inboxes document React Router or Remix SSR, and all of them open a socket and touch the DOM. In this app:

1. Put the bell in a component that renders only after hydration. For example, use a `mounted` state set in `useEffect`, and render a static `<Button>` bell placeholder (shadcn) on the server and on first client render.
2. Optionally import the vendor package lazily inside that component (`React.lazy` / dynamic `import()`). That keeps it out of the server bundle entirely.
   - React Router's Vite plugin also supports `*.client.ts` modules, which are stubbed on the server. This is documented for v7; for v8 it is UNVERIFIED.
3. Mint user tokens server-side in a `loader`, using the vendor Node SDK or a JWT signed with the vendor secret, and pass them to the client component. Never expose the secret API key.
4. For toasts, subscribe to the vendor's "new notification" event and call `sonner`'s `toast()`. Disable any vendor-built toast (Courier `CourierToast`, MagicBell `ToastContainer`).

## Shortlist (pass both hard requirements: usable free tier with in-app feed + React 19-compatible React SDK)

1. **Novu**
   - Free tier: 10k runs/mo.
   - Prebuilt `<Inbox/>` plus hooks. React 19 is in its peer deps.
   - Tailwind classes go straight into `appearance.elements`.
   - React Router `useNavigate` integration is documented.
   - **EU region on free.**
   - Limits: 3 seats, 5 workflows, Novu branding.
2. **Knock**
   - Free tier: 10k messages/mo with unlimited users and seats, and unlimited feed retention.
   - Prebuilt feed plus `react-core` hooks. React 19 is in its peer deps.
   - It already depends on Radix.
   - Limits: no EU region yet (expected end of 2026), Knock branding.
3. **SuprSend**
   - Free tier: 10k notifications/mo with unlimited seats. Drop-in and headless.
   - Open React peer range.
   - Limits: Emotion runtime, user preferences gated to paid plans, branding on the feed, and EU on Free unverified.

Conditional (pass only if the UNVERIFIED item checks out):

- **Courier.** Viable if Inbox is confirmed on the free Developer plan. The SDK and React 18+/19 peer are fine, but EU requires Business.
- **Stream Activity Feeds v3.** Free and React 19-compatible, but headless-only with a small 5k activities/mo cap and no overage allowed. It is a feed engine, not a notification service.

## Ruled out

- **MagicBell.** Free is only 1,000 deliveries/mo. Inbox-on-free is unverified, the current `@magicbell/react` declares no React peer range, and no EU hosting is documented.
- **Engagespot.** Official pricing page unreachable (free tier unverifiable), and the React/Node packages have not been published since 2025-05 and 2024-11.
- **Stream `react-activity-feed` (v2 UI kit).** Peer deps cap at React 17.
- **Ably / Pusher / Supabase / Firebase.** These are transports, not in-app notification services. You would build the feed and UI yourself; Supabase and Firebase would also add a second datastore beside SQLite.

## Gist

**Novu** is the best fit for this stack on a free tier: React 19 peer, Tailwind-classable `<Inbox/>` plus hooks, React Router navigation hook-in, and EU hosting on free. **Knock** is the strong runner-up if US-only hosting is acceptable. Every option must be mounted client-only under React Router SSR.
