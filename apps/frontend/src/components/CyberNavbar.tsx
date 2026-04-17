import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Bug, Menu, X, User, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { appRoutes, primaryNavItems } from "@/app/routes";
import { useAuth } from "@/features/auth/auth-context";

const CyberNavbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/70"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-5">
          {/* Logo */}
          <Link to={appRoutes.home} className="group flex items-center gap-2 lg:justify-self-start">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/50 flex items-center justify-center glow-cyan">
              <Bug className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm tracking-[0.2em] text-primary text-glow-cyan">
              CODE<span className="text-neon-pink">CONTAGION</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center justify-center gap-0.5 lg:flex">
            {primaryNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group relative px-3 py-2 xl:px-4"
                >
                  <span className={`font-mono text-xs tracking-widest transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-2 right-2 h-px bg-primary glow-cyan"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="hidden items-center gap-3 lg:flex lg:justify-self-end">
            {isAuthenticated ? (
              <>
                <Link to={appRoutes.profile} className="flex items-center gap-2 rounded border border-border/30 px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:border-border/60">
                  <User className="w-4 h-4" />
                  <span className="font-mono text-[10px] tracking-widest">{user?.handle}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded border border-primary/30 px-3 py-2 font-mono text-[10px] tracking-widest text-primary transition-colors hover:bg-primary/10"
                >
                  <LogOut className="w-4 h-4" />
                  DISCONNECT
                </button>
              </>
            ) : (
              <Link
                to={appRoutes.login}
                className="px-3 py-1.5 border border-primary/30 rounded text-xs font-mono text-primary hover:bg-primary/10 transition-colors glow-cyan"
              >
                CONNECT
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="text-foreground lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border/50 bg-background/95 backdrop-blur-xl lg:hidden"
        >
          {primaryNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 font-mono text-xs tracking-widest border-b border-border/20 ${location.pathname === item.path ? "text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                to={appRoutes.profile}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-6 py-3 font-mono text-xs tracking-widest border-b border-border/20 text-muted-foreground"
              >
                <User className="w-4 h-4" />
                PROFILE
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-3 px-6 py-3 font-mono text-xs tracking-widest text-primary"
              >
                <LogOut className="w-4 h-4" />
                DISCONNECT
              </button>
            </>
          ) : (
            <Link
              to={appRoutes.login}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-6 py-3 font-mono text-xs tracking-widest text-primary"
            >
              <LogIn className="w-4 h-4" />
              CONNECT
            </Link>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};

export default CyberNavbar;
