# BoostBoost — Microsoft 365 Copilot declarative agent

Wires the emotion check-in REST API (`../src/api`) into Teams / Microsoft 365
Copilot as a declarative agent with an API plugin action, so people can log
and review their mood from a normal Copilot chat.

This only works once the REST API is deployed somewhere with a public HTTPS
URL — see `../README.md` → "Deploying the REST API". A declarative agent's
actions are server-to-server HTTP calls; nothing here can call `localhost`.

## What's in `appPackage/`

- `manifest.json` — the Teams app manifest, points at the declarative agent
- `declarativeAgent.json` — the agent's persona/instructions and which
  plugin(s) it can call
- `ai-plugin.json` — the API plugin manifest (Copilot's version of an
  OpenAI-style plugin manifest), describes the 3 callable functions
- `openapi.yaml` — the OpenAPI spec for the 3 emotion-checkin endpoints;
  this is what actually tells Copilot how to call the API
- `color.png` / `outline.png` — **not included**, you need to add these
  (192x192 color icon, 32x32 transparent outline icon) before packaging

## Before you package this

1. **Deploy the API** and get its public HTTPS URL.
2. Set `BOOSTBOOST_API_KEY` on the deployed API to a real secret (the server
   already enforces it — see `src/api/server.ts`).
3. In `openapi.yaml`, replace `https://REPLACE-WITH-YOUR-DEPLOYED-URL` with
   that URL.
4. In `manifest.json`, replace `REPLACE_WITH_YOUR_ORG_NAME` and the
   `REPLACE-WITH-YOUR-DEPLOYED-URL` placeholders (developer info + URLs are
   required fields for Teams app validation).
5. Register the API key in Teams Developer Portal (dev.teams.microsoft.com)
   under "API key" / API plugin auth registrations, and copy the
   registration id into `ai-plugin.json`'s
   `runtimes[0].auth.reference_id` (currently
   `BOOSTBOOST_API_KEY_REGISTRATION_ID`). This step has to be done through
   the portal UI — there's no API for it.
6. Add `color.png` and `outline.png` to this folder.

## Packaging and installing

The easiest path is the **Microsoft 365 Agents Toolkit** VS Code extension
(successor to Teams Toolkit) — open this `teams-agent/` folder in VS Code
with the extension installed, and use its "Zip App Package" / "Preview in
Teams" commands, which validate the manifest against the schema for you.

Manually, packaging is just:

```bash
cd appPackage
zip -r ../boostboost-agent.zip manifest.json declarativeAgent.json ai-plugin.json openapi.yaml color.png outline.png
```

Then in Teams: **Apps → Manage your apps → Upload an app → Upload a custom
app**, and pick the zip. This requires your tenant to allow custom app
upload — check with your Teams/M365 admin if you don't see that option;
it's a tenant-wide setting they control, not something in this repo.

Once installed, find "BoostBoost Check-in" in the Copilot agent picker
(or as an app in Teams) and try: *"I want to check in about how I'm feeling
today"*.

## Known limitations (first pass)

- **User identity is manual.** The agent is instructed to use the person's
  Teams display name as `userId`, but nothing verifies that — there's no
  Entra ID auth wired up yet, so in principle one person could check in as
  another's name. Fine for a first internal pilot; if this matters, the
  next step is switching the plugin auth to Microsoft Entra SSO (OAuth) so
  the API gets a verified user identity instead of a free-text name.
- **Single API key for everyone.** All calls from the agent share one
  `BOOSTBOOST_API_KEY` — there's no per-user API-level authorization, only
  "is this Copilot allowed to call the API at all."
