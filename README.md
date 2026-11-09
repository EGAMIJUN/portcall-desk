# PortCall Desk

Husbanding checklists for vessel calls, inside Jira. Built for Atlassian Codegeist 2026 (category: Apps for Specialized Industries).

A ship's agent gets an arrival notice: vessel, ETA, ETD, berth. Today the checklist lives in Excel and in someone's head. PortCall Desk turns that notice into one Jira Epic for the vessel and a standard set of husbanding tasks (port entry notification, customs/NACCS, quarantine, immigration, berth, pilot, tugs, line handlers, bunkers, provisions, crew change, waste, departure clearance, final accounts) with due dates computed from ETA and ETD. When the ETA moves, one sentence to the agent moves every open due date.

## What is in it
- **Rovo agent "Husbanding Coordinator"** with four actions: create port call, update ETA, get status, list port calls. Writes and reads Jira as the signed-in user.
- **Rovo MCP module** exposing the same four actions as tools.
- **Jira global page "PortCall Desk"** (UI Kit): all port calls with progress, overdue and due-in-24h counts, and a form to create one.
- The task template and its offsets live in `src/schedule.js`. They are defaults for a Japanese port call, not legal advice.

## Develop
    npm install
    npm test                 # unit tests, including a fake in-memory Jira
    forge login              # Atlassian email + API token (https://id.atlassian.com/manage-profile/security/api-tokens)
    forge register           # first time only; writes the app id into manifest.yml
    forge lint
    forge deploy
    forge install            # Jira, your site
    forge tunnel             # optional, live reload while developing

## Layout
    manifest.yml             modules, scopes
    src/schedule.js          task template + date helpers (pure)
    src/jira.js              Jira REST calls
    src/portcall.js          create / update ETA / status / list
    src/actions.js           Rovo action handlers
    src/resolver.js          resolver for the Jira page
    src/frontend/index.jsx   UI Kit page
    resource/agent/prompts   agent instructions
