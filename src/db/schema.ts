import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const villages = sqliteTable('villages', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  canton: text('canton').notNull(),
  timezone: text('timezone').default('Europe/Zurich').notNull(),
  defaultLanguage: text('default_language').default('de').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  villageId: text('village_id').references(() => villages.id).notNull(),
  slug: text('slug').notNull().unique(),
  publicName: text('public_name').notNull(),
  address: text('address').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  description: text('description').notNull(), // Approved location summary (knowledge context)
  nearbyLandmarks: text('nearby_landmarks_json').notNull(), // JSON array
  status: text('status').default('active').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const screens = sqliteTable('screens', {
  id: text('id').primaryKey(),
  locationId: text('location_id').references(() => locations.id).notNull(),
  slug: text('slug').notNull().unique(),
  publicName: text('public_name').notNull(),
  orientation: text('orientation').default('landscape').notNull(), // 'landscape' | 'portrait'
  resolutionWidth: integer('resolution_width').notNull(),
  resolutionHeight: integer('resolution_height').notNull(),
  playlistId: text('playlist_id'),
  qstnSourceId: text('qstn_source_id'),
  status: text('status').default('active').notNull(), // 'active' | 'offline'
  deviceTokenHash: text('device_token_hash').notNull(), // Shared secret hashed for player heartbeat authentication
  defaultLanguage: text('default_language').default('de').notNull(),
  timezone: text('timezone').default('Europe/Zurich').notNull(),
  softwareVersion: text('software_version').notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  villageId: text('village_id').references(() => villages.id).notNull(),
  name: text('name').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const contentItems = sqliteTable('content_items', {
  id: text('id').primaryKey(),
  ownerType: text('owner_type').notNull(), // 'village' | 'host' | 'advertiser'
  ownerId: text('owner_id').notNull(),
  contentType: text('content_type').notNull(), // 'image' | 'video' | 'info_card' | 'live_departures'
  title: text('title').notNull(),
  mediaUrl: text('media_url'),
  bodyJson: text('body_json'), // Metadata/Text depending on content type
  validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
  validUntil: integer('valid_until', { mode: 'timestamp' }).notNull(),
  priority: integer('priority').default(0).notNull(),
  interruptible: integer('interruptible', { mode: 'boolean' }).default(true).notNull(),
  approvalStatus: text('approval_status').default('draft').notNull(), // Safety default: 'draft'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const playlistItems = sqliteTable('playlist_items', {
  id: text('id').primaryKey(),
  playlistId: text('playlist_id').references(() => playlists.id).notNull(),
  contentItemId: text('content_item_id').references(() => contentItems.id).notNull(),
  position: integer('position').notNull(),
  displayDurationSeconds: integer('display_duration_seconds').default(10).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const screenInteractions = sqliteTable('screen_interactions', {
  id: text('id').primaryKey(),
  screenId: text('screen_id').references(() => screens.id).notNull(),
  qstnInteractionId: text('qstn_interaction_id').notNull(),
  questionCategory: text('question_category').notNull(),
  publicQuestion: text('public_question').notNull(),
  publicAnswer: text('public_answer').notNull(),
  publicDisplayReason: text('public_display_reason').notNull(), // Safety auditing tracking reason
  status: text('status').default('queued').notNull(), // 'queued' | 'claimed' | 'displaying' | 'completed' | 'rejected' | 'expired' | 'failed'
  queuedAt: integer('queued_at', { mode: 'timestamp' }).notNull(),
  claimedAt: integer('claimed_at', { mode: 'timestamp' }),
  displayedAt: integer('displayed_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  failedAt: integer('failed_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const screenEvents = sqliteTable('screen_events', {
  id: text('id').primaryKey(),
  screenId: text('screen_id').references(() => screens.id).notNull(),
  eventType: text('event_type').notNull(), // 'heartbeat' | 'cache_sync' | 'playback_error' | 'takeover_start' | 'takeover_complete'
  eventDataJson: text('event_data_json').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const liveDataSnapshots = sqliteTable('live_data_snapshots', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(), // 'sbb' | 'mgb'
  snapshotType: text('snapshot_type').notNull(), // 'departures' | 'weather'
  locationId: text('location_id').references(() => locations.id).notNull(),
  payloadJson: text('payload_json').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
