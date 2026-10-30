import React, { forwardRef } from "react";

const STYLES = {
  error: "border-[#8a2424] text-[#8a2424] bg-[#fbefed]",
  info: "border-bottle text-bottle bg-[#eaf0ea]",
};

// Bandeau de message, dans le style des retours du formulaire d'essai.
const Message = forwardRef(function Message({ type = "info", className = "", children, ...props }, ref) {
  return (
    <div
      ref={ref}
      role={type === "error" ? "alert" : "status"}
      className={`px-4 py-3 text-[15px] leading-relaxed border-l-2 ${STYLES[type]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default Message;
