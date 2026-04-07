// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password } = await req.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    if (email.toLowerCase() === password.toLowerCase()) {
      return NextResponse.json({ error: "Email and password cannot be the same" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      if (existingUser.passwordHash) {
        return NextResponse.json({ 
          error: "User with this email already exists. Please login." 
        }, { status: 409 });
      }

      // Link password to existing Google account
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: `${firstName.trim()} ${lastName.trim()}`,
          passwordHash: hashedPassword,
          authProvider: "both",
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Password linked successfully! You can now login with email or Google." 
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        authProvider: "credentials",
        role: "customer",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Account created successfully!" 
    });

  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}