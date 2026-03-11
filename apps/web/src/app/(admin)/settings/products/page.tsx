"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  costCents: number;
  salePriceCents?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

const empty = { name: "", sku: "", category: "", costCents: 0, salePriceCents: 0, stockQuantity: 0, lowStockThreshold: 5 };

export default function ProductsSettingsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);

  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products");
      return res.data as { products: Product[] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        category: form.category || undefined,
        costCents: Math.round(form.costCents * 100),
        salePriceCents: form.salePriceCents ? Math.round(form.salePriceCents * 100) : undefined,
        stockQuantity: form.stockQuantity,
        lowStockThreshold: form.lowStockThreshold,
      };
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/products/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      category: p.category ?? "",
      costCents: p.costCents / 100,
      salePriceCents: p.salePriceCents ? p.salePriceCents / 100 : 0,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
    });
    setModal(true);
  };

  const products = data?.products ?? [];
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products & Inventory</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setModal(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} low on stock
          </span>
        </div>
      )}

      <div className="space-y-2">
        {products.map((p) => (
          <Card key={p.id} className="!p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  {p.sku && <span className="text-xs text-[var(--muted-foreground)]">SKU: {p.sku}</span>}
                  {p.stockQuantity <= p.lowStockThreshold && <Badge variant="warning">Low Stock</Badge>}
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Cost: &pound;{(p.costCents / 100).toFixed(2)}
                  {p.salePriceCents && <> &mdash; Sale: &pound;{(p.salePriceCents / 100).toFixed(2)}</>}
                  &mdash; Stock: {p.stockQuantity}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(p.id); }}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {products.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No products yet</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Product" : "Add Product"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cost (&pound;)" type="number" step="0.01" value={String(form.costCents)} onChange={(e) => setForm((f) => ({ ...f, costCents: Number(e.target.value) }))} />
            <Input label="Sale Price (&pound;)" type="number" step="0.01" value={String(form.salePriceCents)} onChange={(e) => setForm((f) => ({ ...f, salePriceCents: Number(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Stock Quantity" type="number" value={String(form.stockQuantity)} onChange={(e) => setForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))} />
            <Input label="Low Stock Alert" type="number" value={String(form.lowStockThreshold)} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
