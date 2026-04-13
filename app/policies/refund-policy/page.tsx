import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function RefundPolicy() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-light tracking-tight mb-12 text-center">
            Refund Policy
          </h1>

          <div className="prose prose-zinc max-w-none space-y-12 text-[15px] leading-relaxed">

            <div>
              <h2 className="text-xl font-medium mb-4">1. Returns</h2>
              <p>
                We accept returns on most items within <strong>7 days</strong> of the delivery date. 
                To be eligible for a return, the item must be in its original condition, unworn, 
                unwashed, and with all tags attached.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">2. Refunds</h2>
              <p>
                Once your return is received and inspected, we will notify you via email. 
                If the return is approved, a refund will be processed to your original payment method 
                within <strong>5 business days</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">3. Shipping Costs</h2>
              <p>
                Shipping costs are non-refundable. If we made an error with your order or the item 
                is defective, we will provide a prepaid return label.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">4. Exchanges</h2>
              <p>
                If you need to exchange an item for a different size or color, please contact our 
                customer service team. We will guide you through the exchange process.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">5. How to Initiate a Return</h2>
              <p>
                Log in to your account, go to <strong>Order History</strong>, select the order and 
                click on "Return Item". Follow the instructions provided.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">6. Damaged or Defective Items</h2>
              <p>
                If you receive a damaged or defective item, please contact us within <strong>48 hours </strong> 
                of receiving the product with photos. We will arrange for a replacement or refund.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">7. Refund Timeline</h2>
              <p>
                Refunds may take up to <strong>5 business days</strong> to appear in your account, 
                depending on your payment method and bank.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">8. Contact Us</h2>
              <p>
                If you have any questions about our refund policy, please contact us at:
                <br />
                <strong>zafyfashionhub@gmail.com</strong>
              </p>
            </div>

          </div>
        </div>
      </div>
      <WhatsappButton />
      <Footer />
    </>
  );
}