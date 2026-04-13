import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function ShippingPolicy() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-light tracking-tight mb-12 text-center">
            Shipping Policy
          </h1>

          <div className="prose prose-zinc max-w-none space-y-12 text-[15px] leading-relaxed">

            <div>
              <h2 className="text-xl font-medium mb-4">1. Shipping Methods</h2>
              <p>We offer a range of shipping options to meet your needs. Shipping methods and associated costs will be displayed at checkout.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">2. Processing Time</h2>
              <p>Orders are typically processed within <strong>2 to 5 business days</strong> of purchase. Please note that processing times may vary during peak seasons or promotions.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">3. Shipping Time</h2>
              <p>Free delivery across India usually takes <strong>5 to 8 business days</strong>. Delivery times may vary during peak seasons or promotions.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">4. Order Tracking</h2>
              <p>
                Once your order is shipped, you will receive a confirmation email with tracking details. 
                You can also track your order anytime by logging into your account and clicking on 
                <strong> "Track Order"</strong> in the Account section.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">5. Shipping Fees</h2>
              <p>Shipping is <strong>Free</strong> across India on all orders. Shipping fees (if any) are based on the chosen shipping method, weight of the package, and destination. These will be clearly shown at checkout before you complete your purchase.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">6. Cash on Delivery (COD)</h2>
              <p>Cash on Delivery is available on all orders under ₹50,000. A small COD charge may apply in some cases.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">7. International Shipping</h2>
              <p>We offer international shipping to select countries. Please check the availability and shipping rates for your country during checkout.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">8. Order Status Updates</h2>
              <p>You will receive email notifications at key stages of your order, including confirmation, shipment, and delivery updates.</p>
            </div>

          </div>
        </div>
      </div>
      <WhatsappButton />
      <Footer />
    </>
  );
}