"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isOnHomePage: boolean) => {
  if (href.startsWith('#')) {
    if (isOnHomePage) {
      // On home page, use smooth scroll
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    // If not on home page, let Link handle navigation to home page with hash
  }
};

export function LandingFooter() {
  const pathname = usePathname();
  const isOnHomePage = pathname === "/";

  return (
    <footer className="bg-emerald-950 text-white py-12 border-t-4 border-emerald-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-3 text-white">TaxComply NG</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Leading tax compliance platform for Nigerian companies and individuals. NRS-compliant. Always audit-ready.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                {isOnHomePage ? (
                  <a 
                    href="#features" 
                    onClick={(e) => handleSmoothScroll(e, "#features", isOnHomePage)} 
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                ) : (
                  <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
                )}
              </li>
              <li>
                  <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
           
              </li>
              <li>
                {isOnHomePage ? (
                  <a 
                    href="#testimonials" 
                    onClick={(e) => handleSmoothScroll(e, "#testimonials", isOnHomePage)} 
                    className="hover:text-white transition-colors"
                  >
                    Testimonials
                  </a>
                ) : (
                  <Link href="/#testimonials" className="hover:text-white transition-colors">Testimonials</Link>
                )}
              </li>
              <li>
                <Link href="/reviews" className="hover:text-white transition-colors">All Reviews</Link>
              </li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white text-sm">Support</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
              <li><Link href="/accessibility" className="hover:text-white transition-colors">Accessibility</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
              <li><Link href="/accessibility" className="hover:text-white transition-colors">Accessibility</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mb-12 p-8 bg-emerald-900/30 rounded-3xl border border-emerald-500/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-emerald-500/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-left max-w-lg">
              <h3 className="text-xl font-bold text-white mb-2">Be the First to Know</h3>
              <p className="text-emerald-100/70 text-sm">
                Join our exclusive list for critical tax reform updates, simplified compliance tips, and early feature access.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                const button = form.querySelector('button') as HTMLButtonElement;
                const input = form.querySelector('input') as HTMLInputElement;
                const originalText = button.innerHTML;

                try {
                  button.disabled = true;
                  input.disabled = true;
                  button.innerHTML = '<span class="animate-pulse">Joining...</span>';
                  
                  const res = await fetch('/api/v1/newsletter/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                  });
                  
                  const data = await res.json();
                  
                  if (res.ok) {
                    button.innerHTML = 'Welcome! ✓';
                    button.classList.add('bg-emerald-500', 'text-white');
                    input.value = '';
                    setTimeout(() => {
                      button.innerHTML = originalText;
                      button.disabled = false;
                      input.disabled = false;
                      button.classList.remove('bg-emerald-500', 'text-white');
                    }, 3000);
                  } else {
                    throw new Error(data.message);
                  }
                } catch (err: any) {
                  console.error(err);
                  button.innerHTML = 'Try Again';
                  button.classList.add('bg-red-500/20', 'text-red-200');
                  setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                    input.disabled = false;
                    button.classList.remove('bg-red-500/20', 'text-red-200');
                  }, 3000);
                }
              }}
              className="flex flex-col sm:flex-row gap-3 w-full md:w-auto"
            >
              <div className="relative group/input">
                <input 
                  type="email" 
                  name="email"
                  placeholder="enter your email address" 
                  required
                  className="w-full md:w-80 px-4 py-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 transition-all font-light"
                />
              </div>
              <button 
                type="submit"
                className="px-6 py-3 bg-white text-emerald-950 font-semibold rounded-xl hover:bg-emerald-50 transition-all shadow-lg hover:shadow-emerald-900/20 active:scale-95 disabled:opacity-70 disabled:active:scale-100 whitespace-nowrap"
              >
                Join Inner Circle
              </button>
            </form>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-slate-400 mb-2 md:mb-0">
              © {new Date().getFullYear()} TaxComply NG. All rights reserved.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">100% NRS-Compliant Platform</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}












