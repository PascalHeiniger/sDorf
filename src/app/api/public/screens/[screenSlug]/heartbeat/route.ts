import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, screenEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;

    // 1. Authenticate heartbeat request via Bearer Token header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or malformed credentials' }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Query screen belonging to this slug
    const screenList = await db
      .select()
      .from(screens)
      .where(eq(screens.slug, screenSlug))
      .limit(1);

    if (screenList.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    const screen = screenList[0];

    // 3. Verify cryptographically hashed token
    if (screen.deviceTokenHash !== tokenHash) {
      return NextResponse.json({ error: 'Unauthorized: Invalid screen credentials' }, { status: 401 });
    }

    const now = new Date();

    // 4. Update screen status & lastSeenAt timestamp
    await db
      .update(screens)
      .set({
        status: 'active',
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(screens.id, screen.id));

    // 5. Insert a screen event record to track connection frequency
    await db.insert(screenEvents).values({
      id: `evt_${Math.random().toString(36).substring(2, 11)}`,
      screenId: screen.id,
      eventType: 'heartbeat',
      eventDataJson: JSON.stringify({ ip: req.ip || '127.0.0.1', userAgent: req.headers.get('user-agent') || 'kiosk-player' }),
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      screenId: screen.id,
      timezone: screen.timezone,
      defaultLanguage: screen.defaultLanguage,
      serverTime: now.toISOString(),
    });

  } catch (error) {
    console.error(`[sDorf Heartbeat API] Error processing heartbeat:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
