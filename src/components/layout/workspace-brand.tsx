import Image from "next/image";

export function WorkspaceBrand() {
  return (
    <span className="flex items-center gap-control-inset">
      <Image
        src="/brand/dxcel-logo.svg"
        alt=""
        width={1000}
        height={1000}
        className="size-brand-mark shrink-0 rounded-control object-contain"
      />
      <span className="hidden text-heading-md font-bold tracking-tight desktop:inline">DXCEL</span>
    </span>
  );
}
