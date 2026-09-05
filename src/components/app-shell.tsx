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
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  label: string;
  icon: LucideIcon;
  badge?: string;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Overview", icon: Home },
      { href: "/dashboard", label: "Maintenance Dashboard", icon: LayoutDashboard },
      {
        href: "/routing/dashboard",
        label: "Logistics Dashboard",
        icon: Truck,
      },
    ],
  },
  {
    label: "AI Assistant",
    items: [
      {
        href: "/ai/chat",
        label: "Company Assistant",
        icon: Sparkles,
        badge: "AI",
      },
      {
        href: "/ai/settings",
        label: "AI Settings",
        icon: Settings,
      },
    ],
  },
  {
    label: "Computer Vision",
    items: [
      {
        href: "/computer-vision/odol-detection",
        label: "ODOL Detection",
        icon: ScanEye,
      },
      {
        href: "/computer-vision/hub-congestion-detection",
        label: "Hub Congestion Detection",
        icon: Warehouse,
      },
    ],
  },
  {
    label: "Routing Optimization",
    items: [
      { href: "/routing/orders", label: "Orders", icon: MapPinned },
      { href: "/routing/drivers", label: "Drivers", icon: UserRound },
      { href: "/routing/plan", label: "Plan Route", icon: Route },
      { href: "/routing/reports", label: "Reports", icon: FileBarChart },
      { href: "/routing/methodology", label: "Metrics & Guide", icon: BookOpen },
    ],
  },
  {
    label: "Predictive Maintenance",
    items: [
      { href: "/vehicles", label: "Vehicles", icon: Car },
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/methodology", label: "Metrics & Guide", icon: BookOpen },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/system/gas-price", label: "Gas Price", icon: Fuel },
      { href: "/connectors", label: "Connectors", icon: Plug, badge: "Future" },
      {
        href: "/admin/mockup-data",
        label: "Mockup Data",
        icon: Database,
        badge: "Admin",
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

  return (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {navGroups.map((group, groupIndex) => (
        <div key={group.label ?? groupIndex} className="flex flex-col gap-1">
          {group.label && (
            <div className="mt-5 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      isActive &&
                        "border-primary-foreground/30 text-primary-foreground"
                    )}
                  >
                    {item.badge}
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

function BrandSubtitle() {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Fab Logistics Operations
      </p>
      <p className="text-[10px] font-medium text-muted-foreground/80">v0.2</p>
    </>
  );
}

function BrandHeader() {
  return (
    <div className="border-b px-6 py-5">
      <h1 className="text-lg font-semibold tracking-tight">FLO</h1>
      <BrandSubtitle />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
          <BrandHeader />
          <NavLinks />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b bg-background px-4 py-3 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Open menu" />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
                <SheetHeader className="border-b px-6 py-5">
                  <SheetTitle>FLO</SheetTitle>
                  <BrandSubtitle />
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <span className="font-semibold">FLO</span>
              <span className="ml-2 text-[10px] font-medium text-muted-foreground">
                v0.2
              </span>
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
