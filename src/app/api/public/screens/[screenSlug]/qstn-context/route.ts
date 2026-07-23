import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, locations, villages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { getDepartures } from '@/lib/departures';

const DEFAULT_SECRET = 'sDorf-QSTN-shared-signing-handshake-secret-key-32b';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;
    
    // 1. Retrieve signed token from query parameters
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing verification token' }, { status: 401 });
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Unauthorized: Malformed verification token' }, { status: 401 });
    }

    const [payloadBase64, signature] = parts;
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    
    // Recompute signature to verify integrity
    const secret = process.env.SHARED_SIGNING_SECRET || DEFAULT_SECRET;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadJson)
      .digest('hex');

    if (computedSignature !== signature) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token signature' }, { status: 403 });
    }

    // 2. Validate token payload and expiration (replay protection)
    const payload = JSON.parse(payloadJson);
    if (payload.screenSlug !== screenSlug) {
      return NextResponse.json({ error: 'Unauthorized: Token screen mismatch' }, { status: 403 });
    }

    const now = Date.now();
    if (payload.expiresAt < now) {
      return NextResponse.json({ error: 'Unauthorized: Verification token has expired' }, { status: 403 });
    }

    // 3. Query trusted screen context from SQLite database
    const screensWithLocation = await db
      .select({
        screen: screens,
        location: locations,
        village: villages,
      })
      .from(screens)
      .innerJoin(locations, eq(screens.locationId, locations.id))
      .innerJoin(villages, eq(locations.villageId, villages.id))
      .where(eq(screens.slug, screenSlug))
      .limit(1);

    if (screensWithLocation.length === 0) {
      return NextResponse.json({ error: 'Screen context not found' }, { status: 404 });
    }

    const { screen, location, village } = screensWithLocation[0];

    // 4. Retrieve live SBB/MGB schedule snapshot for this location
    const isLiveMode = process.env.AI_MODE === 'active';
    const departures = await getDepartures(location.id, !isLiveMode);

    // 5. Build structured trusted context payload
    const trustedContext = {
      screen: {
        id: screen.id,
        slug: screen.slug,
        publicName: screen.publicName,
        orientation: screen.orientation,
        softwareVersion: screen.softwareVersion,
      },
      location: {
        id: location.id,
        publicName: location.publicName,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        description: location.description,
        nearbyLandmarks: JSON.parse(location.nearbyLandmarks),
      },
      village: {
        id: village.id,
        name: village.name,
        canton: village.canton,
        timezone: village.timezone,
        defaultLanguage: village.defaultLanguage,
      },
      departures: departures, // Live train schedules
      generatedAt: new Date().toISOString(),
    };

    console.log(`[sDorf Handshake] S2S Screen Context successfully generated and delivered for screen: ${screenSlug}`);

    return NextResponse.json({ context: trustedContext });

  } catch (error) {
    console.error(`[sDorf Context API] Handshake error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
