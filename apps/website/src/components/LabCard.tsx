import Image from "next/image";
import { ReactNode } from "react";

import InteractiveLink from "@/components/InteractiveLink";

export interface LabCardProps {
  repository: string;
  cover: string;
  title: string;
  author: string;
  description: ReactNode;
  onOpen?: (url: string) => void;
}

function LabCard({
  cover,
  title,
  author,
  description,
  repository,
  onOpen,
}: LabCardProps) {
  return (
    <InteractiveLink
      className="rounded overflow-hidden cursor-pointer shadow-xl w-full sm:w-[288px] dark:bg-[#2d2d2d]"
      href={repository}
      onOpen={onOpen}
    >
      <Image
        priority
        alt="lab cover"
        className="object-cover w-full h-40"
        src={cover}
        width={288}
        height={165}
      />
      <div className="py-8 px-7 flex flex-col gap-4">
        <section className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">{title}</h3>
            <small>by {author}</small>
          </div>
          <button className="bg-[#5b5bfa] hover:bg-[#7c7cfb] cursor-pointer rounded-full text-white py-2 px-4">
            GET
          </button>
        </section>
        <section>{description}</section>
      </div>
    </InteractiveLink>
  );
}

export default LabCard;
