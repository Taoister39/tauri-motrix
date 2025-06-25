import Image from "next/image";
import { ReactNode } from "react";

export interface LabCardProps {
  repository: string;
  cover: string;
  title: string;
  author: string;
  description: ReactNode;
}

function LabCard({
  repository,
  cover,
  title,
  author,
  description,
}: LabCardProps) {
  return (
    <a className="rounded cursor-pointer shadow-xl" href={repository}>
      <Image
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
          <button className="bg-[#5b5bfa] rounded-full text-white py-2 px-4">
            GET
          </button>
        </section>
        <section>{description}</section>
      </div>
    </a>
  );
}

export default LabCard;
