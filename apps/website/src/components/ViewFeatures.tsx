"use client";
import { faGift } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { uni_utils } from "@tauri-motrix/unified-base";
import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { useStackPageOpen } from "./StackPageProviderWrapper";

function ViewFeatures() {
  const { setOpen } = useStackPageOpen();
  const router = useRouter();
  const lockRef = useRef(false);

  const handleNavigate: LinkProps["onNavigate"] = async (e) => {
    e.preventDefault();
    if (lockRef.current) {
      return;
    }
    lockRef.current = true;

    setOpen(true);

    await uni_utils.sleep(600);

    setOpen(false);
    router.push("/features");

    lockRef.current = false;
  };

  return (
    <Link
      onClick={(e) => e.stopPropagation()}
      onNavigate={handleNavigate}
      className="text-[#5c5edc] cursor-pointer"
      href="/features"
    >
      <FontAwesomeIcon icon={faGift} className="text-xl mr-2" />
      View Motrix features
    </Link>
  );
}

export default ViewFeatures;
