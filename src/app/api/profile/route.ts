import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      salary: true,
      currency: true,
      country: true,
      theme: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/profile
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { name, salary, currency, country, theme } = body;

  // Validate theme
  const validThemes = ["light", "dark"];
  if (theme && !validThemes.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name: name.trim() || null }),
      ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
      ...(currency !== undefined && { currency }),
      ...(country !== undefined && { country }),
      ...(theme !== undefined && { theme }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      salary: true,
      currency: true,
      country: true,
      theme: true,
    },
  });

  return NextResponse.json(updated);
}
