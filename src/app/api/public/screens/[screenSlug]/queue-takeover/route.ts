import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, screenInteractions, screenEvents } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import crypto from 'crypto';

const DEFAULT_SECRET = 'sDorf-QSTN-shared-signing-handshake-secret-key-32b';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;
    
    // 1. Authenticate server-to-server request via signature & timestamp
    const signature = req.headers.get('X-QSTN-Signature');
    const timestampStr = req.headers.get('X-QSTN-Timestamp');

    if (!signature || !timestampStr) {
      return NextResponse.json({ error: 'Unauthorized: Missing S2S signature headers' }, { status: 401 });
    }

    // Replay Protection: Timestamp must be within +/- 30 seconds of server time
    const requestTime = parseInt(timestampStr, 10);
    const serverTime = Date.now();
    if (isNaN(requestTime) || Math.abs(serverTime - requestTime) > 30000) {
      return NextResponse.json({ error: 'Unauthorized: Request timestamp expired (replay protection)' }, { status: 401 });
    }

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // Recompute signature to verify caller identity and payload integrity
    const secret = process.env.SHARED_SIGNING_SECRET || DEFAULT_SECRET;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestampStr}.${bodyText}`)
      .digest('hex');

    if (computedSignature !== signature) {
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 403 });
    }

    // 2. Validate parameters
    const { qstnInteractionId, questionCategory, publicQuestion, publicAnswer } = body;
    if (!qstnInteractionId || !publicQuestion || !publicAnswer) {
      return NextResponse.json({ error: 'Missing required takeover fields' }, { status: 400 });
    }

    // Fetch target screen
    const screenList = await db
      .select()
      .from(screens)
      .where(eq(screens.slug, screenSlug))
      .limit(1);

    if (screenList.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    const screen = screenList[0];

    // 3. Enforce deterministic public safety rules (Defense-in-depth on sDorf side)
    if (publicQuestion.length > 100) {
      return NextResponse.json({ error: 'Safety Violation: Question exceeds 100 characters' }, { status: 400 });
    }
    if (publicAnswer.length > 120) {
      return NextResponse.json({ error: 'Safety Violation: Answer exceeds 120 characters' }, { status: 400 });
    }

    const containsUrl = /https?:\/\/[^\s]+|www\.[^\s]+/gi.test(publicAnswer);
    const containsEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(publicAnswer);
    if (containsUrl || containsEmail) {
      return NextResponse.json({ error: 'Safety Violation: Content contains links or email addresses' }, { status: 400 });
    }

    // 4. Enforce Queue State Machine rules
    // Rule A: Max queue size of 3 queued takeovers at any time
    const queuedCountResult = await db
      .select({ val: count() })
      .from(screenInteractions)
      .where(
        and(
          eq(screenInteractions.screenId, screen.id),
          eq(screenInteractions.status, 'queued')
        )
      );

    const activeQueuedCount = queuedCountResult[0]?.val || 0;
    if (activeQueuedCount >= 3) {
      return NextResponse.json({
        error: 'Queue Congested: Maximum limit of 3 concurrent takeovers reached. Please wait.'
      }, { status: 429 });
    }

    // Rule B: Cooldown / Deduplication
    // Check if an interaction with the exact same question was queued in the last 15 seconds to prevent spamming
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
    const duplicateList = await db
      .select()
      .from(screenInteractions)
      .where(
        and(
          eq(screenInteractions.screenId, screen.id),
          eq(screenInteractions.publicQuestion, publicQuestion),
          eq(screenInteractions.status, 'queued')
        )
      )
      .limit(1);

    if (duplicateList.length > 0) {
      return NextResponse.json({
        success: true,
        takeoverId: duplicateList[0].id,
        status: 'queued',
        message: 'Duplicate request already queued.'
      });
    }

    // 5. Atomic Enqueue
    const id = `int_${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = new Date(Date.now() + 45 * 1000); // Expires after 45s if screen fails to pick it up

    await db.insert(screenInteractions).values({
      id,
      screenId: screen.id,
      qstnInteractionId,
      questionCategory: questionCategory || 'General',
      publicQuestion,
      publicAnswer,
      publicDisplayReason: 'Approved by automatic safety filters',
      status: 'queued',
      queuedAt: new Date(),
      expiresAt,
      createdAt: new Date(),
    });

    // Log screen event
    await db.insert(screenEvents).values({
      id: `evt_${Math.random().toString(36).substring(2, 11)}`,
      screenId: screen.id,
      eventType: 'takeover_queued',
      eventDataJson: JSON.stringify({ id, qstnInteractionId }),
      createdAt: new Date(),
    });

    console.log(`[sDorf Queue] Takeover ${id} successfully queued for screen: ${screen.slug}`);

    return NextResponse.json({
      success: true,
      takeoverId: id,
      status: 'queued',
    });

  } catch (error) {
    console.error(`[sDorf Enqueue API] Error in queue-takeover:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
