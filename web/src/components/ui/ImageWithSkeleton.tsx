"use client";

import { useState } from "react";
import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageWithSkeletonProps extends HTMLMotionProps<"img"> {
  containerClassName?: string;
}

export function ImageWithSkeleton({
  src,
  alt,
  className,
  containerClassName,
  ...props
}: ImageWithSkeletonProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        containerClassName
      )}
    >
      {!isLoaded && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-muted via-accent to-muted bg-[length:200%_100%]"
          animate={{
            backgroundPosition: ["100% 0%", "-100% 0%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src={src}
        alt={alt || ""}
        className={cn("w-full h-full object-cover", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
}
