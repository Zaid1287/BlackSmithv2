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
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "./language-selector";

const getNavigation = (t: (key: any) => string) => [
  { name: t('dashboard'), href: "/active-journeys", icon: LayoutDashboard, roles: ["driver"] },
  { name: t('adminDashboard'), href: "/admin-dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: t('journeyHistory'), href: "/journey-history", icon: History, roles: ["driver", "admin"] },
  { name: t('manageUsers'), href: "/manage-users", icon: Users, roles: ["admin"] },
  { name: t('manageVehicles'), href: "/manage-vehicles", icon: Truck, roles: ["admin"] },
  { name: t('financialManagement'), href: "/financial-management", icon: BarChart3, roles: ["admin"] },
  { name: t('salaries'), href: "/salaries", icon: DollarSign, roles: ["admin"] },
  { name: t('emi'), href: "/emi", icon: CreditCard, roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useLanguage();
  
  const navigation = getNavigation(t);

  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-48 md:w-64'} sidebar-dark text-white flex flex-col transition-all duration-300`}>
      {/* Logo and Toggle */}
      <div className={`${isCollapsed ? 'p-2' : 'p-6'} border-b border-gray-700`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-3">
            <Link href="/admin-dashboard">
              <div className="flex items-center justify-center cursor-pointer hover:bg-slate-700/50 p-1 rounded-lg transition-colors">
                <span className="text-sm font-serif font-bold text-white">B</span>
                <div className="w-0.5 h-4 bg-white mx-0.5"></div>
                <span className="text-sm font-serif font-bold text-white">S</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white hover:text-white hover:bg-slate-600/70 p-2 rounded-lg bg-slate-700/30 border border-slate-600/50"
              aria-label="expand"
            >
              <ChevronRight size={16} className="font-bold" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Link href="/admin-dashboard">
              <div className="flex items-center cursor-pointer hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center justify-center mr-3">
                  <span className="text-2xl font-serif font-bold text-white">B</span>
                  <div className="w-0.5 h-8 bg-white mx-2"></div>
                  <span className="text-2xl font-serif font-bold text-white">S</span>
                </div>
                <span className="text-xs font-medium tracking-wider">BLACKSMITH TRADERS</span>
              </div>
            </Link>
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

      {/* Navigation - Hidden when collapsed */}
      {!isCollapsed && (
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div className={`flex items-center rounded-lg transition-colors cursor-pointer px-4 py-3 ${
                      isActive 
                        ? "bg-gray-800 text-white" 
                        : "hover:bg-gray-800 text-gray-300 hover:text-white"
                    }`}>
                      <Icon className="w-5 h-5 mr-3" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* User Info - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
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
            <LanguageSelector />
          </div>
          
          <Button 
            onClick={logout}
            variant="ghost" 
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </div>
      )}


    </div>
  );
}
