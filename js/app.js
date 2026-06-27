/**
 * TravanaAI - Premium Travel Companion Client Logic
 * Handles SPA Navigation, Bottom Sheet Themes, Duolingo-style wizard setup,
 * AI recommendation scoring, dynamic canvas maps, hotel/food/shopping tabs,
 * Tinder card swiping, and follow-up info modals.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const appState = {
    theme: 'theme-cyber-neon',
    soundEnabled: true,
    xp: 120,
    level: 1,
    savedDestinations: new Set(),
    activeTrip: null, // Holds the generated trip object
    currentDuration: 5,
    history: [
      { dest: "Mussoorie", date: "Jan 12, 2026", cost: 18400 }
    ]
  };

  // Web Audio Context for synthesized sound feedback
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Play pleasant synthesized sound waves
  function playSound(type) {
    if (!appState.soundEnabled) return;
    try {
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'swipe') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn('Audio Context failed: ', e);
    }
  }

  // ==========================================================================
  // SPA NAVIGATION SWITCHER (FIX NAVIGATION)
  // ==========================================================================
  const navButtons = document.querySelectorAll('.nav-item-btn');
  const pages = document.querySelectorAll('.app-page');

  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      navigateToTab(targetId, btn);
    });
  });

  function navigateToTab(targetId, navBtnElement = null) {
    const targetPage = document.getElementById(targetId);
    if (!targetPage || targetPage.classList.contains('active-page')) return;
    
    playSound('click');

    // Remove active state classes
    navButtons.forEach(b => b.classList.remove('active-nav-item'));
    
    // Set active button
    if (navBtnElement) {
      navBtnElement.classList.add('active-nav-item');
    } else {
      const matchBtn = document.querySelector(`.nav-item-btn[data-target="${targetId}"]`);
      if (matchBtn) matchBtn.classList.add('active-nav-item');
    }

    // Toggle pages active state
    pages.forEach(p => {
      p.classList.remove('active-page');
    });

    targetPage.classList.add('active-page');
    targetPage.scrollTop = 0;

    // Rerender Canvas Map when trips page becomes active
    if (targetId === 'trips-page') {
      if (appState.activeTrip) {
        setTimeout(() => redrawCanvasMap(appState.activeTrip.mapNodes), 300);
      } else {
        // Fallback default Haridwar map drawing if no trip generated
        setTimeout(initFallbackRouteMap, 300);
      }
    }
  }

  // ==========================================================================
  // TRAVEL & ITINERARY DATABASE
  // ==========================================================================
  const TRAVEL_DATABASE = {
    mussoorie: {
      name: "Mussoorie",
      region: "Uttarakhand, India",
      cost: 18000,
      rating: 4.8,
      vibe: "mountain",
      tags: ["mountain", "nature", "shopping", "photos", "kids"],
      mapNodes: [
        { id: 1, name: 'Delhi Departure', x: 70, y: 190, cost: 'Origin', type: 'Station' },
        { id: 2, name: 'Dehradun Valley', x: 180, y: 140, cost: '₹180', type: 'Transit' },
        { id: 3, name: 'Mussoorie Mall Rd', x: 280, y: 100, cost: '₹3,500', type: 'Hotel' },
        { id: 4, name: 'Landour Heights', x: 380, y: 60, cost: '₹100', type: 'Attraction' }
      ],
      itinerary: [
        { day: 1, title: "Scenic Departure & Gun Hill Sunset", events: [{ name: "Travel from Delhi to Dehradun (Train/Taxi)", time: "06:00 AM", cost: "₹800 Train ticket" }, { name: "Check-in at Pineview Heritage Hotel, Mussoorie", time: "01:30 PM", cost: "₹3,500/night" }, { name: "Cable Car to Gun Hill point for panoramic views", time: "05:00 PM", cost: "₹200 Ticket" }] },
        { day: 2, title: "Kempty Falls & Local Garhwali Cuisine", events: [{ name: "Morning dip at Kempty Waterfalls", time: "09:00 AM", cost: "₹50 Entry" }, { name: "Authentic lunch: Garhwali Thali at Local Shanti Diner", time: "01:00 PM", cost: "₹400/person" }, { name: "Evening walk along quiet Camel's Back Road", time: "06:00 PM", cost: "Free walk" }] },
        { day: 3, title: "Landour Colonial Walk & Bakery Treats", events: [{ name: "Hike to Landour (Lal Tibba & Char Dukan)", time: "08:30 AM", cost: "Free hike" }, { name: "Lunch at Landour Bakehouse (Famous Cinnamon Crepes)", time: "12:30 PM", cost: "₹650/person" }, { name: "Sunset photo shoot at Sister's Bazaar", time: "05:30 PM", cost: "Free visit" }] }
      ],
      hotels: [
        { tier: "Budget Stay", name: "Zostel Mussoorie", price: 1200, rating: 4.3, distance: "1.4 km from Mall Rd", amenities: ["Free Wifi", "Cafe", "Mountain Balcony"] },
        { tier: "Best Value", name: "Pineview Heritage Hotel", price: 3500, rating: 4.6, distance: "0.2 km from Mall Rd", amenities: ["Free Breakfast", "Wifi", "Room Service"] },
        { tier: "Premium Stay", name: "JW Marriott Walnut Grove Resort", price: 16500, rating: 4.9, distance: "6.2 km from Mall Rd", amenities: ["Luxury Spa", "Indoor Pool", "Himalayan View Gym"] }
      ],
      foods: [
        { emoji: "🥘", name: "Garhwali Thali", type: "Must-Try Local Specialty" },
        { emoji: "🥟", name: "Steamed Momos", type: "Popular Street Food" },
        { emoji: "🍳", name: "Lovely Omelette Center", type: "Highly Rated Eatery" },
        { emoji: "☕", name: "Chic Chocolate Crepes", type: "Popular Cafe" }
      ],
      shopping: [
        { name: "Wooden Carved Souvenirs", detail: "₹150 - ₹1,200 | Best at Kulri Bazaar" },
        { name: "Handmade Scented Candles", detail: "₹100 - ₹500 | Best at Landour Shops" },
        { name: "Woollen Shawls & Stoles", detail: "₹450 - ₹2,500 | Best at Library Bazaar" },
        { name: "Local Organic Honey & Preserves", detail: "₹200 - ₹800 | Best at Mall Road" }
      ],
      followUps: {
        gems: "🏔️ Landour (Sister's Bazaar & Lal Tibba) - 6km up, serene forest roads, Kelloggs Memorial Church, and peace away from Mall Road crowds.",
        food: "🍳 Lovely Omelette Center (Mall Road) - Try the legendary Cheese Bun Omelette. Expect lines as it has limited seating.",
        shopping: "🛍️ Landour Bazaar & Char Dukan - Famous for peanut butter, homemade apple jam, and hand-carved walking sticks.",
        photos: "📸 Cloud's End - Dense oak forests marking the geographic end of Mussoorie. Features a 19th-century colonial bungalow.",
        sunrise: "🌄 Lal Tibba Observation Point - Stunning snow peak panorama including Bandarpoonch and Kedarnath ranges.",
        sunset: "🌅 Camel's Back Road - A scenic 3km walk shaped like a camel's hump. Best walked with roasted corn during twilight.",
        weather: "☔ Summer: 15°C - 24°C (Sunny). Winter: 1°C - 10°C (Snow potential). Carry light woollens even in summer evenings.",
        transport: "🚖 Local cycle rickshaws cost ₹80 on Mall Road. Taxis to Kempty Falls or Landour cost ₹1,500 roundtrip.",
        saving: "💰 Take the local public bus from Dehradun Railway Station directly to Mussoorie (₹75) instead of a taxi (₹1,500).",
        adventure: "🥾 Bhadraj Temple Trek - A moderate 15km day-hike through pine forests ending at a peak with panoramic mountain views."
      }
    },
    goa: {
      name: "Goa",
      region: "Western Coast, India",
      cost: 25000,
      rating: 4.7,
      vibe: "beach",
      tags: ["beach", "nightlife", "food", "photos", "adventure"],
      mapNodes: [
        { id: 1, name: 'Mopa Airport', x: 70, y: 80, cost: 'Origin', type: 'Transit' },
        { id: 2, name: 'Panaji Latin Qtr', x: 150, y: 140, cost: '₹600', type: 'Heritage' },
        { id: 3, name: 'Baga Beach Stay', x: 260, y: 110, cost: '₹5,500', type: 'Hotel' },
        { id: 4, name: 'Dudhsagar Falls', x: 380, y: 220, cost: '₹400', type: 'Nature' }
      ],
      itinerary: [
        { day: 1, title: "Latin Quarter & Sunset Cruise", events: [{ name: "Arrive at Mopa Airport, Cab to Panaji", time: "10:00 AM", cost: "₹1,200 Cab" }, { name: "Walk through Fontainhas (Portuguese Latin Quarter)", time: "03:00 PM", cost: "Free heritage walk" }, { name: "Evening Mandovi River Sunset Boat Cruise", time: "06:30 PM", cost: "₹500 Ticket" }] },
        { day: 2, title: "Beach Hopping & Water Sports", events: [{ name: "Parasailing & Jet Skiing at Calangute Beach", time: "09:30 AM", cost: "₹1,500 Package" }, { name: "Lunch at Curlies Beach Shack, Anjuna", time: "01:30 PM", cost: "₹700/person" }, { name: "Sunset at Chapora Fort (Dil Chahta Hai point)", time: "05:30 PM", cost: "Free entry" }] },
        { day: 3, title: "Dudhsagar Waterfalls Trek", events: [{ name: "Early morning jeep safari to Dudhsagar Falls", time: "07:00 AM", cost: "₹800 Jeep share" }, { name: "Swim in the natural forest pools", time: "11:30 AM", cost: "Free swim" }, { name: "Seafood dinner at Britto's Baga Beach", time: "07:30 PM", cost: "₹900/person" }] }
      ],
      hotels: [
        { tier: "Budget Stay", name: "Zostel Morjim", price: 1100, rating: 4.4, distance: "0.2 km from Beach", amenities: ["Wifi", "Bar", "Ocean View Lounge"] },
        { tier: "Best Value", name: "Whispering Palms Beach Resort", price: 5500, rating: 4.6, distance: "0.3 km from Calangute", amenities: ["Pool", "Breakfast", "Private Balcony"] },
        { tier: "Premium Stay", name: "Taj Exotica Resort & Spa", price: 21000, rating: 4.9, distance: "0.1 km from Benaulim", amenities: ["Private Beach", "Luxury Spa", "Golf Course"] }
      ],
      foods: [
        { emoji: "🍛", name: "Goan Fish Curry", type: "Local Specialty" },
        { emoji: "🥘", name: "Chicken Vindaloo", type: "Must-Try Local Dish" },
        { emoji: "🥞", name: "Bebinca (Layered Cake)", type: "Traditional Dessert" },
        { emoji: "🍹", name: "Fresh Feni Cocktails", type: "Popular Beverage" }
      ],
      shopping: [
        { name: "Spices & Cashew Nuts", detail: "₹250 - ₹800 | Best at Mapusa Market" },
        { name: "Boho Beachwear & Sarongs", detail: "₹150 - ₹600 | Best at Anjuna Flea Market" },
        { name: "Feni Local Liquor Bottles", detail: "₹200 - ₹700 | Best at Panaji Stores" },
        { name: "Handmade Terracotta Crafts", detail: "₹100 - ₹1,200 | Best at Margao Market" }
      ],
      followUps: {
        gems: "🏖️ Cola Beach - Hidden lagoon in South Goa where a fresh water stream meets the salty sea. Extremely quiet and beautiful.",
        food: "🍛 Fisherman's Wharf (Cavelossim) - Famous Goan seafood platter. Vinayak Family Restaurant (Anjuna) - Unbelievable local fish thali.",
        shopping: "🛍️ Saturday Night Bazaar (Arpora) - Giant market with live music, clothing, artisanal crafts, and world food stalls.",
        photos: "📸 Fontainhas - Portuguese style houses painted in pastel yellows, blues, and reds. Great for Instagram portraits.",
        sunrise: "🌄 Vagator Cliffs - Quiet spot to watch the sun rise over the silent Arabian sea before beach activities start.",
        sunset: "🌅 Arambol Beach - Famous beach drum circle gathering at sunset with fire dancers and spiritual vibes.",
        weather: "☔ Nov to Feb: 21°C - 31°C (Perfect beach weather). June to Sept: Heavy monsoons, lush green scenery, rough seas.",
        transport: "🚖 Rent a scooter (₹350 - ₹500/day) for maximum freedom. Taxis are expensive and run on fixed union rates.",
        saving: "💰 Avoid North Goa beachfront resorts; stay in Arambol or Morjim homestays. Eat at local inland dhabas instead of shacks.",
        adventure: "🏕️ Scuba Diving at Grande Island - Half-day boat tour with PADI guides exploring coral reefs and shipwrecks."
      }
    },
    rishikesh: {
      name: "Rishikesh",
      region: "Uttarakhand, India",
      cost: 12000,
      rating: 4.7,
      vibe: "spiritual",
      tags: ["spiritual", "adventure", "nature", "trekking", "food"],
      mapNodes: [
        { id: 1, name: 'Delhi Station', x: 70, y: 220, cost: 'Origin', type: 'Station' },
        { id: 2, name: 'Haridwar Ghat', x: 190, y: 150, cost: '₹220', type: 'Temple' },
        { id: 3, name: 'Laxman Jhula Stay', x: 290, y: 100, cost: '₹2,500', type: 'Hotel' },
        { id: 4, name: 'Neer Garh Waterfall', x: 380, y: 50, cost: '₹50', type: 'Nature' }
      ],
      itinerary: [
        { day: 1, title: "Triveni Ghat Aarti & Café Hop", events: [{ name: "Train from Delhi to Haridwar, cab to Rishikesh", time: "06:00 AM", cost: "₹600 Train" }, { name: "Check-in at Swiss Cottage Resort", time: "01:00 PM", cost: "₹2,500/night" }, { name: "Witness Evening Triveni Ghat Ganga Aarti", time: "06:00 PM", cost: "Free entry" }] },
        { day: 2, title: "River Rafting & Beatles Ashram", events: [{ name: "16km White Water Rafting (Shivpuri to Rishikesh)", time: "09:00 AM", cost: "₹1,000 Package" }, { name: "Lunch at Little Buddha Café (Organic Pizzas)", time: "02:00 PM", cost: "₹450/person" }, { name: "Explore Beatles Ashram ruins & graffiti", time: "04:30 PM", cost: "₹150 Ticket" }] },
        { day: 3, title: "Waterfall Hike & Yoga Session", events: [{ name: "Hike to Neer Garh Waterfall forest pool", time: "08:30 AM", cost: "₹50 Ticket" }, { name: "Yoga class at Parmarth Niketan Ashram", time: "04:00 PM", cost: "₹200 Donation" }, { name: "Vegetarian dinner at Chotiwala Restaurant", time: "07:30 PM", cost: "₹350/person" }] }
      ],
      hotels: [
        { tier: "Budget Stay", name: "Zostel Rishikesh (Tapovan)", price: 900, rating: 4.5, distance: "0.8 km from Lakshman Jhula", amenities: ["Bunk beds", "Rooftop Cafe", "Yoga Space"] },
        { tier: "Best Value", name: "Swiss Cottage Forest Resort", price: 2500, rating: 4.6, distance: "1.1 km from Tapovan", amenities: ["Wifi", "Air Conditioning", "Lush Gardens"] },
        { tier: "Premium Stay", name: "Aloha On The Ganges", price: 9500, rating: 4.8, distance: "2.1 km from Lakshman Jhula", amenities: ["Infinity Pool", "Riverside Dining", "Spa"] }
      ],
      foods: [
        { emoji: "🍛", name: "Ayurvedic Khichdi", type: "Local Healthy Dish" },
        { emoji: "🥪", name: "Hummus Falafel Platter", type: "Popular Cafe Food" },
        { emoji: "🥟", name: "Aloo Puri (Chotiwala)", type: "Must-Try Traditional Breakfast" },
        { emoji: "🥤", name: "Organic Mango Lassi", type: "Popular Drink" }
      ],
      shopping: [
        { name: "Rudraksha Beads & Japa Malas", detail: "₹50 - ₹1,500 | Best at Ram Jhula Bazaar" },
        { name: "Organic Essential Oils & Incense", detail: "₹100 - ₹600 | Best at Tapovan Market" },
        { name: "Yoga Mats & Meditation Bowls", detail: "₹300 - ₹2,500 | Best at Swarg Ashram" },
        { name: "Local Spices & Herbal Teas", detail: "₹150 - ₹450 | Best at Lakshman Jhula" }
      ],
      followUps: {
        gems: "🛕 Vashishta Gufa - A peaceful cave 22km from Rishikesh where sage Vashishta meditated. Located on a quiet beach with white sand.",
        food: "🥪 Beatles Café (Tapovan) - Incredible organic vegan food with views of the Ganges. Oasis Cafe - Famous for Israeli platters.",
        shopping: "🛍️ Ram Jhula Market - Best for purchasing authentic Ayurvedic herbs, prayer brass lamps, and handwoven cotton kurtas.",
        photos: "📸 Lakshman Jhula Suspension Bridge - Stunning architectural shot crossing the fast-flowing emerald Ganges river.",
        sunrise: "🌄 Kunjapuri Temple Sunrise Hike - Drive 30km up to the mountain shrine to watch the sun rise over snow peaks.",
        sunset: "🌅 Parmarth Niketan Ghat - Listen to classical hymns during sunset prayer sessions directly on the stone riverbank steps.",
        weather: "☔ Best Oct to April: 12°C - 28°C. Summer (May-June) can reach 38°C. Rafting is completely closed during monsoons (July-Sept).",
        transport: "🚖 Shared auto-rickshaws (Vikrams) cost only ₹20-₹40 between Tapovan and Ram Jhula. Renting scooters costs ₹400/day.",
        saving: "💰 Stay in Swarg Ashram ashrams where lodging costs under ₹500/night. Drink water refilled from pure UV filters instead of plastic.",
        adventure: "🪂 Bungee Jumping at Mohan Chatti - Jump from India's highest fixed cantilever platform (83 meters) over a rocky stream."
      }
    },
    jaipur: {
      name: "Jaipur",
      region: "Rajasthan, India",
      cost: 16000,
      rating: 4.8,
      vibe: "heritage",
      tags: ["heritage", "shopping", "food", "photos"],
      mapNodes: [
        { id: 1, name: 'Delhi Exit', x: 70, y: 220, cost: 'Origin', type: 'City' },
        { id: 2, name: 'Hawa Mahal Palace', x: 170, y: 150, cost: '₹200', type: 'Sight' },
        { id: 3, name: 'Heritage Haveli', x: 270, y: 100, cost: '₹3,200', type: 'Hotel' },
        { id: 4, name: 'Amer Fort Hills', x: 380, y: 60, cost: '₹500', type: 'Fort' }
      ],
      itinerary: [
        { day: 1, title: "Pink City Walk & Hawa Mahal", events: [{ name: "Cab or Train from Delhi to Jaipur", time: "07:00 AM", cost: "₹700 Train ticket" }, { name: "Check-in at Umaid Bhawan Castle Haveli", time: "01:00 PM", cost: "₹3,200/night" }, { name: "View Hawa Mahal (Palace of Winds) & City Palace", time: "04:00 PM", cost: "₹300 Tickets" }] },
        { day: 2, title: "Grand Forts & Chokhi Dhani Dinner", events: [{ name: "Explore Amer Fort & Sheesh Mahal (Glass Palace)", time: "09:00 AM", cost: "₹500 Ticket" }, { name: "Lunch at Lassiwala (Famous clay-cup sweet lassi)", time: "01:30 PM", cost: "₹90/lassi" }, { name: "Rajasthani Cultural Feast at Chokhi Dhani Village", time: "06:30 PM", cost: "₹1,100 Buffet ticket" }] },
        { day: 3, title: "Albert Hall Museum & Bazaar Shopping", events: [{ name: "Albert Hall Museum pigeon feeding & photography", time: "09:30 AM", cost: "₹150 Ticket" }, { name: "Shopping at Johari Bazaar (Jewellery & Textiles)", time: "11:30 AM", cost: "Free entry" }, { name: "Taste Pyaaz Kachori at Rawat Mishtan Bhandar", time: "02:30 PM", cost: "₹180/snack" }] }
      ],
      hotels: [
        { tier: "Budget Stay", name: "Zostel Jaipur (Pink City)", price: 800, rating: 4.5, distance: "0.2 km from Johari Bazaar", amenities: ["Hostel rooms", "Rooftop lounge", "Air Conditioning"] },
        { tier: "Best Value", name: "Umaid Bhawan Castle Haveli", price: 3200, rating: 4.7, distance: "1.5 km from City Center", amenities: ["Rooftop pool", "Rajasthani decor", "Wifi"] },
        { tier: "Premium Stay", name: "The Rambagh Palace", price: 28000, rating: 4.9, distance: "4.2 km from Hawa Mahal", amenities: ["Royal Suites", "Butler service", "Historic gardens"] }
      ],
      foods: [
        { emoji: "🍛", name: "Dal Baati Churma", type: "Traditional Rajasthani Dish" },
        { emoji: "🥤", name: "Lassiwala Sweet Lassi", type: "Famous Street Drink" },
        { emoji: "🥟", name: "Rawat Pyaaz Kachori", type: "Popular Snack" },
        { emoji: "🍖", name: "Laal Maas (Mutton Curry)", type: "Royal Specialty" }
      ],
      shopping: [
        { name: "Blue Pottery plates & vases", detail: "₹200 - ₹1,800 | Best at Sanganeri Gate" },
        { name: "Jaipuri Block-Print quilts & bedsheets", detail: "₹400 - ₹3,000 | Best at Bapu Bazaar" },
        { name: "Silver Jewellery & Gemstones", detail: "₹500 - ₹15,000 | Best at Johari Bazaar" },
        { name: "Traditional Mojri Leather Shoes", detail: "₹250 - ₹900 | Best at Nehru Bazaar" }
      ],
      followUps: {
        gems: "🕌 Panna Meena ka Kund - An 8-story stepwell near Amer Fort, famous for symmetrical stairs. Nahargarh biological park.",
        food: "🍖 Rawat Mishtan Bhandar - Famous for its onion kachoris. Tapri The Tea House - Rooftop cafe overlooking Central Park.",
        shopping: "🛍️ Bapu Bazaar - Best market for bargaining on block prints, bandhani fabrics, and colorful camel-leather slippers.",
        photos: "📸 Patrika Gate - A colorful entrance decorated with mural columns. Instagram heaven.",
        sunrise: "🌄 Nahargarh Fort - Watch the sun rise over the Pink City from the high stone walls.",
        sunset: "🌅 Jal Mahal - The Water Palace sitting in Man Sagar Lake. Sunset paints the water gold.",
        weather: "☔ October to March: 15°C - 30°C. Summer (April-June) is extremely hot, often crossing 42°C.",
        transport: "🚖 Auto-rickshaws cost ₹100-₹200. Uber/Ola are easily available for traveling to Amer Fort.",
        saving: "💰 Buy the Composite Entry Ticket (₹400) which grants access to 8 forts & museums.",
        adventure: "🎈 Hot Air Balloon Safari - Float over Amer Fort at sunrise."
      }
    },
    nainital: {
      name: "Nainital",
      region: "Uttarakhand, India",
      cost: 15000,
      rating: 4.6,
      vibe: "nature",
      tags: ["nature", "kids", "photos"],
      mapNodes: [
        { id: 1, name: 'Kathgodam Rail', x: 70, y: 220, cost: 'Origin', type: 'Station' },
        { id: 2, name: 'Naini Lake Boating', x: 190, y: 160, cost: '₹350', type: 'Sight' },
        { id: 3, name: 'Lake View Lodge', x: 290, y: 110, cost: '₹2,900', type: 'Hotel' },
        { id: 4, name: 'Snow View Ridge', x: 380, y: 60, cost: '₹150', type: 'Ropeway' }
      ],
      itinerary: [
        { day: 1, title: "Lake Boating & Mall Road Walk", events: [{ name: "Train to Kathgodam, cab to Nainital", time: "08:00 AM", cost: "₹750 Train" }, { name: "Rowboat cruise in Naini Lake", time: "03:30 PM", cost: "₹350/boat" }, { name: "Dinner at Machan Restaurant (Mall Road)", time: "07:30 PM", cost: "₹500/person" }] },
        { day: 2, title: "Snow View Ropeway & High Altitude Zoo", events: [{ name: "Ropeway Cable Car to Snow View Point", time: "09:30 AM", cost: "₹150 Ticket" }, { name: "Visit Nainital Zoo (Rare Himalayan Species)", time: "12:00 PM", cost: "₹100 Ticket" }, { name: "Shopping at Tibetan Market (Thukpa & Shawls)", time: "05:00 PM", cost: "Free market" }] },
        { day: 3, title: "Eco Cave Gardens & Tiffin Top Hike", events: [{ name: "Hike to Tiffin Top (Dorothy's Seat) trail", time: "08:30 AM", cost: "Free hike" }, { name: "Clamber through Eco Cave Gardens rocky paths", time: "02:30 PM", cost: "₹60 Ticket" }, { name: "Candlelit dinner at Café Chica", time: "07:00 PM", cost: "₹700/person" }] }
      ],
      hotels: [
        { tier: "Budget Stay", name: "Zostel Homes Nainital", price: 1000, rating: 4.4, distance: "1.8 km from Lake", amenities: ["Wifi", "Hot Water", "Garden View"] },
        { tier: "Best Value", name: "Lake View Heritage Lodge", price: 2900, rating: 4.6, distance: "0.2 km from Mall Rd", amenities: ["Balcony Lake View", "Breakfast", "Wifi"] },
        { tier: "Premium Stay", name: "The Naini Retreat", price: 12500, rating: 4.8, distance: "2.5 km from Lake", amenities: ["Heritage Rooms", "Premium Dining", "Spa"] }
      ],
      foods: [
        { emoji: "🍜", name: "Tibetan Thukpa Noodles", type: "Popular Hot Soup" },
        { emoji: "🥟", name: "Tibetan Steamed Momos", type: "Street Food Specialty" },
        { emoji: "🥬", name: "Bhatt ki Churkani", type: "Traditional Kumaoni Dish" },
        { emoji: "🧋", name: "Butter Salt Tea", type: "Tibetan Cafe Beverage" }
      ],
      shopping: [
        { name: "Handmade Scented & Fruit Candles", detail: "₹50 - ₹600 | Best at Mall Road Shop" },
        { name: "Hand-knitted Kumaoni Sweaters", detail: "₹300 - ₹1,500 | Best at Tibetan Market" },
        { name: "Wooden Keychains & Crafts", detail: "₹50 - ₹400 | Best at Bara Bazaar" },
        { name: "Organic Peaches & Plums jams", detail: "₹150 - ₹450 | Best at Mall Road" }
      ],
      followUps: {
        gems: "🌲 Pangot Bird Sanctuary - A pine forest hamlet 15km from Nainital, boasting 200+ rare birds. Absolute bliss.",
        food: "🍜 Tibetan Market Shacks - Try spicy chicken Thukpa. Cafe Chica - Nestled in a garden estate, offering fresh quiche.",
        shopping: "🛍️ Tibetan Market & Bara Bazaar - Best for buying cheap woolen clothing.",
        photos: "📸 Tiffin Top (Dorothy's Seat) - High stone bench offering an aerial overlook of Naini Lake.",
        sunrise: "🌄 Snow View Point - Catch morning sunlight on distant peaks.",
        sunset: "🌅 Hanuman Garhi - Sunset views over the valley hills from a hilltop temple complex.",
        weather: "☔ Mar to June: 10°C - 25°C. July to Sept: Monsoons. Dec to Feb: Cold, occasional snow.",
        transport: "🚖 Taxis are union-controlled. Driving on Mall Road has strict timing limits.",
        saving: "💰 Book hotel stays slightly up the zoo road or in Ayarpatta hill to save up to 40%.",
        adventure: "🥾 Naina Peak Trek - A steep 6km trek to Nainital's highest mountaintop."
      }
    },
    kasol: {
      name: "Kasol",
      region: "Himachal Pradesh, India",
      cost: 14000,
      rating: 4.7,
      vibe: "mountain",
      tags: ["mountain", "trekking", "nature", "nightlife", "camping"],
      mapNodes: [
        { id: 1, name: 'Bhuntar Airport', x: 70, y: 220, cost: 'Origin', type: 'Transit' },
        { id: 2, name: 'Kasol Riverside', x: 190, y: 150, cost: '₹150', type: 'Nature' },
        { id: 3, name: 'Parvati Valley Stay', x: 290, y: 110, cost: '₹2,200', type: 'Hotel' },
        { id: 4, name: 'Kheerganga Hot Springs', x: 380, y: 60, cost: '₹600', type: 'Camp' }
      ],
      itinerary: [
        { day: 1, title: "Parvati River Walk & Israeli Food", events: [{ name: "Bus/Cab from Bhuntar to Kasol", time: "09:00 AM", cost: "₹300 local bus" }, { name: "Leisurly walk along the Parvati River bank", time: "02:00 PM", cost: "Free walk" }, { name: "Dinner at Evergreen Cafe (Famous Shakshuka)", time: "07:00 PM", cost: "₹450/person" }] },
        { day: 2, title: "Trek to Chalal & Cafe Crawl", events: [{ name: "Short forest hike to Chalal Village", time: "10:00 AM", cost: "Free walk" }, { name: "Lunch at Jim Morrison Café (Retro rock vibe)", time: "01:30 PM", cost: "₹400/person" }, { name: "Stargazing at riverside camp bonfire", time: "08:00 PM", cost: "₹800 camp fee" }] },
        { day: 3, title: "Manikaran Hot Springs visit", events: [{ name: "Visit Manikaran Sahib Gurudwara hot springs", time: "09:30 AM", cost: "Free entry" }, { name: "Langar (Community lunch) inside Gurudwara", time: "12:30 PM", cost: "Free donation" }, { name: "Shop for hippie souvenirs in Kasol market", time: "04:00 PM", cost: "Free walk" }] }
      ],
      hotels: [
        { tier: "Budget Stay", name: "Nomads Hostel Kasol", price: 700, rating: 4.5, distance: "0.5 km from River", amenities: ["Shared rooms", "Bonfire", "Wifi"] },
        { tier: "Best Value", name: "Kasol Heights Resort & Camps", price: 2200, rating: 4.6, distance: "1.5 km from Market", amenities: ["Riverside dome tents", "Hot water", "Cafe"] },
        { tier: "Premium Stay", name: "The Himalayan Village", price: 11500, rating: 4.8, distance: "3.5 km from Kasol", amenities: ["Traditional Cottages", "Luxury Spa", "Bar"] }
      ],
      foods: [
        { emoji: "🍳", name: "Shakshuka & Pita Bread", type: "Israeli Specialty" },
        { emoji: "🧆", name: "Falafel Hummus platter", type: "Popular Cafe Meal" },
        { emoji: "🥟", name: "Siddu (Steamed Himachali Bun)", type: "Local Specialty" },
        { emoji: "🧇", name: "Nutella Waffles", type: "Popular Dessert" }
      ],
      shopping: [
        { name: "Hippie Harem Pants & Ponchos", detail: "₹250 - ₹700 | Best at Kasol Flea Market" },
        { name: "Himachali woolen caps", detail: "₹100 - ₹350 | Best at Kasol Bazaar" },
        { name: "Handmade soaps & Hemp bags", detail: "₹150 - ₹600 | Best at Local Shops" },
        { name: "Chillums & Accessories", detail: "₹50 - ₹1,200 | Best at Hippie Stalls" }
      ],
      followUps: {
        gems: "🏔️ Tosh Village - A wooden alpine village 20km further up Parvati Valley. Offers majestic views of glacier fields.",
        food: "🍳 Evergreen Cafe - Phenomenal hummus. Jim Morrison Cafe - Housed in an attic cabin.",
        shopping: "🛍️ Kasol Market - Best for finding woolen socks, dreamcatchers, patch-worked jackets, and herbal teas.",
        photos: "📸 Chalal suspension bridge - Suspended over wild blue Parvati rapids.",
        sunrise: "🌄 Manikaran Hills - Beautiful view of steam columns rising from hot springs.",
        sunset: "🌅 Pulga fairy forest - Pine-needle paths with sunset lighting cutting through tall green trees.",
        weather: "☔ Spring (Mar-May): 10°C - 24°C. Winters get freezing (-2°C) with heavy snow.",
        transport: "🚖 Local buses run every 40 minutes (very cheap). Private cabs are available.",
        saving: "💰 Hike to Chalal instead of hiring cabs. Stay in local homestays in Pulga.",
        adventure: "🥾 Kheerganga Trek - A 12km steep trek climbing past waterfalls to hot water springs."
      }
    }
  };

  // Pre-visited history configuration (returns Mussoorie for returning user recommendations)
  appState.history = [
    { dest: "Mussoorie", date: "Jan 12, 2026", cost: 18400 }
  ];

  // Check if returning user should be shown
  if (appState.history.length > 0) {
    const returningCard = document.getElementById('returning-user-pers-card');
    if (returningCard) {
      returningCard.style.display = 'flex';
    }
  }

  // ==========================================================================
  // WIZARD STATE MACHINE & INTERACTIVE ELEMENTS
  // ==========================================================================
  const wizardBackdrop = document.getElementById('wizard-backdrop');
  const btnOpenWizard = document.getElementById('btn-open-wizard');
  const btnWizardClose = document.getElementById('btn-wizard-close');
  
  const wizardSteps = document.querySelectorAll('.wizard-step');
  const btnWizardPrev = document.getElementById('btn-wizard-prev');
  const btnWizardNext = document.getElementById('btn-wizard-next');
  const progressBarFill = document.getElementById('wizard-progress-bar-fill');
  
  // Custom budget sync elements
  const budgetSlider = document.getElementById('wizard-budget-slider');
  const customBudgetInput = document.getElementById('wizard-custom-budget');
  const sliderValDisplay = document.getElementById('wizard-slider-val');

  // Custom days sync
  const durationChips = document.querySelectorAll('.duration-chip');
  const customDaysInput = document.getElementById('wizard-custom-days');

  let currentStep = 1;
  const wizardData = {
    destination: 'Mussoorie',
    origin: 'Delhi',
    companion: 'solo',
    ageGroup: 'under18',
    vibes: ['mountain'],
    budget: 30000,
    days: 5,
    preferences: ['gems']
  };

  // Open / Close wizard
  if (btnOpenWizard) {
    btnOpenWizard.addEventListener('click', () => {
      playSound('click');
      openWizardFlow();
    });
  }

  const PERSONALIZED_RECOMMENDATIONS = [
    {
      base: "Mussoorie",
      target: "kasol",
      title: "🦊 Because you enjoyed Mussoorie",
      desc: "Other mountain explorers like you loved Kasol, Jibhi, and Rishikesh. Let's build a customized road trip here!",
      btnText: "Plan Kasol"
    },
    {
      base: "Kasol",
      target: "jaipur",
      title: "🏛️ Expand your horizons in Jaipur",
      desc: "Since you loved mountain retreats, try exploring the majestic forts and royal foods of the Pink City next!",
      btnText: "Plan Jaipur"
    },
    {
      base: "Jaipur",
      target: "rishikesh",
      title: "🛕 Adventure awaits in Rishikesh",
      desc: "Loved the heritage style? Rishikesh mixes beautiful spiritual temples with thrilling white river rafting!",
      btnText: "Plan Rishikesh"
    },
    {
      base: "Rishikesh",
      target: "nainital",
      title: "🛶 Lakeside views in Nainital",
      desc: "Since you liked spiritual rivers, you'll love boating in the quiet, scenic Naini Lake surrounded by green hills!",
      btnText: "Plan Nainital"
    },
    {
      base: "Nainital",
      target: "goa",
      title: "🏖️ Sunshine beaches of Goa",
      desc: "Ready for a change of vibe? Switch from peaceful lakes to sun-kissed beaches and vibrant nightlife hubs!",
      btnText: "Plan Goa"
    }
  ];

  appState.recIndex = parseInt(localStorage.getItem('travana-rec-index')) || 0;
  const returningCard = document.getElementById('returning-user-pers-card');
  const planSuggestionBtn = document.getElementById('btn-pers-mussoorie');

  function updatePersonalizedCard() {
    if (!returningCard || !planSuggestionBtn) return;
    const rec = PERSONALIZED_RECOMMENDATIONS[appState.recIndex % PERSONALIZED_RECOMMENDATIONS.length];
    
    const cardTitleEl = returningCard.querySelector('.pers-card-title span');
    const cardDescEl = returningCard.querySelector('.pers-card-subtitle');
    
    if (cardTitleEl) cardTitleEl.textContent = rec.title;
    if (cardDescEl) cardDescEl.textContent = rec.desc;
    planSuggestionBtn.textContent = rec.btnText;
  }

  updatePersonalizedCard();

  if (planSuggestionBtn) {
    planSuggestionBtn.addEventListener('click', () => {
      playSound('success');
      const rec = PERSONALIZED_RECOMMENDATIONS[appState.recIndex % PERSONALIZED_RECOMMENDATIONS.length];
      
      showPackingLoader(() => {
        let destData = TRAVEL_DATABASE[rec.target.toLowerCase()];
        if (!destData) {
          // If not in database, dynamically generate a custom plan
          destData = {
            name: rec.target.charAt(0).toUpperCase() + rec.target.slice(1),
            region: "India",
            cost: 15000,
            rating: 4.7,
            vibe: "nature",
            tags: ["nature", "photos"],
            mapNodes: [
              { id: 1, name: wizardData.origin || 'Delhi', x: 70, y: 190, cost: 'Origin', type: 'Station' },
              { id: 2, name: `${rec.target} Valley`, x: 180, y: 140, cost: '₹180', type: 'Transit' },
              { id: 3, name: `${rec.target} Lodge`, x: 280, y: 100, cost: '₹2,800', type: 'Hotel' },
              { id: 4, name: `${rec.target} Peak`, x: 380, y: 60, cost: '₹50', type: 'Attraction' }
            ],
            itinerary: [
              { day: 1, title: `Road trip to ${rec.target}`, events: [{ name: `Travel to ${rec.target}`, time: "07:00 AM", cost: "₹400 transport" }, { name: "Check-in at Alpine Stay", time: "01:30 PM", cost: "₹2,800/night" }] },
              { day: 2, title: "Nature Trail & Exploration", events: [{ name: "Hiking tour around valley and lakes", time: "09:00 AM", cost: "Free" }] },
              { day: 3, title: "Relaxation & Return", events: [{ name: "Breakfast and departure back", time: "10:00 AM", cost: "Free" }] }
            ],
            hotels: [
              { tier: "Budget Stay", name: `${rec.target} B&B`, price: 900, rating: 4.4, distance: "1 km from center", amenities: ["Wifi", "Kitchen"] },
              { tier: "Best Value", name: `Alpine Stay`, price: 2800, rating: 4.6, distance: "0.2 km from center", amenities: ["Breakfast", "Wifi"] }
            ],
            foods: [
              { emoji: "🥘", name: "Traditional Thali", type: "Local Specialty" }
            ],
            shopping: [
              { name: "Local souvenirs", detail: "₹100 - ₹800" }
            ],
            followUps: {
              gems: `🌲 Quiet walks around ${rec.target}`,
              weather: `☀️ 15°C - 25°C. Carry a light jacket.`,
              transport: `🏍️ Bike rentals are recommended.`
            }
          };
        }
        loadTripPlan(destData, 3);
        
        // Advance cycle index for next suggestion
        appState.recIndex++;
        localStorage.setItem('travana-rec-index', appState.recIndex);
        updatePersonalizedCard();
        
        navigateToTab('trips-page');
      });
    });
  }

  const POPULAR_REAL_PLACES = new Set([
    'delhi', 'mumbai', 'bangalore', 'kolkata', 'chennai', 'hyderabad', 'pune', 'ahmedabad',
    'jaipur', 'dehradun', 'haridwar', 'goa', 'kathgodam', 'lucknow', 'chandigarh', 'mussoorie',
    'rishikesh', 'nainital', 'kasol', 'shimla', 'manali', 'gurgaon', 'noida', 'kochi', 'patna',
    'srinagar', 'leh', 'agra', 'udaipur', 'jaisalmer', 'kozhikode', 'thiruvananthapuram', 'coimbatore',
    'madurai', 'ooty', 'munnar', 'wayanad', 'alleppey', 'pondicherry', 'mysore', 'hampi', 'gokarna'
  ]);

  function openWizardFlow() {
    currentStep = 1;
    
    // Clear inputs for destination and origin (so placeholder shows)
    const destInputEl = document.getElementById('wizard-dest-input');
    const originInputEl = document.getElementById('wizard-origin-input');
    const destPills = document.querySelectorAll('.wizard-step[data-step="1"] .filter-pill');
    const originPills = document.querySelectorAll('.wizard-step[data-step="2"] .filter-pill');
    
    if (destInputEl) destInputEl.value = '';
    if (originInputEl) originInputEl.value = '';
    
    // Reset wizardData properties
    wizardData.destination = '';
    wizardData.origin = '';
    wizardData.companion = 'solo';
    wizardData.ageGroup = 'under18';
    wizardData.vibes = ['mountain'];
    wizardData.budget = 30000;
    wizardData.days = 5;
    wizardData.preferences = ['gems'];

    // Deactivate pills
    destPills.forEach(p => p.classList.remove('active'));
    originPills.forEach(p => p.classList.remove('active'));

    // Reset visual rows/pills for other steps
    document.querySelectorAll('.wizard-step .wizard-option-row').forEach(r => r.classList.remove('selected'));
    document.querySelectorAll('.wizard-step[data-step="3"] .wizard-option-row[data-value="solo"]').forEach(r => r.classList.add('selected'));
    document.querySelectorAll('.wizard-step[data-step="4"] .wizard-option-row[data-value="under18"]').forEach(r => r.classList.add('selected'));
    
    document.querySelectorAll('.wizard-step .vacation-pill').forEach(r => r.classList.remove('selected'));
    document.querySelectorAll('.wizard-step[data-step="5"] .vacation-pill[data-value="mountain"]').forEach(r => r.classList.add('selected'));
    document.querySelectorAll('.wizard-step[data-step="8"] .vacation-pill[data-value="gems"]').forEach(r => r.classList.add('selected'));

    const budgetSlider = document.getElementById('wizard-budget-slider');
    const customBudgetInput = document.getElementById('wizard-custom-budget');
    const sliderValDisplay = document.getElementById('wizard-slider-val');
    if (budgetSlider) budgetSlider.value = 30000;
    if (customBudgetInput) customBudgetInput.value = 30000;
    if (sliderValDisplay) sliderValDisplay.textContent = '₹30,000';

    const durationChips = document.querySelectorAll('.duration-chip');
    const customDaysInput = document.getElementById('wizard-custom-days');
    durationChips.forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.duration-chip[data-value="5"]').forEach(c => c.classList.add('selected'));
    if (customDaysInput) customDaysInput.value = 5;

    updateMascotTip(`"Where would you like to travel?"`);
    updateStepView();
    wizardBackdrop.classList.add('open');
  }

  function closeWizardFlow() {
    wizardBackdrop.classList.remove('open');
  }
  if (btnWizardClose) btnWizardClose.addEventListener('click', closeWizardFlow);

  // Explore More button in Trips tab
  const btnExploreMore = document.getElementById('btn-explore-more');
  if (btnExploreMore) {
    btnExploreMore.addEventListener('click', () => {
      playSound('click');
      openWizardFlow();
    });
  }

  // STEP 1: Destination event listener and pills
  const destInputEl = document.getElementById('wizard-dest-input');
  const destPills = document.querySelectorAll('.wizard-step[data-step="1"] .filter-pill');
  if (destInputEl) {
    destInputEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      wizardData.destination = val;
      if (val.length === 0) {
        updateMascotTip(`"Where would you like to travel?"`);
      } else {
        const lowerVal = val.toLowerCase();
        const isReal = POPULAR_REAL_PLACES.has(lowerVal) || Array.from(POPULAR_REAL_PLACES).some(place => place.includes(lowerVal) || lowerVal.includes(place));
        
        if (isReal) {
          updateMascotTip(`"Planning to visit ${val}! Let's make it the adventure of a lifetime."`);
        } else {
          updateMascotTip(`"Hmm, I don't recognize '${val}'. Please enter a real destination (e.g., Mussoorie, Goa, Rishikesh) so we can customize your trip!"`);
        }
      }
      destPills.forEach(pill => {
        if (pill.getAttribute('data-dest').toLowerCase() === val.toLowerCase()) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    });
  }
  destPills.forEach(pill => {
    pill.addEventListener('click', () => {
      destPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.getAttribute('data-dest');
      if (destInputEl) destInputEl.value = val;
      wizardData.destination = val;
      playSound('click');
      updateMascotTip(`"Great choice! ${val} is a beautiful spot. Let's customize a trip there!"`);
    });
  });

  // STEP 2: Origin event listener and pills
  const originInputEl = document.getElementById('wizard-origin-input');
  const originPills = document.querySelectorAll('.wizard-step[data-step="2"] .filter-pill');
  if (originInputEl) {
    originInputEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      wizardData.origin = val;
      if (val.length === 0) {
        updateMascotTip(`"Where are you starting your journey from?"`);
      } else {
        const lowerVal = val.toLowerCase();
        const isReal = POPULAR_REAL_PLACES.has(lowerVal) || Array.from(POPULAR_REAL_PLACES).some(city => city.includes(lowerVal) || lowerVal.includes(city));
        
        if (isReal) {
          updateMascotTip(`"Traveling from ${val}. We will map the best routes for you."`);
        } else {
          updateMascotTip(`"Hmm, I don't recognize '${val}'. Please enter a real starting city (e.g., Delhi, Mumbai, Bangalore) so we can map accurate routes!"`);
        }
      }
      originPills.forEach(pill => {
        if (pill.getAttribute('data-orig').toLowerCase() === val.toLowerCase()) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    });
  }
  originPills.forEach(pill => {
    pill.addEventListener('click', () => {
      originPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.getAttribute('data-orig');
      if (originInputEl) originInputEl.value = val;
      wizardData.origin = val;
      playSound('click');
      updateMascotTip(`"Got it! Starting the journey from ${val}."`);
    });
  });

  // Sync Slider to values and text inputs
  if (budgetSlider && customBudgetInput && sliderValDisplay) {
    budgetSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      sliderValDisplay.textContent = `₹${val.toLocaleString()}`;
      customBudgetInput.value = val;
      wizardData.budget = val;
      updateMascotTip(`"Great choice! ₹${val.toLocaleString()} is perfect for a cozy budget-friendly mountain get-away!"`);
    });

    customBudgetInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) || 0;
      wizardData.budget = val;
      if (val <= 300000) {
        budgetSlider.value = val;
        sliderValDisplay.textContent = `₹${val.toLocaleString()}`;
      } else {
        budgetSlider.value = 300000; // max slider
        sliderValDisplay.textContent = `₹${val.toLocaleString()}+`;
      }
      updateMascotTip(`"Awesome! Custom budget ₹${val.toLocaleString()} entered. We will filter premium stays accordingly!"`);
    });
  }

  // Duration select logic
  durationChips.forEach(chip => {
    chip.addEventListener('click', () => {
      durationChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      const val = chip.getAttribute('data-value');
      let days = 5;
      if (val === 'weekend') days = 2;
      else if (val === '15') days = 15;
      else days = parseInt(val);

      customDaysInput.value = days;
      wizardData.days = days;
      playSound('click');
      updateMascotTip(`"Nice! A ${days}-day itinerary gives us plenty of time to discover hidden valleys and local food joints!"`);
    });
  });

  if (customDaysInput) {
    customDaysInput.addEventListener('input', (e) => {
      const days = parseInt(e.target.value) || 1;
      wizardData.days = days;
      // deselect all preset chips
      durationChips.forEach(c => c.classList.remove('selected'));
      updateMascotTip(`"Planning a custom ${days}-day trip! Let me lay out a daily timeline for you."`);
    });
  }

  // Row selection bindings for Companion/Age Group
  const setupRowSelect = (stepNum, stateKey) => {
    const rows = document.querySelectorAll(`.wizard-step[data-step="${stepNum}"] .wizard-option-row`);
    rows.forEach(row => {
      row.addEventListener('click', () => {
        rows.forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const val = row.getAttribute('data-value');
        wizardData[stateKey] = val;
        playSound('click');

        const mascotSpeech = {
          solo: `"Solo travels are fantastic for self-discovery! I will suggest quiet cafes and hiking trails."`,
          couple: `"A romantic getaway! I will prioritize scenic sunset spots, lake boating, and fine dining."`,
          friends: `"Trip with friends! Let's inject adventure sports, river rafting, and campsite bonfire sessions!"`,
          family: `"Family vacation! I'll pick comfortable, kid-friendly hotels and easy attractions."`,
          seniors: `"Senior citizen friendly. We will recommend slow-paced routes with minimal stair climbs."`
        };

        if (stateKey === 'companion') {
          updateMascotTip(mascotSpeech[val]);
        }
      });
    });
  };
  setupRowSelect(3, 'companion');
  setupRowSelect(4, 'ageGroup');

  // Multi-select for Vacation vibes and special preferences
  const setupMultiSelect = (stepNum, stateKey) => {
    const pills = document.querySelectorAll(`.wizard-step[data-step="${stepNum}"] .vacation-pill`);
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const val = pill.getAttribute('data-value');
        const isSelected = pill.classList.toggle('selected');
        playSound('click');

        if (isSelected) {
          if (!wizardData[stateKey].includes(val)) {
            wizardData[stateKey].push(val);
          }
        } else {
          wizardData[stateKey] = wizardData[stateKey].filter(x => x !== val);
        }

        if (stateKey === 'vibes') {
          updateMascotTip(`"Awesome! You selected ${wizardData.vibes.length} vibes. Let me curate spots matching them!"`);
        }
      });
    });
  };
  setupMultiSelect(5, 'vibes');
  setupMultiSelect(8, 'preferences');

  function updateMascotTip(text) {
    const speech = document.getElementById('wizard-mascot-speech');
    if (speech) speech.textContent = text;
  }

  // Back/Next Step Navigation logic
  if (btnWizardNext && btnWizardPrev) {
    btnWizardNext.addEventListener('click', () => {
      if (currentStep < 8) {
        currentStep++;
        updateStepView();
        playSound('click');
      } else {
        // Step 8 completed: run scoring & generate trip!
        closeWizardFlow();
        showPackingLoader(() => {
          generateIntelligentTrip();
        });
      }
    });

    btnWizardPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        updateStepView();
        playSound('click');
      }
    });
  }

  function updateStepView() {
    // Toggle active step class
    wizardSteps.forEach(step => {
      step.classList.remove('active-step');
      if (parseInt(step.getAttribute('data-step')) === currentStep) {
        step.classList.add('active-step');
      }
    });

    // Update Progress bar fill width
    const percentage = (currentStep / 8) * 100;
    progressBarFill.style.width = `${percentage}%`;

    // Show/Hide back button
    if (currentStep === 1) {
      btnWizardPrev.style.visibility = 'hidden';
    } else {
      btnWizardPrev.style.visibility = 'visible';
    }

    // Change next text on last step
    if (currentStep === 8) {
      btnWizardNext.textContent = 'Generate Trip';
    } else {
      btnWizardNext.textContent = 'Next';
    }
  }

  // Suitcase Packing Loader Animation
  function showPackingLoader(callback) {
    const loader = document.getElementById('packing-loader');
    if (!loader) return;
    
    loader.classList.add('active');
    playSound('swipe');

    const chkPacking = document.getElementById('chk-packing');
    const chkPricing = document.getElementById('chk-pricing');
    const chkGems = document.getElementById('chk-gems');
    const loaderEmoji = document.getElementById('mascot-loader-emoji');

    // Reset spinner states & mascot graphics
    if (loaderEmoji) loaderEmoji.textContent = '🦊🎒';
    chkPacking.className = 'loader-check-item';
    chkPacking.querySelector('i').className = 'fas fa-spinner fa-spin';
    chkPricing.className = 'loader-check-item';
    chkPricing.querySelector('i').className = 'fas fa-circle-notch';
    chkGems.className = 'loader-check-item';
    chkGems.querySelector('i').className = 'fas fa-circle-notch';

    // Checklist sequence
    setTimeout(() => {
      chkPacking.classList.add('done');
      chkPacking.querySelector('i').className = 'fas fa-check';
      chkPricing.querySelector('i').className = 'fas fa-spinner fa-spin';
      if (loaderEmoji) loaderEmoji.textContent = '🦊📊';
      playSound('click');
    }, 1000);

    setTimeout(() => {
      chkPricing.classList.add('done');
      chkPricing.querySelector('i').className = 'fas fa-check';
      chkGems.querySelector('i').className = 'fas fa-spinner fa-spin';
      if (loaderEmoji) loaderEmoji.textContent = '🦊🔍';
      playSound('click');
    }, 2000);

    setTimeout(() => {
      chkGems.classList.add('done');
      chkGems.querySelector('i').className = 'fas fa-check';
      if (loaderEmoji) loaderEmoji.textContent = '🦊🎉';
      playSound('success');
    }, 2800);

    setTimeout(() => {
      loader.classList.remove('active');
      callback();
    }, 3200);
  }

  // ==========================================================================
  // INTELLIGENT MATCHING SCORING ALGORITHM
  // ==========================================================================
  // Helper to generate dynamic mock destinations for custom user inputs
  function generateMockDestination(name, origin, vibe, days, budget) {
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const formattedOrigin = origin.charAt(0).toUpperCase() + origin.slice(1);
    
    const mapNodes = [
      { id: 1, name: formattedOrigin, x: 70, y: 190, cost: 'Origin', type: 'City' },
      { id: 2, name: `${formattedName} Valley`, x: 190, y: 150, cost: 'Transit', type: 'Stop' },
      { id: 3, name: `${formattedName} Center`, x: 290, y: 100, cost: `₹${Math.round(budget * 0.15).toLocaleString()}`, type: 'Hotel' },
      { id: 4, name: `${formattedName} Viewpoint`, x: 380, y: 60, cost: 'Attraction', type: 'Sight' }
    ];

    let act1 = "Sightseeing tour";
    let act2 = "Local food tasting";
    let act3 = "Scenic walk";
    
    if (vibe === 'beach') {
      act1 = "Relaxing at the sandy shores & sunbathing";
      act2 = "Seafood lunch at a beachside shack";
      act3 = "Sunset cruise and beach stroll";
    } else if (vibe === 'mountain' || vibe === 'trekking') {
      act1 = "Morning forest hike to panoramic ridge";
      act2 = "Local hot tea & traditional mountain lunch";
      act3 = "Sunset viewing from the peak spot";
    } else if (vibe === 'heritage' || vibe === 'cultural') {
      act1 = "Guided tour of historic palaces & museums";
      act2 = "Authentic heritage lunch at local diner";
      act3 = "Cultural evening dance and light show";
    } else if (vibe === 'food') {
      act1 = "Street food crawl in old town markets";
      act2 = "Cooking class with a local chef";
      act3 = "Fine dining restaurant featuring local dishes";
    } else if (vibe === 'adventure') {
      act1 = "Thrilling outdoor sports (rafting/ziplining)";
      act2 = "Campfire barbecue lunch with guides";
      act3 = "Evening stargazing session at the base camp";
    }

    const itinerary = [];
    for (let i = 1; i <= days; i++) {
      itinerary.push({
        day: i,
        title: `${formattedName} Exploration - Day ${i}`,
        events: [
          { name: `${act1} in ${formattedName}`, time: "09:00 AM", cost: "Included" },
          { name: `${act2} at top-rated diner`, time: "01:00 PM", cost: `₹450/person` },
          { name: `${act3} with local companion guide`, time: "06:30 PM", cost: "Free access" }
        ]
      });
    }

    const hotelPrice = Math.round(budget / (days * 3));
    const hotels = [
      { tier: "Budget Stay", name: `${formattedName} Cozy Hostel`, price: Math.round(hotelPrice * 0.4), rating: 4.3, distance: "1.2 km from center", amenities: ["Free Wifi", "Lounge", "Shared Kitchen"] },
      { tier: "Best Value", name: `${formattedName} Plaza Hotel`, price: hotelPrice, rating: 4.6, distance: "0.4 km from center", amenities: ["Free Breakfast", "Wifi", "Ac"] },
      { tier: "Premium Stay", name: `${formattedName} Grand Resort`, price: Math.round(hotelPrice * 2.2), rating: 4.9, distance: "1.8 km from center", amenities: ["Infinity Pool", "Panoramic Balcony", "Spa"] }
    ];

    const foods = [
      { emoji: "🍲", name: `${formattedName} Signature Bowl`, type: "Must-Try Local Specialty" },
      { emoji: "🥟", name: `${formattedName} Street Snacks`, type: "Popular Street Food" },
      { emoji: "🥤", name: `Traditional ${formattedName} Drink`, type: "Traditional Drink" }
    ];

    const shopping = [
      { name: `${formattedName} Handmade Crafts`, detail: "₹150 - ₹1,200 | Town Market" },
      { name: `${formattedName} Spices & Preserves`, detail: "₹100 - ₹500 | Old Bazaar" },
      { name: `Traditional clothing & fabric`, detail: "₹450 - ₹2,000 | Central Mall" }
    ];

    const followUps = {
      gems: `🏔️ Hidden Gem: Visit the quiet nature valley and secret streams located just 5km from ${formattedName} center.`,
      food: `🍜 Food Guide: Head to the older town quarters of ${formattedName} to find traditional family-run kitchens.`,
      shopping: `🛍️ Souvenirs: Local wooden items, handwoven fabrics, and organic preserves are the best buys in ${formattedName}.`,
      photos: `📸 Photography: The old clock tower and the sunset point offer the most stunning shots of the landscape.`,
      sunrise: `🌄 Sunrise: Get up early to watch the sun rise over the eastern valley ridges of ${formattedName}.`,
      sunset: `🌅 Sunset: The city lake or the high ridge paths are the perfect spots for watching the golden twilight.`,
      weather: `☔ Weather: Generally pleasant, but carry light warm clothes for early mornings and late evenings.`,
      transport: `🚖 Transport: Local auto rickshaws and private taxis are easily available near the city center.`,
      saving: `💰 Budget Tip: Dine at local street markets and use shared transport to save up to 35% of costs.`,
      adventure: `🏕️ Adventure: Rent a local bike to explore the scenic forest trails surrounding ${formattedName}.`
    };

    return {
      name: formattedName,
      region: "Custom Itinerary, India",
      cost: budget,
      rating: 4.8,
      vibe: vibe || "nature",
      tags: [vibe || "nature"],
      mapNodes,
      itinerary,
      hotels,
      foods,
      shopping,
      followUps
    };
  }

  // ==========================================================================
  // INTELLIGENT MATCHING SCORING ALGORITHM
  // ==========================================================================
  function generateIntelligentTrip() {
    let bestMatch = null;
    let highestScore = -999;

    let destInput = (wizardData.destination || '').trim();
    if (!destInput) destInput = 'Mussoorie';
    
    let originInput = (wizardData.origin || '').trim();
    if (!originInput) originInput = 'Delhi';

    const destLower = destInput.toLowerCase();
    let directMatch = null;
    
    Object.keys(TRAVEL_DATABASE).forEach(key => {
      if (destLower === key || destLower.includes(key) || key.includes(destLower)) {
        if (destLower.length >= 3) {
          directMatch = TRAVEL_DATABASE[key];
        }
      }
    });

    if (directMatch) {
      bestMatch = directMatch;
    } else {
      bestMatch = generateMockDestination(destInput, originInput, wizardData.vibes[0], wizardData.days, wizardData.budget);
    }

    // Load matching destination plan!
    loadTripPlan(bestMatch, wizardData.days);
    
    // Jump user directly to the Trips page tab!
    navigateToTab('trips-page');
    triggerConfetti();
  }

  // Renders the itinerary, hotels, food lists dynamically inside Trips page
  function loadTripPlan(dest, duration) {
    // Clone dest to avoid mutating original TRAVEL_DATABASE
    const destClone = JSON.parse(JSON.stringify(dest));
    if (destClone.mapNodes && destClone.mapNodes.length > 0 && wizardData.origin) {
      destClone.mapNodes[0].name = wizardData.origin;
    }

    appState.currentTripData = destClone;
    appState.activeTrip = destClone;
    appState.currentDuration = duration;

    // Reset Save Trip button state
    const saveBtn = document.getElementById('btn-save-trip-action');
    const saveContainer = document.getElementById('save-trip-btn-container');
    const followUpSec = document.getElementById('follow-up-section');
    
    if (saveBtn) {
      saveBtn.className = 'btn-save-trip';
      saveBtn.innerHTML = '<i class="fas fa-heart"></i> Save Trip to History';
      saveBtn.style.pointerEvents = 'auto';
    }
    if (saveContainer) saveContainer.style.display = 'block';
    if (followUpSec) followUpSec.classList.remove('visible'); // Hide follow-up chips until saved

    // 1. Update Route headers
    const mapTitle = document.querySelector('.map-title');
    if (mapTitle) {
      const fromPlace = wizardData.origin || 'Delhi';
      mapTitle.textContent = `Route: ${fromPlace} to ${destClone.name}`;
    }

    // 2. Render dynamic itinerary timeline list
    const itineraryList = document.getElementById('dynamic-itinerary-list');
    itineraryList.innerHTML = ''; // clear

    // Populate daily plan cards
    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      // Fetch day plan or loop/generate template days if selected days exceeds database size
      const dbDay = destClone.itinerary[(dayNum - 1) % destClone.itinerary.length];
      
      const card = document.createElement('div');
      card.className = 'itinerary-day-card';
      card.style.marginBottom = '16px';

      const eventsHTML = dbDay.events.map((e, index) => `
        <div class="itinerary-event-item ${index === 0 ? 'highlighted' : ''}">
          <div class="event-details">
            <span class="event-name">${e.name}</span>
            <span class="event-time-cost">${e.time} • ${e.cost}</span>
          </div>
        </div>
      `).join('');

      card.innerHTML = `
        <h4 class="itinerary-day-title">Day ${dayNum}: ${dbDay.title}</h4>
        <div class="itinerary-events-list">
          ${eventsHTML}
        </div>
      `;
      itineraryList.appendChild(card);
    }

    // 3. Render smart Hotel Recommendations (Total stay cost = cost_per_night * days)
    const hotelContainer = document.getElementById('hotels-section');
    const hotelList = document.getElementById('hotels-recommendations-list');
    hotelList.innerHTML = '';
    
    destClone.hotels.forEach(h => {
      const card = document.createElement('div');
      card.className = 'hotel-card';
      
      const totalCost = h.price * duration;
      const amenitiesHTML = h.amenities.map(a => `<span class="hotel-amenity-tag">${a}</span>`).join('');

      card.innerHTML = `
        <span class="hotel-tier-badge">${h.tier}</span>
        <span class="hotel-name">${h.name}</span>
        <div class="hotel-amenities">
          ${amenitiesHTML}
        </div>
        <div class="hotel-footer-row">
          <div class="hotel-cost-box">
            <span class="hotel-cost-night">₹${h.price.toLocaleString()}</span>
            <span class="hotel-cost-total">Total: ₹${totalCost.toLocaleString()} (${duration}d)</span>
          </div>
          <span class="hotel-rating"><i class="fas fa-star"></i> ${h.rating}</span>
        </div>
      `;
      hotelList.appendChild(card);
    });
    hotelContainer.style.display = 'block';

    // 4. Render Foods recommendations
    const foodContainer = document.getElementById('foods-section');
    const foodList = document.getElementById('foods-recommendations-list');
    foodList.innerHTML = '';

    destClone.foods.forEach(f => {
      const card = document.createElement('div');
      card.className = 'food-card';
      card.innerHTML = `
        <span class="food-emoji">${f.emoji}</span>
        <div class="food-details">
          <span class="food-name">${f.name}</span>
          <span class="food-type-lbl">${f.type}</span>
        </div>
      `;
      foodList.appendChild(card);
    });
    foodContainer.style.display = 'block';

    // 5. Render Shopping recommendations collapsible
    const shopContainer = document.getElementById('shopping-section');
    const shopList = document.getElementById('shopping-recommendations-list');
    shopList.innerHTML = '';

    destClone.shopping.forEach(s => {
      const row = document.createElement('div');
      row.className = 'shopping-item';
      row.innerHTML = `
        <span class="shopping-item-name">${s.name}</span>
        <span class="shopping-item-detail">${s.detail}</span>
      `;
      shopList.appendChild(row);
    });
    shopContainer.style.display = 'block';

    // 6. Draw dynamic Canvas Route nodes!
    redrawCanvasMap(destClone.mapNodes);
  }

  // Draw customized map path coordinates on HTML5 Canvas
  function redrawCanvasMap(nodes) {
    const canvas = document.getElementById('route-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    let activeNode = null;
    let dashedOffset = 0;

    canvas.onclick = (e) => {
      const clickX = e.offsetX;
      const clickY = e.offsetY;
      let clickedNode = null;

      nodes.forEach(n => {
        // Adjust coordinate mapping scaling ratios from database
        const mapX = (n.x / 400) * w;
        const mapY = (n.y / 250) * h;
        const dist = Math.hypot(mapX - clickX, mapY - clickY);
        if (dist < 18) clickedNode = n;
      });

      if (clickedNode) {
        activeNode = clickedNode;
        playSound('click');
        const popup = document.getElementById('map-node-popup');
        document.getElementById('popup-node-title').textContent = `${clickedNode.name} (${clickedNode.type})`;
        document.getElementById('popup-node-desc').textContent = clickedNode.id === 1 ? 'Trip starting junction' : 'AI Verified point of interest';
        document.getElementById('popup-node-cost').textContent = clickedNode.cost;
        popup.classList.add('active');
      } else {
        activeNode = null;
        document.getElementById('map-node-popup').classList.remove('active');
      }
    };

    function drawMapLoop() {
      if (appState.currentTripData !== undefined && appState.currentTripData.mapNodes !== nodes) {
        return; // Break recursion if another destination was selected
      }

      ctx.clearRect(0, 0, w, h);

      // Grid mesh backdrop
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      const spacing = 16;
      for (let x = 0; x < w; x += spacing) {
        for (let y = 0; y < h; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw background route lines
      ctx.beginPath();
      ctx.moveTo((nodes[0].x / 400) * w, (nodes[0].y / 250) * h);
      for (let i = 1; i < nodes.length; i++) {
        ctx.lineTo((nodes[i].x / 400) * w, (nodes[i].y / 250) * h);
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.stroke();

      // Draw animated dashed overlay lines
      ctx.beginPath();
      ctx.moveTo((nodes[0].x / 400) * w, (nodes[0].y / 250) * h);
      for (let i = 1; i < nodes.length; i++) {
        ctx.lineTo((nodes[i].x / 400) * w, (nodes[i].y / 250) * h);
      }
      ctx.strokeStyle = 'var(--accent-color)';
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -dashedOffset;
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      dashedOffset = (dashedOffset + 0.35) % 16;

      // Draw node spots
      nodes.forEach(n => {
        const nX = (n.x / 400) * w;
        const nY = (n.y / 250) * h;

        ctx.beginPath();
        ctx.arc(nX, nY, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'var(--accent-color)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nX, nY, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(247, 37, 133, 0.15)';
        ctx.fill();

        if (activeNode && activeNode.id === n.id) {
          ctx.beginPath();
          ctx.arc(nX, nY, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(n.name, nX - 18, nY - 12);
      });

      requestAnimationFrame(drawMapLoop);
    }
    drawMapLoop();
  }

  // Draw fallback map for Haridwar default route
  function initFallbackRouteMap() {
    const defaultNodes = [
      { id: 1, name: 'Delhi', x: 70, y: 190, cost: 'Origin', type: 'City' },
      { id: 2, name: 'Haridwar', x: 190, y: 150, cost: '₹220', type: 'Stop' },
      { id: 3, name: 'Rishikesh', x: 290, y: 100, cost: '₹2,500', type: 'Hotel' }
    ];
    redrawCanvasMap(defaultNodes);
  }

  // Collapsible shopping drawer triggers
  const shopHeader = document.getElementById('shopping-drawer-toggle');
  const shopBox = document.getElementById('shopping-section');
  if (shopHeader && shopBox) {
    shopHeader.addEventListener('click', () => {
      shopBox.classList.toggle('drawer-open');
      playSound('click');
    });
  }

  // ==========================================================================
  // SAVE TRIP TO HISTORY TRIGGER
  // ==========================================================================
  const saveTripActionBtn = document.getElementById('btn-save-trip-action');
  const followUpSection = document.getElementById('follow-up-section');

  if (saveTripActionBtn) {
    saveTripActionBtn.addEventListener('click', () => {
      const dest = appState.currentTripData;
      if (!dest) return;

      playSound('success');
      triggerConfetti();
      addXP(150); // Generous reward for saving trips!

      // Lock button state visually
      saveTripActionBtn.className = 'btn-save-trip trip-saved-state';
      saveTripActionBtn.innerHTML = '<i class="fas fa-check"></i> Trip Saved to Logs';
      saveTripActionBtn.style.pointerEvents = 'none';

      // Expose follow-up local chips
      if (followUpSection) {
        followUpSection.classList.add('visible');
      }

      // Add to timeline history array
      const today = new Date();
      const dateString = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const newHistoryNode = {
        dest: dest.name,
        date: dateString,
        cost: dest.cost
      };
      
      appState.history.push(newHistoryNode);
      renderHistoryTimeline();
    });
  }

  function renderHistoryTimeline() {
    const timeline = document.querySelector('.history-timeline');
    if (!timeline) return;

    // Clear and rebuild historical nodes
    timeline.innerHTML = '';
    
    appState.history.forEach((h, index) => {
      // Lowercase matching for images
      const imgName = h.dest.toLowerCase();
      const node = document.createElement('div');
      node.className = 'history-node';
      node.innerHTML = `
        <span class="history-node-icon"></span>
        <div class="history-card">
          <div class="history-card-header">
            <span class="history-dest">Adventure in ${h.dest}</span>
            <span class="history-date">${h.date}</span>
          </div>
          <div class="history-body">
            <img class="history-pic" src="assets/images/${imgName}.jpg" onerror="this.src='assets/images/santorini.jpg'" alt="${h.dest}">
            <div class="history-info">
              <span class="history-budget-spent">Spent: <span>₹${h.cost.toLocaleString()}</span></span>
              <span class="history-favorite"><i class="fas fa-heart" style="color: #ff3366;"></i> Curated Local Itinerary</span>
            </div>
          </div>
          <div class="history-footer">
            <button class="btn-glass btn-history-action" onclick="alert('Reloading Itinerary!')">View Again</button>
            <button class="btn-glass btn-history-action" style="border-color: var(--accent-color);" onclick="alert('Copying this settings config!')">Recreate</button>
          </div>
        </div>
      `;
      timeline.appendChild(node);
    });
  }

  // Pre-draw history logs on loading
  renderHistoryTimeline();

  // ==========================================================================
  // INTERACTIVE CHIPS & DETAILED INFORMATION SHEET MODAL
  // ==========================================================================
  const followUpChips = document.querySelectorAll('.follow-up-chip');
  const infoSheetModal = document.getElementById('info-sheet-modal');
  const btnInfoModalClose = document.getElementById('btn-info-modal-close');
  const infoModalTitle = document.getElementById('info-modal-title');
  const infoModalContent = document.getElementById('info-modal-content');

  // Close info sheet
  const closeInfoModal = () => {
    infoSheetModal.classList.remove('open');
  };
  if (btnInfoModalClose) btnInfoModalClose.addEventListener('click', closeInfoModal);
  infoSheetModal.addEventListener('click', (e) => {
    if (e.target === infoSheetModal) closeInfoModal();
  });

  // Chip click handlers
  followUpChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const dest = appState.currentTripData;
      if (!dest) return;

      const chipKey = chip.getAttribute('data-info');
      const detailsText = dest.followUps[chipKey] || 'No specific tips available for this category yet.';
      const titleLabel = chip.textContent;

      playSound('click');
      
      // Load details into sheet modal
      infoModalTitle.innerHTML = titleLabel;
      infoModalContent.innerHTML = `
        <div class="info-sheet-point">
          <div class="info-point-title">Fox Mascot Pip's Advice:</div>
          <div style="margin-top: 6px;">${detailsText}</div>
        </div>
        <div class="info-sheet-point" style="margin-top: 10px;">
          <div class="info-point-title">🧳 Pack Recommendation</div>
          <div style="font-size: 11px; margin-top: 4px; color: var(--text-secondary);">
            Make sure to carry power banks, wear sturdy trekking sneakers, and download off-line maps.
          </div>
        </div>
      `;

      infoSheetModal.classList.add('open');
    });
  });

  // ==========================================================================
  // CARD HEARTS & STAT TRACKING (ON HOME CARD SAMPLES)
  // ==========================================================================
  const saveButtons = document.querySelectorAll('.card-save-btn, .mini-card-save-btn');
  saveButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const destId = btn.getAttribute('data-id');
      const isSaved = btn.classList.toggle('saved');
      
      if (isSaved) {
        appState.savedDestinations.add(destId);
        playSound('success');
        addXP(50);
      } else {
        appState.savedDestinations.delete(destId);
        playSound('click');
      }
      updateStats();
    });
  });

  function addXP(amount) {
    appState.xp += amount;
    const xpProgress = document.getElementById('xp-progress');
    const xpText = document.getElementById('xp-text');
    
    if (appState.xp >= 500) {
      appState.level += 1;
      appState.xp = appState.xp - 500;
      alert(`🎉 Level Up! You are now a Level ${appState.level} Traveler!`);
      const badge = document.querySelector('.profile-level-badge');
      if (badge) badge.textContent = appState.level;
      const subtitle = document.querySelector('.profile-title');
      if (subtitle) {
        const titles = ['Weekend Voyager', 'Adventure Explorer', 'Mountain Master', 'Global Nomad'];
        subtitle.textContent = `Level ${appState.level}: ${titles[appState.level-1] || 'Global Explorer'}`;
      }
    }
    
    if (xpProgress && xpText) {
      const percentage = (appState.xp / 500) * 100;
      xpProgress.style.width = `${percentage}%`;
      xpText.textContent = `${appState.xp}/500`;
    }
  }

  function updateStats() {
    const countField = document.querySelector('.profile-stat-box:nth-child(1) .profile-stat-val');
    if (countField) {
      countField.textContent = appState.savedDestinations.size + 3;
    }
  }

  // ==========================================================================
  // TINDER CARD SWIPING MECHANISM (MATCH SCREEN)
  // ==========================================================================
  const swipeDeck = document.getElementById('swipe-deck-container');
  const toastNotification = document.getElementById('learning-toast');
  let currentCardElement = null;

  function initTinderSwiping() {
    if (!swipeDeck) return;
    const cards = swipeDeck.querySelectorAll('.swipe-card');
    if (cards.length === 0) return;
    
    currentCardElement = cards[0];
    setupDragHandlers(currentCardElement);
  }

  function setupDragHandlers(card) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;

    card.style.transform = '';
    card.style.transition = '';

    const likeStamp = card.querySelector('.swipe-overlay-stamp.like');
    const skipStamp = card.querySelector('.swipe-overlay-stamp.skip');

    const handleDragStart = (x, y) => {
      startX = x;
      startY = y;
      currentX = 0;
      currentY = 0;
      isDragging = true;
      card.classList.add('dragging');
    };

    const handleDragMove = (x, y) => {
      if (!isDragging) return;
      currentX = x - startX;
      currentY = y - startY;

      const rotate = currentX / 12;
      card.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotate}deg)`;

      if (currentX > 30) {
        if (likeStamp) likeStamp.style.opacity = Math.min(currentX / 80, 0.95);
        if (skipStamp) skipStamp.style.opacity = 0;
      } else if (currentX < -30) {
        if (skipStamp) skipStamp.style.opacity = Math.min(Math.abs(currentX) / 80, 0.95);
        if (likeStamp) likeStamp.style.opacity = 0;
      } else {
        if (likeStamp) likeStamp.style.opacity = 0;
        if (skipStamp) skipStamp.style.opacity = 0;
      }
    };

    const handleDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove('dragging');
      card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2)';

      const swipeThreshold = 120;
      if (currentX > swipeThreshold) {
        swipeOutCard('right');
      } else if (currentX < -swipeThreshold) {
        swipeOutCard('left');
      } else {
        card.style.transform = 'translate3d(0, 0, 0) rotate(0)';
        if (likeStamp) likeStamp.style.opacity = 0;
        if (skipStamp) skipStamp.style.opacity = 0;
      }
    };

    card.addEventListener('mousedown', (e) => {
      handleDragStart(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) handleDragMove(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
      handleDragEnd();
    });

    card.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    });

    card.addEventListener('touchmove', (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    });

    card.addEventListener('touchend', () => {
      handleDragEnd();
    });

    function swipeOutCard(direction) {
      playSound('swipe');
      const flyX = direction === 'right' ? window.innerWidth + 200 : -window.innerWidth - 200;
      card.style.transform = `translate3d(${flyX}px, ${currentY}px, 0) rotate(${flyX / 12}deg)`;
      card.style.opacity = 0;

      if (direction === 'right') {
        const dest = card.getAttribute('data-dest');
        appState.savedDestinations.add(dest.toLowerCase());
        addXP(100);
        showMascotToast(`Added ${dest} to your travel list!`);
        triggerConfetti();
        playSound('success');
      }

      setTimeout(() => {
        card.remove();
        initTinderSwiping();
      }, 350);
    }
  }

  // Bind Tinder Swipe Action button clicks
  const swipeSaveBtn = document.getElementById('btn-swipe-save');
  const swipeSkipBtn = document.getElementById('btn-swipe-skip');
  const swipeInfoBtn = document.getElementById('btn-swipe-info');

  if (swipeSaveBtn) {
    swipeSaveBtn.addEventListener('click', () => {
      if (currentCardElement) {
        const likeStamp = currentCardElement.querySelector('.swipe-overlay-stamp.like');
        if (likeStamp) likeStamp.style.opacity = 0.9;
        
        playSound('swipe');
        const dest = currentCardElement.getAttribute('data-dest');
        currentCardElement.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        currentCardElement.style.transform = `translate3d(${window.innerWidth + 100}px, -40px, 0) rotate(15deg)`;
        currentCardElement.style.opacity = 0;

        appState.savedDestinations.add(dest.toLowerCase());
        addXP(100);
        showMascotToast(`Added ${dest} to your travel list!`);
        triggerConfetti();
        playSound('success');

        setTimeout(() => {
          currentCardElement.remove();
          initTinderSwiping();
        }, 350);
      }
    });
  }

  if (swipeSkipBtn) {
    swipeSkipBtn.addEventListener('click', () => {
      if (currentCardElement) {
        const skipStamp = currentCardElement.querySelector('.swipe-overlay-stamp.skip');
        if (skipStamp) skipStamp.style.opacity = 0.9;

        playSound('swipe');
        currentCardElement.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        currentCardElement.style.transform = `translate3d(${-window.innerWidth - 100}px, -40px, 0) rotate(-15deg)`;
        currentCardElement.style.opacity = 0;

        setTimeout(() => {
          currentCardElement.remove();
          initTinderSwiping();
        }, 350);
      }
    });
  }

  if (swipeInfoBtn) {
    swipeInfoBtn.addEventListener('click', () => {
      if (currentCardElement) {
        const dest = currentCardElement.getAttribute('data-dest');
        alert(`✈️ ${dest} Details:\nHighly recommended getaway. Focuses on local food, photography, and nature vistas. Budget matches standard local trip profile.`);
      }
    });
  }

  function showMascotToast(message) {
    if (!toastNotification) return;
    toastNotification.textContent = `🦊 Mascot Pip: "${message}"`;
    toastNotification.classList.add('visible');
    setTimeout(() => {
      toastNotification.classList.remove('visible');
    }, 3000);
  }

  initTinderSwiping();

  // ==========================================================================
  // THEME SELECTION MODAL SYSTEM (REDESIGNED BOTTOM SHEET)
  // ==========================================================================
  const themeSelectBtn = document.getElementById('theme-select-btn');
  const themeBackdrop = document.getElementById('theme-backdrop');
  const themeModalClose = document.getElementById('theme-modal-close');
  const themeOptions = document.querySelectorAll('.theme-option-row');
  
  const headerThemeIcon = document.getElementById('header-theme-icon');
  const headerThemeName = document.getElementById('header-theme-name');

  if (themeSelectBtn) {
    themeSelectBtn.addEventListener('click', () => {
      playSound('click');
      themeBackdrop.classList.add('open');
    });
  }

  const closeThemeModal = () => {
    if (themeBackdrop) themeBackdrop.classList.remove('open');
  };
  if (themeModalClose) themeModalClose.addEventListener('click', closeThemeModal);
  
  if (themeBackdrop) {
    themeBackdrop.addEventListener('click', (e) => {
      if (e.target === themeBackdrop) {
        closeThemeModal();
      }
    });
  }

  themeOptions.forEach(row => {
    row.addEventListener('click', () => {
      const newTheme = row.getAttribute('data-theme');
      const themeName = row.getAttribute('data-name');
      const themeIcon = row.getAttribute('data-icon');

      document.body.className = '';
      document.body.classList.add(newTheme);

      appState.theme = newTheme;
      localStorage.setItem('travana-theme', newTheme);

      themeOptions.forEach(r => r.classList.remove('selected-option'));
      row.classList.add('selected-option');

      if (headerThemeIcon) headerThemeIcon.textContent = themeIcon;
      if (headerThemeName) headerThemeName.textContent = themeName;

      playSound('success');
      setTimeout(closeThemeModal, 250);
    });
  });

  const savedTheme = localStorage.getItem('travana-theme');
  if (savedTheme) {
    const matchingRow = document.querySelector(`.theme-option-row[data-theme="${savedTheme}"]`);
    if (matchingRow) {
      matchingRow.click();
      closeThemeModal();
    }
  }

  // Sound control button
  const soundBtn = document.getElementById('sound-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      appState.soundEnabled = !appState.soundEnabled;
      const icon = soundBtn.querySelector('i');
      if (appState.soundEnabled) {
        icon.className = 'fas fa-volume-up';
        playSound('click');
      } else {
        icon.className = 'fas fa-volume-mute';
      }
    });
  }

  // ==========================================================================
  // CONFETTI CELEBRATION CHIPS (VISUAL DELIGHT)
  // ==========================================================================
  const confettiCanvas = document.getElementById('canvas-confetti');
  let confettiCtx = null;
  let confettis = [];
  let confettiAnimationId = null;

  function triggerConfetti() {
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext('2d');
    
    confettiCanvas.width = confettiCanvas.parentElement.clientWidth;
    confettiCanvas.height = confettiCanvas.parentElement.clientHeight;

    confettis = [];
    const colors = ['#f72585', '#7209b7', '#3b82f6', '#4ade80', '#f59e0b'];
    for (let i = 0; i < 80; i++) {
      confettis.push({
        x: Math.random() * confettiCanvas.width,
        y: -10 - Math.random() * 20,
        r: Math.random() * 6 + 4,
        d: Math.random() * confettiCanvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    animateConfetti();
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let remaining = 0;

    confettis.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += p.speed;
      p.x += Math.sin(p.tiltAngle) * 0.5;

      if (p.y <= confettiCanvas.height) {
        remaining++;
      }

      confettiCtx.beginPath();
      confettiCtx.lineWidth = p.r;
      confettiCtx.strokeStyle = p.color;
      confettiCtx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      confettiCtx.stroke();
    });

    if (remaining > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    }
  }

  // ==========================================================================
  // CLICK LISTENERS FOR GETAWAY AND POPULAR CARDS
  // ==========================================================================
  document.querySelectorAll('.getaway-card, .popular-card, .destination-card').forEach(card => {
    card.addEventListener('click', () => {
      const destName = card.getAttribute('data-dest');
      if (!destName) return;
      playSound('success');
      showPackingLoader(() => {
        let destData = TRAVEL_DATABASE[destName.toLowerCase()];
        if (!destData) {
          // If not in database, dynamically generate a custom plan matching standard parameters
          destData = {
            name: destName,
            region: "India",
            cost: 15000,
            rating: 4.7,
            vibe: "adventure",
            tags: ["nature", "photos", "adventure"],
            mapNodes: [
              { id: 1, name: wizardData.origin || 'Delhi', x: 70, y: 190, cost: 'Origin', type: 'Station' },
              { id: 2, name: `${destName} Valley`, x: 180, y: 140, cost: '₹200', type: 'Transit' },
              { id: 3, name: `${destName} Resort`, x: 280, y: 100, cost: '₹3,000', type: 'Hotel' },
              { id: 4, name: `${destName} Viewpoint`, x: 380, y: 60, cost: '₹150', type: 'Attraction' }
            ],
            itinerary: [
              { day: 1, title: `Arrive in ${destName} & Explore Local Market`, events: [{ name: `Travel to ${destName}`, time: "07:00 AM", cost: "₹500 ticket" }, { name: "Check-in at Nature Lodge", time: "01:30 PM", cost: "₹3,000/night" }, { name: "Explore local marketplace and sunset walk", time: "05:00 PM", cost: "Free walk" }] },
              { day: 2, title: "Nature Trekking & Local Sightseeing", events: [{ name: "Scenic mountain trek to viewpoint", time: "09:00 AM", cost: "₹100 Entry" }, { name: "Local lunch experience at traditional kitchen", time: "01:00 PM", cost: "₹300/person" }, { name: "Photography shoot around beautiful viewpoints", time: "04:30 PM", cost: "Free" }] },
              { day: 3, title: "Adventure Activities & Departure", events: [{ name: "Zip-lining or rafting activities", time: "09:00 AM", cost: "₹1,200 ticket" }, { name: "Local souvenirs shopping", time: "01:00 PM", cost: "₹500" }, { name: "Return departure travel", time: "04:00 PM", cost: "₹500" }] }
            ],
            hotels: [
              { tier: "Budget Stay", name: `${destName} Backpackers`, price: 900, rating: 4.4, distance: "1.2 km from Center", amenities: ["Wifi", "Lounge", "Shared Kitchen"] },
              { tier: "Best Value", name: `${destName} Resort & Spa`, price: 3000, rating: 4.6, distance: "0.5 km from Center", amenities: ["Free Breakfast", "Pool", "Mountain View"] },
              { tier: "Premium Stay", name: `Grand ${destName} Palace`, price: 12000, rating: 4.9, distance: "2.1 km from Center", amenities: ["Luxury Spa", "Fine Dining", "Gym"] }
            ],
            foods: [
              { emoji: "🍲", name: "Local Special Curry", type: "Must-Try Dish" },
              { emoji: "🥤", name: "Traditional Lassi", type: "Refreshing Beverage" },
              { emoji: "🥟", name: "Spicy Fried Dumplings", type: "Popular Snack" }
            ],
            shopping: [
              { name: "Handmade local crafts", detail: "₹150 - ₹1,200 | Central Market" },
              { name: "Organic tea & honey packages", detail: "₹100 - ₹500 | Local Shops" }
            ],
            followUps: {
              gems: `🌲 Hidden Trails of ${destName} - A quiet hiking path through forests leading to a secluded stream.`,
              food: `🍲 Local traditional kitchen - Best authentic home-style thali in the town.`,
              shopping: `🛍️ Central Market - Best souvenirs and handmade accessories.`,
              photos: `📸 Sunrise viewpoint - Stunning landscape views.`,
              sunrise: `🌄 Mountain Peak Sunrise - Watch the sun rising above the ranges.`,
              sunset: `🌅 Sunset Valley point - Perfect spot to enjoy twilight colors.`,
              weather: `☔ Summer: 18°C - 28°C. Winter: 5°C - 15°C. Carry warm clothes for evenings.`,
              transport: `🚖 Local rickshaws are easily available. Renting a bike costs ₹400/day.`,
              saving: `💰 Eat at local community-run diners instead of tourist cafes.`,
              adventure: `🥾 Forest Ridge trek - Beautiful and safe pathway.`
            }
          };
        }
        loadTripPlan(destData, 3);
        navigateToTab('trips-page');
      });
    });
  });

  // ==========================================================================
  // PROFILE DETAILS SAVE/LOAD SYSTEM
  // ==========================================================================
  const profileNameInput = document.getElementById('profile-name-input');
  const profilePhoneInput = document.getElementById('profile-phone-input');
  const profileEmailInput = document.getElementById('profile-email-input');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const profileNameDisplay = document.querySelector('.profile-name');

  // Load profile values on startup
  if (localStorage.getItem('travana-profile-name')) {
    const savedName = localStorage.getItem('travana-profile-name');
    if (profileNameDisplay) profileNameDisplay.textContent = savedName;
    if (profileNameInput) profileNameInput.value = savedName;
  }
  if (localStorage.getItem('travana-profile-phone') && profilePhoneInput) {
    profilePhoneInput.value = localStorage.getItem('travana-profile-phone');
  }
  if (localStorage.getItem('travana-profile-email') && profileEmailInput) {
    profileEmailInput.value = localStorage.getItem('travana-profile-email');
  }

  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', () => {
      const nameVal = profileNameInput ? profileNameInput.value.trim() : '';
      const phoneVal = profilePhoneInput ? profilePhoneInput.value.trim() : '';
      const emailVal = profileEmailInput ? profileEmailInput.value.trim() : '';

      if (profileNameDisplay && nameVal) profileNameDisplay.textContent = nameVal;
      
      localStorage.setItem('travana-profile-name', nameVal);
      localStorage.setItem('travana-profile-phone', phoneVal);
      localStorage.setItem('travana-profile-email', emailVal);

      playSound('success');
      triggerConfetti();
      showMascotToast('Profile details saved successfully!');
    });
  }

  // ==========================================================================
  // ONBOARDING SYSTEM (BLOCKED FORM & SCENIC EMERGING SPLASH OVERLAY)
  // ==========================================================================
  const onboardingOverlay = document.getElementById('onboarding-overlay');
  const onboardingForm = document.getElementById('onboarding-form-sheet');
  const onboardingSplash = document.getElementById('onboarding-welcome-splash');
  const btnSubmitOnboarding = document.getElementById('btn-submit-onboarding');
  const onboardNameInput = document.getElementById('onboard-name-input');
  const onboardPhoneInput = document.getElementById('onboard-phone-input');
  const onboardEmailInput = document.getElementById('onboard-email-input');
  const onboardWelcomeText = document.getElementById('onboard-welcome-text');

  // For testing: Clear profile once to guarantee user sees the new onboarding overlay flow on reload
  if (!localStorage.getItem('travana-onboarding-test-v4')) {
    localStorage.removeItem('travana-profile-name');
    localStorage.removeItem('travana-profile-phone');
    localStorage.removeItem('travana-profile-email');
    localStorage.setItem('travana-onboarding-test-v4', 'true');
  }

  // Check if profile is saved; if not, force display the modal
  const hasProfileName = localStorage.getItem('travana-profile-name');
  if (!hasProfileName) {
    if (onboardingOverlay) {
      onboardingOverlay.style.display = 'flex';
    }
  }

  if (btnSubmitOnboarding) {
    btnSubmitOnboarding.addEventListener('click', () => {
      const nameVal = onboardNameInput ? onboardNameInput.value.trim() : '';
      const phoneVal = onboardPhoneInput ? onboardPhoneInput.value.trim() : '';
      const emailVal = onboardEmailInput ? onboardEmailInput.value.trim() : '';

      if (!nameVal) {
        alert('Please enter your full name to start your adventure planning!');
        return;
      }

      // Save onboarding info to localStorage
      localStorage.setItem('travana-profile-name', nameVal);
      localStorage.setItem('travana-profile-phone', phoneVal);
      localStorage.setItem('travana-profile-email', emailVal);

      // Sync data to companion details section inputs & displays
      if (profileNameDisplay) profileNameDisplay.textContent = nameVal;
      if (profileNameInput) profileNameInput.value = nameVal;
      if (profilePhoneInput) profilePhoneInput.value = phoneVal;
      if (profileEmailInput) profileEmailInput.value = emailVal;

      // Transition onboarding: hide form, show emerging blurry welcome splash
      if (onboardWelcomeText) onboardWelcomeText.textContent = `Welcome, ${nameVal}!`;
      playSound('success');

      if (onboardingForm) onboardingForm.style.display = 'none';
      if (onboardingSplash) {
        onboardingSplash.style.display = 'flex';
        // Force reflow
        onboardingSplash.offsetHeight;
        setTimeout(() => {
          onboardingSplash.style.opacity = '1';
          onboardingSplash.style.transform = 'scale(1.1)';
        }, 50);
      }

      // Smooth fade-out of full screen overlay to reveal app UI
      setTimeout(() => {
        if (onboardingOverlay) {
          onboardingOverlay.style.transition = 'opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
          onboardingOverlay.style.opacity = '0';
          setTimeout(() => {
            onboardingOverlay.style.display = 'none';
            triggerConfetti();
          }, 800);
        }
      }, 2500);
    });
  }

});
