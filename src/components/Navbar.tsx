import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredUser, clearStoredUser } from "@/lib/api";
import { ArrowRight, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface NavbarProps {
  /** Optional extra nav links (e.g. Features, How it works for home) */
  extraNav?: React.ReactNode;
  /** Optional CTA label; default "Book Now" */
  ctaLabel?: string;
  /** Optional CTA path; default /book */
  ctaPath?: string;
}

const Navbar = ({ extraNav, ctaLabel = "Book Now", ctaPath = "/book" }: NavbarProps) => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    clearStoredUser();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo (2).png" alt="RailSeat" className="h-10 w-auto object-contain" />
          <span className="font-display font-bold text-xl text-foreground tracking-tight">
            RailSeat
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {extraNav}
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <span className="hidden sm:inline text-muted-foreground">
                      {user.username}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile & Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild>
                <Link to={ctaPath}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button variant="outline" asChild className="border-primary/30 text-primary hover:bg-primary/10">
                <Link to="/signup">Sign up</Link>
              </Button>
              <Button asChild>
                <Link to={ctaPath}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
