import { faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";

import { APP_REPO } from "@/constants/base_link";

export const NAV_LIST = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Features",
    href: "/features",
  },
  {
    title: "Download",
    href: "/download",
  },
  {
    title: "Lab",
    href: "/lab",
  },
];

export const NAV_LINK = [
  {
    icon: faTwitter,
    href: "https://x.com/Taoister39",
  },
  {
    icon: faGithub,
    href: APP_REPO,
  },
];
