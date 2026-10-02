import { useLocation } from "@docusaurus/router";
import type { Props as NavbarItemConfig } from "@theme/NavbarItem";

export type NavbarContext = "landing" | "javascript";

type EditionNavbar = {
  context: NavbarContext;
  editionLabel?: string;
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

const javascriptItems: NavbarItemConfig[] = [
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

export function useEditionNavbar(): EditionNavbar {
  const { pathname } = useLocation();

  if (pathname.startsWith("/docs/")) {
    return {
      context: "javascript",
      editionLabel: "JavaScript",
      items: javascriptItems,
    };
  }

  return { context: "landing", items: landingItems };
}
