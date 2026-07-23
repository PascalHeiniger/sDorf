import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDepartures } from '@/lib/departures';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;

    // 1. Fetch screen and validate slug
    const screenList = await db
      .select()
      .from(screens)
      .where(eq(screens.slug, screenSlug))
      .limit(1);

    if (screenList.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    const screen = screenList[0];

    // 2. Fetch departures for screen's location
    // In our seed, screen has locationId: 'loc_andermatt_station'
    // Live mode vs Demo mode: In our local V1 pilot, we check if there is an env var AI_MODE
    // If AI_MODE is 'live' or if a query param ?live=true is passed, we fetch live, else demo.
    const isLiveMode = process.env.AI_MODE === 'active' || req.nextUrl.searchParams.get('live') === 'true';
    
    // We fetch with forceDemo = !isLiveMode
    const departures = await getDepartures(screen.locationId, !isLiveMode);

    return NextResponse.json({ departures });

  } catch (error) {
    console.error(`[sDorf Departures API] Error fetching departures:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
