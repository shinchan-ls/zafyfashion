// app/api/user/addresses/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

const VALID_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands",
  "Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

// ── Shared validation ────────────────────────────────────────────────────────
function validateAddressBody(body: any): string | null {
  const { name, phone, address, city, state, pincode } = body;

  if (!name?.trim() || name.trim().length < 2)
    return "Full name must be at least 2 characters";

  if (!phone?.trim() || !/^\d{10}$/.test(phone.trim()))
    return "Phone must be a valid 10-digit Indian mobile number";

  if (!address?.trim() || address.trim().length < 10)
    return "Address must be at least 10 characters";

  if (!city?.trim() || city.trim().length < 2)
    return "City is required";

  if (!state?.trim() || !VALID_STATES.includes(state.trim()))
    return "Please select a valid Indian state";

  if (!pincode?.trim() || !/^\d{6}$/.test(pincode.trim()))
    return "Pincode must be exactly 6 digits";

  return null;
}

// ── GET: fetch all addresses ─────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" }, // default address first
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        landmark: true,
        isDefault: true,
      },
    });

    return NextResponse.json(addresses);
  } catch (err) {
    console.error("GET addresses error:", err);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

// ── POST: create new address ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  // Max 5 addresses per user
  const count = await prisma.address.count({ where: { userId } });
  if (count >= 5) {
    return NextResponse.json(
      { error: "Maximum 5 addresses allowed" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validationError = validateAddressBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    // If this is the first address, auto-set as default
    const isFirstAddress = count === 0;

    const address = await prisma.address.create({
      data: {
        userId,
        name:      body.name.trim(),
        phone:     body.phone.trim(),
        address:   body.address.trim(),
        city:      body.city.trim(),
        state:     body.state.trim(),
        pincode:   body.pincode.trim(),
        landmark:  body.landmark?.trim() || null,
        isDefault: isFirstAddress,
      },
    });

    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (err) {
    console.error("POST address error:", err);
    return NextResponse.json({ error: "Failed to save address" }, { status: 500 });
  }
}