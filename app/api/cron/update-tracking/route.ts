import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({
    where: {
      selloshipTrackingId: { not: null },
    },
  });

  for (const order of orders) {
    const formData = new FormData();
    formData.append("vendor_id", "16793");
    formData.append("device_from", "4");
    formData.append(
      "tracking_id",
      order.selloshipTrackingId || ""
    );

    const res = await fetch(
      "https://selloship.com/api/lock_actvs/tracking_detail",
      {
        method: "POST",
        headers: {
          Authorization: process.env.SELLOSHIP_API_KEY || "",
        },
        body: formData,
      }
    );

    const data = await res.json();

    if (data?.data?.length) {
      for (const event of data.data) {
        await prisma.orderTrackingEvent.create({
          data: {
            orderId: order.id,
            status: event.status,
            message: event.description,
            location: event.location,
            timestamp: new Date(event.date),
          },
        });
      }
    }
  }

  return Response.json({ success: true });
}