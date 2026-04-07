import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ✅ GET ADDRESSES
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: {
      userId: parseInt(session.user.id),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(addresses);
}

// ✅ ADD ADDRESS
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { name, phone, address, city, state, pincode } = body;

  // ✅ VALIDATION
  if (!name || !phone || !address || !city || !state || !pincode) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  // ✅ MAX 5
  const count = await prisma.address.count({
    where: { userId: parseInt(session.user.id) },
  });

  if (count >= 5) {
    return NextResponse.json({ error: "Max 5 addresses allowed" }, { status: 400 });
  }

  const newAddress = await prisma.address.create({
    data: {
      userId: parseInt(session.user.id),
      name,
      phone,
      address,
      city,
      state,
      pincode,
    },
  });

  return NextResponse.json({ success: true, data: newAddress });
}