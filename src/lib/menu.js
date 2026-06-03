// Bread options — roll tier vs hero/wrap tier determines protein price
export const ROLL_BREADS = ["Kaiser", "Club", "Dinner", "White", "Rye", "Whole Wheat"];
export const HERO_BREADS = ["Hero", "Plain Wrap", "Spinach Wrap", "Tomato Wrap", "WW Wrap", "Ciabatta", "Sourdough", "Focaccia", "Lettuce Wrap"];
export const ALL_BREADS = [...ROLL_BREADS, ...HERO_BREADS];
export const isHeroBread = (bread) => HERO_BREADS.includes(bread);

// Proteins — [name, rollPrice, heroPrice] — null heroPrice = hero only
export const PROTEINS = [
  // HAM
  { category: "Ham", name: "Iavarone Black Forest Ham", roll: 12, hero: 13 },
  { category: "Ham", name: "Iavarone Ham", roll: 12, hero: 13 },
  { category: "Ham", name: "Boar's Head Honey Maple Ham", roll: 12, hero: 13 },
  { category: "Ham", name: "Boar's Head Ham", roll: 12, hero: 13 },
  { category: "Ham", name: "Boar's Head LS Ham", roll: 12, hero: 13 },
  { category: "Ham", name: "Rosemary Parma Cotto", roll: 13, hero: 14 },
  { category: "Ham", name: "Parma Cotto", roll: 13, hero: 14 },
  // PORK
  { category: "Pork", name: "Domestic Prosciutto", roll: 13, hero: 14 },
  { category: "Pork", name: "Prosciutto di Parma", roll: 15, hero: 17 },
  { category: "Pork", name: "Prosciutto San Danielle", roll: 15, hero: 17 },
  { category: "Pork", name: "Speck", roll: 13, hero: 14 },
  { category: "Pork", name: "Genoa Salami", roll: 10, hero: 12 },
  { category: "Pork", name: "Golfetta Salami", roll: 14, hero: 15 },
  { category: "Pork", name: "Sweet Soppresata", roll: 12, hero: 13 },
  { category: "Pork", name: "Hot Soppresata", roll: 12, hero: 13 },
  { category: "Pork", name: "Porchetta", roll: 13, hero: 14 },
  { category: "Pork", name: "Sweet Capicola", roll: 14, hero: 15 },
  { category: "Pork", name: "Hot Capicola", roll: 14, hero: 15 },
  { category: "Pork", name: "Pepperoni", roll: 10, hero: 12 },
  { category: "Pork", name: "Liverwurst", roll: 10, hero: 10 },
  { category: "Pork", name: "Bologna", roll: 10, hero: 10 },
  { category: "Pork", name: "Italian Mortadella", roll: 11, hero: 13 },
  { category: "Pork", name: "Imported Mortadella", roll: 10, hero: 12 },
  // TURKEY
  { category: "Turkey", name: "Boar's Head Ovengold Turkey", roll: 12, hero: 13 },
  { category: "Turkey", name: "Boar's Head Honey Maple Turkey", roll: 12, hero: 13 },
  { category: "Turkey", name: "Boar's Head Cracked Pepper Turkey", roll: 12, hero: 13 },
  { category: "Turkey", name: "Fresh Carved Turkey", roll: 13, hero: 14 },
  { category: "Turkey", name: "IB Honey Maple Turkey", roll: 12, hero: 13 },
  { category: "Turkey", name: "IB Oven Roasted Turkey", roll: 12, hero: 13 },
  // CHICKEN
  { category: "Chicken", name: "Iavarone Chicken", roll: 11, hero: 12 },
  { category: "Chicken", name: "Boar's Head Buffalo Chicken", roll: 11, hero: 12 },
  { category: "Chicken", name: "Boar's Head Everroast Chicken", roll: 11, hero: 12 },
  { category: "Chicken", name: "Boar's Head Honey BBQ Chicken", roll: 11, hero: 12 },
  { category: "Chicken", name: "Boar's Head Classic Chicken", roll: 11, hero: 12 },
  // BEEF
  { category: "Beef", name: "Top Round Roast Beef", roll: 13, hero: 14 },
  { category: "Beef", name: "Eye Round Roast Beef", roll: 13, hero: 14 },
  { category: "Beef", name: "Corned Beef", roll: 13, hero: 14 },
  { category: "Beef", name: "Pastrami", roll: 13, hero: 14 },
  // PREPARED
  { category: "Prepared", name: "Meatball Parm", roll: null, hero: 15 },
  { category: "Prepared", name: "Eggplant Parm", roll: null, hero: 15 },
  { category: "Prepared", name: "Chicken Parm", roll: null, hero: 15 },
  { category: "Prepared", name: "Fried Chicken", roll: 13, hero: 14 },
  { category: "Prepared", name: "Grilled Chicken", roll: 13, hero: 14 },
  { category: "Prepared", name: "Tuna Salad", roll: 12, hero: 13 },
  { category: "Prepared", name: "Egg Salad", roll: 7, hero: 8 },
  { category: "Prepared", name: "Chicken Salad", roll: 12, hero: 13 },
  { category: "Prepared", name: "Shrimp Salad", roll: 13, hero: 14 },
  // VEGETABLE
  { category: "Vegetable", name: "Grilled Vegetables", roll: 10, hero: 12 },
  { category: "Vegetable", name: "Fried Eggplant", roll: 12, hero: 13 },
];

export const PROTEIN_CATEGORIES = [...new Set(PROTEINS.map(p => p.category))];

// Cheese — all $1.50 roll / $2.00 hero
export const CHEESES = [
  "Fresh Mozzarella", "Smoked Mozzarella", "Pepper Jack", "Slicing Mozzarella",
  "Cheddar", "Italian Provolone", "Alpine Lace Swiss", "Belgiuoso Provolone",
  "Alpine Lace Muenster", "White American", "Yellow American", "Asiago",
  "Fontina", "Muenster", "Finlandia Swiss", "Shaved Parmesan",
  "Finlandia Lacey Swiss", "Feta", "Goat Cheese",
];
export const cheesePrices = (bread) => isHeroBread(bread) ? 2.00 : 1.50;

// Paid toppings — [name, rollPrice, heroPrice]
export const PAID_TOPPINGS = [
  { name: "Roasted Peppers", roll: 1.00, hero: 2.00 },
  { name: "Hot Peppers", roll: 1.00, hero: 2.00 },
  { name: "Sundried Peppers", roll: 2.00, hero: 3.00 },
  { name: "Vinegar Peppers", roll: 1.00, hero: 2.00 },
  { name: "Sundried Tomatoes", roll: 2.00, hero: 3.00 },
  { name: "Coleslaw", roll: 1.50, hero: 2.00 },
  { name: "Sauteed Spinach", roll: 2.00, hero: 3.00 },
  { name: "Broccoli Rabe", roll: 2.00, hero: 3.00 },
  { name: "Pickles", roll: 0.50, hero: 1.00 },
  { name: "Avocado", roll: 1.00, hero: 2.00 },
  { name: "Bacon", roll: 2.00, hero: 3.00 },
];

// Free toppings (N/C) — max 2
export const FREE_TOPPINGS = [
  "Onions", "Mesculin Mix", "Romaine", "Iceberg",
  "Baby Arugula", "Baby Spinach", "Tomatoes",
];

// Dressings — all free, max 2
export const DRESSINGS = [
  "Chipotle Mayo", "Ranch", "Balsamic Vinegar", "Blue Cheese",
  "BBQ", "Ketchup", "Mayo", "Mustard", "Honey Mustard",
  "Oil & Vinegar", "Balsamic Glaze", "Hot Sauce", "Russian Dressing",
  "Pesto Mayo", "Hot Honey", "Iavarone EVOO",
];
