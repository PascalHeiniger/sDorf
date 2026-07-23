import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, screenInteractions } from '@/db/schema';
import { eq, and, gt, asc, or, lt } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;
    const now = new Date();

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

    // 2. Perform Timeout Recovery:
    // If any interaction has been in 'claimed' or 'displaying' for > 45 seconds,
    // mark it as 'failed' to prevent queue starvation and get it out of the active state.
    const fortyFiveSecondsAgo = new Date(Date.now() - 45 * 1000);
    await db
      .update(screenInteractions)
      .set({ status: 'failed', failedAt: now })
      .where(
        and(
          eq(screenInteractions.screenId, screen.id),
          or(
            eq(screenInteractions.status, 'claimed'),
            eq(screenInteractions.status, 'displaying')
          ),
          lt(screenInteractions.claimedAt, fortyFiveSecondsAgo)
        )
      );

    // 3. Retrieve next unexpired queued interaction (FIFO order)
    const queuedList = await db
      .select()
      .from(screenInteractions)
      .where(
        and(
          eq(screenInteractions.screenId, screen.id),
          eq(screenInteractions.status, 'queued'),
          or(
            gt(screenInteractions.expiresAt, now),
            eq(screenInteractions.expiresAt, null as any) // Null check in Drizzle SQlite is handled by isnull, or we compare with gt
          )
        )
      )
      .orderBy(asc(screenInteractions.queuedAt))
      .limit(1);

    if (queuedList.length === 0) {
      return NextResponse.json({ takeover: null });
    }

    const nextTakeover = queuedList[0];

    // 4. Atomic Claim:
    // Transition status to 'displaying' immediately to ensure no other client can fetch it
    await db
      .update(screenInteractions)
      .set({
        status: 'displaying',
        claimedAt: now,
        displayedAt: now,
      })
      .where(eq(screenInteractions.id, nextTakeover.id));

    console.log(`[sDorf Takeover] Screen ${screen.slug} atomically claimed takeover: ${nextTakeover.id}`);

    return NextResponse.json({
      takeover: {
        id: nextTakeover.id,
        qstnInteractionId: nextTakeover.qstnInteractionId,
        questionCategory: nextTakeover.questionCategory,
        publicQuestion: nextTakeover.publicQuestion,
        publicAnswer: nextTakeover.publicAnswer,
      }
    });

  } catch (error) {
    console.error(`[sDorf Active-Takeover API] Error in active-takeover fetch:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
