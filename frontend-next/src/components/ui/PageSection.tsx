import React from "react";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "subtle" | "accent";
  as?: React.ElementType;
}

const toneClasses: Record<NonNullable<PageSectionProps["tone"]>, string> = {
  default: "",
  subtle: "page-section--subtle",
  accent: "page-section--accent",
};

const PageSection: React.FC<PageSectionProps> = ({
  children,
  className = "",
  tone = "default",
  as: Component = "section",
}) => {
  return (
    <Component className={`page-section ${toneClasses[tone]} ${className}`.trim()}>
      {children}
    </Component>
  );
};

export default PageSection;