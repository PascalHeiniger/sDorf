# 05 — Operations and Manual Work

## 1. Operating principle

The AI should automate preparation, classification, summarization, and recommendation.

Human work should be concentrated into defined blocks for:

- factual approval
- commercial decisions
- content scheduling
- exceptions
- physical maintenance

The operator should not be interrupted throughout the day by ordinary questions.

## 2. Work block A — Screen onboarding

### Trigger

A new screen or host location is approved.

### Batch size

Prefer onboarding several screens in one block once the pilot expands.

### Checklist

#### Commercial and host information

- host name
- contact
- placement agreement
- electricity and connectivity responsibility
- access arrangements
- content allowance
- incident contact
- commercial terms

#### Physical information

- exact location
- display orientation
- screen dimensions
- brightness requirements
- power
- network
- mounting
- window glare
- ventilation
- security
- public visibility
- accessibility

#### Platform configuration

- village
- location
- screen ID
- public slug
- device credential
- playlist
- QR token
- QSTN source
- language
- timezone
- interruption policy
- host content
- monitoring

#### Knowledge context

- public location name
- nearby landmarks
- public facilities
- official contacts
- approved sources
- allowed topics
- known exclusions
- live connector location mapping

#### Testing

- QR resolves correctly
- private answer works
- public answer queues
- blocked question remains private
- programme returns correctly
- offline programme works
- heartbeat appears
- expired content does not play

### Target time

Pilot: 2–3 hours per first screen.

Mature concierge process: 30–60 minutes per standard screen after physical installation.

## 3. Work block B — Knowledge approval

### Frequency

Once per week during the pilot.

### AI preparation

The system produces:

- proposed new facts
- expired facts
- conflicting facts
- repeated unanswered questions
- low-confidence answers
- suggested FAQ entries
- suggested programme cards
- source links
- change summary

### Human decisions

For each item:

- approve
- edit
- reject
- request source
- assign owner
- set validity
- mark out of scope

### Rule

No AI-generated local fact becomes approved knowledge without human confirmation.

## 4. Work block C — Content and scheduling

### Frequency

Once per week, plus one optional short event update.

### Tasks

- import upcoming events
- verify dates
- upload host content
- upload local adverts
- set validity windows
- assign priorities
- review visual quality
- check content balance
- preview programme
- publish schedule

### AI support

The AI may:

- rewrite supplied text to screen length
- create language variants
- detect missing dates
- flag unclear calls to action
- suggest sequence
- detect duplicate information
- create alt text
- propose programme balance

### Human responsibility

The operator approves:

- wording
- factual claims
- placement
- advertiser eligibility
- priority
- commercial duration
- final publication

## 5. Work block D — Interaction and exception review

### Frequency

Once or twice per week.

### Review categories

- blocked public outputs
- low-confidence answers
- negative feedback
- prompt injections
- possible personal data
- repeated knowledge gaps
- slow responses
- live-data failures
- unusual scan volume
- queue failures

### AI summary format

```text
Critical
- 1 possible factual error
- 0 possible personal-data leaks

Needs decision
- 6 questions about parking price
- 4 questions about children's activities
- 3 failed live departure requests

Informational
- 28 successful answers
- 14 public displays
- 9 destination clicks
```

The operator should open individual records only when needed.

## 6. Work block E — Commercial review

### Frequency

Weekly or every two weeks.

### Inputs

- advertiser interest
- content occupancy
- QR scans
- categories
- destination clicks
- common local needs
- host feedback
- public response
- operating costs

### Outputs

- advertiser follow-up list
- host follow-up list
- potential sponsored information
- campaign improvement
- pilot pricing evidence
- partnership opportunities

The system may suggest leads, but it must not automatically contact or sell to businesses.

## 7. Work block F — Physical maintenance

### Frequency

Scheduled inspection plus incident response.

### Inspection

- screen power
- brightness
- cleanliness
- mounting
- cable safety
- ventilation
- browser state
- QR readability
- network stability
- host concerns

### Incident alerts

Immediate notification only for:

- screen offline beyond threshold
- repeated player crash
- overheating signal where available
- expired or empty programme
- compromised credential
- safety or privacy incident

Do not create notifications for routine low-confidence questions.

## 8. Recommended pilot rhythm

### Monday — 60 to 90 minutes

- approve knowledge updates
- add events
- review expiring content
- schedule programme
- test live data
- publish weekly programme

### Friday — 30 to 45 minutes

- review analytics
- inspect exceptions
- review top questions
- identify knowledge gaps
- note business leads
- prepare a short pilot summary

### Monthly — 60 minutes

- host check-in
- physical inspection
- commercial review
- cost review
- decision on next experiment

## 9. Roles for V1

One person may hold several roles, but responsibilities should remain explicit.

### Product operator

- overall quality
- schedule
- partnerships
- commercial decisions

### Knowledge approver

- verifies local facts
- manages validity
- resolves conflicts

### Content editor

- formats information
- manages playlist
- prepares adverts

### Technical operator

- deployment
- screen health
- credentials
- incidents

### Host contact

- physical access
- reports issues
- supplies host content

## 10. Operational service levels

Suggested pilot targets:

- ordinary content correction: next weekly block
- urgent incorrect fact: same day
- broken screen: acknowledge within working day
- privacy or safety incident: immediate response
- live connector outage: controlled fallback, no manual emergency unless prolonged
- host content request: included in next scheduled content block

## 11. Knowledge ownership table

Every fact must define:

```text
Fact
Source
Owner
Approved by
Approved at
Valid from
Valid until
Affected screens
Review frequency
```

Facts without an owner or validity policy should not be used for time-sensitive answers.

## 12. Pilot documentation

Maintain:

- screen inventory
- host agreement
- installation photos
- QR mapping
- approved source register
- content calendar
- incident log
- interaction review log
- maintenance log
- weekly pilot report
- cost ledger

## 13. Cost discipline

Record actual time separately for:

- software development
- content preparation
- sales
- onboarding
- installation
- knowledge maintenance
- support
- hardware maintenance

Without this separation, the pilot may look profitable only because founder labour is hidden.

## 14. Automation backlog criteria

Automate a manual task only when:

- it repeats frequently
- the input pattern is understood
- mistakes are recoverable
- automation saves meaningful time
- the task does not require human accountability

Do not automate merely because it is technically possible.
