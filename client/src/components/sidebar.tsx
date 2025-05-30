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
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/active-journeys", icon: LayoutDashboard, roles: ["driver"] },
  { name: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Journey History", href: "/journey-history", icon: History, roles: ["driver", "admin"] },
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
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col transition-all duration-300 shadow-2xl border-r border-slate-700/50`}>
      {/* Logo and Toggle */}
      <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-blue-700/20">
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-2 shadow-lg">
              <span className="text-lg font-serif font-bold text-white">B</span>
              <div className="w-0.5 h-6 bg-white/80 mx-1"></div>
              <span className="text-lg font-serif font-bold text-white">S</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-300 hover:text-white hover:bg-slate-700/50 p-1 rounded-lg"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center mr-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-2 shadow-lg">
                <span className="text-2xl font-serif font-bold text-white">B</span>
                <div className="w-0.5 h-8 bg-white/80 mx-2"></div>
                <span className="text-2xl font-serif font-bold text-white">S</span>
              </div>
              <div>
                <div className="text-sm font-bold tracking-wider text-white">BLACKSMITH</div>
                <div className="text-xs font-medium tracking-wider text-blue-200">TRADERS</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-300 hover:text-white hover:bg-slate-700/50 p-1 flex-shrink-0 rounded-lg"
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
                  <div className={`flex items-center rounded-xl transition-all duration-200 cursor-pointer transform hover:scale-105 ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg" 
                      : "hover:bg-slate-700/50 text-gray-300 hover:text-white hover:translate-x-1"
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
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        {!isCollapsed ? (
          <>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mr-3 ring-2 ring-blue-500/30 shadow-lg">
                <span className="text-sm font-bold text-white">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-blue-200 capitalize bg-blue-900/30 px-2 py-1 rounded-full inline-block">{user.role}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <Select defaultValue="english">
                <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
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
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-600/20 hover:border-red-600/50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center ring-2 ring-blue-500/30 shadow-lg">
              <span className="text-sm font-bold text-white">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <Button 
              onClick={logout}
              variant="ghost" 
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-red-600/20 p-2 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
