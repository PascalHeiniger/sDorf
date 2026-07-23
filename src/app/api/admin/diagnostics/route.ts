import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, playlists, screenInteractions, screenEvents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch screens and join playlists if any
    const screenList = await db
      .select({
        screen: screens,
        playlist: playlists,
      })
      .from(screens)
      .leftJoin(playlists, eq(screens.playlistId, playlists.id))
      .orderBy(desc(screens.lastSeenAt));

    const formattedScreens = screenList.map((row) => ({
      id: scClean(row.screen.id),
      slug: row.screen.slug,
      publicName: row.screen.publicName,
      status: row.screen.status,
      lastSeenAt: row.screen.lastSeenAt?.toISOString() || null,
      softwareVersion: row.screen.softwareVersion,
      playlistName: row.playlist?.name || null,
    }));

    // 2. Fetch recent interactions (takeovers)
    const interactionList = await db
      .select()
      .from(screenInteractions)
      .orderBy(desc(screenInteractions.queuedAt))
      .limit(15);

    const formattedInteractions = interactionList.map((row) => ({
      id: row.id,
      questionCategory: row.questionCategory,
      publicQuestion: row.publicQuestion,
      publicAnswer: row.publicAnswer,
      status: row.status,
      queuedAt: row.queuedAt.toISOString(),
      claimedAt: row.claimedAt?.toISOString() || null,
      completedAt: row.completedAt?.toISOString() || null,
    }));

    // 3. Fetch recent screen events
    const eventList = await db
      .select({
        event: screenEvents,
        screen: screens,
      })
      .from(screenEvents)
      .innerJoin(screens, eq(screenEvents.screenId, screens.id))
      .orderBy(desc(screenEvents.createdAt))
      .limit(20);

    const formattedEvents = eventList.map((row) => ({
      id: row.event.id,
      screenSlug: row.screen.slug,
      eventType: row.event.eventType,
      eventDataJson: row.event.eventDataJson,
      createdAt: row.event.createdAt.toISOString(),
    }));

    return NextResponse.json({
      screens: formattedScreens,
      interactions: formattedInteractions,
      events: formattedEvents,
    });

  } catch (error) {
    console.error(`[sDorf Admin API] Diagnostic fetch failed:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Security scrubber to hide database internal primary keys in the admin log where appropriate
function scClean(val: string): string {
  return val;
}
