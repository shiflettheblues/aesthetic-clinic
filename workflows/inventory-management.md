# Inventory & Product Management

## Objective
Track clinic products and consumables, link products to treatments with usage quantities, manage stock levels, and conduct physical stock takes.

## When to Use
- Adding new products to inventory
- Linking products to treatments (e.g., "Botox uses 1 vial per session")
- Recording stock movements (deliveries, usage, returns)
- Conducting physical stock counts
- Monitoring low stock levels

## Prerequisites
- Admin access for product management
- Treatments created in the system (for linking)

## Steps

### 1. Create a Product

- POST /products (admin)
  - `name`: product name
  - `category`: product category (e.g., "Injectables", "Skincare", "Consumables")
  - `costCents`: cost price per unit
  - `salePriceCents`: sale price per unit (if sold retail)
  - `stockQuantity`: initial stock level
  - `lowStockThreshold`: alert threshold (e.g., 5)
  - `active`: true
- Initial stock movement automatically recorded with reason: "initial_stock"

### 2. Link Products to Treatments

- POST /products/treatment-link
  - `productId`: the product
  - `treatmentId`: the treatment that uses this product
  - `quantity`: units consumed per treatment session
- Example: "Juvederm Ultra" linked to "Lip Filler" treatment, quantity: 1
- This enables automatic stock tracking when treatments are completed
- DELETE /products/treatment-link/:id — remove a link (admin)

### 3. Record Stock Movements

- POST /products/stock-movement
  - `productId`: the product
  - `quantity`: positive (incoming) or negative (outgoing)
  - `reason`: one of:
    - `initial_stock` — first stock entry
    - `usage` — consumed during treatment
    - `returns` — returned to supplier or from client
    - `stock_take` — adjustment from physical count
  - `notes`: (optional) additional context
- Stock quantity on the product is updated automatically

### 4. Monitor Low Stock

- GET /products/low-stock
- Returns products where `stockQuantity <= lowStockThreshold`
- Review this report regularly (daily/weekly) to prevent stockouts
- Reorder products before they run out

### 5. Physical Stock Take

- POST /products/stock-take (admin)
  - Array of `{ productId, countedQuantity }`
- For each product:
  - Calculates variance: countedQuantity - current stockQuantity
  - Creates a stock movement with reason: "stock_take" and the variance amount
  - Updates stockQuantity to the counted value
- Variance records serve as an audit trail for discrepancies

### 6. View Product Details

- GET /products/:id
- Returns:
  - Product information (name, category, pricing, stock level)
  - Treatment links (which treatments use this product)
  - Last 20 stock movements (audit trail)

### 7. Product Reports

- GET /reports/products
- Shows:
  - Product usage by completed appointments
  - Stock movement history
  - Cost analysis (cost vs sale price margins)
  - Most-used products

### 8. Filter and Search Products

- GET /products with filters:
  - `category`: filter by product category
  - `lowStock`: true to show only low stock items
  - `active`: true/false for active/inactive products

## Edge Cases

| Scenario | Action |
|----------|--------|
| Stock goes negative | System allows it — investigate the discrepancy via stock movements |
| Product discontinued | Set active: false — historical records preserved |
| Stock take shows major variance | Review recent movements for missed entries. Check for theft or waste |
| Treatment uses variable product quantity | Set the average/standard quantity — adjust manually for exceptions |
| Product used across multiple treatments | Create separate treatment links for each treatment |
| Bulk delivery received | Record single stock movement with total quantity and reason: "initial_stock" |

## Related Workflows
- [Appointment Day](appointment-day.md) — product usage during treatments
- [Reporting](reporting.md) — product and financial reports
- [Settings & Configuration](settings-configuration.md) — product categories and defaults
