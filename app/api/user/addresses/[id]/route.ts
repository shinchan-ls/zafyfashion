import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ✏️ UPDATE
export async function PUT(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params; // ✅ FIX
  const id = parseInt(params.id);

  const body = await req.json();
  const { name, phone, address, city, state, pincode } = body;

  if (!name || !phone || !address) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const updated = await prisma.address.update({
    where: { id },
    data: { name, phone, address, city, state, pincode },
  });

  return NextResponse.json({ success: true, data: updated });
}

// ⭐ SET DEFAULT
export async function PATCH(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params; // ✅ FIX
  const id = parseInt(params.id);
  const userId = parseInt(session.user.id);

  // remove old default
  await prisma.address.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });

  // set new default
  await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  return NextResponse.json({ success: true });
}

// ❌ DELETE
export async function DELETE(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params; // ✅ FIX
  const id = parseInt(params.id);

  await prisma.address.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}