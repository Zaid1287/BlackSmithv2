import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Route, 
  History, 
  Users, 
  Truck, 
  BarChart3, 
  DollarSign, 
  LogOut,
  Globe,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/active-journeys", icon: LayoutDashboard, roles: ["driver"] },
  { name: "Dashboard", href: "/financial-management", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Journey History", href: "/journey-history", icon: History, roles: ["driver"] },
  { name: "Mobile Driver App", href: "/mobile-driver", icon: Globe, roles: ["driver"] },
  { name: "Manage Users", href: "/manage-users", icon: Users, roles: ["admin"] },
  { name: "Manage Vehicles", href: "/manage-vehicles", icon: Truck, roles: ["admin"] },
  { name: "Financial Management", href: "/financial-management", icon: BarChart3, roles: ["admin"] },
  { name: "Salaries", href: "/salaries", icon: DollarSign, roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} sidebar-dark text-white flex flex-col transition-all duration-300`}>
      {/* Logo and Toggle */}
      <div className="p-6 border-b border-gray-700">
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center justify-center">
              <span className="text-lg font-serif font-bold text-white">B</span>
              <div className="w-0.5 h-6 bg-white mx-1"></div>
              <span className="text-lg font-serif font-bold text-white">S</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-300 hover:text-white hover:bg-gray-800 p-1"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center mr-3">
                <span className="text-2xl font-serif font-bold text-white">B</span>
                <div className="w-0.5 h-8 bg-white mx-2"></div>
                <span className="text-2xl font-serif font-bold text-white">S</span>
              </div>
              <span className="text-xs font-medium tracking-wider">BLACKSMITH TRADERS</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-300 hover:text-white hover:bg-gray-800 p-1 flex-shrink-0"
            >
              <ChevronLeft size={18} />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div className={`flex items-center rounded-lg transition-colors cursor-pointer ${
                    isActive 
                      ? "bg-gray-800 text-white" 
                      : "hover:bg-gray-800 text-gray-300 hover:text-white"
                  } ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'}`}>
                    <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-700">
        {!isCollapsed ? (
          <>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-gray-400 capitalize">{user.role}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <Select defaultValue="english">
                <SelectTrigger className="w-full bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="tamil">Tamil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={logout}
              variant="ghost" 
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <Button 
              onClick={logout}
              variant="ghost" 
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-800 p-2"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
