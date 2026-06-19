/* eslint-disable no-unused-vars */
import React from "react";

export default function Hero({ hero }) {
  return (
    <section className="relative h-[80vh] overflow-hidden">
      <img alt="Hero" className="flex inset-0 w-full object-cover" src={hero.image} />
      <div className="absolute inset-0 ">
        <div className="px-gutter max-w-max-width mx-auto h-full align-center ">
          <div className="max-w-l space-y-lg pt-50">
            <span className="font-label-sm text-label-sm tracking-[0.2em] text-white uppercase bg-primary-container px-5 py-2 inline-block">Mùa Hè 2024</span>
            <h1 className="font-display-lg text-display-lg text-white leading-tight">{hero.title}</h1>
            <p className="font-body-lg text-body-lg text-white">{hero.subtitle}</p>
            <div className="pt-sm">
              <button className="bg-primary-container text-white font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-all duration-300 transform active:scale-95 shadow-lg shadow-primary-container/20">Shop Now</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
