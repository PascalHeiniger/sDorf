import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, playlists, playlistItems, contentItems } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

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
    if (!screen.playlistId) {
      return NextResponse.json({ playlist: [] });
    }

    // 2. Fetch all playlist items and join content items
    // Since Sqlite doesn't have native Drizzle leftJoin on simple flat schemas, we query and assemble:
    const items = await db
      .select({
        playlistItem: playlistItems,
        contentItem: contentItems,
      })
      .from(playlistItems)
      .innerJoin(contentItems, eq(playlistItems.contentItemId, contentItems.id))
      .where(
        and(
          eq(playlistItems.playlistId, screen.playlistId),
          eq(contentItems.approvalStatus, 'approved') // Only show approved content items
        )
      )
      .orderBy(asc(playlistItems.position));

    const formattedPlaylist = items.map(item => ({
      id: item.contentItem.id,
      contentType: item.contentItem.contentType,
      title: item.contentItem.title,
      mediaUrl: item.contentItem.mediaUrl,
      body: item.contentItem.bodyJson ? JSON.parse(item.contentItem.bodyJson) : null,
      displayDuration: item.playlistItem.displayDurationSeconds,
      position: item.playlistItem.position,
    }));

    return NextResponse.json({
      screen: {
        id: screen.id,
        slug: screen.slug,
        publicName: screen.publicName,
        orientation: screen.orientation,
        timezone: screen.timezone,
        defaultLanguage: screen.defaultLanguage,
      },
      playlist: formattedPlaylist,
    });

  } catch (error) {
    console.error(`[sDorf Playlist API] Error fetching playlist:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
