/**
 * ALL user-visible text in Burmese. Single source of truth (constitution gate).
 * No English allowed in UI components — import from here only.
 */
export const LABELS = {
  appName: 'ဆိုင်ရောင်းခြင်းစနစ်',
  shopName: 'ကြယ်စင်စကြာ',

  // Login
  loginTitle: 'အကောင့်ထဲ ဝင်ရောက်ရန်',
  username: 'အသုံးပြုသူ အမည်',
  password: 'စကားဝှက်',
  signIn: 'ဝင်ရောက်ရန်',
  signOut: 'အကောင့်မှ ထွက်ရန်',
  editShort: 'ပြင်',
  removeShort: 'ဖယ်',
  signingIn: 'ဝင်ရောက်နေပါသည်…',
  welcome: 'ကြိုဆိုပါသည်',

  // Sale screen
  searchPlaceholder: 'ပစ္စည်း ရှာရန် ရိုက်ထည့်ပါ…',
  searchNoResults: 'ရှာသည့် ပစ္စည်းများ မတွေ့ပါ',
  addNewItem: 'ပစ္စည်း အသစ် ထည့်ရန်',
  clearSearch: 'ရှာဖွေမှု ဖျက်ရန်',
  back: 'နောက်သို့',
  products: 'ပစ္စည်းများ',
  loading: 'ခဏ စောင့်ပါ…',
  catalogError: 'ပစ္စည်းနာမည်စာရင်း ယူရန် မအောင်မြင်ပါ။ ထပ်စမ်းပါ။',

  // Cart
  selected: 'ရွေးထားသည်',
  items: 'များ',
  cart: 'ရွေးထားသောပစ္စည်းများ',
  total: 'စုစုပေါင်း',
  viewOrder: 'အစီအစဉ်ကြည့်ရန်',
  cartEmpty: 'ပစ္စည်း ရွေးထားခြင်း မရှိပါ',

  // Order summary
  orderSummary: 'အရောင်း အစီအစဉ်',
  quantity: 'အရေအတွက်',
  remove: 'ဖယ်ရှားရန်',
  confirmSale: 'ရောင်းခြင်း အတည်ပြု',
  printReceipt: 'ဘောင်ချာ ပရင့်ထုတ်ရန်',
  confirming: 'အတည်ပြုနေသည်…',
  clearCart: 'အားလုံး ဖျက်ရန်',
  confirmClearCartQuestion: 'ရွေးထားချက် အားလုံး ဖျက်မှာလား?',
  confirmSaleQuestion: 'ဖောက်သည်ကို ရောင်းပြီးမှာလား?',
  yes: 'ဟုတ်ကဲ့',
  no: 'မဟုတ်ဘူး',
  saleSuccess: 'ရောင်းခြင်း မှတ်တမ်းတင် ပြီးပါပြီ',
  saleQueuedOffline: 'အင်တာနက် မရှိသောကြောင့် ကွန်ပျူတာတွင် သိမ်းဆည်းထားပါသည်',
  confirmDisabledEmpty: 'ပစ္စည်း ရွေးထားခြင်း မရှိသောကြောင့် ရောင်းရန် မဖြစ်နိုင်ပါ',

  // Connectivity
  online: 'အင်တာနက် ရှိသည်',
  offline: 'အင်တာနက် မရှိပါ',
  pendingSales: 'ပေးပို့ရန် ကျန်သည်',
  pendingSalesCount: (n: number) => `ပေးပို့ရန် ကျန်သော ရောင်းခြင်း ${n} ခု`,
  saleSynced: 'သိမ်းဆည်းထားသည့် ရောင်းခြင်း ပေးပို့ ပြီးပါပြီ',

  // Add product
  addProductTitle: 'ပစ္စည်း အသစ် ထည့်ရန်',
  productName: 'ပစ္စည်း အမည်',
  productNamePlaceholder: 'ဥပမာ – ဆီမင့်',
  priceLabel: 'တန်ဖိုး (ကျပ်)',
  choosePhoto: 'ဓာတ်ပုံ ရွေးရန် / ရိုက်ရန်',
  changePhoto: 'ဓာတ်ပုံ ပြောင်းရန်',
  save: 'သိမ်းဆည်းရန်',
  saving: 'သိမ်းဆည်းနေပါသည်…',
  productSaved: 'ပစ္စည်း အသစ် ထည့်ပြီးပါပြီ',

  // Receipt
  receiptTitle: 'ဘောင်ချာ',
  receiptDate: 'ရက်စွဲ',
  receiptSeller: 'ရောင်းသူ',
  receiptThanks: 'ဝယ်ယူတဲ့အတွက် ကျေးဇူးတင်ပါသည်',

  // Price edit (easy price change)
  editPrice: 'တန်ဖိုး ပြင်ရန်',
  editPriceTitle: 'တန်ဖိုး ပြင်ဆင်ရန်',
  editPriceSaved: 'တန်ဖိုး ပြောင်းလဲ ပြီးပါပြီ',

  // Admin (feature 002)
  navSale: 'ရောင်းချမှု',
  navReports: 'အရောင်း',
  navProducts: 'ပစ္စည်း စီမံ',
  periodDay: 'ယနေ့',
  periodWeek: 'ယခုအပတ်',
  periodMonth: 'ယခုလ',
  totalSales: 'စုစုပေါင်း ရောင်းချမှု',
  saleCountLabel: 'ရောင်းချမှု အရေအတွက်',
  perDayTitle: 'ရက်အလိုက်',
  perStaffTitle: 'ဝန်ထမ်း အလိုက်',
  noSalesInPeriod: 'ဤကာလအတွင်း ရောင်းချမှု မရှိပါ',
  viewSalesList: 'အရောင်းစာရင်း ကြည့်ရန်',
  historyTitle: 'အရောင်းစာရင်း',
  saleDetailTitle: 'အရောင်း အသေးစိတ်',
  dateLabel: 'ရက်စွဲ',
  staffLabel: 'ဝန်ထမ်း',
  statusLabel: 'အခြေအနေ',
  loadMore: 'ပိုမို ကြည့်ရန်',
  cachedAt: (hhmm: string) => `သိမ်းဆည်းထားသည် · ${hhmm}`,
  offlineReportNotice: 'အင်တာနက် မရှိပါ။ ယနေ့၏ အရောင်းများကို ပြသနိုင်ရန် အင်တာနက် လိုအပ်ပါသည်။',
  pendingThisDevice: (n: number) => `ဤစက်ပစ္စည်းတွင် မပို့ရသေးသော ရောင်းချမှု ${n} ခု`,
  refreshData: 'ပြန်လည် ရယူရန်',
  adminProductsTitle: 'ပစ္စည်း စီမံခန့်ခွဲမှု',
  addProductBtn: 'ပစ္စည်း ထည့်ရန်',
  editProductTitle: 'ပစ္စည်း ပြင်ဆင်ရန်',
  activeLabel: 'အသုံးပြုနေသည်',
  inactiveLabel: 'ရပ်ထားသည်',
  deactivate: 'ရပ်ရန်',
  reactivate: 'ပြန်ဖွင့်ရန်',
  editProduct: 'ပြင်ဆင်ရန်',
  noProducts: 'ပစ္စည်း မရှိသေးပါ',
  itemsLabel: 'ပစ္စည်း',
  profitLabel: 'အရောင်းတန်ဖိုး',
  notFound: 'ရှာမတွေ့ပါ',

  // Errors (mapped from service codes)
  errCodeLabel: (code: string) =>
    ({
      INVALID_CREDENTIALS: 'အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားနေပါသည်',
      NETWORK_ERROR: 'အင်တာနက် ချိတ်ဆက်မှု မရှိပါ။ တဖန် ပြန်စမ်းပါ။',
      PERMISSION_DENIED: 'ဤအကောင့်ကို ပိတ်ထားပါသည်။ မန်နေဂျာထံ ဆက်သွယ်ပါ။',
      PRICE_INVALID: 'တန်ဖိုးသည် ၀ ထက် ကြီးသော ကိန်းတစ်လုံး ရိုက်ထည့်ပါ',
      NAME_REQUIRED: 'ပစ္စည်းအမည် ရိုက်ထည့်ပါ',
      IMAGE_UNREADABLE: 'ဓာတ်ပုံကို ဖွင့်လို့ မရပါ။ အခြား ဓာတ်ပုံ ရွေးပါ။',
      IMAGE_TOO_LARGE: 'ဓာတ်ပုံ အလွန်ကြီးသည်။ အခြား ဓာတ်ပုံ ရွေးပါ။',
      TOTAL_MISMATCH: 'တန်ဖိုး တွက်ချက်မှု မမှန်ပါ။ ပြန်စမ်းပါ။',
      EMPTY_SALE: 'ပစ္စည်း မရွေးထားသေးပါ',
      UNKNOWN: 'အမှား တစ်ခု ဖြစ်နေပါသည်။ ပြန်စမ်းပါ။',
    }[code] ?? 'အမှား တစ်ခု ဖြစ်နေပါသည်။ ပြန်စမ်းပါ။'),
} as const
