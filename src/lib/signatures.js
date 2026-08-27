// Signature Sandwiches — preset menu items from the GC report (Aug 27, 2026 upload).
// - `upc` prints as the label barcode (padded to 11 digits; JsBarcode computes the check digit)
// - `code` is the store's alternate/PLU code (also keys the photo filename)
// - `active: false` = hidden from the app; duplicate report entries kept for reference
//   (deli vs prepack labels produced duplicate rows in the source report)
// - `photo` paths are placeholder shots pulled from the report PDF — swap files in
//   /public/signature-photos/ when real photography is ready (no code changes needed)
// - Modifiers intentionally NOT built yet.

export const SIGNATURE_CATEGORIES = ['Heroes', 'Wraps', 'Pitas & Specialty Breads']

export const SIGNATURES = [
  // ── Heroes ────────────────────────────────────────────────────────────────
  {
    id: 'flying-pig', code: '2080013', upc: '1133111', active: true,
    category: 'Heroes', name: 'Flying Pig Hero', price: 16.99,
    description: 'Antibiotic-free pan-fried chicken cutlet stacked with crispy bacon, cheddar, lettuce, and tomato, finished with cool ranch on a semolina hero.',
    ingredients: 'Antibiotic-free pan-fried chicken cutlet, bacon, cheddar, lettuce, tomato, ranch, semolina hero',
    photo: null,
  },
  {
    id: 'chicken-vodka-parm', code: '2080024', upc: '6546163', active: true,
    category: 'Heroes', name: 'Chicken Vodka Parm Hero', price: 13.99,
    description: 'Golden fried chicken cutlet smothered in creamy vodka sauce with fresh mozzarella on an Italian hero.',
    ingredients: 'Fried chicken cutlet, fresh mozzarella, vodka sauce, Italian hero',
    photo: null,
  },
  {
    id: 'godfather', code: '2080031', upc: '1110000113', active: true,
    category: 'Heroes', name: 'Godfather Hero', price: 14.99,
    description: 'The classic Italian combo — Iavarone deluxe ham, Genoa salami, pepperoni, mortadella (contains nuts), and provolone with vinegar peppers, lettuce, tomato, and balsamic vinaigrette on an Italian hero.',
    ingredients: 'Iavarone deluxe ham, Genoa salami, pepperoni, mortadella (contains nuts), provolone, vinegar peppers, lettuce, tomato, balsamic vinaigrette, Italian hero',
    photo: '/signature-photos/2080031.jpg',
  },
  {
    id: 'marco-polo-grilled', code: '2080062', upc: '1220000123', active: true,
    category: 'Heroes', name: 'Marco Polo Hero (Grilled)', price: 15.99,
    description: 'Juicy grilled chicken layered with fresh mozzarella, sweet roasted peppers, and mesclun greens, dressed with pesto mayo on an Italian hero.',
    ingredients: 'Grilled chicken, fresh mozzarella, roasted peppers, mesclun greens, pesto mayo, Italian hero',
    photo: '/signature-photos/2080062.jpg',
  },
  {
    id: 'marco-polo-fried', code: '2080062', upc: '1220000123', active: true,
    category: 'Heroes', name: 'Marco Polo Hero (Fried)', price: 15.99,
    description: 'Crispy fried chicken layered with fresh mozzarella, sweet roasted peppers, and mesclun greens, dressed with pesto mayo on an Italian hero.',
    ingredients: 'Fried chicken, fresh mozzarella, roasted peppers, mesclun greens, pesto mayo, Italian hero',
    photo: '/signature-photos/2080062.jpg',
  },
  {
    id: 'chicken-parm', code: '2080164', upc: '2625400006', active: true,
    category: 'Heroes', name: 'Chicken Parm Hero', price: 13.99,
    description: 'Golden fried chicken cutlet with bright marinara and fresh mozzarella on an Italian hero.',
    ingredients: 'Fried chicken cutlet, fresh mozzarella, marinara sauce, Italian hero',
    photo: null,
  },
  {
    id: 'turkey-marmalata', code: '2080098', upc: '1748400007', active: true,
    category: 'Heroes', name: 'Turkey Marmalata', price: 12.99,
    description: 'Honey maple turkey paired with creamy French brie, crisp sliced apple, and sweet fig jam on an Italian hero.',
    ingredients: 'Honey maple turkey, French brie, sliced apple, fig jam, Italian hero',
    photo: '/signature-photos/2080098.jpg',
  },
  {
    id: 'greatest-american', code: null, upc: '20030700000', active: true,
    category: 'Heroes', name: 'The Greatest American Hero', price: 14.99,
    description: 'Iavarone turkey, roast beef, and deluxe ham stacked high with Swiss, lettuce, tomato, and pickles on a semolina hero.',
    ingredients: 'Iavarone turkey, roast beef, deluxe ham, Swiss, lettuce, tomato, pickles, semolina hero',
    photo: null,
  },
  {
    id: 'next-generation', code: '2080147', upc: '20002500000', active: true,
    category: 'Heroes', name: 'The Next Generation', price: 16.99,
    description: 'Grilled chicken with garlicky sautéed broccoli rabe, fresh mozzarella, and sweet roasted peppers.',
    ingredients: 'Sautéed broccoli rabe, grilled chicken, fresh mozzarella, sweet roasted peppers',
    photo: null,
  },

  // ── Wraps ─────────────────────────────────────────────────────────────────
  {
    id: 'chicken-chipotle-wrap', code: '2080003', upc: '21365', active: true,
    category: 'Wraps', name: 'Chicken Chipotle Wrap', price: 12.99,
    description: 'Tender chicken breast with melty muenster, ripe tomato, and crisp lettuce, brought together with smoky chipotle aioli.',
    ingredients: 'Chicken breast, muenster cheese, tomato, lettuce, chipotle aioli, wrap',
    photo: null,
  },
  {
    id: 'harvest-chicken-salad-wrap', code: '2080017', upc: '1513229', active: true,
    category: 'Wraps', name: 'Harvest Chicken Salad Wrap', price: 10.99,
    description: 'House chicken salad tossed with crunchy walnuts, sweet cranberries, crisp Granny Smith apples, celery, and scallion in a light yogurt-mayo dressing.',
    ingredients: 'Chicken, lettuce, walnuts, cranberry, mayonnaise, Granny Smith apples, yogurt, celery, scallion, wrap',
    photo: null,
  },
  {
    id: 'grilled-chicken-caesar-wrap', code: '2080036', upc: '1112200006', active: true,
    category: 'Wraps', name: 'Grilled Chicken Caesar Wrap', price: 11.99,
    description: 'Grilled chicken and crisp romaine tossed with shaved parmigiano and creamy Caesar dressing.',
    ingredients: 'Romaine lettuce, grilled chicken, parmigiano cheese, Caesar dressing, wrap',
    photo: '/signature-photos/2080036.jpg',
  },
  {
    id: 'chicken-bacon-ranch-wrap', code: '2080085', upc: '1420000251', active: true,
    category: 'Wraps', name: 'Chicken Bacon Ranch Wrap', price: 12.99,
    description: 'Grilled chicken and crispy bacon with cheddar, lettuce, and tomato, finished with cool ranch.',
    ingredients: 'Grilled chicken, bacon, ranch, cheddar cheese, lettuce, tomato, wrap',
    photo: '/signature-photos/2080085.jpg',
  },
  {
    id: 'chicken-salad-wrap', code: '2080179', upc: '1523000005', active: true,
    category: 'Wraps', name: 'Chicken Salad Wrap', price: 12.99,
    description: 'Classic white-meat chicken salad with crunchy celery, Dijon mustard, and a touch of white pepper, wrapped with lettuce and tomato.',
    ingredients: 'White meat chicken, celery, mayo, Dijon mustard, white pepper, salt, lettuce, tomato, wrap',
    photo: null,
  },
  {
    id: 'eggplant-wrap', code: '2080109', upc: '3112000007', active: true,
    category: 'Wraps', name: 'Eggplant Wrap', price: 11.99,
    description: 'Crispy fried eggplant with fresh mozzarella, roasted red peppers, and mesclun mix.',
    ingredients: 'Fried eggplant, mozzarella, red roasted peppers, mesclun mix, wrap',
    photo: '/signature-photos/2080109.jpg',
  },
  {
    id: 'grilled-vegetable-wrap', code: '2080111', upc: '3172000007', active: true,
    category: 'Wraps', name: 'Grilled Vegetable Wrap', price: 12.99,
    description: 'Balsamic-marinated grilled vegetables with creamy mozzarella.',
    ingredients: 'Balsamic grilled vegetables, mozzarella cheese, wrap',
    photo: null,
  },
  {
    id: 'hot-chick-wrap', code: '2080137', upc: '5210000967', active: true,
    category: 'Wraps', name: 'The Hot Chick Wrap', price: 12.99,
    description: 'Honey mustard chicken fingers with pepper jack and cole slaw, doubled up with honey mustard and a drizzle of hot honey.',
    ingredients: 'Honey mustard chicken fingers, pepperjack cheese, cole slaw, honey mustard, hot honey, wrap',
    photo: '/signature-photos/2080137.jpg',
  },
  {
    id: 'sweet-heat-chicken-wrap', code: '2080822', upc: '5320000978', active: true,
    category: 'Wraps', name: 'The Sweet Heat Chicken Wrap', price: 12.99,
    description: 'Sweet chili chicken thighs with crunchy coleslaw, jalapeño jack, creamy avocado, and sweet chili sauce.',
    ingredients: 'Sweet chili chicken thighs, coleslaw, jalapeño jack cheese, avocado, sweet chili sauce, wrap',
    photo: null,
  },
  {
    id: 'roast-beef-cheddar-wrap', code: '2080166', upc: '7058600009', active: true,
    category: 'Wraps', name: 'Roast Beef & Cheddar Wrap', price: 12.99,
    description: 'Sliced roast beef with sharp cheddar, lettuce, tomato, and mayo.',
    ingredients: 'Roast beef, cheddar, lettuce, tomato, mayo, wrap',
    photo: null,
  },
  {
    id: 'turkey-provolone-wrap', code: '2080161', upc: '7059600008', active: true,
    category: 'Wraps', name: 'Turkey & Provolone Cheese Wrap', price: 12.99,
    description: 'Sliced turkey with provolone, tomato, and crisp lettuce.',
    ingredients: 'Turkey, provolone, tomato, lettuce, wrap',
    photo: null,
  },

  // ── Pitas & Specialty Breads ──────────────────────────────────────────────
  {
    id: 'prosciutto-ficelle', code: '2080007', upc: '54848', active: true,
    category: 'Pitas & Specialty Breads', name: 'Prosciutto Ficelle', price: 9.99,
    description: 'Thin-sliced Parma prosciutto with fresh mozzarella, peppery arugula, and roasted red pepper salad, finished with balsamic glaze on a crisp ficelle.',
    ingredients: 'Parma prosciutto, fresh mozzarella, arugula, roasted red pepper salad, balsamic glaze, ficelle',
    photo: '/signature-photos/2080007.jpg',
  },
  {
    id: 'grilled-chicken-pita', code: '2080039', upc: '1120000112', active: true,
    category: 'Pitas & Specialty Breads', name: 'Grilled Chicken Pita', price: 9.99,
    description: 'Grilled chicken cutlet with mesclun greens, roasted peppers, and pesto mayo tucked into warm pita.',
    ingredients: 'Grilled chicken cutlet, mesclun greens, pesto mayo, roasted peppers, pita',
    photo: '/signature-photos/2080039.jpg',
  },
  {
    id: 'eggplant-focaccia', code: '2080069', upc: '1222600006', active: true,
    category: 'Pitas & Specialty Breads', name: 'Eggplant Focaccia', price: 11.99,
    description: 'Tender eggplant with roasted peppers, red onion, mozzarella, tomato, and arugula, dressed in olive oil and balsamic on pillowy focaccia.',
    ingredients: 'Eggplant, roasted peppers, red onion, mozzarella, tomatoes, arugula, olive oil, balsamic vinegar, salt, pepper, focaccia',
    photo: null,
  },
  {
    id: 'smoked-ham-brie-croissant', code: '2080083', upc: '1420000132', active: true,
    category: 'Pitas & Specialty Breads', name: 'Smoked Ham Brie Croissant', price: 12.99,
    description: 'Black Forest ham and creamy brie with crisp romaine and honey mustard on a buttery croissant.',
    ingredients: 'Black Forest ham, brie, romaine, honey mustard, croissant',
    photo: '/signature-photos/2080083.jpg',
  },
  {
    id: 'turkey-avocado', code: '2080107', upc: '2320000242', active: true,
    category: 'Pitas & Specialty Breads', name: 'Turkey Avocado', price: 11.99,
    description: 'Oven gold turkey with creamy avocado, lettuce, tomato, and Russian dressing on a whole wheat roll.',
    ingredients: 'Oven gold turkey, avocado, lettuce, tomato, Russian dressing, whole wheat roll',
    photo: '/signature-photos/2080107.jpg',
  },
  {
    id: 'turkey-cubano', code: '2080148', upc: '20031200000', active: true,
    category: 'Pitas & Specialty Breads', name: 'Turkey Cubano', price: 10.99,
    description: 'Oven-roasted turkey breast and ham pressed with Swiss, pickles, and mustard on ciabatta.',
    ingredients: 'Oven roasted turkey breast, Swiss, pickles, ham, mustard, ciabatta',
    photo: null,
  },
  {
    id: 'greek-goddess-pita', code: '2082345', upc: '2230000223', active: true,
    category: 'Pitas & Specialty Breads', name: 'Greek Goddess Pita', price: 10.99,
    description: 'Tzatziki chicken salad brightened with Greek yogurt, lemon, and dill, with cool cucumber, red onion, and lettuce on grilled pita.',
    ingredients: 'Grilled pita, tzatziki chicken salad, Greek yogurt, lemon, dill, cucumber, red onion, lettuce',
    photo: null,
  },

  // ── Deactivated — duplicate report rows (deli vs prepack label variants) ──
  {
    id: 'flying-pig-deli', code: null, upc: '20003400000', active: false,
    category: 'Heroes', name: 'The Flying Pig — Deli', price: 16.99,
    description: 'Antibiotic-free pan-fried chicken cutlet stacked with crispy bacon, cheddar, lettuce, and tomato, finished with cool ranch on an Italian hero.',
    ingredients: 'Antibiotic-free pan-fried chicken cutlet, bacon, cheddar, lettuce, tomato, ranch, Italian hero',
    photo: null,
  },
  {
    id: 'marco-polo-deli', code: null, upc: '20003700000', active: false,
    category: 'Heroes', name: 'Marco Polo Hero — Deli', price: 15.99,
    description: 'Grilled or fried chicken layered with fresh mozzarella, sweet roasted peppers, and mesclun greens, dressed with pesto mayo on an Italian hero.',
    ingredients: 'Grilled or fried chicken, fresh mozzarella, roasted peppers, mesclun greens, pesto mayo, Italian hero',
    photo: null,
  },
  {
    id: 'godfather-deli', code: null, upc: '20030500000', active: false,
    category: 'Heroes', name: 'Godfather Hero — Deli', price: 14.99,
    description: 'Iavarone deluxe ham, Genoa salami, pepperoni, mortadella (contains nuts), and provolone with vinegar peppers, lettuce, tomato, and balsamic vinaigrette on an Italian hero.',
    ingredients: 'Iavarone deluxe ham, Genoa salami, pepperoni, mortadella (contains nuts), provolone, vinegar peppers, lettuce, tomato, balsamic vinaigrette, Italian hero',
    photo: null,
  },
]

export const ACTIVE_SIGNATURES = SIGNATURES.filter(s => s.active)
export const findSignature = (id) => SIGNATURES.find(s => s.id === id)

// Label barcode: item UPC padded to 11 digits — JsBarcode's UPC format
// computes the 12th (check) digit automatically, matching the store labels.
export const signatureBarcodeValue = (sig) => String(sig.upc).padStart(11, '0').slice(0, 11)
