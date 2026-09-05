"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  Car,
  FileBarChart,
  Plug,
  BookOpen,
  Fuel,
  MapPinned,
  Route,
  Truck,
  Database,
  UserRound,
  Menu,
  ScanEye,
  Settings,
  Sparkles,
  PackageSearch,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandPartners } from "@/components/brand-partners";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useI18n } from "@/components/i18n/use-i18n";
import { CoreWorkflowOnboarding } from "@/components/onboarding/core-workflow-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  badgeKey?: string;
};

type NavGroup = {
  labelKey: string | null;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.groups.overview",
    items: [
      { href: "/", labelKey: "nav.items.home", icon: Home },
      { href: "/dashboard", labelKey: "nav.items.maintenance", icon: LayoutDashboard },
      {
        href: "/routing/dashboard",
        labelKey: "nav.items.logistics",
        icon: Truck,
      },
    ],
  },
  {
    labelKey: "nav.groups.aiAssistant",
    items: [
      {
        href: "/ai/chat",
        labelKey: "nav.items.companyAssistant",
        icon: Sparkles,
        badgeKey: "nav.badges.ai",
      },
      {
        href: "/ai/settings",
        labelKey: "nav.items.aiSettings",
        icon: Settings,
      },
    ],
  },
  {
    labelKey: "nav.groups.computerVision",
    items: [
      {
        href: "/computer-vision/load-detection",
        labelKey: "nav.items.loadDetection",
        icon: PackageSearch,
      },
      {
        href: "/computer-vision/odol-detection",
        labelKey: "nav.items.odolDetection",
        icon: ScanEye,
      },
      {
        href: "/computer-vision/hub-congestion-detection",
        labelKey: "nav.items.hubCongestion",
        icon: Warehouse,
      },
    ],
  },
  {
    labelKey: "nav.groups.routing",
    items: [
      { href: "/routing/orders", labelKey: "nav.items.orders", icon: MapPinned },
      { href: "/routing/drivers", labelKey: "nav.items.drivers", icon: UserRound },
      { href: "/routing/plan", labelKey: "nav.items.planRoute", icon: Route },
      { href: "/routing/reports", labelKey: "nav.items.reports", icon: FileBarChart },
      {
        href: "/routing/methodology",
        labelKey: "nav.items.metricsGuide",
        icon: BookOpen,
      },
    ],
  },
  {
    labelKey: "nav.groups.fleet",
    items: [
      { href: "/vehicles", labelKey: "nav.items.vehicles", icon: Car },
      { href: "/reports", labelKey: "nav.items.reports", icon: FileBarChart },
      { href: "/methodology", labelKey: "nav.items.metricsGuide", icon: BookOpen },
    ],
  },
  {
    labelKey: "nav.groups.system",
    items: [
      { href: "/system/gas-price", labelKey: "nav.items.gasPrice", icon: Fuel },
      {
        href: "/connectors",
        labelKey: "nav.items.connectors",
        icon: Plug,
        badgeKey: "nav.badges.future",
      },
      {
        href: "/admin/mockup-data",
        labelKey: "nav.items.mockupData",
        icon: Database,
        badgeKey: "nav.badges.admin",
      },
    ],
  },
];

const allHrefs = navGroups.flatMap((group) =>
  group.items.map((item) => item.href)
);

/**
 * A link is active only if it is the longest nav href matching the current
 * pathname, so /vehicles/import highlights "Import CSV" without also
 * highlighting "Vehicles".
 */
function useActiveHref() {
  const pathname = usePathname();
  return React.useMemo(() => {
    let best: string | null = null;
    for (const href of allHrefs) {
      if (pathname === href || pathname.startsWith(href + "/")) {
        if (!best || href.length > best.length) best = href;
      }
    }
    return best;
  }, [pathname]);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const activeHref = useActiveHref();
  const { t } = useI18n();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {navGroups.map((group, groupIndex) => (
        <div
          key={group.labelKey ?? groupIndex}
          className="flex flex-col gap-0.5"
        >
          {group.labelKey && (
            <div
              className={cn(
                "mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70",
                groupIndex === 0 ? "mt-1" : "mt-4"
              )}
            >
              {t(group.labelKey)}
            </div>
          )}
          {group.items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
                {item.badgeKey && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      isActive && "border-primary/25 text-primary"
                    )}
                  >
                    {t(item.badgeKey)}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function BrandHeader() {
  const { t } = useI18n();

  return (
    <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            {t("chrome.appName")}
          </h1>
          <span className="text-[10px] font-medium text-muted-foreground/70">
            v0.2
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {t("chrome.tagline")}
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { t } = useI18n();

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
          <BrandHeader />
          <NavLinks />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("chrome.openMenu")}
                    />
                  }
                >
                  <Menu className="h-5 w-5" />
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex w-72 flex-col gap-0 bg-sidebar p-0"
                >
                  <SheetHeader className="flex h-16 shrink-0 justify-center border-b border-sidebar-border px-5 text-left">
                    <SheetTitle className="text-xl text-primary">
                      {t("chrome.appName")}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("chrome.tagline")}
                    </p>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <NavLinks onNavigate={() => setMobileOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <span className="font-semibold text-primary">
                  {t("chrome.appName")}
                </span>
              </div>
            </div>
            <div className="hidden min-w-0 md:block" />
            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
              <LanguageToggle />
              <CoreWorkflowOnboarding />
              <BrandPartners className="shrink-0" />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 [&:has(.ai-chat-page)]:p-3 md:[&:has(.ai-chat-page)]:p-4">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
