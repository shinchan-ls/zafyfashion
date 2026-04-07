// app/api/user/addresses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
      },
    });

    if (!user || !user.address) {
      return NextResponse.json([]); // No address saved
    }

    // Convert to array format for frontend
    const addresses = [{
      id: user.id.toString(),
      name: user.name || "",
      phone: user.phone || "",
      address: user.address,
      city: user.city || "",
      state: user.state || "",
      pincode: user.pincode || "",
    }];

    return NextResponse.json(addresses);
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}