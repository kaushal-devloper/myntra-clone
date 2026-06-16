// Helper to get deterministic discount for testing if database has no discounts or for specific items
export function getProductDiscount(product: any): string | undefined {
  if (product?.discount) return product.discount;
  
  // Assign deterministic discounts to specific items so we have products in the 40-70% range
  const name = String(product?.name || "");
  if (name.includes("Premium Shirts 1")) return "40% OFF";
  if (name.includes("Premium Tops 2")) return "50% OFF";
  if (name.includes("Premium Sandals 3")) return "60% OFF";
  if (name.includes("Premium Watches 4")) return "70% OFF";
  if (name.includes("Premium Toys 5")) return "45% OFF";
  if (name.includes("Premium Fragrance 6")) return "55% OFF";
  if (name.includes("Premium Shirts 7")) return "65% OFF";
  
  return undefined;
}

export function getDiscountedPrice(price: number | string, discountStr?: string): number {
  const numericPrice = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
  const activeDiscount = discountStr || "";
  if (!activeDiscount || typeof activeDiscount !== 'string') return Math.round(numericPrice);

  const match = activeDiscount.match(/(\d+)/);
  if (!match) return Math.round(numericPrice);

  const pct = parseInt(match[1], 10);
  if (isNaN(pct) || pct <= 0 || pct > 100) return Math.round(numericPrice);

  return Math.round(numericPrice - (numericPrice * pct) / 100);
}

export function formatPriceDetail(price: number | string, discountStr?: string): {
  original: string;
  discounted: string;
  hasDiscount: boolean;
  pctText: string;
  formattedText: string;
} {
  const numericPrice = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
  const discountedPrice = getDiscountedPrice(numericPrice, discountStr);
  const hasDiscount = !!discountStr && discountedPrice < numericPrice;

  let pctText = '';
  if (discountStr) {
    const match = discountStr.match(/(\d+)/);
    pctText = match ? `${match[1]}% OFF` : discountStr;
  }

  const formattedText = hasDiscount
    ? `₹${Math.round(numericPrice)} → ₹${discountedPrice} ${pctText}`
    : `₹${Math.round(numericPrice)}`;

  return {
    original: `₹${Math.round(numericPrice)}`,
    discounted: `₹${discountedPrice}`,
    hasDiscount,
    pctText,
    formattedText,
  };
}
