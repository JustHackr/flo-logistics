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
  ShieldCheck,
  ShieldAlert,
  Clapperboard,
  LogOut,
  Workflow,
  PencilRuler,
  BarChart3,
  ScanBarcode,
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
import {
  canAccessPath,
  type SessionUser,
} from "@/lib/auth/roles";
import { logoutAction } from "@/app/actions/auth";

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
      {
        href: "/control-tower",
        labelKey: "nav.items.controlTower",
        icon: ShieldAlert,
      },
      {
        href: "/demo/scenario",
        labelKey: "nav.items.demoScenario",
        icon: Clapperboard,
        badgeKey: "nav.badges.demo",
      },
      {
        href: "/impact",
        labelKey: "nav.items.impactDashboard",
        icon: BarChart3,
      },
      {
        href: "/sovereign-ai",
        labelKey: "nav.items.sovereignAi",
        icon: ShieldCheck,
        badgeKey: "nav.badges.sovereign",
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
        href: "/computer-vision/tour",
        labelKey: "nav.items.cvTour",
        icon: Clapperboard,
        badgeKey: "nav.badges.demo",
      },
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
      {
        href: "/computer-vision/parcel-verification",
        labelKey: "nav.items.parcelVerification",
        icon: ScanBarcode,
        badgeKey: "nav.badges.demo",
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
    labelKey: "nav.groups.floBusinessProcess",
    items: [
      {
        href: "/admin/process-map",
        labelKey: "nav.items.floVisualization",
        icon: Workflow,
      },
      {
        href: "/admin/designer",
        labelKey: "nav.items.floDesigner",
        icon: PencilRuler,
        badgeKey: "nav.badges.ai",
      },
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

/**
 * A link is active only if it is the longest nav href matching the current
 * pathname, so /vehicles/import highlights "Import CSV" without also
 * highlighting "Vehicles".
 */
function useActiveHref(hrefs: string[]) {
  const pathname = usePathname();
  return React.useMemo(() => {
    let best: string | null = null;
    for (const href of hrefs) {
      if (pathname === href || pathname.startsWith(href + "/")) {
        if (!best || href.length > best.length) best = href;
      }
    }
    return best;
  }, [pathname, hrefs]);
}

function NavLinks({
  onNavigate,
  groups,
}: {
  onNavigate?: () => void;
  groups: NavGroup[];
}) {
  const hrefs = React.useMemo(
    () => groups.flatMap((g) => g.items.map((i) => i.href)),
    [groups],
  );
  const activeHref = useActiveHref(hrefs);
  const { t } = useI18n();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {groups.map((group, groupIndex) => (
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
            v0.3
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {t("chrome.tagline")}
        </p>
      </div>
    </div>
  );
}

function UserFooter({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <div className="rounded-xl bg-muted/50 px-3 py-2.5 ring-1 ring-foreground/5">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
          {t(`auth.roles.${user.role}.name`)}
        </p>
        <form action={logoutAction} className="mt-2">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-2 px-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("auth.signOut")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { t } = useI18n();

  const filteredGroups = React.useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          canAccessPath(user.role, item.href),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [user.role]);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
          <BrandHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <NavLinks groups={filteredGroups} />
          </div>
          <UserFooter user={user} />
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
                    <NavLinks
                      groups={filteredGroups}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </div>
                  <UserFooter user={user} />
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
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user.name}
              </span>
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
