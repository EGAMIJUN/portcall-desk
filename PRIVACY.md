# PortCall Desk: Privacy Policy

Last updated: 9 November 2026

PortCall Desk is an Atlassian Forge app that runs on Atlassian's infrastructure ("Runs on Atlassian"). It is developed by Jun Egami as an individual developer.

## What the app does with data

- The app reads and writes Jira issues in the site where it is installed, using the permissions `read:jira-work` and `write:jira-work`. It acts as the signed-in user, so every change appears in Jira under that user's name.
- When you create a port call, the app saves what you entered (vessel name, IMO number, berth, ETA and ETD) in the Epic and its tasks, and in an issue property named `portcall` on the Epic. This data stays in your own Jira site.
- The app does not copy Atlassian account IDs, names or email addresses into any storage of its own.

## What the app does not do

- It does not send data to the developer or to any third party. The app makes no calls to external servers (it has no egress).
- It does not store personal data outside your Jira site.
- It does not use cookies, analytics or advertising.

## The Rovo agent and MCP tools

If you talk to the "Husbanding Coordinator" agent in Rovo, or call the app's tools through Atlassian's Rovo MCP server, your messages are processed by Atlassian under Atlassian's own terms and privacy policy. The app itself only receives the values needed to run the action you asked for.

## Removing your data

Uninstalling the app stops all processing. Issues the app created remain in your Jira site; they are ordinary Jira issues and you can delete them, or the `portcall` label, at any time.

## Contact

Questions about this policy: https://github.com/EGAMIJUN/portcall-desk/issues
