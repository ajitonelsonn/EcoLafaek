// components/Layout.js
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Home,
  Map,
  AlertTriangle,
  FileText,
  Menu,
  X,
  ExternalLink,
  Sun,
  Trophy,
  Download,
  Search,
  Mail,
} from "lucide-react";

export default function Layout({ children }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/", icon: <Home className="w-5 h-5" /> },
    {
      name: "Reports",
      href: "/reports",
      icon: <FileText className="w-5 h-5" />,
    },
    { name: "Map", href: "/map", icon: <Map className="w-5 h-5" /> },
    {
      name: "Hotspots",
      href: "/hotspots",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      name: "Vector Search",
      href: "/vector-search",
      icon: <Search className="w-5 h-5" />,
      badge: "AI",
    },
    {
      name: "Leaderboard",
      href: "/leaderboard",
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      name: "Download App",
      href: "/download",
      icon: <Download className="w-5 h-5" />,
      highlight: true,
    },
  ];

  function isActiveRoute(path) {
    return router.pathname === path;
  }

  // Handle route change events to show loading indicators
  useEffect(() => {
    const handleStart = () => {
      setIsPageLoading(true);
    };

    const handleComplete = () => {
      setIsPageLoading(false);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  // Add scroll listener to change header on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dashboard-bg relative">
      {/* Top Navigation - Increased z-index to ensure it's on top */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled ? "bg-white shadow-md" : "bg-green-700"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="h-10 w-10 relative">
                  <Image
                    src="/app_logo.png"
                    alt="Ecolafaek Logo"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <span
                  className={`font-bold text-xl transition-colors duration-200 ${
                    isScrolled ? "text-green-700" : "text-white"
                  }`}
                >
                  Ecolafaek
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                    item.highlight
                      ? isScrolled
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                      : isActiveRoute(item.href)
                      ? isScrolled
                        ? "bg-green-50 text-green-700"
                        : "bg-green-600 text-white"
                      : isScrolled
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-green-100 hover:bg-green-600"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}

              <div className="ml-3 border-l border-green-600 pl-3 py-2">
                <div
                  className={`inline-flex rounded-lg ${
                    isScrolled
                      ? "bg-gray-100 text-gray-700"
                      : "bg-green-600 text-green-100"
                  }`}
                >
                  <Link
                    href="/about"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium hover:underline"
                  >
                    About
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium hover:underline"
                  >
                    Contact
                  </Link>
                  <Link
                    href="/uc"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium hover:underline"
                  >
                    Help
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`inline-flex items-center justify-center p-2 rounded-lg focus:outline-none transition-colors ${
                  isScrolled
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-green-100 hover:bg-green-600 hover:text-white"
                }`}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay to capture clicks outside menu */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-gray-100 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${
                      item.highlight
                        ? "bg-green-600 text-white"
                        : isActiveRoute(item.href)
                        ? "bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
                <div className="pt-4 pb-2 border-t border-gray-200">
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/about"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <ExternalLink className="w-5 h-5" />
                      About
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Mail className="w-5 h-5" />
                      Contact
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Sun className="w-5 h-5" />
                      Help
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Page loading indicator */}
      {isPageLoading && (
        <div className="fixed inset-0 bg-white bg-opacity-75 z-[100] flex flex-col justify-center items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-100 border-t-green-500 mb-4"></div>
          <p className="text-green-600 font-medium text-xl">Loading page...</p>
          <p className="text-gray-500 mt-2">
            Please wait while we prepare the data
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="pt-16 relative z-0">
        <main>{children}</main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-10 relative z-10">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center lg:items-start">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-10 w-10 relative">
                  <Image
                    src="/app_logo.png"
                    alt="Ecolafaek Logo"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <span className="font-bold text-xl text-green-700">
                  Ecolafaek
                </span>
              </div>
              <div className="text-sm text-gray-500 text-center lg:text-left">
                &copy; {new Date().getFullYear()} Ecolafaek - Timor-Leste Eco
                Monitoring
                <br />
                Made in Timor-Leste 🇹🇱
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div>
                <h3 className="text-gray-700 font-medium mb-3">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/about"
                      className="text-gray-600 hover:text-green-600"
                    >
                      About the Project
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/uc"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/uc"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-gray-700 font-medium mb-3">Connect</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/contact"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact#contact-form"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Submit Feedback
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact#contact-form"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Report an Issue
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-gray-700 font-medium mb-3">Community</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/leaderboard"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Leaderboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/download"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Download App
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/code-repository"
                      className="text-gray-600 hover:text-green-600"
                    >
                      Code Repository
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-end">
              <p className="text-sm text-gray-500">
                Making Timor-Leste cleaner and healthier together
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
