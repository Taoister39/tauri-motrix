import { uni_constants } from "@tauri-motrix/unified-base";

const { APP_REPOSITORY } = uni_constants;

export const APP_REPO = APP_REPOSITORY;

export const ADD_DIALOG = "motrix://open-add-task-dialog";

export const ARIA2_UA = "aria2/1.37.0";
export const TRANSMISSION_UA = "Transmission/3.00";
export const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";
export const DU_UA =
  "netdisk;6.0.0.12;PC;PC-Windows;10.0.16299;WindowsBaiduYunGuanJia";

export const UA_MAP = {
  aria2: ARIA2_UA,
  transmission: TRANSMISSION_UA,
  chrome: CHROME_UA,
  du: DU_UA,
};

export const APP_WEBSITE_ORIGIN = "https://tauri-motrix-website.vercel.app";
