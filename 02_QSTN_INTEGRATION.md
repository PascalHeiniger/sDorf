# 02 — QSTN Integration

## 1. Purpose

QSTN is the reusable interaction layer that allows a person to question a piece of media or a physical screen.

The village screen network consumes QSTN as a service. It must not absorb QSTN into its own domain model, and QSTN must not become a signage-management product.

## 2. Product ownership boundary

### QSTN owns

- public question page
- interaction session
- source context
- question normalization
- language detection
- input moderation
- approved knowledge retrieval
- grounded answer generation
- uncertainty handling
- public-output transformation
- semantic category and intent
- source citations
- destination recommendation
- helpfulness feedback
- question analytics
- knowledge-gap signals

### Village screen network owns

- villages
- locations
- physical screens
- device registration
- online health
- playlists
- schedule rules
- media playback
- advertising slots
- public-output queue
- interruption priority
- live local data connectors
- host and municipal relationships
- physical installation
- hardware maintenance
- commercial revenue allocation

## 3. Core integration rule

> QSTN decides what a safe, grounded answer can be. The screen network decides whether and when that output is shown on a physical screen.

QSTN must never directly control screen playback.

## 4. Generic QSTN source context

QSTN should support multiple source types without embedding village-specific assumptions.

```typescript
type QstnSourceType =
  | "campaign"
  | "screen"
  | "poster"
  | "billboard"
  | "packaging"
  | "website"
  | "exhibition"
  | "event_display"
  | "other";

interface QstnInteractionContext {
  sourceType: QstnSourceType;
  sourceId: string;
  businessId?: string;
  campaignId?: string;
  locationId?: string;
  activeContentId?: string;
  languageHint?: string;
  timezone?: string;
  metadata?: Record<string, string>;
  publicOutputRequested: boolean;
}
```

The generic `metadata` field is useful for early pilots, but frequently used values should later become typed fields.

## 5. Ask request

Recommended service boundary:

```http
POST /api/v1/interactions
```

Example:

```json
{
  "question": "Where is the nearest public toilet?",
  "context": {
    "sourceType": "screen",
    "sourceId": "andermatt-station-01",
    "locationId": "andermatt-station",
    "activeContentId": "community-card-014",
    "languageHint": "en",
    "timezone": "Europe/Zurich",
    "publicOutputRequested": true,
    "metadata": {
      "village": "Andermatt",
      "host": "Pilot Host"
    }
  }
}
```

## 6. QSTN response

```typescript
interface QstnInteractionResponse {
  interactionId: string;
  status: "answered" | "fallback" | "blocked" | "error";
  privateAnswer: {
    interpretedQuestion: string;
    answer: string;
    confidence: number;
    language: string;
    sourceIds: string[];
    sourceLabels?: string[];
    freshnessLabel?: string;
    destination?: {
      label: string;
      url: string;
    };
  };
  publicOutput: {
    approved: boolean;
    reasonCode: string;
    publicQuestion?: string;
    publicAnswer?: string;
    durationSeconds?: number;
    expiresAt?: string;
  };
  insight: {
    category: string;
    intent: string;
    requiresLiveData: boolean;
    knowledgeGap: boolean;
    requiresHumanReview: boolean;
  };
}
```

## 7. Screen network ingestion

When `publicOutput.approved` is true, the village screen backend:

1. verifies the QSTN signature
2. verifies that the source ID belongs to the requesting screen
3. checks `expiresAt`
4. checks local priority rules
5. checks cooldown and queue limits
6. writes a `screen_interaction` record
7. pushes or exposes the item to the screen player
8. records display start and completion

The network may still reject an otherwise approved QSTN output.

## 8. Authentication

### Screen to village backend

Use a screen-specific device credential or signed token.

### Village backend to QSTN

Use a server-side service credential.

### QSTN callback or response verification

Use:

- signed server-to-server requests
- timestamp
- nonce or request ID
- replay protection
- strict source ID validation

Never expose QSTN service secrets in the browser or screen player.

## 9. Knowledge ownership

Knowledge may be associated with:

- a business
- a campaign
- a QSTN source
- a location
- a village
- a live-data connector

QSTN should receive approved, versioned knowledge snapshots.

The village platform remains responsible for:

- gathering local facts
- assigning owners
- setting validity dates
- approving publication
- removing outdated facts

QSTN remains responsible for:

- retrieving relevant approved items
- citing exact knowledge IDs
- refusing to invent missing facts
- identifying knowledge gaps

## 10. Existing QSTN entities

The existing QSTN concepts remain valid:

- businesses
- campaigns
- knowledge items
- sessions
- questions
- answers
- events
- reports

The integration should extend rather than replace them.

### Recommended additions

#### `sources`

```text
id
source_type
external_source_id
business_id nullable
campaign_id nullable
name
status
default_language
timezone
metadata_json
created_at
updated_at
```

#### Extend `sessions`

```text
source_id
external_session_id nullable
```

#### Extend `questions`

```text
source_id
public_question
public_display_approved
public_display_reason
requires_live_data
```

#### Extend `answers`

```text
private_answer
public_answer
public_output_expires_at
source_ids_json
requires_human
knowledge_gap
```

These additions remain generic enough for QSTN's broader product.

## 11. Shared identifiers

Do not use display names as identifiers.

Recommended pattern:

```text
Village platform screen ID:
scr_andermatt_station_01

QSTN source ID:
src_qstn_8f2...

External source ID stored by QSTN:
scr_andermatt_station_01
```

The village platform is authoritative for the physical screen. QSTN is authoritative for its source record.

## 12. Live-data integration

The preferred V1 boundary is:

1. village platform fetches or caches live local data
2. village platform passes a normalized snapshot to QSTN
3. QSTN uses it as approved time-sensitive context
4. QSTN returns an expiry timestamp
5. village platform refuses expired public output

This keeps local integrations outside QSTN.

Example normalized context:

```json
{
  "type": "transport_departures",
  "source": "approved-provider",
  "location": "Andermatt station",
  "retrievedAt": "2026-07-23T12:00:00+02:00",
  "validUntil": "2026-07-23T12:02:00+02:00",
  "items": [
    {
      "destination": "Göschenen",
      "departure": "12:14",
      "platform": "1"
    }
  ]
}
```

## 13. Analytics separation

### QSTN metrics

- questions
- answer rate
- answer quality
- categories
- intent
- knowledge gaps
- destination clicks
- response time
- moderation outcomes

### Village network metrics

- QR scans by screen
- screen uptime
- playlist playback
- public-display queue
- public-display completion
- content scheduling
- advertiser placement
- host participation

### Shared join key

Use `interactionId` and `sourceId` to join reports without combining the two systems into one database.

## 14. Commercial boundary

Even under common ownership, record an internal QSTN usage cost.

Possible future charging units:

- active source per month
- answered question
- public-output transformation
- report generation
- enterprise API package

This makes it possible to understand whether each product can stand independently.

## 15. Failure behaviour

### QSTN unavailable

- screen programme continues
- QR page shows a controlled service message
- no public output is queued
- error is logged

### Village screen offline

- visitor still receives the private QSTN answer where possible
- public display is marked unavailable
- QSTN does not retry indefinitely

### Live source unavailable

- QSTN must not use stale data beyond its validity
- user receives a transparent fallback
- public display is normally rejected

## 16. Versioning

Version the contract from the beginning:

```text
/api/v1/interactions
```

Every response should include:

- schema version
- prompt or policy version
- knowledge snapshot version
- model name
- request timestamp

This enables later evaluation and debugging.
