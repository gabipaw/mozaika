// Frontend Mozaiki — logowanie (JWT), profil, plakaty, wyszukiwarka TMDB.

const $ = (id) => document.getElementById(id);
let allMedia = [];
let searchTimer = null;
let me = null;
let authMode = "login";
let searchType = "film"; // "film" (TMDB) | "book" (Open Library)
let viewingUserId = null; // null = własny profil; inaczej id oglądanego usera
let viewingName = ""; // imię oglądanego usera (do etykiet porównania)
let viewingUser = null; // pełny obiekt oglądanego usera {id, displayName, avatarUrl}

// --- i18n (tłumaczenia) ---
const I18N = {
  pl: {
    back: "← Wróć",
    logout: "Wyloguj",
    settings: "Ustawienia",
    language: "Język",
    tagline:
      "Oceniaj wszystko, co oglądasz i czytasz, a resztę dobierzemy do Twojego gustu.",
    yourName: "Twoja nazwa",
    email: "E-mail",
    login: "Zaloguj się",
    register: "Załóż konto",
    noAccount: "Nie masz jeszcze konta?",
    haveAccount: "Masz już konto?",
    passwordPh: "Hasło",
    passwordPhNew: "Hasło (min. 6 znaków)",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    yourProfile: "Twój profil",
    changePhoto: "Zmień zdjęcie",
    hi: "Cześć, {name}",
    typeFilm: "🎬 Filmy",
    typeBook: "📚 Książki",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Muzyka",
    typeGame: "🎮 Gry",
    searchFilm: "Szukaj filmu (TMDB)…",
    searchBook: "Szukaj książki (Open Library)…",
    searchManga: "Szukaj mangi (AniList)…",
    searchAnime: "Szukaj anime (AniList)…",
    searchMusic: "Szukaj albumu (iTunes)…",
    searchGame: "Szukaj gry (RAWG)…",
    results: "Wyniki",
    resultsFrom: "Wyniki z {src}: „{q}”",
    searching: "Szukam…",
    nothingFound: "Nic nie znaleziono.",
    forYou: "Dla Ciebie",
    forYouHint: "Polecane przez osoby o podobnym guście.",
    tasteRecs: "Pod Twój gust",
    tasteRecsHint: "Nowe tytuły spoza Twojego katalogu, dobrane do Twojego gustu.",
    trailer: "Zwiastun",
    upcoming: "Nadchodzące",
    upcomingHint: "Z Twojej listy — jeszcze nie wyszły. Damy znać w dniu premiery.",
    premiereOn: "Premiera {date}",
    premiereToday: "Premiera dziś!",
    premiereInDays: "Za {n} dni",
    premiereTomorrow: "Jutro",
    noTasteRecs: "Oceń kilka tytułów, a odkryjemy coś nowego pod Twój gust.",
    noTasteRecsType: "Oceń kilka tytułów z tej kategorii, a dobierzemy coś nowego.",
    noDiscoverForType: "Dla tej kategorii nie mamy jeszcze świeżych rekomendacji.",
    reasonSimilar: "Bo podobne do „{title}”",
    reasonGenre: "Bo lubisz gatunek {genre}",
    reasonType: "Bo lubisz {kat}",
    reasonPopular: "Bo popularne w tej kategorii",
    reasonDecade: "Bo lubisz lata {decade}.",
    reasonGeneral: "Popularne — w Twoim guście",
    catFilm: "filmy",
    catAnime: "anime",
    catManga: "mangę",
    catGame: "gry",
    yourCatalog: "Twój katalog",
    yourCatalogHint: "Tytuły, które oceniłeś.",
    allGenres: "Wszystkie",
    tastePortrait: "Portret gustu",
    portraitEmpty: "Oceń kilka tytułów, a narysujemy Twój portret gustu.",
    harshMild: "Oceniasz łagodniej niż średnia.",
    harshTough: "Oceniasz surowiej niż średnia.",
    harshBalanced: "Oceniasz mniej więcej jak średnia.",
    yourAvg: "Twoja średnia",
    siteAvg: "serwis",
    topGenres: "Twoje gatunki",
    topTypes: "Rodzaje mediów",
    favDecade: "Ulubiona dekada: lata {decade}.",
    recBy: "poleca {n} os.",
    noRecs: "Brak — oceń kilka tytułów, a coś dobierzemy.",
    yourRating: "Twoja ocena",
    fav: "☆ TOP 4",
    favActive: "★ w TOP 4",
    watchAdd: "＋ Do listy",
    watchActive: "✓ Na liście",
    commentPh: "Napisz komentarz (opcjonalnie)…",
    saveReview: "Zapisz ocenę i komentarz",
    deleteReview: "🗑 Usuń ocenę",
    confirmDeleteReview:
      "Usunąć Twoją ocenę i komentarz do „{title}”? Tego nie da się cofnąć.",
    deletedReview: "Usunięto ocenę",
    comments: "Komentarze",
    noComments: "Brak komentarzy — bądź pierwszy.",
    likeAdd: "Trafna recenzja",
    dislikeAdd: "Nietrafiona recenzja",
    reactRemove: "Cofnij reakcję",
    likeOwn: "Tak inni ocenili Twoją recenzję",
    likeLogin: "Zaloguj się, żeby zareagować na recenzję.",
    loadingDesc: "Ładowanie opisu…",
    noDesc: "Brak opisu.",
    pickRating: "Wybierz ocenę (kliknij gwiazdki).",
    rateFirst: "Najpierw oceń ten tytuł (gwiazdki), żeby dodać do TOP 4.",
    addedTop4: "Dodano do TOP 4",
    removedTop4: "Usunięto z TOP 4",
    addedList: "Dodano do listy",
    removedList: "Usunięto z listy",
    saved: "Zapisano",
    savedPhoto: "Zapisano zdjęcie",
    top4: "Top 4 ulubione",
    top4Empty: "Przypnij ulubione przyciskiem „TOP 4” na stronie tytułu.",
    top4EmptyRO: "Brak ulubionych.",
    myComments: "Moje komentarze",
    myCommentsEmpty: "Nie dodałeś jeszcze żadnego komentarza do ocen.",
    userComments: "Recenzje: {name}",
    userCommentsEmpty: "{name} nie dodał(a) jeszcze żadnego komentarza.",
    watchlistTitle: "Do obejrzenia / zagrania",
    watchEmpty: "Pusto — dodaj coś przyciskiem „Do listy”.",
    watchEmptyRO: "Pusto.",
    seeAll: "Zobacz wszystko ({n})",
    nothingRatedCat: "Nic tu jeszcze",
    edit: "Zmień",
    pickN: "Wybierz {max} ({n})",
    pickCovers: "{label} — wybierz do {max} okładek",
    maxCovers: "Możesz wybrać maksymalnie {max} okładki.",
    friends: "Znajomi",
    add: "＋ Dodaj",
    searchFriends: "Szukaj znajomych…",
    noFriendsFound: "Nikogo nie znaleziono.",
    notifications: "Powiadomienia",
    notifFollowed: "zaczął(-ęła) Cię obserwować",
    notifLiked: "polubił(-a) Twoją recenzję",
    notifRated: "ocenił(-a) tytuł z Twojej listy",
    notifPremiere: "jest już dostępne — masz to na liście do obejrzenia",
    notifComment: "skomentował(-a) Twoją recenzję",
    notifReply: "odpowiedział(-a) na Twój komentarz",
    noNotif: "Brak powiadomień. Gdy ktoś Cię zaobserwuje, pojawi się tu.",
    // Blokowanie
    block: "Zablokuj",
    unblock: "Odblokuj",
    blocked: "Zablokowano",
    blockConfirm: "Zablokować tę osobę? Zniknie wzajemna obserwacja i czat.",
    blockedList: "Zablokowani",
    noBlocked: "Nie zablokowałeś nikogo.",
    // Ustawienia — konto
    account: "Konto",
    save: "Zapisz",
    nameSaved: "Nazwa zapisana",
    changePw: "Zmień hasło",
    currentPw: "Obecne hasło",
    newPw: "Nowe hasło (min. 6 znaków)",
    savePw: "Zmień hasło",
    pwSaved: "Hasło zmienione",
    // Ustawienia — preferencje powiadomień
    notifPrefs: "Powiadomienia w aplikacji",
    notifPrefsHint: "Wyłącz typy, o których nie chcesz wiedzieć.",
    ntFollow: "Nowi obserwujący",
    ntLike: "Polubienia recenzji",
    ntComment: "Komentarze do recenzji",
    ntReply: "Odpowiedzi na komentarze",
    ntWatchlist: "Oceny tytułów z listy",
    ntPremiere: "Premiery z listy",
    // Ustawienia — o aplikacji / usuwanie konta
    about: "O aplikacji",
    aboutText: "Mozaika — oceniaj wszystko, co oglądasz i czytasz. Wersja {v}.",
    deleteAccount: "Usuń konto",
    deleteConfirm:
      "Na pewno usunąć konto? Tego NIE DA SIĘ cofnąć — znikną Twoje recenzje, wiadomości i obserwacje.",
    deletePwPrompt: "Podaj hasło, aby potwierdzić usunięcie konta:",
    accountDeleted: "Konto usunięte.",
    // Komentarze (klucz `comments` już istnieje wyżej — „Komentarze")
    commentPlaceholder: "Napisz komentarz…",
    replyPlaceholder: "Napisz odpowiedź…",
    addComment: "Skomentuj",
    reply: "Odpowiedz",
    commentDeleted: "Komentarz usunięty",
    deleteComment: "Usuń komentarz",
    noCommentsYet: "Brak komentarzy. Bądź pierwszy!",
    showReplies: "Pokaż odpowiedzi ({n})",
    hideReplies: "Ukryj odpowiedzi",
    counts: "{fo} obserwujących · {fw} obserwowanych",
    followersLink: "{n} obserwujących",
    followingLink: "{n} obserwowanych",
    followersTitle: "Obserwujący",
    followingTitle: "Obserwowani",
    peopleEmpty: "Nikogo tu jeszcze nie ma.",
    messages: "Wiadomości",
    writeMessage: "💬 Napisz",
    msgPlaceholder: "Napisz wiadomość…",
    send: "Wyślij",
    noConversations:
      "Brak rozmów. Napisz do znajomego przyciskiem „💬 Napisz” na jego profilu.",
    chatEmpty: "Zacznijcie rozmowę — napisz pierwszy!",
    seen: "Zobaczone",
    sent: "Wysłano",
    typing: "pisze",
    navHome: "Główna",
    navProfile: "Profil",
    deleteMsg: "Usuń",
    editMsg: "Edytuj wiadomość",
    react: "Reakcja",
    edited: "edytowano",
    shareBtn: "📨 Wyślij znajomemu",
    shareTo: "Wyślij do…",
    shared: "Wysłano do {name}",
    noMutual: "Brak znajomych do wysłania (musicie się obserwować wzajemnie).",
    photo: "Zdjęcie",
    msgDeletedMine: "Usunąłeś tę wiadomość",
    msgDeleted: "Wiadomość usunięta",
    follow: "Obserwuj",
    following: "Obserwujesz",
    noFollows: "Nie obserwujesz jeszcze nikogo — dodaj znajomych przyciskiem „＋ Dodaj”.",
    noActivity: "Twoi znajomi nie ocenili jeszcze nic.",
    showMore: "Pokaż więcej ({n})",
    showLess: "Pokaż mniej",
    seeAllComments: "Zobacz wszystkie ({n})",
    together: "🍿 Co obejrzeć razem",
    togetherTitle: "Co obejrzeć razem z {name}",
    togBoth: "Oboje macie to na liście",
    togTheirs: "{name} ma to na liście",
    togYours: "Masz to na liście",
    togFresh: "Nowość pod Wasz wspólny gust",
    togScores: "Ty {you} · {name} {them}",
    togEmpty:
      "Za mało ocen, żeby dobrać coś dla Was dwojga. Oceńcie kilka tytułów i wróćcie.",
    pushLabel: "Powiadomienia",
    pushOff: "Włącz powiadomienia na telefon",
    pushOn: "✓ Powiadomienia włączone",
    pushOffHint:
      "Damy znać, gdy ktoś zacznie Cię obserwować — nawet gdy Mozaika jest zamknięta.",
    pushOnHint: "To urządzenie będzie dostawać powiadomienia.",
    pushBlocked: "Powiadomienia zablokowane",
    pushBlockedHint:
      "Zablokowałeś powiadomienia dla tej strony. Odblokuj je w ustawieniach przeglądarki (kłódka przy adresie).",
    pushUnsupported:
      "Ta przeglądarka nie obsługuje powiadomień. Na iPhonie najpierw dodaj Mozaikę do ekranu głównego.",
    pushEnabled: "Powiadomienia włączone",
    pushDisabled: "Powiadomienia wyłączone",
    pushSent: "Wysłano testowe powiadomienie",
    pushTest: "Wyślij testowe",
    noUsers: "Brak innych użytkowników.",
    yourTaste: "Wasz gust",
    matchCap: "dopasowania · {n} wspólnych",
    notEnough:
      "Za mało wspólnych ocen ({n}/3), żeby policzyć dopasowanie. Oceńcie więcej tych samych tytułów.",
    you: "Ty",
    loading: "Ładowanie…",
    done: "✕ Gotowe",
    close: "✕ Zamknij",
    loginRequired: "Zaloguj się.",
    apiError: "Błąd API",
    connectError: "Nie udało się połączyć z API: {msg}",
    justNow: "przed chwilą",
    minAgo: "{n} min temu",
    hAgo: "{n} godz. temu",
    dAgo: "{n} dni temu",
    // Zwięzłe formy na listę rozmów — obok podglądu wiadomości „temu" się nie mieści.
    shortNow: "teraz",
    shortMin: "{n} min",
    shortH: "{n} godz",
    shortD: "{n} dni",
    shortW: "{n} tyg",
  },
  en: {
    back: "← Back",
    logout: "Log out",
    settings: "Settings",
    language: "Language",
    tagline: "Rate everything you watch and read — we'll match the rest to your taste.",
    yourName: "Your name",
    email: "Email",
    login: "Log in",
    register: "Sign up",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    passwordPh: "Password",
    passwordPhNew: "Password (min. 6 characters)",
    showPassword: "Show password",
    hidePassword: "Hide password",
    yourProfile: "Your profile",
    changePhoto: "Change photo",
    hi: "Hi, {name}",
    typeFilm: "🎬 Movies",
    typeBook: "📚 Books",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Music",
    typeGame: "🎮 Games",
    searchFilm: "Search movies (TMDB)…",
    searchBook: "Search books (Open Library)…",
    searchManga: "Search manga (AniList)…",
    searchAnime: "Search anime (AniList)…",
    searchMusic: "Search albums (iTunes)…",
    searchGame: "Search games (RAWG)…",
    results: "Results",
    resultsFrom: "Results from {src}: “{q}”",
    searching: "Searching…",
    nothingFound: "Nothing found.",
    forYou: "For you",
    forYouHint: "Recommended by people with similar taste.",
    tasteRecs: "For your taste",
    tasteRecsHint: "Fresh titles beyond your catalog, matched to your taste.",
    trailer: "Trailer",
    upcoming: "Coming soon",
    upcomingHint: "From your list — not out yet. We'll ping you on release day.",
    premiereOn: "Out {date}",
    premiereToday: "Out today!",
    premiereInDays: "In {n} days",
    premiereTomorrow: "Tomorrow",
    noTasteRecs: "Rate a few titles and we'll discover something new for you.",
    noTasteRecsType: "Rate a few titles in this category and we'll find something new.",
    noDiscoverForType: "No fresh recommendations for this category yet.",
    reasonSimilar: "Because it's like “{title}”",
    reasonGenre: "Because you like {genre}",
    reasonType: "Because you like {kat}",
    reasonPopular: "Popular in this category",
    reasonDecade: "Because you like the {decade}s",
    reasonGeneral: "Popular — in your taste",
    catFilm: "films",
    catAnime: "anime",
    catManga: "manga",
    catGame: "games",
    yourCatalog: "Your catalog",
    yourCatalogHint: "Titles you've rated.",
    allGenres: "All",
    tastePortrait: "Taste portrait",
    portraitEmpty: "Rate a few titles and we'll draw your taste portrait.",
    harshMild: "You rate more generously than average.",
    harshTough: "You rate more harshly than average.",
    harshBalanced: "You rate about average.",
    yourAvg: "Your average",
    siteAvg: "site",
    topGenres: "Your genres",
    topTypes: "Media types",
    favDecade: "Favourite decade: the {decade}s.",
    recBy: "recommended by {n}",
    noRecs: "Nothing yet — rate a few titles and we'll find some.",
    yourRating: "Your rating",
    fav: "☆ TOP 4",
    favActive: "★ in TOP 4",
    watchAdd: "＋ To list",
    watchActive: "✓ On list",
    commentPh: "Write a comment (optional)…",
    saveReview: "Save rating and comment",
    deleteReview: "🗑 Delete rating",
    confirmDeleteReview:
      "Delete your rating and comment for “{title}”? This can't be undone.",
    deletedReview: "Rating deleted",
    comments: "Comments",
    noComments: "No comments — be the first.",
    likeAdd: "Helpful review",
    dislikeAdd: "Unhelpful review",
    reactRemove: "Undo reaction",
    likeOwn: "How others rated your review",
    likeLogin: "Log in to react to a review.",
    loadingDesc: "Loading description…",
    noDesc: "No description.",
    pickRating: "Pick a rating (click the stars).",
    rateFirst: "Rate this title first (stars) to add it to TOP 4.",
    addedTop4: "Added to TOP 4",
    removedTop4: "Removed from TOP 4",
    addedList: "Added to list",
    removedList: "Removed from list",
    saved: "Saved",
    savedPhoto: "Photo saved",
    top4: "Top 4 favorites",
    top4Empty: "Pin favorites with the “TOP 4” button on a title page.",
    top4EmptyRO: "No favorites.",
    myComments: "My comments",
    myCommentsEmpty: "You haven't added any comments to your ratings yet.",
    userComments: "Reviews: {name}",
    userCommentsEmpty: "{name} hasn't written any comments yet.",
    watchlistTitle: "To watch / play",
    watchEmpty: "Empty — add something with the “To list” button.",
    watchEmptyRO: "Empty.",
    seeAll: "See all ({n})",
    nothingRatedCat: "Nothing yet",
    edit: "Edit",
    pickN: "Pick {max} ({n})",
    pickCovers: "{label} — pick up to {max} covers",
    maxCovers: "You can pick at most {max} covers.",
    friends: "Friends",
    add: "＋ Add",
    searchFriends: "Search friends…",
    noFriendsFound: "No one found.",
    notifications: "Notifications",
    notifFollowed: "started following you",
    notifLiked: "liked your review",
    notifRated: "rated a title from your watchlist",
    notifPremiere: "is out now — it's on your watchlist",
    notifComment: "commented on your review",
    notifReply: "replied to your comment",
    noNotif: "No notifications. When someone follows you, it'll show up here.",
    // Blocking
    block: "Block",
    unblock: "Unblock",
    blocked: "Blocked",
    blockConfirm: "Block this person? Mutual follow and chat will be removed.",
    blockedList: "Blocked",
    noBlocked: "You haven't blocked anyone.",
    // Settings — account
    account: "Account",
    save: "Save",
    nameSaved: "Name saved",
    changePw: "Change password",
    currentPw: "Current password",
    newPw: "New password (min. 6 chars)",
    savePw: "Change password",
    pwSaved: "Password changed",
    // Settings — notification preferences
    notifPrefs: "In-app notifications",
    notifPrefsHint: "Turn off the types you don't want to hear about.",
    ntFollow: "New followers",
    ntLike: "Review likes",
    ntComment: "Comments on reviews",
    ntReply: "Replies to comments",
    ntWatchlist: "Ratings of watchlisted titles",
    ntPremiere: "Premieres from your list",
    // Settings — about / delete account
    about: "About",
    aboutText: "Mozaika — rate everything you watch and read. Version {v}.",
    deleteAccount: "Delete account",
    deleteConfirm:
      "Delete your account for good? This CANNOT be undone — your reviews, messages and follows will be gone.",
    deletePwPrompt: "Enter your password to confirm account deletion:",
    accountDeleted: "Account deleted.",
    // Comments (`comments` key already defined above — "Comments")
    commentPlaceholder: "Write a comment…",
    replyPlaceholder: "Write a reply…",
    addComment: "Comment",
    reply: "Reply",
    commentDeleted: "Comment deleted",
    deleteComment: "Delete comment",
    noCommentsYet: "No comments yet. Be the first!",
    showReplies: "Show replies ({n})",
    hideReplies: "Hide replies",
    counts: "{fo} followers · {fw} following",
    followersLink: "{n} followers",
    followingLink: "{n} following",
    followersTitle: "Followers",
    followingTitle: "Following",
    peopleEmpty: "No one here yet.",
    messages: "Messages",
    writeMessage: "💬 Message",
    msgPlaceholder: "Write a message…",
    send: "Send",
    noConversations:
      "No conversations yet. Message a friend with the “💬 Message” button on their profile.",
    chatEmpty: "Start the conversation — say hi!",
    seen: "Seen",
    sent: "Sent",
    typing: "typing",
    navHome: "Home",
    navProfile: "Profile",
    deleteMsg: "Delete",
    editMsg: "Edit message",
    react: "React",
    edited: "edited",
    shareBtn: "📨 Send to a friend",
    shareTo: "Send to…",
    shared: "Sent to {name}",
    noMutual: "No friends to send to (you must follow each other).",
    photo: "Photo",
    msgDeletedMine: "You deleted this message",
    msgDeleted: "Message deleted",
    follow: "Follow",
    following: "Following",
    noFollows: "You're not following anyone yet — add friends with the “＋ Add” button.",
    noActivity: "Your friends haven't rated anything yet.",
    showMore: "Show more ({n})",
    showLess: "Show less",
    seeAllComments: "See all ({n})",
    together: "🍿 What to watch together",
    togetherTitle: "What to watch with {name}",
    togBoth: "You both have it on your list",
    togTheirs: "{name} has it on their list",
    togYours: "You have it on your list",
    togFresh: "New — fits your shared taste",
    togScores: "You {you} · {name} {them}",
    togEmpty:
      "Not enough ratings to pick something for you two. Rate a few titles first.",
    pushLabel: "Notifications",
    pushOff: "Enable phone notifications",
    pushOn: "✓ Notifications enabled",
    pushOffHint:
      "We'll let you know when someone follows you — even when Mozaika is closed.",
    pushOnHint: "This device will receive notifications.",
    pushBlocked: "Notifications blocked",
    pushBlockedHint:
      "You blocked notifications for this site. Unblock them in your browser settings (padlock next to the address).",
    pushUnsupported:
      "This browser doesn't support notifications. On iPhone, add Mozaika to your home screen first.",
    pushEnabled: "Notifications enabled",
    pushDisabled: "Notifications disabled",
    pushSent: "Test notification sent",
    pushTest: "Send test",
    noUsers: "No other users.",
    yourTaste: "Your taste",
    matchCap: "match · {n} in common",
    notEnough:
      "Not enough shared ratings ({n}/3) to compute the match. Rate more of the same titles.",
    you: "You",
    loading: "Loading…",
    done: "✕ Done",
    close: "✕ Close",
    loginRequired: "Please log in.",
    apiError: "API error",
    connectError: "Couldn't connect to the API: {msg}",
    justNow: "just now",
    minAgo: "{n} min ago",
    hAgo: "{n} h ago",
    dAgo: "{n} d ago",
    shortNow: "now",
    shortMin: "{n}m",
    shortH: "{n}h",
    shortD: "{n}d",
    shortW: "{n}w",
  },
};

const LANGS = [
  { code: "pl", label: "Polski" },
  { code: "en", label: "English" },
];
const LANG_KEY = "mozaika_lang";
let lang = localStorage.getItem(LANG_KEY) || (navigator.language || "pl").slice(0, 2);
if (!I18N[lang]) lang = "pl";

function t(key, params) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.pl[key] || key;
  if (params) for (const k in params) s = s.replaceAll(`{${k}}`, params[k]);
  return s;
}

// Podmienia teksty statyczne (atrybuty data-i18n / -ph / -title) na bieżący język.
function applyStaticI18n() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of document.querySelectorAll("[data-i18n-ph]")) {
    el.placeholder = t(el.getAttribute("data-i18n-ph"));
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.getAttribute("data-i18n-title"));
  }
}

const SEARCH_PH_KEY = {
  film: "searchFilm",
  book: "searchBook",
  manga: "searchManga",
  anime: "searchAnime",
  music: "searchMusic",
  game: "searchGame",
};
function applySearchPlaceholder() {
  $("search").placeholder = t(SEARCH_PH_KEY[searchType] || "searchFilm");
}

function renderLangList() {
  const list = $("langList");
  list.innerHTML = "";
  for (const L of LANGS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn" + (L.code === lang ? " active" : "");
    btn.textContent = L.label;
    btn.addEventListener("click", () => setLang(L.code));
    list.append(btn);
  }
}

function setLang(code) {
  if (!I18N[code]) return;
  lang = code;
  localStorage.setItem(LANG_KEY, code);
  applyStaticI18n();
  renderLangList();
  refreshDynamic();
}

// Odświeża teksty ustawiane dynamicznie w bieżącym widoku po zmianie języka.
function refreshDynamic() {
  setAuthMode(authMode);
  applySearchPlaceholder();
  if (!$("profileView").classList.contains("hidden")) {
    if (viewingUserId) loadUserProfile(viewingUserId);
    else loadProfile();
  } else if (!$("detailView").classList.contains("hidden")) {
    updateDetailButtons();
  } else if (me) {
    loadTasteRecommendations();
    loadRecommendations();
    loadCatalog();
  }
}

// --- Powiadomienia push (na telefon) ---

// Klucz VAPID przychodzi jako base64url; PushManager chce surowych bajtów.
function vapidToBytes(base64url) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function currentPushSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// Rysuje stan przełącznika: włączone / wyłączone / zablokowane / nieobsługiwane.
async function renderPushSettings() {
  const grupa = $("pushGroup");
  const btn = $("pushToggle");
  const test = $("pushTest");
  const hint = $("pushHint");

  if (!pushSupported()) {
    grupa.classList.remove("hidden");
    btn.classList.add("hidden");
    test.classList.add("hidden");
    hint.textContent = t("pushUnsupported");
    return;
  }

  // Serwer bez kluczy VAPID → nie udawaj, że opcja działa.
  let key = null;
  try {
    const d = await api("/push/key");
    if (d.enabled) key = d.publicKey;
  } catch {
    /* brak konfiguracji push — chowamy sekcję */
  }
  if (!key) {
    grupa.classList.add("hidden");
    return;
  }
  pushKeyCache = key;

  grupa.classList.remove("hidden");
  btn.classList.remove("hidden");

  if (Notification.permission === "denied") {
    btn.disabled = true;
    btn.textContent = t("pushBlocked");
    test.classList.add("hidden");
    hint.textContent = t("pushBlockedHint");
    return;
  }

  const sub = await currentPushSub();
  btn.disabled = false;
  btn.classList.toggle("active", !!sub);
  btn.textContent = sub ? t("pushOn") : t("pushOff");
  test.classList.toggle("hidden", !sub);
  hint.textContent = sub ? t("pushOnHint") : t("pushOffHint");
}

let pushKeyCache = null;

async function togglePush() {
  const btn = $("pushToggle");
  btn.disabled = true;
  try {
    const sub = await currentPushSub();
    if (sub) {
      // Wyłączenie: najpierw serwer (żeby przestał wysyłać), potem przeglądarka.
      await api("/push/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
      toast(t("pushDisabled"));
    } else {
      const zgoda = await Notification.requestPermission();
      if (zgoda !== "granted") {
        await renderPushSettings();
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const nowa = await reg.pushManager.subscribe({
        userVisibleOnly: true, // wymagane przez przeglądarki
        applicationServerKey: vapidToBytes(pushKeyCache),
      });
      await api("/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nowa.toJSON()),
      });
      toast(t("pushEnabled"));
    }
  } catch (e) {
    toast(e.message);
  } finally {
    btn.disabled = false;
    await renderPushSettings();
  }
}

async function testPush() {
  try {
    await api("/push/test", { method: "POST" });
    toast(t("pushSent"));
  } catch (e) {
    toast(e.message);
  }
}

// Która funkcja wypełnia treść danej sekcji akordeonu (ładowana leniwie —
// dopiero przy pierwszym rozwinięciu, żeby nie strzelać po API do sekcji,
// których użytkownik nie otwiera).
const ACC_RENDER = {
  account: renderAccountSettings,
  notifPrefs: renderNotifPrefs,
  language: renderLangList,
  blocked: renderBlockedList,
  about: renderAbout,
  push: () => {}, // treść push jest statyczna; widoczność sekcji robi renderPushSettings
};
let accLoaded = new Set();

function openSettings() {
  // Świeże otwarcie: zwiń wszystkie sekcje i wyczyść pamięć „co już wczytane".
  accLoaded = new Set();
  for (const b of document.querySelectorAll(".acc-body")) b.classList.add("hidden");
  for (const h of document.querySelectorAll(".acc-head")) h.classList.remove("open");
  renderPushSettings(); // decyduje, czy sekcja push w ogóle się pokazuje
  $("settingsOverlay").classList.remove("hidden");
}

// Rozwija/zwija sekcję. Single-open: otwarcie jednej zamyka pozostałe.
async function toggleAcc(head) {
  const body = head.parentElement.querySelector(".acc-body");
  const opening = body.classList.contains("hidden");
  for (const b of document.querySelectorAll(".acc-body")) {
    if (b !== body) b.classList.add("hidden");
  }
  for (const h of document.querySelectorAll(".acc-head")) {
    if (h !== head) h.classList.remove("open");
  }
  body.classList.toggle("hidden", !opening);
  head.classList.toggle("open", opening);
  if (opening) {
    const key = head.dataset.acc;
    if (!accLoaded.has(key)) {
      accLoaded.add(key);
      await ACC_RENDER[key]?.();
    }
  }
}

function wireAccordion() {
  for (const head of document.querySelectorAll(".acc-head")) {
    head.addEventListener("click", () => toggleAcc(head));
  }
}

// Wypełnia pole nazwy bieżącą wartością i chowa (zwinięty) formularz hasła.
function renderAccountSettings() {
  $("nameInput").value = me?.displayName ?? "";
  $("pwForm").classList.add("hidden");
  $("pwCurrent").value = "";
  $("pwNew").value = "";
}

// Typy powiadomień jako przełączniki. Zaznaczony = dostaję; odznaczony = wyciszony.
const NOTIF_PREF_TYPES = [
  { type: "follow", label: "ntFollow" },
  { type: "like", label: "ntLike" },
  { type: "comment", label: "ntComment" },
  { type: "reply", label: "ntReply" },
  { type: "watchlist_rated", label: "ntWatchlist" },
  { type: "premiere", label: "ntPremiere" },
];

async function renderNotifPrefs() {
  const box = $("notifPrefs");
  box.innerHTML = `<p class="muted small">…</p>`;
  let muted;
  try {
    muted = (await api("/me/notif-prefs")).muted ?? [];
  } catch {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<p class="muted small pref-hint">${t("notifPrefsHint")}</p>`;
  for (const { type, label } of NOTIF_PREF_TYPES) {
    const row = document.createElement("label");
    row.className = "pref-row";
    const span = document.createElement("span");
    span.textContent = t(label);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !muted.includes(type); // zaznaczony = włączony
    cb.addEventListener("change", () => toggleNotifPref(type, cb));
    row.append(span, cb);
    box.append(row);
  }
}

// Przełącza jeden typ i zapisuje CAŁĄ listę wyciszonych (serwer = źródło prawdy).
async function toggleNotifPref(type, cb) {
  // Pozbieraj wszystkie ODZNACZONE typy w sekcji — to jest lista wyciszonych.
  const off = [...$("notifPrefs").querySelectorAll(".pref-row")]
    .map((row, i) => ({
      type: NOTIF_PREF_TYPES[i].type,
      on: row.querySelector("input").checked,
    }))
    .filter((x) => !x.on)
    .map((x) => x.type);
  cb.disabled = true;
  try {
    await api("/me/notif-prefs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ muted: off }),
    });
  } catch (e) {
    toast(e.message);
    cb.checked = !cb.checked; // cofnij wizualnie, gdy zapis padł
  } finally {
    cb.disabled = false;
  }
}

// „O aplikacji": numer wersji z /api/health (SHA commita, skrócony).
async function renderAbout() {
  const el = $("aboutVersion");
  let v = "dev";
  try {
    const h = await api("/health").catch(() => null);
    // /api/health nie wymaga auth; api() dokleja token, ale to nie przeszkadza.
    if (h?.commit) v = h.commit === "dev" ? "dev" : h.commit.slice(0, 7);
  } catch {
    /* wersja opcjonalna */
  }
  el.textContent = t("aboutText", { v });
}

// Lista zablokowanych z przyciskiem „Odblokuj" — jedyne miejsce, gdzie da się
// odblokować kogoś, kogo już nie widać w wynikach (bo blokada go ukrywa).
async function renderBlockedList() {
  const box = $("blockedList");
  const group = box.parentElement;
  let blocked;
  try {
    blocked = await api("/me/blocks");
  } catch {
    group.classList.add("hidden");
    return;
  }
  group.classList.toggle("hidden", false);
  box.innerHTML = "";
  if (!blocked.length) {
    box.innerHTML = `<p class="muted small">${t("noBlocked")}</p>`;
    return;
  }
  for (const u of blocked) {
    const row = document.createElement("div");
    row.className = "blocked-row";
    const av = avatarEl(u);
    av.classList.add("comment-avatar");
    const name = document.createElement("span");
    name.className = "blocked-name";
    name.textContent = u.displayName;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "linkbtn";
    btn.textContent = t("unblock");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await api(`/me/block/${u.id}`, { method: "DELETE" });
        row.remove();
        if (!box.querySelector(".blocked-row")) {
          box.innerHTML = `<p class="muted small">${t("noBlocked")}</p>`;
        }
      } catch (e) {
        toast(e.message);
        btn.disabled = false;
      }
    });
    row.append(av, name, btn);
    box.append(row);
  }
}
function closeSettings() {
  $("settingsOverlay").classList.add("hidden");
}

const getToken = () => localStorage.getItem("mozaika_token");
const setToken = (t) => localStorage.setItem("mozaika_token", t);
const clearToken = () => localStorage.removeItem("mozaika_token");

// Ikona oka do podglądu hasła. off=true → oko przekreślone ukośną linią (hasło widoczne).
function pwIcon(off) {
  const eye =
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  const slash = off ? '<line x1="3" y1="3" x2="21" y2="21"/>' : "";
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${eye}${slash}</svg>`;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error(t("loginRequired"));
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || t("apiError"));
  return data;
}

function toast(msg) {
  const t = $("reviewMsg");
  t.textContent = msg;
  t.classList.add("show");
  window.setTimeout(() => t.classList.remove("show"), 2200);
}

// Muzyka ma okładkę KWADRATOWĄ (jak płyta), nie plakat 2:3. Typ przychodzi raz jako
// enum bazy („MUZYKA"), raz jako klucz źródła z discovery („music") — łapiemy oba,
// bo inaczej albumy w „Pod Twój gust" były przycinane do proporcji plakatu.
const isMusicType = (type) => type === "MUZYKA" || type === "music";

// Wspólna „karta plakatu".
function posterCard(m, opts = {}) {
  // opts.square wygrywa (Top 4 wymusza plakat 2:3 nawet dla muzyki).
  const square = opts.square ?? isMusicType(m.type);

  const card = document.createElement("article");
  card.className = square ? "card sq" : "card";

  const poster = document.createElement("div");
  poster.className = square ? "poster square" : "poster";
  if (m.posterUrl) {
    const img = document.createElement("img");
    img.src = m.posterUrl;
    img.alt = m.title;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      const n = document.createElement("div");
      n.className = "noimg";
      n.textContent = m.title;
      poster.append(n);
    });
    poster.append(img);
  } else {
    const n = document.createElement("div");
    n.className = "noimg";
    n.textContent = m.title;
    poster.append(n);
  }
  if (opts.score !== undefined) {
    const s = document.createElement("span");
    s.className = "score";
    s.textContent = `★ ${opts.score}`;
    poster.append(s);
  }
  card.append(poster);

  // Na profilu pokazujemy sam plakat (bez nazwy/roku pod spodem).
  if (opts.noMeta) return { card, meta: null };

  const meta = document.createElement("div");
  meta.className = "meta";
  const t = document.createElement("div");
  t.className = "t";
  t.textContent = m.title;
  const y = document.createElement("div");
  y.className = "y";
  y.textContent = m.year ? String(m.year) : "";
  meta.append(t, y);
  if (opts.recby) {
    const r = document.createElement("div");
    r.className = "recby";
    r.textContent = opts.recby;
    meta.append(r);
  }
  card.append(meta);
  return { card, meta };
}

// Enum typu w bazie (WIELKIE) → klucz źródła używany na froncie i w API (małe).
const ENUM_TYPE = {
  FILM: "film",
  SERIAL: "film",
  KSIAZKA: "book",
  MANGA: "manga",
  ANIME: "anime",
  MUZYKA: "music",
  GRA: "game",
};

// Buduje obiekt szczegółów z rekordu (media z bazy / wynik wyszukiwania).
// Typ zawsze normalizowany do małego klucza (film/book/manga/anime/music).
function toDetail(m, type, mediaId, myRating) {
  const raw = type ?? m.type;
  return {
    type: ENUM_TYPE[raw] ?? raw,
    externalId: m.externalId ?? null,
    title: m.title,
    year: m.year ?? null,
    posterUrl: m.posterUrl ?? null,
    genres: m.genres ?? [],
    mediaId: mediaId ?? m.id ?? null,
    myRating,
  };
}

// Siatka klikalnych kart — klik otwiera szczegóły (opis + ocena + komentarz).
function renderGrid(container, list, onClick) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<p class="muted">${t("nothingFound")}</p>`;
    return;
  }
  for (const m of list) {
    const { card } = posterCard(m, { score: m.myRating });
    card.addEventListener("click", () => onClick(m));
    container.append(card);
  }
}

let catalogItems = []; // Twoje ocenione tytuły (z gatunkami)
let catalogGenre = null; // wybrany gatunek do filtrowania (null = wszystkie)

async function loadCatalog() {
  allMedia = await api("/media"); // pełna lista — potrzebna tylko do znajdowania mediaId
  // Katalog pokazuje WYŁĄCZNIE Twoje ocenione tytuły (nie cudze).
  catalogItems = myProfile.reviews.map((r) => ({ ...r.media, myRating: r.rating }));
  if (
    catalogGenre &&
    !catalogItems.some((m) => (m.genres ?? []).includes(catalogGenre))
  ) {
    catalogGenre = null; // wybrany gatunek zniknął z katalogu → wróć do „Wszystkie"
  }
  renderCatalogFilter();
  renderCatalog();
}

// Filtruje katalog po wybranym gatunku i rysuje siatkę.
function renderCatalog() {
  const items = catalogGenre
    ? catalogItems.filter((m) => (m.genres ?? []).includes(catalogGenre))
    : catalogItems;
  renderGrid($("catalog"), items, (m) =>
    openDetail(toDetail(m, m.type, m.id, m.myRating)),
  );
}

// Chipy gatunków nad katalogiem (tylko gdy są min. 2 różne gatunki).
function renderCatalogFilter() {
  const box = $("catalogGenres");
  box.innerHTML = "";
  const genres = [...new Set(catalogItems.flatMap((m) => m.genres ?? []))].sort();
  if (genres.length < 2) return;

  const chip = (label, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "genre-chip filter" + (catalogGenre === value ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      catalogGenre = catalogGenre === value ? null : value;
      renderCatalogFilter();
      renderCatalog();
    });
    return b;
  };
  box.append(chip(t("allGenres"), null));
  for (const g of genres) box.append(chip(g, g));
}

// Wyniki wyszukiwania vs przeglądanie (rekomendacje/profil/katalog).
function showResults() {
  $("searchResults").classList.remove("hidden");
  $("browse").classList.add("hidden");
}
function showBrowse() {
  $("searchResults").classList.add("hidden");
  $("browse").classList.remove("hidden");
  // Rotacja „pod Twój gust" przy każdym wejściu na stronę główną (świeży zestaw).
  if (me) loadTasteRecommendations();
}

const SEARCH_SRC = {
  film: "TMDB",
  book: "Open Library",
  manga: "AniList",
  anime: "AniList",
  music: "iTunes",
  game: "RAWG",
};
async function runSearch(q) {
  const src = SEARCH_SRC[searchType] ?? "TMDB";
  $("searchTitle").textContent = t("resultsFrom", { src, q });
  const grid = $("searchGrid");
  grid.innerHTML = `<p class="muted">${t("searching")}</p>`;
  showResults();
  try {
    const results = await api(`/search?q=${encodeURIComponent(q)}&type=${searchType}`);
    renderGrid(grid, results, (m) => openDetail(toDetail(m, searchType, null)));
  } catch (e) {
    grid.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Przełącznik źródła wyszukiwania: filmy (TMDB) / książki (Open Library).
function setSearchType(type) {
  if (searchType === type) return;
  searchType = type;
  $("typeFilm").classList.toggle("active", type === "film");
  $("typeBook").classList.toggle("active", type === "book");
  $("typeManga").classList.toggle("active", type === "manga");
  $("typeAnime").classList.toggle("active", type === "anime");
  $("typeMusic").classList.toggle("active", type === "music");
  $("typeGame").classList.toggle("active", type === "game");
  applySearchPlaceholder();
  // „Pod Twój gust" idzie za zakładką — nowy rodzaj = nowe rekomendacje.
  loadTasteRecommendations();
  const q = $("search").value.trim();
  if (q) runSearch(q);
  else showBrowse();
}

function onSearchInput() {
  const q = $("search").value.trim();
  window.clearTimeout(searchTimer);
  if (!q) {
    showBrowse();
    return;
  }
  searchTimer = window.setTimeout(() => runSearch(q), 350);
}

async function loadRecommendations() {
  const row = $("recs");
  row.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    const recs = await api("/me/recommendations");
    if (recs.length === 0) {
      row.innerHTML = `<p class="muted">${t("noRecs")}</p>`;
      return;
    }
    row.innerHTML = "";
    for (const r of recs) {
      const { card } = posterCard(r, {
        score: r.score,
        recby: t("recBy", { n: r.recommenders.length }),
      });
      card.addEventListener("click", () => openDetail(toDetail(r, r.type, r.id)));
      row.append(card);
    }
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Nazwa kategorii (do powodu „Bo lubisz …") wg klucza rodzaju z API.
const CAT_LABEL = {
  film: "catFilm",
  anime: "catAnime",
  manga: "catManga",
  game: "catGame",
};
function catLabel(typeKey) {
  const key = CAT_LABEL[typeKey];
  return key ? t(key) : "";
}

// Zamienia powód rekomendacji z API na czytelny tekst — WYJAŚNIA, czemu w guście.
function tasteReasonLabel(reason, item) {
  if (!reason) return "";
  if (reason.kind === "similar") return t("reasonSimilar", { title: reason.to });
  if (reason.kind === "genre") return t("reasonGenre", { genre: reason.genre });
  if (reason.kind === "type") {
    const kat = catLabel(item?.type);
    return kat ? t("reasonType", { kat }) : t("reasonGeneral");
  }
  if (reason.kind === "popular") return t("reasonPopular");
  if (reason.kind === "decade") return t("reasonDecade", { decade: reason.decade });
  return t("reasonGeneral");
}

// Rodzaje, które umiemy odkrywać (patrz DISCOVERABLE w logic/discovery.ts).
// Książki i muzyka nie mają API „podobne do", więc jadą na gatunku i popularności.
const DISCOVERABLE_KEYS = ["film", "anime", "manga", "game", "book", "music"];

/** „Za 3 dni" / „Jutro" / „Premiera 12 września 2026" — zależnie od tego, jak blisko. */
function premiereLabel(iso) {
  const data = new Date(iso);
  const dzien = 24 * 60 * 60 * 1000;
  const dzis = new Date();
  // Liczymy w pełnych dniach kalendarzowych — inaczej premiera „jutro rano"
  // wychodziłaby jako „dziś", bo od teraz dzieli ją mniej niż 24 godziny.
  const dni = Math.round(
    (Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) -
      Date.UTC(dzis.getFullYear(), dzis.getMonth(), dzis.getDate())) /
      dzien,
  );
  if (dni <= 0) return t("premiereToday");
  if (dni === 1) return t("premiereTomorrow");
  if (dni <= 30) return t("premiereInDays", { n: dni });
  return t("premiereOn", {
    date: data.toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  });
}

// „Nadchodzące" — tytuły z watchlisty, które jeszcze nie wyszły, od najbliższej
// premiery. Sekcja chowa się w całości, gdy nie ma na co czekać — pusty rząd na
// ekranie głównym byłby tylko dziurą.
async function loadUpcoming() {
  const row = $("upcoming");
  const section = $("upcomingSection");
  try {
    const items = await api("/me/upcoming");
    section.classList.toggle("hidden", items.length === 0);
    if (items.length === 0) return;
    row.innerHTML = "";
    for (const m of items) {
      const { card } = posterCard(m, { recby: premiereLabel(m.releaseDate) });
      card.addEventListener("click", () => openDetail(toDetail(m, m.type, m.id)));
      row.append(card);
    }
  } catch {
    // Nadchodzące to dodatek — gdy padnie, po prostu nie pokazujemy sekcji.
    section.classList.add("hidden");
  }
}

// Odkrywanie pod gust — świeże tytuły z zewnątrz (TMDB/AniList/RAWG), nie z katalogu.
// Pozycje są zewnętrzne (mają externalId, brak mediaId) — klik otwiera detal i ocenę.
// Sekcja idzie za aktywną zakładką: klikasz „Gry" → same gry.
async function loadTasteRecommendations() {
  const row = $("tasteRecs");
  if (!DISCOVERABLE_KEYS.includes(searchType)) {
    row.innerHTML = `<p class="muted">${t("noDiscoverForType")}</p>`;
    return;
  }
  row.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    const recs = await api(`/me/discover?type=${encodeURIComponent(searchType)}`);
    if (recs.length === 0) {
      row.innerHTML = `<p class="muted">${t("noTasteRecsType")}</p>`;
      return;
    }
    row.innerHTML = "";
    for (const r of recs) {
      const { card } = posterCard(r, {
        score: r.score,
        recby: tasteReasonLabel(r.reason, r),
      });
      card.addEventListener("click", () => openDetail(toDetail(r, r.type, null)));
      row.append(card);
    }
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Cache danych zalogowanego usera (oceny + lista) — używany na profilu i w detalu.
let myProfile = { user: null, reviews: [], watchlist: [] };
async function loadMe() {
  myProfile = await api("/me");
  return myProfile;
}

// Grupy kategorii na prawej stronie profilu.
const CAT_GROUPS = [
  { key: "music", label: "Muzyka", types: ["MUZYKA"] },
  { key: "film", label: "Filmy / Seriale", types: ["FILM", "SERIAL"] },
  { key: "anime", label: "Anime", types: ["ANIME"] },
  { key: "book", label: "Książki / Manga", types: ["KSIAZKA", "MANGA"] },
  { key: "game", label: "Gry", types: ["GRA"] },
];

// Ile okładek pokazuje jeden rząd kategorii na profilu. JEDNO miejsce — teksty
// („wybierz do N") też się z tego biorą, żeby nie rozjechały się z rzeczywistością.
const MAX_COVERS = 4;

// Które okładki pokazać w danej kategorii — wybór usera (mapa key→[mediaId]),
// zapis w localStorage. Puste = pokaż domyślnie pierwsze MAX_COVERS.
const FEATURED_KEY = "mozaika_featured";

function getFeaturedMap() {
  try {
    const m = JSON.parse(localStorage.getItem(FEATURED_KEY) || "{}");
    return m && typeof m === "object" ? m : {};
  } catch {
    return {};
  }
}

function getFeatured(catKey) {
  const ids = getFeaturedMap()[catKey];
  return Array.isArray(ids) ? ids : [];
}

function setFeatured(catKey, ids) {
  const m = getFeaturedMap();
  if (ids.length) m[catKey] = ids;
  else delete m[catKey];
  localStorage.setItem(FEATURED_KEY, JSON.stringify(m));
}

// Które pozycje pokazać w kategorii: wybrane okładki albo pierwsze MAX_COVERS.
function displayedForCat(g, items) {
  const feat = getFeatured(g.key);
  if (feat.length) {
    const byId = new Map(items.map((r) => [r.media.id, r]));
    const chosen = feat.map((id) => byId.get(id)).filter(Boolean);
    if (chosen.length) return chosen.slice(0, MAX_COVERS);
  }
  return items.slice(0, MAX_COVERS);
}

// Dodaje klikalną kartę (otwiera szczegóły) do kontenera.
// Muzyka = kwadratowa okładka (jak płyta CD), reszta = plakat 2:3.
// onClick opcjonalny — nadpisuje domyślne otwarcie szczegółów (np. z nakładki).
// rect=true wymusza plakat 2:3 nawet dla muzyki (używane w Top 4).
function appendCard(container, media, rating, onClick, rect) {
  const square = media.type === "MUZYKA" && !rect;
  const { card } = posterCard(media, { score: rating, noMeta: true, square });
  card.addEventListener(
    "click",
    onClick ?? (() => openDetail(toDetail(media, media.type, media.id, rating))),
  );
  container.append(card);
}

// Nakładka „Zobacz wszystko" — pełna siatka pozycji danej sekcji/kategorii.
// items: lista rekordów {media, rating} (recenzje) lub {media} (watchlista).
function openSeeAll(title, items) {
  $("seeAllTitle").textContent = title;
  const grid = $("seeAllGrid");
  grid.classList.remove("hidden"); // wracamy z trybu „Co obejrzeć razem"
  $("togetherWrap").classList.add("hidden");
  grid.innerHTML = "";
  for (const it of items) {
    const media = it.media;
    const rating = it.rating;
    appendCard(grid, media, rating, () => {
      closeSeeAll();
      openDetail(toDetail(media, media.type, media.id, rating));
    });
  }
  $("seeAllOverlay").classList.remove("hidden");
}

function closeSeeAll() {
  $("seeAllOverlay").classList.add("hidden");
}

// --- Wybór okładek w kategorii (max 4) — używa nakładki „Zobacz wszystko" ---
let catPickCtx = null; // { group, items } gdy tryb wyboru okładek

function openCatPicker(group, items) {
  catPickCtx = { group, items };
  $("seeAllGrid").classList.remove("hidden"); // picker używa siatki plakatów
  $("togetherWrap").classList.add("hidden");
  $("seeAllTitle").textContent = t("pickCovers", {
    label: group.label,
    max: MAX_COVERS,
  });
  renderCatPickGrid();
  $("seeAllOverlay").classList.remove("hidden");
}

function renderCatPickGrid() {
  const { group, items } = catPickCtx;
  const grid = $("seeAllGrid");
  grid.innerHTML = "";
  const feat = getFeatured(group.key);
  for (const r of items) {
    const square = r.media.type === "MUZYKA";
    const { card } = posterCard(r.media, { score: r.rating, noMeta: true, square });
    const pos = feat.indexOf(r.media.id);
    if (pos >= 0) {
      card.classList.add("picked");
      const num = document.createElement("span");
      num.className = "pick-num";
      num.textContent = String(pos + 1);
      card.append(num);
    }
    card.addEventListener("click", () => {
      let cur = getFeatured(group.key);
      if (cur.includes(r.media.id)) {
        cur = cur.filter((id) => id !== r.media.id);
      } else {
        if (cur.length >= MAX_COVERS) {
          toast(t("maxCovers", { max: MAX_COVERS }));
          return;
        }
        cur = [...cur, r.media.id];
      }
      setFeatured(group.key, cur);
      renderCatPickGrid();
      renderRatedByCat(myProfile.reviews);
    });
    grid.append(card);
  }
}

function renderRatedByCat(reviews, readOnly) {
  const box = $("ratedByCat");
  box.innerHTML = "";
  // WSZYSTKIE 5 kategorii zawsze jako stałe kontenery (puste też), żeby układ się
  // nie rozjeżdżał. Na własnym profilu można wybrać 4 okładki; na cudzym — pierwsze 4.
  for (const g of CAT_GROUPS) {
    const items = reviews.filter((r) => g.types.includes(r.media.type));
    const catRow = document.createElement("div");
    catRow.className = "cat-row";
    // Nazwa kategorii i przycisk „Zmień" w jednej kolumnie po lewej. Przycisk był
    // wcześniej pozycjonowany absolutnie nad plakatami i przy 4 okładkach (które
    // wypełniają całą szerokość) lądował NA ostatniej z nich.
    const head = document.createElement("div");
    head.className = "cat-head";
    const label = document.createElement("div");
    label.className = "cat-label";
    label.textContent = g.label;
    head.append(label);
    const posters = document.createElement("div");
    posters.className = "cat-posters";
    if (items.length === 0) {
      posters.classList.add("empty");
      const ph = document.createElement("span");
      ph.className = "cat-empty";
      ph.textContent = t("nothingRatedCat");
      posters.append(ph);
    } else {
      const shown = readOnly ? items.slice(0, MAX_COVERS) : displayedForCat(g, items);
      for (const r of shown) appendCard(posters, r.media, r.rating);
    }
    // „Wybierz" tylko na WŁASNYM profilu (nie zmieniasz cudzych okładek).
    if (!readOnly && items.length > 0) {
      const btn = document.createElement("button");
      btn.className = "seeall cat-seeall";
      btn.type = "button";
      btn.textContent =
        items.length > MAX_COVERS
          ? t("pickN", { n: items.length, max: MAX_COVERS })
          : t("edit");
      btn.addEventListener("click", () => openCatPicker(g, items));
      head.append(btn);
    }
    catRow.append(head, posters);
    box.append(catRow);
  }
}

// --- Znajomi (follow) + feed aktywności ---
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("justNow");
  if (s < 3600) return t("minAgo", { n: Math.floor(s / 60) });
  if (s < 86400) return t("hAgo", { n: Math.floor(s / 3600) });
  return t("dAgo", { n: Math.floor(s / 86400) });
}

/** Zwięzły wiek wiadomości na listę rozmów: „teraz", „3 min", „2 godz", „5 dni", „6 tyg". */
function timeAgoShort(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("shortNow");
  if (s < 3600) return t("shortMin", { n: Math.floor(s / 60) });
  if (s < 86400) return t("shortH", { n: Math.floor(s / 3600) });
  if (s < 604800) return t("shortD", { n: Math.floor(s / 86400) });
  return t("shortW", { n: Math.floor(s / 604800) });
}

// Kółko z avatarem usera (zdjęcie albo inicjał).
function avatarEl(user) {
  const el = document.createElement("div");
  el.className = "feed-avatar";
  if (user.avatarUrl) {
    const img = document.createElement("img");
    img.src = user.avatarUrl;
    img.alt = "";
    el.append(img);
  } else {
    el.textContent = (user.displayName[0] || "?").toUpperCase();
  }
  return el;
}

// Ile wpisów historii pokazujemy na telefonie zanim schowamy resztę pod „Pokaż więcej".
// Na desktopie panel ma własny scroll, więc tam nic nie chowamy (patrz styles.css).
const FEED_COLLAPSED = 5;

async function loadActivity() {
  const box = $("activityFeed");
  const more = $("feedMore");
  box.classList.remove("expanded"); // po odświeżeniu historia znów jest zwinięta
  more.classList.add("hidden");
  box.innerHTML = `<p class="muted small">${t("loading")}</p>`;
  try {
    const [items, following] = await Promise.all([
      api("/me/activity"),
      api("/me/following").catch(() => []),
    ]);
    box.innerHTML = "";
    // Przycisk ma sens tylko wtedy, gdy naprawdę jest co rozwijać.
    more.classList.toggle("hidden", items.length <= FEED_COLLAPSED);
    more.textContent = t("showMore", { n: items.length - FEED_COLLAPSED });
    if (items.length === 0) {
      box.innerHTML = `<p class="muted small">${
        following.length === 0 ? t("noFollows") : t("noActivity")
      }</p>`;
      return;
    }
    for (const it of items) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "feed-item";
      item.append(avatarEl(it.user));
      const txt = document.createElement("div");
      txt.className = "feed-text";
      const line = document.createElement("div");
      line.className = "feed-line";
      const name = document.createElement("span");
      name.className = "feed-name";
      name.textContent = it.user.displayName;
      const rate = document.createElement("span");
      rate.className = "feed-rate";
      rate.textContent = `★ ${it.rating}`;
      line.append(name, rate);
      const title = document.createElement("div");
      title.className = "feed-title";
      title.textContent = it.media.title;
      // Klik w tytuł → szczegóły tytułu (nie wchodzi na profil osoby).
      title.addEventListener("click", (e) => {
        e.stopPropagation();
        openDetail(toDetail(it.media, it.media.type, it.media.id));
      });
      const time = document.createElement("div");
      time.className = "feed-time";
      time.textContent = timeAgo(it.createdAt);
      txt.append(line, title, time);
      item.append(txt);
      // Klik w resztę pozycji → profil osoby.
      item.addEventListener("click", () => openUserProfile(it.user.id));
      box.append(item);
    }
  } catch (e) {
    box.innerHTML = `<p class="muted small">${e.message}</p>`;
    $("feedMore").classList.add("hidden");
  }
}

// Przełącznik „Zobacz wszystkie" ⇄ „Pokaż mniej" dla sekcji „Moje komentarze".
function toggleComments() {
  const box = $("myComments");
  const rozwiniete = box.classList.toggle("expanded");
  const ile = box.querySelectorAll(".comment-item").length;
  $("commentsMore").textContent = rozwiniete
    ? t("showLess")
    : t("seeAllComments", { n: ile });
}

// Przełącznik „Pokaż więcej" ⇄ „Pokaż mniej" — rozwija i z powrotem zwija historię.
// (CSS chowa wpisy powyżej FEED_COLLAPSED tylko na telefonie; na desktopie klasa
// `expanded` niczego nie zmienia, bo panel ma tam własny scroll.)
function toggleFeed() {
  const box = $("activityFeed");
  const rozwiniete = box.classList.toggle("expanded");
  const ukryte = box.querySelectorAll(".feed-item").length - FEED_COLLAPSED;
  $("feedMore").textContent = rozwiniete ? t("showLess") : t("showMore", { n: ukryte });
}

const friendsData = { others: [], followingIds: new Set() };

async function renderFriendsList() {
  const list = $("friendsList");
  list.innerHTML = `<p class="muted small">${t("loading")}</p>`;
  try {
    const [users, following] = await Promise.all([api("/users"), api("/me/following")]);
    friendsData.followingIds = new Set(following.map((u) => u.id));
    friendsData.others = users.filter((u) => u.id !== me.id);
    drawFriends();
  } catch (e) {
    list.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
}

// Rysuje listę znajomych z uwzględnieniem wyszukiwarki (filtr po nazwie).
function drawFriends() {
  const list = $("friendsList");
  const q = ($("friendsSearch").value || "").trim().toLowerCase();
  const items = q
    ? friendsData.others.filter((u) => u.displayName.toLowerCase().includes(q))
    : friendsData.others;
  list.innerHTML = "";
  if (friendsData.others.length === 0) {
    list.innerHTML = `<p class="muted small">${t("noUsers")}</p>`;
    return;
  }
  if (items.length === 0) {
    list.innerHTML = `<p class="muted small">${t("noFriendsFound")}</p>`;
    return;
  }
  for (const u of items) {
    const row = document.createElement("div");
    row.className = "friend-row";
    const av = avatarEl(u);
    av.style.cursor = "pointer";
    av.addEventListener("click", () => {
      closeFriends();
      openUserProfile(u.id);
    });
    row.append(av);
    const name = document.createElement("span");
    name.className = "friend-name friend-link";
    name.textContent = u.displayName;
    name.addEventListener("click", () => {
      closeFriends();
      openUserProfile(u.id);
    });
    const btn = document.createElement("button");
    btn.type = "button";
    const on = friendsData.followingIds.has(u.id);
    btn.className = "follow-btn" + (on ? " active" : "");
    btn.textContent = on ? t("following") : t("follow");
    btn.addEventListener("click", async () => {
      try {
        if (friendsData.followingIds.has(u.id)) {
          await api(`/me/follow/${u.id}`, { method: "DELETE" });
        } else {
          await api("/me/follow", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ userId: u.id }),
          });
        }
        await renderFriendsList();
        loadActivity();
      } catch (e) {
        toast(e.message);
      }
    });
    row.append(name, btn);
    list.append(row);
  }
}

// --- Centrum powiadomień (follow / polubienie recenzji / ocena z listy) ---
let notifCache = [];

async function loadNotifications() {
  try {
    notifCache = await api("/me/notifications");
  } catch {
    notifCache = [];
  }
  updateNotifBadge();
}

function updateNotifBadge() {
  const n = notifCache.filter((x) => !x.readAt).length;
  const badge = $("notifBadge");
  badge.textContent = n > 9 ? "9+" : String(n);
  badge.classList.toggle("hidden", n === 0);
}

function notifVerb(type) {
  if (type === "like") return t("notifLiked");
  if (type === "watchlist_rated") return t("notifRated");
  if (type === "premiere") return t("notifPremiere");
  if (type === "comment") return t("notifComment");
  if (type === "reply") return t("notifReply");
  return t("notifFollowed");
}

/**
 * Ikonka premiery — plakat tytułu, a gdy go brak, 🍿. Powiadomienie o premierze
 * nie ma sprawcy (przychodzi od systemu), więc nie ma tu czyjego awatara pokazać.
 */
function premiereIconEl(media) {
  const el = document.createElement("div");
  el.className = "feed-avatar";
  if (media?.posterUrl) {
    const img = document.createElement("img");
    img.src = media.posterUrl;
    img.alt = "";
    el.append(img);
  } else {
    el.textContent = "🍿";
  }
  return el;
}

function renderNotifList() {
  const list = $("notifList");
  list.innerHTML = "";
  if (!notifCache.length) {
    list.innerHTML = `<p class="muted small">${t("noNotif")}</p>`;
    return;
  }
  for (const n of notifCache) {
    // Premiera nie ma sprawcy — prowadzi do tytułu i zaczyna się od jego nazwy.
    const isPremiere = n.type === "premiere";
    // Usunięty tytuł zeruje mediaId (SetNull). Premiera bez tytułu i bez sprawcy nie
    // ma czego pokazać, więc ją pomijamy zamiast rysować pusty wiersz.
    if (isPremiere && !n.media) continue;
    const toMedia =
      n.media &&
      (isPremiere ||
        n.type === "like" ||
        n.type === "watchlist_rated" ||
        n.type === "comment" ||
        n.type === "reply");
    const row = document.createElement("div");
    row.className = "friend-row notif-row";
    if (!n.readAt) row.classList.add("new");
    const av = isPremiere ? premiereIconEl(n.media) : avatarEl(n.actor);
    av.style.cursor = "pointer";
    const go = () => {
      closeNotif();
      if (toMedia) openDetail(toDetail(n.media, n.media.type, n.media.id));
      else if (n.actor) openUserProfile(n.actor.id);
    };
    av.addEventListener("click", go);
    const body = document.createElement("div");
    body.className = "notif-body";
    const txt = document.createElement("span");
    txt.className = "friend-link";
    const b = document.createElement("b");
    b.textContent = isPremiere ? `„${n.media.title}”` : n.actor.displayName;
    txt.append(b, ` ${notifVerb(n.type)}`);
    if (toMedia && !isPremiere) txt.append(`: „${n.media.title}”`);
    txt.addEventListener("click", go);
    const time = document.createElement("span");
    time.className = "notif-time muted small";
    time.textContent = timeAgo(n.createdAt);
    body.append(txt, time);
    row.append(av, body);
    list.append(row);
  }
}

async function openNotif() {
  $("notifOverlay").classList.remove("hidden");
  await loadNotifications();
  renderNotifList();
  // Oznacz jako przeczytane na serwerze i wyzeruj badge.
  api("/me/notifications/read", { method: "POST" }).catch(() => {});
  notifCache.forEach((n) => (n.readAt = n.readAt || new Date().toISOString()));
  updateNotifBadge();
}
function closeNotif() {
  $("notifOverlay").classList.add("hidden");
}

async function openFriends() {
  $("friendsOverlay").classList.remove("hidden");
  await renderFriendsList();
}

function closeFriends() {
  $("friendsOverlay").classList.add("hidden");
}

// --- Lista osób (klik w licznik „obserwujących / obserwowanych" na profilu) ---
// kind: "followers" | "following". Źródło zależy od tego, czyj profil oglądamy.
async function openPeople(kind) {
  const base = viewingUserId ? `/users/${viewingUserId}` : "/me";
  $("peopleTitle").textContent = t(
    kind === "followers" ? "followersTitle" : "followingTitle",
  );
  const list = $("peopleList");
  list.innerHTML = `<p class="muted small">…</p>`;
  $("peopleOverlay").classList.remove("hidden");
  try {
    renderPeople(await api(`${base}/${kind}`));
  } catch (e) {
    list.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
}

function renderPeople(users) {
  const list = $("peopleList");
  list.innerHTML = "";
  if (!users.length) {
    list.innerHTML = `<p class="muted small">${t("peopleEmpty")}</p>`;
    return;
  }
  for (const u of users) {
    const row = document.createElement("div");
    row.className = "friend-row";
    const av = avatarEl(u);
    av.style.cursor = "pointer";
    const go = () => {
      closePeople();
      openUserProfile(u.id);
    };
    av.addEventListener("click", go);
    const name = document.createElement("span");
    name.className = "friend-name friend-link";
    name.textContent = u.displayName;
    name.addEventListener("click", go);
    row.append(av, name);
    list.append(row);
  }
}

function closePeople() {
  $("peopleOverlay").classList.add("hidden");
}

// --- Czat (wiadomości między wzajemnymi znajomymi) ---
let chatWithId = null; // z kim mamy otwartą rozmowę (null = widok listy)
let chatWithUser = null; // pełny obiekt rozmówcy {id, displayName, avatarUrl} — do awatara
let chatPollTimer = null; // odświeżanie otwartej rozmowy co kilka sekund
// Czy wątek jest przewinięty na sam dół. Trzymamy to na bieżąco, bo gdy klawiatura
// skurczy widok, jest już za późno, żeby to policzyć — clientHeight zdążył się zmienić.
let chatAtBottom = true;
let typingPollTimer = null; // sprawdzanie „czy rozmówca pisze"
let typingDotsTimer = null; // animacja kropek 0→1→2→3→0
let lastTypingPing = 0; // throttle pingów „piszę" (ms)

// Godzina wiadomości (HH:MM) w lokalnej strefie/locale przeglądarki.
function fmtMsgTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Przerwa w rozmowie, po której wstawiamy nagłówek z czasem (jak na Instagramie —
// czas nie wisi przy każdej wiadomości, tylko oddziela bloki rozmowy).
const CHAT_SEP_GAP_MS = 60 * 60 * 1000;

/** Nagłówek bloku: dziś sama godzina, starsze — z datą. */
function fmtMsgSep(iso) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  if (today) return fmtMsgTime(iso);
  const date = d.toLocaleDateString([], { day: "numeric", month: "short" });
  return `${date}, ${fmtMsgTime(iso)}`;
}

function openMessages() {
  closeFriends();
  $("chatOverlay").classList.remove("hidden");
  showConvList();
  loadConversations();
}

function closeChat() {
  stopChatPoll();
  chatWithId = null;
  $("chatOverlay").classList.add("hidden");
}

function showConvList() {
  stopChatPoll();
  chatWithId = null;
  $("chatThreadView").classList.add("hidden");
  $("chatListView").classList.remove("hidden");
}

async function loadConversations() {
  const list = $("convList");
  list.innerHTML = `<p class="muted small">…</p>`;
  let convs;
  try {
    convs = await api("/me/conversations");
  } catch (e) {
    list.innerHTML = `<p class="muted small">${e.message}</p>`;
    return;
  }
  updateMsgBadge(convs.reduce((s, c) => s + c.unread, 0));
  list.innerHTML = "";
  if (!convs.length) {
    list.innerHTML = `<p class="muted small">${t("noConversations")}</p>`;
    return;
  }
  for (const c of convs) {
    const row = document.createElement("div");
    row.className = "friend-row conv-row";
    if (c.unread > 0) row.classList.add("unread");
    const av = avatarEl(c.user);
    const body = document.createElement("div");
    body.className = "conv-body";
    const name = document.createElement("span");
    name.className = "friend-name";
    name.textContent = c.user.displayName;
    const preview = document.createElement("span");
    preview.className = "conv-preview muted small";
    let previewText;
    if (c.lastDeleted) previewText = t("msgDeleted");
    else if (c.lastImage) previewText = `📷 ${t("photo")}`;
    else if (c.lastMediaTitle) previewText = `📎 ${c.lastMediaTitle}`;
    else previewText = c.lastText;
    preview.textContent =
      (c.fromMe && !c.lastDeleted ? `${t("you")}: ` : "") + previewText;
    // Podgląd i wiek wiadomości w jednej linii pod imieniem (jak na Instagramie):
    // skraca się sam podgląd, czas zostaje w całości.
    const sub = document.createElement("span");
    sub.className = "conv-sub";
    const time = document.createElement("span");
    time.className = "conv-time";
    time.textContent = `· ${timeAgoShort(c.lastAt)}`;
    sub.append(preview, time);
    body.append(name, sub);
    row.append(av, body);
    if (c.unread > 0) {
      const badge = document.createElement("span");
      badge.className = "conv-unread";
      badge.textContent = c.unread > 9 ? "9+" : String(c.unread);
      row.append(badge);
    }
    row.addEventListener("click", () => openChat(c.user));
    list.append(row);
  }
}

async function openChat(user) {
  chatWithId = user.id;
  chatWithUser = user;
  $("chatListView").classList.add("hidden");
  $("chatThreadView").classList.remove("hidden");
  $("chatWith").textContent = user.displayName;
  const avBox = $("chatWithAvatar");
  avBox.innerHTML = "";
  avBox.append(avatarEl(user));
  $("chatText").value = "";
  await loadThread(true);
  $("chatText").focus();
  startChatPoll();
}

/** Przewija wątek na sam dół i zapamiętuje, że tam jesteśmy. */
function scrollChatToBottom() {
  const box = $("chatMessages");
  box.scrollTop = box.scrollHeight;
  chatAtBottom = true;
}

// forceScroll: true = zawsze na dół (otwarcie/wysłanie); false = tylko gdy user
// już był na dole (poll nie wyrywa mu widoku, gdy czyta starsze wiadomości).
async function loadThread(forceScroll = false) {
  if (!chatWithId) return;
  const box = $("chatMessages");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  // Zapamiętujemy pozycję: po przebudowie listy (innerHTML="") mobilne silniki
  // zerują scroll do 0 = na samą górę. Gdy user czyta starsze (nie jest na dole),
  // przywracamy jego miejsce zamiast wyrzucać go na górę przy każdym pollingu.
  const prevScrollTop = box.scrollTop;
  let msgs;
  try {
    msgs = await api(`/me/messages/${chatWithId}`);
  } catch (e) {
    box.innerHTML = `<p class="muted small">${e.message}</p>`;
    return;
  }
  if (chatWithId === null) return; // zamknięto w międzyczasie
  box.innerHTML = "";
  if (!msgs.length) {
    box.innerHTML = `<p class="muted small chat-empty">${t("chatEmpty")}</p>`;
  } else {
    // Ostatnia MOJA wiadomość — tylko przy niej pokazujemy „Wysłano/Zobaczone".
    let lastMineIdx = -1;
    msgs.forEach((m, i) => {
      if (m.senderId !== chatWithId) lastMineIdx = i;
    });
    const czas = (m) => new Date(m.createdAt).getTime();
    msgs.forEach((m, i) => {
      const mine = m.senderId !== chatWithId;
      const prev = i > 0 ? msgs[i - 1] : null;
      const next = i < msgs.length - 1 ? msgs[i + 1] : null;
      // Dłuższa cisza rozbija rozmowę na bloki — nowy blok zawsze zaczyna serię.
      const newBlock = !prev || czas(m) - czas(prev) > CHAT_SEP_GAP_MS;
      const startOfGroup = newBlock || prev.senderId !== m.senderId;
      const endOfGroup =
        !next || next.senderId !== m.senderId || czas(next) - czas(m) > CHAT_SEP_GAP_MS;

      // Nagłówek z czasem między blokami (zamiast godziny przy każdej serii).
      if (newBlock) {
        const sep = document.createElement("div");
        sep.className = "chat-sep";
        sep.textContent = fmtMsgSep(m.createdAt);
        box.append(sep);
      }

      const line = document.createElement("div");
      line.className = `chat-line ${mine ? "me" : "them"}`;
      if (startOfGroup) line.classList.add("grp-start");

      // Awatar tylko przy rozmówcy i tylko na końcu jego serii — przy moich
      // wiadomościach go nie ma (wiadomo, że są moje: są po prawej).
      if (!mine) {
        if (endOfGroup) {
          const av = avatarEl(chatWithUser);
          av.classList.add("chat-avatar");
          line.append(av);
        } else {
          const spacer = document.createElement("div");
          spacer.className = "chat-avatar spacer";
          line.append(spacer);
        }
      }

      const col = document.createElement("div");
      col.className = "chat-col";
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${mine ? "me" : "them"}`;
      // Serię wiadomości spinamy wizualnie: stykające się rogi są przycięte.
      if (startOfGroup) bubble.classList.add("grp-start");
      if (endOfGroup) bubble.classList.add("grp-end");
      if (m.deletedAt) {
        // „Tombstone" — treść usunięta, pokazujemy kto usunął.
        bubble.classList.add("deleted");
        bubble.textContent = mine ? t("msgDeletedMine") : t("msgDeleted");
      } else {
        // Wiadomość może nieść: kartę tytułu, zdjęcie i/lub tekst.
        if (m.imageUrl || m.media) bubble.classList.add("bubble-media");
        if (m.media) bubble.append(buildMsgMediaCard(m.media));
        if (m.imageUrl) {
          const img = document.createElement("img");
          img.className = "chat-image";
          img.src = m.imageUrl;
          img.loading = "lazy";
          img.addEventListener("click", () => window.open(m.imageUrl, "_blank"));
          bubble.append(img);
        }
        if (m.text) {
          const tx = document.createElement("div");
          tx.className = "chat-text-body";
          tx.textContent = m.text;
          bubble.append(tx);
        }
      }
      col.append(bubble);

      // Reakcje NA rogu dymka (emoji; podświetlone, jeśli to moja reakcja).
      if (!m.deletedAt && m.reactions && m.reactions.length) {
        const rx = document.createElement("div");
        rx.className = "chat-reactions";
        for (const r of m.reactions) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className =
            "reaction-chip" + (r.userId === myProfile.user?.id ? " mine" : "");
          chip.textContent = r.emoji;
          chip.addEventListener("click", () => reactMsg(m.id, r.emoji));
          rx.append(chip);
        }
        bubble.classList.add("has-reaction");
        bubble.append(rx); // absolutnie pozycjonowane w rogu dymka
      }

      // Pod dymkiem zostaje tylko to, co naprawdę wnosi treść: status ostatniej
      // mojej wiadomości i znacznik edycji. Godzina jest w nagłówku bloku.
      const edited = m.editedAt && !m.deletedAt;
      const status = mine && i === lastMineIdx;
      if (edited || status) {
        const meta = document.createElement("div");
        meta.className = "chat-meta";
        const czesci = [];
        if (edited) czesci.push(t("edited"));
        if (status) czesci.push(m.readAt ? t("seen") : t("sent"));
        meta.textContent = czesci.join(" · ");
        col.append(meta);
      }

      line.append(col);

      // Pasek akcji (na hover): reakcja / edycja / usuń.
      if (!m.deletedAt) {
        const actions = document.createElement("div");
        actions.className = "chat-actions";
        actions.append(mkAct("＋", t("react"), (e) => openReactionPicker(e, m.id)));
        if (mine && m.text && !m.imageUrl && !m.media) {
          actions.append(mkAct("✏️", t("editMsg"), () => startEditMsg(m)));
        }
        if (mine) actions.append(mkAct("🗑", t("deleteMsg"), () => deleteMsg(m.id)));
        line.append(actions);
      }

      box.append(line);
    });
  }
  if (forceScroll || atBottom) scrollChatToBottom();
  else box.scrollTop = prevScrollTop; // czytającego starsze zostawiamy tam, gdzie był
  refreshMsgBadge(); // przeczytanie zmniejsza licznik
}

async function sendChat(ev) {
  ev.preventDefault();
  const input = $("chatText");
  const text = input.value.trim();
  if (!text || !chatWithId) return;
  input.value = "";
  try {
    await api("/me/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUserId: chatWithId, text }),
    });
    await loadThread(true);
  } catch (e) {
    toast(e.message);
    input.value = text; // przywróć treść, żeby nie zgubić
  }
}

async function deleteMsg(id) {
  try {
    await api(`/me/message/${id}`, { method: "DELETE" });
    await loadThread(false);
  } catch (e) {
    toast(e.message);
  }
}

// Mały przycisk akcji przy dymku (reakcja/edycja/usuń).
function mkAct(icon, title, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chat-act";
  b.title = title;
  b.textContent = icon;
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick(e);
  });
  return b;
}

// Karta udostępnionego tytułu w dymku — klik otwiera stronę tytułu.
function buildMsgMediaCard(m) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "msg-media-card";
  const poster = document.createElement("div");
  poster.className = "msg-media-poster";
  if (m.posterUrl) {
    const img = document.createElement("img");
    img.src = m.posterUrl;
    img.alt = "";
    poster.append(img);
  } else {
    poster.textContent = "🎬";
  }
  const info = document.createElement("div");
  info.className = "msg-media-info";
  const title = document.createElement("div");
  title.className = "msg-media-title";
  title.textContent = m.title;
  const sub = document.createElement("div");
  sub.className = "msg-media-sub muted small";
  sub.textContent = m.year ? String(m.year) : "";
  info.append(title, sub);
  card.append(poster, info);
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    closeChat();
    openDetail(toDetail(m, m.type, m.id));
  });
  return card;
}

async function reactMsg(id, emoji) {
  try {
    await api(`/me/message/${id}/reaction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    await loadThread(false);
  } catch (e) {
    toast(e.message);
  }
}

const REACT_EMOJIS = ["❤️", "😂", "👍", "👎", "😮", "😢"];

function closeReactionPicker() {
  const p = document.getElementById("reactionPicker");
  if (p) p.remove();
}

function openReactionPicker(e, id) {
  closeReactionPicker();
  const pick = document.createElement("div");
  pick.className = "reaction-picker";
  pick.id = "reactionPicker";
  for (const em of REACT_EMOJIS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      reactMsg(id, em);
      closeReactionPicker();
    });
    pick.append(b);
  }
  document.body.append(pick);
  const x = Math.min(e.clientX, window.innerWidth - 230);
  const y = Math.max(e.clientY - 52, 10);
  pick.style.left = `${Math.max(x, 10)}px`;
  pick.style.top = `${y}px`;
  // zamknij przy następnym kliknięciu gdziekolwiek
  setTimeout(
    () => document.addEventListener("click", closeReactionPicker, { once: true }),
    0,
  );
}

async function startEditMsg(m) {
  const nt = prompt(t("editMsg"), m.text);
  if (nt === null) return;
  const text = nt.trim();
  if (!text) return;
  try {
    await api(`/me/message/${m.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    await loadThread(false);
  } catch (e) {
    toast(e.message);
  }
}

// Kompresja obrazu (zachowuje proporcje, max ~1200px, JPEG) → data:image.
function compressImage(file, max = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => (img.src = String(reader.result));
    reader.onerror = () => reject(new Error("Nie udało się wczytać pliku."));
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Nieprawidłowy obraz."));
    reader.readAsDataURL(file);
  });
}

async function onChatImage(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!file || !chatWithId) return;
  try {
    const imageUrl = await compressImage(file);
    await api("/me/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUserId: chatWithId, imageUrl }),
    });
    await loadThread(true);
  } catch (e) {
    toast(e.message);
  }
}

// Znajomi = wzajemna obserwacja (część wspólna following ∩ followers).
async function getMutualFriends() {
  const [following, followers] = await Promise.all([
    api("/me/following"),
    api("/me/followers"),
  ]);
  const followerIds = new Set(followers.map((u) => u.id));
  return following.filter((u) => followerIds.has(u.id));
}

// „Wyślij znajomemu" z detalu — wybór znajomego → wysyła kartę tytułu do czatu.
async function shareMediaPick(mediaId) {
  $("peopleTitle").textContent = t("shareTo");
  const list = $("peopleList");
  list.innerHTML = `<p class="muted small">…</p>`;
  $("peopleOverlay").classList.remove("hidden");
  try {
    const friends = await getMutualFriends();
    list.innerHTML = "";
    if (!friends.length) {
      list.innerHTML = `<p class="muted small">${t("noMutual")}</p>`;
      return;
    }
    for (const u of friends) {
      const row = document.createElement("div");
      row.className = "friend-row conv-row";
      const av = avatarEl(u);
      const name = document.createElement("span");
      name.className = "friend-name";
      name.textContent = u.displayName;
      row.append(av, name);
      row.addEventListener("click", async () => {
        try {
          await api("/me/messages", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ toUserId: u.id, mediaId }),
          });
          closePeople();
          toast(t("shared", { name: u.displayName }));
        } catch (e) {
          toast(e.message);
        }
      });
      list.append(row);
    }
  } catch (e) {
    list.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
}

// Ping „piszę do rozmówcy" — throttled do 1 na 2 s (front woła przy każdym znaku).
async function pingTyping() {
  if (!chatWithId) return;
  const now = performance.now();
  if (now - lastTypingPing < 2000) return;
  lastTypingPing = now;
  try {
    await api("/me/typing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUserId: chatWithId }),
    });
  } catch {
    /* ping to detal — cicho */
  }
}

// Pokazuje/chowa „X pisze …" z animowanymi kropkami.
function showTyping(on) {
  const el = $("chatTyping");
  if (!on || !chatWithUser) {
    el.classList.add("hidden");
    el.innerHTML = "";
    stopTypingDots();
    return;
  }
  if (!el.classList.contains("hidden")) return; // już pokazany — nie przebudowuj
  el.classList.remove("hidden");
  el.innerHTML = "";
  const av = avatarEl(chatWithUser);
  av.classList.add("chat-avatar");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble them typing-bubble";
  const name = document.createElement("span");
  name.textContent = `${chatWithUser.displayName} ${t("typing")}`;
  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.id = "typingDots";
  bubble.append(name, dots);
  el.append(av, bubble);
  startTypingDots();
}

function startTypingDots() {
  stopTypingDots();
  let n = 0;
  typingDotsTimer = setInterval(() => {
    n = (n + 1) % 4; // 1,2,3,0,1,2,3,0 … (rośnie do 3, wraca do 0)
    const d = $("typingDots");
    if (d) d.textContent = ".".repeat(n);
  }, 400);
}

function stopTypingDots() {
  if (typingDotsTimer) {
    clearInterval(typingDotsTimer);
    typingDotsTimer = null;
  }
}

function startChatPoll() {
  stopChatPoll();
  chatPollTimer = setInterval(() => {
    if (chatWithId && !$("chatOverlay").classList.contains("hidden")) loadThread(false);
  }, 4000);
  typingPollTimer = setInterval(async () => {
    if (!chatWithId || $("chatOverlay").classList.contains("hidden")) return;
    try {
      const r = await api(`/me/typing/${chatWithId}`);
      showTyping(!!r.typing);
    } catch {
      /* cicho */
    }
  }, 1800);
}

function stopChatPoll() {
  if (chatPollTimer) {
    clearInterval(chatPollTimer);
    chatPollTimer = null;
  }
  if (typingPollTimer) {
    clearInterval(typingPollTimer);
    typingPollTimer = null;
  }
  showTyping(false);
}

function updateMsgBadge(n) {
  const txt = n > 9 ? "9+" : String(n);
  for (const id of ["msgBadge", "navMsgBadge"]) {
    const b = $(id);
    if (!b) continue;
    b.textContent = txt;
    b.classList.toggle("hidden", !n);
  }
}

async function refreshMsgBadge() {
  try {
    const convs = await api("/me/conversations");
    updateMsgBadge(convs.reduce((s, c) => s + c.unread, 0));
  } catch {
    /* cichy — badge to detal */
  }
}

// Renderuje dane profilu — własnego (readOnly=false) lub cudzego (readOnly=true).
function renderProfileData(data, readOnly) {
  // Nagłówek: zdjęcie profilowe + imię.
  $("profileName").textContent = readOnly
    ? data.user.displayName
    : t("hi", { name: data.user.displayName });
  const img = $("avatarImg");
  const initial = $("avatarInitial");
  if (data.user.avatarUrl) {
    img.src = data.user.avatarUrl;
    img.classList.remove("hidden");
    initial.classList.add("hidden");
  } else {
    img.classList.add("hidden");
    initial.classList.remove("hidden");
    initial.textContent = (data.user.displayName[0] || "?").toUpperCase();
  }
  $("avatarBtn").disabled = readOnly; // cudzego zdjęcia nie zmieniasz
  $("avatarBtn").title = readOnly ? "" : t("changePhoto");
  $("followProfileBtn").classList.toggle("hidden", !readOnly);
  // „Napisz" tylko na cudzym profilu i tylko gdy jesteście znajomymi (wzajemnie).
  $("msgProfileBtn").classList.toggle("hidden", !(readOnly && data.mutualFriend));
  // „Zablokuj" tylko na cudzym profilu (stan ustawia setBlockBtn po pobraniu blokad).
  $("blockProfileBtn").classList.toggle("hidden", !readOnly);

  // Liczniki obserwacji pod imieniem — KLIKALNE: pokazują listę osób.
  const fo = data.followersCount ?? 0;
  const fw = data.followingCount ?? 0;
  const counts = $("profileCounts");
  counts.innerHTML = "";
  const mkLink = (label, kind) => {
    const s = document.createElement("span");
    s.className = "count-link";
    s.textContent = label;
    s.addEventListener("click", () => openPeople(kind));
    return s;
  };
  counts.append(
    mkLink(t("followersLink", { n: fo }), "followers"),
    mkLink(t("followingLink", { n: fw }), "following"),
  );

  // 3. kolumna: własny profil = portret gustu + feed znajomych, cudzy = porównanie.
  $("profileFeed").classList.toggle("hidden", readOnly);
  $("comparePanel").classList.toggle("hidden", !readOnly);
  $("tastePanel").classList.toggle("hidden", readOnly); // portret tylko na własnym profilu
  // Cudzy profil: portretu gustu nie ma, więc komentarze biorą CAŁĄ szerokość (3×3).
  $("profileView").classList.toggle("readonly", readOnly);

  // Top 4 = przypięte (favorite).
  const top = data.reviews.filter((r) => r.favorite).slice(0, 4);
  const topBox = $("topMedia");
  topBox.innerHTML = "";
  if (top.length === 0) {
    topBox.innerHTML = `<p class="muted">${readOnly ? t("top4EmptyRO") : t("top4Empty")}</p>`;
  } else {
    // Muzyka w Top 4 jako prostokąt 2:3 (rect), nie kwadrat.
    for (const r of top) appendCard(topBox, r.media, r.rating, undefined, true);
  }

  // Lista „do obejrzenia/zagrania" — do 6 (3×2), reszta pod „Zobacz wszystko".
  const watch = data.watchlist || [];
  const watchBox = $("watchlist");
  watchBox.innerHTML = "";
  if (watch.length === 0) {
    watchBox.innerHTML = `<p class="muted">${readOnly ? t("watchEmptyRO") : t("watchEmpty")}</p>`;
  } else {
    for (const w of watch.slice(0, 6)) appendCard(watchBox, w.media, undefined);
  }
  const watchSeeAll = $("watchSeeAll");
  if (watch.length > 6) {
    watchSeeAll.classList.remove("hidden");
    watchSeeAll.textContent = t("seeAll", { n: watch.length });
    watchSeeAll.onclick = () => openSeeAll(t("watchlistTitle"), watch);
  } else {
    watchSeeAll.classList.add("hidden");
  }

  // Prawa strona: ocenione pogrupowane po kategoriach.
  renderRatedByCat(data.reviews, readOnly);

  // Komentarze (recenzje z tekstem) — lewy dół. Na cudzym profilu też: chcesz przeczytać,
  // co kolega napisał, bez wchodzenia w każdy tytuł osobno. I móc je stamtąd polubić.
  $("myCommentsWrap").classList.remove("hidden");
  const name = data.user.displayName;
  $("commentsTitle").textContent = readOnly
    ? t("userComments", { name })
    : t("myComments");
  renderMyComments(data.reviews, data.user.id, readOnly ? name : null);
}

// Lista Twoich recenzji z komentarzem: plakat + tytuł + ocena + tekst.
// Ile komentarzy pokazujemy zanim schowamy resztę pod przyciskiem — na laptopie
// i na telefonie tak samo (inaczej niż historia znajomych, która zwija się tylko
// na telefonie, bo na desktopie ma własny scroll).
const COMMENTS_COLLAPSED = 9;

// authorId = czyj to profil (autor tych recenzji); ownerName = imię, gdy to CUDZY profil
// (null na własnym) — z niego bierzemy nagłówek i tekst pustej listy.
function renderMyComments(reviews, authorId, ownerName) {
  const box = $("myComments");
  const more = $("commentsMore");
  box.innerHTML = "";
  box.classList.remove("expanded"); // po odświeżeniu znów zwinięte
  more.classList.add("hidden");
  const withText = reviews.filter((r) => r.media && (r.text || "").trim());
  if (withText.length === 0) {
    const empty = ownerName
      ? t("userCommentsEmpty", { name: ownerName })
      : t("myCommentsEmpty");
    box.innerHTML = `<p class="muted">${empty}</p>`;
    return;
  }
  // Przycisk tylko wtedy, gdy naprawdę jest co rozwijać.
  more.classList.toggle("hidden", withText.length <= COMMENTS_COLLAPSED);
  more.textContent = t("seeAllComments", { n: withText.length });
  for (const r of withText) {
    const item = document.createElement("article");
    item.className = "comment-item";

    const poster = document.createElement("div");
    poster.className = "comment-poster";
    if (r.media.posterUrl) {
      const img = document.createElement("img");
      img.src = r.media.posterUrl;
      img.alt = r.media.title;
      img.loading = "lazy";
      poster.append(img);
    } else {
      poster.textContent = r.media.title[0] || "?";
    }

    const body = document.createElement("div");
    body.className = "comment-body";
    const head = document.createElement("div");
    head.className = "comment-head";
    const title = document.createElement("span");
    title.className = "comment-title";
    title.textContent = r.media.title;
    const rating = document.createElement("span");
    rating.className = "comment-rating";
    rating.textContent = `★ ${r.rating}`;
    head.append(title, rating);
    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = r.text;
    body.append(head, text, likeControl(r, authorId));

    item.append(poster, body);
    item.addEventListener("click", () =>
      openDetail(toDetail(r.media, r.media.type, r.media.id, r.rating)),
    );
    box.append(item);
  }
}

async function loadProfile() {
  const data = await loadMe();
  // Cały obiekt z /me — wcześniej przepisywaliśmy tylko user/reviews/watchlist,
  // przez co followersCount i followingCount ginęły i liczniki obserwacji na
  // WŁASNYM profilu stały na zerze (na cudzym działały, bo tam idzie całe `data`).
  renderProfileData(data, false);
  loadActivity();
  loadTastePortrait();
}

// Enum rodzaju mediów → etykieta (z emoji) z i18n.
const TYPE_I18N = {
  FILM: "typeFilm",
  SERIAL: "typeFilm",
  KSIAZKA: "typeBook",
  MANGA: "typeManga",
  ANIME: "typeAnime",
  MUZYKA: "typeMusic",
  GRA: "typeGame",
};

async function loadTastePortrait() {
  const box = $("tasteBody");
  box.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    renderPortrait(await api("/me/taste-portrait"));
  } catch (e) {
    box.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Rysuje portret gustu: surowość + paski top gatunków/rodzajów + ulubiona dekada.
function renderPortrait(p) {
  const box = $("tasteBody");
  box.innerHTML = "";
  if (!p || p.reviewCount < 3) {
    box.innerHTML = `<p class="muted">${t("portraitEmpty")}</p>`;
    return;
  }

  const harsh = document.createElement("p");
  harsh.className = "taste-harsh";
  let word = t("harshBalanced");
  const g = p.globalBaseline;
  if (g !== null && g !== undefined && p.baseline >= g + 0.5) word = t("harshMild");
  else if (g !== null && g !== undefined && p.baseline <= g - 0.5) word = t("harshTough");
  const cmp = g !== null && g !== undefined ? ` · ${t("siteAvg")}: ${g}` : "";
  harsh.innerHTML = `${word} <span class="muted">(${t("yourAvg")}: ${p.baseline}${cmp})</span>`;
  box.append(harsh);

  const byCount = (arr) => [...arr].sort((a, b) => b.count - a.count);

  const section = (label, affs, fmt) => {
    if (!affs.length) return;
    const head = document.createElement("div");
    head.className = "taste-sec-label";
    head.textContent = label;
    box.append(head);
    const max = Math.max(...affs.map((a) => a.count));
    for (const a of affs) {
      const row = document.createElement("div");
      row.className = "taste-bar";
      const name = document.createElement("span");
      name.className = "taste-bar-name";
      name.textContent = fmt ? fmt(a.key) : a.key;
      const track = document.createElement("span");
      track.className = "taste-bar-track";
      const fill = document.createElement("span");
      fill.className = "taste-bar-fill";
      fill.style.width = `${Math.round((a.count / max) * 100)}%`;
      track.append(fill);
      const val = document.createElement("span");
      val.className = "taste-bar-val";
      val.textContent = a.count;
      row.append(name, track, val);
      box.append(row);
    }
  };

  section(t("topGenres"), byCount(p.genres).slice(0, 5));
  section(t("topTypes"), byCount(p.types).slice(0, 4), (k) => t(TYPE_I18N[k] || "") || k);

  const topDecade = byCount(p.decades)[0];
  if (topDecade) {
    const d = document.createElement("p");
    d.className = "taste-highlight";
    d.textContent = t("favDecade", { decade: topDecade.key });
    box.append(d);
  }
}

async function loadUserProfile(id) {
  const [data, following, blocks] = await Promise.all([
    api(`/users/${id}/profile`),
    api("/me/following").catch(() => []),
    api("/me/blocks").catch(() => []),
  ]);
  viewingName = data.user.displayName;
  viewingUser = data.user;
  renderProfileData(data, true);
  setFollowBtn(following.some((u) => u.id === id));
  setBlockBtn(blocks.some((u) => u.id === id));
  loadCompare(id);
}

function setFollowBtn(on) {
  const btn = $("followProfileBtn");
  btn.classList.toggle("active", on);
  btn.textContent = on ? t("following") : t("follow");
}

// Zablokowanemu chowamy „Obserwuj"/„Napisz" — z blokadą i tak nie zadziałają.
function setBlockBtn(blocked) {
  const btn = $("blockProfileBtn");
  btn.classList.toggle("active", blocked);
  btn.textContent = blocked ? t("unblock") : t("block");
  if (blocked) {
    $("followProfileBtn").classList.add("hidden");
    $("msgProfileBtn").classList.add("hidden");
  }
}

// „Co obejrzeć razem" — tytuły trafiające w gust WASZEJ DWÓJKI, których żadne
// z was jeszcze nie oceniło. Otwiera się w nakładce „Zobacz wszystko".
function togetherReason(reason) {
  if (reason?.kind === "bothWatchlist") return t("togBoth");
  if (reason?.kind === "theirWatchlist") return t("togTheirs", { name: viewingName });
  if (reason?.kind === "yourWatchlist") return t("togYours");
  return t("togFresh");
}

async function openTogether() {
  if (!viewingUserId) return;
  const grid = $("togetherGrid");
  $("seeAllGrid").classList.add("hidden"); // ta siatka jest dla samych plakatów
  $("togetherWrap").classList.remove("hidden");
  $("seeAllTitle").textContent = t("togetherTitle", { name: viewingName });
  grid.innerHTML = `<p class="muted">${t("loading")}</p>`;
  $("seeAllOverlay").classList.remove("hidden");
  try {
    const items = await api(`/users/${viewingUserId}/together`);
    grid.innerHTML = "";
    if (items.length === 0) {
      grid.innerHTML = `<p class="muted">${t("togEmpty")}</p>`;
      return;
    }
    for (const it of items) {
      const { card } = posterCard(it, {
        score: it.score,
        // Każda karta mówi, CZEMU tu jest i jak ją oceni każde z was.
        recby: `${togetherReason(it.reason)} · ${t("togScores", {
          you: it.scoreYou,
          them: it.scoreThem,
          name: viewingName,
        })}`,
      });
      card.addEventListener("click", () => {
        closeSeeAll();
        openDetail(toDetail(it, it.type, it.mediaId));
      });
      grid.append(card);
    }
  } catch (e) {
    grid.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Porównanie gustu z oglądanym userem: % dopasowania + wspólnie ocenione tytuły.
async function loadCompare(id) {
  const body = $("compareBody");
  const scoreSlot = $("compareScore");
  scoreSlot.innerHTML = "";
  body.innerHTML = '<p class="muted small">Liczenie…</p>';
  try {
    const data = await api(`/users/${id}/compare`);
    body.innerHTML = "";
    if (data.status !== "OK") {
      body.innerHTML = `<p class="muted small">${t("notEnough", { n: data.shared })}</p>`;
      return;
    }
    const score = document.createElement("div");
    score.className = "match-score";
    const pct = document.createElement("span");
    pct.className = "match-pct";
    pct.textContent = `${data.score}%`;
    const cap = document.createElement("span");
    cap.className = "match-cap";
    cap.textContent = t("matchCap", { n: data.sharedCount });
    score.append(pct, cap);
    // Procent nad przyciskiem „Co obejrzeć razem" (osobny slot pod nagłówkiem).
    scoreSlot.append(score);
    for (const s of data.shared) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "compare-row";
      const titleEl = document.createElement("div");
      titleEl.className = "compare-title";
      titleEl.textContent = s.media.title;
      const rates = document.createElement("div");
      rates.className = "compare-rates";
      const you = document.createElement("span");
      you.className = "cr-you";
      you.textContent = `${t("you")} ★${s.myRating}`;
      const them = document.createElement("span");
      them.className = "cr-them";
      them.textContent = `${viewingName} ★${s.theirRating}`;
      rates.append(you, them);
      row.append(titleEl, rates);
      row.addEventListener("click", () =>
        openDetail(toDetail(s.media, s.media.type, s.media.id, s.myRating)),
      );
      body.append(row);
    }
  } catch (e) {
    body.innerHTML = `<p class="muted small">${e.message}</p>`;
  }
}

// Wgranie zdjęcia profilowego: kompresja do 256px (canvas) → data:image → zapis.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => {
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Nie udało się wczytać pliku."));
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Nieprawidłowy obraz."));
    reader.readAsDataURL(file);
  });
}

async function onAvatarPick(ev) {
  const file = ev.target.value && ev.target.files ? ev.target.files[0] : null;
  if (!file) return;
  try {
    const avatarUrl = await fileToAvatar(file);
    await api("/me/avatar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ avatarUrl }),
    });
    $("avatarImg").src = avatarUrl;
    $("avatarImg").classList.remove("hidden");
    $("avatarInitial").classList.add("hidden");
    me.avatarUrl = avatarUrl;
    renderHello(); // nowe zdjęcie od razu w kafelku profilu na górze
    toast(t("savedPhoto"));
  } catch (e) {
    toast(e.message);
  } finally {
    ev.target.value = "";
  }
}

// --- Szczegóły tytułu (opis + ocena + komentarz) ---
let detailCtx = null;
/**
 * Pokazuje zwiastun albo chowa sekcję, gdy go nie ma.
 * Podanie null czyści też `src` ramki — inaczej film grałby dalej (i było go
 * słychać) po wyjściu ze szczegółów albo po przejściu do innego tytułu.
 */
// Film i anime przychodzą jako osadzenie YouTube (iframe), gry jako plik mp4 z RAWG
// (w iframe by nie ruszył) — stąd dwa elementy i przełączanie po `kind`.
function showTrailer(url, kind) {
  const box = $("detailTrailer");
  const frame = $("trailerFrame");
  const video = $("trailerVideo");

  frame.removeAttribute("src");
  video.pause(); // bez tego dźwięk poprzedniego zwiastuna leci dalej po zamknięciu
  video.removeAttribute("src");
  frame.classList.add("hidden");
  video.classList.add("hidden");

  if (!url) {
    box.classList.add("hidden");
    return;
  }
  const player = kind === "video" ? video : frame;
  player.src = url;
  player.classList.remove("hidden");
  box.classList.remove("hidden");
}

let detailReturn = "browse"; // dokąd wrócić z widoku szczegółów
let detailStars = null;

// Widget gwiazdek 0.5–10 (półgwiazdki: lewa połowa = x.5, prawa = x.0).
function buildStars(container, label) {
  container.innerHTML = "";
  let committed = 0;
  const fills = [];
  const paint = (v) => {
    for (let i = 0; i < 10; i += 1) {
      fills[i].style.width = `${Math.max(0, Math.min(1, v - i)) * 100}%`;
    }
    label.textContent = v ? `${v}/10` : "";
  };
  for (let i = 0; i < 10; i += 1) {
    const star = document.createElement("span");
    star.className = "star";
    const fill = document.createElement("span");
    fill.className = "fill";
    star.append(fill);
    fills.push(fill);
    star.addEventListener("mousemove", (e) => {
      paint(i + (e.offsetX < star.offsetWidth / 2 ? 0.5 : 1));
    });
    star.addEventListener("click", (e) => {
      committed = i + (e.offsetX < star.offsetWidth / 2 ? 0.5 : 1);
      paint(committed);
    });
    container.append(star);
  }
  container.addEventListener("mouseleave", () => paint(committed));
  return {
    get: () => committed,
    set: (v) => {
      committed = v || 0;
      paint(committed);
    },
  };
}

async function openDetail(item) {
  detailCtx = item;
  $("detailMsg").textContent = "";
  $("detailTitle").textContent = item.title;
  $("detailYear").textContent = item.year ? String(item.year) : "";

  const genresBox = $("detailGenres");
  genresBox.innerHTML = "";
  for (const g of item.genres ?? []) {
    const chip = document.createElement("span");
    chip.className = "genre-chip";
    chip.textContent = g;
    genresBox.append(chip);
  }

  const poster = $("detailPoster");
  poster.innerHTML = "";
  if (item.posterUrl) {
    const img = document.createElement("img");
    img.src = item.posterUrl;
    img.alt = item.title;
    poster.append(img);
  }

  detailStars.set(item.myRating ?? 0);
  // „Wyślij znajomemu" tylko dla tytułów już w bazie (mają mediaId).
  $("shareBtn").classList.toggle("hidden", !item.mediaId);
  $("detailComment").value = "";
  $("detailDesc").textContent = t("loadingDesc");
  $("detailReviews").innerHTML = "";
  detailReturn = !$("profileView").classList.contains("hidden")
    ? "profile"
    : $("searchResults").classList.contains("hidden")
      ? "browse"
      : "results";
  $("searchbar").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.add("hidden");
  $("profileView").classList.add("hidden");
  $("detailView").classList.remove("hidden");
  $("topBack").classList.remove("hidden");
  window.scrollTo(0, 0);

  showTrailer(null); // z poprzedniego tytułu mógł zostać zwiastun — czyścimy
  if (item.type && item.externalId) {
    api(
      `/details?type=${encodeURIComponent(item.type)}&externalId=${encodeURIComponent(item.externalId)}`,
    )
      .then((d) => {
        $("detailDesc").textContent = d.description || t("noDesc");
        showTrailer(d.trailerUrl, d.trailerKind);
      })
      .catch(() => {
        $("detailDesc").textContent = t("noDesc");
      });
  } else {
    $("detailDesc").textContent = t("noDesc");
  }

  // Jeśli tytuł jest już w katalogu, znajdź mediaId, żeby pokazać komentarze.
  // (typ w bazie jest WIELKIMI literami, więc normalizujemy przez ENUM_TYPE.)
  if (!item.mediaId && item.externalId) {
    const found = allMedia.find(
      (m) =>
        ENUM_TYPE[m.type] === item.type &&
        String(m.externalId) === String(item.externalId),
    );
    if (found) item.mediaId = found.id;
  }
  if (item.mediaId) loadDetailReviews(item.mediaId);
  updateDetailButtons();
}

// Stan przycisków TOP 4 / Do listy na podstawie cache myProfile.
function updateDetailButtons() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  const onWatch = mid ? myProfile.watchlist.some((w) => w.media.id === mid) : false;
  const isFav = !!rev?.favorite;
  $("favBtn").classList.toggle("active", isFav);
  $("favBtn").textContent = isFav ? t("favActive") : t("fav");
  $("watchBtn").classList.toggle("active", onWatch);
  $("watchBtn").textContent = onWatch ? t("watchActive") : t("watchAdd");
  // „Usuń ocenę" tylko gdy JEST co usuwać — inaczej przycisk myli.
  $("deleteBtn").classList.toggle("hidden", !rev);
  $("deleteBtn").textContent = t("deleteReview");
}

// Usuwa Twoją ocenę + komentarz tego tytułu (po potwierdzeniu). Znika też z TOP 4
// i z katalogu, bo katalog to właśnie lista Twoich ocen.
async function deleteDetailReview() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  if (!rev) return;
  if (!window.confirm(t("confirmDeleteReview", { title: detailCtx.title }))) return;

  $("detailMsg").textContent = "";
  try {
    await api(`/reviews/${rev.id}`, { method: "DELETE" });
    toast(t("deletedReview"));
    detailStars.set(0);
    $("detailComment").value = "";
    await loadMe();
    await Promise.all([
      loadRecommendations(),
      loadCatalog(),
      loadTasteRecommendations(), // mniej ocen → inny gust
    ]);
    updateDetailButtons();
    loadDetailReviews(mid);
  } catch (e) {
    $("detailMsg").textContent = e.message;
  }
}

// Upewnia się, że tytuł jest w bazie (dodaje, jeśli to świeży wynik wyszukiwania).
async function ensureMedia() {
  if (detailCtx.mediaId) return detailCtx.mediaId;
  const media = await api("/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ externalId: detailCtx.externalId, type: detailCtx.type }),
  });
  detailCtx.mediaId = media.id;
  await loadCatalog();
  return media.id;
}

async function toggleFavorite() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  if (!mid || !rev) {
    toast(t("rateFirst"));
    return;
  }
  try {
    await api("/me/favorite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: mid, favorite: !rev.favorite }),
    });
    await loadMe();
    updateDetailButtons();
    toast(t(rev.favorite ? "removedTop4" : "addedTop4"));
  } catch (e) {
    toast(e.message);
  }
}

async function toggleWatchlist() {
  try {
    const mid = await ensureMedia();
    const onWatch = myProfile.watchlist.some((w) => w.media.id === mid);
    if (onWatch) {
      await api(`/me/watchlist/${mid}`, { method: "DELETE" });
    } else {
      await api("/me/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaId: mid }),
      });
    }
    await loadMe();
    loadUpcoming(); // tytuł mógł właśnie dojść (albo zniknąć) z „Nadchodzących"
    updateDetailButtons();
    toast(t(onWatch ? "removedList" : "addedList"));
  } catch (e) {
    toast(e.message);
  }
}

async function loadDetailReviews(mediaId) {
  try {
    const reviews = await api(`/media/${mediaId}/reviews`);
    const box = $("detailReviews");
    box.innerHTML = "";
    if (reviews.length === 0) {
      box.innerHTML = `<p class="muted">${t("noComments")}</p>`;
      return;
    }
    for (const r of reviews) {
      // Wstępnie wypełnij swoją poprzednią ocenę/komentarz. Po ID, nie po nazwie —
      // nazwy nie są unikalne, więc imiennik podstawiał Ci swoją recenzję.
      if (me && r.user.id === me.id) {
        detailStars.set(r.rating);
        if (r.text) $("detailComment").value = r.text;
      }
      const el = document.createElement("div");
      el.className = "review";
      const who = document.createElement("div");
      who.className = "who";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = r.user.displayName;
      const rating = document.createElement("span");
      rating.className = "rating";
      rating.textContent = `★ ${r.rating}`;
      who.append(name, rating);
      el.append(who);
      if (r.text) {
        const txt = document.createElement("div");
        txt.className = "text";
        txt.textContent = r.text;
        el.append(txt);
      }
      el.append(likeControl(r, r.user.id));
      el.append(buildCommentsSection(r.id));
      box.append(el);
    }
  } catch {
    /* lista komentarzy opcjonalna */
  }
}

const LIKE = 1;
const DISLIKE = -1;
const NO_REACTION = 0;

// Ikonki reakcji (obrys = nie kliknięte, wypełnienie = TWOJA reakcja).
const HEART_PATH =
  "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z";
const THUMB_DOWN_PATH =
  "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17";

function reactionSvg(path, on) {
  return (
    `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" ` +
    `fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`
  );
}

// Serce + kciuk w dół pod recenzją. Na własną recenzję zareagować się nie da (reguła
// z backendu), więc autorowi pokazujemy same liczniki — przyciski są nieklikalne.
// authorId podajemy z zewnątrz, bo na profilu recenzje nie niosą pola `user` — autorem
// jest po prostu właściciel profilu.
function likeControl(review, authorId) {
  const foot = document.createElement("div");
  foot.className = "review-foot";
  const mine = !!me && authorId === me.id;

  for (const value of [LIKE, DISLIKE]) {
    const btn = document.createElement("button");
    btn.className = value === DISLIKE ? "like-btn down" : "like-btn";
    btn.type = "button";
    btn.dataset.value = String(value);
    if (mine) {
      btn.disabled = true;
      btn.title = t("likeOwn");
    } else {
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // na profilu cała karta otwiera tytuł — reakcja nie ma go otwierać
        sendReaction(review, foot, value);
      });
    }
    foot.append(btn);
  }
  paintReactions(foot, review, mine);
  return foot;
}

// Przerysowuje OBA przyciski, bo przestawienie serce→kciuk zmienia dwa liczniki naraz.
// Licznik ukryty przy zerze, żeby nie krzyczeć „0".
function paintReactions(foot, review, mine) {
  for (const btn of foot.querySelectorAll(".like-btn")) {
    const value = Number(btn.dataset.value);
    const on = review.myReaction === value;
    const count = value === LIKE ? review.likes : review.dislikes;

    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
    if (!mine) {
      btn.title = on ? t("reactRemove") : t(value === LIKE ? "likeAdd" : "dislikeAdd");
    }
    btn.innerHTML = reactionSvg(value === LIKE ? HEART_PATH : THUMB_DOWN_PATH, on);

    const n = document.createElement("span");
    n.className = "like-count";
    n.textContent = count > 0 ? String(count) : "";
    btn.append(n);
  }
}

// Liczników nie zgadujemy — bierzemy je z odpowiedzi serwera (jedno źródło prawdy).
async function sendReaction(review, foot, clicked) {
  if (!me) {
    toast(t("likeLogin"));
    return;
  }
  // Klik w reakcję, którą już masz, ją zdejmuje; klik w drugą — przestawia.
  const value = review.myReaction === clicked ? NO_REACTION : clicked;
  const btns = [...foot.querySelectorAll(".like-btn")];
  btns.forEach((b) => (b.disabled = true));
  try {
    const state = await api(`/reviews/${review.id}/reaction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    review.likes = state.likes;
    review.dislikes = state.dislikes;
    review.myReaction = state.myReaction;
    paintReactions(foot, review, false);
  } catch (e) {
    toast(e.message);
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

// --- Komentarze pod recenzją (z jednym poziomem odpowiedzi) ---

/**
 * Zwijana sekcja komentarzy pod recenzją. Ładujemy je leniwie — dopiero po
 * rozwinięciu, żeby otwarcie tytułu z wieloma recenzjami nie strzelało od razu
 * po komentarze do każdej z nich.
 */
function buildCommentsSection(reviewId) {
  const wrap = document.createElement("div");
  wrap.className = "comments";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "comments-toggle";
  toggle.textContent = `💬 ${t("comments")}`;
  const body = document.createElement("div");
  body.className = "comments-body hidden";
  let loaded = false;
  toggle.addEventListener("click", async () => {
    body.classList.toggle("hidden");
    if (!loaded && !body.classList.contains("hidden")) {
      loaded = true;
      await renderComments(reviewId, body);
    }
  });
  wrap.append(toggle, body);
  return wrap;
}

/** Pobiera komentarze i buduje listę + pole dodawania. */
async function renderComments(reviewId, body) {
  body.innerHTML = `<p class="muted small">…</p>`;
  let tree;
  try {
    tree = await api(`/reviews/${reviewId}/comments`);
  } catch {
    body.innerHTML = `<p class="muted small">${t("apiError")}</p>`;
    return;
  }
  body.innerHTML = "";
  const list = document.createElement("div");
  list.className = "comment-list";
  if (!tree.length) {
    list.innerHTML = `<p class="muted small">${t("noCommentsYet")}</p>`;
  } else {
    for (const node of tree) list.append(commentEl(node, reviewId));
  }
  body.append(list);
  if (me) body.append(commentForm(reviewId, null, body));
}

/** Pojedynczy komentarz + (opcjonalnie) jego odpowiedzi pod spodem. */
function commentEl(node, reviewId, isReply = false) {
  const el = document.createElement("div");
  el.className = "comment" + (isReply ? " reply" : "");
  const av = avatarEl(node.author);
  av.classList.add("comment-avatar");
  const main = document.createElement("div");
  main.className = "comment-main";

  const head = document.createElement("div");
  head.className = "comment-head";
  const who = document.createElement("span");
  who.className = "comment-author";
  who.textContent = node.author.displayName;
  const time = document.createElement("span");
  time.className = "comment-time muted";
  time.textContent = timeAgoShort(node.createdAt);
  head.append(who, time);

  const text = document.createElement("div");
  text.className = "comment-text" + (node.deleted ? " deleted" : "");
  text.textContent = node.deleted ? t("commentDeleted") : node.text;

  main.append(head, text);

  // Akcje: odpowiedz (każdy zalogowany), usuń (tylko autor, nieusunięty).
  if (!node.deleted && me) {
    const actions = document.createElement("div");
    actions.className = "comment-actions";
    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "comment-act";
    replyBtn.textContent = t("reply");
    replyBtn.addEventListener("click", () => {
      // Formularz odpowiedzi tuż pod komentarzem; drugi klik go chowa.
      const existing = main.querySelector(":scope > .comment-form");
      if (existing) {
        existing.remove();
        return;
      }
      main.append(commentForm(reviewId, node.id, null, replyBtn));
    });
    actions.append(replyBtn);
    if (node.author.id === me.id) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "comment-act danger";
      del.textContent = t("deleteComment");
      del.addEventListener("click", () => deleteCommentUI(node.id, el, text, actions));
      actions.append(del);
    }
    main.append(actions);
  }

  // Odpowiedzi (jeden poziom).
  if (node.replies && node.replies.length) {
    const rep = document.createElement("div");
    rep.className = "comment-replies";
    for (const child of node.replies) rep.append(commentEl(child, reviewId, true));
    main.append(rep);
  }

  el.append(av, main);
  return el;
}

/**
 * Formularz dodawania komentarza/odpowiedzi. parentId=null → nowy komentarz pod
 * recenzją; inaczej odpowiedź. Po wysłaniu dopina świeży węzeł bez przeładowania
 * całej listy. `body` podajemy tylko dla komentarzy najwyższego poziomu (dopina
 * do listy); dla odpowiedzi węzeł ląduje w kontenerze odpowiedzi komentarza.
 */
function commentForm(reviewId, parentId, body, replyBtn) {
  const form = document.createElement("form");
  form.className = "comment-form";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 1000;
  input.placeholder = parentId ? t("replyPlaceholder") : t("commentPlaceholder");
  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = parentId ? t("reply") : t("addComment");
  form.append(input, send);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      const node = await api(`/reviews/${reviewId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, parentId: parentId ?? undefined }),
      });
      if (parentId) {
        // Odpowiedź: dopnij do kontenera odpowiedzi rodzica (utwórz, jeśli brak).
        const main = form.parentElement;
        let rep = main.querySelector(":scope > .comment-replies");
        if (!rep) {
          rep = document.createElement("div");
          rep.className = "comment-replies";
          main.append(rep);
        }
        rep.append(commentEl(node, reviewId, true));
        form.remove();
        if (replyBtn) replyBtn.blur();
      } else {
        // Komentarz najwyższego poziomu: usuń „brak komentarzy" i dopnij na koniec.
        const list = body.querySelector(".comment-list");
        const empty = list.querySelector(".muted");
        if (empty) empty.remove();
        list.append(commentEl(node, reviewId));
        input.value = "";
      }
    } catch (err) {
      toast(err.message);
    } finally {
      send.disabled = false;
    }
  });
  setTimeout(() => input.focus(), 0);
  return form;
}

/** Usuwa własny komentarz — zamienia treść na „usunięty", zdejmuje akcje. */
async function deleteCommentUI(id, el, textEl, actions) {
  try {
    await api(`/me/comment/${id}`, { method: "DELETE" });
    textEl.textContent = t("commentDeleted");
    textEl.classList.add("deleted");
    actions.remove();
  } catch (e) {
    toast(e.message);
  }
}

async function saveDetail() {
  if (!detailCtx) return;
  $("detailMsg").textContent = "";
  const rating = detailStars.get();
  const text = $("detailComment").value;
  if (rating < 0.5) {
    $("detailMsg").textContent = t("pickRating");
    return;
  }
  try {
    let mediaId = detailCtx.mediaId;
    if (!mediaId) {
      const media = await api("/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ externalId: detailCtx.externalId, type: detailCtx.type }),
      });
      mediaId = media.id;
      detailCtx.mediaId = mediaId;
    }
    await api("/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId, rating, text }),
    });
    toast(t("saved"));
    await loadMe();
    // „Pod Twój gust" odświeży się przy powrocie na główną (closeDetail) — bez
    // ocenionego tytułu i z rotacją. Tu tylko katalog i polecenia od znajomych.
    await Promise.all([loadRecommendations(), loadCatalog()]);
    updateDetailButtons();
    loadDetailReviews(mediaId);
  } catch (e) {
    $("detailMsg").textContent = e.message;
  }
}

function closeDetail() {
  $("detailView").classList.add("hidden");
  showTrailer(null); // zatrzymaj zwiastun — inaczej gra dalej w tle
  detailCtx = null;
  if (detailReturn === "profile") {
    if (viewingUserId) openUserProfile(viewingUserId);
    else openProfile();
    return;
  }
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("searchResults").classList.toggle("hidden", detailReturn !== "results");
  $("browse").classList.toggle("hidden", detailReturn === "results");
  // Powrót na stronę główną → rotacja (i usunięcie właśnie ocenionego tytułu).
  if (me && detailReturn !== "results") loadTasteRecommendations();
}

// --- Profil (własny lub cudzy, osobna strona) ---
function showProfileShell() {
  closeSeeAll();
  closeFriends();
  closeChat();
  $("searchbar").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("profileView").classList.remove("hidden");
  $("topBack").classList.remove("hidden");
  window.scrollTo(0, 0);
}

async function openProfile() {
  viewingUserId = null;
  showProfileShell();
  await loadProfile();
}

async function openUserProfile(id) {
  if (!id || id === me.id) return openProfile();
  viewingUserId = id;
  showProfileShell();
  try {
    await loadUserProfile(id);
  } catch (e) {
    toast(e.message);
  }
}

function closeProfile() {
  viewingUserId = null;
  $("profileView").classList.add("hidden");
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("searchResults").classList.add("hidden");
  $("browse").classList.remove("hidden");
}

// Powrót na stronę główną (dolny pasek na telefonie). Chowa profil/szczegóły/wyniki.
function goHome() {
  viewingUserId = null;
  closeFriends();
  closeChat();
  $("profileView").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("browse").classList.remove("hidden");
  window.scrollTo(0, 0);
}

// --- Widoki: logowanie vs aplikacja ---
function showAuth() {
  me = null;
  $("topBack").classList.add("hidden");
  $("appView").classList.add("hidden");
  $("userBox").classList.add("hidden");
  $("authView").classList.remove("hidden");
}

async function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userBox").classList.remove("hidden");
  // Reset do strony głównej — po (ponownym) logowaniu nie zostawaj na starym
  // widoku (np. czyimś profilu) z ukrytym „Wróć".
  viewingUserId = null;
  $("profileView").classList.add("hidden");
  $("detailView").classList.add("hidden");
  $("searchResults").classList.add("hidden");
  $("topBack").classList.add("hidden");
  $("searchbar").classList.remove("hidden");
  $("browse").classList.remove("hidden");
  renderHello();
  await loadMe(); // katalog i profil czytają myProfile — najpierw je pobierz
  loadNotifications(); // licznik powiadomień (follow / polubienia / oceny z listy)
  refreshMsgBadge(); // licznik nieprzeczytanych wiadomości
  setInterval(refreshMsgBadge, 30000); // odświeżaj co 30 s (bez otwierania czatu)
  setInterval(loadNotifications, 45000); // odświeżaj powiadomienia co 45 s
  await Promise.all([
    loadTasteRecommendations(),
    loadRecommendations(),
    loadUpcoming(),
    loadCatalog(),
  ]);
}

// Wejście na własny profil było zwykłym napisem „Cześć, X" — nie wyglądało na
// klikalne i nikt nie wiedział, gdzie szukać profilu. Teraz to kafelek: zdjęcie
// (lub inicjał) + „Twój profil" i imię pod spodem.
function renderHello() {
  if (!me) return;
  const av = $("helloAvatar");
  av.innerHTML = "";
  if (me.avatarUrl) {
    const img = document.createElement("img");
    img.src = me.avatarUrl;
    img.alt = "";
    av.append(img);
  } else {
    av.textContent = (me.displayName[0] || "?").toUpperCase();
  }
  $("helloName").textContent = t("yourProfile");
  $("hello").title = me.displayName;
}

function logout() {
  // „Wyloguj" siedzi teraz w nakładce Ustawień — zamknij ją, inaczej zostałaby
  // otwarta nad ekranem logowania.
  $("settingsOverlay").classList.add("hidden");
  clearToken();
  showAuth();
}

// Podpina formularze konta raz przy starcie (nie przy każdym otwarciu ustawień).
function wireAccountSettings() {
  $("nameForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const displayName = $("nameInput").value.trim();
    try {
      const res = await api("/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (me) me.displayName = res.displayName;
      if (myProfile?.user) myProfile.user.displayName = res.displayName;
      toast(t("nameSaved"));
    } catch (err) {
      toast(err.message);
    }
  });

  $("pwToggle").addEventListener("click", () => {
    $("pwForm").classList.toggle("hidden");
  });

  $("pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: $("pwCurrent").value,
          newPassword: $("pwNew").value,
        }),
      });
      $("pwCurrent").value = "";
      $("pwNew").value = "";
      $("pwForm").classList.add("hidden");
      toast(t("pwSaved"));
    } catch (err) {
      toast(err.message);
    }
  });

  $("deleteAccountBtn").addEventListener("click", async () => {
    if (!confirm(t("deleteConfirm"))) return;
    // Konto z hasłem musi je podać; puste też wysyłamy (konta demo bez hasła).
    const password = prompt(t("deletePwPrompt")) ?? "";
    try {
      await api("/me", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      toast(t("accountDeleted"));
      logout();
    } catch (err) {
      toast(err.message);
    }
  });
}

function setAuthMode(mode) {
  authMode = mode;
  const login = mode === "login";
  $("displayName").classList.toggle("hidden", login);
  $("authSubmit").textContent = login ? t("login") : t("register");
  $("switchText").textContent = login ? t("noAccount") : t("haveAccount");
  $("switchBtn").textContent = login ? t("register") : t("login");
  $("password").placeholder = login ? t("passwordPh") : t("passwordPhNew");
  $("password").setAttribute("autocomplete", login ? "current-password" : "new-password");
  $("authMsg").textContent = "";
}

async function submitAuth(ev) {
  ev.preventDefault();
  $("authMsg").textContent = "";
  const body = {
    email: $("email").value,
    password: $("password").value,
    displayName: $("displayName").value,
  };
  try {
    const path = authMode === "login" ? "/auth/login" : "/auth/register";
    const res = await api(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setToken(res.token);
    me = res.user;
    await showApp();
  } catch (e) {
    $("authMsg").textContent = e.message;
  }
}

/**
 * Chowa dolny pasek nawigacji na czas, gdy klawiatura telefonu jest otwarta —
 * inaczej wisi nad nią i zabiera miejsce polu pisania (patrz .keyboard-open).
 *
 * Klawiaturę wykrywamy przez visualViewport, a nie przez focus/blur pola: dotknięcie
 * „Wyślij" zabiera focus polu, więc na focus/blur pasek mrugałby przy każdym wysłaniu.
 * visualViewport mówi wprost, ile ekranu realnie widać.
 */
function watchKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return; // brak wsparcia (stare przeglądarki) — pasek po prostu zostaje
  let kbdOpen = false;
  const apply = () => {
    // Klawiatura zjada zwykle 250–350px. 150px to próg z zapasem, powyżej pasków
    // adresu, które też potrafią lekko zmienić wysokość widoku.
    const teraz = window.innerHeight - vv.height > 150;
    document.body.classList.toggle("keyboard-open", teraz);
    // Na dół przewijamy TYLKO w momencie OTWARCIA klawiatury (zamknięta→otwarta).
    // Wcześniej leciało to na każdą zmianę visualViewport — a ta na telefonie
    // zmienia się bez przerwy (pasek adresu, pasek podpowiedzi), przez co widok
    // szarpał w kółko. I tylko, gdy user był na dole — czytającego starsze nie ruszamy.
    if (teraz && !kbdOpen && chatWithId !== null && chatAtBottom) {
      requestAnimationFrame(scrollChatToBottom); // layout po zmianie klasy — w kolejnej klatce
    }
    kbdOpen = teraz;
  };
  vv.addEventListener("resize", apply);
  apply();
}

async function init() {
  $("switchBtn").addEventListener("click", () =>
    setAuthMode(authMode === "login" ? "register" : "login"),
  );
  $("authForm").addEventListener("submit", submitAuth);
  $("logout").addEventListener("click", logout);
  $("hello").addEventListener("click", openProfile);
  $("topBack").addEventListener("click", () => {
    if (!$("detailView").classList.contains("hidden")) closeDetail();
    else if (!$("profileView").classList.contains("hidden")) closeProfile();
  });
  $("avatarBtn").addEventListener("click", () => $("avatarFile").click());
  $("avatarFile").addEventListener("change", onAvatarPick);
  $("favBtn").addEventListener("click", toggleFavorite);
  $("watchBtn").addEventListener("click", toggleWatchlist);
  $("shareBtn").addEventListener("click", () => {
    if (detailCtx?.mediaId) shareMediaPick(detailCtx.mediaId);
  });
  $("deleteBtn").addEventListener("click", deleteDetailReview);
  $("search").addEventListener("input", onSearchInput);
  $("typeFilm").addEventListener("click", () => setSearchType("film"));
  $("typeBook").addEventListener("click", () => setSearchType("book"));
  $("typeManga").addEventListener("click", () => setSearchType("manga"));
  $("typeAnime").addEventListener("click", () => setSearchType("anime"));
  $("typeMusic").addEventListener("click", () => setSearchType("music"));
  $("typeGame").addEventListener("click", () => setSearchType("game"));
  detailStars = buildStars($("detailStars"), $("detailStarVal"));
  $("detailSave").addEventListener("click", saveDetail);
  $("seeAllClose").addEventListener("click", closeSeeAll);
  $("seeAllOverlay").addEventListener("click", (e) => {
    if (e.target === $("seeAllOverlay")) closeSeeAll();
  });
  $("settingsBtn").addEventListener("click", openSettings);
  $("pushToggle").addEventListener("click", togglePush);
  $("pushTest").addEventListener("click", testPush);
  $("settingsClose").addEventListener("click", closeSettings);
  $("settingsOverlay").addEventListener("click", (e) => {
    if (e.target === $("settingsOverlay")) closeSettings();
  });
  wireAccountSettings();
  wireAccordion();
  $("friendsBtn").addEventListener("click", openFriends);
  $("feedMore").addEventListener("click", toggleFeed);
  $("commentsMore").addEventListener("click", toggleComments);
  $("togetherBtn").addEventListener("click", openTogether);
  $("friendsClose").addEventListener("click", closeFriends);
  $("friendsSearch").addEventListener("input", drawFriends);
  $("peopleClose").addEventListener("click", closePeople);
  $("peopleOverlay").addEventListener("click", (e) => {
    if (e.target === $("peopleOverlay")) closePeople();
  });
  $("notifBtn").addEventListener("click", openNotif);
  $("notifClose").addEventListener("click", closeNotif);
  $("notifOverlay").addEventListener("click", (e) => {
    if (e.target === $("notifOverlay")) closeNotif();
  });
  watchKeyboard();
  // Dolny pasek nawigacji (telefon)
  $("navHome").addEventListener("click", goHome);
  $("navMsg").addEventListener("click", openMessages);
  $("navProfile").addEventListener("click", openProfile);
  // Czat
  $("msgBtn").addEventListener("click", openMessages);
  $("chatClose").addEventListener("click", closeChat);
  $("chatClose2").addEventListener("click", closeChat);
  $("chatBack").addEventListener("click", () => {
    showConvList();
    loadConversations();
  });
  $("chatForm").addEventListener("submit", sendChat);
  // Na bieżąco: czy user jest na dole wątku (patrz chatAtBottom / watchKeyboard).
  $("chatMessages").addEventListener("scroll", () => {
    const box = $("chatMessages");
    chatAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  });
  $("chatText").addEventListener("input", pingTyping);
  $("chatImageBtn").addEventListener("click", () => $("chatImageFile").click());
  $("chatImageFile").addEventListener("change", onChatImage);
  $("chatOverlay").addEventListener("click", (e) => {
    if (e.target === $("chatOverlay")) closeChat();
  });
  $("msgProfileBtn").addEventListener("click", () => {
    if (!viewingUser) return;
    $("chatOverlay").classList.remove("hidden");
    openChat(viewingUser);
  });
  $("followProfileBtn").addEventListener("click", async () => {
    if (!viewingUserId) return;
    const on = $("followProfileBtn").classList.contains("active");
    try {
      if (on) {
        await api(`/me/follow/${viewingUserId}`, { method: "DELETE" });
      } else {
        await api("/me/follow", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: viewingUserId }),
        });
      }
      setFollowBtn(!on);
    } catch (e) {
      toast(e.message);
    }
  });
  $("blockProfileBtn").addEventListener("click", async () => {
    if (!viewingUserId) return;
    const blocked = $("blockProfileBtn").classList.contains("active");
    if (!blocked && !confirm(t("blockConfirm"))) return;
    try {
      await api(`/me/block/${viewingUserId}`, {
        method: blocked ? "DELETE" : "POST",
      });
      if (blocked) {
        // Po odblokowaniu wracają zwykłe akcje; stan obserwacji odświeży wejście na profil.
        setBlockBtn(false);
        $("followProfileBtn").classList.remove("hidden");
      } else {
        // Zablokowanie zerwało obserwację — odśwież profil, żeby liczniki się zgadzały.
        setBlockBtn(true);
        setFollowBtn(false);
      }
    } catch (e) {
      toast(e.message);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("settingsOverlay").classList.contains("hidden")) closeSettings();
    else if (!$("notifOverlay").classList.contains("hidden")) closeNotif();
    else if (!$("friendsOverlay").classList.contains("hidden")) closeFriends();
    else if (!$("seeAllOverlay").classList.contains("hidden")) closeSeeAll();
    else if (!$("detailView").classList.contains("hidden")) closeDetail();
  });
  $("pwToggle").innerHTML = pwIcon(false);
  $("pwToggle").addEventListener("click", () => {
    const pw = $("password");
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    $("pwToggle").innerHTML = pwIcon(show);
    $("pwToggle").setAttribute(
      "aria-label",
      show ? t("hidePassword") : t("showPassword"),
    );
  });
  applyStaticI18n();
  applySearchPlaceholder();
  setAuthMode("login");

  if (getToken()) {
    try {
      const data = await api("/me");
      me = data.user;
      await showApp();
      return;
    } catch {
      clearToken();
    }
  }
  showAuth();
}

if ("serviceWorker" in navigator) {
  // Czy stroną steruje już jakiś Service Worker? Zapamiętujemy TERAZ, bo poniżej
  // rozróżniamy pierwsze wejście (nic nie steruje) od podmiany SW na nowszy.
  const miałKontroler = Boolean(navigator.serviceWorker.controller);
  let juzPrzeladowano = false;

  window.addEventListener("load", async () => {
    try {
      // updateViaCache: "none" — sam plik service-worker.js ma iść Z SIECI, nie
      // z cache HTTP. Bez tego przeglądarka trzyma stary SW nawet dobę i telefon
      // siedzi na starym froncie, choć serwer dawno wystawił nowy.
      const reg = await navigator.serviceWorker.register("/service-worker.js", {
        updateViaCache: "none",
      });
      reg.update();
    } catch {
      // Brak SW = brak trybu offline. Aplikacja działa normalnie, nie przeszkadzamy.
    }
  });

  // Nowy SW właśnie przejął stronę → w karcie wisi jeszcze stary front. Przeładuj
  // raz, żeby użytkownik nie musiał sam ubijać apki po każdym deployu.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!miałKontroler || juzPrzeladowano) return; // pierwsze wejście: nie przeładowuj
    juzPrzeladowano = true;
    location.reload();
  });
}

init().catch((e) => {
  document.querySelector("main").innerHTML =
    `<p class="muted">${t("connectError", { msg: e.message })}</p>`;
});
