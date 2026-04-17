import { Link, useLocation } from "react-router-dom";
import CyberNavbar from "@/components/CyberNavbar";
import CyberScreen from "@/components/layout/CyberScreen";
import { appRoutes } from "@/app/routes";

const NotFound = () => {
  const location = useLocation();

  return (
    <CyberScreen navbar={<CyberNavbar />}>
      <div className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="w-full max-w-lg rounded-2xl border border-primary/20 bg-card/70 p-8 text-center shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <p className="font-mono text-xs tracking-[0.28em] text-accent">ROUTE BREACH DETECTED</p>
          <h1 className="mt-4 font-display text-6xl text-primary text-glow-cyan">404</h1>
          <p className="mt-4 text-lg text-foreground">The page you tried to access does not exist.</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Requested path: {location.pathname}
          </p>
          <Link
            to={appRoutes.home}
            className="mt-8 inline-flex items-center rounded-lg border border-primary/40 bg-primary/10 px-5 py-3 font-mono text-xs tracking-[0.2em] text-primary transition-colors hover:bg-primary/20"
          >
            RETURN TO HOME
          </Link>
        </div>
      </div>
    </CyberScreen>
  );
};

export default NotFound;
