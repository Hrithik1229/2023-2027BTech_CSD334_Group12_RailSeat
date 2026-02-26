import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { clearStoredUser, getStoredUser } from "@/lib/api";
import { HelpCircle, Home, Ticket, UserCircle2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface NavbarProps {
  /** Optional extra nav links */
  extraNav?: React.ReactNode;
  ctaLabel?: string;
  ctaPath?: string;
}

const Navbar = ({ extraNav, ctaLabel = "Book Now", ctaPath = "/book" }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const handleLogout = () => {
    clearStoredUser();
    navigate("/");
  };

  const tabs = [
    { title: "Home", icon: Home },
    { title: user ? (user.username ?? "My Account") : "Sign In", icon: UserCircle2 },
    { type: "separator" as const },
    { title: "Book Ticket", icon: Ticket },
    { title: "Support", icon: HelpCircle },
  ];

  const getTabIndex = () => {
    if (location.pathname === "/") return 0;
    if (location.pathname === "/profile") return 1;
    if (location.pathname === "/login") return 1;
    if (location.pathname === "/book") return 3;
    return null;
  };

  const handleTabChange = (index: number | null) => {
    if (index === 0) navigate("/");
    if (index === 1) navigate(user ? "/profile" : "/login");
    if (index === 3) navigate("/book");
    if (index === 4) {
      if (location.pathname === "/") {
        // Already on index — smooth scroll to the footer
        document.getElementById("support")?.scrollIntoView({ behavior: "smooth" });
      } else {
        // Navigate to the index page and land on the footer via hash
        navigate("/#support");
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full min-w-[320px] border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo (2).png" alt="RailSeat" className="h-10 w-auto object-contain" />
          <span className="font-display font-bold text-xl text-foreground tracking-tight">
            RailSeat
          </span>
        </Link>

        <nav className="flex flex-1 items-center justify-center mx-4">
          <div className="hidden md:block">
            <ExpandableTabs tabs={tabs} defaultSelected={getTabIndex()} onChange={handleTabChange} activeColor="text-primary" />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
