import { api } from './api';

// Curated realistic photographic catalog mapped to object types and colors
const REALISTIC_CATALOG = {
  headphones: {
    black: 'http://127.0.0.1:8000/uploads/realistic_catalog/headphones_black.jpg',
    dark: 'http://127.0.0.1:8000/uploads/realistic_catalog/headset_dark.jpg',
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/headphones_black.jpg'
  },
  wallet: {
    black: 'http://127.0.0.1:8000/uploads/realistic_catalog/wallet_black_leather.jpg',
    brown: 'http://127.0.0.1:8000/uploads/realistic_catalog/wallet_brown_leather.jpg',
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/wallet_black_leather.jpg'
  },
  phone: {
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/phone_iphone.jpg'
  },
  laptop: {
    silver: 'http://127.0.0.1:8000/uploads/realistic_catalog/laptop_silver.jpg',
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/laptop_silver.jpg'
  },
  backpack: {
    blue: 'http://127.0.0.1:8000/uploads/realistic_catalog/backpack_blue.jpg',
    navy: 'http://127.0.0.1:8000/uploads/realistic_catalog/backpack_blue.jpg',
    red: 'http://127.0.0.1:8000/uploads/realistic_catalog/backpack_red.jpg',
    black: 'http://127.0.0.1:8000/uploads/realistic_catalog/backpack_black.jpg',
    brown: 'http://127.0.0.1:8000/uploads/realistic_catalog/bag_brown_leather.jpg',
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/backpack_blue.jpg'
  },
  bottle: {
    red: 'http://127.0.0.1:8000/uploads/realistic_catalog/bottle_red_flask.jpg',
    silver: 'http://127.0.0.1:8000/uploads/realistic_catalog/bottle_silver_steel.jpg',
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/bottle_red_flask.jpg'
  },
  id_card: {
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/card_student_id.jpg'
  },
  keys: {
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/keys_car_key.jpg'
  },
  book: {
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/book_notebook.jpg'
  },
  shoes: {
    default: 'http://127.0.0.1:8000/uploads/realistic_catalog/shoe_red_sneaker.jpg'
  }
};

/**
 * Resolves a realistic photographic image for any lost or found item.
 * 
 * Hierarchy:
 * 1. If an authentic user-uploaded photograph exists -> ALWAYS prioritize and display that genuine photograph.
 * 2. If no photo was uploaded or only placeholder -> dynamically select a realistic photographic representation
 *    matching the exact object type, category, and color of the item entered.
 */
export function getRealisticItemImage(item) {
  if (!item) {
    return REALISTIC_CATALOG.headphones.default;
  }

  // 1. Prioritize authentic user-uploaded photograph
  if (item.image_url) {
    const directUrl = api.getImageUrl(item.image_url);
    if (directUrl) return directUrl;
  }

  // 2. Dynamic classification based on item name, category, description, and color
  const name = (item.item_name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const color = (item.color || '').toLowerCase();
  const text = `${name} ${cat} ${desc} ${color}`;

  // Identify object type
  if (text.includes('wallet') || text.includes('purse') || text.includes('cardholder') || text.includes('bifold')) {
    if (color.includes('brown') || text.includes('brown')) return REALISTIC_CATALOG.wallet.brown;
    return REALISTIC_CATALOG.wallet.black;
  }

  if (text.includes('phone') || text.includes('iphone') || text.includes('smartphone') || text.includes('mobile') || text.includes('android')) {
    return REALISTIC_CATALOG.phone.default;
  }

  if (text.includes('laptop') || text.includes('macbook') || text.includes('computer') || text.includes('notebook pc')) {
    return REALISTIC_CATALOG.laptop.silver;
  }

  if (text.includes('headphone') || text.includes('headset') || text.includes('earbuds') || text.includes('earphone') || text.includes('airpods')) {
    if (text.includes('dark') || text.includes('black')) return REALISTIC_CATALOG.headphones.black;
    return REALISTIC_CATALOG.headphones.default;
  }

  if (text.includes('backpack') || text.includes('bag') || text.includes('rucksack') || text.includes('knapsack')) {
    if (color.includes('red') || text.includes('red')) return REALISTIC_CATALOG.backpack.red;
    if (color.includes('black') || text.includes('black')) return REALISTIC_CATALOG.backpack.black;
    if (color.includes('brown') || text.includes('brown') || text.includes('leather')) return REALISTIC_CATALOG.backpack.brown;
    return REALISTIC_CATALOG.backpack.blue;
  }

  if (text.includes('bottle') || text.includes('flask') || text.includes('tumbler') || text.includes('sipper') || text.includes('thermos')) {
    if (color.includes('silver') || text.includes('silver') || text.includes('steel') || text.includes('metal')) {
      return REALISTIC_CATALOG.bottle.silver;
    }
    return REALISTIC_CATALOG.bottle.red;
  }

  if (text.includes('id') || text.includes('card') || text.includes('badge') || text.includes('identity') || text.includes('lanyard')) {
    return REALISTIC_CATALOG.id_card.default;
  }

  if (text.includes('key') || text.includes('fob') || text.includes('car key') || text.includes('keychain')) {
    return REALISTIC_CATALOG.keys.default;
  }

  if (text.includes('book') || text.includes('textbook') || text.includes('notebook') || text.includes('journal')) {
    return REALISTIC_CATALOG.book.default;
  }

  if (text.includes('shoe') || text.includes('sneaker') || text.includes('boot')) {
    return REALISTIC_CATALOG.shoes.default;
  }

  // Category based defaults
  if (cat.includes('electronic')) return REALISTIC_CATALOG.headphones.default;
  if (cat.includes('bag')) return REALISTIC_CATALOG.backpack.blue;
  if (cat.includes('ident')) return REALISTIC_CATALOG.id_card.default;
  if (cat.includes('key')) return REALISTIC_CATALOG.keys.default;
  if (cat.includes('bottle')) return REALISTIC_CATALOG.bottle.red;
  if (cat.includes('book')) return REALISTIC_CATALOG.book.default;

  return REALISTIC_CATALOG.headphones.default;
}
