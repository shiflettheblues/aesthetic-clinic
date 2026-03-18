"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  salePriceCents: number | null;
  costCents: number;
  isActive: boolean;
}

export default function ShopPage() {
  const [enquiredId, setEnquiredId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const res = await api.get("/products?active=true");
      return res.data as { products: Product[] };
    },
  });

  // Only show products with a sale price (retail products)
  const allProducts = (data?.products ?? []).filter((p) => p.salePriceCents && p.salePriceCents > 0 && p.isActive);
  const categories = [...new Set(allProducts.map((p) => p.category ?? "General"))].sort();

  const products = selectedCategory
    ? allProducts.filter((p) => (p.category ?? "General") === selectedCategory)
    : allProducts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Professional skincare products available for purchase at the clinic
        </p>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <Card className="text-center py-12">
          <ShoppingBag className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">No products available at the moment</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <div className="flex-1">
                {product.category && (
                  <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] mb-2">
                    <Tag className="h-3 w-3" /> {product.category}
                  </div>
                )}
                <h3 className="font-semibold">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">{product.description}</p>
                )}
                <p className="text-lg font-bold text-[var(--primary)] mt-3">
                  &pound;{(product.salePriceCents! / 100).toFixed(2)}
                </p>
              </div>
              <div className="mt-4">
                {enquiredId === product.id ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center">
                    Thanks! We&apos;ll have this ready for your next visit.
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => setEnquiredId(product.id)}
                  >
                    <ShoppingBag className="h-4 w-4 mr-1.5" /> Reserve for Pick-up
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
