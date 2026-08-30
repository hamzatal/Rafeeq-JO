export const ar = {
  common: {
    or: 'أو',
    appName: 'رفيق',
    next: 'التالي',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    save: 'حفظ',
    edit: 'تعديل',
    delete: 'حذف',
    retry: 'إعادة المحاولة',
    loadMore: 'تحميل المزيد',
    loading: 'جارٍ التحميل...',
    error: 'حدث خطأ',
    loadFailed: 'تعذّر تحميل البيانات. تحقّق من اتصالك وحاول مجدداً.',

    /*
     * «تعذّر الاتصال» is NOT «حدث خطأ», and the difference is the whole point.
     *
     * Six admin pages and two captain screens used to show an EMPTY state when a
     * request failed — «لا سحوبات معلّقة» on a queue that was simply unreachable.
     * Splitting offline from broken gives the user the one action that helps, and
     * `<ListState>` is the component that can no longer reach "empty" without a
     * successful load.
     */
    offline: 'تعذّر الاتصال',
    offlineBody: 'تأكّد من اتصالك بالإنترنت ثم أعد المحاولة.',

    /* Shown by `ErrorBoundary`, which renders when the theme itself may have failed. */

    /* Was a literal inside `store/auth.ts`. An admin signs in on the dashboard. */

    /*
     * 403 is not 401. Signing out does not grant a permission, so these must never
     * share a recovery path — that is how a permission error becomes a sign-out loop.
     */
    forbidden: 'ما عندك صلاحية لهذا الإجراء.',
    serverError: 'صار خطأ عندنا، مو عندك. جرّب بعد لحظات.',
    crashTitle: 'صار خطأ غير متوقّع',
    crashBody: 'واجهنا مشكلة بعرض هذه الشاشة. باقي التطبيق يعمل بشكل طبيعي — جرّب مرة أخرى.',
    mfaRequired: 'هذا الحساب يتطلب مصادقة ثنائية — سجّل الدخول عبر لوحة الإدارة.',
  },

  /**
   * Android notification CHANNEL names — shown in the system settings, not in the app.
   *
   * The ids live in code (the backend addresses them) but these labels are the
   * user's, and the two apps word the same channel differently: `rafeeq_payments`
   * is spending to a student and income to a captain.
   */
  push: {
    general: 'إشعارات عامة',
    trips: 'الرحلات',
    rides: 'طلبات الرحلات',
    ridesDriver: 'طلبات الرحلات الواردة',
    payments: 'المدفوعات والمحفظة',
    paymentsDriver: 'الأرباح والمحفظة',
    critical: 'تنبيهات حرجة وأمان',
  },

  /**
   * Spoken labels for controls that show ONLY an icon.
   *
   * 28 pressables in the two apps had an icon as their only child and no
   * `accessibilityLabel` — `accessibilityLabel` appeared zero times in either app.
   * To VoiceOver and TalkBack every one of them announced as "button" and nothing
   * else: the close on every sheet, the back arrow on every header, the send button
   * in chat, the SOS control. The product was unusable without sight.
   *
   * These say what the control DOES, not what the glyph looks like: «إرسال», never
   * «سهم». A screen-reader user hears this instead of seeing the icon, so it has to
   * carry the same meaning.
   */
  a11y: {
    back: 'رجوع',
    close: 'إغلاق',
    send: 'إرسال',
    help: 'المساعدة والدعم',
    copy: 'نسخ',
    notifications: 'الإشعارات',
    notificationPrefs: 'إعدادات الإشعارات',
    markAllRead: 'تعليم كل الإشعارات كمقروءة',
    swapDirection: 'عكس اتجاه الرحلة',
    useMyLocation: 'استخدام موقعي الحالي',
    openChat: 'فتح المحادثة',
    toggleForm: 'إظهار أو إخفاء النموذج',
    /** Receives the star number, e.g. «تقييم ٣ من ٥». */
    rateStars: 'تقييم بعدد نجوم',
  },
  /** Brand copy. One place, so the splash and the logo cannot disagree. */
  brand: {
    splashSlogan: 'رفيقك في كل خطوة جامعية',
  },
  onboarding: {
    skip: 'تخطّي',
    getStarted: 'لنبدأ',
    setupTitle: 'أكمل ملفك',
    setupBody: 'اختر جامعتك لنعرض لك المسارات والباقات المناسبة.',
    chooseUniversity: 'جامعتك',
    studentNumberOptional: 'الرقم الجامعي (اختياري)',
    noUniversities: 'لا توجد جامعات متاحة حالياً',
    finish: 'تم، لنبدأ',
    s1Title: 'وصلت لمكانك المفضل؟',
    s1Body: 'رفيق يوصلك من باب بيتك لباب جامعتك بكل راحة وأمان.',
    s2Title: 'تتبع رحلتك لحظة بلحظة',
    s2Body: 'خلك مرتاح، تقدر تشوف الكابتن وين صار وتعرف متى بيوصلك بالضبط.',
    s3Title: 'أمانك أولويتنا',
    s3Body: 'كباتننا معتمدين وموثقين، ورحلاتنا مراقبة لضمان وصولك بسلام.',
    d1Title: 'استقبل الطلبات على الخريطة',
    d1Body: 'شغّل وضع الاتصال واستقبل طلبات الطلاب القريبين منك مباشرةً.',
    d2Title: 'أرباحك بوضوح',
    d2Body: 'تابع أرباح يومك، رتبتك، واسحب أموالك بسهولة.',
    d3Title: 'وثّق مركبتك وانطلق',
    d3Body: 'أكمل وثائقك ومركبتك مرة واحدة، وابدأ الكسب.',
  },
  permissions: {
    title: 'نحتاج إذنين بسيطين',
    subtitle: 'لنمنحك أفضل تجربة — يمكنك تغييرها لاحقاً من الإعدادات.',
    locationTitle: 'الموقع',
    locationBody: 'لتحديد نقطة انطلاقك وإظهار الكباتن القريبين على الخريطة.',
    locationBodyDriver: 'لاستقبال الطلبات القريبة منك وإرشاد الطلاب إليك بدقة.',
    notificationsTitle: 'الإشعارات',
    notificationsBody: 'لتنبيهك عند قبول رحلتك، ووصول الكابتن، وحالة الدفع.',
    notificationsBodyDriver: 'لتنبيهك فوراً عند وصول طلب رحلة جديد قريب منك.',
    allow: 'تفعيل',
    enabled: 'مُفعّل',
    continue: 'متابعة',
    later: 'لاحقاً',
  },
  map: {
    title: 'الخريطة',
    pickHint: 'اضغط على الخريطة لتحديد الموقع',
    captain: 'الكابتن',
    pickup: 'نقطة الالتقاط',
    destination: 'الوجهة',
    origin: 'الانطلاق',
  },
  auth: {
    welcomeSubtitle: 'النقل الجامعي الذكي — أبسط، أوفر، وأأمن',
    studentSigninSub: 'أهلاً بعودتك — تابع رحلتك الجامعية',
    captainSigninSub: 'جاهز تبدأ يومك وتزيد دخلك؟',
    captainSignupSub: 'انضمّ لفريق كباتن رفيق وابدأ استقبال الطلبات',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    confirmPassword: 'تأكيد كلمة المرور',
    loginWithOtp: 'الدخول برمز التحقق (OTP)',
    forgotPassword: 'نسيت كلمة المرور؟',
    resetTitle: 'إعادة تعيين كلمة المرور',
    resetHint: 'سنرسل رمزاً إلى رقمك لتعيين كلمة مرور جديدة',
    newPassword: 'كلمة المرور الجديدة',
    code: 'رمز التحقق',
    sendResetCode: 'إرسال الرمز',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
    passwordMin: 'كلمة المرور 8 أحرف على الأقل.',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    sendCode: 'إرسال الرمز',
    otpTitle: 'رمز التحقق',
    otpSubtitle: 'أدخل الرمز المرسل إلى هاتفك',
    verify: 'تحقق',
    haveAccount: 'لديك حساب؟ سجّل الدخول',
    noAccount: 'ليس لديك حساب؟ أنشئ حساباً',
    logout: 'تسجيل الخروج',
    testCode: 'كود التجربة',
  },
  /*
   * ── What came out of this block ────────────────────────────────────────
   *
   * Sixteen keys that nothing rendered: `allServices` · `moreServices` · `services`
   * · `activeSubscription` · `noActiveSub` · `subscribeNow` · `remainingRides` ·
   * `endsIn` · `recentTrips` · `tripFallback` · `viewAll` · `addPlace` · `locating`
   * · `askAi` · `askAiHint` · `points` · `level` · `nextDiscount` — leftovers from a
   * services-grid home screen that no longer exists. A dead translation is not
   * harmless: it is the shape of a feature, so the next person builds the screen
   * around the string instead of around the data.
   *
   * `minutesShort` and `nearbyCaptain` went with the fabricated «٣ دقائق» badge and
   * the invented nearest-captain marker. There is no captain-proximity endpoint in
   * this API, so neither string had anything true to say.
   */
  home: {
    title: 'الرئيسية',
    trips: 'رحلاتي',
    wallet: 'المحفظة',
    goodMorning: 'صباح الخير',
    goodAfternoon: 'مساء الخير',
    goodEvening: 'مساء الخير',
    requestRideCta: 'اطلب رحلتك الآن',

    /* ── Idle: the map plus one sheet ── */
    whereTo: 'إلى أين؟',
    searchDestination: 'ابحث عن وجهة',
    noDestinations: 'احفظ بيتك وجامعتك، وبعدها الطلب نقرة واحدة',
    addDestination: 'أضف وجهة',
    labelHome: 'البيت',
    labelUniversity: 'الجامعة',
    labelWork: 'العمل',
    labelOther: 'وجهة',
    nearby: 'موقعك الحالي',
    askAi: 'اسأل رفيق',

    /* ── Live: the same screen, once a ride exists ── */
    liveTrip: 'رحلتك الجارية',
    stepRequested: 'تم الطلب',
    stepAccepted: 'قُبلت',
    stepComing: 'الكابتن قادم',
    stepOnboard: 'في الطريق',
    stepArrived: 'وصلت',
    grouping: 'بنجمّعك مع طلاب منطقتك',
    awaitingCaptain: 'بندوّر على كابتن قريب منك',
    captainDistance: 'الكابتن على بعد',
    noCaptainLocation: 'لسا ما وصلنا موقع الكابتن',
    plate: 'اللوحة',
    call: 'اتصال',
    message: 'رسالة',
    boardingCode: 'رمز الصعود',
    boardingCodeHint: 'أعطه للكابتن',
    dropoffCode: 'رمز النزول',
    dropoffCodeHint: 'أعطه للكابتن عند الوصول',
    /* Kilometres and metres, because the only honest number we hold is a distance.
       An ETA needs traffic and a route; a straight line between two real
       coordinates is a distance and nothing more, so that is what it says. */
    km: 'كم',
    metre: 'م',
    sos: 'استغاثة',
  },
  settings: {
    title: 'الإعدادات',
    /*
     * `appearance` · `theme` · `light` · `dark` · `system` came out with dark mode
     * (decision 7). `about` and `version` never had a row. A translation with no call
     * site is the shape of a feature, so the next person builds the screen around the
     * string instead of around the data.
     */
    arabic: 'العربية',
    english: 'English',
    account: 'الحساب',
    general: 'الإعدادات العامة',
    appLanguage: 'لغة التطبيق',
    notifications: 'الإشعارات',
    notificationsDesc: 'إدارة التنبيهات والرسائل',
    emergencyContact: 'جهة اتصال الطوارئ',
    emergencyDesc: 'تحديث بيانات الطوارئ للرحلات',
    supportCenter: 'مركز الدعم',
    contactUs: 'اتصل بنا',
    faq: 'الأسئلة الشائعة',
    legal: 'قانوني',
    privacy: 'سياسة الخصوصية',
    terms: 'الشروط والأحكام',
    supportDesc: 'فريقنا متاح على مدار الساعة للإجابة على استفساراتك وتقديم المساعدة الفورية.',
    chatWithUs: 'تحدث معنا',
    avgResponse: 'متوسط وقت الرد: أقل من دقيقة',

    /*
     * ── Account deletion ─────────────────────────────────────────────────
     *
     * `DELETE /api/v1/profile` has existed since the Users module did, backed by
     * `AccountErasureService` — which anonymises the identifying columns rather than
     * dropping rows, so the financial ledger stays auditable. There was no client
     * method for it and no row on any screen, in either app.
     *
     * That is not only a gap: both app stores REQUIRE an in-app path to delete an
     * account for any app that lets you create one. It was a submission blocker.
     */
    deleteAccount: 'حذف الحساب',
    deleteAccountDesc: 'إزالة بياناتك الشخصية نهائياً',
    deleteConfirmTitle: 'حذف حسابك نهائياً؟',
    deleteConfirmMsg: 'سنحذف اسمك ورقمك وعناوينك المحفوظة نهائياً ولا يمكن استرجاعها. تبقى سجلات الرحلات والفواتير بصيغة مجهولة الهوية للأسباب المحاسبية والقانونية.',
    deleteConfirm: 'احذف حسابي',
    deleted: 'تم حذف حسابك.',
    deleteFailed: 'تعذّر حذف الحساب. تواصل مع الدعم.',
    logoutConfirmTitle: 'تسجيل الخروج؟',
    logoutConfirmMsg: 'ستحتاج لرقمك ورمز تحقّق جديد للدخول مرة أخرى.',
  },
  driver: {
    dashboard: 'يومي',
    offers: 'عروض الرحلات',
    noOffers: 'لا توجد عروض حالياً',
    acceptOffer: 'قبول العرض',
    farePerSeat: 'الأجرة / المقعد',
    platformCommission: 'عمولة المنصة',
    yourNetEarnings: 'صافي ربحك المتوقّع',
    online: 'متصل',
    offline: 'غير متصل',
    onlineHint: 'أنت متصل — جارٍ البحث عن طلبات قريبة منك',
    offlineHint: 'أنت غير متصل — فعّل الاتصال لاستقبال الطلبات',
    todayEarnings: 'أرباح اليوم',
    scheduleNew: 'جدولة رحلة جديدة',
    pickRoute: 'اختر المسار',
    pickRouteFirst: 'اختر مساراً أولاً',
    noRoutes: 'لا توجد مسارات بعد (تُضاف من الإدارة)',
    scheduled: 'تم جدولة الرحلة',
    scheduleFailed: 'فشل جدولة الرحلة',
    tripsSection: 'الرحلات',
    passengers: 'الركاب',
    tomorrowMorning: 'غداً 7:00 ص',
    tomorrowEvening: 'غداً 4:00 م',
    pooledTrip: 'رحلة مجمّعة',
    docNationalId: 'الهوية الوطنية',
    docLicense: 'رخصة القيادة',
    docPhoto: 'صورة شخصية',
    docApproved: 'مقبولة',
    docRejected: 'مرفوضة',
    docUnderReview: 'قيد المراجعة',
    docNotUploaded: 'غير مرفوعة',
    change: 'تغيير',
    uploadFailed: 'تعذّر الرفع',
    vehicleAdded: 'تمت إضافة المركبة بنجاح',
    seatsWord: 'مقاعد',
    startTrip: 'بدء الرحلة',
    tripStarted: 'بدأت الرحلة',
    tripCancelled: 'أُلغيت الرحلة',
    endTrip: 'إنهاء الرحلة',
    tripEnded: 'انتهت الرحلة',
    boardingConfirmed: 'تم تأكيد الصعود',
    dropoffConfirmed: 'تم تأكيد الإنزال',
    noPassengers: 'لا يوجد ركاب',
    passengerLabel: 'راكب',
    documents: 'الوثائق',
    vehicle: 'المركبة',
    addVehicle: 'إضافة مركبة',
    myTrips: 'رحلاتي',
    upload: 'رفع',
    uploaded: 'تم الرفع',
    submitReview: 'إرسال للمراجعة',
    verifyIntro: 'ارفع وثائقك وأضف مركبتك لتفعيل حسابك والبدء بالعمل.',
    requiredDocs: 'الوثائق المطلوبة',
    chooseSource: 'اختر مصدر الصورة',
    takePhoto: 'التقط صورة',
    fromGallery: 'من المعرض',
    addVehicleCta: 'أضف مركبتك',
    noVehicle: 'لم تُضف مركبة بعد',
    completeDocsFirst: 'أكمل رفع الوثائق والمركبة أولاً',
    readyToSubmit: 'كل شيء جاهز — أرسل طلبك للمراجعة',
    accountVerified: 'حسابك معتمد ✓',
    camPermission: 'نحتاج إذن الكاميرا لالتقاط الصورة.',
    statusUnderReview: 'طلبك قيد المراجعة من الإدارة',
    make: 'الشركة المصنّعة',
    model: 'الموديل',
    year: 'سنة الصنع',
    color: 'اللون',
    plate: 'رقم اللوحة',
    seats: 'عدد المقاعد',
    wallet: 'المحفظة',
    overallRating: 'التقييم العام',
    totalTrips: 'إجمالي الرحلات',
    heldNote: 'محجوز',
    withdrawBalance: 'سحب الرصيد',
    cliqPaymentInfo: 'معلومات الدفع (CliQ)',
    cliqAliasLabel: 'الاسم المستعار',
    recentTransactions: 'المعاملات الأخيرة',
    tripsShort: 'رحلة',
    weekOf: 'أسبوع',
    vehicleAndDocs: 'مركبتي ووثائقي',
    editVehicle: 'تعديل',
    deleteVehicle: 'حذف',
    deleteVehicleTitle: 'حذف المركبة؟',
    deleteVehicleMsg: 'لن تستقبل رحلات على هذه المركبة بعد الحذف:',
    vehicleUpdated: 'تم تحديث بيانات المركبة',
    vehicleDeleted: 'تم حذف المركبة',
    docsPrivacyNote: 'وثائقك مشفّرة ولا يراها إلا فريق التوثيق. تُحذف نهائياً عند رفض الطلب أو إغلاق حسابك.',
    todayNet: 'صافي اليوم',
    availableToWithdraw: 'الرصيد القابل للسحب',
    commissionDue: 'عمولة مستحقة عليك',
    settleCommission: 'تسوية العمولة',
    withdrawWithin: 'التحويل خلال يوم عمل',
    thisPeriod: 'هذه الفترة',
    offerExpiresIn: 'تنتهي بعد',
    offerExpired: 'انتهت مهلة هذا العرض',
    ignoreOffer: 'تجاهل',
    enterDropoffCodeShort: 'أدخل رمز الإنزال من الطالب',
    enterBoardingCodeShort: 'أدخل رمز الصعود من الطالب',
    confirmDropoffAndEnd: 'تأكيد الإنزال وإنهاء الرحلة',
    reportProblem: 'مشكلة',
    codeDigitsNote: 'الرمز {n} أرقام — تأكيد من الطرفين يحمي الاثنين من التنازعات.',
    tabDaily: 'يومي (٧ أيام)',
    tabWeekly: 'أسبوعي (٦ أسابيع)',
  },
  subscriptions: {
    title: 'الاشتراكات',
    subtitle: 'خطّك الشهري ورحلاتك المتبقية',
    mine: 'اشتراكاتي',
    available: 'الخطط المتاحة',
    none: 'لا توجد خطط متاحة حالياً',
    subscribe: 'اشترك',
    defaultName: 'اشتراك',
    rideUnit: 'رحلة متبقية',
    rideWord: 'رحلة',
    endsAt: 'ينتهي',
    dayUnit: 'يوم',
    currency: 'د.أ',
    perRide: 'للرحلة',
    noPlanTitle: 'بدون باقة — ادفع لكل رحلة',
    noPlanBody: 'احجز أي رحلة وادفع أجرتها من محفظتك أو نقداً للكابتن. بلا التزام وبلا مدة.',
    noPlanCta: 'ابحث عن رحلة',
    planIsOptional: 'الباقة توفير، لا شرط. تقدر تحجز بدونها في أي وقت.',
  },
  checkout: {
    title: 'الاشتراك والدفع',
    summary: 'ملخّص الاشتراك',
    includes: 'تشمل',
    total: 'الإجمالي',
    transferred: 'حوّلت المبلغ؟ ارفع الإيصال',
    pendingTitle: 'اشتراكك بانتظار التأكيد',
    pendingBody: 'استلمنا طلبك. سنراجع الحوالة ونفعّل اشتراكك خلال وقت قصير، وسيصلك إشعار.',
    viewSubscriptions: 'عرض اشتراكاتي',
    goWallet: 'المركز المالي',
    choosePay: 'اختر طريقة الدفع',
    payFromWallet: 'ادفع من المحفظة',
    payViaCliqOption: 'حوّل عبر CliQ',
    walletBalance: 'رصيد محفظتك المتاح',
    heldNote: 'محجوز لرحلة قائمة',
    insufficient: 'الرصيد لا يكفي — اشحن محفظتك أو ادفع عبر CliQ',
    activatedTitle: 'تم تفعيل اشتراكك 🎉',
    activatedBody: 'تم الدفع من رصيدك، واشتراكك فعّال الآن. رحلة سعيدة!',
    failed: 'تعذّر إتمام العملية',
    orderNumber: 'رقم الطلب',
    amountDue: 'المبلغ المطلوب',
    validity: 'صلاحية الطلب',
    expiresAfter: 'تنتهي بعد',
    hours: 'ساعة',
    expired: 'انتهت صلاحية الطلب',
    payInstructions: 'تعليمات الدفع',
    transferInstruction: 'يرجى التحويل عبر CliQ للمستلم المعتمد وإرفاق صورة التحويل أدناه.',
    cliqAlias: 'اسم CliQ المعتمد (Alias)',
    proofTitle: 'إثبات الدفع',
    uploadTransfer: 'ارفع صورة التحويل (Screenshot)',
    uploadTypes: 'JPG, PNG - الحد الأقصى 5MB',
    aiVerify: 'تحقّق آلي ذكي',
    aiVerifyHint: 'سيقوم ذكاء رفيق الاصطناعي بمطابقة التحويل فوراً، يرجى التأكد من وضوح رقم الحوالة والمبلغ.',
    confirmPay: 'تأكيد الدفع',
    copied: 'تم نسخ الاسم المستعار',
  },
  trips: {
    title: 'رحلاتي',
    available: 'رحلات متاحة',
    none: 'لا توجد رحلات مجدولة حالياً',
    book: 'احجز مقعد',
    booked: 'تم الحجز! احتفظ بكود الصعود.',
    bookFailed: 'فشل الحجز',
    defaultName: 'رحلة',
    rebook: 'إعادة الحجز',
    downloadInvoice: 'تحميل الفاتورة',
    originLabel: 'نقطة الانطلاق',
    destinationLabel: 'الوجهة',
    noHistory: 'لا يوجد سجل رحلات بعد',
    openLive: 'افتح الرحلة الحيّة',
    cancelBooking: 'إلغاء الحجز',
    cancelBookingTitle: 'إلغاء حجزك؟',
    cancelBookingMsg: 'سنُحرّر المبلغ المحجوز من محفظتك، ويعود مقعدك للطلاب الآخرين.',
    bookingCancelled: 'تم إلغاء الحجز وتحرير المبلغ المحجوز.',
    captainFallback: 'الكابتن',
    filterCompleted: 'مكتملة',
    filterCancelled: 'ملغاة',
  },
  wallet: {
    balance: 'الرصيد',
    heldNote: 'محجوز لرحلة قائمة',
    amount: 'المبلغ (دينار)',
    transactions: 'الحركات',
    noTransactions: 'لا توجد حركات بعد',
    cliqTitle: 'طلب دفع عبر كليك',
    cliqHowTo: 'كيف يعمل الشحن؟',
    /* The link that said «تعرف على طريقة الاستخدام» had no `onPress`. Either the
       explanation exists or the link should not, so here is the explanation. */
    cliqHowToBody: 'أنشئ طلب شحن بالمبلغ الذي تريده، فنعطيك اسم المستفيد ورقماً مرجعياً. حوّل المبلغ من تطبيق بنكك عبر CliQ واكتب الرقم المرجعي في خانة الملاحظات، ثم ارفع صورة الإشعار. يُقيَّد الرصيد بعد مراجعة بشرية للإشعار — لا يُضاف تلقائياً.',
    history: 'سجل الشحنات',
    enterAmount: 'أدخل المبلغ المطلوب',
    createLink: 'إنشاء رابط دفع',
    alias: 'الاسم المستعار (CliQ)',
    beneficiary: 'المستفيد',
    reference: 'الرقم المرجعي',
    invalidAmount: 'أدخل مبلغاً صحيحاً (1 دينار على الأقل).',
    uploadProof: 'رفع إشعار التحويل',
    topupCreated: 'أنشأنا طلب الشحن — حوّل المبلغ ثم ارفع الإشعار.',
    transferStep: 'حوّل المبلغ عبر CliQ',
    uploadStep: 'ارفع إشعار التحويل للاعتماد',
    underReview: 'قيد المراجعة',
    awaitingProof: 'بانتظار رفع الإشعار',
    newTopup: 'شحنة جديدة',
  },
  payments: {
    title: 'المدفوعات',
    none: 'لا توجد مدفوعات بعد',
    topupWallet: 'شحن المحفظة',
    uploadProof: 'رفع إشعار التحويل',
    saveInvoice: 'حفظ الفاتورة (PDF)',
    couponActivate: 'تفعيل الكوبون',
    couponActivated: 'تم تفعيل الكوبون ✓ سيظهر في طلب الرحلة.',
    proofUploaded: 'تم استلام الإشعار وهو قيد المراجعة.',
    created: 'تم إنشاء طلب الدفع.',
    failed: 'تعذّر إنشاء الطلب',

    /*
     * The PDF receipt.
     *
     * These were literals inside a 60-line HTML builder duplicated in both apps —
     * along with `#0B192C` and `#1FB6C1`, a navy and a teal that are not even the
     * retired palette. The one artefact a user KEEPS was the last place still
     * wearing a dead brand.
     */
    receiptTopUp: 'إيصال شحن محفظة',
    receiptTransaction: 'إيصال معاملة',
    receiptHeading: 'تفاصيل الفاتورة',
    receiptReference: 'الرقم المرجعي',
    receiptHolder: 'صاحب الحساب',
    receiptPurpose: 'الغرض',
    receiptMethod: 'طريقة الدفع',
    receiptStatus: 'الحالة',
    receiptAmount: 'المبلغ',
    receiptFooter: 'هذه فاتورة إلكترونية صادرة عن تطبيق رفيق — يُرجى الاحتفاظ بها كمرجع.',
    receiptShare: 'فاتورة',
  },
  notifications: {
    title: 'الإشعارات',
    none: 'لا توجد إشعارات',
    today: 'اليوم',
    yesterday: 'أمس',
    earlier: 'أقدم',
    push: 'إشعارات الجهاز',
    sms: 'رسائل SMS للحرج',
    catPayments: 'المدفوعات',
    catTrips: 'الرحلات',
    catRatings: 'التقييمات',
    catGeneral: 'عام',
  },
  rideRequest: {
    pickup: 'موقع الانطلاق',
    notCovered: 'ما وصلنا لمنطقتك بعد. بنفتح المناطق حسب الطلب — جرّب نقطة انطلاق أقرب لإحدى الجامعات المخدومة.',
    created: 'تم إنشاء الطلب. جارٍ تجميعك مع طلاب منطقتك.',
    locationFailed: 'تعذّر تحديد الموقع. حاول مرة أخرى.',
    pickUniversity: 'اختر الجامعة',
    toUniversity: 'إلى الجامعة',
    fromUniversity: 'من الجامعة',
    /*
     * TWO products, both with an approved price — not three vehicle classes.
     *
     * The three classes («اقتصادي» · «عائلي» · «بلس») were not a product. Two of them
     * returned the SAME fare from the API because the tariff does not vary by seat
     * count, and each carried a hardcoded ETA — 5, 8 and 4 minutes — that nothing
     * computed. A rider chose between two identical prices on the strength of an
     * invented number.
     *
     * What the tariff actually holds, per corridor, is a seat price and a whole-car
     * price. That is the choice, and phase 5 built it deliberately: showing both is
     * what makes the pooling wait acceptable, because the alternative has a printed
     * price next to it.
     */
    chooseProduct: 'اختر نوع رحلتك',
    shared: 'مشتركة',
    sharedHint: 'مقعدك في سيارة مع طلاب من منطقتك',
    sharedWait: 'بنجمّعك مع طلاب منطقتك — ممكن تنتظر دقائق',
    solo: 'منفردة',
    soloHint: 'السيارة كاملة لك وحدك',
    soloNoWait: 'بتنطلق بلا انتظار تجميع',
    soloUnavailable: 'المنفردة غير متاحة على هذا المسار بعد',
    perSeat: 'للمقعد',
    wholeCar: 'للسيارة كاملة',
    express: 'مستعجلة',
    expressHint: 'أولوية بلا انتظار — برسم إضافي',
    paymentMethod: 'طريقة الدفع',
    walletPay: 'محفظة رفيق',
    walletHint: 'يُخصم من رصيدك عند انتهاء الرحلة',
    cashPay: 'نقداً للكابتن',
    cashHint: 'تدفع للكابتن عند الوصول',
    confirmRide: 'تأكيد الطلب',
  },
  rating: {
    done: 'شكراً لتقييمك!',
    rate: 'قيّم',
  },
  support: {
    title: 'الدعم',
    none: 'لا توجد تذاكر',
    subject: 'الموضوع',
    message: 'رسالتك',
    send: 'إرسال',
    created: 'تم فتح التذكرة.',
    failed: 'تعذّر الإرسال',
  },
  assistant: {
    title: 'مساعد رفيق',
    placeholder: 'اكتب سؤالك...',
    empty: 'اسأل مساعد رفيق عن الاشتراكات، الرحلات، المحفظة، الطرود وغيرها.',
    online: 'متصل',
    degraded: 'الردود المبسّطة مؤقتاً',
    degradedHint: 'المساعد الذكي غير متاح الآن، وهذه ردود جاهزة لا إجابات مُصاغة لسؤالك. للحالات المستعجلة راسل الدعم.',
    thinking: 'يفكّر',
    suggest1: 'كيف أطلب رحلة؟',
    suggest2: 'ما هي خطط الاشتراك؟',
    suggest3: 'كيف أشحن محفظتي؟',
  },
  emergency: {
    title: 'الطوارئ',
    intro: 'في حالة الخطر، اضغط زر الطوارئ لتنبيه فريق سلامة رفيق وجهات اتصالك الموثوقة فوراً مع موقعك الحالي.',
    sosConfirmTitle: 'إرسال نداء استغاثة؟',
    sosConfirmMsg: 'سيصل فريق السلامة موقعك ورحلتك الحالية فوراً، وسيتم تنبيه جهات اتصالك الموثوقة.',
    sosConfirm: 'أرسل الآن',
    /*
     * A ride-hailing app is not an ambulance, and saying so is not a disclaimer for
     * lawyers — it is the difference between a student who calls 911 and a student
     * who waits for us. `docs/design/SCREENS.md` requires it on this screen.
     */
    notNineOneOne: 'رفيق ليس بديلاً عن الطوارئ الرسمية',
    notNineOneOneHint: 'إذا كان هناك خطر على حياتك أو إصابة، اتصل بـ 911 أولاً. نداء رفيق ينبّه فريق السلامة وجهات اتصالك، ولا يُرسل إسعافاً ولا شرطة.',
    callNineOneOne: 'اتصل بـ 911',
    deleteConfirmTitle: 'حذف جهة الاتصال؟',
    deleteConfirmMsg: 'لن يتم تنبيهه عند الطوارئ بعد الحذف.',
    deleted: 'تم حذف جهة الاتصال.',
    deleteFailed: 'تعذّر الحذف. حاول مرة أخرى.',
    primarySet: 'تم التعيين كجهة أساسية.',
    sosSent: 'تم إرسال نداء الطوارئ. سيتم التواصل معك فوراً.',
    sosFailed: 'تعذّر إرسال النداء. حاول مرة أخرى أو اتصل مباشرة.',
    contactsTitle: 'جهات اتصال الطوارئ',
    name: 'الاسم',
    phone: 'رقم الهاتف',
    relationLabel: 'صلة القرابة',
    notifyOnSos: 'تنبيه عند الطوارئ (SOS)',
    sosOff: 'لن يتم تنبيهه عند الطوارئ',
    primary: 'أساسي',
    setPrimary: 'تعيين كأساسي',
    call: 'اتصال',
    sms: 'رسالة',
    saveFailed: 'تعذّر الحفظ.',
    invalid: 'تحقق من الاسم ورقم الهاتف.',
    noContacts: 'لا توجد جهات اتصال طوارئ',
    noContactsHint: 'أضف ولي أمر أو شخصاً موثوقاً ليتم تنبيهه عند الطوارئ.',
    relation: {
      parent: 'أحد الوالدين',
      sibling: 'أخ/أخت',
      spouse: 'زوج/زوجة',
      relative: 'قريب',
      friend: 'صديق',
      other: 'أخرى',
    },
    addContact: 'إضافة جهة اتصال',
    editContact: 'تعديل جهة الاتصال',
    added: 'تمت إضافة جهة الاتصال.',
    updated: 'تم تحديث جهة الاتصال.',
  },
  chat: {
    title: 'المحادثة',
    placeholder: 'اكتب رسالة...',
    empty: 'لا توجد رسائل بعد. ابدأ المحادثة.',
    withCaptain: 'محادثة مع الكابتن',
    withStudent: 'محادثة مع الطالب',
    loadError: 'تعذّر فتح المحادثة.',
  },
  payout: {
    submitted: 'تم إرسال طلب السحب. التحويل خلال يوم عمل.',
    withdraw: 'سحب الأرباح',
    amount: 'قيمة السحب (د.أ)',
    destination: 'محفظة CliQ / رقم الهاتف',
    submit: 'إرسال طلب السحب',
    minHint: 'الحد الأدنى للسحب 5 دنانير.',
  },
  addresses: {
    title: 'العناوين المحفوظة',
    subtitle: 'احفظ منزلك وجامعتك لطلب الرحلات بسرعة',
    add: 'إضافة عنوان',
    label: 'النوع',
    home: 'المنزل',
    university: 'الجامعة',
    work: 'العمل',
    other: 'آخر',
    addressText: 'العنوان',
    save: 'حفظ',
    saved: 'تم حفظ العنوان.',
    none: 'لا توجد عناوين محفوظة',
    setDefault: 'تعيين افتراضي',
    default: 'افتراضي',
    delete: 'حذف',
    deleted: 'تم حذف العنوان.',
  },
  validation: {
    required: 'هذا الحقل مطلوب',
    invalidPhone: 'رقم الهاتف غير صالح',
  },
} as const;

/**
 * Deeply widen literal string values to `string` while preserving the key
 * structure, so other locales (en.ts) must match the SAME keys but can supply
 * their own translated strings.
 */
type DeepWidenStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepWidenStrings<T[K]>;
};

export type Translations = DeepWidenStrings<typeof ar>;
