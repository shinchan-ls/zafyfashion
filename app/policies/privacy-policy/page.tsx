import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-light tracking-tight mb-12 text-center">
            Privacy Policy
          </h1>

          <div className="prose prose-zinc max-w-none space-y-12 text-[15px] leading-relaxed">

            <div>
              <h2 className="text-xl font-medium mb-4">1. Information We Collect</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Personal Information</h3>
                  <p>When you make a purchase or create an account, we collect information such as your name, email address, shipping address, billing information, and phone number.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Device Information</h3>
                  <p>We may automatically collect information about the device you use to access our website, including your IP address, browser type, and operating system.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Cookies</h3>
                  <p>We use cookies and similar tracking technologies to enhance your experience on our website. You can manage your cookie preferences through your browser settings.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">2. How We Use Your Information</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Order Processing</h3>
                  <p>We use your personal information to process and fulfill your orders, including shipping and payment processing.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Communication</h3>
                  <p>We may use your email address to send you order updates, promotional offers, and newsletters. You can opt out of promotional emails at any time.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Customer Support</h3>
                  <p>Your information helps us provide customer support and address your inquiries or concerns.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">3. Data Security</h2>
              <p>
                We employ reasonable security measures to protect your information from unauthorized access, disclosure, alteration, or destruction. 
                However, no method of transmission over the internet or electronic storage is entirely secure.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">4. Data Sharing</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Third-Party Services</h3>
                  <p>We may share your information with trusted third-party service providers who assist us with payment processing, shipping, and marketing.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Legal Obligations</h3>
                  <p>We may disclose your information when required by law or in response to a lawful request, such as a court order or government inquiry.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">5. Your Rights</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Access and Correction</h3>
                  <p>You have the right to access and correct your personal information. You can update your account details through your account or by contacting us.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Data Deletion</h3>
                  <p>You can request the deletion of your personal information, subject to legal obligations and legitimate business interests.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Opt-Out</h3>
                  <p>You can opt out of receiving promotional emails by following the unsubscribe instructions in the email or by contacting us.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-4">6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:<br />
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