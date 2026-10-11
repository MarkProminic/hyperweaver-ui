# Notifications from the STARTcloud UI

Estate-wide tracking is `../authorization-server-private/priorities.yaml`, read-only from this repo. Contracts are `../startcloud-ui/docs/guides/universal-*.md`, `preferences-and-branding.md` and `UI-GROWTH-GUIDE.md` in that folder, with the visual references beside them; the copies under `../authorization-server-private/docs/guides` are pointer stubs and are never cited. The governing rules and the D-ledger for the hyperweaver family are `../hyperweaver-docs/docs/roadmap.md`. Every entry in sections 7 to 17 is open work for this repository until its lines are changed; an entry is deleted when done.

Cross-repo notes for whoever works in this repository. Nothing here is a
change to make on its own; it records what the sibling UI now does, why,
and what it needs from here, so the two trees can converge and one day
merge. Read every file named below in full before acting on any of it.

## 1. startcloud-ui is now one status-driven app on a feature-first tree

Why: without this section the convergence target is unknown here and any new surface would be built to a shape the estate has already left.

startcloud-ui (`G:\Projects\startcloud-ui`) took this repository's model
and finished it: one build, no per-backend folders, the page probes
`GET /api/status` on the origin that served it and gates every route, menu
row and control with `hasFeature(status, token)`. A UI backend that lacks
a token never shows that surface; a new UI backend is a new status
payload, never new UI code. Its `src/utils/capabilities.js` carries the
same names this repository's `src/utils/capabilities.js:22-39` does
(`hasFeature`, `hasFeatureStrict`) with the same render-all rule for a
payload whose `features` is not an array, plus `hasCollection` and
`authMethod`. The one difference is what the payload describes: here
`server.capabilities` is one agent among many (`:5-7`), there `status` is
the UI backend that served the page.

The status payload every UI backend answers:

```json
{
  "role": "boxvault",
  "version": "0.77.1",
  "brand": { "name": "BoxVault", "logoUrl": "/brand/boxvault.svg", "repo": "https://github.com/Makr91/BoxVault" },
  "auth": ["backend"],
  "collections": ["boxes", "isos"],
  "features": ["local-accounts", "setup", "admin", "org-console", "discover", "invitations", "uploads", "watches", "deploy", "favorites", "notifications", "health", "footer"],
  "links": { "docs": "/docs", "contact": "" },
  "ticket": null
}
```

`auth` is an array of session methods, first entry wins (`backend`, `idp`
with an `idp` object beside it, or `cookie` on the identity provider);
`collections` is data, never a gate; `features` is the gate. The full
field and token tables are in `universal-navbar.md:425-497` under The
status payload, and the startcloud-ui README under Hosting the UI.

## 2. The tree

Why: files placed outside this shape have to be moved twice when the two trees merge.

The layout is the Bulletproof React feature-first tree, chosen so this
repository can adopt the same shape later without a second design
(`universal-navbar.md:352-380`, `universal-pages.md:681-699`):

```text
src/
  app/            index.jsx (probes /api/status), App.jsx, provider.jsx, router.jsx, callback.jsx
  components/
    common/       Avatar, BrandLogo, ConfirmModal, ErrorBoundary, NotAvailableStub, PageHeader, ...
    layout/       AppShell, Sidebar, Header, Footer, Breadcrumbs, Search, SearchPanel, UserMenu, IdentityCard,
                  LogoutItem, FavoriteApps, NotificationsItem, LanguageModal, OrgSwitcherModal,
                  NotificationsModal, Notices
  features/
    <name>/       index.js  api/  components/  hooks/  utils/  sidebar.js  assets/
    collections/  registry.js, boxes/, isos/, provisioners/
  hooks/          useSession, useTheme, useFavicon, useSearchBinding, useEventStream, useFormRules, ...
  contexts/       StatusContext (probeStatus, StatusProvider, useStatus, statusShape), NoticeContext, SearchContext
  lib/            apiClient, backendSession, browserOidc, cookieSession, createSession, runtime, i18n, logger, events, eventHub, sse, returnTo
  utils/          capabilities, routes, validation, relativeTime, gravatar, identity, ticketUrl, membership
  config/         constants that are not from status
  css/            styles.css, fonts.css
public/
  brand/          the marks a UI backend may name in brand.logoUrl
  themes/<pack>/  the packs of the branding contract
  locales/<lang>/ shared.json  auth.json
```

Import rules: a feature imports from `components/`, `hooks/`, `contexts/`,
`lib/`, `utils/` and its own folder, never from another feature except
`features/collections/registry.js` and `features/deploy`; `components/`
never imports a feature; `lib/` and `utils/` import nothing from React
components. Each feature has an `index.js` barrel that is its only public
surface, `sidebar.js` where it exports column entries, and its heavy
libraries load only when its route renders. Chunk names are plain
(`assets/[name].js`), never hashed.

## 3. What this maps to here

Why: without the mapping each piece here would be rewritten from scratch instead of renamed into its shared counterpart.

| hyperweaver-ui today | startcloud-ui shape |
| --- | --- |
| `ModeContext` probing `/api/status` for `role: server \| agent` | `contexts/StatusContext.jsx`, the same probe with the full payload |
| `utils/capabilities.js` | `utils/capabilities.js`, same exports plus `hasCollection`, `authMethod` |
| `Layout.jsx` gating routes with `NotAvailableStub` | `app/router.jsx` gating with `hasFeature` and `authMethod`, `components/common/NotAvailableStub.jsx` |
| page folders | `features/<name>/{api,components,hooks,utils}` |
| shared components | `components/common` and `components/layout` |
| `Sidemenu.jsx`, `SidebarHeader.jsx`, `Sidebar.jsx`, `SidebarTree.jsx`, `useSidebarMenus.jsx` | `components/layout/Sidebar.jsx` drawing what each feature's `sidebar(status, account)` export answers; section 12 |
| `SidebarFooter.jsx` drop-up | `components/layout/UserMenu.jsx`, at the sidebar foot only under the `actionMenu` swap, theme and language in the header cluster; section 12 |
| `UserSettingsContext.jsx` keys | the storage table of `universal-session.md:323-344`; section 12 |
| `Footer.jsx` | `components/layout/Footer.jsx` behind the `footer` token; section 13 |
| served at `/ui/` | served at `/`; section 6 |

Nothing here asks for a move today. When this repository does move, the
target is the tree above with its names, so the two UIs differ only in
their features and their status payloads.

## 4. Deploy links for provisioners

Why: the catalog's Deploy button lands users on an empty wizard, and the provisioner they chose is silently dropped.

The provisioner catalog's Deploy control opens Hyperweaver with
`?create=machine&provisioner=<slug>&provisioner_version=<version>&provisioner_url=<url>`,
beside the box parameters BoxVault already sends
(`?create=machine&box=…&box_version=…&box_arch=amd64&box_url=…`). The
landing page here reads the box parameters; it does not yet read the
provisioner ones. Until it does, the catalog's link is a best-effort
contract. Reading the three provisioner parameters on the same landing is
the one concrete request in this file.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/components/Landing.jsx:20` copies only `box`, `box_version`, `box_arch`, `box_url`; `src/components/Machines.jsx:579-583` seeds only `boxSeed` | read `provisioner`, `provisioner_version`, `provisioner_url` on the same landing and carry them to the wizard beside the box seed | `universal-pages.md:226-234`; the sender is `../startcloud-ui/src/features/collections/provisioners/components/deploy.jsx` |
| `src/components/Machine/MachineCreateModal.jsx:175,632-643,1366` accepts a `boxSeed` prop only; `:959` sends `provisioner: { name, version }` | accept a provisioner seed that pre-selects family and version (the picker at `src/components/Machine/ProvisioningRolesTab.jsx:71-134` exists) and hand `provisioner_url` to the agent as the package download source | `notification.md:17-29` |

## 5. Where the contracts live

Why: an item here is only as good as the contract line it cites, and without the paths the citations cannot be checked.

- `G:\Projects\startcloud-ui\docs\guides\universal-navbar.md`, `universal-pages.md`, `universal-session.md`, `universal-events.md`, `universal-validation.md`, `universal-config.md`, `preferences-and-branding.md`, `universal-identity.md`: the chrome, pages, session, events, validation, config, theming and identity contracts, with the reference implementation tables pointing at the startcloud-ui paths above.
- `G:\Projects\startcloud-ui\docs\guides\UI-GROWTH-GUIDE.md`: the work plan beside the contracts; `:56` names this repository as the first fit for the `actionMenu` swap and leaves it unchanged for now; `:9` renames the contracts' word host to UI backend; `:11` names `../startcloud-ui/notifications.md` as the gap channel for anything a contract does not say.
- `universal-navbar.html`, `universal-sidebar.html`, `universal-pages.html`, `universal-identity.html`, `preferences-and-branding.html` beside them: the visual references; where a mockup and a contract disagree the contract wins.
- `G:\Projects\startcloud-ui\README.md`: Hosting the UI, the payload, the fields, the tokens.
- `G:\Projects\provisioner-catalog\FOLLOWUPS.md`: the estate-level merge intent (catalog into BoxVault, Armor, image building).
- `G:\Projects\hyperweaver-docs\docs\roadmap.md`: the hyperweaver family's rules and D-ledger.

## 6. Where the UI is served: the estate rule

Why: a UI at `/ui/` cannot be served by a UI backend that follows the rule, so every deep link, service worker scope and OIDC redirect would break the day the agents move under `/api`.

The rule, in `universal-navbar.md:408-423` under Where the UI is served:
the SPA owns `/`; everything a program calls lives under `/api` plus the
paths a client protocol dictates; a machine and a browser asking for the
same root URL are told apart by the client's own signal, `Accept` or user
agent, the way Vagrant Cloud answers `/myuser/test` with JSON for `vagrant
box add` and a page for a person; no UI backend redirects and no UI
backend fronts itself with a reverse proxy; the build is `base: '/'`, the
router owns `/`, and the SPA fallback is tried after every API and
protocol route, in any language (`universal-pages.md:625-633`).

This repository is at `/ui/` because its UI backends, the agents, mount
their whole API at the origin root (`src/api/serverUtils.js:40-49,59-68`
addresses Direct mode as `/{path}`: `/status`, `/auth/*`, `/machines/*`,
`/term/*`, `/ssh/*`, `/tasks/*`, `/templates/*`, `/filesystem/*`, the VNC
and RDP WebSocket upgrades, and more), and `/` answers a 302 to `/ui/` or
a JSON info document. Joining the rule means the agents move those routes
under `/api` first (`universal-navbar.md:420-423`), and only then this
build becomes `base: '/'` (`vite.config.js:53`), the router loses its
`/ui` basename (`src/App.jsx:50-71`), the service worker registers at
`/sw.js` with scope `/` (`src/index.jsx:27-28`), the manifest `scope` and
`start_url` become `/` (`public/manifest.json:27-28`), the OIDC redirects
land on `/auth/callback` and `/login` (`src/App.jsx:50-58`), the tray Open
target becomes the origin, and the packaging strings drop `/ui/`. The
complete list of files that assume `/ui` is in section 7.1. None of this
is requested now; it is the order of work when the move happens.

## 7. Rulings

### 7.1 No `/ui` basepath once the agents serve their API under `/api`

Why: forty files hard-code `/ui`, so serving this build at `/` is blocked until every one of them changes, and a partial move leaves routes, the service worker and the manifest pointing at different roots.

`universal-navbar.md:420-423` and `universal-pages.md:631-633` exempt this repository only while the agents keep their API at the origin root (`src/api/serverUtils.js:41,61` still addresses Direct mode at `/{path}`). The move lands in one change across every line below; nothing else in the tree carries `/ui` outside comments.

| file | lines |
| --- | --- |
| `vite.config.js` | 53 |
| `src/index.jsx` | 27, 28 |
| `src/App.jsx` | 50, 54, 58, 60, 64, 68, 69, 71 |
| `src/contexts/FooterContext.jsx` | 22 |
| `src/hooks/useVncSession.js` | 135 |
| `src/components/AuthCallback.jsx` | 52, 76, 80, 88 |
| `src/components/Dashboard/Dashboard.jsx` | 134, 140, 144, 150, 157 |
| `src/components/GravatarImage.jsx` | 12 |
| `src/components/HostManage.jsx` | 178 |
| `src/components/HyperweaverSettings/ServerManagementTab.jsx` | 98 |
| `src/components/HostStorage.jsx` | 124 |
| `src/components/Profile.jsx` | 97 |
| `src/components/Machines.jsx` | 779 |
| `src/components/HostDevices.jsx` | 89 |
| `src/components/Hosts.jsx` | 187 |
| `src/components/HostNetworking.jsx` | 114 |
| `src/components/VncConsoleDisplay.jsx` | 325 |
| `src/components/SidebarTree.jsx` | 32, 49, 146, 276, 311 |
| `src/components/SidebarHeader.jsx` | 26, 37 |
| `src/components/Navbar.jsx` | 43-48, 400, 410, 421, 435, 444, 456, 469, 487, 496, 505, 514, 588, 592, 603, 742, 752 |
| `src/components/SidebarFooter.jsx` | 257, 261, 383, 391, 399 |
| `src/components/ServerSetup.jsx` | 71, 273 |
| `src/components/useSidebarMenus.jsx` | 107, 115, 151, 159, 167, 175, 183, 218, 226, 236, 246, 256, 264, 289 |
| `src/components/Login.jsx` | 249, 484, 749 |
| `src/components/Register.jsx` | 43, 80 |
| `src/components/Sidebar.jsx` | 31 |
| `src/components/Layout.jsx` | 134, 138, 195, 218, 221 |
| `src/components/Landing.jsx` | 26, 60, 86 |
| `src/components/InactiveConsoleDisplay.jsx` | 338 |
| `src/components/RdpConsoleDisplay.jsx` | 281 |
| `src/components/Navbar/navbarUtils.js` | 90-96 |
| `src/components/Navbar/ContextTabs.jsx` | 26, 27, 29, 34, 40, 45, 61, 72, 79, 87, 96, 119, 122 |
| `src/components/Navbar/Breadcrumb.jsx` | 30, 37 |
| `src/components/Host/InterfacesTable.jsx` | 162 |
| `src/components/Host/MachineManager.jsx` | 96, 111, 119 |
| `src/components/Host/NetworkStorageSummary.jsx` | 57 |
| `src/components/Host/ProvisioningNetworkPanel.jsx` | 144 |
| `src/components/Host/NetworkTopology/TopologyPanel.jsx` | 94, 102, 112, 121 |
| `public/sw.js` | 7-11, 86, 127, 142, 143, 188, 194 |
| `public/manifest.json` | 27, 28 |

### 7.2 API key prefix is `hw_`

Why: a reporter who copies the template's `wh_` example files a bug that cannot reproduce and learns the wrong prefix for every later request.

| what is | required change | deciding source |
| --- | --- | --- |
| `.github/ISSUE_TEMPLATE/question.md:60` and `.github/ISSUE_TEMPLATE/bug_report.md:60` show `Authorization: Bearer wh_...` | `hw_...`, matching `public/locales/en/common.json:666` | the agent mints the prefix; the UI only displays it (`src/contexts/AuthContext.jsx:482-494`, `src/components/ApiKeysTab.jsx:45,64`) |

### 7.3 Theme and language write through the account

Why: a choice kept only in local storage differs per device and browser, and a screen reader on a static `lang="en"` pronounces every other language wrongly.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/contexts/ThemeContext.jsx:20,37` keeps the variant under `hyperweaver-theme` in `localStorage` only; `src/components/SidebarFooter.jsx:150-153` changes the i18n language only | on every toggle write `{ theme }` or `{ language }` through `PATCH /api/user/preferences` (optimistic, never blocking); on login apply the account value over local storage; the keys are `theme` and `language`, unprefixed | `universal-navbar.md:65-66,69-73`; `preferences-and-branding.md:107-124,305-330`; `universal-session.md:307-317,342` |
| `index.html:2` carries a static `lang="en"`; the pre-paint script at `index.html:8-18` stamps `data-bs-theme` only, from `hyperweaver-theme` | stamp `lang` from the same synchronously readable state, read `theme`, and keep the script's precedence equal to `ThemeContext.jsx:18-37` when an account tier is added | `preferences-and-branding.md:67,149-156,543-545` |

## 8. Stale documentation in this repository

Why: a UI backend or contributor building against the README would implement a `/api/zapi` surface and a WebSocket proxy the code never calls, install a package it never imports, and read a contract from a stub.

| what is | required change | deciding source |
| --- | --- | --- |
| `README.md:12` lists `@xyflow/react` for the topology | not a dependency (`package.json:7-49`, nothing in `src/` imports it); drop it from the line | `package.json` |
| `README.md:22` says the dev server proxies console WebSockets | `vite.config.js:63-69` proxies `/api` with no `ws: true`; either add the WebSocket proxy or drop the claim | `vite.config.js:63-69` |
| `README.md:46` names `/api/zapi/:protocol/:hostname/:port/*` | the code addresses agents as `/api/agents/{id}/{path}` in Aggregated mode and `/{path}` in Direct mode; rewrite the contract line | `src/api/serverUtils.js:41,48,61,67` |
| `notification.md:36` names `web/src/deploy.jsx` and `web/src/pages/deploy.jsx` in the catalog | those files are `../startcloud-ui/src/features/collections/provisioners/components/deploy.jsx` and `../startcloud-ui/src/features/deploy/components/DeployControls.jsx`; `notification.md` stays as written and this line records the move | `../provisioner-catalog` has no `web/` tree |
| `notification.md:39` and `NAVBAR.md:8` name the contracts under `authorization-server-private/docs/guides` | the contracts are `../startcloud-ui/docs/guides/universal-pages.md:226-234` and `universal-navbar.md`; both files stay as written and this line records the move | `UI-GROWTH-GUIDE.md:8` |

## 9. NAVBAR.md items, each still open

Why: the header and footer are the seams a user crosses between apps, and while these stand the crossing into this app shifts height, gutter, band and footer content, and shows a build-baked version instead of the UI backend's.

| NAVBAR.md | what is | required change | deciding source |
| --- | --- | --- | --- |
| `:12-13` cluster icon buttons borderless | `src/components/SidebarFooter.jsx:345-365` draws theme and language as dropdown rows inside the profile drop-up; `src/components/Navbar.jsx:853-860` draws no cluster | put the cluster (search, theme, language, account) in the header as 34px borderless icon buttons, transparent until hover; theme and language stay there under the swap of section 12 | `universal-navbar.md:46-48,62-67,78-79,340` |
| `:14-17` chrome metrics | `src/components/Navbar.jsx:854` (`px-2 py-1`), `src/components/Footer.jsx:216-217` (`ps-1`), `src/styles/_layout.scss` carry no fixed metrics | 62px header of 34px controls with 14px vertical padding, one 20px horizontal gutter shared by header and footer, footer one 13px row with 12px vertical padding; sidebar chrome the same | `universal-navbar.md:253-254,266-272` |
| `:19-20` Powered by degrades to text | `src/components/Footer.jsx:217-239` draws text links only, no image, no Powered by line | add the Powered by mark in the footer centre, falling back to the company-name text when the image fails | `universal-navbar.md:268-271,606-609` |
| `:21-24` identity card toggle | `src/components/SidebarFooter.jsx:284-296` toggles the menu on avatar, name and email; `:371-387` draws a Profile row pointing at the IdP or the local page, never both | an identity card as row one (avatar, name, email, target glyph, chevron) whose glyph flips local and IdP targets without navigating when both exist | `universal-navbar.md:638`; reference `../startcloud-ui/src/components/layout/IdentityCard.jsx` |
| `:25-28` full-bleed chrome on a tertiary band | `src/components/Layout.jsx:124-126,200`, `src/components/Navbar.jsx:853-857`, `src/components/Footer.jsx:215-216` carry no band background or border | header on the tertiary background with a 1px bottom border, footer the same with a top border, no outer margins, no max-width container | `universal-navbar.md:255-257,263-265` |
| `:29-33` footer slots | `src/components/Footer.jsx:217-239` draws one left block reading `Hyperweaver v<ver> © STARTcloud.com` with the version from the `__APP_VERSION__` build define (`:233`); no centre or right slot, no health; `NAVBAR.md:29-33` itself puts the name and version on the right, which the contract no longer does | left: `<name> © <year> · v<version>` as one link to the repository, the version read from `/api/status`; centre: Powered by; right: the health heart where the UI backend lists `health`; section 13 | `universal-navbar.md:602-630` |

## 10. Navbar gaps beyond NAVBAR.md

Why: a user of this app cannot reach their preferences, notifications or a search from the chrome every other estate app gives them, the ticket lands without the app and version that route it, and the switcher, the language control and the icons look like a different product.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/components/SidebarFooter.jsx:297-466` has no Preferences row | a Preferences row linking to `{issuer}/user/profile#preferences` for an IdP session | `universal-navbar.md:640` |
| `src/components/SidebarFooter.jsx:297-466` has no Notifications row | a Notifications row with the unread badge, shown when the token carries the `notifications` scope, opening the Notification Channel Notifications modal | `universal-navbar.md:646,679-728`; reference `../startcloud-ui/src/components/layout/NotificationsItem.jsx`, `NotificationsModal.jsx` |
| `src/components/SidebarFooter.jsx:357-365` draws the language row as a country flag from `Intl.Locale` (`:23-35`) and the language's own name; the modal at `:471-495` lists flag and name, no code | a globe glyph with the current language's two-letter code and `aria-label` "Change language, English" in the header cluster; the modal lists each language by its code and its own name with a decorative flag beside it | `universal-navbar.md:66`; `universal-identity.md:2119-2123`; reference `../startcloud-ui/src/components/layout/LanguageModal.jsx` |
| `src/components/SidebarFooter.jsx:426-441` draws a star for every favourite | icon chain `iconUrl` → `{homeUrl origin}/favicon.ico` → star, `homeUrl` and `iconUrl` drawn only with the `https:` scheme | `universal-navbar.md:642`; reference `../startcloud-ui/src/components/layout/FavoriteApps.jsx` |
| `src/components/SidebarFooter.jsx:228-238` sends the ticket `context` from the config value | `context` is `<app>\|<version>`; `customerId` resolves active org → user → configured fallback | `universal-navbar.md:732-739` |
| `src/components/SidebarFooter.jsx:96-103` labels the logout row by scope | the row reads "Logout"; the scope is the icon's tooltip and the icon alone flips it | `universal-navbar.md:649,743-755` |
| `src/components/OrgSwitcherModal.jsx:94-111` draws a building icon, no description, primary as a text note | org logo → Gravatar → the app's mark, name and description, a crown on the primary membership; the All organizations row at `:72-84` stays, the contract names this app as the filter-style one | `universal-navbar.md:656-675` |
| `src/components/Navbar.jsx:853-860` carries no search module and `src/App.jsx:46-71` no `/search` route | the magnifier first in the header cluster while a page has registered a binding, the panel of pills, the app-wide list, and `/search?q=` as a reserved page on every UI backend | `universal-navbar.md:96-171,202-207`; `universal-pages.md:516-522` |
| `src/index.jsx:16-19` loads Font Awesome; `src/styles/_bootstrap-theme.scss:9-39` and `package.json:14` set the orange palette and the icon set | the native theme: stock Bootstrap tokens, self-hosted Open Sans and Montserrat, `react-icons/fa6` glyphs for every chrome icon; a pack, if any, as `brand.pack` in `/api/status` stamped as `data-brand`, its variables from `public/themes/<pack>/` of the shared build | `universal-navbar.md:510-514`; `preferences-and-branding.md:58-79,284-296,334-359` |

## 11. Settings surfaces are pre-contract

Why: the settings form cannot paint a 422's pointers on the fields that failed, cannot mask a secret it reads back, and a value that passes in the browser can fail on the server or the reverse, so the hyperweaver UI backends cannot join the shared admin page as they stand.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/hooks/useSettingsAPI.js:41,98` reads and writes `/api/settings` as one metadata document; `src/utils/settingsUtils.js:172-186,237` reads `options`, `conditional`, `item_schema`, `secret_fields`, `_sections`; `src/components/HyperweaverSettings/CollectionManager.jsx:41` talks to `/api/settings/collections/<path>` | a plain file per name in `status.config` read at `GET /api/config/<name>`, one JSON Schema 2020-12 document at `GET /api/config/<name>/schema`, the form drawn from the schema through the shared `ConfigSections`, `ConfigField` and `schemaSections`; `_sections` becomes `sections`, a collection becomes `type: object` with `additionalProperties` | `universal-config.md:66-72,157-188,194-203,278-286,294-300,313` |
| `src/components/HyperweaverSettings/FieldRenderer.jsx:198-199` bounds from `validation.min` and `validation.max`; `:202-203` secrets by `type: 'password'`; `:209-212` choices from `options` | `minimum`, `maximum`, `enum`, `writeOnly` masked as `********` and kept when the write carries the mask, `title` and `description`, `inputmode="numeric"` for numbers | `universal-config.md:165-169,238-242,285` |
| `src/hooks/useSettingsAPI.js:101-118` and `CollectionManager.jsx:146,159-178,207-226` answer every refused write with one message card | a 422 `application/problem+json` body with `errors[]` of pointers painted into the field each pointer names, the summary at the top, never a card; 409 for `unique` | `universal-config.md:198,205-232`; `universal-validation.md:300-308,359-397,401-407` |
| `src/components/HyperweaverSettings/SmtpTestPanel.jsx:29`, `LdapTestPanel.jsx:26-28`, `src/hooks/useSettingsAPI.js:24`, `src/components/AgentSettingsModals.jsx:40` send and read `testEmail`, `testUsername`, `includeApiKeys`, `createdAt` | every request-body member and every configuration key is `snake_case` | `universal-validation.md:145-153` |
| `src/components/AgentSettings.jsx:97-113` fetches `settings/schema` to decorate only and `PUT`s the whole values document; `src/components/AgentSettingsFields.jsx:56-73,245-246` read a `values` vocabulary and `min`/`max` | the schema is the form: `minimum`/`maximum`, `additionalProperties` for free maps, the write validated and answered with 422 pointers | `universal-config.md:165,173,198,285,300,314` |
| `src/components/AgentSettings.jsx:701-704` warns once per section from the schema's `requires_restart`; `src/hooks/useSettingsAPI.js:105` and `CollectionManager.jsx:160,208` read `requiresRestart` from the 200 | the schema property carries `requiresRestart`, the 200 carries `requires_restart`, a restart badge on every field whose property says so and the warning card from the 200; `universal-config.md:282` names the 200's member `requiresRestart` against `:198`, a line for the gap channel | `universal-config.md:174,198,282` |
| `src/components/AgentSecretsTab.jsx:10-11,132` renders every secret as plain text | a `writeOnly` value reads back masked and is kept when the write carries the mask or nothing | `universal-config.md:52-53,169,238-242` |
| `src/components/HyperweaverSettings/index.jsx:277`, `src/components/AgentSettings.jsx:680-682`, `src/components/AgentSecretsTab.jsx:252` draw one alert row for every outcome | field errors inline beside the control, a form summary on submit, success and transport failures as notice cards, state the user must know as banners | `universal-validation.md:300-308`; `universal-navbar.md:764-807` |

## 12. Sidebar, the column and the `actionMenu` swap

Why: the column is the seam a user crosses on every page, and this repository is the one estate app whose header account slot the contract lets a feature's action menu take, so its shape decides whether the swap is ever real.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/components/Sidemenu.jsx:13-21` draws header, tree and foot as one column from contexts; `src/components/SidebarTree.jsx:325-370` is a component reading `ModeContext`, `ServerContext`, `AuthContext` and `useSidebarMenus` | the column is the shared `Sidebar.jsx` drawing what the machines feature's `sidebar(status, account)` export answers, `[{ key, labelKey, tree }]`, the tree a hook answering `{ nodes, menu }` with `children` loaded on expand, `status` for the dot and `menu(node)` for the right-click rows; the shell never re-decides a gate | `universal-navbar.md:278-280,311-335`; `universal-pages.md:604-614`; `universal-identity.md:2159-2161` |
| `src/components/SidebarHeader.jsx:6-19,54-64` is a button with the mark and the name that collapses to the 38px rail, no chevron, no fixed height; `src/components/Layout.jsx:112-121` sizes the column 38 to 400px; `src/contexts/UserSettingsContext.jsx:13-16,52-57` default 260px and minimize under 180px | one 62px top button with mark, product name and chevron, titled Expand in the rail; 260px default, 180 to 400px by drag, 38px rail, the 20px gutter and the tertiary band with a right border | `universal-navbar.md:293-301` |
| `src/contexts/UserSettingsContext.jsx:9,14,49,56` keep `hyperweaver_sidebar_minimized` and `hyperweaver_sidebar_width`; `src/components/SidebarTree.jsx:92` keeps a host's expansion in component state | `sidebar_minimized`, `sidebar_width`, `sidebar_open_<group>` and `sidebar_view_<group>`, unprefixed because storage is per origin | `universal-session.md:325-326,338-341`; `universal-navbar.md:342-344` |
| `src/components/SidebarTree.jsx:104-142` polls each expanded host every 10 s for the machine list and the dots | the dot and any badge count come from the event hub where the UI backend advertises `events`, from a count route where it does not, a timer last | `universal-navbar.md:330-335`; `universal-events.md:40-42,281-282` |
| `src/components/Navbar.jsx:853-860` draws crumbs and the scope-aware Controls dropdown (`:740-759`) and no account cluster; `src/components/SidebarFooter.jsx:283-297` draws the user menu as a drop-up at the foot with theme and language rows inside it (`:345-365`) | the header keeps the cluster (search, theme, language, account); the Controls dropdown becomes the machines feature's `actionMenu` export, drawn in the account slot in the toggle shape, and only then does the user menu draw at the foot as a drop-up with the identity card as its toggle and the avatar alone in the rail; theme and language never leave the header | `universal-navbar.md:46-48,336-341`; `UI-GROWTH-GUIDE.md:56` names this repository as the first fit and leaves it unchanged for now |
| `src/components/SidebarTree.jsx:53-69,159-209` rows are buttons with no arrow-key movement; `src/components/Layout.jsx:112-123` keeps the column in flow at every width | `nav aria-label`, arrow keys between rows, Left collapses a node, Right expands, Escape closes a menu; under 900px the column overlays from the left behind a header toggle and closes on a route change | `universal-navbar.md:345-348` |
| `src/components/Navbar/Breadcrumb.jsx:30,37` links the Datacenter and host crumbs to fixed routes | crumbs come from the route alone; a route a sidebar row matches draws `<group> › <row>`, the group a plain word and the row a link | `universal-navbar.md:84-92`; `universal-pages.md:159-166,614-618` |

## 13. The `footer` token and the footer slots

Why: the footer is where a person reads the version they report a fault against, and this footer shows a build number and a shell toolbar where the estate shows the UI backend's version, the Powered by mark and the health heart.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/components/Footer.jsx:214-239` draws the footer on every page; `src/contexts/ModeContext.jsx:51-53` reads `role` from `/api/status` and nothing gates on a `footer` token | the footer draws only while the UI backend's `features` lists `footer`; a payload without the token draws none and shows `v<version>` beside `brand.name` in the user menu's app-section header | `universal-navbar.md:496,604-606,626-630` |
| `src/components/Footer.jsx:217-239` draws a Hyperweaver link to `/docs`, a version button from the build define `__APP_VERSION__` (`vite.config.js:40`) with a three-click easter egg (`:93-109`), and a © link to startcloud.com | left slot `<name> © <year> · v<version>` as one link to `brand.repo`, the version read from `/api/status` through the status context and never a build value; centre Powered by degrading to text; right the health heart while `health` is listed, fed by the events stream | `universal-navbar.md:268-271,606-626` |
| `src/components/Footer.jsx:243-381,384-436` put the shell and tasks toolbar and the resizable pane in the footer row; `src/contexts/UserSettingsContext.jsx:18-31` keep `hyperweaver_footer_height`, `hyperweaver_footer_is_active`, `hyperweaver_footer_active_view` | the footer is one 13px text row with 12px vertical padding and three fixed slots; the pane and its toolbar are a feature surface and need a place the contract does not name yet, a gap for `../startcloud-ui/notifications.md` | `universal-navbar.md:268-271,602-613`; `UI-GROWTH-GUIDE.md:11` |

## 14. Reserved segments and build folders

Why: once this build is served at `/`, every first segment it routes and every folder it ships is a name no organization may take, and a name missing from the contract's list is a page that never draws.

| what is | required change | deciding source |
| --- | --- | --- |
| `src/App.jsx:46-71` and `src/components/Layout.jsx:129-196` route `login`, `register`, `setup`, `auth`, `console`, `rdp`, `settings`, `dashboard`, `accounts`, `machines`, `hosts`, `host-manage`, `host-networking`, `host-storage`, `host-devices`, `zone-register` and `profile` under `/ui`; `login`, `register`, `setup`, `auth` and `profile` are reserved already | before the move of section 7.1 the other twelve land in the pages contract's reserved list, since a route lands in its contract before any code | `universal-pages.md:136-146`; `priorities.yaml:41` |
| `vite.config.js:79-86` emits `assets/`; `public/images/` (`src/components/SidebarHeader.jsx:26,37`, `index.html:5,21`, `public/manifest.json:7-24`, `public/sw.js:10-11`), `public/locales/`, `public/sw.js`, `public/manifest.json`, `public/robots.txt` and `public/favicon.ico` ship beside it | the contract reserves `assets`, `brand`, `locales`, `fonts` and `themes`; `images` is not among them, so the marks move under `brand/` or `images` joins the list, and a UI backend of this family refuses those names at creation the way it refuses `api` | `universal-pages.md:147-153`; `universal-navbar.md:380` |

## 15. Workflows carry no hand-written checks

Why: the estate runs one tool through one workflow shape per repository class, and an inline script in a workflow is a check nobody maintains and nothing else can run.

| what is | required change | deciding source |
| --- | --- | --- |
| `.github/workflows/ci.yml:52-81` carries an inline node script for locale parity, the same shape as `../startcloud-ui/.github/workflows/ci.yml:49-81` | the check becomes a proper tool in a reusable workflow, the same step in every repository of the class, once the Universal Testing Contract names the tool; until then the shape stays in step with startcloud-ui's | `priorities.yaml:276-281`; `universal-identity.md:309-318`; `UI-GROWTH-GUIDE.md:62` |
| `.github/workflows/prod-build.yml:48-54` fetches the newest `hyperweaver-docs` release into `dist/docs` with `latest` in the URL | CI is the only fetcher and the fetch is pinned, so a build is reproducible from the checkout plus the pinned tarball | `universal-navbar.md:392-397`; `universal-identity.md:298-303` |

## 16. priorities.yaml entries that name this repository

Why: the estate tracker counts these as open against this repository, and without the code lines beside them nobody here can tell what closes each one.

| entry | what is | code |
| --- | --- | --- |
| `design_documents.hyperweaver_ui_brief` (`:103-106`): this file is the brief the hyperweaver family absorbs before converging on the one app | nothing absorbed; `src/App.jsx:33-84` keeps its own providers and no `StatusContext`, `vite.config.js:53` keeps `/ui/` | open |
| `design_documents.hyperweaver_family_briefs` (`:107-114`): the agents move their API under `/api` before the UI can own `/` | `src/api/serverUtils.js:41,61` still addresses Direct mode at the origin root | open, blocked on the agents |
| `design_documents.universal_config` (`:59`) and `uniformity.code.config` (`:189-198`): the hyperweaver family joins when it converges on the shared UI | section 11 | open |
| `uniformity.code.theming` (`:233-237`): one theme system shared with hyperweaver-ui under the preferences and branding contract | `src/contexts/ThemeContext.jsx:20,37` keeps `hyperweaver-theme` in local storage with no write-through; section 7.3 and the native-theme row of section 10 | open |
| `uniformity.ci_cd.testing` (`:276-281`): no workflow carries a hand-written smoke script | section 15 | open, blocked by `:280` |

## 17. notification.md and NAVBAR.md are folded into this file

Why: three files for one repository's asks drift apart, and an item closed in one stays open in the other two.

| what is | required change | deciding source |
| --- | --- | --- |
| `notification.md:1-41` and `NAVBAR.md:1-34` carry the provisioner deep-link request and the six chrome tasks; sections 4, 8, 9, 10 and 13 here carry the same items with their code lines and contract lines | both files are candidates for removal pending the go; until then they stay untouched and every new ask lands here only | this file, sections 4, 8, 9, 10, 13 |



## Other notifications

# Provisioner deep link from the provisioner catalog

The provisioner catalog (`provisioner-catalog`) now draws a Deploy button on
every provisioner page, row and card for a signed-in user whose token carries
a Hyperweaver entry in the `entitlements` claim. It opens Hyperweaver with:

```text
${hyperweaver}/?create=machine&provisioner=<owner/name>&provisioner_version=<version>&provisioner_url=<artifact tar.gz URL>
```

BoxVault opens the same wizard with the box parameters Hyperweaver already
reads in `src/components/Landing.jsx` and `src/components/Machines.jsx`
(`box`, `box_version`, `box_arch`, `box_url`).

## What Hyperweaver needs to do

1. Read `provisioner`, `provisioner_version` and `provisioner_url` from the
   `create=machine` landing exactly as the four box parameters are read, and
   carry them into the create-machine wizard.
2. Pre-select the provisioner in the provisioning step: `provisioner_name` and
   `provisioner_version` in the provisioning document, the same fields
   `ProvisioningRolesTab` stamps when a user picks one.
3. Hand `provisioner_url` to the agent as the download source of the
   provisioner package, so the agent fetches the release artifact directly and
   never needs the catalog reachable from where it runs; the URL is the
   versioned GitHub release asset the catalog publishes, with its `.sha256`
   sidecar beside it.
4. A box link and a provisioner link may arrive together in a later
   iteration; treat them as independent prefills of the same wizard.

Unknown parameters are ignored today, so the catalog's button only lands the
user on the wizard until this is built.

## Where it comes from

- Catalog: `web/src/deploy.jsx` builds the link, `web/src/pages/deploy.jsx`
  (shared with BoxVault) draws the controls; the Hyperweaver origin comes
  from the catalog Worker's `GET /config` (`HYPERWEAVER_URL`).
- Contract: `authorization-server-private/docs/guides/universal-pages.md`,
  the "One table per collection" bullet and the ItemPage bullet.
