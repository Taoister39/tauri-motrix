import { URL_FOR_RELEASE } from "../constants/base_link";
import OpenLink from "./OpenLink";

export default function ReleaseUnavailable() {
  return (
    <p className="text-sm my-4 max-w-xl">
      Latest release information is temporarily unavailable.{" "}
      <OpenLink href={URL_FOR_RELEASE}>Browse GitHub releases</OpenLink>
    </p>
  );
}
