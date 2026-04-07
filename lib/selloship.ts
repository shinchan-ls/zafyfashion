export async function createSelloshipOrder(order: any) {
  try {
    const formData = new FormData();

    formData.append("vendor_id", process.env.SELLOSHIP_VENDOR_ID || "");
    formData.append("device_from", "4");
    formData.append("customer_id", order.orderNumber);

    formData.append("product_name", order.items || "Order");
    formData.append("price", String(order.totalAmount));
    formData.append("old_price", String(order.totalAmount));

    formData.append("first_name", order.firstName || "NA");
    formData.append("last_name", order.lastName || "NA");
    formData.append("mobile_no", order.phone);
    formData.append("email", order.email);

    formData.append("address", order.address);
    formData.append("state", order.state);
    formData.append("city", order.city);
    formData.append("zip_code", order.pincode);

    formData.append("payment_method", order.paymentMethod === "RAZORPAY" ? "1" : "3");
    formData.append("qty", "1");
    formData.append("custom_order_id", order.orderNumber);

    const res = await fetch("https://selloship.com/web_api/Create_order", {
      method: "POST",
      headers: {
        Authorization: process.env.SELLOSHIP_API_KEY || "",
      },
      body: formData,
    });

    const text = await res.text();
    console.log("📦 Selloship Response:", text);

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {}

    if (data.success === "1") {
      return {
        success: true,
        orderId: data.order_id,
        trackingId: data.tracking_id,
      };
    }

    return { success: false };
  } catch (err) {
    console.error("❌ Selloship Error:", err);
    return { success: false };
  }
}