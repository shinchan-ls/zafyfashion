import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-light tracking-tight mb-6">
            Contact Us
          </h1>
          <p className="text-gray-600 text-lg mb-16 max-w-md mx-auto">
            We'd love to hear from you. Reach out to us anytime.
          </p>

          <div className="grid md:grid-cols-3 gap-12 max-w-2xl mx-auto">
            
            {/* Email */}
            <div className="space-y-3">
              <div className="text-4xl mb-4">✉️</div>
              <h3 className="font-medium text-lg">Email</h3>
              <a 
                href="mailto:zafyfashionhub@gmail.com" 
                className="text-black hover:underline block text-lg"
              >
                zafyfashionhub@gmail.com
              </a>
            </div>

            {/* Phone */}
            <div className="space-y-3">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-medium text-lg">Phone</h3>
              <a 
                href="tel:+919274508257" 
                className="text-black hover:underline block text-lg"
              >
                +91 92745 08257
              </a>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="font-medium text-lg">Address</h3>
              <p className="text-gray-600 leading-relaxed">
                Zafar Bandwala<br />
                Surat, Gujarat<br />
                India
              </p>
            </div>

          </div>

          <div className="mt-20 text-sm text-gray-500">
            We typically respond within 24-48 business hours.
          </div>
        </div>
      </div>
      <WhatsappButton />
      <Footer />
    </>
  );
}