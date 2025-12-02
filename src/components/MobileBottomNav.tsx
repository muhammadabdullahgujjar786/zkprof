import { Link, useLocation } from "react-router-dom";
import { Camera, Images, Share2, HelpCircle } from "lucide-react";

const navItems = [
  { to: "/take-photo", icon: Camera, label: "Photo" },
  { to: "/zkpfps", icon: Images, label: "zkPFPs" },
  { to: "/manage-sharing", icon: Share2, label: "Share" },
  { to: "/how-to-use", icon: HelpCircle, label: "Help" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
      <div className="flex items-center justify-around py-3 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                isActive 
                  ? "text-secondary bg-secondary/10" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
