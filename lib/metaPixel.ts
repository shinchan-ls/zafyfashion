declare global {
  interface Window {
    fbq: any;
  }
}

export const FB_PIXEL_ID = "807976825302831";

export const pageview = () => {
  window.fbq?.("track", "PageView");
};

export const viewContent = (
  productId: string,
  title: string,
  price: number
) => {
  window.fbq?.("track", "ViewContent", {
    content_ids: [productId],
    content_name: title,
    value: price,
    currency: "INR",
  });
};

export const addToCart = (
  productId: string,
  title: string,
  price: number
) => {
  window.fbq?.("track", "AddToCart", {
    content_ids: [productId],
    content_name: title,
    value: price,
    currency: "INR",
  });
};

export const initiateCheckout = (value: number) => {
  window.fbq?.("track", "InitiateCheckout", {
    value,
    currency: "INR",
  });
};

export const purchase = (
  orderId: string,
  value: number
) => {
  window.fbq?.("track", "Purchase", {
    content_name: orderId,
    value,
    currency: "INR",
  });
};