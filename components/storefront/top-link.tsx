"use client";

import Link, { type LinkProps } from "next/link";

type TopLinkProps = LinkProps & Omit<React.ComponentPropsWithoutRef<typeof Link>, keyof LinkProps>;

export function TopLink({ href, onClick, ...props }: TopLinkProps) {
  return <Link href={href} {...props} onClick={(event) => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    onClick?.(event);
  }} />;
}
