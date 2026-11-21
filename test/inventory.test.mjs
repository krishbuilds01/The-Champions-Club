import assert from "node:assert/strict";
import { adjustStockInput, productCreateInput, parse } from "../lib/validate.ts";

console.log("Starting Inventory Management unit tests...");

// 1. Test adjustStockInput validation
const validAdjust = parse(adjustStockInput, { productId: 1, delta: 5 });
assert.equal(validAdjust.productId, 1);
assert.equal(validAdjust.delta, 5);

const validDeduct = parse(adjustStockInput, { productId: 2, delta: -3 });
assert.equal(validDeduct.delta, -3);

assert.throws(() => parse(adjustStockInput, { productId: 0, delta: 5 }), /Too small|Invalid/);
assert.throws(() => parse(adjustStockInput, { productId: 1, delta: "five" }), /Expected number|Invalid/);

// 2. Test productCreateInput validation
const validGear = parse(productCreateInput, {
  name: "Badminton Grip",
  price: 250,
  stock: 20,
  lowAt: 5,
  category: "GEAR",
});
assert.equal(validGear.name, "Badminton Grip");
assert.equal(validGear.price, 250);
assert.equal(validGear.stock, 20);
assert.equal(validGear.category, "GEAR");

assert.throws(() => parse(productCreateInput, { name: "", price: 100, category: "GEAR" }), /Product name is required/);
assert.throws(() => parse(productCreateInput, { name: "Test", price: -10, category: "GEAR" }), /Price must be greater than zero/);
assert.throws(() => parse(productCreateInput, { name: "Test", price: 100, category: "INVALID" }), /Invalid/);

// 3. Test stock boundary and low-stock rules
function computeStockStatus(currentStock, delta, lowAt) {
  const newStock = Math.max(0, currentStock + delta);
  const isOut = newStock === 0;
  const isLow = newStock > 0 && newStock <= lowAt;
  return { newStock, isOut, isLow };
}

// Deducting more than available clamps to 0
assert.deepEqual(computeStockStatus(3, -5, 5), { newStock: 0, isOut: true, isLow: false });
// Stock below low threshold triggers low-stock warning
assert.deepEqual(computeStockStatus(8, -4, 5), { newStock: 4, isOut: false, isLow: true });
// Normal restock clears low-stock state
assert.deepEqual(computeStockStatus(4, 10, 5), { newStock: 14, isOut: false, isLow: false });

console.log("All inventory management unit tests passed!");
