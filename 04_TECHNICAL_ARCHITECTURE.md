# 04 — Technical Architecture

## 1. Architectural approach

Use a modular monolith for the village screen V1.

Recommended stack:

- Next.js App Router
- TypeScript strict mode
- PostgreSQL
- Drizzle or Prisma
- Vercel
- object storage for media
- simple real-time channel or short polling
- QSTN API
- one approved live-data connector
- browser-based screen player

Do not begin with microservices, Kubernetes, Kafka, custom model hosting, or native applications.

## 2. System map

```text
Visitor phone
    │
    └── QSTN mobile interaction page
            │
            ├── QSTN API and AI pipeline
            │       ├── QSTN knowledge snapshot
            │       └── approved context from village platform
            │
            └── private answer

Village admin
    │
    └── Village platform admin
            ├── locations
            ├── screens
            ├── playlists
            ├── content
            ├── knowledge approval
            └── review queue

Screen browser
    │
    └── Screen player
            ├── fetch programme
            ├── cache media
            ├── report heartbeat
            ├── receive approved interaction
            └── render takeover

Village backend
    ├── PostgreSQL
    ├── media storage
    ├── live-data cache
    ├── QSTN service client
    └── real-time/polling endpoint
```

## 3. Repository strategy

Keep separate repositories.

```text
QSTN repository
    ├── generic interaction service
    ├── mobile question UI
    ├── AI pipeline
    ├── knowledge and analytics
    └── public-output schema

Village screen repository
    ├── admin
    ├── screen player
    ├── playlist engine
    ├── locations and devices
    ├── local data connectors
    ├── QSTN client
    └── operational analytics
```

Optionally create a small shared package later for generated API types. Do not prematurely create a complex monorepo.

## 4. Core village entities

### `villages`

```text
id
slug
name
canton
timezone
default_language
status
created_at
updated_at
```

### `locations`

```text
id
village_id
slug
public_name
address
latitude nullable
longitude nullable
description
nearby_landmarks_json
host_id nullable
status
created_at
updated_at
```

### `hosts`

```text
id
name
contact_name
contact_email
contact_phone
commercial_terms_json nullable
status
created_at
updated_at
```

### `screens`

```text
id
location_id
slug
public_name
device_token_hash
orientation
resolution_width
resolution_height
timezone
default_language
playlist_id nullable
qstn_source_id nullable
status
last_seen_at nullable
software_version nullable
created_at
updated_at
```

### `playlists`

```text
id
village_id
name
status
default_item_duration_seconds
created_at
updated_at
```

### `content_items`

```text
id
owner_type
owner_id
content_type
title
media_url nullable
body_json
valid_from
valid_until
priority
interruptible
approval_status
source_label nullable
created_at
updated_at
```

### `playlist_items`

```text
id
playlist_id
content_item_id
position
weight nullable
display_duration_seconds
schedule_rules_json nullable
created_at
```

### `screen_interactions`

```text
id
screen_id
qstn_interaction_id
question_category
public_question
public_answer
status
reason_code
queued_at nullable
displayed_at nullable
completed_at nullable
expires_at nullable
created_at
```

### `screen_events`

```text
id
screen_id
event_type
event_data_json
created_at
```

### `live_data_snapshots`

```text
id
connector_type
location_id
source_name
payload_json
retrieved_at
valid_until
status
created_at
```

## 5. Screen player routes

Suggested public route:

```text
/display/[screenSlug]
```

Suggested endpoints:

```text
POST /api/screens/register
POST /api/screens/heartbeat
GET  /api/screens/[screenId]/programme
GET  /api/screens/[screenId]/interaction
POST /api/screens/[screenId]/events
```

For V1, `GET /interaction` may use short polling every 1–2 seconds.

A managed real-time service may replace polling when justified.

## 6. Mobile QR route

The QR can resolve directly to QSTN with the screen source:

```text
https://qstn.example/s/andermatt-station-01
```

Or to a village route that redirects:

```text
https://village.example/q/andermatt-station-01
```

The redirect model allows the village platform to:

- disable lost or compromised QR codes
- measure scans
- change QSTN destination
- support future provider changes

Recommended V1 flow:

```text
QR
  ↓
Village redirect endpoint
  ↓
Record scan event
  ↓
302 redirect to QSTN source page
```

## 7. Screen player state machine

```text
BOOTING
  ↓
SYNCING
  ↓
PLAYING
  ├── priority content → PLAYING_PRIORITY
  ├── approved interaction → INTERACTION_PENDING
  ├── connection lost → OFFLINE_PLAYBACK
  └── fatal error → RECOVERING

INTERACTION_PENDING
  ├── current item interruptible → SHOWING_INTERACTION
  └── current item protected → wait until safe boundary

SHOWING_INTERACTION
  ↓
RETURN_TRANSITION
  ↓
PLAYING

OFFLINE_PLAYBACK
  ├── connection restored → SYNCING
  └── cached media continues

RECOVERING
  ↓
restart player
  ↓
SYNCING
```

## 8. Player requirements

The player must:

- run in kiosk mode
- cache the current programme
- continue offline where possible
- preload upcoming media
- avoid blank screens
- send heartbeat
- report playback events
- ignore expired content
- support portrait or landscape
- render a persistent QR invitation
- validate public-output expiry
- recover after reload
- return to programme automatically
- show a controlled offline fallback

## 9. QSTN orchestration route

Village backend example:

```text
POST /api/interactions/ask
```

Responsibilities:

1. validate screen
2. load screen, location, village, and active-content context
3. load valid live-data snapshot
4. call QSTN server-side
5. save interaction linkage
6. return private-answer payload or QSTN mobile URL flow
7. queue approved public output
8. record analytics

Where the QSTN mobile page handles the call directly, the village platform should provide a signed context endpoint instead.

## 10. Context endpoint

```http
GET /api/public/screens/{slug}/qstn-context
```

Example:

```json
{
  "screenId": "scr_andermatt_station_01",
  "location": {
    "id": "loc_andermatt_station",
    "name": "Andermatt railway station",
    "village": "Andermatt",
    "timezone": "Europe/Zurich"
  },
  "activeContent": {
    "id": "cnt_014",
    "type": "community"
  },
  "knowledgeSnapshotVersion": "ks_2026_07_23_01",
  "liveDataSnapshot": {
    "id": "live_882",
    "validUntil": "2026-07-23T12:02:00+02:00"
  },
  "publicOutputRequested": true,
  "signature": "..."
}
```

Do not expose host contact details, internal notes, commercial terms, or device credentials.

## 11. Public-output queue

Queue selection logic:

1. remove expired items
2. reject items failing local policy
3. reject duplicates
4. respect screen cooldown
5. respect maximum queue size
6. respect priority content
7. choose oldest eligible item
8. atomically mark as claimed
9. return to one screen only
10. record completion or timeout

## 12. Media strategy

V1 supports:

- image
- short muted video
- HTML information card
- public QSTN interaction card

Avoid arbitrary third-party webpages inside the screen player.

Media should be:

- prevalidated
- stored with metadata
- optimized for the display
- assigned a validity window
- cached locally by the browser

## 13. Admin interface

Minimum screens:

- pilot overview
- screens and health
- content items
- playlist
- knowledge approval
- interactions
- review queue
- analytics summary

Do not build a polished multi-tenant client portal in V1.

## 14. Security

- hash device tokens
- rotate compromised credentials
- strict content security policy
- server-side secrets only
- signed context
- rate limit public questions
- validate all URLs against whitelist
- sanitize all rendered text
- no arbitrary HTML from AI
- immutable event log for critical actions
- audit knowledge approval
- minimize personal data retention

## 15. Privacy

V1 should avoid persistent identity.

Recommended:

- no accounts for visitors
- no camera
- no precise device fingerprint
- short-lived anonymous session identifier
- minimal IP retention
- retention schedule for raw questions
- redact personal data
- aggregated reporting
- clear public notice

Swiss and applicable European privacy requirements should be reviewed professionally before broader rollout.

## 16. Observability

Track:

- API errors
- QSTN latency
- screen heartbeat
- stale programme
- failed media
- public-output rejection
- live connector failure
- player restart count
- queue delay
- expired interaction count

V1 may use a simple error-monitoring service and structured logs.

## 17. Deployment environments

Use:

- local
- preview
- production

Maintain separate:

- databases
- service credentials
- QSTN keys
- screen tokens
- live-data settings

Never use a production screen token in development.
