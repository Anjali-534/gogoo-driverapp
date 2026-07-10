# Translation review queue

Keys below have a best-effort translation already committed to `or.json` (never left blank),
but should be checked by a native/fluent Odia speaker before shipping — register, naturalness,
or terminology I wasn't fully confident about.

## Glossary — pick once, use everywhere

One term per concept, chosen for Ola/Uber-register Hindi and conversational Odia. When a new
batch needs one of these concepts, reuse the term below rather than re-deriving it. If a batch
turns up an existing key that drifted from this table, fix it in that batch and note the fix in
the batch's checkpoint.

Copied verbatim from `user-app/locales/REVIEW.md` (Phase 2, approved) — same 13 terms, same
hi/or choices, zero re-derivation. Driver-specific concepts are appended below as they come up.

| Concept (en) | Hindi | Odia | Notes |
|---|---|---|---|
| ride / trip | राइड (pl. राइड्स) | ରାଇଡ୍ | One term for both English "ride" and "trip" — they're the same concept to the user. Loanword kept, matches Ola/Uber Hindi UI convention. |
| fare | किराया | ଭଡ଼ା | |
| driver | ड्राइवर | ଡ୍ରାଇଭର୍ | |
| booking / to book | बुकिंग / बुक करें | ବୁକିଂ / ବୁକ୍ କରନ୍ତୁ | |
| cancel | रद्द करें | ବାତିଲ୍ କରନ୍ତୁ | |
| pickup | पिकअप | ପିକଅପ୍ | |
| drop | ड्रॉप | ଡ୍ରପ୍ | |
| vehicle | वाहन / गाड़ी | ଗାଡ଼ି | "गाड़ी" used in casual copy; वाहन for formal labels (e.g. "vehicle type"). |
| confirm | कन्फर्म करें | କନ୍ଫର୍ମ କରନ୍ତୁ | |
| payment | पेमेंट | ପେମେଣ୍ଟ | Loanword, not भुगतान. |
| account | अकाउंट | ଆକାଉଣ୍ଟ | |
| emergency | इमरजेंसी | ଜରୁରୀକାଳୀନ | Load-bearing for ambulance/safety strings — see emergency-content rule below. |
| saved place | सेव की गई जगह | ସେଭ୍ କରାଯାଇଥିବା ସ୍ଥାନ | |

### Driver-app additions

New concepts specific to driver-app. Pick once here, reuse in every batch.

| Concept (en) | Hindi | Odia | Notes |
|---|---|---|---|
| earnings | कमाई | ରୋଜଗାର | |
| payout | पेआउट | ପେଆଉଟ୍ | Loanword, matches driver-app usage over "भुगतान"/settlement terms. |
| wallet | वॉलेट | ୱାଲେଟ୍ | |
| online / on duty | ऑनलाइन / ड्यूटी पर | ଅନଲାଇନ୍ / ଡ୍ୟୁଟିରେ | |
| offline / off duty | ऑफलाइन / ड्यूटी से बाहर | ଅଫଲାଇନ୍ / ଡ୍ୟୁଟି ବାହାରେ | |
| document | दस्तावेज़ | ଡକ୍ୟୁମେଣ୍ଟ | |
| verification / verified | सत्यापन / सत्यापित | ଯାଞ୍ଚ / ଯାଞ୍ଚ ହୋଇଛି | |
| rider | राइडर | ରାଇଡର୍ | The passenger, from the driver's perspective — kept distinct from "driver". |

### Emergency-content rule (ambulance/safety screens)

Medical and emergency strings must use the plainest, most unambiguous phrasing available —
never a "natural-sounding" idiom if a literal, plain rendering is clearer. Every hi/or
translation touching ambulance or safety content is flagged below for native review
regardless of how confident the translation felt, because a mistranslated emergency string
is a different class of bug than a mistranslated UI label.

### Earnings/payout-content rule (driver-app addition)

Same treatment as emergency content: every hi/or translation touching `earnings.*`,
`payout.*`, or `profile.wallet.*` money figures/labels is flagged below regardless of
confidence. A driver misreading how much they earned, or when/how they get paid, is the
same class of bug as a misread safety instruction — flag for native review, don't rely on
translator confidence alone.

## Batch 1 — auth/login, home (duty toggle + incoming ride popup), orders (list/map/OTP/completion), orders/chat, SOSButton, tab bar

Covers the core loop: driver logs in → goes online → receives a ride request → accepts →
drives → completes. Per this batch's instructions, ALL ride-status/tracking strings and ALL
safety/SOS strings get full hi+or review regardless of confidence (same tier as user-app's
ambulance/tracking content), and driver-app adds EARNINGS/PAYOUT/WALLET strings to that same
full-coverage tier — a driver misreading a money figure is the same class of bug as a misread
safety instruction.

### ⚠️ Ride-status / tracking — EVERY hi/or string flagged

| Key | English | Hindi | Odia |
|---|---|---|---|
| `home.statusLabels.accepted` | Heading to Pickup | पिकअप की तरफ जा रहे हैं | ପିକଅପ୍ ଆଡ଼କୁ ଯାଉଛନ୍ତି |
| `home.statusLabels.arriving` | Arrived at Pickup | पिकअप पर पहुंच गए | ପିକଅପ୍ ରେ ପହଞ୍ଚିଗଲେ |
| `home.statusLabels.inProgress` | Trip in Progress | ट्रिप जारी है | ଯାତ୍ରା ଚାଲିଛି |
| `home.activeRide.fallbackTitle` | Ride in progress | राइड जारी है | ରାଇଡ୍ ଚାଲିଛି |
| `home.popup.title` | New Ride Request! | नई राइड रिक्वेस्ट! | ନୂଆ ରାଇଡ୍ ରିକୱେଷ୍ଟ! |
| `home.popup.distanceLabel` / `fareLabel` / `typeLabel` | Distance / Fare / Type | दूरी / किराया / प्रकार | ଦୂରତା / ଭଡ଼ା / ପ୍ରକାର |
| `home.popup.reject` / `accept` | ✕  Reject / ✓  Accept | ✕  रिजेक्ट करें / ✓  स्वीकार करें | ✕  ପ୍ରତ୍ୟାଖ୍ୟାନ କରନ୍ତୁ / ✓  ଗ୍ରହଣ କରନ୍ତୁ |
| `orders.status.headingToRider` | Heading to Rider | राइडर की तरफ जा रहे हैं | ରାଇଡର୍ ଆଡ଼କୁ ଯାଉଛନ୍ତି |
| `orders.status.arrivedPickup` | Arrived at Pickup | पिकअप पर पहुंच गए | ପିକଅପ୍ ରେ ପହଞ୍ଚିଗଲେ |
| `orders.status.tripInProgress` | Trip in Progress | ट्रिप जारी है | ଯାତ୍ରା ଚାଲିଛି |
| `orders.nextAction.arriving` | I'm Arriving | मैं पहुंच रहा/रही हूं | ମୁଁ ପହଞ୍ଚୁଛି |
| `orders.nextAction.startRide` | Picked Up · Start Ride | पिक अप किया · राइड शुरू करें | ପିକ୍ ଅପ୍ ହେଲା · ରାଇଡ୍ ଆରମ୍ଭ କରନ୍ତୁ |
| `orders.nextAction.complete` | Complete Trip | ट्रिप पूरी करें | ଯାତ୍ରା ସମାପ୍ତ କରନ୍ତୁ |
| `orders.otp.title` | Enter Ride OTP | राइड OTP दर्ज करें | ରାଇଡ୍ OTP ଦିଅନ୍ତୁ |
| `orders.otp.subtitle` | Ask the rider for the 4-digit OTP shown on their app to start the ride | राइड शुरू करने के लिए राइडर के ऐप पर दिख रहा 4-अंकों का OTP मांगें | ରାଇଡ୍ ଆରମ୍ଭ କରିବାକୁ ରାଇଡରଙ୍କ ଆପ୍ ରେ ଥିବା 4-ଅଙ୍କ OTP ମାଗନ୍ତୁ |
| `orders.otp.verify` | Start Ride | राइड शुरू करें | ରାଇଡ୍ ଆରମ୍ଭ କରନ୍ତୁ |
| `orders.otp.errors.bookingNotFound` | Booking not found. Please refresh. | बुकिंग नहीं मिली। कृपया रिफ्रेश करें। | ବୁକିଂ ମିଳିଲା ନାହିଁ। ଦୟାକରି ରିଫ୍ରେସ୍ କରନ୍ତୁ। |
| `orders.otp.errors.enterOtp` | Enter 4-digit OTP | 4-अंकों का OTP दर्ज करें | 4-ଅଙ୍କ OTP ଦିଅନ୍ତୁ |
| `orders.otp.errors.invalid` | Invalid OTP. Try again. | गलत OTP। दोबारा कोशिश करें। | ଭୁଲ OTP। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ। |
| `orders.voice.accepted` (TTS) | Ride accepted. Head to the pickup location | राइड स्वीकार हो गई। पिकअप लोकेशन की तरफ बढ़ें | ରାଇଡ୍ ଗ୍ରହଣ ହେଲା। ପିକଅପ୍ ଲୋକେସନ୍ ଆଡ଼କୁ ବଢ଼ନ୍ତୁ |
| `orders.voice.arriving` (TTS) | You have arrived at the pickup point. Waiting for rider | आप पिकअप पॉइंट पर पहुंच गए हैं। राइडर का इंतज़ार करें | ଆପଣ ପିକଅପ୍ ପଏଣ୍ଟରେ ପହଞ୍ଚିଗଲେଣି। ରାଇଡରଙ୍କୁ ଅପେକ୍ଷା କରନ୍ତୁ |
| `orders.voice.inProgress` (TTS) | Trip started. Head to the drop location | ट्रिप शुरू हो गई। ड्रॉप लोकेशन की तरफ बढ़ें | ଯାତ୍ରା ଆରମ୍ଭ ହେଲା। ଡ୍ରପ୍ ଲୋକେସନ୍ ଆଡ଼କୁ ବଢ଼ନ୍ତୁ |
| `orders.voice.completed` (TTS) | Trip completed. Great work! | ट्रिप पूरी हो गई। बढ़िया काम! | ଯାତ୍ରା ସମାପ୍ତ ହେଲା। ବହୁତ ଭଲ କାମ! |
| `orders.voice.approachingDrop` (TTS) | Approaching drop location in about 500 metres | ड्रॉप लोकेशन लगभग 500 मीटर दूर है | ଡ୍ରପ୍ ଲୋକେସନ୍ ପାଖାପାଖି 500 ମିଟର ଦୂରରେ ଅଛି |
| `orders.voice.atDrop` (TTS) | You are almost at the drop location. Prepare to stop | आप ड्रॉप लोकेशन के करीब हैं। रुकने की तैयारी करें | ଆପଣ ଡ୍ରପ୍ ଲୋକେସନ୍ ପାଖରେ ଅଛନ୍ତି। ରହିବାକୁ ପ୍ରସ୍ତୁତ ହୁଅନ୍ତୁ |
| `orders.voice.approachingPickup` (TTS) | Approaching pickup location in about 500 metres | पिकअप लोकेशन लगभग 500 मीटर दूर है | ପିକଅପ୍ ଲୋକେସନ୍ ପାଖାପାଖି 500 ମିଟର ଦୂରରେ ଅଛି |
| `orders.voice.atPickup` (TTS) | You are at the pickup location. Wait for the rider | आप पिकअप लोकेशन पर हैं। राइडर का इंतज़ार करें | ଆପଣ ପିକଅପ୍ ଲୋକେସନ୍ ରେ ଅଛନ୍ତି। ରାଇଡରଙ୍କୁ ଅପେକ୍ଷା କରନ୍ତୁ |
| `orders.alerts.cancelRideTitle` / `cancelRideMsg` | Cancel Ride / Are you sure you want to cancel this ride? Repeated cancellations may result in a temporary block. | राइड रद्द करें / क्या आप वाकई यह राइड रद्द करना चाहते हैं? बार-बार रद्द करने पर आपका अकाउंट कुछ समय के लिए ब्लॉक हो सकता है। | ରାଇଡ୍ ବାତିଲ୍ କରନ୍ତୁ / ଆପଣ ନିଶ୍ଚିତ କି ଏହି ରାଇଡ୍ ବାତିଲ୍ କରିବାକୁ ଚାହାଁନ୍ତି? ବାରମ୍ବାର ବାତିଲ୍ କଲେ ଆପଣଙ୍କର ଆକାଉଣ୍ଟ କିଛି ସମୟ ପାଇଁ ବ୍ଲକ୍ ହୋଇପାରେ। |
| `orders.completion.title` | Trip Completed! | ट्रिप पूरी हुई! | ଯାତ୍ରା ସମାପ୍ତ ହେଲା! |
| `orders.completion.sub` | Great work, {{name}} reached safely | बढ़िया काम, {{name}} सुरक्षित पहुंच गए | ବହୁତ ଭଲ, {{name}} ସୁରକ୍ଷିତ ପହଞ୍ଚିଗଲେ |
| `orders.chat.rideInProgress` / `chatUnavailable` | Ride in progress / Chat unavailable | राइड जारी है / चैट उपलब्ध नहीं है | ରାଇଡ୍ ଚାଲିଛି / ଚାଟ୍ ଉପଲବ୍ଧ ନାହିଁ |

Notes for the reviewer: `orders.voice.*` are spoken aloud by expo-speech while the driver is
driving (see `SPEECH_LOCALE` in `app/(app)/orders/index.tsx`, which maps `hi`→`hi-IN` and
`or`→`or-IN` — Odia TTS voice availability on-device is unverified and worth a real-device
check, not just a text review). `orders.nextAction.startRide` uses a middle dot (·) as a
visual separator, kept identical in both languages — confirm it doesn't read as a stray mark
in Odia.

### ⚠️ Safety / SOS — EVERY hi/or string flagged (emergency-content rule)

All of `sos.*` (component: `components/SOSButton.tsx`) — same button used on the orders map
screen (floating, during a ride) and will be reused on Help screens later. Every string here
is read/heard in a moment of potential danger, so precision over eloquence per the existing
emergency-content rule.

| Key | English | Hindi | Odia |
|---|---|---|---|
| `sos.floatingLabel` | SOS | SOS | SOS |
| `sos.inlineTitle` / `inlineSub` | In immediate danger? / Tap for Emergency SOS | तुरंत खतरे में हैं? / इमरजेंसी SOS के लिए टैप करें | ତୁରନ୍ତ ବିପଦରେ ଅଛନ୍ତି? / ଜରୁରୀକାଳୀନ SOS ପାଇଁ ଟାପ୍ କରନ୍ତୁ |
| `sos.sheetTitle` / `sheetSub` | 🚨 Emergency SOS / Are you in danger? Choose an action: | 🚨 इमरजेंसी SOS / क्या आप खतरे में हैं? एक विकल्प चुनें: | 🚨 ଜରୁରୀକାଳୀନ SOS / ଆପଣ ବିପଦରେ ଅଛନ୍ତି କି? ଏକ କାର୍ଯ୍ୟ ବାଛନ୍ତୁ: |
| `sos.callPolice` | 📞 Call Police (112) | 📞 पुलिस को कॉल करें (112) | 📞 ପୋଲିସକୁ କଲ୍ କରନ୍ତୁ (112) |
| `sos.callAmbulance` | 📞 Call Ambulance (108) | 📞 एम्बुलेंस को कॉल करें (108) | 📞 ଆମ୍ବୁଲାନ୍ସକୁ କଲ୍ କରନ୍ତୁ (108) |
| `sos.shareLocation` | 📤 Share Live Location | 📤 लाइव लोकेशन शेयर करें | 📤 ଲାଇଭ୍ ଲୋକେସନ୍ ସେୟାର୍ କରନ୍ତୁ |
| `sos.alertSupport` | 🎧 Alert bogie Support | 🎧 bogie सपोर्ट को सूचित करें | 🎧 bogie ସପୋର୍ଟକୁ ସୂଚିତ କରନ୍ତୁ |
| `sos.emergencyMessage` | 🚨 EMERGENCY! I need help. I'm on a bogie trip. My live location: {{link}}\nBooking: #{{id}} | 🚨 इमरजेंसी! मुझे मदद चाहिए। मैं एक bogie ट्रिप पर हूं। मेरी लाइव लोकेशन: {{link}}\nबुकिंग: #{{id}} | 🚨 ଜରୁରୀକାଳୀନ! ମୋତେ ସାହାଯ୍ୟ ଦରକାର। ମୁଁ ଏକ bogie ଯାତ୍ରାରେ ଅଛି। ମୋର ଲାଇଭ୍ ଲୋକେସନ୍: {{link}}\nବୁକିଂ: #{{id}} |
| `sos.riderLine` | Rider: {{name}} | राइडर: {{name}} | ରାଇଡର୍: {{name}} |
| `sos.shareLocationTitle` / `shareLocationMsg` | Share Location / Send emergency alert to {{name}}? | लोकेशन शेयर करें / {{name}} को इमरजेंसी अलर्ट भेजें? | ଲୋକେସନ୍ ସେୟାର୍ କରନ୍ତୁ / {{name}} ଙ୍କୁ ଜରୁରୀକାଳୀନ ଆଲର୍ଟ ପଠାଇବେ? |
| `sos.supportHelpTitle` / `supportHelpMsg` | ✅ Help is on the way / bogie support has been alerted with your location and ride details. Stay calm — help is on the way. | ✅ मदद आ रही है / bogie सपोर्ट को आपकी लोकेशन और राइड की जानकारी के साथ सूचित कर दिया गया है। शांत रहें — मदद आ रही है। | ✅ ସାହାଯ୍ୟ ଆସୁଛି / bogie ସପୋର୍ଟକୁ ଆପଣଙ୍କର ଲୋକେସନ୍ ଏବଂ ରାଇଡ୍ ବିବରଣୀ ସହିତ ସୂଚିତ କରାଯାଇଛି। ଶାନ୍ତ ରୁହନ୍ତୁ — ସାହାଯ୍ୟ ଆସୁଛି। |
| `sos.supportQueuedTitle` / `supportQueuedMsg` | Alert queued / We couldn't reach support right now. If this is urgent, please call 112 directly. | अलर्ट भेजा जा चुका है / अभी हम सपोर्ट तक नहीं पहुंच पाए। अगर यह ज़रूरी है, तो कृपया सीधे 112 पर कॉल करें। | ଆଲର୍ଟ ପଠାଯାଇଛି / ଆମେ ବର୍ତ୍ତମାନ ସପୋର୍ଟ ପାଖରେ ପହଞ୍ଚିପାରିଲୁ ନାହିଁ। ଏହା ଜରୁରୀ ହେଲେ, ଦୟାକରି ସିଧାସଳଖ 112 କୁ କଲ୍ କରନ୍ତୁ। |

Note: `sos.emergencyMessage` and `sos.riderLine` are concatenated in JS with a plain-text
`(phone)` suffix and a `\n` line break — not part of the translated string itself, so the
translated portions stay grammatically self-contained. Confirm during review that this still
reads correctly once the phone number and rider line are appended.

### ⚠️ Earnings / payout / wallet — EVERY hi/or string flagged (money-content rule)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `common.fareAmount` | Rs.{{amount}} | Rs.{{amount}} | Rs.{{amount}} |
| `home.stats.title` / `rating` / `totalRides` | Your Stats / Rating / Total Rides | आपके आंकड़े / रेटिंग / कुल राइड्स | ଆପଣଙ୍କର ଆଙ୍କଡ଼ା / ରେଟିଂ / ମୋଟ ରାଇଡ୍ |
| `home.blockedBanner.text` | 🚫 Account suspended — wallet below -₹1,000. Contact support to clear dues. | 🚫 अकाउंट सस्पेंड — वॉलेट -₹1,000 से नीचे। बकाया चुकाने के लिए सपोर्ट से संपर्क करें। | 🚫 ଆକାଉଣ୍ଟ ସସ୍ପେଣ୍ଡ — ୱାଲେଟ୍ -₹1,000ରୁ କମ୍। ବକେୟା ପାଇଁ ସପୋର୍ଟ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ। |
| `home.blockedBanner.link` | View Ledger → | लेजर देखें → | ଲେଜର୍ ଦେଖନ୍ତୁ → |
| `orders.sheet.fareTitle` / `estimated` / `yourEarnings` | Fare / Estimated / Your earnings (80%) | किराया / अनुमानित / आपकी कमाई (80%) | ଭଡ଼ା / ଆକଳିତ / ଆପଣଙ୍କର ରୋଜଗାର (80%) |
| `orders.completion.totalFare` / `yourEarnings` | Total Fare / Your Earnings | कुल किराया / आपकी कमाई | ମୋଟ ଭଡ଼ା / ଆପଣଙ୍କର ରୋଜଗାର |

Note: `common.fareAmount` keeps the `Rs.` prefix identical across all three languages
(matches the existing English-source convention in `orders/index.tsx`, which uses `Rs.`
rather than the `₹` symbol used elsewhere in the app — pre-existing inconsistency, not
introduced by this batch). The 80%-split disclosure (`yourEarnings`) is the single most
money-sensitive string in this batch — a driver misreading their cut vs. the total fare is
exactly the failure mode this rule exists to catch.

### Other Batch 1 items flagged for Odia review (non-critical, lower priority)

- `auth.login.consentTermsPrefix` / `consentTDSPrefix` — long legal-consent sentences split
  across three translation keys (prefix + link text + "and") so the tappable link text stays
  a separate `<Text onPress>`. Confirm the Odia prefix still reads as one flowing sentence
  once the link text is inserted mid-sentence by React.
- `home.tips.item2` — "High demand: Connaught Place, Cyber Hub" keeps the place names in
  Latin script inside the Odia sentence (`ଅଧିକ ଚାହିଦା: କନଅଟ୍ ପ୍ଲେସ୍, ସାଇବର୍ ହବ୍`) —
  transliterated rather than left in English; confirm this is what an Odisha-based driver
  would expect to see for Delhi-NCR place names.
- `orders.chat.quickReplies` — stored as a JSON array (not the usual comma-joined string)
  because one item ("Traffic delay, on my way") contains a literal comma; read via
  `t(..., { returnObjects: true })`. Confirm the Odia phrasing of "ଟ୍ରାଫିକ୍ ଯୋଗୁଁ ଡେରି
  ହେଉଛି, ଆସୁଛି" still reads as a natural quick-reply chip, not a full sentence.

## Batch 2 — driver onboarding: signup, OTP, vehicle-select, register (personal/vehicle/documents/bank)

Covers `app/(auth)/driver-signup.tsx`, `driver-otp.tsx`, `driver-vehicle-select.tsx`,
`driver-register.tsx` — the full "new driver installs app → fully registered" flow. No
ride-status/tracking or SOS strings in this batch (out of scope for onboarding). The
user extended the money-content rule to bank/financial fields for this batch: "a driver
mistyping bank details because a label was ambiguous is a payout failure" — so every
bank/KYC field label, format hint, and validation error below gets full hi/or coverage.

### ⚠️ Bank & financial fields — EVERY hi/or string flagged (money-content rule extension)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `register.bank.sectionTitle` | Bank Account Details | बैंक खाते की जानकारी | ବ୍ୟାଙ୍କ ଆକାଉଣ୍ଟ ବିବରଣୀ |
| `register.bank.sectionNote` | Earnings transferred weekly to your account | कमाई हर हफ्ते आपके खाते में ट्रांसफर होती है | ରୋଜଗାର ପ୍ରତି ସପ୍ତାହ ଆପଣଙ୍କ ଆକାଉଣ୍ଟକୁ ଟ୍ରାନ୍ସଫର୍ ହୁଏ |
| `register.bank.accountHolder` | ACCOUNT HOLDER NAME * | खाताधारक का नाम * | ଆକାଉଣ୍ଟ ଧାରକଙ୍କ ନାମ * |
| `register.bank.accountHolderPh` | As per bank records | बैंक रिकॉर्ड के अनुसार | ବ୍ୟାଙ୍କ ରେକର୍ଡ ଅନୁସାରେ |
| `register.bank.accountNumber` | ACCOUNT NUMBER * | खाता नंबर * | ଆକାଉଣ୍ଟ ନମ୍ବର * |
| `register.bank.ifsc` | IFSC CODE * | IFSC कोड * | IFSC କୋଡ୍ * |
| `register.bank.bankName` | BANK NAME * | बैंक का नाम * | ବ୍ୟାଙ୍କ ନାମ * |
| `register.bank.upi` | UPI ID (optional) | UPI ID (वैकल्पिक) | UPI ID (ଇଚ୍ଛାଧୀନ) |
| `register.alerts.fillBank` | Fill all bank details | सभी बैंक जानकारी भरें | ସମସ୍ତ ବ୍ୟାଙ୍କ ବିବରଣୀ ପୂରଣ କରନ୍ତୁ |
| `register.vehicle.gstNumber` | GST NUMBER * | GST नंबर * | GST ନମ୍ବର * |
| `register.alerts.gstRequired` | GST number required | GST नंबर आवश्यक है | GST ନମ୍ବର ଆବଶ୍ୟକ |
| `register.commonDocs.aadhaar.numberLabel` | Aadhaar Number | आधार नंबर | ଆଧାର ନମ୍ବର |
| `register.commonDocs.aadhaar.numberPlaceholder` | 12-digit number | 12 अंकों का नंबर | 12-ଅଙ୍କ ନମ୍ବର |
| `register.commonDocs.pan_card.numberLabel` | PAN Number | पैन नंबर | ପାନ୍ ନମ୍ବର |
| `register.commonDocs.bank_passbook.label` | Bank Passbook / Cheque | बैंक पासबुक / चेक | ବ୍ୟାଙ୍କ ପାସବୁକ୍ / ଚେକ୍ |
| `register.commonDocs.bank_passbook.numberLabel` | Account Number | खाता नंबर | ଆକାଉଣ୍ଟ ନମ୍ବର |
| `register.alerts.missingDocsTitle` / `missingDocsMsg` | Missing documents / Please upload: {{list}} | दस्तावेज़ अधूरे हैं / कृपया अपलोड करें: {{list}} | ଡକ୍ୟୁମେଣ୍ଟ ଅଧୁରା / ଦୟାକରି ଅପଲୋଡ୍ କରନ୍ତୁ: {{list}} |
| `register.alerts.submittedPartial` | {{uploaded}} document(s) uploaded, {{failed}} failed... | {{uploaded}} दस्तावेज़ अपलोड हुए, {{failed}} असफल रहे... | {{uploaded}} ଡକ୍ୟୁମେଣ୍ଟ ଅପଲୋଡ୍ ହେଲା, {{failed}} ବିଫଳ ହେଲା... |
| `register.alerts.submitErrorMsg` | Registration failed. Try again. | पंजीकरण असफल रहा। फिर से कोशिश करें। | ପଞ୍ଜୀକରଣ ବିଫଳ ହେଲା। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ। |

### ⚠️ Legal attestation — MVAG self-declaration (native review required)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `register.bank.mvagDeclaration` | I declare that I have not been convicted in the last 3 years of driving under the influence of alcohol or drugs, and have never been convicted of any cognizable offence including fraud, sexual offences, or use of criminal force. | मैं घोषणा करता/करती हूं कि पिछले 3 वर्षों में मुझे शराब या नशीले पदार्थों के प्रभाव में वाहन चलाने का दोषी नहीं ठहराया गया है, और मुझे धोखाधड़ी, यौन अपराध या आपराधिक बल के प्रयोग सहित किसी भी संज्ञेय अपराध का कभी दोषी नहीं ठहराया गया है। | ମୁଁ ଘୋଷଣା କରୁଛି ଯେ ଗତ 3 ବର୍ଷରେ ମୁଁ ମଦ ବା ନିଶାଜାତ ପଦାର୍ଥର ପ୍ରଭାବରେ ଗାଡ଼ି ଚଳାଇବା ପାଇଁ ଦୋଷୀ ସାବ୍ୟସ୍ତ ହୋଇନାହିଁ, ଏବଂ ପ୍ରତାରଣା, ଯୌନ ଅପରାଧ କିମ୍ବା ଆପରାଧିକ ବଳ ପ୍ରୟୋଗ ସହିତ କୌଣସି ଜ୍ଞାତସାର ଅପରାଧରେ କେବେ ହେଁ ଦୋଷୀ ସାବ୍ୟସ୍ତ ହୋଇନାହିଁ। |

This is a legal self-attestation the driver signs by ticking a checkbox — a mistranslation
here has legal/compliance weight beyond the usual UX risk, so it needs native-speaker
verification rather than just glossary-consistency review like other Batch 2 strings.

Numeric format placeholders that are literal masks/example codes (`XXXXXXXXXXXXXXXX`,
`SBIN0001234`, `22AAAAA0000A1Z5`, `DL01AB1234567`, `INS-XXXXXXXXXX`, etc.) are left
as-is in all three languages — they're alphanumeric format examples, not prose, same
treatment as Batch 1's non-translated API/data strings. Only `aadhaar.numberPlaceholder`
("12-digit number") is descriptive text and got translated.

The MVAG self-declaration (`register.bank.mvagDeclaration`) is a legal consent statement
the driver must read and tick — translated in full (same treatment as the login-screen
Terms/TDS consent checkboxes in Batch 1), NOT treated as "legal body text." By contrast,
the 8-clause Terms & Conditions block shown in the same step (`driver-register.tsx`,
the numbered `termsText` string) is a full pasted legal document — chrome only
(`bank.termsTitle`, `bank.agreeTerms`) is translated; the clause body stays English
per the legal-screens rule. Word count of the untranslated body: ~110 words.

### Other Batch 2 items flagged for Odia review (non-critical, lower priority)

- `auth.vehicleSelect.options.*` and `auth.register.vehicleDocs.*` — vehicle/document
  catalog data (15 vehicle sub-types, 25 document entries across 5 vehicle-doc sets) is
  now built with `t()` inside the component instead of as a module-level constant (it
  was a hardcoded picker/data-map, the exact "late catch" pattern flagged in the Phase 3
  kickoff). Confirm technical/certificate terms (BLS, ALS, EMT, PUC, RC, GST) that stay
  in Latin script mid-Odia-sentence read naturally to an Odisha-based driver.
- Vehicle registration & doc-selection display: `driver-register.tsx` now re-translates
  the selected vehicle label from its slug at render time (`displayVehicleLabel`) instead
  of trusting the label string persisted to `AsyncStorage` during vehicle-select — this
  avoids showing a stale-language label if the driver changes app language between
  vehicle-select and the register screen. Falls back to the stored label only if the
  slug isn't found in the current language's catalog.
- Fuel type chips (Petrol/Diesel/CNG/LPG/Electric) are intentionally left untranslated
  in all three languages — these are used as-is (Latin script) in Indian vehicle
  registration contexts even in Hindi/Odia speech and paperwork.
- `register.commonDocs.police_clearance.note` — mentions "Delhi Police Citizen Services"
  (a proper-noun service name) kept in English inside the Hindi/Odia sentence; confirm
  this is the correct convention vs. transliterating.

## Batch 3 — money cluster: earnings, documents, notifications, ledger, payments

Covers `app/(app)/earnings/index.tsx`, `documents/index.tsx`, `notifications/index.tsx`,
`profile/ledger.tsx`, `profile/payments.tsx`. Every earnings/payout/ledger/payment-related
string below gets full hi+or coverage per the money-content rule.

### ⚠️ Earnings, ledger & payment fields — EVERY hi/or string flagged (money-content rule)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `earnings.pageTitle` | Earnings | कमाई | ରୋଜଗାର |
| `earnings.earned` / `debited` / `net` | Earned / Debited / Net | कमाया / डेबिट हुआ / नेट | ରୋଜଗାର ହେଲା / ଡେବିଟ୍ ହେଲା / ନେଟ୍ |
| `earnings.thisWeek` | THIS WEEK | इस हफ्ते | ଏହି ସପ୍ତାହ |
| `earnings.earningsLabel` / `timeSpent` / `tripsTaken` | Earnings / Time Spent / Trips Taken | कमाई / बिताया समय / पूरी की गई ट्रिप | ରୋଜଗାର / ବିତାଇଥିବା ସମୟ / ସମ୍ପୂର୍ଣ୍ଣ ଟ୍ରିପ୍ |
| `earnings.todaySummary` | TODAY'S SUMMARY | आज का सारांश | ଆଜିର ସାରାଂଶ |
| `earnings.trip` / `earnings.trips` | Trip / TRIPS | ट्रिप / ट्रिप्स | ଟ୍ରିପ୍ / ଟ୍ରିପ୍ |
| `profile.ledger.balanceLabel` | Ledger balance | लेजर बैलेंस | ଲେଜର୍ ବାଲାନ୍ସ |
| `profile.ledger.blockedText` | Account suspended — wallet below -₹1,000... | खाता निलंबित — वॉलेट -₹1,000 से कम है... | ଆକାଉଣ୍ଟ ନିଲମ୍ବିତ — ୱାଲେଟ୍ -₹1,000 ରୁ କମ୍ ଅଛି... |
| `profile.ledger.lowBalanceText` | Below minimum balance — maintain ₹500 to withdraw. | न्यूनतम बैलेंस से कम — निकालने के लिए ₹500 बनाए रखें। | ସର୍ବନିମ୍ନ ବାଲାନ୍ସରୁ କମ୍ — ଉଠାଇବା ପାଇଁ ₹500 ବଜାୟ ରଖନ୍ତୁ। |
| `profile.ledger.withdraw` | Withdraw ₹{{amount}} | ₹{{amount}} निकालें | ₹{{amount}} ଉଠାନ୍ତୁ |
| `profile.ledger.clearDues` | Clear Dues | बकाया चुकाएं | ବକେୟା ପରିଶୋଧ କରନ୍ତୁ |
| `profile.ledger.maintainInfo` | Maintain ₹500 ledger balance to withdraw money | निकालने के लिए ₹500 लेजर बैलेंस बनाए रखें | ଉଠାଇବା ପାଇଁ ₹500 ଲେଜର୍ ବାଲାନ୍ସ ବଜାୟ ରଖନ୍ତୁ |
| `profile.ledger.totalEarnings` / `totalRides` | Total Earnings / Total Rides | कुल कमाई / कुल राइड्स | ମୋଟ ରୋଜଗାର / ମୋଟ ରାଇଡ୍ |
| `profile.ledger.entryLabels.registrationFee` | Registration Fee | पंजीकरण शुल्क | ପଞ୍ଜୀକରଣ ଶୁଳ୍କ |
| `profile.ledger.entryLabels.commission` | bogie Commission (20%) | bogie कमीशन (20%) | bogie କମିଶନ୍ (20%) |
| `profile.ledger.entryLabels.tripEarnings` | Trip Earnings | ट्रिप कमाई | ଟ୍ରିପ୍ ରୋଜଗାର |
| `profile.ledger.entryLabels.referralBonus` | Referral Bonus — friend's first trip | रेफ़रल बोनस — दोस्त की पहली ट्रिप | ରେଫରାଲ୍ ବୋନସ୍ — ସାଙ୍ଗର ପ୍ରଥମ ଟ୍ରିପ୍ |
| `profile.ledger.crn` | CRN {{crn}} | CRN {{crn}} | CRN {{crn}} |
| `profile.ledger.noTransactions` / `noTransactionsSub` | No transactions yet / Complete trips to see your ledger | अभी तक कोई लेनदेन नहीं / अपना लेजर देखने के लिए ट्रिप पूरी करें | ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଲେନଦେନ ନାହିଁ / ଆପଣଙ୍କର ଲେଜର୍ ଦେଖିବାକୁ ଟ୍ରିପ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ |
| `profile.ledger.downloadStatement` | Download Statement | विवरण डाउनलोड करें | ବିବରଣୀ ଡାଉନଲୋଡ୍ କରନ୍ତୁ |
| `profile.ledger.downloadErrorMsg` | Could not download statement. Try again. | स्टेटमेंट डाउनलोड नहीं हो सका। फिर से कोशिश करें। | ବିବରଣୀ ଡାଉନଲୋଡ୍ ହୋଇପାରିଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ। |
| `profile.payments.tripEarnings` | Trip Earnings | ट्रिप कमाई | ଟ୍ରିପ୍ ରୋଜଗାର |
| `profile.payments.crnDesc` | CRN: {{crn}} · {{drop}} | CRN: {{crn}} · {{drop}} | CRN: {{crn}} · {{drop}} |
| `profile.payments.success` | Success | सफल | ସଫଳ |
| `profile.payments.noPaymentsYet` / `noPaymentsSub` | No payments yet / Complete trips to see earnings here | अभी तक कोई भुगतान नहीं / यहां कमाई देखने के लिए ट्रिप पूरी करें | ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପେମେଣ୍ଟ ନାହିଁ / ଏଠାରେ ରୋଜଗାର ଦେଖିବାକୁ ଟ୍ରିପ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ |

`profile.ledger.entryLabels.commission` and the `bogie` app-update alert intentionally keep
the brand name "bogie" untranslated in all three languages, consistent with existing
Batch 1/2 convention (brand names stay Latin-script).

Amounts themselves (`₹{{amount}}`, `Math.round(...)`) are not translated strings — only the
labels wrapping them are. Numerals render in Western Arabic digits in all three languages
(no Devanagari/Odia numeral conversion), matching the existing `common.fareAmount` convention
from Batch 1.

### Other Batch 3 items flagged for Odia review (non-critical, lower priority)

- `earnings.days.*` — weekday abbreviations (Mon/Tue/.../Sun) used in the day-selector strip.
  Translated as full short-form weekday names in Hindi/Odia (सोम/मंगल/... , ସୋମ/ମଙ୍ଗଳ/...)
  rather than transliterating the English abbreviation — confirm these read naturally as
  a horizontal 3-letter-width day strip in Odia, since Odia short-forms may run wider than
  the Latin 3-letter originals and could wrap/truncate in the UI.
- `notifications.timeAgo.*` and `earnings`/`ledger`/`payments` date/time helpers
  (`fmtDate`, `fmtTime`, `lastSixMonths`) were checked against the "date formatting outside
  components" risk flagged in the kickoff (the pattern user-app Batch 3 caught). Found:
  `timeAgo()` in `notifications/index.tsx` was a module-level function returning hardcoded
  English strings ("just now", "5m ago") — fixed by passing `t` in as a parameter, same
  precedent already established in `user-app/app/(app)/notifications/index.tsx`. The
  `toLocaleDateString("en-IN", ...)` / `toLocaleTimeString("en-IN", ...)` calls themselves
  (weekday/month names, digit formatting) were deliberately left as `en-IN` in all three
  languages, matching the existing user-app convention (`user-app/app/(app)/history/index.tsx`)
  of keeping Intl date formatting in English while translating the surrounding prose —
  Hermes/RN's `Intl` support for `hi-IN`/`or-IN` is inconsistent, so this was already the
  established pattern rather than a new decision.
- `earnings/index.tsx`'s `VEHICLE_TYPES`-style hardcoded picker pattern check: `DAY_NAMES`
  (day-of-week array) and `documents/index.tsx`'s `STATUS_CONFIG` (approval-status label map)
  and `notifications/index.tsx`'s `CATEGORIES` (filter-pill labels) were all module-level
  constants holding hardcoded English labels — same late-catch pattern as Batch 2's vehicle/doc
  catalogs. All three rebuilt to derive labels via `t()` either inside the component body
  (`STATUS_CONFIG`, `CATEGORIES`) or via a `_KEYS`/`_META` constant of stable identifiers only,
  with display strings resolved through `t()` at render time (`DAY_NAMES`).
- `documents.pendingCount` uses i18next plural suffixes (`pendingCount` / `pendingCount_other`)
  for the "N document(s) pending" progress text — confirm the Hindi/Odia singular forms
  ("1 दस्तावेज़ बाकी है" / "1 ଡକ୍ୟୁମେଣ୍ଟ ବାକି ଅଛି") read naturally; Odia doesn't grammatically
  distinguish singular/plural the way Hindi/English do, so both `pendingCount` and
  `pendingCount_other` are identical Odia text by design, not an oversight.

## Batch 4 (FINAL) — profile tail (contact, edit, help, refer, terms, training, privacy), support (index/chat/new), app/index, referral, +not-found

Covers everything remaining in driver-app. `profile/help.tsx` contains ambulance-related FAQ
content (an "Ambulance" emergency number plus an earnings FAQ section), so it gets full hi+or
coverage under both the emergency-content rule and the money-content rule. `profile/refer.tsx`
carries referral bonus amounts — money-content rule. `profile/training.tsx`'s "Safety Guidelines"
module is safety-training content, treated the same as the emergency-content rule. `terms.tsx`
and `privacy.tsx` stay chrome-only per the existing legal-screens rule, with body word counts
logged below. `app/referral.tsx` and `app/+not-found.tsx` are silent redirect screens with no
user-visible text — nothing to translate.

### ⚠️ Ambulance/emergency + earnings FAQ — EVERY hi/or string flagged (emergency-content + money-content rules)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `profile.help.emergencyNumbers.police` / `ambulance` | Police / Ambulance | पुलिस / एम्बुलेंस | ପୋଲିସ୍ / ଆମ୍ବୁଲାନ୍ସ |
| `profile.help.contactHint` | When you use Share Live Location in an SOS, we'll offer to send it straight to this contact via SMS. | जब आप SOS में लाइव लोकेशन शेयर करेंगे, तो हम इसे सीधे इस संपर्क को SMS से भेजने का विकल्प देंगे। | ଯେତେବେଳେ ଆପଣ SOS ରେ ଲାଇଭ୍ ଲୋକେସନ୍ ସେୟାର୍ କରିବେ, ଆମେ ଏହାକୁ ସିଧାସଳଖ ଏହି ସମ୍ପର୍କଙ୍କୁ SMS ମାଧ୍ୟମରେ ପଠାଇବାର ପ୍ରସ୍ତାବ ଦେବୁ। |
| `profile.help.faq.earnings.paid.q` / `.a` | When do I get paid? / Earnings accumulate in your ledger account. You can withdraw when your balance exceeds ₹500. | मुझे भुगतान कब मिलता है? / कमाई आपके लेजर खाते में जमा होती जाती है। जब आपका बैलेंस ₹500 से ज़्यादा हो जाए, तब आप निकाल सकते हैं। | ମୋତେ କେବେ ପେମେଣ୍ଟ ମିଳିବ? / ରୋଜଗାର ଆପଣଙ୍କର ଲେଜର୍ ଖାତାରେ ଜମା ହୋଇଥାଏ। ବାଲାନ୍ସ ₹500 ରୁ ଅଧିକ ହେଲେ ଆପଣ ଉଠାଇପାରିବେ। |
| `profile.help.faq.earnings.commission.q` / `.a` | What is the commission structure? / bogie charges 20% commission per trip. You keep 80% of the fare, credited directly to your ledger. | कमीशन कैसे तय होता है? / bogie हर ट्रिप पर 20% कमीशन लेता है। बाकी 80% किराया सीधे आपके लेजर में जमा होता है। | କମିଶନ୍ ଢାଞ୍ଚା କ'ଣ? / bogie ପ୍ରତ୍ୟେକ ଟ୍ରିପ୍‌ରେ 20% କମିଶନ୍ ନେଇଥାଏ। ବାକି 80% ଭଡା ସିଧାସଳଖ ଆପଣଙ୍କର ଲେଜର୍‌ରେ ଜମା ହୁଏ। |
| `profile.help.faq.earnings.negativeBalance.q` / `.a` | Why is my ledger balance negative? / A negative balance means you have outstanding dues to bogie. Clear dues to resume withdrawals. | मेरा लेजर बैलेंस नेगेटिव क्यों है? / नेगेटिव बैलेंस का मतलब है कि आपका bogie पर कुछ बकाया है। निकासी फिर से शुरू करने के लिए बकाया चुकाएं। | ମୋର ଲେଜର୍ ବାଲାନ୍ସ ନେଗେଟିଭ୍ କାହିଁକି? / ନେଗେଟିଭ୍ ବାଲାନ୍ସର ଅର୍ଥ ହେଉଛି bogie ପାଖରେ ଆପଣଙ୍କର କିଛି ବକେୟା ଅଛି। ଉଠାଇବା ପୁଣି ଆରମ୍ଭ କରିବାକୁ ବକେୟା ପରିଶୋଧ କରନ୍ତୁ। |

All other `profile.help.faq.*` entries (ride issues, documents, technical) are non-money,
non-emergency FAQ content and were translated to the same glossary/register standard but not
flagged for mandatory native review — listed here for completeness of what shipped:
`rideIssues.accept`, `rideIssues.cancel`, `documents.rejected`, `documents.verifyTime`,
`technical.noRides`, `technical.gpsInaccurate`.

### ⚠️ Referral bonus amounts — EVERY hi/or string flagged (money-content rule)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `profile.refer.heroTitle` | Refer a driver, earn ₹50! | एक ड्राइवर को रेफर करें, ₹50 कमाएं! | ଏକ ଡ୍ରାଇଭରକୁ ରେଫର୍ କରନ୍ତୁ, ₹50 ରୋଜଗାର କରନ୍ତୁ! |
| `profile.refer.heroSub` | You get ₹50 when they complete their first trip. Plus ₹25 when THEY refer another driver too! | जब वे अपनी पहली ट्रिप पूरी करेंगे तो आपको ₹50 मिलेंगे। और अगर वे किसी और को रेफर करते हैं, तो ₹25 और मिलेंगे! | ସେମାନେ ପ୍ରଥମ ଟ୍ରିପ୍ ସମ୍ପୂର୍ଣ୍ଣ କଲେ ଆପଣ ₹50 ପାଇବେ। ଆଉ ସେମାନେ ଅନ୍ୟ ଡ୍ରାଇଭରକୁ ରେଫର୍ କଲେ ₹25 ମଧ୍ୟ ମିଳିବ! |
| `profile.refer.shareMessage` | 🚖 Drive with bogie! Use my referral code *{{code}}* when signing up and start earning. Download: {{link}} | 🚖 bogie के साथ ड्राइव करें! साइन अप करते समय मेरा रेफ़रल कोड *{{code}}* इस्तेमाल करें और कमाई शुरू करें। डाउनलोड करें: {{link}} | 🚖 bogie ସହିତ ଡ୍ରାଇଭ୍ କରନ୍ତୁ! ସାଇନ୍ ଅପ୍ କରିବା ସମୟରେ ମୋର ରେଫରାଲ୍ କୋଡ୍ *{{code}}* ବ୍ୟବହାର କରନ୍ତୁ ଏବଂ ରୋଜଗାର ଆରମ୍ଭ କରନ୍ତୁ। ଡାଉନଲୋଡ୍ କରନ୍ତୁ: {{link}} |
| `profile.refer.driversJoined` / `earned` / `pending` | Drivers Joined / Earned / Pending | जुड़े ड्राइवर / कमाई / बकाया | ଯୋଗଦେଇଥିବା ଡ୍ରାଇଭର୍ / ରୋଜଗାର / ବକେୟା |
| `profile.refer.status.pending` / `credited` | ⏳ Pending first trip / ✅ Credited | ⏳ पहली ट्रिप बाकी / ✅ जमा हो गया | ⏳ ପ୍ରଥମ ଟ୍ରିପ୍ ବାକି / ✅ ଜମା ହୋଇଗଲା |

### ⚠️ Safety-training module — EVERY hi/or string flagged (emergency-content rule extension to training)

| Key | English | Hindi | Odia |
|---|---|---|---|
| `profile.training.modules.safetyGuidelines.title` | Safety Guidelines | सुरक्षा दिशानिर्देश | ସୁରକ୍ଷା ନିର୍ଦ୍ଦେଶାବଳୀ |
| `...items.roadSafety` | Road safety and passenger safety | सड़क और यात्री सुरक्षा | ରାସ୍ତା ଏବଂ ଯାତ୍ରୀ ସୁରକ୍ଷା |
| `...items.trafficRules` | Traffic rules reminder | ट्रैफिक नियमों की याद | ଟ୍ରାଫିକ୍ ନିୟମର ସ୍ମରଣ |
| `...items.emergencyProcedures` | Emergency procedures | आपातकालीन प्रक्रियाएं | ଜରୁରୀକାଳୀନ ପ୍ରକ୍ରିୟା |
| `...items.accidentReporting` | Accident reporting | दुर्घटना की रिपोर्ट करना | ଦୁର୍ଘଟଣା ରିପୋର୍ଟ କରିବା |

The other four training modules (Getting Started, Customer Service, Earnings & Payments,
Advanced Tips) are non-safety content, translated to standard glossary/register but not
flagged for mandatory native review.

### Legal screens — chrome only, body stays English (legal-screens rule)

- `profile/terms.tsx` (`profile.terms.title` translated) — body word count: **~130 words**
  (11 bullet lists + section prose, "AGREEMENT TO TERMS" through "CONTACT").
- `profile/privacy.tsx` (`profile.privacy.title` translated) — body word count: **~270 words**
  (13 numbered sections including the Grievance Officer block naming Anjali Aggarwal).
- Both counts are approximate (regex-based word count over `s.body`/`s.bullet`/`s.sectionHeader`
  Text blocks, template literals stripped) — same methodology as user-app's legal word counts,
  provided as an order-of-magnitude sanity check for translation-scope decisions, not a
  certified count.

### Other Batch 4 items flagged for Odia review (non-critical, lower priority)

- `app/index.tsx`'s splash-screen "DRIVER" tag now reuses the existing `auth.login.driverBadge`
  key (already translated — "ड्राइवर" / "ଡ୍ରାଇଭର୍") instead of a second hardcoded literal,
  found during the full-app sweep.
- `profile/edit.tsx`'s `LANGUAGES` picker list (English, Hindi, Telugu, Tamil, Bengali,
  Marathi) is intentionally left untranslated in all three locales — these are language
  *names* offered as picker options, and translating a language's own name into a different
  script (e.g. rendering "Telugu" in Odia script) was judged to reduce recognizability rather
  than help; the surrounding chrome (labels, "Change" button, alert title) is fully translated.
  Flagging this as a judgment call worth a second opinion, not a settled convention.
- `profile/contact.tsx`'s office address ("Aggarwal Publicity and Marketing Pvt. Ltd., New
  Delhi, Delhi - 110001") kept as English proper nouns/address, consistent with how the same
  company name/address is handled in the terms/privacy legal screens.
- `support/index.tsx`'s per-ticket `timeAgo()` helper was already component-scoped (not
  module-level), so no "date formatting outside components" fix was needed here — but its
  `tickets.map(t => ...)` callback parameter shadowed the `t` translation function from
  `useTranslation()`; renamed to `tk` to avoid a silent bug where `t()` calls inside the map
  would have thrown or resolved against the wrong scope. Caught during editing, not by tsc
  (both are functions, so it wouldn't have been a type error) — worth a targeted look if any
  ticket-status text seems to fail to render.
- `support/index.tsx` and `support/chat.tsx` ticket-status text (`open`/`in_progress`/`resolved`)
  was a hardcoded `.replace(/_/g, " ")` fallback for non-resolved statuses — same
  hardcoded-status-label-map pattern flagged in the kickoff; added explicit
  `support.status.open` / `support.status.inProgress` keys alongside the existing `resolved`
  case instead of leaving `in_progress` → "in progress" as an untranslated fallback.
- `support/chat.tsx`'s `QUICK_ISSUES` and `support/new.tsx`'s `CATEGORIES` were both
  module-level hardcoded arrays (the same late-catch data-map pattern from Batches 2/3) —
  both rebuilt as `_KEYS`/`_META` constants of stable identifiers with labels resolved via
  `t()` inside the component. The two screens share the same `support.quickIssues.*` key
  namespace for the 8 issue labels, so wording stays identical between the ticket-list
  quick-reply picker and the new-chat category grid.

### Full-app sweep catches (outside the originally scoped Batch 4 file list)

Two files weren't in the kickoff's file list but were found untranslated during the
whole-repo grep sweep after Batch 4's scoped files were done:

- **`profile/index.tsx`** (the profile hub/menu screen) — was entirely untranslated: hero
  card "Edit Profile" button, "Chat with Support" card, the sign-out confirmation Alert, and
  all 4 quick-action + 8 menu-item labels. Fixed by translating in place. Every menu/quick-action
  label reuses the title key already defined on its destination screen
  (`profile.refer.title`, `notifications.title`, `profile.edit.title`, `profile.settings.title`,
  `profile.privacy.title`, `profile.terms.title`, `profile.help.title`, `profile.contact.title`,
  `earnings.pageTitle`, `profile.ledger.title`, `profile.payments.title`,
  `profile.training.title`) rather than new duplicate strings — guarantees the label on the
  hub always matches the header on the screen it opens. New keys added under `profile.home.*`
  for the 3 strings with no other home: `signOutTitle`, `signOutMsg`, `chatWithSupport`,
  `supportSub`, `version`.
- **`components/ErrorBoundary.tsx`** — the app-crash fallback screen ("Something went wrong" /
  "Try Again") was hardcoded English. This is a class component, so it can't use the
  `useTranslation()` hook; fixed by importing the i18next singleton directly
  (`import i18n from "@/i18n"` → `i18n.t("errorBoundary.title")`) instead of the hook, the
  standard i18next pattern for non-hook contexts. Note for reviewers: because this calls
  `i18n.t()` directly rather than via the hook, the crash screen won't reactively re-render if
  the user changes language while already looking at this screen (extremely unlikely in
  practice — a crash screen is not visible during a settings interaction) — it will still show
  the correct language on any fresh crash/render. New top-level `errorBoundary.*` namespace
  (`title`, `subtitle`, `tryAgain`).

Both are now covered by the Batch 4 key cross-reference and tsc runs (re-run after these two
fixes, still clean).
