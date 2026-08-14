import { LayoutDashboard, Database, ShieldAlert, Info, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Dataset', url: '/dataset', icon: Database },
  { title: 'Severity Analyzer', url: '/analyzer', icon: ShieldAlert },
  { title: 'About', url: '/about', icon: Info },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg gradient-blue flex items-center justify-center text-sm font-bold shrink-0">
          CL
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm text-foreground">CrashLens AI</div>
            <div className="text-[10px] text-muted-foreground">Analytics Platform</div>
          </div>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/'} className="hover:bg-accent/50 transition-colors" activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="h-4 w-4 mr-2 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <button className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1.5 rounded-md hover:bg-accent/50 w-full">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
