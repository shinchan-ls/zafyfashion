// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password } = await req.json();

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    if (email.toLowerCase() === password.toLowerCase()) {
      return NextResponse.json({ error: "Email and password cannot be the same" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (existingUser) {
      if (existingUser.passwordHash) {
        return NextResponse.json({ error: "User with this email already exists. Please login." }, { status: 409 });
      }

      // Google account exists → allow adding password (linking)
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: `${firstName} ${lastName}`,
          passwordHash: hashedPassword,
          authProvider: "both",
        },
      });

      return NextResponse.json({ success: true, message: "Account linked successfully! You can now login with email or Google." });
    }

    // New user creation
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        authProvider: "credentials",
        role: "customer",
      },
    });

    return NextResponse.json({ success: true, message: "Account created successfully!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}