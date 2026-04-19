// app/api/user/addresses/[id]/route.ts

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

// ── Shared ownership check ───────────────────────────────────────────────────
async function getOwnedAddress(addressId: number, userId: number) {
  return prisma.address.findFirst({
    where: { id: addressId, userId },
  });
}

// ── PUT: update address ──────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const addressId = parseInt(id);
  const userId    = parseInt(session.user.id);

  if (isNaN(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
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

  // Ownership check — user can only edit their own addresses
  const existing = await getOwnedAddress(addressId, userId);
  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.address.update({
      where: { id: addressId },
      data: {
        name:     body.name.trim(),
        phone:    body.phone.trim(),
        address:  body.address.trim(),
        city:     body.city.trim(),
        state:    body.state.trim(),       // store full name e.g. "Gujarat"
        pincode:  body.pincode.trim(),
        landmark: body.landmark?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT address error:", err);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

// ── PATCH: set as default ────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const addressId = parseInt(id);
  const userId    = parseInt(session.user.id);

  if (isNaN(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  const existing = await getOwnedAddress(addressId, userId);
  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Atomic: unset all defaults, then set this one
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId },
      data:  { isDefault: false },
    }),
    prisma.address.update({
      where: { id: addressId },
      data:  { isDefault: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}

// ── DELETE: remove address ───────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const addressId = parseInt(id);
  const userId    = parseInt(session.user.id);

  if (isNaN(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  const existing = await getOwnedAddress(addressId, userId);
  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const wasDefault = existing.isDefault;

  await prisma.address.delete({ where: { id: addressId } });

  // If deleted address was default, auto-promote the most recent remaining one
  if (wasDefault) {
    const next = await prisma.address.findFirst({
      where:   { userId },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data:  { isDefault: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}