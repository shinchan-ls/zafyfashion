// app/api/track/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeData } from "@/lib/serialize";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orderNumber = searchParams.get("orderNumber");

        if (!orderNumber) {
            return NextResponse.json(
                serializeData({ error: "Order number required" }),
                { status: 400 }
            );
        }

        // ✅ 1. GET ORDER WITH PRODUCT IMAGES
        const order = await prisma.order.findUnique({
            where: { orderNumber },
            include: {
                items: {
                    include: {
                        product: {
                            select: { 
                                id: true, 
                                title: true, 
                                images: true, 
                                price: true 
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json(
                serializeData({ error: "Order not found" }),
                { status: 404 }
            );
        }

        // ✅ 2. CLEAN ITEMS WITH STRONG IMAGE HANDLING (Only change here)
        const cleanedItems = order.items.map((item: any) => {
            let images: string[] = ["/placeholder.png"];

            // Priority 1: From joined product (best case)
            if (item.product?.images) {
                if (Array.isArray(item.product.images)) {
                    if (item.product.images.length > 0) {
                        images = item.product.images;
                    }
                } else if (typeof item.product.images === "string") {
                    try {
                        const parsed = JSON.parse(item.product.images);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            images = parsed;
                        }
                    } catch {
                        images = [item.product.images];
                    }
                }
            }
            // Priority 2: Direct from order item (fallback)
            else if (item.images) {
                if (Array.isArray(item.images) && item.images.length > 0) {
                    images = item.images;
                } else if (typeof item.images === "string") {
                    images = [item.images];
                }
            }

            return {
                ...item,
                product: item.product
                    ? { 
                        ...item.product, 
                        images 
                      }
                    : {
                        id: "0",
                        title: item.title || "Product",
                        images,
                        price: item.price,
                      },
            };
        });

        const selloshipOrderId = order.selloshipOrderId;
        let trackingId = order.selloshipTrackingId || order.selloshipAwbNumber;

        // 🟡 STEP 3: FETCH TRACKING ID IF MISSING (your original code - unchanged)
        if (!trackingId && selloshipOrderId) {
            try {
                const formData = new FormData();
                formData.append("vendor_id", process.env.SELLOSHIP_VENDOR_ID || "65518");
                formData.append("device_from", "4");
                formData.append("order_id", selloshipOrderId);

                const res = await fetch(
                    "https://selloship.com/api/lock_actvs/vendor_order_detail",
                    { method: "POST", body: formData }
                );

                const text = await res.text();

                let data: any = {};
                try {
                    data = JSON.parse(text);
                } catch { }

                const d = data?.data?.[0];

                if (d) {
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            selloshipTrackingId: d.tracking_id || null,
                            selloshipStatus: d.show_status || null,
                            courierName: d.shpping_partner || null,
                        },
                    });

                    // 🔥 CREATE TRACKING EVENTS
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
                }

                if (d?.tracking_id) {
                    trackingId = d.tracking_id;

                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            selloshipTrackingId: d.tracking_id,
                            selloshipStatus: d.show_status,
                            courierName: d.shpping_partner,
                        },
                    });
                } else {
                    return NextResponse.json(
                        serializeData({
                            type: "pending",
                            order: { ...order, items: cleanedItems },
                        })
                    );
                }
            } catch {
                console.error("Selloship fetch failed");
            }
        }

        // 🟡 STILL NO TRACKING
        if (!trackingId) {
            return NextResponse.json(
                serializeData({
                    type: "pending",
                    order: { ...order, items: cleanedItems },
                })
            );
        }

        // 🔵 STEP 4: LIVE TRACKING (your original code - unchanged)
        const formData = new FormData();
        formData.append("vendor_id", process.env.SELLOSHIP_VENDOR_ID || "65518");
        formData.append("device_from", "4");
        formData.append("tracking_id", trackingId);

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

        const text = await res.text();

        let tracking = {};
        try {
            tracking = JSON.parse(text);
        } catch {
            tracking = { success: "0" };
        }

        // ✅ FINAL RESPONSE
        return NextResponse.json(
            serializeData({
                type: "success",
                order: { ...order, items: cleanedItems },
                tracking,
                trackingId,
            })
        );

    } catch (error: any) {
        console.error("Track API error:", error);

        return NextResponse.json(
            serializeData({
                type: "error",
                message: error.message,
            }),
            { status: 500 }
        );
    }
}