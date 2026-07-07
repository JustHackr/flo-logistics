"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Upload,
  FileBarChart,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/vehicles/import", label: "Import CSV", icon: Upload },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  {
    href: "/connectors",
    label: "Connectors",
    icon: Plug,
    badge: "Future",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
          <div className="border-b px-6 py-5">
            <h1 className="text-lg font-semibold tracking-tight">
              Predictive Maintenance
            </h1>
            <p className="text-xs text-muted-foreground">Fleet quality demo</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/vehicles/import" &&
                  pathname.startsWith(item.href));
              const isImport = item.href === "/vehicles/import";
              const importActive = pathname === "/vehicles/import";

              const isActive = isImport ? importActive : active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
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
                        isActive && "border-primary-foreground/30 text-primary-foreground"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center border-b bg-background px-4 py-3 md:hidden">
            <span className="font-semibold">Predictive Maintenance</span>
          </header>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
