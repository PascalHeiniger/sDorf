import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, screenInteractions, screenEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;
    const body = await req.json();
    const { takeoverId, event } = body;

    if (!takeoverId || !event) {
      return NextResponse.json({ error: 'takeoverId and event are required' }, { status: 400 });
    }

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
    const now = new Date();

    // 2. Validate and update interaction status
    const interactionList = await db
      .select()
      .from(screenInteractions)
      .where(
        and(
          eq(screenInteractions.id, takeoverId),
          eq(screenInteractions.screenId, screen.id)
        )
      )
      .limit(1);

    if (interactionList.length === 0) {
      return NextResponse.json({ error: 'Interaction takeover not found' }, { status: 404 });
    }

    let statusUpdate: 'completed' | 'failed' | 'displaying' = 'completed';
    const valuesToUpdate: Partial<typeof screenInteractions.$inferInsert> = {};

    if (event === 'completed') {
      statusUpdate = 'completed';
      valuesToUpdate.status = 'completed';
      valuesToUpdate.completedAt = now;
    } else if (event === 'failed') {
      statusUpdate = 'failed';
      valuesToUpdate.status = 'failed';
      valuesToUpdate.failedAt = now;
    } else if (event === 'displayed') {
      statusUpdate = 'displaying';
      valuesToUpdate.status = 'displaying';
    } else {
      return NextResponse.json({ error: 'Invalid event type. Must be completed, failed, or displayed' }, { status: 400 });
    }

    // Update screen interaction status
    await db
      .update(screenInteractions)
      .set(valuesToUpdate)
      .where(eq(screenInteractions.id, takeoverId));

    // 3. Log a Screen Event
    await db.insert(screenEvents).values({
      id: `evt_${Math.random().toString(36).substring(2, 11)}`,
      screenId: screen.id,
      eventType: `takeover_${event}`,
      eventDataJson: JSON.stringify({ takeoverId, timestamp: now.toISOString() }),
      createdAt: now,
    });

    console.log(`[sDorf Event] Screen ${screen.slug} logged takeover event "${event}" for interaction ${takeoverId}`);

    return NextResponse.json({ success: true, updatedStatus: statusUpdate });

  } catch (error) {
    console.error(`[sDorf Takeover-Event API] Error processing takeover event:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
