// app/api/user/addresses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ✅ GET all addresses
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: parseInt(session.user.id) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, address, city, state, pincode, landmark = "" } = body;

  const userId = parseInt(session.user.id);

  // Validation
  if (!name || !phone || !address || !city || !state || !pincode) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number. Must be 10 digits." }, { status: 400 });
  }

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Invalid pincode. Must be 6 digits." }, { status: 400 });
  }

  // Max 5 addresses
  const count = await prisma.address.count({
    where: { userId },
  });

  if (count >= 5) {
    return NextResponse.json({ error: "Maximum 5 addresses allowed" }, { status: 400 });
  }

  try {
    const newAddress = await prisma.$transaction(async (tx) => {
      // 🔥 STEP 1: Reset all existing defaults
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // 🔥 STEP 2: Create new default address
      return await tx.address.create({
        data: {
          userId,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          pincode: pincode.trim(),
          landmark: landmark.trim(),
          isDefault: true,
        },
      });
    });

    return NextResponse.json(newAddress);
  } catch (error: any) {
    console.error("Address creation error:", error);
    return NextResponse.json({ error: "Failed to save address" }, { status: 500 });
  }
}