import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this API route
export const revalidate = 0;

interface RevalidateRequest {
  type: "path" | "tag";
  value: string;
  secret?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RevalidateRequest = await request.json();
    const { type, value, secret } = body;

    // Optional: Add secret-based authentication for production security
    const expectedSecret = process.env.REVALIDATE_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (!type || !value) {
      return NextResponse.json(
        { error: "Missing required fields: type and value" },
        { status: 400 }
      );
    }

    if (type === "path") {
      // Revalidate specific path(s)
      const paths = Array.isArray(value) ? value : [value];

      for (const path of paths) {
        revalidatePath(path, "page");
        console.log(`Revalidated path: ${path}`);
      }

      return NextResponse.json({
        revalidated: true,
        type: "path",
        paths,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "tag") {
      // Revalidate by tag
      const tags = Array.isArray(value) ? value : [value];

      for (const tag of tags) {
        revalidateTag(tag);
        console.log(`Revalidated tag: ${tag}`);
      }

      return NextResponse.json({
        revalidated: true,
        type: "tag",
        tags,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid type. Must be 'path' or 'tag'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      {
        error: "Failed to revalidate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check revalidation status
export async function GET() {
  return NextResponse.json({
    message: "Revalidation API is active",
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: "Trigger revalidation",
      body: {
        type: "path | tag",
        value: "string | string[]",
        secret: "optional secret for authentication",
      },
    },
    examples: {
      revalidateEventsPage: {
        type: "path",
        value: "/events",
      },
      revalidateEventTag: {
        type: "tag",
        value: "events",
      },
    },
  });
}
