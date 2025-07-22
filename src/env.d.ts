/// <reference types="@rsbuild/core/types" />

declare module "*.svg" {
  const content: string;
  export default content;
}
declare module "*.svg?react" {
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

declare module "bittorrent-peerid" {
  interface Parsed {
    version?: string;
    client: string;
  }

  const fn: (param: Buffer | string) => Parsed;
  export default fn;

  export { Parsed };
}

declare const OS_PLATFORM: NodeJS.Platform;
