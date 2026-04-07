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
        addresses: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
      },
    });

    if (!user || !user.addresses || user.addresses.length === 0) {
      return NextResponse.json([]); // No addresses
    }

    // Format for frontend
    const addresses = user.addresses.map((addr: any) => ({
      id: addr.id.toString(),
      name: addr.name || user.name || "",
      phone: addr.phone || "",
      address: addr.address,
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
    }));

    return NextResponse.json(addresses);
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}