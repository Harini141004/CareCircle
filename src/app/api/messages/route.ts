import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess, patientAccessFilter, assertClinicalAccess } from "@/lib/patient-scope";

const postMessageSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  body: z.string().min(1, "Message text cannot be empty"),
});

const markReadSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

// Helper to resolve sender names in messages
async function enrichMessagesWithSenders(messages: any[]) {
  const adminIds = new Set<string>();
  const caregiverIds = new Set<string>();
  const familyIds = new Set<string>();

  messages.forEach((m) => {
    if (m.senderType === "ADMIN") adminIds.add(m.senderId);
    else if (m.senderType === "CARETAKER") caregiverIds.add(m.senderId);
    else if (m.senderType === "FAMILY") familyIds.add(m.senderId);
  });

  const [admins, caregivers, familyMembers] = await Promise.all([
    adminIds.size > 0
      ? prisma.admin.findMany({
          where: { id: { in: Array.from(adminIds) } },
          select: { id: true, name: true },
        })
      : [],
    caregiverIds.size > 0
      ? prisma.caregiver.findMany({
          where: { id: { in: Array.from(caregiverIds) } },
          select: { id: true, name: true },
        })
      : [],
    familyIds.size > 0
      ? prisma.familyMember.findMany({
          where: { id: { in: Array.from(familyIds) } },
          select: { id: true, name: true, relationship: true },
        })
      : [],
  ]);

  const senderMap = new Map<string, { name: string; subtitle?: string }>();
  admins.forEach((a) => senderMap.set(a.id, { name: a.name, subtitle: "Administrator" }));
  caregivers.forEach((c) => senderMap.set(c.id, { name: c.name, subtitle: "Caregiver" }));
  familyMembers.forEach((f) =>
    senderMap.set(f.id, { name: f.name, subtitle: `Family (${f.relationship})` })
  );

  return messages.map((m) => {
    const sender = senderMap.get(m.senderId);
    return {
      ...m,
      senderName: sender?.name || "User",
      senderRole: sender?.subtitle || m.senderType,
    };
  });
}

// GET /api/messages?patientId=...
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    if (patientId) {
      await assertPatientAccess(user, patientId);

      let conversation = await prisma.conversation.findFirst({
        where: { patientId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              avatarColor: true,
              caregiver: { select: { id: true, name: true } },
              familyMembers: {
                where: { isActive: true },
                select: { id: true, name: true, relationship: true, isPrimaryContact: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { patientId },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                avatarColor: true,
                caregiver: { select: { id: true, name: true } },
                familyMembers: {
                  where: { isActive: true },
                  select: { id: true, name: true, relationship: true, isPrimaryContact: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }

      const enrichedMessages = await enrichMessagesWithSenders(conversation.messages);

      return NextResponse.json({
        conversation: {
          ...conversation,
          messages: enrichedMessages,
        },
      });
    }

    // List all conversations available to user
    const patientFilter = patientAccessFilter(user);
    const conversations = await prisma.conversation.findMany({
      where: {
        patient: patientFilter,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            caregiver: { select: { id: true, name: true } },
            familyMembers: {
              where: { isActive: true },
              select: { id: true, name: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute unread count per conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: user.id },
            readAt: null,
          },
        });

        const latestMsg = conv.messages[0] || null;

        return {
          id: conv.id,
          patientId: conv.patientId,
          patient: conv.patient,
          latestMessage: latestMsg,
          unreadCount,
          createdAt: conv.createdAt,
        };
      })
    );

    return NextResponse.json({ conversations: result });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages -> Post a new message in the patient's circle
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    if (user.role === "CARETAKER") {
      assertClinicalAccess(user);
    }

    const body = await req.json();
    const parsed = postMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Authorize read/write to this patient conversation
    await assertPatientAccess(user, parsed.data.patientId);

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { patientId: parsed.data.patientId },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { patientId: parsed.data.patientId },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: user.role,
        senderId: user.id,
        body: parsed.data.body.trim(),
      },
    });

    const enriched = await enrichMessagesWithSenders([message]);

    return NextResponse.json({ message: enriched[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/messages -> Mark messages in conversation as read
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: parsed.data.conversationId },
    });
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await assertPatientAccess(user, conv.patientId);

    await prisma.message.updateMany({
      where: {
        conversationId: conv.id,
        senderId: { not: user.id },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
