import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AccessError } from "@/lib/access";
import { assertPatientAccess, assertClinicalAccess } from "@/lib/patient-scope";

const createNoteSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  type: z.enum(["SHIFT_NOTE", "HANDOVER"]),
  body: z.string().min(1, "Note content cannot be empty"),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");

    let whereClause: any = {};

    if (patientId) {
      await assertPatientAccess(user, patientId);
      whereClause.patientId = patientId;
    } else {
      if (user.role === "CARETAKER") {
        assertClinicalAccess(user);
        whereClause.patient = { caregiverId: user.id };
      } else if (user.role === "FAMILY") {
        const fm = await prisma.familyMember.findUnique({
          where: { id: user.id },
          select: { patientId: true, isActive: true },
        });
        if (!fm || !fm.isActive) {
          throw new AccessError("Inactive or unauthorized family account", 403);
        }
        whereClause.patientId = fm.patientId;
      }
      // ADMIN sees all if no patientId
    }

    const notes = await prisma.careNote.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        caregiver: {
          select: { id: true, name: true },
        },
        patient: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "FAMILY") {
      throw new AccessError("Family members cannot create clinical care notes", 403);
    }

    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Verify access to write to this patient
    const patient = await assertPatientAccess(user, parsed.data.patientId, { write: true });

    let caregiverId = user.id;
    if (user.role === "ADMIN") {
      // If admin creates a note, attribute to the patient's caregiver or find first caregiver
      caregiverId = patient.caregiverId;
    } else {
      assertClinicalAccess(user);
    }

    const note = await prisma.careNote.create({
      data: {
        patientId: parsed.data.patientId,
        caregiverId,
        type: parsed.data.type,
        body: parsed.data.body,
      },
      include: {
        caregiver: {
          select: { id: true, name: true },
        },
        patient: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
