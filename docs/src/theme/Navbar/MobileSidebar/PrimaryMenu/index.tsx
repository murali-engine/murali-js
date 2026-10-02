import React, { type ReactNode } from "react";
import { useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";
import NavbarItem, { type Props as NavbarItemConfig } from "@theme/NavbarItem";

import { usePortalNavbar } from "../../navItems";

export default function NavbarMobilePrimaryMenu(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const { items } = usePortalNavbar();

  return (
    <ul className="menu__list">
      {items.map((item, index) => {
        const { items: _typeOnlyItems, ...renderedItem } = item as NavbarItemConfig & {
          items?: unknown;
        };
        return (
          <NavbarItem
            mobile
            {...(renderedItem as NavbarItemConfig)}
            onClick={() => mobileSidebar.toggle()}
            key={`${("label" in item ? item.label : undefined) ?? item.type ?? "item"}-${index}`}
          />
        );
      })}
    </ul>
  );
}
