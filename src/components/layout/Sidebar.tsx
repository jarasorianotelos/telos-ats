import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "@/types";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  Trello,
  Star,
  DollarSign,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isAdmin = user?.role === "administrator";

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, adminOnly: true },
    { name: "Job Orders", href: "/job-orders", icon: Briefcase },
    { name: "Favorites", href: "/favorites", icon: Star },
    { name: "Candidates", href: "/applicants", icon: FileText },
    { name: "Pipeline", href: "/pipeline", icon: Trello },
    { name: "Commission", href: "/commission", icon: DollarSign },
    { name: "Users", href: "/users", icon: Users, adminOnly: true },
    { name: "Clients", href: "/clients", icon: Building2, adminOnly: true },
    { name: "Logs", href: "/logs", icon: ClipboardList, adminOnly: true },
  ];

  return (
    <div
      className={cn(
        "flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out",
        collapsed ? "w-[70px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div
          className={cn(
            "flex items-center transition-all duration-300",
            collapsed ? "justify-center w-full" : "justify-start"
          )}
        >
          {!collapsed && (
            <span className="text-xl font-bold text-[#A74D4A]">
              <img
                src="https://wnywlwahimhlfnxmwhsu.supabase.co/storage/v1/object/public/images//Roster%20Logo.png"
                alt="Roster Logo"
                className="w-40 "
              />
            </span>
          )}
          {collapsed && (
            <span className="text-xl font-bold  text-[#A74D4A]">
              <img
                src="https://wnywlwahimhlfnxmwhsu.supabase.co/storage/v1/object/public/images//R%20Logo%20(white).png"
                alt="Roster Logo"
                className="w-10 "
              />
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "p-0 h-6 w-6",
            collapsed &&
              "absolute right-0 -mr-3 bg-white border border-gray-200 rounded-full z-10"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              // Skip admin-only items for non-admin users
              if (item.adminOnly && !isAdmin) return null;

              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-2 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-ats-blue-50 text-[#A74D4A]"
                      : "text-gray-700 hover:bg-gray-100",
                    collapsed && "justify-center"
                  )}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 h-5 w-5",
                      isActive ? "text-[#A74D4A]" : "text-gray-500"
                    )}
                  />
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {user?.role === "administrator" ? "Admin" : "Recruiter"}
          </div>
          <div className="mt-1 text-sm text-gray-700 font-medium">
            {`${user?.first_name} ${user?.last_name}`}
          </div>
          <div className="text-xs text-gray-500 truncate">{user?.email}</div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
