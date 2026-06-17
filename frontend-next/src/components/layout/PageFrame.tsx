import React from "react";

interface PageFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function PageFrame({ children, className = "" }: PageFrameProps) {
  return (
    <div className={`w-full min-w-0 px-4 md:px-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

export default PageFrame;