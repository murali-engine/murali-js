import React, { type ReactNode } from "react";
import clsx from "clsx";
import { ErrorCauseBoundary, ThemeClassNames } from "@docusaurus/theme-common";
import { splitNavbarItems, useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";
import NavbarItem, { type Props as NavbarItemConfig } from "@theme/NavbarItem";
import NavbarColorModeToggle from "@theme/Navbar/ColorModeToggle";
import SearchBar from "@theme/SearchBar";
import NavbarMobileSidebarToggle from "@theme/Navbar/MobileSidebar/Toggle";
import NavbarLogo from "@theme/Navbar/Logo";
import NavbarSearch from "@theme/Navbar/Search";

import { useEditionNavbar } from "../navItems";
import styles from "./styles.module.css";

function NavbarItems({ items }: { items: NavbarItemConfig[] }): ReactNode {
  return (
    <>
      {items.map((item, index) => {
        const { items: _typeOnlyItems, ...renderedItem } = item as NavbarItemConfig & {
          items?: unknown;
        };
        return (
          <ErrorCauseBoundary
            key={`${("label" in item ? item.label : undefined) ?? item.type ?? "item"}-${index}`}
            onError={(error) => new Error("A Murali navbar item failed to render.", { cause: error })}
          >
            <NavbarItem {...(renderedItem as NavbarItemConfig)} />
          </ErrorCauseBoundary>
        );
      })}
    </>
  );
}

export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const { context, editionLabel, items } = useEditionNavbar();
  const [leftItems, rightItems] = splitNavbarItems(items);

  return (
    <div className="navbar__inner" data-navbar-context={context}>
      <div className={clsx(ThemeClassNames.layout.navbar.containerLeft, "navbar__items")}>
        {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
        <NavbarLogo />
        {editionLabel ? <span className={styles.editionLabel}>{editionLabel}</span> : null}
        <NavbarItems items={leftItems} />
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          "navbar__items navbar__items--right",
        )}
      >
        <NavbarItems items={rightItems} />
        <NavbarColorModeToggle className={styles.colorModeToggle} />
        <NavbarSearch>
          <SearchBar />
        </NavbarSearch>
      </div>
    </div>
  );
}
