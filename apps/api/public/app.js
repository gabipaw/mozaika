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
    typeSerial: "📺 Seriale",
    typeBook: "📚 Książki",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Muzyka",
    typeGame: "🎮 Gry",
    shelfMusic: "Muzyka",
    shelfFilm: "Filmy / Seriale",
    shelfAnime: "Anime",
    shelfBook: "Książki / Manga",
    shelfGame: "Gry",
    searchFilm: "Szukaj filmu…",
    searchSerial: "Szukaj serialu…",
    searchBook: "Szukaj książki…",
    searchManga: "Szukaj mangi…",
    searchAnime: "Szukaj anime…",
    searchMusic: "Szukaj albumu…",
    searchGame: "Szukaj gry…",
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
    catSerial: "seriale",
    catBook: "książki",
    catMusic: "muzykę",
    tasteMore: "Pokaż więcej",
    yourCatalog: "Twój katalog",
    yourCatalogHint: "Tytuły, które oceniłeś.",
    allGenres: "Wszystkie",
    catalogSearchPh: "Szukaj w katalogu…",
    sortRecent: "Ostatnio ocenione",
    sortRating: "Najwyżej ocenione",
    sortTitle: "Alfabetycznie",
    sortYear: "Rok premiery",
    catalogEmpty: "Nic nie pasuje do tych filtrów.",
    tastePortrait: "Portret gustu",
    portraitEmpty: "Oceń kilka tytułów, a narysujemy Twój portret gustu.",
    harshMild: "Oceniasz łagodniej niż średnia.",
    harshTough: "Oceniasz surowiej niż średnia.",
    harshBalanced: "Oceniasz mniej więcej jak średnia.",
    yourAvg: "Twoja średnia",
    siteAvg: "serwis",
    topGenres: "Twoje gatunki",
    topTypes: "Rodzaje mediów",
    surpriseBtn: "🎲 Zaskocz mnie",
    statsBtn: "📊 Statystyki",
    statRatings: "Rozkład ocen",
    statThisYear: "W tym roku",
    statTotal: "Razem",
    shareProfileBtn: "🔗 Kopiuj link",
    shareCopied: "Skopiowano link do profilu",
    statusPlan: "Plan",
    statusInProgress: "W trakcie",
    statusDone: "Ukończone",
    markInProgress: "▶ W trakcie",
    markDone: "✓ Ukończone",
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
    translate: "Przetłumacz",
    autoTranslate: "Tłumacz automatycznie",
    autoTranslateHint:
      "Obce wiadomości, recenzje i komentarze tłumaczą się same — bez klikania „Przetłumacz”.",
    translating: "Tłumaczę…",
    hideTranslation: "Ukryj tłumaczenie",
    hideTranslationFrom: "Ukryj tłumaczenie ({lang})",
    noCoversPicked: "Nie wybrano okładek",
    edit: "Zmień",
    pickN: "Wybierz {max} ({n})",
    pickCovers: "{label} — wybierz do {max} okładek",
    friends: "Znajomi",
    add: "＋ Dodaj",
    searchFriends: "Szukaj znajomych…",
    noFriendsFound: "Nikogo nie znaleziono.",
    notifications: "Powiadomienia",
    notifFollowed: "zaczął(-ęła) Cię obserwować",
    notifLiked: "polubił(-a) Twoją recenzję",
    notifRated: "ocenił(-a) tytuł z Twojej listy",
    notifNewRating: "ocenił(-a)",
    ntNewRating: "Nowe oceny znajomych",
    appearance: "Wygląd",
    title: "Tytuł",
    titleNone: "Brak",
    titleSet: "Tytuł ustawiony",
    themeSystem: "Systemowy",
    themeLight: "Jasny",
    themeDark: "Ciemny",
    sortRelevance: "Trafność",
    ratingAny: "Ocena: dowolna",
    yearAny: "Rok: dowolny",
    whereToWatch: "Gdzie obejrzeć",
    myLists: "Moje listy",
    listsTitle: "Listy",
    listsEmpty: "Nie masz jeszcze list — utwórz pierwszą!",
    listsEmptyRO: "Brak publicznych list.",
    newList: "＋ Nowa",
    listEmpty: "Lista jest pusta.",
    listsChip: "🗂 Listy",
    addToList: "Dodaj do listy",
    noListsYet: "Nie masz jeszcze żadnej listy. Utwórz ją poniżej.",
    newListPh: "Nazwa nowej listy…",
    create: "Utwórz",
    listCreated: "Lista utworzona",
    addedToList: "Dodano do listy",
    removedFromList: "Usunięto z listy",
    confirmDeleteList: "Usunąć listę „{name}”?",
    newListPrompt: "Nazwa nowej listy:",
    achievements: "🏆 Osiągnięcia",
    titleInfoHead: "🏷️ Twój tytuł",
    titleInfoHow: "Odblokowane przez: {req}",
    titleInfoSpecial: "Tytuł specjalny.",
    achLblFilm: "Filmy",
    achLblSerial: "Seriale",
    achLblBook: "Książki",
    achLblGame: "Gry",
    achLblAnime: "Anime",
    achLblManga: "Manga",
    achLblMusic: "Albumy",
    achReqTotal: "Oceń {n} tytułów",
    achReqRate: "Oceń {n} × {what}",
    achReqText: "Napisz {n} recenzji z tekstem",
    achReqPerfect: "Wystaw {n} ocen 10/10",
    achReqFav: "Przypnij {n} do TOP 4",
    achReqFollowers: "Zdobądź {n} obserwujących",
    achReqFollowing: "Obserwuj {n} osób",
    achReqGenres: "Poznaj {n} gatunków",
    achReqDecades: "Oceń tytuły z {n} dekad",
    achReqHarsh: "Wystaw {n} ocen ≤ 3",
    achReqLists: "Utwórz {n} list",
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
    bioLabel: "O mnie",
    bioPlaceholder: "Krótko o sobie — co lubisz oglądać?",
    bioSaved: "Opis zapisany",
    bioLeft: "Zostało {n} znaków",
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
    ntMessage: "Wiadomości na czacie",
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
    typeSerial: "📺 TV shows",
    typeBook: "📚 Books",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Music",
    typeGame: "🎮 Games",
    shelfMusic: "Music",
    shelfFilm: "Movies / TV",
    shelfAnime: "Anime",
    shelfBook: "Books / Manga",
    shelfGame: "Games",
    searchFilm: "Search movies…",
    searchSerial: "Search TV shows…",
    searchBook: "Search books…",
    searchManga: "Search manga…",
    searchAnime: "Search anime…",
    searchMusic: "Search albums…",
    searchGame: "Search games…",
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
    catSerial: "TV shows",
    catBook: "books",
    catMusic: "music",
    tasteMore: "Show more",
    yourCatalog: "Your catalog",
    yourCatalogHint: "Titles you've rated.",
    allGenres: "All",
    catalogSearchPh: "Search your catalog…",
    sortRecent: "Recently rated",
    sortRating: "Highest rated",
    sortTitle: "Alphabetically",
    sortYear: "Release year",
    catalogEmpty: "Nothing matches these filters.",
    tastePortrait: "Taste portrait",
    portraitEmpty: "Rate a few titles and we'll draw your taste portrait.",
    harshMild: "You rate more generously than average.",
    harshTough: "You rate more harshly than average.",
    harshBalanced: "You rate about average.",
    yourAvg: "Your average",
    siteAvg: "site",
    topGenres: "Your genres",
    topTypes: "Media types",
    surpriseBtn: "🎲 Surprise me",
    statsBtn: "📊 Stats",
    statRatings: "Rating spread",
    statThisYear: "This year",
    statTotal: "Total",
    shareProfileBtn: "🔗 Copy link",
    shareCopied: "Profile link copied",
    statusPlan: "Plan",
    statusInProgress: "In progress",
    statusDone: "Done",
    markInProgress: "▶ In progress",
    markDone: "✓ Done",
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
    translate: "Translate",
    autoTranslate: "Translate automatically",
    autoTranslateHint:
      "Foreign messages, reviews and comments translate themselves — no clicking “Translate”.",
    translating: "Translating…",
    hideTranslation: "Hide translation",
    hideTranslationFrom: "Hide translation ({lang})",
    noCoversPicked: "No covers picked",
    edit: "Edit",
    pickN: "Pick {max} ({n})",
    pickCovers: "{label} — pick up to {max} covers",
    friends: "Friends",
    add: "＋ Add",
    searchFriends: "Search friends…",
    noFriendsFound: "No one found.",
    notifications: "Notifications",
    notifFollowed: "started following you",
    notifLiked: "liked your review",
    notifRated: "rated a title from your watchlist",
    notifNewRating: "rated",
    ntNewRating: "Friends' new ratings",
    appearance: "Appearance",
    title: "Title",
    titleNone: "None",
    titleSet: "Title set",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    sortRelevance: "Relevance",
    ratingAny: "Rating: any",
    yearAny: "Year: any",
    whereToWatch: "Where to watch",
    myLists: "My lists",
    listsTitle: "Lists",
    listsEmpty: "No lists yet — create your first!",
    listsEmptyRO: "No public lists.",
    newList: "＋ New",
    listEmpty: "This list is empty.",
    listsChip: "🗂 Lists",
    addToList: "Add to list",
    noListsYet: "You don't have any lists yet. Create one below.",
    newListPh: "New list name…",
    create: "Create",
    listCreated: "List created",
    addedToList: "Added to list",
    removedFromList: "Removed from list",
    confirmDeleteList: "Delete list “{name}”?",
    newListPrompt: "New list name:",
    achievements: "🏆 Achievements",
    titleInfoHead: "🏷️ Your title",
    titleInfoHow: "Unlocked by: {req}",
    titleInfoSpecial: "Special title.",
    achLblFilm: "Films",
    achLblSerial: "TV shows",
    achLblBook: "Books",
    achLblGame: "Games",
    achLblAnime: "Anime",
    achLblManga: "Manga",
    achLblMusic: "Albums",
    achReqTotal: "Rate {n} titles",
    achReqRate: "Rate {n} × {what}",
    achReqText: "Write {n} reviews with text",
    achReqPerfect: "Give {n} ratings of 10/10",
    achReqFav: "Pin {n} to TOP 4",
    achReqFollowers: "Get {n} followers",
    achReqFollowing: "Follow {n} people",
    achReqGenres: "Explore {n} genres",
    achReqDecades: "Rate titles from {n} decades",
    achReqHarsh: "Give {n} ratings ≤ 3",
    achReqLists: "Create {n} lists",
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
    bioLabel: "About me",
    bioPlaceholder: "A few words about you — what do you like to watch?",
    bioSaved: "Bio saved",
    bioLeft: "{n} characters left",
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
    ntMessage: "Chat messages",
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
  de: {
    back: "← Zurück",
    logout: "Abmelden",
    settings: "Einstellungen",
    language: "Sprache",
    tagline:
      "Bewerte alles, was du schaust und liest — den Rest passen wir an deinen Geschmack an.",
    yourName: "Dein Name",
    email: "E-Mail",
    login: "Anmelden",
    register: "Konto erstellen",
    noAccount: "Noch kein Konto?",
    haveAccount: "Schon ein Konto?",
    passwordPh: "Passwort",
    passwordPhNew: "Passwort (mind. 6 Zeichen)",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    yourProfile: "Dein Profil",
    changePhoto: "Foto ändern",
    hi: "Hallo, {name}",
    typeFilm: "🎬 Filme",
    typeSerial: "📺 Serien",
    typeBook: "📚 Bücher",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Musik",
    typeGame: "🎮 Spiele",
    shelfMusic: "Musik",
    shelfFilm: "Filme / Serien",
    shelfAnime: "Anime",
    shelfBook: "Bücher / Manga",
    shelfGame: "Spiele",
    searchFilm: "Film suchen…",
    searchSerial: "Serie suchen…",
    searchBook: "Buch suchen…",
    searchManga: "Manga suchen…",
    searchAnime: "Anime suchen…",
    searchMusic: "Album suchen…",
    searchGame: "Spiel suchen…",
    results: "Ergebnisse",
    resultsFrom: "Ergebnisse aus {src}: „{q}“",
    searching: "Suche…",
    nothingFound: "Nichts gefunden.",
    forYou: "Für dich",
    forYouHint: "Empfohlen von Leuten mit ähnlichem Geschmack.",
    tasteRecs: "Für deinen Geschmack",
    tasteRecsHint: "Neue Titel außerhalb deines Katalogs, passend zu deinem Geschmack.",
    trailer: "Trailer",
    upcoming: "Demnächst",
    upcomingHint:
      "Von deiner Liste — noch nicht erschienen. Wir sagen zum Start Bescheid.",
    premiereOn: "Start am {date}",
    premiereToday: "Heute Premiere!",
    premiereInDays: "In {n} Tagen",
    premiereTomorrow: "Morgen",
    noTasteRecsType:
      "Bewerte ein paar Titel aus dieser Kategorie, dann finden wir Neues.",
    noDiscoverForType: "Für diese Kategorie haben wir noch keine frischen Empfehlungen.",
    reasonSimilar: "Weil ähnlich wie „{title}“",
    reasonGenre: "Weil du das Genre {genre} magst",
    reasonType: "Weil du {kat} magst",
    reasonPopular: "Weil in dieser Kategorie beliebt",
    reasonDecade: "Weil du die {decade}er magst.",
    reasonGeneral: "Beliebt — für deinen Geschmack",
    catFilm: "Filme",
    catAnime: "Anime",
    catManga: "Manga",
    catGame: "Spiele",
    catSerial: "Serien",
    catBook: "Bücher",
    catMusic: "Musik",
    tasteMore: "Mehr anzeigen",
    yourCatalog: "Dein Katalog",
    yourCatalogHint: "Titel, die du bewertet hast.",
    allGenres: "Alle",
    catalogSearchPh: "Katalog durchsuchen…",
    sortRecent: "Zuletzt bewertet",
    sortRating: "Am besten bewertet",
    sortTitle: "Alphabetisch",
    sortYear: "Erscheinungsjahr",
    catalogEmpty: "Nichts passt zu diesen Filtern.",
    tastePortrait: "Geschmacksprofil",
    portraitEmpty: "Bewerte ein paar Titel, dann zeichnen wir dein Geschmacksprofil.",
    harshMild: "Du bewertest milder als der Durchschnitt.",
    harshTough: "Du bewertest strenger als der Durchschnitt.",
    harshBalanced: "Du bewertest etwa wie der Durchschnitt.",
    yourAvg: "Dein Schnitt",
    siteAvg: "Website",
    topGenres: "Deine Genres",
    topTypes: "Medienarten",
    surpriseBtn: "🎲 Überrasch mich",
    statsBtn: "📊 Statistik",
    statRatings: "Bewertungsverteilung",
    statThisYear: "Dieses Jahr",
    statTotal: "Gesamt",
    shareProfileBtn: "🔗 Link kopieren",
    shareCopied: "Profil-Link kopiert",
    statusPlan: "Geplant",
    statusInProgress: "Läuft",
    statusDone: "Fertig",
    markInProgress: "▶ Läuft",
    markDone: "✓ Fertig",
    favDecade: "Lieblingsjahrzehnt: die {decade}er.",
    recBy: "empfohlen von {n} Pers.",
    noRecs: "Nichts — bewerte ein paar Titel, dann finden wir etwas.",
    yourRating: "Deine Bewertung",
    fav: "☆ TOP 4",
    favActive: "★ in TOP 4",
    watchAdd: "＋ Zur Liste",
    watchActive: "✓ Auf der Liste",
    commentPh: "Kommentar schreiben (optional)…",
    saveReview: "Bewertung und Kommentar speichern",
    deleteReview: "🗑 Bewertung löschen",
    confirmDeleteReview:
      "Deine Bewertung und deinen Kommentar zu „{title}“ löschen? Das kann nicht rückgängig gemacht werden.",
    deletedReview: "Bewertung gelöscht",
    comments: "Kommentare",
    noComments: "Keine Kommentare — sei der Erste.",
    likeAdd: "Treffende Rezension",
    dislikeAdd: "Unpassende Rezension",
    reactRemove: "Reaktion zurücknehmen",
    likeOwn: "So haben andere deine Rezension bewertet",
    likeLogin: "Melde dich an, um auf eine Rezension zu reagieren.",
    loadingDesc: "Beschreibung wird geladen…",
    noDesc: "Keine Beschreibung.",
    pickRating: "Wähle eine Bewertung (Sterne anklicken).",
    rateFirst: "Bewerte diesen Titel zuerst (Sterne), um ihn zu TOP 4 hinzuzufügen.",
    addedTop4: "Zu TOP 4 hinzugefügt",
    removedTop4: "Aus TOP 4 entfernt",
    addedList: "Zur Liste hinzugefügt",
    removedList: "Von der Liste entfernt",
    saved: "Gespeichert",
    savedPhoto: "Foto gespeichert",
    top4: "Top 4 Favoriten",
    top4Empty: "Hefte Favoriten mit „TOP 4“ auf der Titelseite an.",
    top4EmptyRO: "Keine Favoriten.",
    myComments: "Meine Kommentare",
    myCommentsEmpty: "Du hast noch keinen Kommentar zu Bewertungen hinzugefügt.",
    userComments: "Rezensionen: {name}",
    userCommentsEmpty: "{name} hat noch keinen Kommentar hinzugefügt.",
    watchlistTitle: "Zum Ansehen / Spielen",
    watchEmpty: "Leer — füge etwas mit „Zur Liste“ hinzu.",
    watchEmptyRO: "Leer.",
    seeAll: "Alle ansehen ({n})",
    nothingRatedCat: "Hier ist noch nichts",
    translate: "Übersetzen",
    autoTranslate: "Automatisch übersetzen",
    autoTranslateHint:
      "Fremdsprachige Nachrichten, Rezensionen und Kommentare werden von selbst übersetzt.",
    translating: "Übersetze…",
    hideTranslation: "Übersetzung ausblenden",
    hideTranslationFrom: "Übersetzung ausblenden ({lang})",
    noCoversPicked: "Keine Cover ausgewählt",
    edit: "Ändern",
    pickN: "Wähle {max} ({n})",
    pickCovers: "{label} — wähle bis zu {max} Cover",
    friends: "Freunde",
    add: "＋ Hinzufügen",
    searchFriends: "Freunde suchen…",
    noFriendsFound: "Niemand gefunden.",
    notifications: "Benachrichtigungen",
    notifFollowed: "folgt dir jetzt",
    notifLiked: "gefällt deine Rezension",
    notifRated: "hat einen Titel von deiner Liste bewertet",
    notifNewRating: "hat bewertet",
    ntNewRating: "Neue Bewertungen von Freunden",
    appearance: "Darstellung",
    title: "Titel",
    titleNone: "Kein",
    titleSet: "Titel gesetzt",
    themeSystem: "System",
    themeLight: "Hell",
    themeDark: "Dunkel",
    sortRelevance: "Relevanz",
    ratingAny: "Bewertung: alle",
    yearAny: "Jahr: alle",
    whereToWatch: "Wo streamen",
    myLists: "Meine Listen",
    listsTitle: "Listen",
    listsEmpty: "Noch keine Listen — erstelle die erste!",
    listsEmptyRO: "Keine öffentlichen Listen.",
    newList: "＋ Neu",
    listEmpty: "Diese Liste ist leer.",
    listsChip: "🗂 Listen",
    addToList: "Zur Liste hinzufügen",
    noListsYet: "Du hast noch keine Liste. Erstelle unten eine.",
    newListPh: "Name der neuen Liste…",
    create: "Erstellen",
    listCreated: "Liste erstellt",
    addedToList: "Zur Liste hinzugefügt",
    removedFromList: "Von Liste entfernt",
    confirmDeleteList: "Liste „{name}” löschen?",
    newListPrompt: "Name der neuen Liste:",
    achievements: "🏆 Erfolge",
    titleInfoHead: "🏷️ Dein Titel",
    titleInfoHow: "Freigeschaltet durch: {req}",
    titleInfoSpecial: "Spezialtitel.",
    achLblFilm: "Filme",
    achLblSerial: "Serien",
    achLblBook: "Bücher",
    achLblGame: "Spiele",
    achLblAnime: "Anime",
    achLblManga: "Manga",
    achLblMusic: "Alben",
    achReqTotal: "Bewerte {n} Titel",
    achReqRate: "Bewerte {n} × {what}",
    achReqText: "Schreibe {n} Rezensionen mit Text",
    achReqPerfect: "Vergib {n} Bewertungen mit 10/10",
    achReqFav: "Hefte {n} an die TOP 4",
    achReqFollowers: "Erhalte {n} Follower",
    achReqFollowing: "Folge {n} Personen",
    achReqGenres: "Entdecke {n} Genres",
    achReqDecades: "Bewerte Titel aus {n} Jahrzehnten",
    achReqHarsh: "Vergib {n} Bewertungen ≤ 3",
    achReqLists: "Erstelle {n} Listen",
    notifPremiere: "ist jetzt verfügbar — steht auf deiner Merkliste",
    notifComment: "hat deine Rezension kommentiert",
    notifReply: "hat auf deinen Kommentar geantwortet",
    noNotif: "Keine Benachrichtigungen. Wenn dir jemand folgt, erscheint es hier.",
    block: "Blockieren",
    unblock: "Entsperren",
    blocked: "Blockiert",
    blockConfirm: "Diese Person blockieren? Gegenseitiges Folgen und Chat verschwinden.",
    blockedList: "Blockiert",
    noBlocked: "Du hast niemanden blockiert.",
    account: "Konto",
    save: "Speichern",
    nameSaved: "Name gespeichert",
    bioLabel: "Über mich",
    bioPlaceholder: "Kurz über dich — was schaust du gern?",
    bioSaved: "Beschreibung gespeichert",
    bioLeft: "Noch {n} Zeichen",
    changePw: "Passwort ändern",
    currentPw: "Aktuelles Passwort",
    newPw: "Neues Passwort (mind. 6 Zeichen)",
    savePw: "Passwort ändern",
    pwSaved: "Passwort geändert",
    notifPrefs: "App-Benachrichtigungen",
    notifPrefsHint: "Schalte die Typen aus, über die du nichts wissen willst.",
    ntFollow: "Neue Follower",
    ntLike: "Likes für Rezensionen",
    ntComment: "Kommentare zu Rezensionen",
    ntReply: "Antworten auf Kommentare",
    ntWatchlist: "Bewertungen von Titeln der Liste",
    ntPremiere: "Premieren von der Liste",
    ntMessage: "Chat-Nachrichten",
    about: "Über die App",
    aboutText: "Mozaika — bewerte alles, was du schaust und liest. Version {v}.",
    deleteAccount: "Konto löschen",
    deleteConfirm:
      "Konto wirklich löschen? Das kann NICHT rückgängig gemacht werden — deine Rezensionen, Nachrichten und Abos verschwinden.",
    deletePwPrompt: "Gib dein Passwort ein, um das Löschen des Kontos zu bestätigen:",
    accountDeleted: "Konto gelöscht.",
    commentPlaceholder: "Kommentar schreiben…",
    replyPlaceholder: "Antwort schreiben…",
    addComment: "Kommentieren",
    reply: "Antworten",
    commentDeleted: "Kommentar gelöscht",
    deleteComment: "Kommentar löschen",
    noCommentsYet: "Noch keine Kommentare. Sei der Erste!",
    followersLink: "{n} Follower",
    followingLink: "{n} gefolgt",
    followersTitle: "Follower",
    followingTitle: "Gefolgt",
    peopleEmpty: "Hier ist noch niemand.",
    messages: "Nachrichten",
    writeMessage: "💬 Schreiben",
    msgPlaceholder: "Nachricht schreiben…",
    send: "Senden",
    noConversations:
      "Keine Gespräche. Schreibe einem Freund über „💬 Schreiben“ auf seinem Profil.",
    chatEmpty: "Beginnt das Gespräch — schreib als Erster!",
    seen: "Gesehen",
    sent: "Gesendet",
    typing: "schreibt",
    navHome: "Start",
    navProfile: "Profil",
    deleteMsg: "Löschen",
    editMsg: "Nachricht bearbeiten",
    react: "Reaktion",
    edited: "bearbeitet",
    shareBtn: "📨 An Freund senden",
    shareTo: "Senden an…",
    shared: "An {name} gesendet",
    noMutual: "Keine Freunde zum Senden (ihr müsst euch gegenseitig folgen).",
    photo: "Foto",
    msgDeletedMine: "Du hast diese Nachricht gelöscht",
    msgDeleted: "Nachricht gelöscht",
    follow: "Folgen",
    following: "Du folgst",
    noFollows: "Du folgst noch niemandem — füge Freunde mit „＋ Hinzufügen“ hinzu.",
    noActivity: "Deine Freunde haben noch nichts bewertet.",
    showMore: "Mehr anzeigen ({n})",
    showLess: "Weniger anzeigen",
    seeAllComments: "Alle ansehen ({n})",
    together: "🍿 Was zusammen schauen",
    togetherTitle: "Was mit {name} zusammen schauen",
    togBoth: "Ihr habt es beide auf der Liste",
    togTheirs: "{name} hat es auf der Liste",
    togYours: "Du hast es auf der Liste",
    togFresh: "Neu für euren gemeinsamen Geschmack",
    togScores: "Du {you} · {name} {them}",
    togEmpty:
      "Zu wenige Bewertungen, um etwas für euch beide zu finden. Bewertet ein paar Titel und kommt wieder.",
    pushLabel: "Benachrichtigungen",
    pushOff: "Handy-Benachrichtigungen aktivieren",
    pushOn: "✓ Benachrichtigungen aktiviert",
    pushOffHint:
      "Wir sagen Bescheid, wenn dir jemand folgt — auch wenn Mozaika geschlossen ist.",
    pushOnHint: "Dieses Gerät erhält Benachrichtigungen.",
    pushBlocked: "Benachrichtigungen blockiert",
    pushBlockedHint:
      "Du hast Benachrichtigungen für diese Seite blockiert. Entsperre sie in den Browser-Einstellungen (Schloss neben der Adresse).",
    pushUnsupported:
      "Dieser Browser unterstützt keine Benachrichtigungen. Auf dem iPhone füge Mozaika zuerst zum Home-Bildschirm hinzu.",
    pushEnabled: "Benachrichtigungen aktiviert",
    pushDisabled: "Benachrichtigungen deaktiviert",
    pushSent: "Test-Benachrichtigung gesendet",
    pushTest: "Test senden",
    noUsers: "Keine anderen Nutzer.",
    yourTaste: "Euer Geschmack",
    matchCap: "Übereinstimmung · {n} gemeinsam",
    notEnough:
      "Zu wenige gemeinsame Bewertungen ({n}/3), um die Übereinstimmung zu berechnen. Bewertet mehr gleiche Titel.",
    you: "Du",
    loading: "Wird geladen…",
    done: "✕ Fertig",
    close: "✕ Schließen",
    loginRequired: "Bitte anmelden.",
    apiError: "API-Fehler",
    connectError: "Verbindung zur API fehlgeschlagen: {msg}",
    justNow: "gerade eben",
    minAgo: "vor {n} Min.",
    hAgo: "vor {n} Std.",
    dAgo: "vor {n} Tagen",
    shortNow: "jetzt",
    shortMin: "{n} Min.",
    shortH: "{n} Std.",
    shortD: "{n} T.",
    shortW: "{n} Wo.",
  },
  es: {
    back: "← Volver",
    logout: "Cerrar sesión",
    settings: "Ajustes",
    language: "Idioma",
    tagline: "Puntúa todo lo que ves y lees, y el resto lo ajustamos a tu gusto.",
    yourName: "Tu nombre",
    email: "Correo",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    noAccount: "¿Aún no tienes cuenta?",
    haveAccount: "¿Ya tienes cuenta?",
    passwordPh: "Contraseña",
    passwordPhNew: "Contraseña (mín. 6 caracteres)",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    yourProfile: "Tu perfil",
    changePhoto: "Cambiar foto",
    hi: "Hola, {name}",
    typeFilm: "🎬 Películas",
    typeSerial: "📺 Series",
    typeBook: "📚 Libros",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Música",
    typeGame: "🎮 Juegos",
    shelfMusic: "Música",
    shelfFilm: "Películas / Series",
    shelfAnime: "Anime",
    shelfBook: "Libros / Manga",
    shelfGame: "Juegos",
    searchFilm: "Buscar película…",
    searchSerial: "Busca series…",
    searchBook: "Buscar libro…",
    searchManga: "Buscar manga…",
    searchAnime: "Buscar anime…",
    searchMusic: "Buscar álbum…",
    searchGame: "Buscar juego…",
    results: "Resultados",
    resultsFrom: "Resultados de {src}: «{q}»",
    searching: "Buscando…",
    nothingFound: "No se encontró nada.",
    forYou: "Para ti",
    forYouHint: "Recomendado por personas con gustos parecidos.",
    tasteRecs: "A tu gusto",
    tasteRecsHint: "Títulos nuevos fuera de tu catálogo, elegidos para tu gusto.",
    trailer: "Tráiler",
    upcoming: "Próximamente",
    upcomingHint: "De tu lista — aún no han salido. Te avisamos el día del estreno.",
    premiereOn: "Estreno el {date}",
    premiereToday: "¡Se estrena hoy!",
    premiereInDays: "En {n} días",
    premiereTomorrow: "Mañana",
    noTasteRecsType: "Puntúa algunos títulos de esta categoría y elegiremos algo nuevo.",
    noDiscoverForType: "Aún no tenemos recomendaciones nuevas para esta categoría.",
    reasonSimilar: "Porque se parece a «{title}»",
    reasonGenre: "Porque te gusta el género {genre}",
    reasonType: "Porque te gusta {kat}",
    reasonPopular: "Porque es popular en esta categoría",
    reasonDecade: "Porque te gustan los {decade}.",
    reasonGeneral: "Popular — a tu gusto",
    catFilm: "películas",
    catAnime: "anime",
    catManga: "manga",
    catGame: "juegos",
    catSerial: "series",
    catBook: "libros",
    catMusic: "música",
    tasteMore: "Ver más",
    yourCatalog: "Tu catálogo",
    yourCatalogHint: "Títulos que has puntuado.",
    allGenres: "Todos",
    catalogSearchPh: "Busca en tu catálogo…",
    sortRecent: "Valorados recientemente",
    sortRating: "Mejor valorados",
    sortTitle: "Alfabéticamente",
    sortYear: "Año de estreno",
    catalogEmpty: "Nada coincide con estos filtros.",
    tastePortrait: "Retrato de gustos",
    portraitEmpty: "Puntúa algunos títulos y dibujaremos tu retrato de gustos.",
    harshMild: "Puntúas más suave que la media.",
    harshTough: "Puntúas más duro que la media.",
    harshBalanced: "Puntúas más o menos como la media.",
    yourAvg: "Tu media",
    siteAvg: "sitio",
    topGenres: "Tus géneros",
    topTypes: "Tipos de medios",
    surpriseBtn: "🎲 Sorpréndeme",
    statsBtn: "📊 Estadísticas",
    statRatings: "Distribución de notas",
    statThisYear: "Este año",
    statTotal: "Total",
    shareProfileBtn: "🔗 Copiar enlace",
    shareCopied: "Enlace del perfil copiado",
    statusPlan: "Pendiente",
    statusInProgress: "En curso",
    statusDone: "Terminado",
    markInProgress: "▶ En curso",
    markDone: "✓ Terminado",
    favDecade: "Década favorita: los {decade}.",
    recBy: "recomendado por {n} pers.",
    noRecs: "Nada — puntúa algunos títulos y elegiremos algo.",
    yourRating: "Tu puntuación",
    fav: "☆ TOP 4",
    favActive: "★ en TOP 4",
    watchAdd: "＋ A la lista",
    watchActive: "✓ En la lista",
    commentPh: "Escribe un comentario (opcional)…",
    saveReview: "Guardar puntuación y comentario",
    deleteReview: "🗑 Borrar puntuación",
    confirmDeleteReview:
      "¿Borrar tu puntuación y comentario de «{title}»? Esto no se puede deshacer.",
    deletedReview: "Puntuación borrada",
    comments: "Comentarios",
    noComments: "Sin comentarios — sé el primero.",
    likeAdd: "Reseña acertada",
    dislikeAdd: "Reseña desacertada",
    reactRemove: "Quitar reacción",
    likeOwn: "Así valoraron otros tu reseña",
    likeLogin: "Inicia sesión para reaccionar a una reseña.",
    loadingDesc: "Cargando descripción…",
    noDesc: "Sin descripción.",
    pickRating: "Elige una puntuación (haz clic en las estrellas).",
    rateFirst: "Puntúa primero este título (estrellas) para añadirlo a TOP 4.",
    addedTop4: "Añadido a TOP 4",
    removedTop4: "Quitado de TOP 4",
    addedList: "Añadido a la lista",
    removedList: "Quitado de la lista",
    saved: "Guardado",
    savedPhoto: "Foto guardada",
    top4: "Top 4 favoritos",
    top4Empty: "Fija favoritos con el botón «TOP 4» en la página del título.",
    top4EmptyRO: "Sin favoritos.",
    myComments: "Mis comentarios",
    myCommentsEmpty: "Aún no has añadido ningún comentario a tus puntuaciones.",
    userComments: "Reseñas: {name}",
    userCommentsEmpty: "{name} aún no ha añadido ningún comentario.",
    watchlistTitle: "Por ver / jugar",
    watchEmpty: "Vacío — añade algo con «A la lista».",
    watchEmptyRO: "Vacío.",
    seeAll: "Ver todo ({n})",
    nothingRatedCat: "Aún no hay nada aquí",
    translate: "Traducir",
    autoTranslate: "Traducir automáticamente",
    autoTranslateHint:
      "Los mensajes, reseñas y comentarios en otros idiomas se traducen solos.",
    translating: "Traduciendo…",
    hideTranslation: "Ocultar traducción",
    hideTranslationFrom: "Ocultar traducción ({lang})",
    noCoversPicked: "Sin portadas elegidas",
    edit: "Cambiar",
    pickN: "Elige {max} ({n})",
    pickCovers: "{label} — elige hasta {max} portadas",
    friends: "Amigos",
    add: "＋ Añadir",
    searchFriends: "Buscar amigos…",
    noFriendsFound: "No se encontró a nadie.",
    notifications: "Notificaciones",
    notifFollowed: "empezó a seguirte",
    notifLiked: "le gustó tu reseña",
    notifRated: "puntuó un título de tu lista",
    notifNewRating: "puntuó",
    ntNewRating: "Nuevas valoraciones de amigos",
    appearance: "Apariencia",
    title: "Título",
    titleNone: "Ninguno",
    titleSet: "Título establecido",
    themeSystem: "Sistema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    sortRelevance: "Relevancia",
    ratingAny: "Nota: cualquiera",
    yearAny: "Año: cualquiera",
    whereToWatch: "Dónde ver",
    myLists: "Mis listas",
    listsTitle: "Listas",
    listsEmpty: "Aún no tienes listas — ¡crea la primera!",
    listsEmptyRO: "Sin listas públicas.",
    newList: "＋ Nueva",
    listEmpty: "Esta lista está vacía.",
    listsChip: "🗂 Listas",
    addToList: "Añadir a lista",
    noListsYet: "Aún no tienes ninguna lista. Crea una abajo.",
    newListPh: "Nombre de la nueva lista…",
    create: "Crear",
    listCreated: "Lista creada",
    addedToList: "Añadido a la lista",
    removedFromList: "Quitado de la lista",
    confirmDeleteList: "¿Eliminar la lista «{name}»?",
    newListPrompt: "Nombre de la nueva lista:",
    achievements: "🏆 Logros",
    titleInfoHead: "🏷️ Tu título",
    titleInfoHow: "Desbloqueado por: {req}",
    titleInfoSpecial: "Título especial.",
    achLblFilm: "Películas",
    achLblSerial: "Series",
    achLblBook: "Libros",
    achLblGame: "Juegos",
    achLblAnime: "Anime",
    achLblManga: "Manga",
    achLblMusic: "Álbumes",
    achReqTotal: "Puntúa {n} títulos",
    achReqRate: "Puntúa {n} × {what}",
    achReqText: "Escribe {n} reseñas con texto",
    achReqPerfect: "Da {n} notas de 10/10",
    achReqFav: "Fija {n} en el TOP 4",
    achReqFollowers: "Consigue {n} seguidores",
    achReqFollowing: "Sigue a {n} personas",
    achReqGenres: "Explora {n} géneros",
    achReqDecades: "Puntúa títulos de {n} décadas",
    achReqHarsh: "Da {n} notas ≤ 3",
    achReqLists: "Crea {n} listas",
    notifPremiere: "ya está disponible — lo tienes en tu lista",
    notifComment: "comentó tu reseña",
    notifReply: "respondió a tu comentario",
    noNotif: "Sin notificaciones. Cuando alguien te siga, aparecerá aquí.",
    block: "Bloquear",
    unblock: "Desbloquear",
    blocked: "Bloqueado",
    blockConfirm:
      "¿Bloquear a esta persona? Se eliminarán el seguimiento mutuo y el chat.",
    blockedList: "Bloqueados",
    noBlocked: "No has bloqueado a nadie.",
    account: "Cuenta",
    save: "Guardar",
    nameSaved: "Nombre guardado",
    bioLabel: "Sobre mí",
    bioPlaceholder: "Unas palabras sobre ti — ¿qué te gusta ver?",
    bioSaved: "Descripción guardada",
    bioLeft: "Quedan {n} caracteres",
    changePw: "Cambiar contraseña",
    currentPw: "Contraseña actual",
    newPw: "Nueva contraseña (mín. 6 caracteres)",
    savePw: "Cambiar contraseña",
    pwSaved: "Contraseña cambiada",
    notifPrefs: "Notificaciones en la app",
    notifPrefsHint: "Desactiva los tipos de los que no quieras enterarte.",
    ntFollow: "Nuevos seguidores",
    ntLike: "Me gusta en reseñas",
    ntComment: "Comentarios en reseñas",
    ntReply: "Respuestas a comentarios",
    ntWatchlist: "Puntuaciones de títulos de la lista",
    ntPremiere: "Estrenos de la lista",
    ntMessage: "Mensajes del chat",
    about: "Acerca de",
    aboutText: "Mozaika — puntúa todo lo que ves y lees. Versión {v}.",
    deleteAccount: "Eliminar cuenta",
    deleteConfirm:
      "¿Seguro que quieres eliminar la cuenta? Esto NO se puede deshacer — desaparecerán tus reseñas, mensajes y seguimientos.",
    deletePwPrompt: "Introduce tu contraseña para confirmar la eliminación de la cuenta:",
    accountDeleted: "Cuenta eliminada.",
    commentPlaceholder: "Escribe un comentario…",
    replyPlaceholder: "Escribe una respuesta…",
    addComment: "Comentar",
    reply: "Responder",
    commentDeleted: "Comentario eliminado",
    deleteComment: "Eliminar comentario",
    noCommentsYet: "Aún no hay comentarios. ¡Sé el primero!",
    followersLink: "{n} seguidores",
    followingLink: "{n} seguidos",
    followersTitle: "Seguidores",
    followingTitle: "Seguidos",
    peopleEmpty: "Aún no hay nadie aquí.",
    messages: "Mensajes",
    writeMessage: "💬 Escribir",
    msgPlaceholder: "Escribe un mensaje…",
    send: "Enviar",
    noConversations:
      "Sin conversaciones. Escribe a un amigo con «💬 Escribir» en su perfil.",
    chatEmpty: "Empezad la conversación — ¡escribe tú primero!",
    seen: "Visto",
    sent: "Enviado",
    typing: "escribiendo",
    navHome: "Inicio",
    navProfile: "Perfil",
    deleteMsg: "Eliminar",
    editMsg: "Editar mensaje",
    react: "Reacción",
    edited: "editado",
    shareBtn: "📨 Enviar a un amigo",
    shareTo: "Enviar a…",
    shared: "Enviado a {name}",
    noMutual: "No hay amigos para enviar (tenéis que seguiros mutuamente).",
    photo: "Foto",
    msgDeletedMine: "Eliminaste este mensaje",
    msgDeleted: "Mensaje eliminado",
    follow: "Seguir",
    following: "Siguiendo",
    noFollows: "Aún no sigues a nadie — añade amigos con «＋ Añadir».",
    noActivity: "Tus amigos aún no han puntuado nada.",
    showMore: "Ver más ({n})",
    showLess: "Ver menos",
    seeAllComments: "Ver todos ({n})",
    together: "🍿 Qué ver juntos",
    togetherTitle: "Qué ver junto a {name}",
    togBoth: "Los dos lo tenéis en la lista",
    togTheirs: "{name} lo tiene en la lista",
    togYours: "Lo tienes en la lista",
    togFresh: "Novedad para vuestro gusto común",
    togScores: "Tú {you} · {name} {them}",
    togEmpty:
      "Muy pocas puntuaciones para elegir algo para los dos. Puntuad algunos títulos y volved.",
    pushLabel: "Notificaciones",
    pushOff: "Activar notificaciones en el móvil",
    pushOn: "✓ Notificaciones activadas",
    pushOffHint:
      "Te avisamos cuando alguien empiece a seguirte — aunque Mozaika esté cerrada.",
    pushOnHint: "Este dispositivo recibirá notificaciones.",
    pushBlocked: "Notificaciones bloqueadas",
    pushBlockedHint:
      "Has bloqueado las notificaciones de este sitio. Desbloquéalas en los ajustes del navegador (candado junto a la dirección).",
    pushUnsupported:
      "Este navegador no admite notificaciones. En el iPhone, añade primero Mozaika a la pantalla de inicio.",
    pushEnabled: "Notificaciones activadas",
    pushDisabled: "Notificaciones desactivadas",
    pushSent: "Notificación de prueba enviada",
    pushTest: "Enviar prueba",
    noUsers: "No hay otros usuarios.",
    yourTaste: "Vuestro gusto",
    matchCap: "de coincidencia · {n} en común",
    notEnough:
      "Muy pocas puntuaciones en común ({n}/3) para calcular la coincidencia. Puntuad más títulos iguales.",
    you: "Tú",
    loading: "Cargando…",
    done: "✕ Listo",
    close: "✕ Cerrar",
    loginRequired: "Inicia sesión.",
    apiError: "Error de API",
    connectError: "No se pudo conectar con la API: {msg}",
    justNow: "ahora mismo",
    minAgo: "hace {n} min",
    hAgo: "hace {n} h",
    dAgo: "hace {n} d",
    shortNow: "ahora",
    shortMin: "{n} min",
    shortH: "{n} h",
    shortD: "{n} d",
    shortW: "{n} sem",
  },
  pt: {
    back: "← Voltar",
    logout: "Sair",
    settings: "Definições",
    language: "Idioma",
    tagline: "Avalia tudo o que vês e lês — o resto ajustamos ao teu gosto.",
    yourName: "O teu nome",
    email: "E-mail",
    login: "Entrar",
    register: "Criar conta",
    noAccount: "Ainda não tens conta?",
    haveAccount: "Já tens conta?",
    passwordPh: "Palavra-passe",
    passwordPhNew: "Palavra-passe (mín. 6 caracteres)",
    showPassword: "Mostrar palavra-passe",
    hidePassword: "Ocultar palavra-passe",
    yourProfile: "O teu perfil",
    changePhoto: "Mudar foto",
    hi: "Olá, {name}",
    typeFilm: "🎬 Filmes",
    typeSerial: "📺 Séries",
    typeBook: "📚 Livros",
    typeManga: "📗 Manga",
    typeAnime: "🎞️ Anime",
    typeMusic: "🎵 Música",
    typeGame: "🎮 Jogos",
    shelfMusic: "Música",
    shelfFilm: "Filmes / Séries",
    shelfAnime: "Anime",
    shelfBook: "Livros / Mangá",
    shelfGame: "Jogos",
    searchFilm: "Procurar filme…",
    searchSerial: "Procura séries…",
    searchBook: "Procurar livro…",
    searchManga: "Procurar manga…",
    searchAnime: "Procurar anime…",
    searchMusic: "Procurar álbum…",
    searchGame: "Procurar jogo…",
    results: "Resultados",
    resultsFrom: "Resultados de {src}: «{q}»",
    searching: "A procurar…",
    nothingFound: "Nada encontrado.",
    forYou: "Para ti",
    forYouHint: "Recomendado por pessoas com gostos parecidos.",
    tasteRecs: "Ao teu gosto",
    tasteRecsHint: "Novos títulos fora do teu catálogo, escolhidos para o teu gosto.",
    trailer: "Trailer",
    upcoming: "Em breve",
    upcomingHint: "Da tua lista — ainda não saíram. Avisamos no dia da estreia.",
    premiereOn: "Estreia a {date}",
    premiereToday: "Estreia hoje!",
    premiereInDays: "Em {n} dias",
    premiereTomorrow: "Amanhã",
    noTasteRecsType: "Avalia alguns títulos desta categoria e escolhemos algo novo.",
    noDiscoverForType: "Ainda não temos recomendações novas para esta categoria.",
    reasonSimilar: "Porque é parecido com «{title}»",
    reasonGenre: "Porque gostas do género {genre}",
    reasonType: "Porque gostas de {kat}",
    reasonPopular: "Porque é popular nesta categoria",
    reasonDecade: "Porque gostas dos anos {decade}.",
    reasonGeneral: "Popular — ao teu gosto",
    catFilm: "filmes",
    catAnime: "anime",
    catManga: "manga",
    catGame: "jogos",
    catSerial: "séries",
    catBook: "livros",
    catMusic: "música",
    tasteMore: "Ver mais",
    yourCatalog: "O teu catálogo",
    yourCatalogHint: "Títulos que avaliaste.",
    allGenres: "Todos",
    catalogSearchPh: "Procura no teu catálogo…",
    sortRecent: "Avaliados recentemente",
    sortRating: "Melhor avaliados",
    sortTitle: "Alfabeticamente",
    sortYear: "Ano de lançamento",
    catalogEmpty: "Nada corresponde a estes filtros.",
    tastePortrait: "Retrato de gostos",
    portraitEmpty: "Avalia alguns títulos e desenhamos o teu retrato de gostos.",
    harshMild: "Avalias de forma mais suave que a média.",
    harshTough: "Avalias de forma mais severa que a média.",
    harshBalanced: "Avalias mais ou menos como a média.",
    yourAvg: "A tua média",
    siteAvg: "site",
    topGenres: "Os teus géneros",
    topTypes: "Tipos de media",
    surpriseBtn: "🎲 Surpreende-me",
    statsBtn: "📊 Estatísticas",
    statRatings: "Distribuição de notas",
    statThisYear: "Este ano",
    statTotal: "Total",
    shareProfileBtn: "🔗 Copiar link",
    shareCopied: "Link do perfil copiado",
    statusPlan: "Planeado",
    statusInProgress: "Em curso",
    statusDone: "Concluído",
    markInProgress: "▶ Em curso",
    markDone: "✓ Concluído",
    favDecade: "Década favorita: os anos {decade}.",
    recBy: "recomendado por {n} pess.",
    noRecs: "Nada — avalia alguns títulos e escolhemos algo.",
    yourRating: "A tua avaliação",
    fav: "☆ TOP 4",
    favActive: "★ no TOP 4",
    watchAdd: "＋ Para a lista",
    watchActive: "✓ Na lista",
    commentPh: "Escreve um comentário (opcional)…",
    saveReview: "Guardar avaliação e comentário",
    deleteReview: "🗑 Apagar avaliação",
    confirmDeleteReview:
      "Apagar a tua avaliação e comentário de «{title}»? Isto não pode ser desfeito.",
    deletedReview: "Avaliação apagada",
    comments: "Comentários",
    noComments: "Sem comentários — sê o primeiro.",
    likeAdd: "Crítica certeira",
    dislikeAdd: "Crítica desajustada",
    reactRemove: "Remover reação",
    likeOwn: "Foi assim que outros avaliaram a tua crítica",
    likeLogin: "Entra para reagir a uma crítica.",
    loadingDesc: "A carregar descrição…",
    noDesc: "Sem descrição.",
    pickRating: "Escolhe uma avaliação (clica nas estrelas).",
    rateFirst: "Avalia primeiro este título (estrelas) para adicionar ao TOP 4.",
    addedTop4: "Adicionado ao TOP 4",
    removedTop4: "Removido do TOP 4",
    addedList: "Adicionado à lista",
    removedList: "Removido da lista",
    saved: "Guardado",
    savedPhoto: "Foto guardada",
    top4: "Top 4 favoritos",
    top4Empty: "Fixa favoritos com o botão «TOP 4» na página do título.",
    top4EmptyRO: "Sem favoritos.",
    myComments: "Os meus comentários",
    myCommentsEmpty: "Ainda não adicionaste nenhum comentário às avaliações.",
    userComments: "Críticas: {name}",
    userCommentsEmpty: "{name} ainda não adicionou nenhum comentário.",
    watchlistTitle: "Para ver / jogar",
    watchEmpty: "Vazio — adiciona algo com «Para a lista».",
    watchEmptyRO: "Vazio.",
    seeAll: "Ver tudo ({n})",
    nothingRatedCat: "Ainda não há nada aqui",
    translate: "Traduzir",
    autoTranslate: "Traduzir automaticamente",
    autoTranslateHint:
      "Mensagens, críticas e comentários noutras línguas traduzem-se sozinhos.",
    translating: "A traduzir…",
    hideTranslation: "Ocultar tradução",
    hideTranslationFrom: "Ocultar tradução ({lang})",
    noCoversPicked: "Nenhuma capa escolhida",
    edit: "Alterar",
    pickN: "Escolhe {max} ({n})",
    pickCovers: "{label} — escolhe até {max} capas",
    friends: "Amigos",
    add: "＋ Adicionar",
    searchFriends: "Procurar amigos…",
    noFriendsFound: "Ninguém encontrado.",
    notifications: "Notificações",
    notifFollowed: "começou a seguir-te",
    notifLiked: "gostou da tua crítica",
    notifRated: "avaliou um título da tua lista",
    notifNewRating: "avaliou",
    ntNewRating: "Novas avaliações de amigos",
    appearance: "Aparência",
    title: "Título",
    titleNone: "Nenhum",
    titleSet: "Título definido",
    themeSystem: "Sistema",
    themeLight: "Claro",
    themeDark: "Escuro",
    sortRelevance: "Relevância",
    ratingAny: "Nota: qualquer",
    yearAny: "Ano: qualquer",
    whereToWatch: "Onde ver",
    myLists: "As minhas listas",
    listsTitle: "Listas",
    listsEmpty: "Ainda não tens listas — cria a primeira!",
    listsEmptyRO: "Sem listas públicas.",
    newList: "＋ Nova",
    listEmpty: "Esta lista está vazia.",
    listsChip: "🗂 Listas",
    addToList: "Adicionar à lista",
    noListsYet: "Ainda não tens nenhuma lista. Cria uma abaixo.",
    newListPh: "Nome da nova lista…",
    create: "Criar",
    listCreated: "Lista criada",
    addedToList: "Adicionado à lista",
    removedFromList: "Removido da lista",
    confirmDeleteList: "Eliminar a lista «{name}»?",
    newListPrompt: "Nome da nova lista:",
    achievements: "🏆 Conquistas",
    titleInfoHead: "🏷️ Seu título",
    titleInfoHow: "Desbloqueado por: {req}",
    titleInfoSpecial: "Título especial.",
    achLblFilm: "Filmes",
    achLblSerial: "Séries",
    achLblBook: "Livros",
    achLblGame: "Jogos",
    achLblAnime: "Anime",
    achLblManga: "Manga",
    achLblMusic: "Álbuns",
    achReqTotal: "Avalia {n} títulos",
    achReqRate: "Avalia {n} × {what}",
    achReqText: "Escreve {n} críticas com texto",
    achReqPerfect: "Dá {n} notas de 10/10",
    achReqFav: "Fixa {n} no TOP 4",
    achReqFollowers: "Consegue {n} seguidores",
    achReqFollowing: "Segue {n} pessoas",
    achReqGenres: "Explora {n} géneros",
    achReqDecades: "Avalia títulos de {n} décadas",
    achReqHarsh: "Dá {n} notas ≤ 3",
    achReqLists: "Cria {n} listas",
    notifPremiere: "já está disponível — tens na tua lista",
    notifComment: "comentou a tua crítica",
    notifReply: "respondeu ao teu comentário",
    noNotif: "Sem notificações. Quando alguém te seguir, aparece aqui.",
    block: "Bloquear",
    unblock: "Desbloquear",
    blocked: "Bloqueado",
    blockConfirm: "Bloquear esta pessoa? O seguimento mútuo e o chat desaparecem.",
    blockedList: "Bloqueados",
    noBlocked: "Não bloqueaste ninguém.",
    account: "Conta",
    save: "Guardar",
    nameSaved: "Nome guardado",
    bioLabel: "Sobre mim",
    bioPlaceholder: "Umas palavras sobre ti — o que gostas de ver?",
    bioSaved: "Descrição guardada",
    bioLeft: "Faltam {n} caracteres",
    changePw: "Mudar palavra-passe",
    currentPw: "Palavra-passe atual",
    newPw: "Nova palavra-passe (mín. 6 caracteres)",
    savePw: "Mudar palavra-passe",
    pwSaved: "Palavra-passe alterada",
    notifPrefs: "Notificações na app",
    notifPrefsHint: "Desativa os tipos de que não queres saber.",
    ntFollow: "Novos seguidores",
    ntLike: "Gostos nas críticas",
    ntComment: "Comentários nas críticas",
    ntReply: "Respostas a comentários",
    ntWatchlist: "Avaliações de títulos da lista",
    ntPremiere: "Estreias da lista",
    ntMessage: "Mensagens do chat",
    about: "Sobre a app",
    aboutText: "Mozaika — avalia tudo o que vês e lês. Versão {v}.",
    deleteAccount: "Eliminar conta",
    deleteConfirm:
      "Eliminar mesmo a conta? Isto NÃO pode ser desfeito — as tuas críticas, mensagens e seguimentos desaparecem.",
    deletePwPrompt: "Introduz a tua palavra-passe para confirmar a eliminação da conta:",
    accountDeleted: "Conta eliminada.",
    commentPlaceholder: "Escreve um comentário…",
    replyPlaceholder: "Escreve uma resposta…",
    addComment: "Comentar",
    reply: "Responder",
    commentDeleted: "Comentário eliminado",
    deleteComment: "Eliminar comentário",
    noCommentsYet: "Ainda sem comentários. Sê o primeiro!",
    followersLink: "{n} seguidores",
    followingLink: "{n} a seguir",
    followersTitle: "Seguidores",
    followingTitle: "A seguir",
    peopleEmpty: "Ainda não há ninguém aqui.",
    messages: "Mensagens",
    writeMessage: "💬 Escrever",
    msgPlaceholder: "Escreve uma mensagem…",
    send: "Enviar",
    noConversations:
      "Sem conversas. Escreve a um amigo com «💬 Escrever» no perfil dele.",
    chatEmpty: "Comecem a conversa — escreve tu primeiro!",
    seen: "Visto",
    sent: "Enviado",
    typing: "a escrever",
    navHome: "Início",
    navProfile: "Perfil",
    deleteMsg: "Eliminar",
    editMsg: "Editar mensagem",
    react: "Reação",
    edited: "editado",
    shareBtn: "📨 Enviar a um amigo",
    shareTo: "Enviar para…",
    shared: "Enviado para {name}",
    noMutual: "Não há amigos para enviar (têm de se seguir mutuamente).",
    photo: "Foto",
    msgDeletedMine: "Eliminaste esta mensagem",
    msgDeleted: "Mensagem eliminada",
    follow: "Seguir",
    following: "A seguir",
    noFollows: "Ainda não segues ninguém — adiciona amigos com «＋ Adicionar».",
    noActivity: "Os teus amigos ainda não avaliaram nada.",
    showMore: "Ver mais ({n})",
    showLess: "Ver menos",
    seeAllComments: "Ver todos ({n})",
    together: "🍿 O que ver juntos",
    togetherTitle: "O que ver com {name}",
    togBoth: "Ambos têm na lista",
    togTheirs: "{name} tem na lista",
    togYours: "Tens na lista",
    togFresh: "Novidade para o vosso gosto comum",
    togScores: "Tu {you} · {name} {them}",
    togEmpty:
      "Poucas avaliações para escolher algo para os dois. Avaliem alguns títulos e voltem.",
    pushLabel: "Notificações",
    pushOff: "Ativar notificações no telemóvel",
    pushOn: "✓ Notificações ativadas",
    pushOffHint:
      "Avisamos quando alguém começar a seguir-te — mesmo com a Mozaika fechada.",
    pushOnHint: "Este dispositivo vai receber notificações.",
    pushBlocked: "Notificações bloqueadas",
    pushBlockedHint:
      "Bloqueaste as notificações deste site. Desbloqueia-as nas definições do navegador (cadeado junto ao endereço).",
    pushUnsupported:
      "Este navegador não suporta notificações. No iPhone, adiciona primeiro a Mozaika ao ecrã principal.",
    pushEnabled: "Notificações ativadas",
    pushDisabled: "Notificações desativadas",
    pushSent: "Notificação de teste enviada",
    pushTest: "Enviar teste",
    noUsers: "Não há outros utilizadores.",
    yourTaste: "O vosso gosto",
    matchCap: "de correspondência · {n} em comum",
    notEnough:
      "Poucas avaliações em comum ({n}/3) para calcular a correspondência. Avaliem mais títulos iguais.",
    you: "Tu",
    loading: "A carregar…",
    done: "✕ Concluído",
    close: "✕ Fechar",
    loginRequired: "Inicia sessão.",
    apiError: "Erro de API",
    connectError: "Não foi possível ligar à API: {msg}",
    justNow: "agora mesmo",
    minAgo: "há {n} min",
    hAgo: "há {n} h",
    dAgo: "há {n} dias",
    shortNow: "agora",
    shortMin: "{n} min",
    shortH: "{n} h",
    shortD: "{n} d",
    shortW: "{n} sem",
  },
  zh: {
    back: "← 返回",
    logout: "退出登录",
    settings: "设置",
    language: "语言",
    tagline: "为你看的、读的一切打分，其余的我们按你的口味推荐。",
    yourName: "你的名字",
    email: "邮箱",
    login: "登录",
    register: "注册",
    noAccount: "还没有账号？",
    haveAccount: "已经有账号了？",
    passwordPh: "密码",
    passwordPhNew: "密码（至少 6 个字符）",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    yourProfile: "你的资料",
    changePhoto: "更换头像",
    hi: "你好，{name}",
    typeFilm: "🎬 电影",
    typeSerial: "📺 剧集",
    typeBook: "📚 图书",
    typeManga: "📗 漫画",
    typeAnime: "🎞️ 动画",
    typeMusic: "🎵 音乐",
    typeGame: "🎮 游戏",
    shelfMusic: "音乐",
    shelfFilm: "电影 / 剧集",
    shelfAnime: "动画",
    shelfBook: "图书 / 漫画",
    shelfGame: "游戏",
    searchFilm: "搜索电影…",
    searchSerial: "搜索剧集…",
    searchBook: "搜索图书…",
    searchManga: "搜索漫画…",
    searchAnime: "搜索动画…",
    searchMusic: "搜索专辑…",
    searchGame: "搜索游戏…",
    results: "结果",
    resultsFrom: "来自 {src} 的结果：“{q}”",
    searching: "搜索中…",
    nothingFound: "没有找到任何内容。",
    forYou: "为你推荐",
    forYouHint: "由口味相近的人推荐。",
    tasteRecs: "合你口味",
    tasteRecsHint: "你目录之外的新作品，按你的口味挑选。",
    trailer: "预告片",
    upcoming: "即将上线",
    upcomingHint: "来自你的清单——还没上线。上线当天我们会通知你。",
    premiereOn: "{date} 上映",
    premiereToday: "今天上映！",
    premiereInDays: "还有 {n} 天",
    premiereTomorrow: "明天",
    noTasteRecsType: "给这个分类里的几部作品打分，我们会挑些新的。",
    noDiscoverForType: "这个分类暂时还没有新的推荐。",
    reasonSimilar: "因为和“{title}”相似",
    reasonGenre: "因为你喜欢 {genre} 类型",
    reasonType: "因为你喜欢{kat}",
    reasonPopular: "因为在这个分类里很热门",
    reasonDecade: "因为你喜欢 {decade} 年代。",
    reasonGeneral: "热门——合你口味",
    catFilm: "电影",
    catAnime: "动画",
    catManga: "漫画",
    catGame: "游戏",
    catSerial: "剧集",
    catBook: "图书",
    catMusic: "音乐",
    tasteMore: "显示更多",
    yourCatalog: "你的目录",
    yourCatalogHint: "你打过分的作品。",
    allGenres: "全部",
    catalogSearchPh: "搜索你的收藏…",
    sortRecent: "最近评分",
    sortRating: "评分最高",
    sortTitle: "按字母顺序",
    sortYear: "发行年份",
    catalogEmpty: "没有符合这些筛选条件的内容。",
    tastePortrait: "口味画像",
    portraitEmpty: "给几部作品打分，我们就为你画出口味画像。",
    harshMild: "你打分比平均更宽松。",
    harshTough: "你打分比平均更严格。",
    harshBalanced: "你打分和平均差不多。",
    yourAvg: "你的平均分",
    siteAvg: "全站",
    topGenres: "你的类型",
    topTypes: "媒体类型",
    surpriseBtn: "🎲 随便选一个",
    statsBtn: "📊 统计",
    statRatings: "评分分布",
    statThisYear: "今年",
    statTotal: "总计",
    shareProfileBtn: "🔗 复制链接",
    shareCopied: "已复制个人资料链接",
    statusPlan: "计划",
    statusInProgress: "进行中",
    statusDone: "已完成",
    markInProgress: "▶ 进行中",
    markDone: "✓ 已完成",
    favDecade: "最爱的年代：{decade} 年代。",
    recBy: "{n} 人推荐",
    noRecs: "暂无——先打几个分，我们就来挑。",
    yourRating: "你的评分",
    fav: "☆ 前 4",
    favActive: "★ 已入前 4",
    watchAdd: "＋ 加入清单",
    watchActive: "✓ 已在清单",
    commentPh: "写点评论（可选）…",
    saveReview: "保存评分和评论",
    deleteReview: "🗑 删除评分",
    confirmDeleteReview: "删除你对“{title}”的评分和评论？此操作无法撤销。",
    deletedReview: "评分已删除",
    comments: "评论",
    noComments: "还没有评论——来抢第一个。",
    likeAdd: "评得到位",
    dislikeAdd: "评得不准",
    reactRemove: "取消反应",
    likeOwn: "别人这样评价了你的评论",
    likeLogin: "登录后才能对评论作出反应。",
    loadingDesc: "正在加载简介…",
    noDesc: "暂无简介。",
    pickRating: "选择评分（点击星星）。",
    rateFirst: "先给这部作品打分（星星），才能加入前 4。",
    addedTop4: "已加入前 4",
    removedTop4: "已移出前 4",
    addedList: "已加入清单",
    removedList: "已移出清单",
    saved: "已保存",
    savedPhoto: "头像已保存",
    top4: "最爱前 4",
    top4Empty: "在作品页用“前 4”按钮置顶你的最爱。",
    top4EmptyRO: "暂无最爱。",
    myComments: "我的评论",
    myCommentsEmpty: "你还没有为任何评分写过评论。",
    userComments: "评论：{name}",
    userCommentsEmpty: "{name} 还没有写过评论。",
    watchlistTitle: "想看 / 想玩",
    watchEmpty: "空空的——用“加入清单”添加点什么吧。",
    watchEmptyRO: "空。",
    seeAll: "查看全部（{n}）",
    nothingRatedCat: "这里还什么都没有",
    translate: "翻译",
    autoTranslate: "自动翻译",
    autoTranslateHint: "外语的消息、评论和留言会自动翻译，无需点击「翻译」。",
    translating: "翻译中…",
    hideTranslation: "隐藏翻译",
    hideTranslationFrom: "隐藏翻译（{lang}）",
    noCoversPicked: "未选择封面",
    edit: "修改",
    pickN: "选择 {max}（{n}）",
    pickCovers: "{label}——最多选 {max} 张封面",
    friends: "好友",
    add: "＋ 添加",
    searchFriends: "搜索好友…",
    noFriendsFound: "没有找到任何人。",
    notifications: "通知",
    notifFollowed: "开始关注你",
    notifLiked: "赞了你的评论",
    notifRated: "评价了你清单里的一部作品",
    notifNewRating: "评价了",
    ntNewRating: "好友的新评分",
    appearance: "外观",
    title: "称号",
    titleNone: "无",
    titleSet: "已设置称号",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    sortRelevance: "相关度",
    ratingAny: "评分：全部",
    yearAny: "年份：全部",
    whereToWatch: "在哪观看",
    myLists: "我的清单",
    listsTitle: "清单",
    listsEmpty: "还没有清单——创建第一个吧！",
    listsEmptyRO: "没有公开的清单。",
    newList: "＋ 新建",
    listEmpty: "此清单为空。",
    listsChip: "🗂 清单",
    addToList: "添加到清单",
    noListsYet: "你还没有任何清单，在下面创建一个。",
    newListPh: "新清单名称…",
    create: "创建",
    listCreated: "清单已创建",
    addedToList: "已添加到清单",
    removedFromList: "已从清单移除",
    confirmDeleteList: "删除清单“{name}”？",
    newListPrompt: "新清单名称：",
    achievements: "🏆 成就",
    titleInfoHead: "🏷️ 你的称号",
    titleInfoHow: "解锁方式：{req}",
    titleInfoSpecial: "特殊称号。",
    achLblFilm: "电影",
    achLblSerial: "剧集",
    achLblBook: "图书",
    achLblGame: "游戏",
    achLblAnime: "动画",
    achLblManga: "漫画",
    achLblMusic: "专辑",
    achReqTotal: "评价 {n} 部作品",
    achReqRate: "评价 {n} 部{what}",
    achReqText: "写 {n} 条带文字的评论",
    achReqPerfect: "打出 {n} 个 10/10",
    achReqFav: "置顶 {n} 个到 TOP 4",
    achReqFollowers: "获得 {n} 位粉丝",
    achReqFollowing: "关注 {n} 个人",
    achReqGenres: "探索 {n} 种类型",
    achReqDecades: "评价 {n} 个年代的作品",
    achReqHarsh: "打出 {n} 个 ≤ 3 的评分",
    achReqLists: "创建 {n} 个清单",
    notifPremiere: "已经上线——在你的想看清单里",
    notifComment: "评论了你的评论",
    notifReply: "回复了你的评论",
    noNotif: "暂无通知。有人关注你时会显示在这里。",
    block: "拉黑",
    unblock: "解除拉黑",
    blocked: "已拉黑",
    blockConfirm: "拉黑此人？双方的关注和聊天都会消失。",
    blockedList: "已拉黑",
    noBlocked: "你还没有拉黑任何人。",
    account: "账号",
    save: "保存",
    nameSaved: "名字已保存",
    bioLabel: "关于我",
    bioPlaceholder: "简单介绍一下自己——你喜欢看什么？",
    bioSaved: "简介已保存",
    bioLeft: "还剩 {n} 个字",
    changePw: "修改密码",
    currentPw: "当前密码",
    newPw: "新密码（至少 6 个字符）",
    savePw: "修改密码",
    pwSaved: "密码已修改",
    notifPrefs: "应用内通知",
    notifPrefsHint: "关掉你不想知道的类型。",
    ntFollow: "新的关注者",
    ntLike: "评论获赞",
    ntComment: "评论下的留言",
    ntReply: "留言的回复",
    ntWatchlist: "清单作品的评分",
    ntPremiere: "清单里的上映",
    ntMessage: "聊天消息",
    about: "关于",
    aboutText: "Mozaika——为你看的、读的一切打分。版本 {v}。",
    deleteAccount: "删除账号",
    deleteConfirm: "确定删除账号？此操作无法撤销——你的评论、消息和关注都会消失。",
    deletePwPrompt: "输入密码以确认删除账号：",
    accountDeleted: "账号已删除。",
    commentPlaceholder: "写点评论…",
    replyPlaceholder: "写条回复…",
    addComment: "评论",
    reply: "回复",
    commentDeleted: "评论已删除",
    deleteComment: "删除评论",
    noCommentsYet: "还没有评论。来抢第一个！",
    followersLink: "{n} 关注者",
    followingLink: "{n} 关注中",
    followersTitle: "关注者",
    followingTitle: "关注中",
    peopleEmpty: "这里还没有人。",
    messages: "消息",
    writeMessage: "💬 私信",
    msgPlaceholder: "写条消息…",
    send: "发送",
    noConversations: "还没有会话。在好友资料页用“💬 私信”给他发消息。",
    chatEmpty: "开始聊天吧——你先说！",
    seen: "已读",
    sent: "已发送",
    typing: "正在输入",
    navHome: "主页",
    navProfile: "我的",
    deleteMsg: "删除",
    editMsg: "编辑消息",
    react: "反应",
    edited: "已编辑",
    shareBtn: "📨 发给好友",
    shareTo: "发送给…",
    shared: "已发送给 {name}",
    noMutual: "没有可发送的好友（你们需要互相关注）。",
    photo: "照片",
    msgDeletedMine: "你删除了这条消息",
    msgDeleted: "消息已删除",
    follow: "关注",
    following: "已关注",
    noFollows: "你还没有关注任何人——用“＋ 添加”添加好友。",
    noActivity: "你的好友还没有评价过任何内容。",
    showMore: "查看更多（{n}）",
    showLess: "收起",
    seeAllComments: "查看全部（{n}）",
    together: "🍿 一起看什么",
    togetherTitle: "和 {name} 一起看什么",
    togBoth: "你们俩都在清单里",
    togTheirs: "{name} 在清单里",
    togYours: "在你的清单里",
    togFresh: "为你们共同口味挑的新作",
    togScores: "你 {you} · {name} {them}",
    togEmpty: "评分太少，无法为你们俩挑选。多评几部再回来吧。",
    pushLabel: "通知",
    pushOff: "开启手机通知",
    pushOn: "✓ 通知已开启",
    pushOffHint: "有人关注你时我们会通知你——即使 Mozaika 已关闭。",
    pushOnHint: "此设备将接收通知。",
    pushBlocked: "通知已被屏蔽",
    pushBlockedHint:
      "你屏蔽了本站的通知。请在浏览器设置里解除屏蔽（地址栏旁的锁形图标）。",
    pushUnsupported: "此浏览器不支持通知。在 iPhone 上，请先把 Mozaika 添加到主屏幕。",
    pushEnabled: "通知已开启",
    pushDisabled: "通知已关闭",
    pushSent: "已发送测试通知",
    pushTest: "发送测试",
    noUsers: "没有其他用户。",
    yourTaste: "你们的口味",
    matchCap: "契合度 · {n} 部共同",
    notEnough: "共同评分太少（{n}/3），无法计算契合度。多评一些相同的作品吧。",
    you: "你",
    loading: "加载中…",
    done: "✕ 完成",
    close: "✕ 关闭",
    loginRequired: "请登录。",
    apiError: "API 错误",
    connectError: "无法连接到 API：{msg}",
    justNow: "刚刚",
    minAgo: "{n} 分钟前",
    hAgo: "{n} 小时前",
    dAgo: "{n} 天前",
    shortNow: "刚刚",
    shortMin: "{n} 分",
    shortH: "{n} 小时",
    shortD: "{n} 天",
    shortW: "{n} 周",
  },
  ja: {
    back: "← 戻る",
    logout: "ログアウト",
    settings: "設定",
    language: "言語",
    tagline:
      "観たもの・読んだものすべてを評価。残りはあなたの好みに合わせておすすめします。",
    yourName: "あなたの名前",
    email: "メール",
    login: "ログイン",
    register: "アカウント作成",
    noAccount: "アカウントをお持ちでないですか？",
    haveAccount: "すでにアカウントをお持ちですか？",
    passwordPh: "パスワード",
    passwordPhNew: "パスワード（6文字以上）",
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを隠す",
    yourProfile: "あなたのプロフィール",
    changePhoto: "写真を変更",
    hi: "こんにちは、{name}さん",
    typeFilm: "🎬 映画",
    typeSerial: "📺 ドラマ",
    typeBook: "📚 書籍",
    typeManga: "📗 マンガ",
    typeAnime: "🎞️ アニメ",
    typeMusic: "🎵 音楽",
    typeGame: "🎮 ゲーム",
    shelfMusic: "音楽",
    shelfFilm: "映画 / ドラマ",
    shelfAnime: "アニメ",
    shelfBook: "書籍 / マンガ",
    shelfGame: "ゲーム",
    searchFilm: "映画を検索…",
    searchSerial: "ドラマを検索…",
    searchBook: "書籍を検索…",
    searchManga: "マンガを検索…",
    searchAnime: "アニメを検索…",
    searchMusic: "アルバムを検索…",
    searchGame: "ゲームを検索…",
    results: "検索結果",
    resultsFrom: "{src} の結果：「{q}」",
    searching: "検索中…",
    nothingFound: "見つかりませんでした。",
    forYou: "あなたへ",
    forYouHint: "好みの近い人からのおすすめ。",
    tasteRecs: "あなた好み",
    tasteRecsHint: "カタログ外の新しい作品を、あなたの好みに合わせて。",
    trailer: "予告編",
    upcoming: "近日公開",
    upcomingHint: "あなたのリストから — まだ公開前。公開日にお知らせします。",
    premiereOn: "{date} 公開",
    premiereToday: "本日公開！",
    premiereInDays: "あと {n} 日",
    premiereTomorrow: "明日",
    noTasteRecsType: "このカテゴリの作品をいくつか評価すると、新しいものを選びます。",
    noDiscoverForType: "このカテゴリにはまだ新しいおすすめがありません。",
    reasonSimilar: "「{title}」に似ているから",
    reasonGenre: "{genre} が好きだから",
    reasonType: "{kat}が好きだから",
    reasonPopular: "このカテゴリで人気だから",
    reasonDecade: "{decade} 年代が好きだから。",
    reasonGeneral: "人気 — あなた好み",
    catFilm: "映画",
    catAnime: "アニメ",
    catManga: "マンガ",
    catGame: "ゲーム",
    catSerial: "ドラマ",
    catBook: "書籍",
    catMusic: "音楽",
    tasteMore: "もっと見る",
    yourCatalog: "あなたのカタログ",
    yourCatalogHint: "評価した作品。",
    allGenres: "すべて",
    catalogSearchPh: "カタログを検索…",
    sortRecent: "最近評価した順",
    sortRating: "評価の高い順",
    sortTitle: "五十音順",
    sortYear: "公開年",
    catalogEmpty: "この条件に一致するものはありません。",
    tastePortrait: "好みの傾向",
    portraitEmpty: "いくつか評価すると、あなたの好みの傾向を描きます。",
    harshMild: "平均より甘めに評価しています。",
    harshTough: "平均より辛めに評価しています。",
    harshBalanced: "平均とほぼ同じ評価です。",
    yourAvg: "あなたの平均",
    siteAvg: "サイト",
    topGenres: "あなたのジャンル",
    topTypes: "メディアの種類",
    surpriseBtn: "🎲 おまかせ",
    statsBtn: "📊 統計",
    statRatings: "評価の分布",
    statThisYear: "今年",
    statTotal: "合計",
    shareProfileBtn: "🔗 リンクをコピー",
    shareCopied: "プロフィールのリンクをコピーしました",
    statusPlan: "予定",
    statusInProgress: "進行中",
    statusDone: "完了",
    markInProgress: "▶ 進行中",
    markDone: "✓ 完了",
    favDecade: "好きな年代：{decade} 年代。",
    recBy: "{n} 人がおすすめ",
    noRecs: "なし — いくつか評価すると選びます。",
    yourRating: "あなたの評価",
    fav: "☆ TOP 4",
    favActive: "★ TOP 4",
    watchAdd: "＋ リストへ",
    watchActive: "✓ リスト済み",
    commentPh: "コメントを書く（任意）…",
    saveReview: "評価とコメントを保存",
    deleteReview: "🗑 評価を削除",
    confirmDeleteReview: "「{title}」の評価とコメントを削除しますか？元に戻せません。",
    deletedReview: "評価を削除しました",
    comments: "コメント",
    noComments: "コメントはまだありません — 最初の一人に。",
    likeAdd: "的確なレビュー",
    dislikeAdd: "的外れなレビュー",
    reactRemove: "リアクションを取り消す",
    likeOwn: "他の人はあなたのレビューをこう評価しました",
    likeLogin: "レビューに反応するにはログインしてください。",
    loadingDesc: "あらすじを読み込み中…",
    noDesc: "あらすじはありません。",
    pickRating: "評価を選んでください（星をクリック）。",
    rateFirst: "TOP 4 に追加するには、まずこの作品を評価してください（星）。",
    addedTop4: "TOP 4 に追加しました",
    removedTop4: "TOP 4 から外しました",
    addedList: "リストに追加しました",
    removedList: "リストから外しました",
    saved: "保存しました",
    savedPhoto: "写真を保存しました",
    top4: "お気に入り TOP 4",
    top4Empty: "作品ページの「TOP 4」ボタンでお気に入りをピン留め。",
    top4EmptyRO: "お気に入りなし。",
    myComments: "自分のコメント",
    myCommentsEmpty: "まだ評価にコメントを付けていません。",
    userComments: "レビュー：{name}",
    userCommentsEmpty: "{name} はまだコメントを付けていません。",
    watchlistTitle: "観たい / 遊びたい",
    watchEmpty: "空です — 「リストへ」で追加しましょう。",
    watchEmptyRO: "空です。",
    seeAll: "すべて見る（{n}）",
    nothingRatedCat: "ここにはまだ何もありません",
    translate: "翻訳",
    autoTranslate: "自動翻訳",
    autoTranslateHint: "外国語のメッセージ・レビュー・コメントは自動で翻訳されます。",
    translating: "翻訳中…",
    hideTranslation: "翻訳を隠す",
    hideTranslationFrom: "翻訳を隠す（{lang}）",
    noCoversPicked: "表紙が選ばれていません",
    edit: "変更",
    pickN: "{max} 個選ぶ（{n}）",
    pickCovers: "{label} — 最大 {max} 枚のカバーを選択",
    friends: "友だち",
    add: "＋ 追加",
    searchFriends: "友だちを検索…",
    noFriendsFound: "誰も見つかりませんでした。",
    notifications: "通知",
    notifFollowed: "があなたをフォローしました",
    notifLiked: "があなたのレビューにいいねしました",
    notifRated: "があなたのリストの作品を評価しました",
    notifNewRating: "を評価しました",
    ntNewRating: "友達の新しい評価",
    appearance: "外観",
    title: "称号",
    titleNone: "なし",
    titleSet: "称号を設定しました",
    themeSystem: "システムに従う",
    themeLight: "ライト",
    themeDark: "ダーク",
    sortRelevance: "関連度",
    ratingAny: "評価：すべて",
    yearAny: "年：すべて",
    whereToWatch: "配信サービス",
    myLists: "マイリスト",
    listsTitle: "リスト",
    listsEmpty: "まだリストがありません — 最初のリストを作成！",
    listsEmptyRO: "公開リストはありません。",
    newList: "＋ 新規",
    listEmpty: "このリストは空です。",
    listsChip: "🗂 リスト",
    addToList: "リストに追加",
    noListsYet: "まだリストがありません。下で作成してください。",
    newListPh: "新しいリスト名…",
    create: "作成",
    listCreated: "リストを作成しました",
    addedToList: "リストに追加しました",
    removedFromList: "リストから削除しました",
    confirmDeleteList: "リスト「{name}」を削除しますか？",
    newListPrompt: "新しいリスト名：",
    achievements: "🏆 実績",
    titleInfoHead: "🏷️ あなたの称号",
    titleInfoHow: "解除条件：{req}",
    titleInfoSpecial: "特別な称号。",
    achLblFilm: "映画",
    achLblSerial: "ドラマ",
    achLblBook: "書籍",
    achLblGame: "ゲーム",
    achLblAnime: "アニメ",
    achLblManga: "マンガ",
    achLblMusic: "アルバム",
    achReqTotal: "{n} 作品を評価する",
    achReqRate: "{what}を {n} 本評価する",
    achReqText: "本文付きレビューを {n} 件書く",
    achReqPerfect: "10/10 を {n} 回付ける",
    achReqFav: "TOP 4 に {n} 件ピン留めする",
    achReqFollowers: "フォロワーを {n} 人獲得する",
    achReqFollowing: "{n} 人をフォローする",
    achReqGenres: "{n} ジャンルを開拓する",
    achReqDecades: "{n} 年代の作品を評価する",
    achReqHarsh: "3 以下の評価を {n} 回付ける",
    achReqLists: "{n} 個のリストを作成する",
    notifPremiere: "が公開されました — あなたのリストにあります",
    notifComment: "があなたのレビューにコメントしました",
    notifReply: "があなたのコメントに返信しました",
    noNotif: "通知はありません。誰かがフォローするとここに表示されます。",
    block: "ブロック",
    unblock: "ブロック解除",
    blocked: "ブロック済み",
    blockConfirm: "この人をブロックしますか？相互フォローとチャットがなくなります。",
    blockedList: "ブロック中",
    noBlocked: "誰もブロックしていません。",
    account: "アカウント",
    save: "保存",
    nameSaved: "名前を保存しました",
    bioLabel: "自己紹介",
    bioPlaceholder: "ひとことで自己紹介 — 何を観るのが好き？",
    bioSaved: "自己紹介を保存しました",
    bioLeft: "残り {n} 文字",
    changePw: "パスワードを変更",
    currentPw: "現在のパスワード",
    newPw: "新しいパスワード（6文字以上）",
    savePw: "パスワードを変更",
    pwSaved: "パスワードを変更しました",
    notifPrefs: "アプリ内通知",
    notifPrefsHint: "知りたくない種類をオフにできます。",
    ntFollow: "新しいフォロワー",
    ntLike: "レビューへのいいね",
    ntComment: "レビューへのコメント",
    ntReply: "コメントへの返信",
    ntWatchlist: "リスト作品の評価",
    ntPremiere: "リストの作品の公開",
    ntMessage: "チャットのメッセージ",
    about: "アプリについて",
    aboutText: "Mozaika — 観たもの・読んだものすべてを評価。バージョン {v}。",
    deleteAccount: "アカウントを削除",
    deleteConfirm:
      "本当にアカウントを削除しますか？元に戻せません — レビュー、メッセージ、フォローがすべて消えます。",
    deletePwPrompt: "アカウント削除を確認するにはパスワードを入力してください：",
    accountDeleted: "アカウントを削除しました。",
    commentPlaceholder: "コメントを書く…",
    replyPlaceholder: "返信を書く…",
    addComment: "コメント",
    reply: "返信",
    commentDeleted: "コメントを削除しました",
    deleteComment: "コメントを削除",
    noCommentsYet: "まだコメントはありません。最初の一人に！",
    followersLink: "フォロワー {n}",
    followingLink: "フォロー中 {n}",
    followersTitle: "フォロワー",
    followingTitle: "フォロー中",
    peopleEmpty: "ここにはまだ誰もいません。",
    messages: "メッセージ",
    writeMessage: "💬 メッセージ",
    msgPlaceholder: "メッセージを書く…",
    send: "送信",
    noConversations:
      "会話はありません。友だちのプロフィールの「💬 メッセージ」から送りましょう。",
    chatEmpty: "会話を始めましょう — あなたから！",
    seen: "既読",
    sent: "送信済み",
    typing: "入力中",
    navHome: "ホーム",
    navProfile: "プロフィール",
    deleteMsg: "削除",
    editMsg: "メッセージを編集",
    react: "リアクション",
    edited: "編集済み",
    shareBtn: "📨 友だちに送る",
    shareTo: "送信先…",
    shared: "{name} に送りました",
    noMutual: "送れる友だちがいません（相互フォローが必要です）。",
    photo: "写真",
    msgDeletedMine: "このメッセージを削除しました",
    msgDeleted: "メッセージを削除しました",
    follow: "フォロー",
    following: "フォロー中",
    noFollows: "まだ誰もフォローしていません — 「＋ 追加」で友だちを追加しましょう。",
    noActivity: "友だちはまだ何も評価していません。",
    showMore: "もっと見る（{n}）",
    showLess: "折りたたむ",
    seeAllComments: "すべて見る（{n}）",
    together: "🍿 一緒に何を観る",
    togetherTitle: "{name} と一緒に何を観る",
    togBoth: "二人ともリストにあります",
    togTheirs: "{name} のリストにあります",
    togYours: "あなたのリストにあります",
    togFresh: "二人の共通の好みに合う新作",
    togScores: "あなた {you} · {name} {them}",
    togEmpty: "二人向けに選ぶには評価が少なすぎます。いくつか評価してまた来てください。",
    pushLabel: "通知",
    pushOff: "スマホの通知をオンにする",
    pushOn: "✓ 通知オン",
    pushOffHint: "誰かがフォローするとお知らせします — Mozaika を閉じていても。",
    pushOnHint: "この端末が通知を受け取ります。",
    pushBlocked: "通知がブロックされています",
    pushBlockedHint:
      "このサイトの通知をブロックしています。ブラウザの設定で解除してください（アドレス横の鍵アイコン）。",
    pushUnsupported:
      "このブラウザは通知に対応していません。iPhone ではまず Mozaika をホーム画面に追加してください。",
    pushEnabled: "通知をオンにしました",
    pushDisabled: "通知をオフにしました",
    pushSent: "テスト通知を送りました",
    pushTest: "テスト送信",
    noUsers: "他のユーザーはいません。",
    yourTaste: "二人の好み",
    matchCap: "一致 · {n} 作品が共通",
    notEnough:
      "共通の評価が少なすぎて（{n}/3）一致度を計算できません。同じ作品をもっと評価しましょう。",
    you: "あなた",
    loading: "読み込み中…",
    done: "✕ 完了",
    close: "✕ 閉じる",
    loginRequired: "ログインしてください。",
    apiError: "APIエラー",
    connectError: "APIに接続できませんでした：{msg}",
    justNow: "たった今",
    minAgo: "{n} 分前",
    hAgo: "{n} 時間前",
    dAgo: "{n} 日前",
    shortNow: "今",
    shortMin: "{n} 分",
    shortH: "{n} 時間",
    shortD: "{n} 日",
    shortW: "{n} 週",
  },
};

const LANGS = [
  { code: "pl", label: "Polski" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
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
  serial: "searchSerial",
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
  // Przełącznik automatu tylko wtedy, gdy serwer w ogóle umie tłumaczyć (klucz DeepL).
  const row = $("autoTransRow");
  row.classList.toggle("hidden", !translateOn);
  $("autoTransToggle").checked = autoTranslate;
}

function setLang(code) {
  if (!I18N[code]) return;
  lang = code;
  localStorage.setItem(LANG_KEY, code);
  applyStaticI18n();
  renderLangList();
  renderThemeList(); // przetłumacz etykiety motywu, jeśli sekcja jest otwarta
  refreshDynamic();
}

// --- Motyw jasny/ciemny ---
const THEME_KEY = "mozaika_theme";
// "system" | "light" | "dark". Domyślnie ciemny — zachowuje dotychczasowy wygląd.
let themePref = localStorage.getItem(THEME_KEY) || "dark";
const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)");

function effectiveTheme() {
  if (themePref === "system") return prefersLight?.matches ? "light" : "dark";
  return themePref;
}

// Ustawia data-theme na <html> (ciemny = brak atrybutu, bo :root jest ciemny) i kolor
// paska systemowego. Wołane od razu przy starcie, więc motyw jest zanim narysujemy.
function applyTheme() {
  const light = effectiveTheme() === "light";
  const root = document.documentElement;
  if (light) root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", light ? "#f4f4f8" : "#0e0e14");
}

function setTheme(pref) {
  themePref = pref;
  localStorage.setItem(THEME_KEY, pref);
  applyTheme();
  renderThemeList();
}

const THEME_OPTS = [
  { code: "system", label: "themeSystem" },
  { code: "light", label: "themeLight" },
  { code: "dark", label: "themeDark" },
];
function renderThemeList() {
  const box = $("themeList");
  if (!box) return;
  box.innerHTML = "";
  for (const o of THEME_OPTS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lang-btn" + (themePref === o.code ? " active" : "");
    b.textContent = t(o.label);
    b.addEventListener("click", () => setTheme(o.code));
    box.append(b);
  }
}

// Gdy wybrano „Systemowy", reaguj na zmianę motywu urządzenia w locie.
prefersLight?.addEventListener?.("change", () => {
  if (themePref === "system") applyTheme();
});
applyTheme(); // zastosuj zapisany wybór natychmiast (mniej migotania)

// Odświeża teksty ustawiane dynamicznie po zmianie języka. Statyczne (data-i18n)
// robi applyStaticI18n; tu odświeżamy to, co JS renderuje przez t() — inaczej
// zostaje w starym języku (np. etykiety w otwartym panelu ustawień).
function refreshDynamic() {
  setAuthMode(authMode);
  applySearchPlaceholder();

  // Podkładowy widok.
  if (!$("profileView").classList.contains("hidden")) {
    if (viewingUserId) loadUserProfile(viewingUserId);
    else loadProfile();
  } else if (!$("detailView").classList.contains("hidden")) {
    updateDetailButtons();
    loadDetailTexts(); // tytuł + opis w nowym języku
    if (detailCtx?.mediaId) loadDetailReviews(detailCtx.mediaId); // recenzje + komentarze
  } else if (me) {
    loadTasteRecommendations();
    loadRecommendations();
    loadCatalog();
  }

  // Nakładki mogą być otwarte NAD widokiem — odświeżamy je niezależnie.
  refreshSettingsLang();
  if (!$("notifOverlay").classList.contains("hidden")) renderNotifList();
  if (chatWithId && !$("chatOverlay").classList.contains("hidden")) loadThread();
}

// Ponownie renderuje dynamiczne sekcje otwartego panelu ustawień (te budowane
// przez JS, nie przez data-i18n). Tylko sekcje faktycznie wczytane (accLoaded).
function refreshSettingsLang() {
  if (!$("settingsOverlay").classList.contains("open")) return;
  renderPushSettings(); // tekst przycisku push
  renderAccountSettings(); // etykiety formularza konta
  if (accLoaded.has("notifPrefs")) renderNotifPrefs();
  if (accLoaded.has("blocked")) renderBlockedList();
  if (accLoaded.has("about")) renderAbout();
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
  theme: renderThemeList,
  title: renderTitleList,
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
  // .open uruchamia animację wjazdu drawera (panel jest zawsze w DOM, nie display:none,
  // żeby transform się animował). Reset scrolla panelu przy każdym otwarciu.
  $("settingsDrawer").scrollTop = 0;
  $("settingsOverlay").classList.add("open");
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
const MAX_BIO = 100; // musi się zgadzać z limitem serwera (logic/account.ts)

/** Licznik „ile jeszcze znaków" pod polem „o mnie". */
function updateBioCount() {
  const left = MAX_BIO - $("bioInput").value.length;
  $("bioCount").textContent = t("bioLeft", { n: left });
}

function renderAccountSettings() {
  $("nameInput").value = me?.displayName ?? "";
  $("bioInput").value = myProfile?.user?.bio ?? "";
  updateBioCount();
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
  { type: "new_rating", label: "ntNewRating" },
  { type: "premiere", label: "ntPremiere" },
  { type: "message", label: "ntMessage" },
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
  $("settingsOverlay").classList.remove("open");
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
  // Tytuły i opisy filmów tłumaczy backend (pyta TMDB w tym języku) — słownik I18N
  // zna tylko teksty statyczne, więc bez tego tytuły zostawałyby po polsku.
  headers["X-Lang"] = lang;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error(t("loginRequired"));
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || t("apiError"));
  return data;
}

// --- Tłumaczenie cudzych tekstów (czat, recenzje, komentarze) ---

// Bez klucza DeepL na serwerze tłumaczenia nie ma — wtedy nie pokazujemy przycisku,
// zamiast dawać go i wywalać się dopiero przy kliknięciu. Pytamy raz, przy starcie.
let translateOn = false;
async function initTranslate() {
  try {
    translateOn = (await api("/translate/enabled")).enabled === true;
  } catch {
    translateOn = false;
  }
}

/**
 * Tłumaczenia trzymamy POZA drzewem DOM, bo listy są przebudowywane od zera:
 * czat odpytuje serwer co 4 s i robi innerHTML="", komentarze przerysowują się po
 * dodaniu wpisu. Tłumaczenie wpisane w DOM znikało przy najbliższym odświeżeniu —
 * stąd pamięć per wpis (klucz to np. „msg:12") i odtwarzanie stanu przy renderze.
 * `open` osobno od treści: zwinięcia też nie chcemy tracić przy odświeżeniu.
 */
const translationCache = new Map(); // klucz → { text, from }
const translationOpen = new Set(); // klucze z rozwiniętym tłumaczeniem
// Wpisy, które i tak są w Twoim języku (DeepL wykrył to samo, o co prosiliśmy).
// Nie pokazujemy przy nich niczego — przycisk „Przetłumacz" pod polskim zdaniem
// dla polskiego użytkownika to śmieć na ekranie.
const translationSame = new Set();

/**
 * Klucz pamięci MUSI zawierać język. Samo id wpisu znaczyło, że po przełączeniu
 * języka wisiało poprzednie tłumaczenie podpisane nowym językiem (przetłumaczone
 * na polski zostawało na ekranie po zmianie na niemiecki), a wpis uznany kiedyś
 * za „już w Twoim języku" nigdy nie dostawał przycisku po zmianie na inny.
 */
const tk = (key, l = lang) => `${l}:${key}`;

/**
 * Krótki skrót treści — wchodzi do klucza pamięci obok id wpisu.
 *
 * Samo id nie wystarcza, bo treść pod tym samym id POTRAFI się zmienić: czat ma
 * edycję wiadomości, a recenzja jest nadpisywana (upsert po użytkowniku i tytule).
 * Bez tego po edycji wisiało tłumaczenie POPRZEDNIEJ wersji — pod „Actually it was
 * terrible." spokojnie stało „Ten film był niesamowity".
 */
function hashText(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// --- Tryb automatyczny ---

const AUTO_KEY = "mozaika_autotranslate";
let autoTranslate = localStorage.getItem(AUTO_KEY) === "1";

/**
 * Wpisy czekające na automatyczne tłumaczenie. Zbieramy je z CAŁEGO renderu i wysyłamy
 * jednym zapytaniem: osobne na wiadomość rozbiłoby limit (30/min) na pierwszej dłuższej
 * rozmowie, a przy odpytywaniu czatu co 4 s tym bardziej.
 */
const autoPending = new Map(); // klucz → { text, apply }
const autoTried = new Set(); // już próbowane — polling nie ma strzelać w kółko
let autoTimer = null;

function queueAuto(key, text, apply) {
  if (autoTried.has(tk(key))) return;
  autoPending.set(key, { text, apply });
  clearTimeout(autoTimer);
  autoTimer = setTimeout(flushAuto, 60); // chwila na zebranie całego renderu
}

const AUTO_BATCH = 50; // tyle, ile przyjmuje trasa /translate

async function flushAuto() {
  if (!autoPending.size) return;
  // Język zapamiętany na czas TEGO zapytania: gdyby user przełączył go w locie,
  // odpowiedź opisuje stary język i musi trafić pod jego klucz, nie pod nowy.
  const reqLang = lang;
  const batch = [...autoPending.entries()].slice(0, AUTO_BATCH);
  for (const [key] of batch) {
    autoPending.delete(key);
    autoTried.add(tk(key, reqLang));
  }
  try {
    const out = await api("/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts: batch.map(([, v]) => v.text) }),
    });
    batch.forEach(([key, v], i) => {
      const tr = out[i];
      if (!tr) return;
      translationCache.set(tk(key, reqLang), tr);
      // Tekst już w Twoim języku → nie ma czego pokazywać.
      if (tr.from && tr.from === reqLang) translationSame.add(tk(key, reqLang));
      else translationOpen.add(tk(key, reqLang));
      v.apply(); // element mógł już zniknąć — apply sam to sprawdza
    });
  } catch {
    // Cicho: automat jest wygodą, nie obietnicą. Przycisk „Przetłumacz" zostaje,
    // więc user zawsze może kliknąć i wtedy zobaczy konkretny błąd.
  }
  if (autoPending.size) flushAuto(); // reszta, gdy widok miał >AUTO_BATCH wpisów
}

function setAutoTranslate(on) {
  autoTranslate = on;
  localStorage.setItem(AUTO_KEY, on ? "1" : "0");
  if (on) refreshDynamic(); // dociągnij tłumaczenia do tego, co już na ekranie
}

/**
 * Blok „Przetłumacz" pod CUDZYM tekstem: tłumaczenie pokazuje się POD oryginałem
 * (oryginał zostaje — łatwiej porównać i widać, że to nie podmiana treści).
 * Zwraca null, gdy nie ma czego/jak tłumaczyć — wołający wtedy nic nie dokłada.
 *
 * `key` musi być stabilny między renderami (id wpisu), inaczej po odświeżeniu
 * listy tłumaczenie nie odnajdzie się w pamięci.
 *
 * Języka źródłowego nie zgadujemy z góry (wykrywanie na froncie myli się na krótkich
 * tekstach, a „hey" wygląda tak samo w kilku językach) — mówi go DeepL przy okazji
 * tłumaczenia i dopiero wtedy piszemy, z czego przetłumaczyliśmy.
 */
function translateControl(text, entryKey) {
  if (!translateOn || !me || !(text ?? "").trim() || !entryKey) return null;
  // Klucz = wpis + skrót treści + język. Każdy z tych trzech może się zmienić i każda
  // zmiana ma znaczyć „to jest nowy tekst do tłumaczenia".
  const rawKey = `${entryKey}#${hashText(text)}`;
  const key = tk(rawKey);
  // Automat już ustalił, że to Twój język — nie zaśmiecamy ekranu przyciskiem.
  if (translationSame.has(key)) return null;

  const wrap = document.createElement("div");
  wrap.className = "translate-wrap";

  const box = document.createElement("div");
  box.className = "translated-text hidden";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "translate-btn";
  btn.textContent = t("translate");

  const show = (tr) => {
    box.textContent = tr.text;
    box.classList.remove("hidden");
    btn.textContent = tr.from
      ? t("hideTranslationFrom", { lang: tr.from.toUpperCase() })
      : t("hideTranslation");
  };
  const hide = () => {
    box.classList.add("hidden");
    btn.textContent = t("translate");
  };

  // Render po odświeżeniu listy: wracamy do tego, co user miał na ekranie.
  const cached = translationCache.get(key);
  if (cached && translationOpen.has(key)) show(cached);
  // Tryb automatyczny: nieznany tekst dopisujemy do wspólnego wsadu. `apply` odpali
  // się po odpowiedzi — o ile ten konkretny element jeszcze wisi w dokumencie
  // (polling mógł go w międzyczasie podmienić; wtedy odtworzy go render z cache).
  else if (autoTranslate && !cached) {
    queueAuto(rawKey, text, () => {
      const tr = translationCache.get(key);
      if (tr && box.isConnected && translationOpen.has(key)) show(tr);
      if (translationSame.has(key)) wrap.remove();
    });
  }

  btn.addEventListener("click", async () => {
    if (translationOpen.has(key)) {
      translationOpen.delete(key);
      hide();
      return;
    }
    const hit = translationCache.get(key);
    if (hit) {
      // Raz przetłumaczone zostaje w pamięci — ponowne pytanie zjadałoby limit.
      translationOpen.add(key);
      show(hit);
      return;
    }
    btn.disabled = true;
    btn.textContent = t("translating");
    try {
      const r = await api("/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      translationCache.set(key, r);
      translationOpen.add(key);
      show(r);
    } catch (e) {
      toast(e.message);
      btn.textContent = t("translate");
    } finally {
      btn.disabled = false;
    }
  });

  wrap.append(box, btn);
  return wrap;
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
  if (opts.statusLabel) {
    const b = document.createElement("span");
    b.className = "status-badge";
    b.textContent = opts.statusLabel;
    poster.append(b);
  }
  card.append(poster);

  // Na profilu pokazujemy sam plakat (bez nazwy/roku pod spodem). Żeby dało się
  // rozpoznać tytuł bez wchodzenia w szczegóły, nazwa wyjeżdża na najechanie
  // kursorem. Pozycjonowana absolutnie, więc nie zmienia wysokości karty.
  if (opts.noMeta) {
    const cap = document.createElement("div");
    cap.className = "poster-cap";
    // Tekst w osobnym elemencie, bo przycinanie do 2 linii (-webkit-line-clamp)
    // wymaga display:-webkit-box, a ten na elemencie pozycjonowanym absolutnie
    // jest przez przeglądarkę zamieniany na blokowy — i klamrowanie przestaje działać.
    const capText = document.createElement("span");
    capText.className = "poster-cap-t";
    capText.textContent = m.title;
    cap.append(capText);
    poster.append(cap);
    // Dla czytników ekranu i jako podpowiedź systemowa — podpis jest tylko wizualny.
    card.setAttribute("aria-label", m.title);
    return { card, meta: null };
  }

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
  SERIAL: "serial",
  KSIAZKA: "book",
  MANGA: "manga",
  ANIME: "anime",
  MUZYKA: "music",
  GRA: "game",
};

/**
 * MOJA ocena tytułu — nigdy ta z klikniętej karty.
 *
 * Karta niesie ocenę swojego właściciela i słusznie, bo ją pokazuje. Ale widok
 * szczegółów wypełniał tą liczbą gwiazdki „Twoja ocena": na profilu znajomego
 * wchodziło się w nieoceniony przez siebie tytuł i „Zapisz" zapisywał CUDZĄ ocenę
 * jako własną — po cichu, bo gwiazdki wyglądały na wypełnione przez nas.
 * (Lista recenzji poprawiała gwiazdki, ale tylko gdy własna ocena już istniała.)
 */
function myRatingFor(mediaId) {
  if (!mediaId) return undefined;
  return myProfile?.reviews?.find((r) => r.media.id === mediaId)?.rating;
}

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
// optsFor(m) (opcjonalne) pozwala dołożyć opcje karty per element (np. odznaka statusu);
// bez niego karta dostaje tylko ocenę, jak dotychczas.
function renderGrid(container, list, onClick, optsFor) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<p class="muted">${t("nothingFound")}</p>`;
    return;
  }
  for (const m of list) {
    const { card } = posterCard(m, optsFor ? optsFor(m) : { score: m.myRating });
    card.addEventListener("click", () => onClick(m));
    container.append(card);
  }
}

let catalogItems = []; // Twoje ocenione tytuły (z gatunkami)
let catalogGenre = null; // wybrany gatunek do filtrowania (null = wszystkie)
let catalogType = null; // wybrany typ medium do filtrowania (null = wszystkie)
let catalogStatus = "all"; // all | plan | in_progress | done (zakładka statusu)
let catalogQuery = ""; // szukanie po tytule w obrębie katalogu
let catalogSort = "recent"; // recent | rating | title | year
let statsOpen = false; // czy panel statystyk katalogu jest rozwinięty

// Enum typu w bazie (WIELKIE) → klucz i18n etykiety (te same, których używa pasek typów).
const CATALOG_TYPE_LABEL = {
  FILM: "typeFilm",
  SERIAL: "typeSerial",
  KSIAZKA: "typeBook",
  MANGA: "typeManga",
  ANIME: "typeAnime",
  MUZYKA: "typeMusic",
  GRA: "typeGame",
};

async function loadCatalog() {
  allMedia = await api("/media"); // pełna lista — potrzebna tylko do znajdowania mediaId
  // Katalog pokazuje WYŁĄCZNIE Twoje ocenione tytuły (nie cudze).
  catalogItems = myProfile.reviews.map((r) => ({
    ...r.media,
    myRating: r.rating,
    status: r.status, // IN_PROGRESS | DONE — zakładki „W trakcie" / „Ukończone"
    addedAt: r.createdAt, // do statystyk „w tym roku" (sort „ostatnio" to kolejność z API)
  }));
  // Katalog jest widoczny, gdy masz cokolwiek: oceny LUB tytuły w planie (watchlista).
  const hasAny = catalogItems.length > 0 || (myProfile.watchlist?.length ?? 0) > 0;
  $("catalogTools").classList.toggle("hidden", !hasAny);
  $("catalogStatusTabs").classList.toggle("hidden", !hasAny);
  renderCatalogStatusTabs();
  renderCatalogTypes();
  renderCatalogFilter();
  renderCatalog();
  if (statsOpen) renderStats(); // panel otwarty (np. po zmianie języka) — przelicz na nowo
}

// Lista katalogu dla wybranej zakładki statusu (przed filtrem typu/gatunku/frazy).
// „Plan" to watchlista (tytuły nieocenione), reszta to Twoje oceny wg statusu.
function baseCatalog() {
  if (catalogStatus === "plan") {
    return (myProfile.watchlist ?? []).map((w) => ({ ...w.media, plan: true }));
  }
  if (catalogStatus === "in_progress") {
    return catalogItems.filter((m) => m.status === "IN_PROGRESS");
  }
  if (catalogStatus === "done") {
    return catalogItems.filter((m) => m.status === "DONE");
  }
  return catalogItems; // "all"
}

// Zakładki statusu nad katalogiem: Wszystkie / Plan / W trakcie / Ukończone.
const CATALOG_STATUS_TABS = [
  ["all", "allGenres"], // „Wszystkie" — ten sam napis co przy gatunkach
  ["plan", "statusPlan"],
  ["in_progress", "statusInProgress"],
  ["done", "statusDone"],
];
function renderCatalogStatusTabs() {
  const box = $("catalogStatusTabs");
  box.innerHTML = "";
  for (const [value, key] of CATALOG_STATUS_TABS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "genre-chip filter" + (catalogStatus === value ? " active" : "");
    b.textContent = t(key);
    b.addEventListener("click", () => {
      if (catalogStatus === value) return; // zakładki nie „odklikujemy" do niczego
      catalogStatus = value;
      // Zmiana zakładki zeruje filtry typu/gatunku — inaczej wybór z innej zakładki
      // mógłby dać pusty widok (np. gatunek, którego nie ma w planie).
      catalogType = null;
      catalogGenre = null;
      renderCatalogStatusTabs();
      renderCatalogTypes();
      renderCatalogFilter();
      renderCatalog();
    });
    box.append(b);
  }
}

/**
 * Sortuje katalog wg wybranego kryterium. Zwraca KOPIĘ — „recent" opiera się na
 * oryginalnej kolejności z API (recenzje przychodzą po createdAt malejąco), więc
 * przestawienie catalogItems w miejscu bezpowrotnie zgubiłoby to uszeregowanie.
 * Tytuł jest wszędzie ostatnim kryterium, żeby remisy nie układały się losowo.
 */
function sortCatalog(items) {
  const tytul = (m) => m.title ?? "";
  const out = [...items];
  if (catalogSort === "rating") {
    out.sort(
      (a, b) => (b.myRating ?? 0) - (a.myRating ?? 0) || tytul(a).localeCompare(tytul(b)),
    );
  } else if (catalogSort === "title") {
    out.sort((a, b) => tytul(a).localeCompare(tytul(b)));
  } else if (catalogSort === "year") {
    // Tytuły bez roku na koniec (0), zamiast mieszać się między datowane.
    out.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || tytul(a).localeCompare(tytul(b)));
  }
  return out; // "recent" = kolejność z API, bez ruszania
}

/** Katalog po nałożeniu gatunku i frazy, w wybranej kolejności. */
function visibleCatalog() {
  const q = catalogQuery.trim().toLowerCase();
  let items = baseCatalog();
  if (catalogType) items = items.filter((m) => m.type === catalogType);
  if (catalogGenre) items = items.filter((m) => (m.genres ?? []).includes(catalogGenre));
  if (q) items = items.filter((m) => (m.title ?? "").toLowerCase().includes(q));
  return sortCatalog(items);
}

// Etykieta odznaki statusu na karcie: „Plan"/„W trakcie". Ukończone bez odznaki —
// gwiazdka z oceną wystarcza, a badge na każdej karcie tylko zaśmiecałby siatkę.
function statusLabelFor(m) {
  if (m.plan) return t("statusPlan");
  if (m.status === "IN_PROGRESS") return t("statusInProgress");
  return null;
}

// Filtruje katalog (status + typ + gatunek + fraza), sortuje i rysuje siatkę.
function renderCatalog() {
  const items = visibleCatalog();
  renderGrid(
    $("catalog"),
    items,
    (m) => openDetail(toDetail(m, m.type, m.id, m.myRating)),
    (m) => ({ score: m.plan ? undefined : m.myRating, statusLabel: statusLabelFor(m) }),
  );
  // Komunikat tylko wtedy, gdy to FILTRY/zakładka wyczyściły widok — przy zupełnie
  // pustym katalogu „nic nie pasuje" byłoby mylące, bo nie ma jeszcze czego szukać.
  const hasAny = catalogItems.length > 0 || (myProfile.watchlist?.length ?? 0) > 0;
  $("catalogEmpty").classList.toggle("hidden", items.length > 0 || !hasAny);
}

// Chipy gatunków nad katalogiem (tylko gdy są min. 2 różne gatunki w bieżącej zakładce).
function renderCatalogFilter() {
  const box = $("catalogGenres");
  box.innerHTML = "";
  const genres = [...new Set(baseCatalog().flatMap((m) => m.genres ?? []))].sort();
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

// Chipy typu medium nad katalogiem (tylko gdy są min. 2 różne typy). Ten sam wzorzec
// co gatunki, ale filtruje po polu `type` (enum bazy). Kolejność jak w pasku wyszukiwania.
const CATALOG_TYPE_ORDER = [
  "FILM",
  "SERIAL",
  "KSIAZKA",
  "MANGA",
  "ANIME",
  "MUZYKA",
  "GRA",
];
function renderCatalogTypes() {
  const box = $("catalogTypes");
  box.innerHTML = "";
  const present = new Set(baseCatalog().map((m) => m.type));
  if (present.size < 2) return;
  const types = CATALOG_TYPE_ORDER.filter((ty) => present.has(ty));

  const chip = (label, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "genre-chip filter" + (catalogType === value ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      catalogType = catalogType === value ? null : value;
      renderCatalogTypes();
      renderCatalog();
    });
    return b;
  };
  box.append(chip(t("allGenres"), null));
  for (const ty of types) box.append(chip(t(CATALOG_TYPE_LABEL[ty] ?? ty), ty));
}

// „Zaskocz mnie" — losuje jeden tytuł z aktualnie widocznych (po filtrach); gdy filtry
// nic nie zostawiły, losuje z całego katalogu. Otwiera od razu jego szczegóły.
function surpriseMe() {
  const pool = visibleCatalog();
  const src = pool.length ? pool : catalogItems;
  if (!src.length) return;
  const m = src[Math.floor(Math.random() * src.length)];
  openDetail(toDetail(m, m.type, m.id, m.myRating));
}

// Rozwija/zwija mini-dashboard statystyk katalogu.
function toggleStats() {
  statsOpen = !statsOpen;
  $("catalogStats").classList.toggle("hidden", !statsOpen);
  if (statsOpen) renderStats();
}

// Mini-dashboard: liczba pozycji, rozbicie na typy, top gatunki i rozkład ocen.
// Liczone po stronie klienta z catalogItems (te same dane, co katalog).
function renderStats() {
  const box = $("catalogStats");
  const items = catalogItems;
  if (!items.length) {
    box.innerHTML = "";
    return;
  }
  const bar = (name, val, max) => {
    const pct = max > 0 ? Math.round((val / max) * 100) : 0;
    const row = document.createElement("div");
    row.className = "taste-bar";
    const nm = document.createElement("span");
    nm.className = "taste-bar-name";
    nm.textContent = name;
    const track = document.createElement("span");
    track.className = "taste-bar-track";
    const fill = document.createElement("span");
    fill.className = "taste-bar-fill";
    fill.style.width = `${pct}%`;
    track.append(fill);
    const v = document.createElement("span");
    v.className = "taste-bar-val";
    v.textContent = String(val);
    row.append(nm, track, v);
    return row;
  };
  const section = (label, rows) => {
    if (!rows.length) return;
    const h = document.createElement("div");
    h.className = "taste-sec-label";
    h.textContent = label;
    box.append(h);
    for (const r of rows) box.append(r);
  };

  box.innerHTML = "";
  const thisYear = new Date().getFullYear();
  const inYear = items.filter(
    (m) => m.addedAt && new Date(m.addedAt).getFullYear() === thisYear,
  ).length;
  const head = document.createElement("p");
  head.className = "taste-highlight stat-head";
  head.textContent = `${t("statTotal")}: ${items.length} · ${t("statThisYear")}: ${inYear}`;
  box.append(head);

  // Typy mediów.
  const byType = new Map();
  for (const m of items) byType.set(m.type, (byType.get(m.type) ?? 0) + 1);
  const typeRows = CATALOG_TYPE_ORDER.filter((ty) => byType.has(ty));
  const typeMax = Math.max(...typeRows.map((ty) => byType.get(ty)), 1);
  section(
    t("topTypes"),
    typeRows.map((ty) => bar(t(CATALOG_TYPE_LABEL[ty] ?? ty), byType.get(ty), typeMax)),
  );

  // Top gatunki (6).
  const byGenre = new Map();
  for (const m of items)
    for (const g of m.genres ?? []) byGenre.set(g, (byGenre.get(g) ?? 0) + 1);
  const genreTop = [...byGenre.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6);
  const genreMax = genreTop.length ? genreTop[0][1] : 1;
  section(
    t("topGenres"),
    genreTop.map(([g, n]) => bar(g, n, genreMax)),
  );

  // Rozkład ocen — kubełki po 2 (1–2 … 9–10).
  const buckets = [
    ["9–10", 9, 10],
    ["7–8", 7, 8.5],
    ["5–6", 5, 6.5],
    ["3–4", 3, 4.5],
    ["1–2", 0.5, 2.5],
  ];
  const rated = items.filter((m) => typeof m.myRating === "number");
  const bucketMax = Math.max(
    ...buckets.map(
      ([, lo, hi]) => rated.filter((m) => m.myRating >= lo && m.myRating <= hi).length,
    ),
    1,
  );
  section(
    t("statRatings"),
    buckets.map(([lbl, lo, hi]) =>
      bar(
        `★ ${lbl}`,
        rated.filter((m) => m.myRating >= lo && m.myRating <= hi).length,
        bucketMax,
      ),
    ),
  );
}

// Udostępnianie profilu: kopiuje deep-link do własnego profilu (tryb read-only u odbiorcy).
async function copyProfileLink() {
  if (!me) return;
  const url = `${location.origin}/?profile=${me.id}`;
  try {
    await navigator.clipboard.writeText(url);
    toast(t("shareCopied"));
  } catch {
    // clipboard bywa blokowany (brak HTTPS/uprawnień) — pokaż link do ręcznego skopiowania.
    prompt(t("shareCopied"), url);
  }
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

// Filtry/sortowanie wyników wyszukiwania (po stronie klienta, na ~18 zwróconych).
let searchResults = [];
let searchSort = "relevance"; // relevance | rating | year | title
let searchMinRating = 0;
let searchMinYear = 0;
// Rodzaje, których wyniki NIOSĄ ocenę źródła (książki/muzyka jej nie mają).
const SEARCH_HAS_RATING = new Set(["film", "serial", "anime", "manga", "game"]);

async function runSearch(q) {
  $("searchTitle").textContent = t("results");
  const grid = $("searchGrid");
  grid.innerHTML = `<p class="muted">${t("searching")}</p>`;
  showResults();
  try {
    searchResults = await api(`/search?q=${encodeURIComponent(q)}&type=${searchType}`);
    renderSearchTools();
    renderSearchResults();
  } catch (e) {
    searchResults = [];
    $("searchTools").classList.add("hidden");
    grid.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// Pokazuje pasek filtrów, gdy są wyniki; wyłącza filtr/sort po ocenie dla rodzajów
// bez ocen (książki/muzyka), żeby „8+" nie wycinało wszystkiego.
function renderSearchTools() {
  $("searchTools").classList.toggle("hidden", searchResults.length === 0);
  const hasRating = SEARCH_HAS_RATING.has(searchType);
  const mr = $("searchMinRating");
  mr.disabled = !hasRating;
  if (!hasRating) {
    mr.value = "0";
    searchMinRating = 0;
  }
  const sortSel = $("searchSort");
  sortSel.querySelector('option[value="rating"]').disabled = !hasRating;
  if (!hasRating && searchSort === "rating") {
    searchSort = "relevance";
    sortSel.value = "relevance";
  }
}

// Nakłada filtry (ocena/rok) i sortowanie na wyniki, rysuje siatkę. „Trafność" =
// kolejność z API. Odznaka gwiazdki na karcie to ocena ŹRÓDŁA (nie Twoja).
function renderSearchResults() {
  let items = searchResults;
  if (searchMinRating) items = items.filter((m) => (m.rating ?? 0) >= searchMinRating);
  if (searchMinYear) items = items.filter((m) => (m.year ?? 0) >= searchMinYear);
  items = [...items];
  const title = (m) => m.title ?? "";
  if (searchSort === "rating") {
    items.sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || title(a).localeCompare(title(b)),
    );
  } else if (searchSort === "year") {
    items.sort(
      (a, b) => (b.year ?? 0) - (a.year ?? 0) || title(a).localeCompare(title(b)),
    );
  } else if (searchSort === "title") {
    items.sort((a, b) => title(a).localeCompare(title(b)));
  }
  renderGrid(
    $("searchGrid"),
    items,
    (m) => openDetail(toDetail(m, searchType, null)),
    (m) => ({ score: m.rating ?? undefined }),
  );
}

// Przełącznik źródła wyszukiwania: filmy (TMDB) / książki (Open Library).
function setSearchType(type) {
  if (searchType === type) return;
  searchType = type;
  $("typeFilm").classList.toggle("active", type === "film");
  $("typeSerial").classList.toggle("active", type === "serial");
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
  serial: "catSerial",
  anime: "catAnime",
  manga: "catManga",
  game: "catGame",
  book: "catBook",
  music: "catMusic",
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
const DISCOVERABLE_KEYS = ["film", "serial", "anime", "manga", "game", "book", "music"];

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
// Rozmiar strony discovery — zgodny z DEFAULT_DISCOVER_LIMIT po stronie backendu.
// Gdy backend zwróci pełną stronę, zakładamy, że może być więcej → pokazujemy „Pokaż więcej".
const TASTE_PAGE = 24;
let tasteShown = 0; // ile kart „Pod Twój gust" już wisi (= offset kolejnej strony)

function appendTasteCards(recs) {
  const row = $("tasteRecs");
  for (const r of recs) {
    const { card } = posterCard(r, {
      score: r.score,
      recby: tasteReasonLabel(r.reason, r),
    });
    card.addEventListener("click", () => openDetail(toDetail(r, r.type, null)));
    row.append(card);
  }
  tasteShown += recs.length;
}

async function loadTasteRecommendations() {
  const row = $("tasteRecs");
  const moreBtn = $("tasteMore");
  moreBtn.classList.add("hidden");
  tasteShown = 0;
  if (!DISCOVERABLE_KEYS.includes(searchType)) {
    row.innerHTML = `<p class="muted">${t("noDiscoverForType")}</p>`;
    return;
  }
  row.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    const recs = await api(`/me/discover?type=${encodeURIComponent(searchType)}`);
    row.innerHTML = "";
    if (recs.length === 0) {
      row.innerHTML = `<p class="muted">${t("noTasteRecsType")}</p>`;
      return;
    }
    appendTasteCards(recs);
    moreBtn.classList.toggle("hidden", recs.length < TASTE_PAGE);
  } catch (e) {
    row.innerHTML = `<p class="muted">${e.message}</p>`;
  }
}

// „Pokaż więcej" — dokłada kolejną stronę z tej samej puli (offset = ile już widać).
async function loadMoreTasteRecs() {
  const moreBtn = $("tasteMore");
  moreBtn.disabled = true;
  try {
    const recs = await api(
      `/me/discover?type=${encodeURIComponent(searchType)}&offset=${tasteShown}`,
    );
    appendTasteCards(recs);
    moreBtn.classList.toggle("hidden", recs.length < TASTE_PAGE);
  } catch (e) {
    toast(e.message);
  } finally {
    moreBtn.disabled = false;
  }
}

// Cache danych zalogowanego usera (oceny + lista) — używany na profilu i w detalu.
let myProfile = { user: null, reviews: [], watchlist: [] };
async function loadMe() {
  myProfile = await api("/me");
  return myProfile;
}

// Grupy kategorii na prawej stronie profilu.
// Etykiety przez klucz i18n, nie gotowym tekstem — inaczej nazwy kategorii zostawały
// polskie po przełączeniu języka (labelKey czyta się przez t() dopiero przy renderze).
const CAT_GROUPS = [
  { key: "music", labelKey: "shelfMusic", types: ["MUZYKA"] },
  { key: "film", labelKey: "shelfFilm", types: ["FILM", "SERIAL"] },
  { key: "anime", labelKey: "shelfAnime", types: ["ANIME"] },
  { key: "book", labelKey: "shelfBook", types: ["KSIAZKA", "MANGA"] },
  { key: "game", labelKey: "shelfGame", types: ["GRA"] },
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

// „Nie wybrałem nic" (brak klucza) to co innego niż „wybrałem, żeby nie było nic"
// (pusta lista). Bez tego rozróżnienia odznaczenie ostatniej okładki kasowało wybór
// i rząd wracał do domyślnych czterech — czyli usunięcie okładki ją przywracało.
function hasFeatured(catKey) {
  return Array.isArray(getFeaturedMap()[catKey]);
}

function setFeatured(catKey, ids) {
  const m = getFeaturedMap();
  m[catKey] = ids; // także pustą listę — to świadomy wybór użytkownika
  localStorage.setItem(FEATURED_KEY, JSON.stringify(m));
}

// Które pozycje pokazać w kategorii: wybrane okładki albo pierwsze MAX_COVERS.
// Ids nieistniejących już pozycji (skasowana ocena) wypadają przez filter.
function displayedForCat(g, items) {
  if (!hasFeatured(g.key)) return items.slice(0, MAX_COVERS);
  const byId = new Map(items.map((r) => [r.media.id, r]));
  return getFeatured(g.key)
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, MAX_COVERS);
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
    onClick ??
      (() => openDetail(toDetail(media, media.type, media.id, myRatingFor(media.id)))),
  );
  container.append(card);
}

// Nakładka „Zobacz wszystko" — pełna siatka pozycji danej sekcji/kategorii.
// items: lista rekordów {media, rating} (recenzje) lub {media} (watchlista).
function openSeeAll(title, items) {
  $("seeAllTitle").textContent = title;
  const grid = $("seeAllGrid");
  $("seeAllWrap").classList.remove("hidden"); // wracamy z trybu „Co obejrzeć razem"
  $("togetherWrap").classList.add("hidden");
  grid.innerHTML = "";
  for (const it of items) {
    const media = it.media;
    const rating = it.rating;
    appendCard(grid, media, rating, () => {
      closeSeeAll();
      openDetail(toDetail(media, media.type, media.id, myRatingFor(media.id)));
    });
  }
  $("seeAllOverlay").classList.remove("hidden");
}

function closeSeeAll() {
  $("seeAllOverlay").classList.add("hidden");
}

// --- Własne listy/kolekcje ---

// Sekcja list na profilu. Własny profil = zarządzanie (dodaj/publikuj/usuń);
// cudzy (readOnly) = tylko listy publiczne, bez kontrolek.
function renderLists(lists, readOnly) {
  $("listsHeading").textContent = t(readOnly ? "listsTitle" : "myLists");
  $("newListBtn").classList.toggle("hidden", readOnly);
  const box = $("listsBox");
  box.innerHTML = "";
  if (!lists || !lists.length) {
    box.innerHTML = `<p class="muted">${t(readOnly ? "listsEmptyRO" : "listsEmpty")}</p>`;
    return;
  }
  for (const list of lists) {
    const block = document.createElement("div");
    block.className = "list-block";

    const head = document.createElement("div");
    head.className = "list-head";
    const title = document.createElement("button");
    title.type = "button";
    title.className = "list-title";
    title.textContent = `${list.name} · ${list.items.length}`;
    title.addEventListener("click", () => openSeeAll(list.name, list.items));
    head.append(title);
    if (!readOnly) {
      const pub = document.createElement("button");
      pub.type = "button";
      pub.className = "list-mini";
      pub.textContent = list.isPublic ? "🌐" : "🔒";
      pub.addEventListener("click", () => toggleListPublic(list));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "list-mini danger";
      del.textContent = "🗑";
      del.addEventListener("click", () => deleteList(list));
      head.append(pub, del);
    }
    block.append(head);

    const row = document.createElement("div");
    row.className = "poster-row";
    if (!list.items.length) {
      row.innerHTML = `<p class="muted small">${t("listEmpty")}</p>`;
    } else {
      for (const it of list.items.slice(0, 10)) appendCard(row, it.media, undefined);
    }
    block.append(row);
    box.append(block);
  }
}

async function createList() {
  const name = (window.prompt(t("newListPrompt")) ?? "").trim();
  if (!name) return;
  try {
    await api("/me/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadProfile();
  } catch (e) {
    toast(e.message);
  }
}

async function toggleListPublic(list) {
  try {
    await api(`/me/lists/${list.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublic: !list.isPublic }),
    });
    await loadProfile();
  } catch (e) {
    toast(e.message);
  }
}

async function deleteList(list) {
  if (!window.confirm(t("confirmDeleteList", { name: list.name }))) return;
  try {
    await api(`/me/lists/${list.id}`, { method: "DELETE" });
    await loadProfile();
  } catch (e) {
    toast(e.message);
  }
}

// Wybór list dla bieżącego tytułu (z widoku szczegółów). Tytuł zewnętrzny (z wyników
// wyszukiwania) najpierw musi trafić do bazy — stąd ensureMedia jak przy watchliście.
let pickerMediaId = null;
async function openListPicker() {
  try {
    pickerMediaId = await ensureMedia();
  } catch (e) {
    toast(e.message);
    return;
  }
  $("newListInput").value = "";
  renderListPicker();
  $("listPickerOverlay").classList.remove("hidden");
}
function closeListPicker() {
  $("listPickerOverlay").classList.add("hidden");
}
function renderListPicker() {
  const box = $("listPickerBody");
  box.innerHTML = "";
  const lists = myProfile.lists ?? [];
  if (!lists.length) {
    box.innerHTML = `<p class="muted small">${t("noListsYet")}</p>`;
    return;
  }
  for (const list of lists) {
    const inList = list.items.some((it) => it.media.id === pickerMediaId);
    const row = document.createElement("label");
    row.className = "list-pick-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = inList;
    cb.addEventListener("change", () => toggleListMembership(list.id, cb.checked));
    const span = document.createElement("span");
    span.textContent = list.name;
    row.append(cb, span);
    box.append(row);
  }
}
async function toggleListMembership(listId, add) {
  try {
    if (add) {
      await api(`/me/lists/${listId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaId: pickerMediaId }),
      });
    } else {
      await api(`/me/lists/${listId}/items/${pickerMediaId}`, { method: "DELETE" });
    }
    await loadMe();
    renderListPicker();
    // Odśwież sekcję na własnym profilu, jeśli jest otwarty.
    if (!$("profileView").classList.contains("hidden") && !viewingUserId) {
      renderLists(myProfile.lists, false);
    }
    toast(t(add ? "addedToList" : "removedFromList"));
  } catch (e) {
    toast(e.message);
    renderListPicker(); // cofnij wizualny stan checkboxa po błędzie
  }
}
async function createListFromPicker() {
  const name = $("newListInput").value.trim();
  if (!name) return;
  try {
    const list = await api("/me/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (pickerMediaId) {
      await api(`/me/lists/${list.id}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaId: pickerMediaId }),
      });
    }
    $("newListInput").value = "";
    await loadMe();
    renderListPicker();
    toast(t("listCreated"));
  } catch (e) {
    toast(e.message);
  }
}

// --- Osiągnięcia (~100 odznak) — liczone z ocen/znajomych/gatunków, bez bazy. ---
// Generowane z kategorii × progów (tiers). Zdobyte, gdy cur(stats) >= goal.
// Kategorie typu mediów mają `label` (podmiot do „{n} × {co}"); reszta wpisuje go w opis.
// prettier-ignore
const ACH_CATEGORIES = [
  { icon: "🏅", desc: "achReqTotal", cur: (s) => s.total, tiers: [1, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300, 500] },
  { icon: "🍿", label: "achLblFilm", desc: "achReqRate", cur: (s) => s.byType.FILM ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "📺", label: "achLblSerial", desc: "achReqRate", cur: (s) => s.byType.SERIAL ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "📖", label: "achLblBook", desc: "achReqRate", cur: (s) => s.byType.KSIAZKA ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "🎮", label: "achLblGame", desc: "achReqRate", cur: (s) => s.byType.GRA ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "🌸", label: "achLblAnime", desc: "achReqRate", cur: (s) => s.byType.ANIME ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "📗", label: "achLblManga", desc: "achReqRate", cur: (s) => s.byType.MANGA ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "🎵", label: "achLblMusic", desc: "achReqRate", cur: (s) => s.byType.MUZYKA ?? 0, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "✍️", desc: "achReqText", cur: (s) => s.withText, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "⭐", desc: "achReqPerfect", cur: (s) => s.perfect, tiers: [1, 5, 10, 25, 50] },
  { icon: "📌", desc: "achReqFav", cur: (s) => s.favorites, tiers: [1, 4, 8, 12, 16, 20] },
  { icon: "🤝", desc: "achReqFollowers", cur: (s) => s.followers, tiers: [1, 5, 10, 25, 50, 100] },
  { icon: "👀", desc: "achReqFollowing", cur: (s) => s.following, tiers: [1, 5, 10, 25, 50] },
  { icon: "🎭", desc: "achReqGenres", cur: (s) => s.genres, tiers: [1, 3, 5, 8, 12, 18, 25] },
  { icon: "🕰️", desc: "achReqDecades", cur: (s) => s.decades, tiers: [1, 2, 3, 5, 7] },
  { icon: "🧊", desc: "achReqHarsh", cur: (s) => s.harsh, tiers: [1, 5, 10, 25] },
  { icon: "🗂️", desc: "achReqLists", cur: (s) => s.lists, tiers: [1, 3, 5, 10] },
];
// Popkulturowy cytat odsłaniany PO zdobyciu odznaki — jeden na próg, temat pod
// kategorię (filmy → cytaty filmowe itd.), rosnąco od najbardziej kultowych.
// Kolejność i długość MUSZĄ zgadzać się z ACH_CATEGORIES (te same tiers). Celowo
// nietłumaczone — jak ksywki. Bez znaków " wewnątrz (łamałyby string).
// prettier-ignore
const ACH_QUOTES = [
  // 🏅 total — 12
  [
    "„Każda podróż zaczyna się od jednego kroku.” — Laozi",
    "„Just keep swimming.” — Gdzie jest Nemo",
    "„To infinity… and beyond!” — Toy Story",
    "„I love the smell of napalm in the morning.” — Czas apokalipsy",
    "„Say hello to my little friend!” — Scarface",
    "„Carpe diem. Chwytaj dzień.” — Stowarzyszenie Umarłych Poetów",
    "„Life moves pretty fast…” — Wolny dzień Ferrisa Buellera",
    "„Elementary, my dear Watson.” — Sherlock Holmes",
    "„Houston, we have a problem.” — Apollo 13",
    "„They may take our lives, but they'll never take our freedom!” — Braveheart",
    "„I'll be back.” — Terminator",
    "„What we do in life echoes in eternity.” — Gladiator",
  ],
  // 🍿 FILM — 6. Bond ma {name} — podstawiamy imię użytkownika przy wyświetlaniu.
  [
    "„You either die a hero, or live long enough to see yourself become the villain.” — Mroczny Rycerz",
    "„Every man dies. Not every man really lives.” — Braveheart",
    "„Welcome to the real world.” — Matrix",
    "„This is your life, and it's ending one minute at a time.” — Fight Club",
    "„The name's Bond. {name} Bond.” — James Bond",
    "„The path of the righteous man is beset on all sides…” — Pulp Fiction",
  ],
  // 📺 SERIAL — 6
  [
    "„Winter is coming.” — Gra o tron",
    "„How you doin'?” — Przyjaciele",
    "„That's what she said.” — The Office",
    "„Say my name.” — Breaking Bad",
    "„I am the one who knocks.” — Breaking Bad",
    "„Valar morghulis. Wszyscy ludzie muszą umrzeć.” — Gra o tron",
  ],
  // 📖 KSIAZKA — 6
  [
    "„Not all those who wander are lost.” — Władca Pierścieni",
    "„Big Brother is watching you.” — Rok 1984",
    "„Fear is the mind-killer.” — Diuna",
    "„So it goes.” — Rzeźnia numer pięć",
    "„It was the best of times, it was the worst of times.” — Opowieść o dwóch miastach",
    "„Whatever our souls are made of, his and mine are the same.” — Wichrowe Wzgórza",
  ],
  // 🎮 GRA — 6
  [
    "„It's dangerous to go alone! Take this.” — The Legend of Zelda",
    "„The cake is a lie.” — Portal",
    "„Finish him!” — Mortal Kombat",
    "„Snake? Snake?! SNAAAKE!” — Metal Gear Solid",
    "„Seven minutes. Seven minutes is all I can spare to play with you.” — Albert Wesker (Resident Evil 5)",
    "„Never f*ck with {name} Kitsuragi.” — Disco Elysium (Kim Kitsuragi)",
  ],
  // 🌸 ANIME — 6 (JoJo i Hokuto no Ken zostają na progach 5 i 50)
  [
    "„Those who do not understand true pain can never understand true peace.” — Pain (Naruto Shippuden)",
    "„Yare yare daze.” — JoJo's Bizarre Adventure",
    "„A lesson without pain is meaningless.” — Edward Elric",
    "„I am Kira.” — Death Note",
    "„Omae wa mou shindeiru. — Nani?!” — Hokuto no Ken",
    "„If the truth is cruel, then a lie must be kind. That’s why kindness is a lie.” — Hachiman Hikigaya",
  ],
  // 📗 MANGA — 6
  [
    "„What's wrong isn't me. What's wrong is the world.” — Kaneki Ken (Tokyo Ghoul)",
    "„The thing I fear most is losing myself.” — Guts (Berserk)",
    "„I have no enemies. Nobody in this whole world is my enemy.” — Thorfinn (Vinland Saga)",
    "„To be invincible means to be able to defeat yourself.” — Miyamoto Musashi (Vagabond)",
    "„My heart and actions are utterly unclouded. They are all those of 'justice'.” — Funny Valentine (JoJo SBR)",
    "„The reason I am killing you is simple. It's because you aimed your blade at my only pride.” — Byakuya Kuchiki (Bleach)",
  ],
  // 🎵 MUZYKA — 6 (teksty piosenek celowo w oryginale)
  [
    "„Is this the real life? Is this just fantasy?” — Queen, Bohemian Rhapsody",
    "„All you need is love.” — The Beatles",
    "„Hello darkness, my old friend.” — Simon & Garfunkel",
    "„We will, we will rock you.” — Queen",
    "„And now, the end is near…” — Frank Sinatra, My Way",
    "„Imagine all the people living life in peace.” — John Lennon, Imagine",
  ],
  // ✍️ text — 6
  [
    "„The pen is mightier than the sword.” — Edward Bulwer-Lytton",
    "„There is no greater agony than bearing an untold story inside you.” — Maya Angelou",
    "„Fill your paper with the breathings of your heart.” — William Wordsworth",
    "„You can make anything by writing.” — C.S. Lewis",
    "„Write drunk, edit sober.” — (przyp. Hemingwayowi)",
    "„A word after a word after a word is power.” — Margaret Atwood",
  ],
  // ⭐ perfect — 5
  [
    "„Nobody's perfect.” — Pół żartem, pół serio",
    "„Chase perfection and we can catch excellence.” — Vince Lombardi",
    "„If you look for perfection, you'll never be content.” — Lew Tołstoj",
    "„Have no fear of perfection — you'll never reach it.” — Salvador Dalí",
    "„Ars longa, vita brevis.” — Hipokrates",
  ],
  // 📌 favorites — 6
  [
    "„We'll always have Paris.” — Casablanca",
    "„After all this time? Always.” — Harry Potter",
    "„To me, you are perfect.” — To właśnie miłość",
    "„You had me at hello.” — Jerry Maguire",
    "„I'm just a girl, standing in front of a boy…” — Notting Hill",
    "„Love means never having to say you're sorry.” — Love Story",
  ],
  // 🤝 followers — 6
  [
    "„With great power comes great responsibility.” — Spider-Man",
    "„Where everybody knows your name.” — Zdrówko (Cheers)",
    "„Are you not entertained?!” — Gladiator",
    "„I'm the king of the world!” — Titanic",
    "„Fame! I'm gonna live forever.” — Fame",
    "„It's gonna be legen— wait for it —dary!” — Jak poznałem waszą matkę",
  ],
  // 👀 following — 5
  [
    "„I'll be watching you.” — The Police, Every Breath You Take",
    "„I see you.” — Avatar",
    "„Keep your friends close, but your enemies closer.” — Ojciec chrzestny II",
    "„Curiouser and curiouser!” — Alicja w Krainie Czarów",
    "„The truth is out there.” — Z Archiwum X",
  ],
  // 🎭 genres — 7
  [
    "„Life is like a box of chocolates.” — Forrest Gump",
    "„Variety's the very spice of life.” — William Cowper",
    "„So many books, so little time.” — Frank Zappa",
    "„A jack of all trades, master of none.” — przysłowie",
    "„Toto, I've a feeling we're not in Kansas anymore.” — Czarnoksiężnik z Oz",
    "„Infinite diversity in infinite combinations.” — Star Trek",
    "„Why not both?” — internetowa mądrość",
  ],
  // 🕰️ decades — 5
  [
    "„Great Scott!” — Powrót do przyszłości",
    "„Roads? Where we're going, we don't need roads.” — Powrót do przyszłości",
    "„I've seen things you people wouldn't believe…” — Łowca androidów",
    "„Time is a flat circle.” — Detektyw",
    "„The past is never dead. It's not even past.” — William Faulkner",
  ],
  // 🧊 harsh — 4
  [
    "„Frankly, my dear, I don't give a damn.” — Przeminęło z wiatrem",
    "„You can't handle the truth!” — Ludzie honoru",
    "„What is this? A center for ants?” — Zoolander",
    "„Hasta la vista, baby.” — Terminator 2",
  ],
  // 🗂️ lists — 4
  [
    "„Gotta catch 'em all!” — Pokémon",
    "„A place for everything, and everything in its place.” — Isabella Beeton",
    "„My precious.” — Władca Pierścieni",
    "„I love it when a plan comes together.” — Drużyna A",
  ],
];
const ACHIEVEMENTS = ACH_CATEGORIES.flatMap((c, ci) =>
  c.tiers.map((goal, ti) => ({
    icon: c.icon,
    label: c.label,
    desc: c.desc,
    goal,
    cur: c.cur,
    quote: ACH_QUOTES[ci]?.[ti],
  })),
);

// Opis odznaki z podstawionym progiem (i podmiotem dla kategorii typu mediów).
function achLabel(a) {
  return t(a.desc, { n: a.goal, what: a.label ? t(a.label) : "" });
}

function achStats(data) {
  const reviews = data.reviews ?? [];
  const byType = {};
  const genres = new Set();
  const decades = new Set();
  let withText = 0;
  let perfect = 0;
  let harsh = 0;
  let favorites = 0;
  for (const r of reviews) {
    const ty = r.media?.type;
    if (ty) byType[ty] = (byType[ty] ?? 0) + 1;
    if (r.text) withText++;
    if (r.rating >= 10) perfect++;
    if (r.rating <= 3) harsh++;
    if (r.favorite) favorites++;
    for (const g of r.media?.genres ?? []) genres.add(g);
    const y = r.media?.year;
    if (y) decades.add(Math.floor(y / 10));
  }
  return {
    total: reviews.length,
    byType,
    withText,
    perfect,
    harsh,
    favorites,
    genres: genres.size,
    decades: decades.size,
    lists: (data.lists ?? []).length,
    followers: data.followersCount ?? 0,
    following: data.followingCount ?? 0,
  };
}

function achRow(a, name) {
  const el = document.createElement("div");
  el.className = "ach" + (a.earned ? " earned" : "");
  const ic = document.createElement("div");
  ic.className = "ach-ic";
  ic.textContent = a.icon;
  const mid = document.createElement("div");
  mid.className = "ach-mid";
  const nm = document.createElement("div");
  nm.className = "ach-name";
  nm.textContent = achLabel(a);
  mid.append(nm);
  // Cytat to nagroda — odsłaniany dopiero po zdobyciu odznaki.
  if (a.earned && a.quote) {
    const q = document.createElement("div");
    q.className = "ach-quote";
    q.textContent = personalize(trQuote(a.quote), name);
    mid.append(q);
  }
  const pr = document.createElement("div");
  pr.className = "ach-prog";
  pr.textContent = a.earned ? "✓" : `${Math.min(a.current, a.goal)}/${a.goal}`;
  el.append(ic, mid, pr);
  return el;
}

function renderAchievements(data) {
  const s = achStats(data);
  const name = data.user?.displayName;
  // Konto twórcy (isDev) ma wszystkie osiągnięcia odblokowane.
  const dev = !!data.isDev;
  const items = ACHIEVEMENTS.map((a) => {
    const current = a.cur(s);
    return { ...a, current, earned: dev || current >= a.goal };
  });
  const earned = items.filter((a) => a.earned);
  $("achievementsCount").textContent = `${earned.length}/${items.length}`;

  // Pełna lista w oknie: zdobyte (od najwyższego progu), potem niezdobyte najbliższe celu.
  const box = $("achievements");
  box.innerHTML = "";
  const ordered = [
    ...[...earned].sort((a, b) => b.goal - a.goal),
    ...items
      .filter((a) => !a.earned)
      .sort((a, b) => b.current / b.goal - a.current / a.goal),
  ];
  for (const a of ordered) box.append(achRow(a, name));
}

// --- Tytuły (do pokazania przy imieniu) = cytaty z odznak. Jeden achievement =
// jeden tytuł: zdobycie odznaki odblokowuje jej popkulturowy cytat jako noszony
// tytuł. Nazwy celowo nietłumaczone (jak ksywki). ---
const DEV_TITLE = "👑 Developer";
// Sam cytat bez atrybucji „ — Źródło" — tytuł to sam cytat. Obcinamy OSTATNI
// separator, bo część cytatów sama zawiera „ — " (np. „…shindeiru. — Nani?!").
function quoteOnly(q) {
  const i = q.lastIndexOf(" — ");
  return i === -1 ? q : q.slice(0, i);
}
// Podstawia username użytkownika w cytatach z {name} (np. tytuł „Bonda"). Wołane
// PRZY WYŚWIETLANIU — w bazie/tytule zostaje literalne {name}, żeby na cudzym
// profilu podstawić właściciela i by lookup w TITLE_BY_NAME dalej działał.
// Bierzemy część przed „@": gdy nazwa to e-mail, w cytacie ma być username, nie
// pełny adres (dla zwykłych nazw bez „@" nic to nie zmienia).
function personalize(text, name) {
  if (!text) return text;
  const uname = (name || "").split("@")[0];
  return text.replaceAll("{name}", uname);
}
// Tłumaczenia cytatów-tytułów. Klucz = KANONICZNY cytat (to, co ląduje w bazie
// jako User.title). Tu wyłącznie WYŚWIETLANIE — baza, TITLE_BY_NAME i zapis dalej
// jadą na kanonicznym, więc zmiana języka nie psuje wybranego tytułu, a cudzy tytuł
// tłumaczy się u oglądającego. Memy/okrzyki celowo pominięte → fallback do oryginału.
// Brak wpisu dla języka też → fallback. {name} zostaje (podstawiane przez personalize).
// prettier-ignore
const QUOTE_I18N = {
  "„What's wrong isn't me. What's wrong is the world.” — Kaneki Ken (Tokyo Ghoul)": {
    pl: "„To nie ze mną jest coś nie tak — to ze światem.” — Kaneki Ken (Tokyo Ghoul)",
    de: "„Nicht ich bin falsch. Es ist die Welt.” — Kaneki Ken (Tokyo Ghoul)",
    es: "„El que está mal no soy yo, sino el mundo.” — Kaneki Ken (Tokyo Ghoul)",
    pt: "„O errado não sou eu, e sim o mundo.” — Kaneki Ken (Tokyo Ghoul)",
    zh: "「错的不是我，而是这个世界。」 — Kaneki Ken (Tokyo Ghoul)",
    ja: "「間違っているのは僕じゃない。世界の方だ。」 — Kaneki Ken (Tokyo Ghoul)",
  },
  "„The thing I fear most is losing myself.” — Guts (Berserk)": {
    pl: "„Najbardziej boję się utraty samego siebie.” — Guts (Berserk)",
    de: "„Was ich am meisten fürchte, ist es, mich selbst zu verlieren.” — Guts (Berserk)",
    es: "„Lo que más temo es perderme a mí mismo.” — Guts (Berserk)",
    pt: "„O que mais temo é perder a mim mesmo.” — Guts (Berserk)",
    zh: "「我最害怕的，是失去自己。」 — Guts (Berserk)",
    ja: "「俺が最も恐れているのは、自分を見失うことだ。」 — Guts (Berserk)",
  },
  "„I have no enemies. Nobody in this whole world is my enemy.” — Thorfinn (Vinland Saga)": {
    pl: "„Nie mam wrogów. Nikt na całym świecie nie jest moim wrogiem.” — Thorfinn (Vinland Saga)",
    de: "„Ich habe keine Feinde. Niemand auf der ganzen Welt ist mein Feind.” — Thorfinn (Vinland Saga)",
    es: "„No tengo enemigos. Nadie en todo el mundo es mi enemigo.” — Thorfinn (Vinland Saga)",
    pt: "„Não tenho inimigos. Ninguém no mundo inteiro é meu inimigo.” — Thorfinn (Vinland Saga)",
    zh: "「我没有敌人。这世上没有一个人是我的敌人。」 — Thorfinn (Vinland Saga)",
    ja: "「俺に敵はいない。この世界の誰一人、俺の敵じゃない。」 — Thorfinn (Vinland Saga)",
  },
  "„To be invincible means to be able to defeat yourself.” — Miyamoto Musashi (Vagabond)": {
    pl: "„Być niepokonanym to umieć pokonać samego siebie.” — Miyamoto Musashi (Vagabond)",
    de: "„Unbesiegbar zu sein heißt, sich selbst besiegen zu können.” — Miyamoto Musashi (Vagabond)",
    es: "„Ser invencible significa ser capaz de vencerte a ti mismo.” — Miyamoto Musashi (Vagabond)",
    pt: "„Ser invencível é ser capaz de vencer a si mesmo.” — Miyamoto Musashi (Vagabond)",
    zh: "「所谓无敌，就是能够战胜自己。」 — Miyamoto Musashi (Vagabond)",
    ja: "「無敵とは、己に勝てるということだ。」 — Miyamoto Musashi (Vagabond)",
  },
  "„My heart and actions are utterly unclouded. They are all those of 'justice'.” — Funny Valentine (JoJo SBR)": {
    pl: "„Moje serce i czyny są całkowicie czyste. Wszystkie służą sprawiedliwości.” — Funny Valentine (JoJo SBR)",
    de: "„Mein Herz und meine Taten sind völlig klar. Sie alle dienen der Gerechtigkeit.” — Funny Valentine (JoJo SBR)",
    es: "„Mi corazón y mis actos están del todo despejados. Todos son los de la justicia.” — Funny Valentine (JoJo SBR)",
    pt: "„Meu coração e meus atos são absolutamente límpidos. Todos são os da justiça.” — Funny Valentine (JoJo SBR)",
    zh: "「我的心与行动毫无阴霾，皆是『正义』之举。」 — Funny Valentine (JoJo SBR)",
    ja: "「私の心と行動には一点の曇りもない。すべては『正義』のためだ。」 — Funny Valentine (JoJo SBR)",
  },
  "„The reason I am killing you is simple. It's because you aimed your blade at my only pride.” — Byakuya Kuchiki (Bleach)": {
    pl: "„Powód, dla którego cię zabijam, jest prosty: wycelowałeś ostrze w moją jedyną dumę.” — Byakuya Kuchiki (Bleach)",
    de: "„Der Grund, warum ich dich töte, ist einfach: Du hast deine Klinge gegen meinen einzigen Stolz gerichtet.” — Byakuya Kuchiki (Bleach)",
    es: "„La razón por la que te mato es simple: apuntaste tu espada a mi único orgullo.” — Byakuya Kuchiki (Bleach)",
    pt: "„A razão pela qual vou te matar é simples: você apontou sua lâmina para o meu único orgulho.” — Byakuya Kuchiki (Bleach)",
    zh: "「我杀你的理由很简单——因为你将刀刃指向了我唯一的骄傲。」 — Byakuya Kuchiki (Bleach)",
    ja: "「お前を斬る理由は単純だ。お前が、私の唯一の誇りに刃を向けたからだ。」 — Byakuya Kuchiki (Bleach)",
  },
  "„Seven minutes. Seven minutes is all I can spare to play with you.” — Albert Wesker (Resident Evil 5)": {
    pl: "„Siedem minut. Tylko tyle mogę poświęcić na zabawę z tobą.” — Albert Wesker (Resident Evil 5)",
    de: "„Sieben Minuten. Mehr Zeit kann ich nicht erübrigen, um mit dir zu spielen.” — Albert Wesker (Resident Evil 5)",
    es: "„Siete minutos. Es todo el tiempo que puedo dedicar a jugar contigo.” — Albert Wesker (Resident Evil 5)",
    pt: "„Sete minutos. É todo o tempo que posso gastar brincando com você.” — Albert Wesker (Resident Evil 5)",
    zh: "「七分钟。我只能抽出七分钟来陪你玩。」 — Albert Wesker (Resident Evil 5)",
    ja: "「7分だ。お前と遊んでやれるのは、たった7分だけだ。」 — Albert Wesker (Resident Evil 5)",
  },
  "„Never f*ck with {name} Kitsuragi.” — Disco Elysium (Kim Kitsuragi)": {
    pl: "„Nigdy nie zadzieraj z {name} Kitsuragi.” — Disco Elysium (Kim Kitsuragi)",
    de: "„Leg dich niemals mit {name} Kitsuragi an.” — Disco Elysium (Kim Kitsuragi)",
    es: "„Nunca te metas con {name} Kitsuragi.” — Disco Elysium (Kim Kitsuragi)",
    pt: "„Nunca mexa com {name} Kitsuragi.” — Disco Elysium (Kim Kitsuragi)",
    zh: "「永远别惹 {name} Kitsuragi。」 — Disco Elysium (Kim Kitsuragi)",
    ja: "「{name}・キツラギに手を出すな。」 — Disco Elysium (Kim Kitsuragi)",
  },
  "„Każda podróż zaczyna się od jednego kroku.” — Laozi": {
    en: "„A journey of a thousand miles begins with a single step.” — Laozi",
    de: "„Eine Reise von tausend Meilen beginnt mit einem einzigen Schritt.” — Laozi",
    es: "„Un viaje de mil millas comienza con un solo paso.” — Laozi",
    pt: "„Uma jornada de mil milhas começa com um único passo.” — Laozi",
    zh: "「千里之行，始于足下。」 — 老子",
    ja: "「千里の道も一歩から。」 — 老子",
  },
  "„Just keep swimming.” — Gdzie jest Nemo": {
    pl: "„Po prostu płyń.” — Gdzie jest Nemo",
    en: "„Just keep swimming.” — Finding Nemo",
    de: "„Einfach schwimmen.” — Findet Nemo",
    es: "„Sigue nadando.” — Buscando a Nemo",
    pt: "„Continue nadando.” — Procurando Nemo",
    zh: "「一直游就对了。」 — 海底总动员",
    ja: "「ただ泳ぎ続けるのよ。」 — ファインディング・ニモ",
  },
  "„To infinity… and beyond!” — Toy Story": {
    pl: "„Do nieskończoności i jeszcze dalej!” — Toy Story",
    de: "„Bis zur Unendlichkeit… und noch viel weiter!” — Toy Story",
    es: "„¡Hasta el infinito… y más allá!” — Toy Story",
    pt: "„Ao infinito… e além!” — Toy Story",
    zh: "「飞向宇宙，浩瀚无垠！」 — 玩具总动员",
    ja: "「無限の彼方へ、さあ行くぞ！」 — トイ・ストーリー",
  },
  "„I love the smell of napalm in the morning.” — Czas apokalipsy": {
    pl: "„Uwielbiam zapach napalmu o poranku.” — Czas apokalipsy",
    en: "„I love the smell of napalm in the morning.” — Apocalypse Now",
    de: "„Ich liebe den Geruch von Napalm am Morgen.” — Apocalypse Now",
    es: "„Me encanta el olor a napalm por la mañana.” — Apocalypse Now",
    pt: "„Adoro o cheiro de napalm de manhã.” — Apocalypse Now",
    zh: "「我喜欢清晨汽油弹的味道。」 — 现代启示录",
    ja: "「朝のナパームの匂いは格別だ。」 — 地獄の黙示録",
  },
  "„Say hello to my little friend!” — Scarface": {
    pl: "„Przywitajcie się z moim małym przyjacielem!” — Scarface",
    de: "„Sag Hallo zu meinem kleinen Freund!” — Scarface",
    es: "„¡Saluda a mi amiguito!” — Scarface",
    pt: "„Diga olá ao meu amiguinho!” — Scarface",
    zh: "「跟我的小朋友打个招呼吧！」 — 疤面煞星",
    ja: "「俺の小さな友達に挨拶しな！」 — スカーフェイス",
  },
  "„Carpe diem. Chwytaj dzień.” — Stowarzyszenie Umarłych Poetów": {
    en: "„Carpe diem. Seize the day.” — Dead Poets Society",
    de: "„Carpe diem. Nutze den Tag.” — Der Club der toten Dichter",
    es: "„Carpe diem. Aprovecha el día.” — La Sociedad de los Poetas Muertos",
    pt: "„Carpe diem. Aproveite o dia.” — Sociedade dos Poetas Mortos",
    zh: "「Carpe diem。及时行乐。」 — 死亡诗社",
    ja: "「カルペ・ディエム。今を生きろ。」 — いまを生きる",
  },
  "„Life moves pretty fast…” — Wolny dzień Ferrisa Buellera": {
    pl: "„Życie pędzi całkiem szybko…” — Wolny dzień Ferrisa Buellera",
    en: "„Life moves pretty fast…” — Ferris Bueller's Day Off",
    de: "„Das Leben ist ganz schön schnelllebig…” — Ferris Bueller's Day Off",
    es: "„La vida pasa bastante rápido…” — Ferris Bueller's Day Off",
    pt: "„A vida passa bem rápido…” — Ferris Bueller's Day Off",
    zh: "「生活的节奏很快…」 — Ferris Bueller's Day Off",
    ja: "「人生はけっこう速く進む…」 — Ferris Bueller's Day Off",
  },
  "„Elementary, my dear Watson.” — Sherlock Holmes": {
    pl: "„Elementarne, mój drogi Watsonie.” — Sherlock Holmes",
    de: "„Elementar, mein lieber Watson.” — Sherlock Holmes",
    es: "„Elemental, mi querido Watson.” — Sherlock Holmes",
    pt: "„Elementar, meu caro Watson.” — Sherlock Holmes",
    zh: "「基本演绎法，亲爱的华生。」 — 夏洛克·福尔摩斯",
    ja: "「初歩的なことだよ、ワトソン君。」 — シャーロック・ホームズ",
  },
  "„Houston, we have a problem.” — Apollo 13": {
    pl: "„Houston, mamy problem.” — Apollo 13",
    de: "„Houston, wir haben ein Problem.” — Apollo 13",
    es: "„Houston, tenemos un problema.” — Apollo 13",
    pt: "„Houston, temos um problema.” — Apollo 13",
    zh: "「休斯顿，我们有麻烦了。」 — 阿波罗13号",
    ja: "「ヒューストン、問題が発生した。」 — アポロ13",
  },
  "„They may take our lives, but they'll never take our freedom!” — Braveheart": {
    pl: "„Mogą odebrać nam życie, ale nigdy nie odbiorą nam wolności!” — Braveheart",
    de: "„Sie können uns das Leben nehmen, aber niemals unsere Freiheit!” — Braveheart",
    es: "„¡Pueden quitarnos la vida, pero jamás nos quitarán la libertad!” — Braveheart",
    pt: "„Podem tirar as nossas vidas, mas nunca a nossa liberdade!” — Braveheart",
    zh: "「他们可以夺走我们的生命，却永远夺不走我们的自由！」 — 勇敢的心",
    ja: "「命は奪えても、自由は決して奪えない！」 — ブレイブハート",
  },
  "„What we do in life echoes in eternity.” — Gladiator": {
    pl: "„To, co czynimy za życia, odbija się echem w wieczności.” — Gladiator",
    de: "„Was wir im Leben tun, hallt in der Ewigkeit wider.” — Gladiator",
    es: "„Lo que hacemos en vida resuena en la eternidad.” — Gladiator",
    pt: "„O que fazemos em vida ecoa na eternidade.” — Gladiator",
    zh: "「我们在世间的所作所为，将回响于永恒。」 — 角斗士",
    ja: "「我々が生きて成すことは、永遠に響き渡る。」 — グラディエーター",
  },
  "„You either die a hero, or live long enough to see yourself become the villain.” — Mroczny Rycerz": {
    pl: "„Albo umierasz jako bohater, albo żyjesz dość długo, by stać się złoczyńcą.” — Mroczny Rycerz",
    en: "„You either die a hero, or live long enough to see yourself become the villain.” — The Dark Knight",
    de: "„Entweder du stirbst als Held, oder du lebst lange genug, um selbst zum Schurken zu werden.” — The Dark Knight",
    es: "„O mueres como un héroe, o vives lo suficiente para verte convertido en villano.” — El Caballero Oscuro",
    pt: "„Ou você morre como herói, ou vive o bastante para se tornar o vilão.” — Batman: O Cavaleiro das Trevas",
    zh: "「要么作为英雄死去，要么活到看着自己变成恶棍。」 — 蝙蝠侠：黑暗骑士",
    ja: "「英雄のまま死ぬか、生き長らえて悪党に成り果てるかだ。」 — ダークナイト",
  },
  "„Every man dies. Not every man really lives.” — Braveheart": {
    pl: "„Każdy człowiek umiera. Nie każdy naprawdę żyje.” — Braveheart",
    de: "„Jeder Mensch stirbt. Aber nicht jeder lebt wirklich.” — Braveheart",
    es: "„Todos los hombres mueren. No todos viven de verdad.” — Braveheart",
    pt: "„Todo homem morre. Nem todo homem realmente vive.” — Braveheart",
    zh: "「每个人都会死，但并非每个人都真正活过。」 — 勇敢的心",
    ja: "「人は皆死ぬ。だが、誰もが本当に生きているわけではない。」 — ブレイブハート",
  },
  "„Welcome to the real world.” — Matrix": {
    pl: "„Witaj w świecie rzeczywistym.” — Matrix",
    de: "„Willkommen in der Wirklichkeit.” — Matrix",
    es: "„Bienvenido al mundo real.” — Matrix",
    pt: "„Bem-vindo ao mundo real.” — Matrix",
    zh: "「欢迎来到真实的世界。」 — 黑客帝国",
    ja: "「現実の世界へようこそ。」 — マトリックス",
  },
  "„This is your life, and it's ending one minute at a time.” — Fight Club": {
    pl: "„To jest twoje życie i kończy się minuta po minucie.” — Fight Club",
    de: "„Das ist dein Leben, und es endet Minute für Minute.” — Fight Club",
    es: "„Esta es tu vida, y se acaba minuto a minuto.” — Fight Club",
    pt: "„Esta é a sua vida, e ela termina um minuto de cada vez.” — Fight Club",
    zh: "「这就是你的人生，它正一分一秒地走向终点。」 — 搏击俱乐部",
    ja: "「これがお前の人生だ。一分ごとに終わりへと近づいている。」 — ファイト・クラブ",
  },
  "„The name's Bond. {name} Bond.” — James Bond": {
    pl: "„Nazywam się Bond. {name} Bond.” — James Bond",
    de: "„Mein Name ist Bond. {name} Bond.” — James Bond",
    es: "„Me llamo Bond. {name} Bond.” — James Bond",
    pt: "„Meu nome é Bond. {name} Bond.” — James Bond",
    zh: "「我叫邦德，{name}·邦德。」 — James Bond",
    ja: "「名前はボンド。{name}・ボンドだ。」 — James Bond",
  },
  "„The path of the righteous man is beset on all sides…” — Pulp Fiction": {
    pl: "„Ścieżka prawego człowieka zewsząd jest osaczona…” — Pulp Fiction",
    de: "„Der Weg des Rechtschaffenen ist von allen Seiten bedroht…” — Pulp Fiction",
    es: "„El camino del hombre recto está rodeado por todas partes…” — Pulp Fiction",
    pt: "„O caminho do homem justo é cercado por todos os lados…” — Pulp Fiction",
    zh: "「义人的道路四面受敌…」 — 低俗小说",
    ja: "「正しき者の道は、四方から脅かされている…」 — パルプ・フィクション",
  },
  "„Winter is coming.” — Gra o tron": {
    pl: "„Nadchodzi zima.” — Gra o tron",
    en: "„Winter is coming.” — Game of Thrones",
    de: "„Der Winter naht.” — Game of Thrones",
    es: "„Se acerca el invierno.” — Juego de Tronos",
    pt: "„O inverno está chegando.” — Game of Thrones",
    zh: "「凛冬将至。」 — 权力的游戏",
    ja: "「冬が来る。」 — ゲーム・オブ・スローンズ",
  },
  "„How you doin'?” — Przyjaciele": {
    pl: "„Jak leci?” — Przyjaciele",
    en: "„How you doin'?” — Friends",
    de: "„Na, wie geht's?” — Friends",
    es: "„¿Qué tal estás?” — Friends",
    pt: "„Como você vai?” — Friends",
    zh: "「你好吗？」 — 老友记",
    ja: "「調子はどう？」 — フレンズ",
  },
  "„Say my name.” — Breaking Bad": {
    pl: "„Powiedz moje imię.” — Breaking Bad",
    de: "„Sag meinen Namen.” — Breaking Bad",
    es: "„Di mi nombre.” — Breaking Bad",
    pt: "„Diga o meu nome.” — Breaking Bad",
    zh: "「说出我的名字。」 — 绝命毒师",
    ja: "「俺の名を言ってみろ。」 — ブレイキング・バッド",
  },
  "„I am the one who knocks.” — Breaking Bad": {
    pl: "„To ja jestem tym, który puka.” — Breaking Bad",
    de: "„Ich bin der, der klopft.” — Breaking Bad",
    es: "„Yo soy el que llama a la puerta.” — Breaking Bad",
    pt: "„Eu sou aquele que bate à porta.” — Breaking Bad",
    zh: "「我就是那个敲门的人。」 — 绝命毒师",
    ja: "「ドアを叩くのは、この俺だ。」 — ブレイキング・バッド",
  },
  "„Valar morghulis. Wszyscy ludzie muszą umrzeć.” — Gra o tron": {
    en: "„Valar morghulis. All men must die.” — Game of Thrones",
    de: "„Valar morghulis. Alle Menschen müssen sterben.” — Game of Thrones",
    es: "„Valar morghulis. Todos los hombres deben morir.” — Juego de Tronos",
    pt: "„Valar morghulis. Todos os homens devem morrer.” — Game of Thrones",
    zh: "「Valar morghulis。凡人皆有一死。」 — 权力的游戏",
    ja: "「ヴァラー・モルグリス。すべての人間はいつか死ぬ。」 — ゲーム・オブ・スローンズ",
  },
  "„Not all those who wander are lost.” — Władca Pierścieni": {
    pl: "„Nie każdy, kto wędruje, jest zagubiony.” — Władca Pierścieni",
    en: "„Not all those who wander are lost.” — The Lord of the Rings",
    de: "„Nicht alle, die wandern, sind verloren.” — Der Herr der Ringe",
    es: "„No todos los que vagan están perdidos.” — El Señor de los Anillos",
    pt: "„Nem todos os que vagueiam estão perdidos.” — O Senhor dos Anéis",
    zh: "「并非所有游荡者都迷失了方向。」 — 指环王",
    ja: "「さすらう者すべてが道に迷っているわけではない。」 — ロード・オブ・ザ・リング",
  },
  "„Big Brother is watching you.” — Rok 1984": {
    pl: "„Wielki Brat patrzy.” — Rok 1984",
    en: "„Big Brother is watching you.” — 1984",
    de: "„Der Große Bruder sieht dich.” — 1984",
    es: "„El Gran Hermano te vigila.” — 1984",
    pt: "„O Grande Irmão está te observando.” — 1984",
    zh: "「老大哥在看着你。」 — 一九八四",
    ja: "「ビッグ・ブラザーがあなたを見ている。」 — 一九八四年",
  },
  "„Fear is the mind-killer.” — Diuna": {
    pl: "„Strach zabija duszę.” — Diuna",
    en: "„Fear is the mind-killer.” — Dune",
    de: "„Furcht tötet den Verstand.” — Dune",
    es: "„El miedo mata la mente.” — Dune",
    pt: "„O medo é o assassino da mente.” — Duna",
    zh: "「恐惧是思维的杀手。」 — 沙丘",
    ja: "「恐怖は精神を殺す。」 — デューン 砂の惑星",
  },
  "„So it goes.” — Rzeźnia numer pięć": {
    pl: "„Tak to bywa.” — Rzeźnia numer pięć",
    en: "„So it goes.” — Slaughterhouse-Five",
    de: "„So geht das.” — Schlachthof 5",
    es: "„Así son las cosas.” — Matadero Cinco",
    pt: "„E assim vai.” — Matadouro-Cinco",
    zh: "「就这么回事。」 — 五号屠场",
    ja: "「そういうものだ。」 — スローターハウス5",
  },
  "„It was the best of times, it was the worst of times.” — Opowieść o dwóch miastach": {
    pl: "„Był to najlepszy z czasów, był to najgorszy z czasów.” — Opowieść o dwóch miastach",
    en: "„It was the best of times, it was the worst of times.” — A Tale of Two Cities",
    de: "„Es war die beste aller Zeiten, es war die schlechteste aller Zeiten.” — Eine Geschichte aus zwei Städten",
    es: "„Era el mejor de los tiempos, era el peor de los tiempos.” — Historia de dos ciudades",
    pt: "„Era o melhor dos tempos, era o pior dos tempos.” — Um Conto de Duas Cidades",
    zh: "「那是最好的时代，也是最坏的时代。」 — 双城记",
    ja: "「それは最良の時代であり、最悪の時代でもあった。」 — 二都物語",
  },
  "„Whatever our souls are made of, his and mine are the same.” — Wichrowe Wzgórza": {
    pl: "„Z czegokolwiek są nasze dusze, jego i moja są takie same.” — Wichrowe Wzgórza",
    en: "„Whatever our souls are made of, his and mine are the same.” — Wuthering Heights",
    de: "„Woraus unsere Seelen auch bestehen, seine und meine sind gleich.” — Sturmhöhe",
    es: "„De lo que sea que estén hechas nuestras almas, la suya y la mía son iguales.” — Cumbres Borrascosas",
    pt: "„Seja do que for feita a nossa alma, a dele e a minha são iguais.” — O Morro dos Ventos Uivantes",
    zh: "「无论我们的灵魂由什么构成，他的和我的都是一样的。」 — 呼啸山庄",
    ja: "「私たちの魂が何でできていようと、彼のものと私のものは同じだ。」 — 嵐が丘",
  },
  "„Those who do not understand true pain can never understand true peace.” — Pain (Naruto Shippuden)": {
    pl: "„Ci, którzy nie rozumieją prawdziwego bólu, nigdy nie zrozumieją prawdziwego pokoju.” — Pain (Naruto Shippuden)",
    de: "„Wer wahren Schmerz nicht kennt, kann wahren Frieden nie verstehen.” — Pain (Naruto Shippuden)",
    es: "„Quienes no comprenden el verdadero dolor jamás comprenderán la verdadera paz.” — Pain (Naruto Shippuden)",
    pt: "„Aqueles que não entendem a verdadeira dor jamais entenderão a verdadeira paz.” — Pain (Naruto Shippuden)",
    zh: "「不懂得真正痛苦的人，永远无法理解真正的和平。」 — Pain (Naruto Shippuden)",
    ja: "「本当の痛みを知らぬ者に、本当の平和は分からない。」 — Pain (Naruto Shippuden)",
  },
  "„A lesson without pain is meaningless.” — Edward Elric": {
    pl: "„Lekcja bez bólu jest bezwartościowa.” — Edward Elric",
    de: "„Eine Lektion ohne Schmerz ist bedeutungslos.” — Edward Elric",
    es: "„Una lección sin dolor no tiene sentido.” — Edward Elric",
    pt: "„Uma lição sem dor não tem sentido.” — Edward Elric",
    zh: "「没有痛苦的教训毫无意义。」 — Edward Elric",
    ja: "「痛みを伴わない教訓には意味がない。」 — Edward Elric",
  },
  "„I am Kira.” — Death Note": {
    pl: "„Jestem Kira.” — Death Note",
    de: "„Ich bin Kira.” — Death Note",
    es: "„Yo soy Kira.” — Death Note",
    pt: "„Eu sou Kira.” — Death Note",
    zh: "「我就是基拉。」 — 死亡笔记",
    ja: "「私がキラだ。」 — デスノート",
  },
  "„If the truth is cruel, then a lie must be kind. That’s why kindness is a lie.” — Hachiman Hikigaya": {
    pl: "„Jeśli prawda jest okrutna, to kłamstwo musi być łaskawe. Dlatego dobroć jest kłamstwem.” — Hachiman Hikigaya",
    de: "„Wenn die Wahrheit grausam ist, muss eine Lüge freundlich sein. Deshalb ist Freundlichkeit eine Lüge.” — Hachiman Hikigaya",
    es: "„Si la verdad es cruel, entonces una mentira debe ser amable. Por eso la amabilidad es una mentira.” — Hachiman Hikigaya",
    pt: "„Se a verdade é cruel, então a mentira deve ser gentil. É por isso que a gentileza é uma mentira.” — Hachiman Hikigaya",
    zh: "「如果真相是残酷的，那么谎言必定是温柔的。所以，温柔就是谎言。」 — Hachiman Hikigaya",
    ja: "「真実が残酷なら、嘘は優しいはずだ。だから優しさは嘘なんだ。」 — Hachiman Hikigaya",
  },
  "„The pen is mightier than the sword.” — Edward Bulwer-Lytton": {
    pl: "„Pióro potężniejsze jest od miecza.” — Edward Bulwer-Lytton",
    de: "„Die Feder ist mächtiger als das Schwert.” — Edward Bulwer-Lytton",
    es: "„La pluma es más poderosa que la espada.” — Edward Bulwer-Lytton",
    pt: "„A pena é mais poderosa que a espada.” — Edward Bulwer-Lytton",
    zh: "「笔比剑更有力量。」 — Edward Bulwer-Lytton",
    ja: "「ペンは剣よりも強し。」 — Edward Bulwer-Lytton",
  },
  "„There is no greater agony than bearing an untold story inside you.” — Maya Angelou": {
    pl: "„Nie ma większej udręki niż nosić w sobie nieopowiedzianą historię.” — Maya Angelou",
    de: "„Es gibt keine größere Qual, als eine unerzählte Geschichte in sich zu tragen.” — Maya Angelou",
    es: "„No hay mayor agonía que llevar dentro una historia sin contar.” — Maya Angelou",
    pt: "„Não há agonia maior do que carregar dentro de si uma história não contada.” — Maya Angelou",
    zh: "「没有什么比心中藏着一个未曾诉说的故事更痛苦。」 — Maya Angelou",
    ja: "「語られぬ物語を内に抱えることほど、大きな苦しみはない。」 — Maya Angelou",
  },
  "„Fill your paper with the breathings of your heart.” — William Wordsworth": {
    pl: "„Zapełnij kartkę tchnieniem swojego serca.” — William Wordsworth",
    de: "„Fülle dein Papier mit dem Atem deines Herzens.” — William Wordsworth",
    es: "„Llena tu papel con los latidos de tu corazón.” — William Wordsworth",
    pt: "„Encha o teu papel com as respirações do teu coração.” — William Wordsworth",
    zh: "「用你心灵的呼吸填满纸张。」 — William Wordsworth",
    ja: "「あなたの心の息吹で紙を満たしなさい。」 — William Wordsworth",
  },
  "„You can make anything by writing.” — C.S. Lewis": {
    pl: "„Pisaniem można stworzyć wszystko.” — C.S. Lewis",
    de: "„Durch Schreiben kann man alles erschaffen.” — C.S. Lewis",
    es: "„Escribiendo puedes crear cualquier cosa.” — C.S. Lewis",
    pt: "„Escrevendo, você pode criar qualquer coisa.” — C.S. Lewis",
    zh: "「通过写作，你可以创造任何东西。」 — C.S. Lewis",
    ja: "「書くことで、人は何でも生み出せる。」 — C.S. Lewis",
  },
  "„Write drunk, edit sober.” — (przyp. Hemingwayowi)": {
    pl: "„Pisz po pijaku, poprawiaj na trzeźwo.” — (przyp. Hemingwayowi)",
    en: "„Write drunk, edit sober.” — (attributed to Hemingway)",
    de: "„Schreib betrunken, überarbeite nüchtern.” — (Hemingway zugeschrieben)",
    es: "„Escribe borracho, edita sobrio.” — (atribuido a Hemingway)",
    pt: "„Escreva bêbado, edite sóbrio.” — (atribuído a Hemingway)",
    zh: "「醉时写作，醒时修改。」 — （据传出自海明威）",
    ja: "「酔って書き、醒めて直せ。」 — （ヘミングウェイの言葉とされる）",
  },
  "„A word after a word after a word is power.” — Margaret Atwood": {
    pl: "„Słowo po słowie po słowie to potęga.” — Margaret Atwood",
    de: "„Ein Wort nach einem Wort nach einem Wort ist Macht.” — Margaret Atwood",
    es: "„Una palabra tras otra palabra tras otra es poder.” — Margaret Atwood",
    pt: "„Uma palavra após outra palavra após outra é poder.” — Margaret Atwood",
    zh: "「一个字接一个字接一个字，便是力量。」 — Margaret Atwood",
    ja: "「言葉に言葉を、そのまた言葉を重ねることが力になる。」 — Margaret Atwood",
  },
  "„Nobody's perfect.” — Pół żartem, pół serio": {
    pl: "„Nikt nie jest doskonały.” — Pół żartem, pół serio",
    en: "„Nobody's perfect.” — Some Like It Hot",
    de: "„Niemand ist perfekt.” — Manche mögen's heiß",
    es: "„Nadie es perfecto.” — Con faldas y a lo loco",
    pt: "„Ninguém é perfeito.” — Quanto Mais Quente Melhor",
    zh: "「人无完人。」 — 热情似火",
    ja: "「完璧な人間などいない。」 — お熱いのがお好き",
  },
  "„Chase perfection and we can catch excellence.” — Vince Lombardi": {
    pl: "„Ścigaj doskonałość, a dogonisz znakomitość.” — Vince Lombardi",
    de: "„Jage der Perfektion nach, und wir können Exzellenz einfangen.” — Vince Lombardi",
    es: "„Persigue la perfección y alcanzaremos la excelencia.” — Vince Lombardi",
    pt: "„Persiga a perfeição e alcançaremos a excelência.” — Vince Lombardi",
    zh: "「追求完美，方能成就卓越。」 — Vince Lombardi",
    ja: "「完璧を追い求めれば、卓越をつかむことができる。」 — Vince Lombardi",
  },
  "„If you look for perfection, you'll never be content.” — Lew Tołstoj": {
    pl: "„Jeśli szukasz doskonałości, nigdy nie będziesz zadowolony.” — Lew Tołstoj",
    en: "„If you look for perfection, you'll never be content.” — Leo Tolstoy",
    de: "„Wer nach Perfektion sucht, wird nie zufrieden sein.” — Leo Tolstoi",
    es: "„Si buscas la perfección, nunca estarás satisfecho.” — León Tolstói",
    pt: "„Se você busca a perfeição, nunca estará satisfeito.” — Liev Tolstói",
    zh: "「若追求完美，你将永不满足。」 — 列夫·托尔斯泰",
    ja: "「完璧を求めれば、決して満足することはない。」 — レフ・トルストイ",
  },
  "„Have no fear of perfection — you'll never reach it.” — Salvador Dalí": {
    pl: "„Nie bój się doskonałości — i tak jej nie osiągniesz.” — Salvador Dalí",
    de: "„Hab keine Angst vor der Perfektion — du wirst sie nie erreichen.” — Salvador Dalí",
    es: "„No tengas miedo a la perfección: nunca la alcanzarás.” — Salvador Dalí",
    pt: "„Não tenha medo da perfeição — você nunca a alcançará.” — Salvador Dalí",
    zh: "「不必畏惧完美——你永远无法企及。」 — Salvador Dalí",
    ja: "「完璧を恐れるな——どうせ手は届かないのだから。」 — Salvador Dalí",
  },
  "„Ars longa, vita brevis.” — Hipokrates": {
    en: "„Ars longa, vita brevis.” — Hippocrates",
    de: "„Ars longa, vita brevis.” — Hippokrates",
    es: "„Ars longa, vita brevis.” — Hipócrates",
    pt: "„Ars longa, vita brevis.” — Hipócrates",
    zh: "「Ars longa, vita brevis。」 — 希波克拉底",
    ja: "「Ars longa, vita brevis.」 — ヒポクラテス",
  },
  "„We'll always have Paris.” — Casablanca": {
    pl: "„Zawsze będziemy mieć Paryż.” — Casablanca",
    de: "„Uns bleibt immer Paris.” — Casablanca",
    es: "„Siempre nos quedará París.” — Casablanca",
    pt: "„Sempre teremos Paris.” — Casablanca",
    zh: "「我们永远拥有巴黎。」 — 卡萨布兰卡",
    ja: "「僕たちにはいつもパリがある。」 — カサブランカ",
  },
  "„After all this time? Always.” — Harry Potter": {
    pl: "„Po tylu latach? Zawsze.” — Harry Potter",
    de: "„Nach all der Zeit? Immer.” — Harry Potter",
    es: "„¿Después de todo este tiempo? Siempre.” — Harry Potter",
    pt: "„Depois de todo esse tempo? Sempre.” — Harry Potter",
    zh: "「过了这么久？一直如此。」 — 哈利·波特",
    ja: "「あれから今もずっと？　いつまでも。」 — ハリー・ポッター",
  },
  "„To me, you are perfect.” — To właśnie miłość": {
    pl: "„Dla mnie jesteś doskonała.” — To właśnie miłość",
    en: "„To me, you are perfect.” — Love Actually",
    de: "„Für mich bist du perfekt.” — Tatsächlich… Liebe",
    es: "„Para mí, eres perfecta.” — Love Actually",
    pt: "„Para mim, você é perfeita.” — Love Actually",
    zh: "「对我而言，你是完美的。」 — 真爱至上",
    ja: "「僕にとって、君は完璧だ。」 — ラブ・アクチュアリー",
  },
  "„You had me at hello.” — Jerry Maguire": {
    pl: "„Kupiłeś mnie na dzień dobry.” — Jerry Maguire",
    de: "„Du hattest mich bei Hallo.” — Jerry Maguire",
    es: "„Me conquistaste con el hola.” — Jerry Maguire",
    pt: "„Você me conquistou no olá.” — Jerry Maguire",
    zh: "「你说你好的那一刻，我就沦陷了。」 — Jerry Maguire",
    ja: "「あなたのこんにちはで、私は落ちたの。」 — Jerry Maguire",
  },
  "„I'm just a girl, standing in front of a boy…” — Notting Hill": {
    pl: "„Jestem tylko dziewczyną, która stoi przed chłopakiem…” — Notting Hill",
    de: "„Ich bin nur ein Mädchen, das vor einem Jungen steht…” — Notting Hill",
    es: "„Solo soy una chica, de pie frente a un chico…” — Notting Hill",
    pt: "„Sou apenas uma garota, diante de um garoto…” — Notting Hill",
    zh: "「我只是一个女孩，站在一个男孩面前…」 — 诺丁山",
    ja: "「私はただの女の子。一人の男の子の前に立っているだけ…」 — ノッティングヒルの恋人",
  },
  "„Love means never having to say you're sorry.” — Love Story": {
    pl: "„Miłość to nigdy nie musieć mówić przepraszam.” — Love Story",
    de: "„Liebe heißt, niemals um Verzeihung bitten zu müssen.” — Love Story",
    es: "„Amar significa no tener que decir nunca lo siento.” — Love Story",
    pt: "„Amar é nunca ter que dizer que sente muito.” — Love Story",
    zh: "「爱意味着永远不必说对不起。」 — 爱情故事",
    ja: "「愛とは、決してごめんと言わなくてよいということ。」 — ある愛の詩",
  },
  "„With great power comes great responsibility.” — Spider-Man": {
    pl: "„Z wielką mocą wiąże się wielka odpowiedzialność.” — Spider-Man",
    de: "„Aus großer Macht folgt große Verantwortung.” — Spider-Man",
    es: "„Un gran poder conlleva una gran responsabilidad.” — Spider-Man",
    pt: "„Com grandes poderes vêm grandes responsabilidades.” — Homem-Aranha",
    zh: "「能力越大，责任越大。」 — 蜘蛛侠",
    ja: "「大いなる力には、大いなる責任が伴う。」 — スパイダーマン",
  },
  "„Where everybody knows your name.” — Zdrówko (Cheers)": {
    pl: "„Gdzie wszyscy znają twoje imię.” — Zdrówko (Cheers)",
    en: "„Where everybody knows your name.” — Cheers",
    de: "„Wo jeder deinen Namen kennt.” — Cheers",
    es: "„Donde todos saben tu nombre.” — Cheers",
    pt: "„Onde todos sabem o seu nome.” — Cheers",
    zh: "「在这里，人人都知道你的名字。」 — Cheers",
    ja: "「みんなが君の名前を知っている場所。」 — Cheers",
  },
  "„Are you not entertained?!” — Gladiator": {
    pl: "„Czy nie jesteście rozbawieni?!” — Gladiator",
    de: "„Seid ihr nicht unterhalten?!” — Gladiator",
    es: "„¿No os entretiene esto?!” — Gladiator",
    pt: "„Vocês não estão entretidos?!” — Gladiator",
    zh: "「你们还不满意吗？！」 — 角斗士",
    ja: "「これでも満足できないのか！？」 — グラディエーター",
  },
  "„I'm the king of the world!” — Titanic": {
    pl: "„Jestem królem świata!” — Titanic",
    de: "„Ich bin der König der Welt!” — Titanic",
    es: "„¡Soy el rey del mundo!” — Titanic",
    pt: "„Eu sou o rei do mundo!” — Titanic",
    zh: "「我是世界之王！」 — 泰坦尼克号",
    ja: "「俺は世界の王だ！」 — タイタニック",
  },
  "„Fame! I'm gonna live forever.” — Fame": {
    pl: "„Sława! Będę żyć wiecznie.” — Fame",
    de: "„Ruhm! Ich werde ewig leben.” — Fame",
    es: "„¡Fama! Viviré para siempre.” — Fama",
    pt: "„Fama! Vou viver para sempre.” — Fama",
    zh: "「名声！我将永远活着。」 — 名扬四海",
    ja: "「名声！　私は永遠に生きる。」 — Fame",
  },
  "„It's gonna be legen— wait for it —dary!” — Jak poznałem waszą matkę": {
    pl: "„To będzie legen— czekajcie —darne!” — Jak poznałem waszą matkę",
    en: "„It's gonna be legen— wait for it —dary!” — How I Met Your Mother",
    de: "„Das wird legen— warte es ab —där!” — How I Met Your Mother",
    es: "„Va a ser legen— espéralo —dario!” — How I Met Your Mother",
    pt: "„Vai ser lendá— espera aí —rio!” — How I Met Your Mother",
    zh: "「这将会是传—等一下—奇！」 — How I Met Your Mother",
    ja: "「これは伝—待てよ—説だ！」 — How I Met Your Mother",
  },
  "„I see you.” — Avatar": {
    pl: "„Widzę cię.” — Avatar",
    de: "„Ich sehe dich.” — Avatar",
    es: "„Te veo.” — Avatar",
    pt: "„Eu te vejo.” — Avatar",
    zh: "「我看见你。」 — 阿凡达",
    ja: "「あなたが見える。」 — アバター",
  },
  "„Keep your friends close, but your enemies closer.” — Ojciec chrzestny II": {
    pl: "„Trzymaj przyjaciół blisko, a wrogów jeszcze bliżej.” — Ojciec chrzestny II",
    en: "„Keep your friends close, but your enemies closer.” — The Godfather Part II",
    de: "„Halte deine Freunde nah, aber deine Feinde noch näher.” — Der Pate II",
    es: "„Ten cerca a tus amigos, y más cerca a tus enemigos.” — El Padrino II",
    pt: "„Mantenha os amigos por perto e os inimigos ainda mais perto.” — O Poderoso Chefão II",
    zh: "「亲近你的朋友，但要更亲近你的敌人。」 — 教父II",
    ja: "「友は近くに置け、だが敵はもっと近くに置け。」 — ゴッドファーザー PART II",
  },
  "„Curiouser and curiouser!” — Alicja w Krainie Czarów": {
    pl: "„Coraz ciekawiej i ciekawiej!” — Alicja w Krainie Czarów",
    en: "„Curiouser and curiouser!” — Alice in Wonderland",
    de: "„Immer seltsamer und seltsamer!” — Alice im Wunderland",
    es: "„¡Cada vez más curioso!” — Alicia en el País de las Maravillas",
    pt: "„Cada vez mais curioso!” — Alice no País das Maravilhas",
    zh: "「越来越奇怪了！」 — 爱丽丝梦游仙境",
    ja: "「ますます奇妙だわ！」 — 不思議の国のアリス",
  },
  "„The truth is out there.” — Z Archiwum X": {
    pl: "„Prawda jest gdzieś tam.” — Z Archiwum X",
    en: "„The truth is out there.” — The X-Files",
    de: "„Die Wahrheit ist irgendwo da draußen.” — Akte X",
    es: "„La verdad está ahí fuera.” — Expediente X",
    pt: "„A verdade está lá fora.” — Arquivo X",
    zh: "「真相就在那里。」 — X档案",
    ja: "「真実はそこにある。」 — Xファイル",
  },
  "„Life is like a box of chocolates.” — Forrest Gump": {
    pl: "„Życie jest jak pudełko czekoladek.” — Forrest Gump",
    de: "„Das Leben ist wie eine Schachtel Pralinen.” — Forrest Gump",
    es: "„La vida es como una caja de bombones.” — Forrest Gump",
    pt: "„A vida é como uma caixa de chocolates.” — Forrest Gump",
    zh: "「生活就像一盒巧克力。」 — 阿甘正传",
    ja: "「人生はチョコレートの箱のようなもの。」 — フォレスト・ガンプ",
  },
  "„Variety's the very spice of life.” — William Cowper": {
    pl: "„Różnorodność jest przyprawą życia.” — William Cowper",
    de: "„Abwechslung ist die Würze des Lebens.” — William Cowper",
    es: "„La variedad es la sal de la vida.” — William Cowper",
    pt: "„A variedade é o tempero da vida.” — William Cowper",
    zh: "「变化是生活的调味品。」 — William Cowper",
    ja: "「変化こそ人生の香辛料。」 — William Cowper",
  },
  "„So many books, so little time.” — Frank Zappa": {
    pl: "„Tyle książek, tak mało czasu.” — Frank Zappa",
    de: "„So viele Bücher, so wenig Zeit.” — Frank Zappa",
    es: "„Tantos libros, tan poco tiempo.” — Frank Zappa",
    pt: "„Tantos livros, tão pouco tempo.” — Frank Zappa",
    zh: "「书这么多，时间这么少。」 — Frank Zappa",
    ja: "「本は多く、時間は少ない。」 — Frank Zappa",
  },
  "„A jack of all trades, master of none.” — przysłowie": {
    pl: "„Do wszystkiego, a do niczego.” — przysłowie",
    en: "„A jack of all trades, master of none.” — proverb",
    de: "„Ein Alleskönner ist ein Nichtskönner.” — Sprichwort",
    es: "„Aprendiz de todo, maestro de nada.” — proverbio",
    pt: "„Pau para toda obra, mestre de nada.” — provérbio",
    zh: "「样样通，样样松。」 — 谚语",
    ja: "「多芸は無芸。」 — ことわざ",
  },
  "„Toto, I've a feeling we're not in Kansas anymore.” — Czarnoksiężnik z Oz": {
    pl: "„Toto, mam wrażenie, że nie jesteśmy już w Kansas.” — Czarnoksiężnik z Oz",
    en: "„Toto, I've a feeling we're not in Kansas anymore.” — The Wizard of Oz",
    de: "„Toto, ich habe das Gefühl, wir sind nicht mehr in Kansas.” — Der Zauberer von Oz",
    es: "„Toto, tengo la sensación de que ya no estamos en Kansas.” — El Mago de Oz",
    pt: "„Toto, tenho a sensação de que não estamos mais no Kansas.” — O Mágico de Oz",
    zh: "「托托，我感觉我们已经不在堪萨斯了。」 — 绿野仙踪",
    ja: "「トト、どうやらここはもうカンザスじゃないみたい。」 — オズの魔法使い",
  },
  "„Infinite diversity in infinite combinations.” — Star Trek": {
    pl: "„Nieskończona różnorodność w nieskończonych kombinacjach.” — Star Trek",
    de: "„Unendliche Vielfalt in unendlichen Kombinationen.” — Star Trek",
    es: "„Diversidad infinita en infinitas combinaciones.” — Star Trek",
    pt: "„Diversidade infinita em infinitas combinações.” — Star Trek",
    zh: "「无限组合中的无限多样性。」 — 星际迷航",
    ja: "「無限の多様性を、無限の組み合わせで。」 — スター・トレック",
  },
  "„Why not both?” — internetowa mądrość": {
    pl: "„Czemu nie oba naraz?” — internetowa mądrość",
    en: "„Why not both?” — internet wisdom",
    de: "„Warum nicht beides?” — Internet-Weisheit",
    es: "„¿Por qué no ambos?” — sabiduría de internet",
    pt: "„Por que não os dois?” — sabedoria da internet",
    zh: "「为什么不两个都要？」 — 网络智慧",
    ja: "「両方じゃダメなの？」 — ネットの知恵",
  },
  "„Great Scott!” — Powrót do przyszłości": {
    en: "„Great Scott!” — Back to the Future",
    de: "„Great Scott!” — Zurück in die Zukunft",
    es: "„Great Scott!” — Regreso al Futuro",
    pt: "„Great Scott!” — De Volta para o Futuro",
    zh: "「Great Scott！」 — 回到未来",
    ja: "「Great Scott！」 — バック・トゥ・ザ・フューチャー",
  },
  "„Roads? Where we're going, we don't need roads.” — Powrót do przyszłości": {
    pl: "„Drogi? Tam, dokąd jedziemy, nie potrzebujemy dróg.” — Powrót do przyszłości",
    en: "„Roads? Where we're going, we don't need roads.” — Back to the Future",
    de: "„Straßen? Wo wir hinfahren, brauchen wir keine Straßen.” — Zurück in die Zukunft",
    es: "„¿Carreteras? A donde vamos no necesitamos carreteras.” — Regreso al Futuro",
    pt: "„Estradas? Para onde vamos, não precisamos de estradas.” — De Volta para o Futuro",
    zh: "「公路？我们要去的地方不需要公路。」 — 回到未来",
    ja: "「道路？　これから行く先に道路は要らないさ。」 — バック・トゥ・ザ・フューチャー",
  },
  "„I've seen things you people wouldn't believe…” — Łowca androidów": {
    pl: "„Widziałem rzeczy, w które wy, ludzie, byście nie uwierzyli…” — Łowca androidów",
    en: "„I've seen things you people wouldn't believe…” — Blade Runner",
    de: "„Ich habe Dinge gesehen, die ihr Menschen nicht glauben würdet…” — Blade Runner",
    es: "„He visto cosas que vosotros no creeríais…” — Blade Runner",
    pt: "„Eu vi coisas que vocês não acreditariam…” — Blade Runner",
    zh: "「我见过你们人类无法相信的事物…」 — 银翼杀手",
    ja: "「お前たち人間には信じられないものを見てきた…」 — ブレードランナー",
  },
  "„Time is a flat circle.” — Detektyw": {
    pl: "„Czas jest płaskim kołem.” — Detektyw",
    en: "„Time is a flat circle.” — True Detective",
    de: "„Die Zeit ist ein flacher Kreis.” — True Detective",
    es: "„El tiempo es un círculo plano.” — True Detective",
    pt: "„O tempo é um círculo plano.” — True Detective",
    zh: "「时间是一个扁平的圆环。」 — 真探",
    ja: "「時間は平坦な円環だ。」 — True Detective",
  },
  "„The past is never dead. It's not even past.” — William Faulkner": {
    pl: "„Przeszłość nigdy nie umiera. Nie jest nawet przeszłością.” — William Faulkner",
    de: "„Die Vergangenheit ist nie tot. Sie ist nicht einmal vergangen.” — William Faulkner",
    es: "„El pasado nunca está muerto. Ni siquiera es pasado.” — William Faulkner",
    pt: "„O passado nunca está morto. Nem sequer é passado.” — William Faulkner",
    zh: "「过去从未死去，它甚至还没有过去。」 — William Faulkner",
    ja: "「過去は決して死なない。過去ですらないのだ。」 — William Faulkner",
  },
  "„Frankly, my dear, I don't give a damn.” — Przeminęło z wiatrem": {
    pl: "„Szczerze, moja droga, mam to gdzieś.” — Przeminęło z wiatrem",
    en: "„Frankly, my dear, I don't give a damn.” — Gone with the Wind",
    de: "„Ehrlich gesagt, meine Liebe, ist mir das gleichgültig.” — Vom Winde verweht",
    es: "„Francamente, querida, me importa un bledo.” — Lo que el viento se llevó",
    pt: "„Francamente, minha querida, eu não dou a mínima.” — E o Vento Levou",
    zh: "「坦白说，亲爱的，我一点也不在乎。」 — 乱世佳人",
    ja: "「正直言って、僕はどうだっていいんだ。」 — 風と共に去りぬ",
  },
  "„You can't handle the truth!” — Ludzie honoru": {
    pl: "„Nie zniesiesz prawdy!” — Ludzie honoru",
    en: "„You can't handle the truth!” — A Few Good Men",
    de: "„Du verkraftest die Wahrheit nicht!” — Eine Frage der Ehre",
    es: "„¡No puedes soportar la verdad!” — A Few Good Men",
    pt: "„Você não aguenta a verdade!” — A Few Good Men",
    zh: "「你根本承受不了真相！」 — 义海雄风",
    ja: "「お前に真実は受け止められない！」 — ア・フュー・グッドメン",
  },
  "„What is this? A center for ants?” — Zoolander": {
    pl: "„Co to jest? Ośrodek dla mrówek?” — Zoolander",
    de: "„Was ist das? Ein Zentrum für Ameisen?” — Zoolander",
    es: "„¿Qué es esto? ¿Un centro para hormigas?” — Zoolander",
    pt: "„O que é isso? Um centro para formigas?” — Zoolander",
    zh: "「这是什么？给蚂蚁用的中心吗？」 — 超级名模",
    ja: "「何だこれ？　アリ用のセンターか？」 — Zoolander",
  },
  "„Gotta catch 'em all!” — Pokémon": {
    pl: "„Trzeba je wszystkie złapać!” — Pokémon",
    de: "„Schnapp sie dir alle!” — Pokémon",
    es: "„¡Hazte con todos!” — Pokémon",
    pt: "„Tenho que pegar todos!” — Pokémon",
    zh: "「把它们全都收服吧！」 — 宝可梦",
    ja: "「みんなを集めよう！」 — ポケットモンスター",
  },
  "„A place for everything, and everything in its place.” — Isabella Beeton": {
    pl: "„Wszystko ma swoje miejsce i wszystko na swoim miejscu.” — Isabella Beeton",
    de: "„Ein Platz für alles, und alles an seinem Platz.” — Isabella Beeton",
    es: "„Un lugar para cada cosa, y cada cosa en su lugar.” — Isabella Beeton",
    pt: "„Um lugar para cada coisa, e cada coisa em seu lugar.” — Isabella Beeton",
    zh: "「凡物各有其位，各得其所。」 — Isabella Beeton",
    ja: "「すべてに置き場所を、すべてをその場所に。」 — Isabella Beeton",
  },
  "„My precious.” — Władca Pierścieni": {
    pl: "„Mój skarbie.” — Władca Pierścieni",
    en: "„My precious.” — The Lord of the Rings",
    de: "„Mein Schatz.” — Der Herr der Ringe",
    es: "„Mi tesoro.” — El Señor de los Anillos",
    pt: "„Meu precioso.” — O Senhor dos Anéis",
    zh: "「我的宝贝。」 — 指环王",
    ja: "「いとしいしと。」 — ロード・オブ・ザ・リング",
  },
  "„I love it when a plan comes together.” — Drużyna A": {
    pl: "„Uwielbiam, gdy plan się realizuje.” — Drużyna A",
    en: "„I love it when a plan comes together.” — The A-Team",
    de: "„Ich liebe es, wenn ein Plan funktioniert.” — The A-Team",
    es: "„Me encanta que un plan salga bien.” — The A-Team",
    pt: "„Adoro quando um plano dá certo.” — The A-Team",
    zh: "「我就喜欢计划顺利实现的感觉。」 — The A-Team",
    ja: "「計画通りに事が運ぶのは最高だ。」 — The A-Team",
  },
};
// Tłumaczy pełny cytat (ze źródłem) na aktualny język; fallback = kanoniczny.
function trQuote(canonical) {
  const e = QUOTE_I18N[canonical];
  return (e && e[lang]) || canonical;
}
// Wersja dla samego tytułu (bez źródła) — pochodna QUOTE_I18N, ten sam klucz co w bazie.
const TITLE_I18N = new Map();
for (const [full, tr] of Object.entries(QUOTE_I18N)) {
  const m = {};
  for (const [lg, v] of Object.entries(tr)) m[lg] = quoteOnly(v);
  TITLE_I18N.set(quoteOnly(full), m);
}
function trTitle(canonicalTitle) {
  const m = TITLE_I18N.get(canonicalTitle);
  return (m && m[lang]) || canonicalTitle;
}
const TITLES = ACHIEVEMENTS.filter((a) => a.quote).map((a) => ({
  name: quoteOnly(a.quote),
  unlock: (s) => a.cur(s) >= a.goal,
}));
// Odwrotna mapa: nazwa tytułu (sam cytat) → odznaka, która go daje. Pozwala po
// kliknięciu w tytuł pokazać pełny cytat (ze źródłem) i jak został zdobyty.
const TITLE_BY_NAME = new Map(
  ACHIEVEMENTS.filter((a) => a.quote).map((a) => [quoteOnly(a.quote), a]),
);

// Okno „info o tytule" — pełny cytat + które osiągnięcie go odblokowało.
function openTitleInfo(title, name) {
  if (!title) return;
  const body = $("titleInfoBody");
  body.innerHTML = "";
  const a = TITLE_BY_NAME.get(title);
  const quote = document.createElement("div");
  quote.className = "title-info-quote";
  // Pełny cytat ze źródłem (a.quote), albo sam tytuł gdy spoza listy (np. Developer).
  quote.textContent = personalize(a ? trQuote(a.quote) : trTitle(title), name);
  body.append(quote);
  const how = document.createElement("div");
  how.className = "title-info-how";
  if (a) {
    const ic = document.createElement("span");
    ic.className = "title-info-ic";
    ic.textContent = a.icon;
    const txt = document.createElement("span");
    txt.textContent = t("titleInfoHow", { req: achLabel(a) });
    how.append(ic, txt);
  } else {
    how.textContent = t("titleInfoSpecial");
  }
  body.append(how);
  $("titleInfoOverlay").classList.remove("hidden");
}

function closeTitleInfo() {
  $("titleInfoOverlay").classList.add("hidden");
}

// Lista tytułów do wyboru w Ustawieniach: „Brak" + odblokowane + (dla twórcy) Developer.
function renderTitleList() {
  const box = $("titleList");
  if (!box) return;
  box.innerHTML = "";
  const s = achStats(myProfile);
  const me = myProfile.user?.displayName;
  const current = myProfile.user?.title ?? "";
  const options = [{ name: "", label: t("titleNone") }];
  // Konto twórcy (isDev) ma wszystkie tytuły odblokowane do wyboru.
  for (const ti of TITLES)
    if (myProfile.isDev || ti.unlock(s))
      options.push({ name: ti.name, label: personalize(trTitle(ti.name), me) });
  if (myProfile.isDev) options.push({ name: DEV_TITLE, label: DEV_TITLE });
  for (const o of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lang-btn" + (current === o.name ? " active" : "");
    b.textContent = o.label;
    b.addEventListener("click", () => setTitle(o.name));
    box.append(b);
  }
}

async function setTitle(name) {
  try {
    await api("/me/title", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: name || null }),
    });
    if (myProfile.user) myProfile.user.title = name || null;
    renderTitleList();
    // Odśwież nagłówek własnego profilu, jeśli otwarty.
    if (!$("profileView").classList.contains("hidden") && !viewingUserId) loadProfile();
    toast(t("titleSet"));
  } catch (e) {
    toast(e.message);
  }
}

// --- Wybór okładek w kategorii (max 4) — używa nakładki „Zobacz wszystko" ---
let catPickCtx = null; // { group, items } gdy tryb wyboru okładek

function openCatPicker(group, items) {
  catPickCtx = { group, items };
  // Wybór startuje od okładek, które AKTUALNIE widać w rzędzie. Bez tego picker
  // otwierał się z zerem zaznaczeń, mimo że w rzędzie stały cztery domyślne plakaty:
  // kliknięcie w widoczny plakat nie usuwało go, tylko zakładało nowy, jednoelementowy
  // wybór — i z rzędu znikały pozostałe trzy. Zapisujemy od razu, żeby to, co widać,
  // i to, co zaznaczone, były tym samym stanem.
  if (!hasFeatured(group.key)) {
    setFeatured(
      group.key,
      displayedForCat(group, items).map((r) => r.media.id),
    );
  }
  $("seeAllWrap").classList.remove("hidden"); // picker używa siatki plakatów
  $("togetherWrap").classList.add("hidden");
  $("seeAllTitle").textContent = t("pickCovers", {
    label: t(group.labelKey),
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
        // Komplet okładek: nowa wchodzi na miejsce NAJSTARSZEJ (numerki pokazują, co
        // wypadło). Odmowa z komunikatem „maksymalnie 4" byłaby tu ślepym zaułkiem —
        // picker otwiera się z czwórką widoczną w rzędzie, więc każde kliknięcie nowej
        // okładki odbijałoby się od limitu i wybrać nie dałoby się nic.
        cur = [...cur, r.media.id].slice(-MAX_COVERS);
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
    label.textContent = t(g.labelKey);
    head.append(label);
    const posters = document.createElement("div");
    posters.className = "cat-posters";
    // Cudzy profil pokazuje pierwsze MAX_COVERS; własny — okładki wybrane przez usera.
    const shown =
      items.length === 0
        ? []
        : readOnly
          ? items.slice(0, MAX_COVERS)
          : displayedForCat(g, items);
    if (items.length === 0) {
      posters.classList.add("empty");
      const ph = document.createElement("span");
      ph.className = "cat-empty";
      ph.textContent = t("nothingRatedCat");
      posters.append(ph);
    } else {
      // Oceny są, ale user odznaczył wszystkie okładki — inny komunikat niż „nic tu
      // jeszcze", bo tu jest co pokazać; to świadomy wybór, nie pusta kategoria.
      if (shown.length === 0) {
        posters.classList.add("empty");
        const ph = document.createElement("span");
        ph.className = "cat-empty";
        ph.textContent = t("noCoversPicked");
        posters.append(ph);
      }
      for (const r of shown) appendCard(posters, r.media, r.rating);
    }
    // Dojście do WSZYSTKICH ocen kategorii siedzi w jej nazwie: rząd mieści najwyżej
    // MAX_COVERS okładek, a na cudzym profilu nie ma nawet przycisku wyboru, więc bez
    // tego reszta ocen była nieosiągalna. Osobny przycisk dokładał rzędowi wysokości
    // (albo rozpychał główkę), a nazwa i tak już tam jest — nic nie kosztuje.
    // Tylko gdy JEST co pokazać ponad to, co widać: inaczej klik otwierałby to samo.
    if (items.length > shown.length) {
      label.textContent = `${t(g.labelKey)} (${items.length})`;
      label.classList.add("cat-label-link");
      label.title = t("seeAll", { n: items.length });
      label.setAttribute("role", "button");
      label.tabIndex = 0;
      const open = () => openSeeAll(t(g.labelKey), items);
      label.addEventListener("click", open);
      label.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // spacja nie ma przewijać strony
          open();
        }
      });
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
  if (type === "new_rating") return t("notifNewRating");
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
        n.type === "new_rating" ||
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

/**
 * Otwiera rozmowę z osobą o podanym id — po kliknięciu w powiadomienie o wiadomości.
 * Push niesie tylko id nadawcy (nie cały profil), więc dociągamy go tutaj.
 * Wejścia są dwa: świeże otwarcie apki z „/?chat=12" i już otwarta karta, której
 * Service Worker przysyła adres (przeładowania jej nie robimy — zgubiłaby stan).
 */
async function openChatFromUrl(url) {
  const id = Number(new URL(url, location.origin).searchParams.get("chat"));
  if (!me || !Number.isInteger(id) || id <= 0) return;
  try {
    const data = await api(`/users/${id}/profile`);
    $("chatOverlay").classList.remove("hidden");
    await openChat(data.user);
    startChatPoll();
  } catch {
    // Konto mogło zniknąć albo przestaliście być znajomymi — trudno, zostajemy.
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
          // Tylko pod CUDZĄ wiadomością — własnej nie ma po co tłumaczyć.
          if (!mine) {
            const tr = translateControl(m.text, `msg:${m.id}`);
            if (tr) bubble.append(tr);
          }
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
    // Osobna, tania trasa — sam licznik. Wcześniej szło tu po CAŁĄ listę rozmów
    // (ze zdjęciami i avatarami) tylko po to, żeby zsumować jedną liczbę, a dzieje
    // się to co 30 sekund.
    updateMsgBadge((await api("/me/messages/unread")).count);
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
  // „Tytuł" przy imieniu (pill) — jeśli ustawiony. Cytaty z {name} personalizujemy
  // imieniem właściciela profilu; surowy tytuł trzymamy do lookupu po kliknięciu.
  const titleEl = $("profileTitle");
  const rawTitle = data.user.title ?? "";
  const shownTitle = personalize(trTitle(rawTitle), data.user.displayName);
  titleEl.textContent = shownTitle;
  titleEl.title = shownTitle; // pełny cytat w tooltipie (pigułka obcięta)
  titleEl.dataset.raw = rawTitle;
  titleEl.dataset.owner = data.user.displayName;
  titleEl.classList.toggle("hidden", !rawTitle);
  // Klikalny tytuł: pokazuje pełny cytat i jak został zdobyty.
  titleEl.setAttribute("role", "button");
  titleEl.setAttribute("tabindex", rawTitle ? "0" : "-1");
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
  // „Kopiuj link" — tylko na własnym profilu (udostępniasz swój, nie cudzy).
  $("shareProfileBtn").classList.toggle("hidden", readOnly);

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

  // „O mnie" — tylko gdy jest co pokazać. Pusty akapit rozpychałby nagłówek profilu
  // każdemu, kto bio nie uzupełnił (czyli na start: wszystkim).
  const bio = $("profileBio");
  bio.textContent = data.user.bio ?? "";
  bio.classList.toggle("hidden", !data.user.bio);

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

  // Własne listy/kolekcje (na cudzym profilu tylko publiczne — przycina backend).
  renderLists(data.lists, readOnly);

  // Osiągnięcia — liczone z danych profilu (działa też dla cudzego profilu).
  renderAchievements(data);

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
    body.append(head, text);
    if (authorId !== me?.id) {
      const tr = translateControl(r.text, `rev:${r.id}`);
      if (tr) body.append(tr);
    }
    body.append(likeControl(r, authorId));

    item.append(poster, body);
    item.addEventListener("click", () =>
      openDetail(toDetail(r.media, r.media.type, r.media.id, myRatingFor(r.media.id))),
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
  SERIAL: "typeSerial",
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
  $("seeAllWrap").classList.add("hidden"); // ta siatka jest dla samych plakatów
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

/**
 * Dociąga opis, zwiastun i tytuł otwartego tytułu. Osobno od openDetail, bo po zmianie
 * języka trzeba je pobrać na nowo (wracają z API przetłumaczone), a openDetail przy
 * okazji ustawia nawigację — wołanie go ponownie gubiłoby powrót do wyników wyszukiwania.
 */
// Rysuje „Gdzie obejrzeć" — logotypy serwisów streamingowych (film/serial, region PL).
// Chowa sekcję, gdy brak danych (inne rodzaje, brak dostępności w Polsce).
function renderWatchProviders(watch) {
  const box = $("detailProviders");
  const logos = box.querySelector(".provider-logos");
  logos.innerHTML = "";
  const list = watch?.flatrate ?? [];
  if (!list.length) {
    box.classList.add("hidden");
    return;
  }
  for (const p of list) {
    if (p.logoUrl) {
      const img = document.createElement("img");
      img.src = p.logoUrl;
      img.alt = p.name;
      img.title = p.name;
      img.className = "provider-logo";
      img.loading = "lazy";
      logos.append(img);
    } else {
      const s = document.createElement("span");
      s.className = "provider-name";
      s.textContent = p.name;
      logos.append(s);
    }
  }
  box.classList.remove("hidden");
}

function loadDetailTexts() {
  const item = detailCtx;
  renderWatchProviders(null); // schowaj z poprzedniego tytułu, zanim przyjdą nowe dane
  if (!item?.type || !item?.externalId) {
    $("detailDesc").textContent = t("noDesc");
    return;
  }
  $("detailDesc").textContent = t("loadingDesc");
  api(
    `/details?type=${encodeURIComponent(item.type)}&externalId=${encodeURIComponent(item.externalId)}`,
  )
    .then((d) => {
      $("detailDesc").textContent = d.description || t("noDesc");
      // Tytuł z karty bywa w starym języku (karta nie jest przerysowywana po
      // zmianie); backend zna wersję w bieżącym języku, więc ma pierwszeństwo.
      if (d.title) {
        item.title = d.title;
        $("detailTitle").textContent = d.title;
      }
      showTrailer(d.trailerUrl, d.trailerKind);
      renderWatchProviders(d.watchProviders);
    })
    .catch(() => {
      $("detailDesc").textContent = t("noDesc");
    });
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
  loadDetailTexts();

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
  // Status (W trakcie / Ukończone) — tylko dla ocenionych (status wisi na recenzji).
  // Napis to AKCJA (dokąd przełączy), a podświetlenie = tytuł jest „w trakcie".
  const inProg = rev?.status === "IN_PROGRESS";
  $("statusBtn").classList.toggle("hidden", !rev);
  $("statusBtn").classList.toggle("active", inProg);
  $("statusBtn").textContent = inProg ? t("markDone") : t("markInProgress");
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

// Przełącza status ocenionego tytułu: Ukończone ↔ W trakcie. „Plan" to watchlista
// (osobny przycisk „Do listy"), więc tu krążymy tylko między dwoma stanami oceny.
async function toggleStatus() {
  const mid = detailCtx?.mediaId;
  const rev = mid ? myProfile.reviews.find((r) => r.media.id === mid) : null;
  if (!mid || !rev) {
    toast(t("rateFirst"));
    return;
  }
  const next = rev.status === "IN_PROGRESS" ? "DONE" : "IN_PROGRESS";
  try {
    await api("/me/review-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: mid, status: next }),
    });
    await loadMe();
    await loadCatalog();
    updateDetailButtons();
    toast(next === "IN_PROGRESS" ? t("statusInProgress") : t("statusDone"));
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
        if (r.user.id !== me?.id) {
          const tr = translateControl(r.text, `rev:${r.id}`);
          if (tr) el.append(tr);
        }
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
  if (!node.deleted && node.author.id !== me?.id) {
    const tr = translateControl(node.text, `cmt:${node.id}`);
    if (tr) main.append(tr);
  }

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
  // Zanim cokolwiek narysujemy: czat i recenzje pytają translateControl, czy przycisk
  // „Przetłumacz" ma się pojawić. Jedno miejsce dla obu wejść — startu z zapisanym
  // tokenem i świeżego logowania.
  await initTranslate();
  // Wejście z powiadomienia o wiadomości („/?chat=12") — otwórz od razu tę rozmowę.
  // Adres czyścimy, żeby odświeżenie strony nie otwierało czatu w kółko.
  if (new URLSearchParams(location.search).has("chat")) {
    const url = location.href;
    history.replaceState(null, "", location.pathname);
    setTimeout(() => openChatFromUrl(url), 0); // po narysowaniu widoku
  }
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
  // Wejście z deep-linku: „/?profile=12" (link do profilu) lub „/?media=34" (klik w
  // push „Nowość od znajomego" / „Premiera"). Adres czyścimy, by odświeżenie nie wracało tu.
  const params = new URLSearchParams(location.search);
  const pid = Number(params.get("profile"));
  const mediaDeep = Number(params.get("media"));
  if (pid || mediaDeep) history.replaceState(null, "", location.pathname);
  if (pid) {
    if (pid === me.id) openProfile();
    else openUserProfile(pid);
  } else if (mediaDeep) {
    const m = (allMedia ?? []).find((x) => x.id === mediaDeep);
    if (m) {
      const rev = myProfile.reviews.find((r) => r.media.id === mediaDeep);
      openDetail(toDetail(m, m.type, m.id, rev?.rating));
    }
  }
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
  // „Wyloguj" siedzi teraz w panelu Ustawień — zamknij go, inaczej zostałby
  // otwarty nad ekranem logowania.
  $("settingsOverlay").classList.remove("open");
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

  $("bioForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api("/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bio: $("bioInput").value }),
      });
      // Serwer przycina i normalizuje (puste → null) — bierzemy JEGO wersję, żeby
      // pole i profil pokazywały to, co faktycznie jest w bazie.
      if (myProfile?.user) myProfile.user.bio = res.bio;
      $("bioInput").value = res.bio ?? "";
      updateBioCount();
      toast(t("bioSaved"));
      if (!$("profileView").classList.contains("hidden") && !viewingUserId) loadProfile();
    } catch (err) {
      toast(err.message);
    }
  });

  $("bioInput").addEventListener("input", updateBioCount);

  // Uwaga: to przycisk „Zmień hasło" w USTAWIENIACH. Miał kiedyś id="pwToggle" —
  // ten sam co ikonka oka na ekranie logowania — więc getElementById trafiał w oko
  // i przycisk w ustawieniach nie robił NIC (a oko dostawało ten handler w prezencie).
  $("changePwBtn").addEventListener("click", () => {
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
  $("catalogSearch").addEventListener("input", (e) => {
    catalogQuery = e.target.value;
    renderCatalog();
  });
  $("catalogSort").addEventListener("change", (e) => {
    catalogSort = e.target.value;
    renderCatalog();
  });
  $("surpriseBtn").addEventListener("click", surpriseMe);
  $("statsBtn").addEventListener("click", toggleStats);
  $("shareProfileBtn").addEventListener("click", copyProfileLink);
  $("tasteMore").addEventListener("click", loadMoreTasteRecs);
  $("searchSort").addEventListener("change", (e) => {
    searchSort = e.target.value;
    renderSearchResults();
  });
  $("searchMinRating").addEventListener("change", (e) => {
    searchMinRating = Number(e.target.value);
    renderSearchResults();
  });
  $("searchMinYear").addEventListener("change", (e) => {
    searchMinYear = Number(e.target.value);
    renderSearchResults();
  });
  $("newListBtn").addEventListener("click", createList);
  $("listsBtn").addEventListener("click", openListPicker);
  $("listPickerClose").addEventListener("click", closeListPicker);
  $("newListCreate").addEventListener("click", createListFromPicker);
  $("newListInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") createListFromPicker();
  });
  $("listPickerOverlay").addEventListener("click", (e) => {
    if (e.target === $("listPickerOverlay")) closeListPicker();
  });
  $("achievementsBtn").addEventListener("click", () =>
    $("achievementsOverlay").classList.remove("hidden"),
  );
  $("achievementsClose").addEventListener("click", () =>
    $("achievementsOverlay").classList.add("hidden"),
  );
  $("achievementsOverlay").addEventListener("click", (e) => {
    if (e.target === $("achievementsOverlay")) {
      $("achievementsOverlay").classList.add("hidden");
    }
  });
  // Klik w tytuł przy imieniu → pełny cytat + jak zdobyty. Używamy surowego
  // tytułu (z {name}) do lookupu i imienia właściciela do podstawienia.
  const openTitle = () =>
    openTitleInfo($("profileTitle").dataset.raw, $("profileTitle").dataset.owner);
  $("profileTitle").addEventListener("click", openTitle);
  $("profileTitle").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openTitle();
    }
  });
  $("titleInfoClose").addEventListener("click", closeTitleInfo);
  $("titleInfoOverlay").addEventListener("click", (e) => {
    if (e.target === $("titleInfoOverlay")) closeTitleInfo();
  });
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
  $("statusBtn").addEventListener("click", toggleStatus);
  $("shareBtn").addEventListener("click", () => {
    if (detailCtx?.mediaId) shareMediaPick(detailCtx.mediaId);
  });
  $("deleteBtn").addEventListener("click", deleteDetailReview);
  $("search").addEventListener("input", onSearchInput);
  $("typeFilm").addEventListener("click", () => setSearchType("film"));
  $("typeSerial").addEventListener("click", () => setSearchType("serial"));
  $("typeBook").addEventListener("click", () => setSearchType("book"));
  $("typeManga").addEventListener("click", () => setSearchType("manga"));
  $("typeAnime").addEventListener("click", () => setSearchType("anime"));
  $("typeMusic").addEventListener("click", () => setSearchType("music"));
  $("typeGame").addEventListener("click", () => setSearchType("game"));
  detailStars = buildStars($("detailStars"), $("detailStarVal"));
  $("detailSave").addEventListener("click", saveDetail);
  $("autoTransToggle").addEventListener("change", (e) =>
    setAutoTranslate(e.target.checked),
  );
  $("seeAllClose").addEventListener("click", closeSeeAll);
  $("seeAllOverlay").addEventListener("click", (e) => {
    if (e.target === $("seeAllOverlay")) closeSeeAll();
  });
  $("settingsBtn").addEventListener("click", openSettings);
  $("pushToggle").addEventListener("click", togglePush);
  $("pushTest").addEventListener("click", testPush);
  $("settingsClose").addEventListener("click", closeSettings);
  // Klik w przyciemnione tło (poza panelem) zamyka ustawienia.
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
    if (!$("titleInfoOverlay").classList.contains("hidden")) closeTitleInfo();
    else if ($("settingsOverlay").classList.contains("open")) closeSettings();
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
  // Klik w powiadomienie przy OTWARTEJ karcie: SW ją podnosi i przysyła adres.
  // Bez tego focus() zostawiał usera dokładnie tam, gdzie był — a więc klik
  // w powiadomienie o wiadomości nie otwierał rozmowy.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "navigate" && e.data.url) openChatFromUrl(e.data.url);
  });

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
