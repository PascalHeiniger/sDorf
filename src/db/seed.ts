import { db } from './index';
import { villages, locations, screens, playlists, contentItems, playlistItems, screenInteractions, screenEvents, liveDataSnapshots } from './schema';
import crypto from 'crypto';

async function main() {
  console.log('[sDorf Seeder] Starting database seeding for Andermatt Screen Network...');

  // 1. Clear existing records in correct topological order to prevent FOREIGN KEY constraint violations
  await db.delete(screenInteractions);
  await db.delete(screenEvents);
  await db.delete(liveDataSnapshots);
  await db.delete(playlistItems);
  await db.delete(contentItems);
  await db.delete(screens);
  await db.delete(playlists);
  await db.delete(locations);
  await db.delete(villages);

  const now = new Date();
  const farFuture = new Date('2030-12-31T23:59:59.000Z');

  // 2. Insert Village (Andermatt)
  const villageId = 'vil_andermatt';
  await db.insert(villages).values({
    id: villageId,
    slug: 'andermatt',
    name: 'Andermatt',
    canton: 'UR',
    timezone: 'Europe/Zurich',
    defaultLanguage: 'de',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✓ Seeded Village: Andermatt');

  // 3. Insert Location (Andermatt Station)
  const locationId = 'loc_andermatt_station';
  await db.insert(locations).values({
    id: locationId,
    villageId: villageId,
    slug: 'andermatt-station',
    publicName: 'Andermatt Bahnhof',
    address: 'Bahnhofplatz 3, 6490 Andermatt',
    latitude: 46.6322,
    longitude: 8.5956,
    description: 'Andermatt Bahnhof serves as a primary hub linking the Matterhorn Gotthard Bahn (MGB) and SBB networks. Located in the heart of the Urseren Valley.',
    nearbyLandmarks: JSON.stringify([
      { name: 'Gemsstock Cable Car', distance: '850m' },
      { name: 'Andermatt Reuss Golf Course', distance: '1.2km' },
      { name: 'Radisson Blu Reussen', distance: '400m' },
    ]),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✓ Seeded Location: Andermatt Station');

  // 4. Create Playlist
  const playlistId = 'pl_andermatt_default';
  await db.insert(playlists).values({
    id: playlistId,
    villageId: villageId,
    name: 'Andermatt Station Welcome Loop',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✓ Seeded Playlist: Andermatt Station Welcome Loop');

  // 5. Create Content Items (approved status set explicitly)
  const welcomeCardId = 'con_welcome';
  const marketCardId = 'con_market';
  const hotelAdlerCardId = 'con_adler';
  const departuresCardId = 'con_departures';

  await db.insert(contentItems).values([
    {
      id: welcomeCardId,
      ownerType: 'village',
      ownerId: 'vil_andermatt',
      contentType: 'info_card',
      title: 'Willkommen in Andermatt',
      mediaUrl: '',
      bodyJson: JSON.stringify({
        headline: 'Willkommen in Andermatt',
        body: 'Geniessen Sie Ihren Aufenthalt im Urserntal. Scannen Sie den QR-Code unten rechts, um direkt Fragen zu stellen, Ausflugsziele zu finden oder Fahrpläne abzurufen.',
        footer: 'Ursern Tourismus • sDorf'
      }),
      validFrom: now,
      validUntil: farFuture,
      priority: 0,
      interruptible: true,
      approvalStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: marketCardId,
      ownerType: 'village',
      ownerId: 'vil_andermatt',
      contentType: 'info_card',
      title: 'Andermatter Herbstmarkt',
      mediaUrl: '',
      bodyJson: JSON.stringify({
        headline: 'Andermatter Herbstmarkt',
        body: 'Besuchen Sie den traditionellen Herbstmarkt auf dem Gemeindeplatz! Lokale Spezialitäten, Handwerk und Geselligkeit erwarten Sie.',
        footer: 'Samstag, 12. September • 09:00 - 18:00'
      }),
      validFrom: now,
      validUntil: farFuture,
      priority: 0,
      interruptible: true,
      approvalStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hotelAdlerCardId,
      ownerType: 'host',
      ownerId: 'host_hotel_adler',
      contentType: 'info_card',
      title: 'Hotel Adler Restaurant',
      mediaUrl: '',
      bodyJson: JSON.stringify({
        headline: 'Gasthaus Adler Andermatt',
        body: 'Lust auf traditionelle Schweizer Küche? Geniessen Sie exzellentes Raclette und Fondue in unserer gemütlichen, historischen Gaststube.',
        footer: 'Gotthardstrasse 50 • 200m von hier'
      }),
      validFrom: now,
      validUntil: farFuture,
      priority: 0,
      interruptible: true,
      approvalStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: departuresCardId,
      ownerType: 'village',
      ownerId: 'loc_andermatt_station',
      contentType: 'live_departures',
      title: 'Abfahrten Bahnhof Andermatt',
      mediaUrl: '',
      bodyJson: JSON.stringify({
        provider: 'mgb',
        locationName: 'Andermatt Bahnhof'
      }),
      validFrom: now,
      validUntil: farFuture,
      priority: 0,
      interruptible: true,
      approvalStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    }
  ]);
  console.log('✓ Seeded Content Items (Approved)');

  // 6. Connect Content Items to Playlist
  await db.insert(playlistItems).values([
    { id: 'pli_welcome', playlistId, contentItemId: welcomeCardId, position: 1, displayDurationSeconds: 10, createdAt: now },
    { id: 'pli_market', playlistId, contentItemId: marketCardId, position: 2, displayDurationSeconds: 10, createdAt: now },
    { id: 'pli_adler', playlistId, contentItemId: hotelAdlerCardId, position: 3, displayDurationSeconds: 10, createdAt: now },
    { id: 'pli_departures', playlistId, contentItemId: departuresCardId, position: 4, displayDurationSeconds: 15, createdAt: now },
  ]);
  console.log('✓ Connected Content Items to Playlist');

  // 7. Seed Screen (Andermatt Station Kiosk 1)
  const deviceToken = 'andermatt-secret-token-1234';
  const deviceTokenHash = crypto.createHash('sha256').update(deviceToken).digest('hex');

  await db.insert(screens).values({
    id: 'scr_andermatt_station_01',
    locationId: locationId,
    slug: 'andermatt-station-01',
    publicName: 'Andermatt Bahnhof Kiosk 01',
    orientation: 'landscape',
    resolutionWidth: 1920,
    resolutionHeight: 1080,
    playlistId: playlistId,
    qstnSourceId: 'src_andermatt_station_01',
    status: 'active',
    deviceTokenHash: deviceTokenHash,
    defaultLanguage: 'de',
    timezone: 'Europe/Zurich',
    softwareVersion: 'v1.0.0',
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✓ Seeded Screen: andermatt-station-01 (Device Secret: "${deviceToken}")`);

  console.log('[sDorf Seeder] Database seeded successfully!');
}

main().catch((err) => {
  console.error('[sDorf Seeder] Seeding failed:', err);
  process.exit(1);
});
