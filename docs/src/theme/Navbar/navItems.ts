import { useLocation } from "@docusaurus/router";
import type { Props as NavbarItemConfig } from "@theme/NavbarItem";

export type NavbarContext = "landing" | "docs";

type PortalNavbar = {
  context: NavbarContext;
  items: NavbarItemConfig[];
};

const rustDocsUrl = "https://github.com/murali-engine/murali-rs/tree/main/docs";

const landingItems: NavbarItemConfig[] = [
  { to: "/docs/", label: "Docs", position: "left" },
  {
    href: "https://github.com/murali-engine/murali-js/tree/main/examples",
    label: "Examples",
    position: "left",
  },
  {
    href: "https://www.youtube.com/@muraliengine",
    label: "Showcase",
    position: "left",
  },
  {
    href: rustDocsUrl,
    label: "Murali (Rust)",
    position: "right",
  },
  {
    href: "https://github.com/murali-engine/murali-js",
    label: "GitHub",
    position: "right",
  },
];

const docsItems: NavbarItemConfig[] = [
  { to: "/docs/", label: "Documentation", position: "left" },
  { to: "/docs/getting-started/", label: "Getting started", position: "left" },
  { to: "/docs/api-overview/", label: "API areas", position: "left" },
  {
    type: "docsVersionDropdown",
    docsPluginId: "default",
    position: "right",
    dropdownActiveClassDisabled: true,
    dropdownItemsBefore: [],
    dropdownItemsAfter: [],
    items: [],
  },
  {
    href: rustDocsUrl,
    label: "Murali (Rust)",
    position: "right",
  },
  {
    href: "https://github.com/murali-engine/murali-js",
    label: "GitHub",
    position: "right",
  },
];

export function usePortalNavbar(): PortalNavbar {
  const { pathname } = useLocation();

  if (pathname.startsWith("/docs/")) {
    return {
      context: "docs",
      items: docsItems,
    };
  }

  return { context: "landing", items: landingItems };
}
