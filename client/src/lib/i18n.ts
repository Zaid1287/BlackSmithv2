export type Language = 'en' | 'hi' | 'te';

export interface TranslationKey {
  en: string;
  hi: string;
  te: string;
}

export const translations = {
  // Navigation
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड', te: 'డాష్‌బోర్డ్' },
  financialManagement: { en: 'Financial Management', hi: 'वित्तीय प्रबंधन', te: 'ఆర్థిక నిర్వహణ' },
  journeyHistory: { en: 'Journey History', hi: 'यात्रा इतिहास', te: 'యాత్ర చరిత్ర' },
  activeJourney: { en: 'Active Journey', hi: 'सक्रिय यात्रा', te: 'క్రియాశీల యాత్ర' },
  manageVehicles: { en: 'Manage Vehicles', hi: 'वाहन प्रबंधन', te: 'వాహనాల నిర్వహణ' },
  manageUsers: { en: 'Manage Users', hi: 'उपयोगकर्ता प्रबंधन', te: 'వినియోగదారుల నిర్వహణ' },
  salaries: { en: 'Salaries', hi: 'वेतन', te: 'జీతాలు' },
  emi: { en: 'EMI', hi: 'ईएमआई', te: 'ఈఎంఐ' },
  adminDashboard: { en: 'Admin Dashboard', hi: 'एडमिन डैशबोर्ड', te: 'అడ్మిన్ డాష్‌బోర్డ్' },

  // Common UI elements
  add: { en: 'Add', hi: 'जोड़ें', te: 'జోడించు' },
  edit: { en: 'Edit', hi: 'संपादित करें', te: 'సవరించు' },
  delete: { en: 'Delete', hi: 'हटाएं', te: 'తొలగించు' },
  save: { en: 'Save', hi: 'सहेजें', te: 'సేవ్ చేయి' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', te: 'రద్దు చేయి' },
  submit: { en: 'Submit', hi: 'जमा करें', te: 'సమర్పించు' },
  close: { en: 'Close', hi: 'बंद करें', te: 'మూసివేయి' },
  search: { en: 'Search', hi: 'खोजें', te: 'వెతకండి' },
  filter: { en: 'Filter', hi: 'फ़िल्टर', te: 'ఫిల్టర్' },
  reset: { en: 'Reset', hi: 'रीसेट', te: 'రీసెట్' },
  loading: { en: 'Loading...', hi: 'लोड हो रहा है...', te: 'లోడవుతోంది...' },

  // Dashboard
  totalVehicles: { en: 'Total Vehicles', hi: 'कुल वाहन', te: 'మొత్తం వాహనాలు' },
  availableVehicles: { en: 'Available Vehicles', hi: 'उपलब्ध वाहन', te: 'అందుబాటులో ఉన్న వాహనాలు' },
  activeJourneys: { en: 'Active Journeys', hi: 'सक्रिय यात्राएं', te: 'క్రియాశీల యాత్రలు' },
  totalRevenue: { en: 'Total Revenue', hi: 'कुल राजस्व', te: 'మొత్తం ఆదాయం' },
  totalExpenses: { en: 'Total Expenses', hi: 'कुल खर्च', te: 'మొత్తం ఖర్చులు' },
  netProfit: { en: 'Net Profit', hi: 'शुद्ध लाभ', te: 'నికర లాభం' },
  
  // Journey related
  startJourney: { en: 'Start Journey', hi: 'यात्रा शुरू करें', te: 'యాత్ర ప్రారంభించండి' },
  endJourney: { en: 'End Journey', hi: 'यात्रा समाप्त करें', te: 'యాత్ర ముగించండి' },
  journeyDetails: { en: 'Journey Details', hi: 'यात्रा विवरण', te: 'యాత్ర వివరాలు' },
  driver: { en: 'Driver', hi: 'चालक', te: 'డ్రైవర్' },
  vehicle: { en: 'Vehicle', hi: 'वाहन', te: 'వాహనం' },
  from: { en: 'From', hi: 'से', te: 'నుండి' },
  to: { en: 'To', hi: 'तक', te: 'వరకు' },
  distance: { en: 'Distance', hi: 'दूरी', te: 'దూరం' },
  speed: { en: 'Speed', hi: 'गति', te: 'వేగం' },
  revenue: { en: 'Revenue', hi: 'राजस्व', te: 'ఆదాయం' },
  security: { en: 'Security', hi: 'सुरक्षा', te: 'భద్రత' },
  status: { en: 'Status', hi: 'स्थिति', te: 'స్థితి' },

  // Expense related
  addExpense: { en: 'Add Expense', hi: 'खर्च जोड़ें', te: 'ఖర్చు జోడించండి' },
  category: { en: 'Category', hi: 'श्रेणी', te: 'వర్గం' },
  amount: { en: 'Amount', hi: 'राशि', te: 'మొత్తం' },
  description: { en: 'Description', hi: 'विवरण', te: 'వర్ణన' },
  fuel: { en: 'Fuel', hi: 'ईंधन', te: 'ఇంధనం' },
  toll: { en: 'Toll', hi: 'टोल', te: 'టోల్' },
  food: { en: 'Food', hi: 'भोजन', te: 'ఆహారం' },
  maintenance: { en: 'Maintenance', hi: 'रखरखाव', te: 'నిర్వహణ' },
  other: { en: 'Other', hi: 'अन्य', te: 'ఇతర' },

  // User management
  addUser: { en: 'Add User', hi: 'उपयोगकर्ता जोड़ें', te: 'వినియోగదారుని జోడించండి' },
  username: { en: 'Username', hi: 'उपयोगकर्ता नाम', te: 'వినియోగదారు పేరు' },
  name: { en: 'Name', hi: 'नाम', te: 'పేరు' },
  role: { en: 'Role', hi: 'भूमिका', te: 'పాత్ర' },
  password: { en: 'Password', hi: 'पासवर्ड', te: 'పాస్‌వర్డ్' },
  admin: { en: 'Admin', hi: 'एडमिन', te: 'అడ్మిన్' },
  salary: { en: 'Salary', hi: 'वेतन', te: 'జీతం' },

  // Vehicle management
  addVehicle: { en: 'Add Vehicle', hi: 'वाहन जोड़ें', te: 'వాహనం జోడించండి' },
  licensePlate: { en: 'License Plate', hi: 'लाइसेंस प्लेट', te: 'లైసెన్స్ ప్లేట్' },
  model: { en: 'Model', hi: 'मॉडल', te: 'మోడల్' },
  available: { en: 'Available', hi: 'उपलब्ध', te: 'అందుబాటులో' },
  inTransit: { en: 'In Transit', hi: 'ट्रांजिट में', te: 'రవాణాలో' },

  // Financial
  paymentDate: { en: 'Payment Date', hi: 'भुगतान दिनांक', te: 'చెల్లింపు తేదీ' },
  paySalary: { en: 'Pay Salary', hi: 'वेतन भुगतान', te: 'జీతం చెల్లించండి' },
  resetSalaryData: { en: 'Reset Salary Data', hi: 'वेतन डेटा रीसेट करें', te: 'జీతం డేటా రీసెట్ చేయండి' },
  resetEmiData: { en: 'Reset EMI Data', hi: 'ईएमआई डेटा रीसेट करें', te: 'ఈఎంఐ డేటా రీసెట్ చేయండి' },
  resetFinancialData: { en: 'Reset Financial Data', hi: 'वित्तीय डेटा रीसेट करें', te: 'ఆర్థిక డేటా రీసెట్ చేయండి' },
  emiPayment: { en: 'EMI Payment', hi: 'ईएमआई भुगतान', te: 'ఈఎంఐ చెల్లింపు' },
  monthlyEmi: { en: 'Monthly EMI', hi: 'मासिक ईएमआई', te: 'నెలవారీ ఈఎంఐ' },

  // Actions and messages
  startNewJourney: { en: 'Start New Journey', hi: 'नई यात्रा शुरू करें', te: 'కొత్త యాత్ర ప్రారంభించండి' },
  noActiveJourney: { en: 'No active journey', hi: 'कोई सक्रिय यात्रा नहीं', te: 'క్రియాశీల యాత్ర లేదు' },
  noDataAvailable: { en: 'No data available', hi: 'कोई डेटा उपलब्ध नहीं', te: 'డేటా అందుబాటులో లేదు' },
  confirmDelete: { en: 'Are you sure you want to delete this?', hi: 'क्या आप वाकई इसे हटाना चाहते हैं?', te: 'మీరు దీన్ని తొలగించాలని ఖచ్చితంగా అనుకుంటున్నారా?' },

  // Language
  language: { en: 'Language', hi: 'भाषा', te: 'భాష' },
  english: { en: 'English', hi: 'अंग्रेजी', te: 'ఇంగ్లీష్' },
  hindi: { en: 'Hindi', hi: 'हिंदी', te: 'హిందీ' },
  telugu: { en: 'Telugu', hi: 'तेलुगु', te: 'తెలుగు' },

  // Login
  login: { en: 'Login', hi: 'लॉगिन', te: 'లాగిన్' },
  logout: { en: 'Logout', hi: 'लॉगआउट', te: 'లాగౌట్' },
  welcome: { en: 'Welcome', hi: 'स्वागत', te: 'స్వాగతం' },

  // Time and dates
  today: { en: 'Today', hi: 'आज', te: 'ఈరోజు' },
  yesterday: { en: 'Yesterday', hi: 'कल', te: 'నిన్న' },
  thisMonth: { en: 'This Month', hi: 'इस महीने', te: 'ఈ నెల' },
  lastMonth: { en: 'Last Month', hi: 'पिछले महीने', te: 'గత నెల' },

  // Status messages
  success: { en: 'Success', hi: 'सफलता', te: 'విజయం' },
  error: { en: 'Error', hi: 'त्रुटि', te: 'లోపం' },
  warning: { en: 'Warning', hi: 'चेतावनी', te: 'హెచ్చరిక' },
  info: { en: 'Information', hi: 'जानकारी', te: 'సమాచారం' },

  // Additional UI elements for comprehensive translation
  all: { en: 'All', hi: 'सभी', te: 'అన్నీ' },
  view: { en: 'View', hi: 'देखें', te: 'చూడండి' },
  update: { en: 'Update', hi: 'अपडेट', te: 'అప్‌డేట్' },
  details: { en: 'Details', hi: 'विवरण', te: 'వివరాలు' },
  total: { en: 'Total', hi: 'कुल', te: 'మొత్తం' },
  date: { en: 'Date', hi: 'तारीख', te: 'తేదీ' },
  type: { en: 'Type', hi: 'प्रकार', te: 'రకం' },
  actions: { en: 'Actions', hi: 'कार्य', te: 'చర్యలు' },
  complete: { en: 'Complete', hi: 'पूर्ण', te: 'పూర్తి' },
  pending: { en: 'Pending', hi: 'लंबित', te: 'పెండింగ్' },
  paid: { en: 'Paid', hi: 'भुगतान किया गया', te: 'చెల్లించారు' },
  unpaid: { en: 'Unpaid', hi: 'अवैतनिक', te: 'చెల్లించలేదు' },
  
  // Vehicle status
  inService: { en: 'In Service', hi: 'सेवा में', te: 'సేవలో' },
  outOfService: { en: 'Out of Service', hi: 'सेवा से बाहर', te: 'సేవ వెలుపల' },
  
  // Journey status  
  active: { en: 'Active', hi: 'सक्रिय', te: 'క్రియాశీల' },
  completed: { en: 'Completed', hi: 'पूर्ण', te: 'పూర్తయింది' },
  cancelled: { en: 'Cancelled', hi: 'रद्द', te: 'రద్దు చేయబడింది' },
  
  // Form labels
  selectOption: { en: 'Select an option', hi: 'एक विकल्प चुनें', te: 'ఒక ఎంపిక ఎంచుకోండి' },
  required: { en: 'Required', hi: 'आवश्यक', te: 'అవసరం' },
  optional: { en: 'Optional', hi: 'वैकल्पिक', te: 'ఐచ్ఛిక' },
  
  // Complete UI translations
  noActiveJourneyMessage: { en: "You don't have any active journeys at the moment.", hi: 'आपकी कोई सक्रिय यात्रा फिलहाल नहीं है।', te: 'మీకు ప్రస్తుతం కోई క్రియాశీల యాత్రలు లేవు।' },
  failedToCompleteJourney: { en: 'Failed to complete journey', hi: 'यात्रा पूरी करने में असफल', te: 'యాత్ర పూర్తి చేయడంలో విఫలమైంది' },
  confirmCompleteJourney: { en: 'Are you sure you want to complete this journey?', hi: 'क्या आप वाकई इस यात्रा को पूरा करना चाहते हैं?', te: 'మీరు ఈ యాత్రను పూర్తి చేయాలని ఖచ్చితంగా అనుకుంటున్नారా?' },
  loadingActiveJourney: { en: 'Loading active journey...', hi: 'सक्रिय यात्रा लोड हो रही है...', te: 'క్రియాశీల యాత్ర లోడవుతోంది...' },
  completeJourney: { en: 'Complete Journey', hi: 'यात्रा पूरी करें', te: 'యాత్ర పూర్తి చేయండి' },
  currentLocation: { en: 'Current Location', hi: 'वर्तमान स्थान', te: 'ప్రస్తుత స్థానం' },
  currentSpeed: { en: 'Current Speed', hi: 'वर्तमान गति', te: 'ప్రస్తుత వేగం' },
  totalDistance: { en: 'Total Distance', hi: 'कुल दूरी', te: 'మొత్తం దూరం' },
  km: { en: 'km', hi: 'किमी', te: 'కి.మీ' },
  kmh: { en: 'km/h', hi: 'किमी/घंटा', te: 'కి.మీ/గం' },
  quickExpenses: { en: 'Quick Expenses', hi: 'त्वरित खर्च', te: 'త్వరిత ఖర్చులు' },
  addQuickExpense: { en: 'Add Quick Expense', hi: 'त्वरित खर्च जोड़ें', te: 'త్వరిత ఖర్చు జోడించండి' },
  journeyExpenses: { en: 'Journey Expenses', hi: 'यात्रा खर्च', te: 'యాత్ర ఖర్చులు' },
  noExpensesAdded: { en: 'No expenses added yet', hi: 'अभी तक कोई खर्च नहीं जोड़ा गया', te: 'ఇంకా ఎలాంటి ఖర్చులు జోడించలేదు' },
} as const;

export type TranslationKeys = keyof typeof translations;

export const getTranslation = (key: TranslationKeys, language: Language): string => {
  return translations[key][language] || translations[key].en;
};

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];