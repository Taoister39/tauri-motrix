"use client";
import LabContent from "@/components/LabContent";

function LabPage() {
  return (
    <LabContent
      className="px-5 py-4 sm:px-5 sm:py-4"
      onOpen={(url) => {
        window.parent.postMessage({ type: "open_url", data: url }, "*");
      }}
    />
  );
}

export default LabPage;
