import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NAME_MATCH_THRESHOLD, matchNames } from "@/lib/nameMatch";

/**
 * Public "Student Details Form" submission.
 *
 * The family fills in the whole form, then the child is recognised against the
 * roster — using the same tolerant matcher as the check-in (Arabic
 * diacritics/letter variants, dropped letters, Latin ↔ Arabic transliteration):
 *
 *   - a recognised child is updated IN PLACE with the details that were filled
 *     in and answers `created: false`, so the UI says "Welcome to Sunday
 *     School". The child's group is never touched here: groups are handed out
 *     by the admin.
 *   - an unrecognised name becomes a NEW child carrying the submitted details.
 *     Nobody is turned away: the roster starts empty, so every stranger who
 *     fills in the form is added and sorted out later from the admin panel.
 *   - two near-tied names answer 409 instead of guessing which child it is.
 *
 * Submitting the form does not mark anyone present — the check-in does that.
 */

/** The detail fields the public form can update. Never the name or the group. */
type DetailFields = Partial<
  Record<
    | "dob"
    | "motherName"
    | "motherPhone"
    | "fatherPhone"
    | "childPhone"
    | "address"
    | "schoolName"
    | "photoUrl"
    | "notes",
    string
  >
>;

const DETAIL_FIELDS = [
  "dob",
  "motherName",
  "motherPhone",
  "fatherPhone",
  "childPhone",
  "address",
  "schoolName",
  "photoUrl",
  "notes",
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

    if (fullName.length < 2) {
      return NextResponse.json(
        { success: false, found: false, error: "Please enter the child's full name." },
        { status: 400 }
      );
    }

    // Only detail fields the family actually filled in are written — a blank
    // input never wipes an existing value.
    const provided: DetailFields = {};
    for (const field of DETAIL_FIELDS) {
      const raw = body?.[field];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (value) provided[field] = value;
    }

    // The roster is small (a few hundred rows at most), so scoring every child
    // in memory is cheap and lets us tolerate typos and transliteration.
    const candidates = await prisma.student.findMany({
      select: { id: true, fullName: true, assignedGroup: true },
      orderBy: { fullName: "asc" },
    });

    const matches = matchNames(fullName, candidates, {
      threshold: NAME_MATCH_THRESHOLD,
      limit: 5,
    });

    // Nobody on the roster resembles this name, so the child joins it. They are
    // saved without a group, exactly like any other new arrival.
    if (matches.length === 0) {
      const created = await prisma.student.create({
        data: { fullName, ...provided },
        select: { fullName: true },
      });

      return NextResponse.json({
        success: true,
        found: true,
        created: true,
        student: { fullName: created.fullName },
        message: "Your details have been saved.",
      });
    }

    // Duplicate roster rows share the same name, so compare distinct names only.
    const distinct = matches.filter(
      (m, idx) => matches.findIndex((x) => x.item.fullName === m.item.fullName) === idx
    );

    if (distinct.length > 1 && distinct[0].score - distinct[1].score < 0.05) {
      return NextResponse.json(
        {
          success: false,
          found: "ambiguous",
          candidates: distinct.slice(0, 3).map((m) => m.item.fullName),
          error:
            "More than one child matches this name. Please write the full name, or contact the Khadem.",
        },
        { status: 409 }
      );
    }

    const matched = matches[0].item;

    const student = await prisma.student.update({
      where: { id: matched.id },
      data: provided,
    });

    return NextResponse.json({
      success: true,
      found: true,
      created: false,
      matchConfidence: Number(matches[0].score.toFixed(3)),
      student: { fullName: student.fullName },
      message: "Welcome to Sunday School!",
    });
  } catch (error) {
    console.error("Student details submission error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit the form" },
      { status: 500 }
    );
  }
}
