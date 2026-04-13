import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function TermsOfService() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-light tracking-tight mb-12 text-center">
            Terms of Service
          </h1>

          <div className="prose prose-zinc max-w-none space-y-12 text-[15px] leading-relaxed">

            <p className="text-gray-600">
              These Terms of Service govern your use of the Zafy Fashion Hub website 
              and your purchase of products. By accessing or using our website, you agree to be bound by these terms.
            </p>

            <div>
              <h2 className="text-xl font-medium mb-4">1. User Accounts</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">1.1 Account Creation</h3>
                  <p>To make a purchase on our website, you may be required to create an account. You agree to provide accurate and complete information during the registration process and to update your information to keep it current.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">1.2 Account Security</h3>
                  <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">2. Product Information</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">2.1 Accuracy</h3>
                  <p>We make every effort to provide accurate product descriptions, images, and prices. However, we do not guarantee the accuracy of this information and reserve the right to correct errors or omissions.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">2.2 Availability</h3>
                  <p>Product availability is subject to change without notice. We may limit the quantities of products available for purchase.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">3. Ordering and Payment</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">3.1 Order Acceptance</h3>
                  <p>Your order is an offer to purchase products from us. We reserve the right to accept or reject your order at our discretion.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">3.2 Payment</h3>
                  <p>You agree to pay the full purchase price, including applicable taxes and shipping fees, at the time of purchase. We accept payment through the methods specified on our website.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">4. Shipping and Delivery</h2>
              <p>Shipping and delivery terms are governed by our Shipping Policy. By placing an order, you agree to our Shipping Policy.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">5. Returns and Refunds</h2>
              <p>Returns and refunds are governed by our Refund Policy. Please refer to our Refund Policy for detailed terms.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">6. Limitation of Liability</h2>
              <p>To the fullest extent permitted by law, Zafy Fashion Hub shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of our website or products.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">7. Governing Law</h2>
              <p>These terms shall be governed by and construed in accordance with the laws of India.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">8. Contact Us</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:<br />
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