"use client";
import { faGift } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";

import { useStackPageOpen } from "./StackPageProviderWrapper";

function ViewFeatures() {
  const { setOpen } = useStackPageOpen();
  const router = useRouter();

  const handleClick: LinkProps["onNavigate"] = (e) => {
    e.preventDefault();
    setOpen(true);
    setTimeout(() => {
      // The original onNavigate is `() => setOpen(false)`.
      // We call it manually before pushing the new route.
      setOpen(false);
      router.push("/features");
    }, 600);
  };

  return (
    <Link
      onNavigate={handleClick}
      className="text-[#5c5edc] cursor-pointer"
      href="/features"
    >
      <FontAwesomeIcon icon={faGift} className="text-xl mr-2" />
      View Motrix features
    </Link>
  );
}

export default ViewFeatures;
