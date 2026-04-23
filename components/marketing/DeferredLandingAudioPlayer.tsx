"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const LandingAudioPlayer = dynamic(
  () =>
    import("./LandingAudioPlayer").then((mod) => mod.LandingAudioPlayer),
  {
    loading: () => (
      <div
        className="mx-auto w-full max-w-lg rounded-3xl"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDD7CF",
          boxShadow:
            "0 20px 60px rgba(18,20,23,0.08), 0 4px 16px rgba(18,20,23,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: "1px solid #F1EEE8" }}
        >
          <div
            className="mb-2 h-3 w-40 rounded-full"
            style={{ background: "rgba(78,140,120,0.12)" }}
          />
          <div
            className="h-6 w-56 rounded-full"
            style={{ background: "rgba(18,20,23,0.08)" }}
          />
        </div>
        <div className="px-8 py-7">
          <div
            className="mb-4 h-10 rounded-2xl"
            style={{ background: "rgba(18,20,23,0.05)" }}
          />
          <div
            className="mb-4 h-1 rounded-full"
            style={{ background: "rgba(18,20,23,0.07)" }}
          />
          <div className="mb-6 flex items-center justify-between">
            <div
              className="h-3 w-10 rounded-full"
              style={{ background: "rgba(47,111,237,0.12)" }}
            />
            <div
              className="h-3 w-10 rounded-full"
              style={{ background: "rgba(18,20,23,0.08)" }}
            />
          </div>
          <div className="flex justify-center">
            <div
              className="h-14 w-14 rounded-full"
              style={{
                background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                boxShadow: "0 8px 24px rgba(47,111,237,0.2)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export function DeferredLandingAudioPlayer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;

    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [shouldLoad]);

  return <div ref={rootRef}>{shouldLoad ? <LandingAudioPlayer /> : null}</div>;
}
