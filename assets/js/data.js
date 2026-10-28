/* Cooking.com demo – reference data (fictitious) */
window.CK_DATA = (() => {
  const cuisines = {
    italian:   { label: 'Italian',       emoji: '🍝', from: '#F4A259', to: '#BC4B51' },
    japanese:  { label: 'Japanese',      emoji: '🍣', from: '#5B8E7D', to: '#0D3678' },
    french:    { label: 'French',        emoji: '🥐', from: '#8E7DBE', to: '#0D3678' },
    indonesian:{ label: 'Indonesian',    emoji: '🍛', from: '#E07A5F', to: '#81B29A' },
    seafood:   { label: 'Seafood',       emoji: '🦞', from: '#21A8DF', to: '#0D3678' },
    vegetarian:{ label: 'Vegetarian',    emoji: '🥗', from: '#90BE6D', to: '#277DA1' },
    steakhouse:{ label: 'Steakhouse',    emoji: '🥩', from: '#9D4EDD', to: '#3C096C' },
    modern:    { label: 'Modern Dutch',  emoji: '🧀', from: '#F9C74F', to: '#F3722C' },
    mexican:   { label: 'Mexican',       emoji: '🌮', from: '#F8961E', to: '#43AA8B' },
    spanish:   { label: 'Spanish',       emoji: '🥘', from: '#F94144', to: '#F9C74F' },
  };

  const cities = [
    { name: 'The Hague',     country: 'NL', currency: 'EUR' },
    { name: 'Amsterdam',     country: 'NL', currency: 'EUR' },
    { name: 'Rotterdam',     country: 'NL', currency: 'EUR' },
    { name: 'Utrecht',       country: 'NL', currency: 'EUR' },
    { name: 'Barcelona',     country: 'ES', currency: 'EUR' },
    { name: 'Sydney',        country: 'AU', currency: 'AUD' },
    { name: 'San Francisco', country: 'US', currency: 'USD' },
  ];

  const restaurants = [
    { id: 'r101', name: 'De Gouden Lepel', city: 'The Hague', cuisine: 'modern', price: 3, rating: 8.9, reviews: 412, seats: 24,
      address: 'Lange Voorhout 12, 2514 EB The Hague', hours: 'Tue–Sat 17:30–23:00',
      description: 'Seasonal Dutch cooking in a former carriage house on the Lange Voorhout. Seven-course tasting menu or à la carte.',
      signature: 'North Sea crab with smoked eel and beurre blanc', menus: ['Tasting menu', 'À la carte', 'Vegetarian menu'], tags: ['Romantic', 'Terrace'] },
    { id: 'r102', name: 'Trattoria Nonna Lia', city: 'The Hague', cuisine: 'italian', price: 2, rating: 8.6, reviews: 958, seats: 40,
      address: 'Frederikstraat 88, 2514 LL The Hague', hours: 'Daily 12:00–22:30',
      description: 'Family-run trattoria with hand-made pasta and wood-fired pizza. Lively, loud and very friendly.',
      signature: 'Pappardelle al ragù di cinghiale', menus: ['À la carte', 'Kids menu'], tags: ['Family friendly', 'Group dining'] },
    { id: 'r103', name: 'Scheveningse Vishal', city: 'The Hague', cuisine: 'seafood', price: 3, rating: 8.4, reviews: 627, seats: 36,
      address: 'Dr. Lelykade 21, 2583 CL The Hague', hours: 'Wed–Sun 12:00–22:00',
      description: 'Catch of the day straight from the Scheveningen harbour, served on the quay.',
      signature: 'Whole grilled turbot for two', menus: ['À la carte', 'Fruits de mer platter'], tags: ['Harbour view', 'Terrace'] },
    { id: 'r201', name: 'Sumi Kitchen', city: 'Amsterdam', cuisine: 'japanese', price: 4, rating: 9.2, reviews: 1305, seats: 18,
      address: 'Prinsengracht 401, 1016 HM Amsterdam', hours: 'Tue–Sat 18:00–23:00',
      description: 'Omakase counter with eighteen seats along the canal. Fish flown in from Toyosu three times a week.',
      signature: 'Aged bluefin tuna nigiri', menus: ['Omakase'], tags: ['Chef’s table', 'Fine dining'] },
    { id: 'r202', name: 'Groen', city: 'Amsterdam', cuisine: 'vegetarian', price: 2, rating: 8.7, reviews: 741, seats: 32,
      address: 'Ferdinand Bolstraat 140, 1072 LM Amsterdam', hours: 'Daily 11:00–22:00',
      description: 'Plant-based small plates with vegetables from our own garden in Noord-Holland.',
      signature: 'Celeriac shawarma with tahini and pickled onion', menus: ['Small plates', 'Vegan menu'], tags: ['Vegan options', 'Sustainable'] },
    { id: 'r203', name: 'Rijsttafel Indah', city: 'Amsterdam', cuisine: 'indonesian', price: 2, rating: 8.5, reviews: 1890, seats: 48,
      address: 'Utrechtsestraat 57, 1017 VJ Amsterdam', hours: 'Daily 17:00–22:30',
      description: 'A classic Indonesian rijsttafel with twenty dishes, served the way grandmother made it in Bandung.',
      signature: 'Rendang sapi, slow-cooked for eight hours', menus: ['Rijsttafel', 'À la carte'], tags: ['Group dining', 'Classic'] },
    { id: 'r301', name: 'Vuur & Vlees', city: 'Rotterdam', cuisine: 'steakhouse', price: 3, rating: 8.3, reviews: 533, seats: 50,
      address: 'Wilhelminakade 64, 3072 AR Rotterdam', hours: 'Daily 17:00–23:00',
      description: 'Dry-aged beef grilled over charcoal, with a view of the Erasmus Bridge.',
      signature: '45-day dry-aged rib-eye', menus: ['À la carte', 'Sharing menu'], tags: ['Skyline view', 'Group dining'] },
    { id: 'r302', name: 'Taquería La Maas', city: 'Rotterdam', cuisine: 'mexican', price: 1, rating: 8.1, reviews: 402, seats: 30,
      address: 'Witte de Withstraat 33, 3012 BL Rotterdam', hours: 'Wed–Sun 12:00–23:00',
      description: 'Street-style tacos with home-made tortillas and a mezcal bar.',
      signature: 'Tacos al pastor with grilled pineapple', menus: ['À la carte'], tags: ['Casual', 'Late night'] },
    { id: 'r401', name: 'Bistro Oudegracht', city: 'Utrecht', cuisine: 'french', price: 3, rating: 8.8, reviews: 366, seats: 28,
      address: 'Oudegracht 210, 3511 NR Utrecht', hours: 'Tue–Sat 17:30–22:30',
      description: 'French bistro classics in a 14th-century wharf cellar right on the canal.',
      signature: 'Duck confit with pommes sarladaises', menus: ['À la carte', 'Menu du jour'], tags: ['Romantic', 'Canal side'] },
    { id: 'r501', name: 'Taberna del Born', city: 'Barcelona', cuisine: 'spanish', price: 2, rating: 8.6, reviews: 2210, seats: 44,
      address: 'Carrer de l’Argenteria 41, 08003 Barcelona', hours: 'Daily 13:00–00:00',
      description: 'Tapas and natural wines in the heart of El Born.',
      signature: 'Arroz negro with aioli', menus: ['Tapas', 'Paella for two'], tags: ['Lively', 'Late night'] },
    { id: 'r601', name: 'Harbourside Oyster Co.', city: 'Sydney', cuisine: 'seafood', price: 4, rating: 9.0, reviews: 1544, seats: 60,
      address: '3 Circular Quay West, The Rocks NSW 2000', hours: 'Daily 12:00–23:00',
      description: 'Oysters from six Australian bays and a front-row view of the Opera House. (Formerly listed on Where2Eat.)',
      signature: 'Sydney rock oysters with finger lime', menus: ['À la carte', 'Seafood tower'], tags: ['Waterfront', 'Fine dining'] },
    { id: 'r701', name: 'Golden Gate Grill', city: 'San Francisco', cuisine: 'steakhouse', price: 4, rating: 8.7, reviews: 980, seats: 56,
      address: '850 Embarcadero, San Francisco, CA 94111', hours: 'Daily 17:00–22:30',
      description: 'Californian grill with Napa wines. Reservations also available via our partner SeatMe.',
      signature: 'Wagyu tomahawk for two', menus: ['À la carte', 'Wine pairing'], tags: ['Bay view', 'Partner: SeatMe'] },
  ];

  const deals = [
    { id: 'd1', restaurantId: 'r101', title: 'Royal Hague Evening', price: 149, persons: 2,
      includes: ['Seven-course tasting menu', 'Wine pairing', 'Taxi home within The Hague (partner: HagueCab)'] },
    { id: 'd2', restaurantId: 'r201', title: 'Omakase & Canal Stay', price: 495, persons: 2,
      includes: ['Omakase dinner for two', 'One night at Canal House Hotel (partner)', 'Breakfast'] },
    { id: 'd3', restaurantId: 'r203', title: 'Rijsttafel Feast', price: 79, persons: 2,
      includes: ['Full rijsttafel for two', 'Welcome drink', 'Dessert platter'] },
    { id: 'd4', restaurantId: 'r301', title: 'Rotterdam Skyline Grill', price: 129, persons: 2,
      includes: ['Sharing menu with dry-aged beef', 'Bottle of house wine', 'Water taxi to the restaurant (partner)'] },
    { id: 'd5', restaurantId: 'r601', title: 'Sydney Harbour Experience', price: 389, persons: 2, currency: 'AUD',
      includes: ['Seafood tower for two', 'Champagne on arrival', 'Harbour ferry pass'] },
  ];

  const reviews = {
    r101: [{ user: 'marieke_dh', score: 9, text: 'Every course was a surprise. Service was warm and attentive.' },
           { user: 'jvdberg', score: 8, text: 'Excellent food, but the wine pairing is pricey.' }],
    r102: [{ user: 'luca_in_nl', score: 9, text: 'Closest thing to my nonna’s cooking outside Bologna.' }],
    r201: [{ user: 'foodie020', score: 10, text: 'Best sushi I have had in Europe. Book well ahead!' }],
    r203: [{ user: 'tante_ria', score: 8, text: 'Generous portions and real sambal. Can get busy at weekends.' }],
    r601: [{ user: 'sydneysider', score: 9, text: 'The oysters are unreal, and so is the view.' }],
  };

  const timeSlots = ['12:00', '12:30', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  const tasteQuestions = [
    { id: 'spice', q: 'How do you feel about spicy food?', options: ['Not for me', 'A little', 'The hotter the better'] },
    { id: 'diet', q: 'Any dietary preference?', options: ['None', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Gluten-free'] },
    { id: 'style', q: 'What is your ideal night out?', options: ['Casual & quick', 'Cosy bistro', 'Fine dining', 'Lively & social'] },
  ];

  const currencyFor = (city) => (cities.find(c => c.name === city) || {}).currency || 'EUR';

  return { cuisines, cities, restaurants, deals, reviews, timeSlots, tasteQuestions, currencyFor };
})();
