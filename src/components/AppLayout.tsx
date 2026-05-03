import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Moon, Search, Sun, User } from "lucide-react";

export default function AppLayout() {
  const { user, role, signOut } = useAuth();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "FP";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl md:px-6">
            <SidebarTrigger className="h-9 w-9 rounded-lg border bg-card shadow-soft" />
            <div className="relative hidden w-full max-w-md sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 rounded-xl border-border/70 bg-card pl-9 shadow-soft transition focus-visible:ring-primary"
                placeholder="Search papers, students, subjects"
                aria-label="Search portal"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setDark((value) => !value)}
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-40 truncate text-sm font-medium md:inline">{user?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuLabel>
                    <span className="block text-sm">Faculty Portal</span>
                    <span className="block truncate text-xs font-normal capitalize text-muted-foreground">{role} account</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 bg-gradient-subtle p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
