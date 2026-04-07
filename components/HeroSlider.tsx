"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";

export default function HeroSlider() {
  return (
    <div className="w-full">

      <Swiper
        modules={[Navigation]}
        navigation
        loop={true}
        className="w-full"
      >

        {/* SLIDE 1 */}
        <SwiperSlide>
          <div className="relative w-full aspect-[2.7/1] md:aspect-[2.7/1] aspect-[1/1.1]">

            <Image
              src="/logo/banner.png"
              alt="Banner"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />


            <div className="absolute left-4 md:left-20 top-1/2 -translate-y-1/2 text-white max-w-xs md:max-w-lg">

              <p className="tracking-[2px] text-[10px] md:text-xs mb-2">
                CAPTURING LIFE
              </p>

              <h1 className="text-2xl md:text-5xl lg:text-6xl font-light leading-tight">
                ONE SECOND <br />
                <span className="italic">at a TIME</span>
              </h1>

              <button className="mt-4 md:mt-6 bg-white text-black px-5 md:px-7 py-2.5 md:py-3 rounded-full text-xs md:text-sm">
                Shop Now
              </button>
            </div>

          </div>

        </SwiperSlide>

        {/* SLIDE 2 */}
        <SwiperSlide>
          <div className="relative w-full aspect-[2.7/1] md:aspect-[2.7/1] aspect-[1/1.1]">

            <Image
              src="/logo/banner2.png"
              alt="Perfume"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />


            <div className="absolute left-4 md:left-20 top-1/2 -translate-y-1/2 text-white max-w-xs md:max-w-lg">

              <p className="tracking-[2px] text-[10px] md:text-xs mb-2">
                LUXURY COLLECTION
              </p>

              <h1 className="text-2xl md:text-5xl lg:text-6xl font-light leading-tight">
                PREMIUM <br />
                <span className="italic">PERFUME</span>
              </h1>

              <button className="mt-4 md:mt-6 bg-white text-black px-5 md:px-7 py-2.5 md:py-3 rounded-full text-xs md:text-sm">
                Shop Now
              </button>

            </div>

          </div>
        </SwiperSlide>

      </Swiper>
    </div>
  );
}