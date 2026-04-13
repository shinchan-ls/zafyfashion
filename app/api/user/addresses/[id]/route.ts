import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ✏️ UPDATE
export async function PUT(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params; // ✅ FIX
  const parsedId = parseInt(id);
  const userId = parseInt(session.user.id);

  if (!parsedId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const { name, phone, address, city, state, pincode } = body;

  if (!name || !phone || !address || !city || !state || !pincode) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  // 🔒 ownership check
  const existing = await prisma.address.findFirst({
    where: { id: parsedId, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const updated = await prisma.address.update({
    where: { id: parsedId },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      pincode: pincode.trim(),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// ⭐ SET DEFAULT
export async function PATCH(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params; // ✅ FIX
  const parsedId = parseInt(id);
  const userId = parseInt(session.user.id);

  if (!parsedId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 🔒 ownership check
  const exists = await prisma.address.findFirst({
    where: { id: parsedId, userId },
  });

  if (!exists) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // 🔥 atomic update
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: parsedId },
      data: { isDefault: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}

// ❌ DELETE
export async function DELETE(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params; // ✅ FIX
  const parsedId = parseInt(id);
  const userId = parseInt(session.user.id);

  if (!parsedId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.address.findFirst({
    where: { id: parsedId, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const wasDefault = existing.isDefault;

  await prisma.address.delete({
    where: { id: parsedId },
  });

  // 🔥 fallback default
  if (wasDefault) {
    const next = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}