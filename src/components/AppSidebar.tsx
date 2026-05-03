import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, FileSearch, BarChart3,
  FileText, User, LogOut, GraduationCap, ClipboardList,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Faculty", url: "/admin/faculty", icon: Users },
  { title: "Subjects", url: "/admin/subjects", icon: ClipboardList },
  { title: "Upload Sheets", url: "/admin/upload", icon: Upload },
  { title: "Assign", url: "/admin/assign", icon: FileSearch },
  { title: "Monitoring", url: "/admin/monitoring", icon: BarChart3 },
  { title: "Reports", url: "/admin/reports", icon: FileText },
];

const facultyNav = [
  { title: "Dashboard", url: "/faculty", icon: LayoutDashboard, end: true },
  { title: "Assigned Papers", url: "/faculty/papers", icon: ClipboardList },
  { title: "Past Evaluations", url: "/faculty/history", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, signOut } = useAuth();
  const items = role === "admin" ? adminNav : facultyNav;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70">
      <SidebarHeader className="border-b border-sidebar-border/70">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-glow">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">EvalSheet Pro</p>
              <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{role} Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end ? pathname === item.url : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 rounded-xl px-3 transition hover:translate-x-0.5 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                    >
                      <NavLink to={item.url} end={item.end}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/profile"}
                  tooltip="Profile"
                  className="h-10 rounded-xl px-3 transition hover:translate-x-0.5 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                >
                  <NavLink to="/profile">
                    <User className="h-4 w-4" />
                    {!collapsed && <span>Profile</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70">
        <Button
          variant="ghost"
          className="h-10 w-full justify-start rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
