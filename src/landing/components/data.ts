/** The content of the landing page that is data rather than markup. */

export const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#pricing", label: "Pricing" },
  { href: "#client", label: "Client" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export const FAQ_ITEMS = [
  "How can I verify that my files are encrypted?",
  "What happens if an upload fails?",
  "How much storage do I get for free?",
  "Can I close all my drives at once?",
];

/** The client does the encryption, so the public repository to inspect is the client's (the server only stores ciphertext). */
export const SOURCE_CODE_URL = "https://github.com/owload/owload-front";
