import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("🔄 Selloship Sync Started");

    const orders = await prisma.order.findMany({
      where: {
        selloshipOrderId: { not: null },
      },
      select: {
        id: true,
        selloshipOrderId: true,
      },
    });

    for (const order of orders) {
      try {
        const formData = new FormData();
        formData.append("vendor_id", process.env.SELLOSHIP_VENDOR_ID || "65518");
        formData.append("device_from", "4");
        formData.append("order_id", order.selloshipOrderId!);

        const res = await fetch(
          "https://selloship.com/api/lock_actvs/vendor_order_detail",
          {
            method: "POST",
            body: formData,
          }
        );

        const text = await res.text();

        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          continue;
        }

        const d = data?.data?.[0];
        if (!d) continue;

        // 🔥 UPDATE ORDER
        await prisma.order.update({
          where: { id: order.id },
          data: {
            selloshipTrackingId: d.tracking_id || null,
            selloshipStatus: d.show_status || null,
            courierName: d.shpping_partner || null,
          },
        });

        // 🔥 CREATE EVENTS
        const events = [];

        if (d.order_created_date && d.order_created_date !== "0000-00-00 00:00:00") {
          events.push({
            status: "Order Created",
            message: "Order created in Selloship",
            timestamp: new Date(d.order_created_date),
          });
        }

        if (d.accept_order_date && d.accept_order_date !== "0000-00-00 00:00:00") {
          events.push({
            status: "Accepted",
            message: "Order accepted",
            timestamp: new Date(d.accept_order_date),
          });
        }

        if (d.pickup_date && d.pickup_date !== "0000-00-00 00:00:00") {
          events.push({
            status: "Picked Up",
            message: "Order picked up",
            timestamp: new Date(d.pickup_date),
          });
        }

        if (d.transit_date && d.transit_date !== "0000-00-00 00:00:00") {
          events.push({
            status: "In Transit",
            message: "Order in transit",
            timestamp: new Date(d.transit_date),
          });
        }

        if (d.delivered_date && d.delivered_date !== "0000-00-00 00:00:00") {
          events.push({
            status: "Delivered",
            message: "Order delivered",
            timestamp: new Date(d.delivered_date),
          });
        }

        // 🔥 SAVE EVENTS (NO DUPLICATE)
        for (const event of events) {
          await prisma.orderTrackingEvent.upsert({
            where: {
              orderId_status: {
                orderId: order.id,
                status: event.status,
              },
            },
            update: {},
            create: {
              orderId: order.id,
              status: event.status,
              message: event.message,
              timestamp: event.timestamp,
            },
          });
        }

      } catch (err) {
        console.error("❌ Sync failed for order:", order.id);
      }
    }

    console.log("✅ Selloship Sync Completed");

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Sync API Error:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}