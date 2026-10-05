import "./landing.css";
import { ContactSection } from "./components/contact-section";
import { FaqSection } from "./components/faq-section";
import { Hero } from "./components/hero";
import { LandingFooter } from "./components/landing-footer";
import { PricingSection } from "./components/pricing-section";
import { ProductSection } from "./components/product-section";
import { SecuritySection } from "./components/security-section";

/**
 * The landing page (owload-docs/epics/0026, decisions/0024): the "Sunny" design. Sign in and sign up lead to the
 * identity provider through the application's login and register actions.
 */
export function Landing() {
  return (
    <div className="lp">
      <Hero />
      <ProductSection />
      <SecuritySection />
      <PricingSection />
      <FaqSection />
      <ContactSection />
      <LandingFooter />
    </div>
  );
}
