# 01 — V1 Product Scope

## 1. Product statement

The V1 is a single-screen pilot for a local digital information and advertising network.

The screen continuously displays a scheduled local programme. Each physical screen has a unique QR code. A visitor scans the code, asks a question related to the place, receives a grounded answer on their phone, and may see a short sanitized version displayed publicly on the screen.

## 2. V1 promise

### To visitors

> Ask this place a question. Receive an immediate, useful answer without creating an account.

### To local hosts

> Receive a professionally managed screen that remains useful to the public and can carry approved host content.

### To advertisers

> Reach people in a specific physical location and learn what engaged viewers actually want to know.

### To the operator

> Test whether one centrally managed screen can combine useful local information, advertising, public interaction, and actionable question data.

## 3. Core user flow

```text
Idle programme
    ↓
Visitor notices persistent QR invitation
    ↓
Visitor scans screen-specific QR code
    ↓
Mobile page loads with screen and location context
    ↓
Visitor asks one question
    ↓
QSTN moderates, retrieves approved knowledge, and generates an answer
    ↓
Private answer appears on phone
    ↓
Optional sanitized public answer enters screen queue
    ↓
Screen displays public answer for 10–15 seconds
    ↓
Screen returns to programme
```

## 4. Idle screen

The display runs continuously even when nobody interacts.

### Required V1 content types

- local information card
- current or upcoming event card
- host-business card
- demonstration advertisement
- one live-data card
- persistent interaction invitation

### Persistent invitation

The invitation should remain visible without dominating the programme.

Example:

> Ask this screen  
> Scan to ask about this place

The QR code must resolve to the exact physical screen, not merely the village.

## 5. Screen-specific identity

Every screen has:

- immutable internal ID
- public slug
- village ID
- location ID
- host ID
- physical description
- display resolution and orientation
- timezone
- default language
- assigned playlist
- QR token
- approved location context
- allowed knowledge sources
- interruption rules
- current online status

Example route:

```text
/app/s/andermatt-station-01
```

The visitor does not manually choose a village or location.

## 6. Mobile experience

### Screen A — Ask

Contains:

- location or screen identity
- optional image of the current screen content
- concise invitation
- large question field
- ask button
- privacy notice
- no login requirement

### Screen B — Processing

Use restrained language such as:

> Checking approved local information…

Do not imitate a person typing.

### Screen C — Answer

Contains:

- interpreted question
- concise grounded answer
- confidence-aware fallback when information is missing
- one useful next action
- optional source and freshness indicator
- helpful / not helpful control
- statement indicating whether the answer may appear publicly

## 7. One-question boundary

V1 allows:

- one question
- one answer
- one optional suggested follow-up
- one destination action

V1 does not provide:

- open-ended chat
- conversation memory
- user profiles
- account creation
- personalized recommendations based on identity

A visitor may start a new independent question after completing the interaction.

## 8. Private and public output

Every successful interaction may generate two outputs.

### Private answer

Displayed on the visitor's phone.

It may:

- include more detail
- contain a destination link
- explain uncertainty
- cite sources
- provide contact information from approved sources

### Public output

Displayed on the physical screen only when approved.

It must:

- be anonymous
- remove personal information
- preserve intent without repeating offensive wording
- be understandable out of context
- be readable from several metres away
- avoid URLs
- avoid unsupported claims
- remain time-valid for the display window
- fit a strict character or line limit

Suggested V1 limits:

- public question: maximum 90 characters
- public answer: maximum 140 characters
- maximum two answer lines
- display duration: 10–15 seconds

## 9. Public display rules

An answer may display publicly only if:

- moderation passes
- the information is grounded
- confidence exceeds the configured threshold
- the output contains no personal data
- the topic is appropriate for a mixed public audience
- the information will remain valid throughout display
- the screen is not showing priority content
- the public queue is available

The phone answer must not depend on public display approval.

## 10. Screen takeover behaviour

The screen should behave predictably.

### Default rules

- finish the current uninterruptible item
- interrupt only at a safe transition point
- display one public interaction at a time
- queue no more than three interactions
- apply a cooldown between public takeovers
- deduplicate repeated questions
- discard expired answers
- return automatically to the programme
- never show full chat history
- never reveal who asked

### Priority order

1. emergency or safety message
2. mandatory municipal notice
3. paid uninterruptible campaign
4. approved public question
5. normal programme

## 11. V1 knowledge scope

The first pilot should use only three information classes.

### Static approved knowledge

Examples:

- public facilities
- directions
- local services
- host information
- parking locations
- museum information
- emergency contacts

### Scheduled knowledge

Examples:

- events
- temporary closures
- offers
- public notices

Every scheduled item requires:

- valid-from timestamp
- valid-until timestamp
- source
- owner
- approval status

### One live integration

V1 should integrate exactly one live source.

Recommended pilot example:

- public transport departures for the nearest station

The aim is to prove live context, not to integrate every available local feed.

## 12. Content balance

The screen should not feel like an advertising loop.

A testable starting ratio:

- 50% useful local and community information
- 30% host and local-business content
- 20% commercial advertising

This ratio is provisional and should be evaluated during the pilot.

## 13. Required analytics

Track:

- screen page views
- QR scans
- question starts
- submitted questions
- answered questions
- low-confidence fallbacks
- moderation blocks
- public-display approvals
- public-display completions
- answer response time
- destination clicks
- helpful / not helpful votes
- question categories
- knowledge gaps
- screen online status
- playlist impressions

Do not claim verified advertising impressions merely because an item played.

## 14. V1 success criteria

### Behaviour

- at least 20 genuine questions during the test period
- at least 30% of completed scans produce a submitted question
- at least 70% of rated answers marked helpful
- repeat use or multiple independent users without staff instruction

### Quality

- zero raw questions published publicly
- zero personal data leaks
- zero known fabricated factual answers in the approved benchmark
- at least 90% correct handling of test questions
- clear fallback for unsupported questions

### Operations

- weekly content and knowledge maintenance below two hours for one screen
- screen recovers automatically after browser or network interruption
- all time-sensitive content expires automatically
- one operator can inspect errors through a single review queue

### Commercial learning

- at least three businesses understand the offer
- at least one credible advertiser or host expresses willingness to pay or participate
- question data produces at least three actionable local insights

## 15. Explicitly excluded from V1

- camera analytics
- facial recognition
- audience demographic estimation
- voice input
- NFC
- native mobile applications
- self-service advertiser marketplace
- automated auctioning
- automated revenue splitting
- municipality accounts
- multiple villages
- full chatbot conversations
- custom display hardware
- complex billing
- predictive personalization
- user accounts
- blockchain
- autonomous publication of AI-generated facts
