import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    take: 5,
  });

  return Response.json(products);
}