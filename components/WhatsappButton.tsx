"use client";

export default function WhatsappButton() {
    const phone = "919274508257"; // 🔥 change to your number

    return (
        <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-5 right-5 z-50 bg-black-500 hover:bg-white-600 text-white p-4 rounded-full shadow-lg transition"
        >
            <img src="/whatsapp.png" alt="whatsapp" className="w-12 h-12" />
        </a>
    );
}