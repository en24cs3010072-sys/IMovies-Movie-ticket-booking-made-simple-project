const { useEffect, useMemo, useRef, useState } = React;

const DEMO_MOVIES = [
  { id: "paper-moons", title: "Paper Moons", genre: "Drama", duration: 118, rating: "8.4", classification: "PG-13", synopsis: "Somewhere between here and the stars.", poster: ["#354c69", "#ef8766", "#e6c4a4"], times: ["12:20", "15:40", "19:10"] },
  { id: "last-signal", title: "The Last Signal", genre: "Sci-Fi", duration: 132, rating: "8.1", classification: "PG-13", synopsis: "A message from the other side of time.", poster: ["#263e56", "#b9a9d5", "#f0c7a1"], times: ["13:15", "16:50", "20:30"] },
  { id: "summer-elsewhere", title: "Summer, Elsewhere", genre: "Romance", duration: 104, rating: "7.8", classification: "PG", synopsis: "One long afternoon. A different life.", poster: ["#c5684e", "#f3c767", "#f4d6b7"], times: ["11:45", "14:10", "18:00"] },
  { id: "wild-atlas", title: "Wild Atlas", genre: "Adventure", duration: 126, rating: "8.6", classification: "PG", synopsis: "The map ends where the story begins.", poster: ["#456e66", "#e6a857", "#e8c49b"], times: ["12:00", "15:25", "19:45"] },
  { id: "velvet-hour", title: "The Velvet Hour", genre: "Drama", duration: 111, rating: "7.9", classification: "R", synopsis: "A city keeps its own kind of secrets.", poster: ["#4a3b5b", "#d97261", "#e3b89a"], times: ["14:30", "17:20", "21:00"] },
  { id: "small-worlds", title: "Small Worlds", genre: "Animation", duration: 96, rating: "8.3", classification: "PG", synopsis: "Big feelings in a very small universe.", poster: ["#5c6e87", "#8fc9be", "#f1ca87"], times: ["10:50", "13:30", "16:15"] },
  { id: "northbound", title: "Northbound", genre: "Thriller", duration: 121, rating: "7.7", classification: "PG-13", synopsis: "Every mile takes them further in.", poster: ["#344b61", "#a8bdc0", "#e1bb96"], times: ["13:40", "17:00", "20:15"] },
  { id: "good-company", title: "Good Company", genre: "Comedy", duration: 101, rating: "8.0", classification: "PG-13", synopsis: "The right people make a mess worth keeping.", poster: ["#745950", "#e6a976", "#edc39d"], times: ["11:30", "14:50", "18:25"] }
];

const CATEGORIES = ["All films", "Drama", "Sci-Fi", "Romance", "Adventure"];
const TAKEN_SEATS = new Set(["A3", "A4", "B6", "C2", "C7", "D4", "E1", "E8"]);
const PRICE = 12.5;

function normalizeMovie(movie, index) {
  const safe = movie || {};
  const title = safe.title || safe.name || "Untitled film";
  const genre = safe.genre || safe.category || "Now showing";
  const duration = Number(safe.duration || safe.durationMinutes || safe.runtime || 110);
  const rating = String(safe.rating || safe.score || "—");
  const genreMatch = DEMO_MOVIES.find((item) => item.genre.toLowerCase() === String(genre).toLowerCase());
  const fallback = DEMO_MOVIES[index % DEMO_MOVIES.length];
  return {
    ...fallback,
    ...safe,
    id: safe.id || `movie-${index}`,
    title,
    genre,
    duration: Number.isFinite(duration) ? duration : 110,
    rating,
    classification: safe.classification || safe.certificate || fallback.classification,
    synopsis: safe.synopsis || safe.description || fallback.synopsis,
    poster: fallback.poster,
    times: Array.isArray(safe.times) && safe.times.length ? safe.times : fallback.times,
    _genreTheme: genreMatch ? genreMatch.poster : fallback.poster
  };
}

function App() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState("All films");
  const [search, setSearch] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDate, setSelectedDate] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const dialogRef = useRef(null);
  const toastTimer = useRef(null);

  async function loadMovies() {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/imovies-api/movies", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Could not load movies");
      const payload = await response.json();
      const list = Array.isArray(payload) ? payload : (payload.movies || payload.data || []);
      if (!Array.isArray(list)) throw new Error("Unexpected movie list");
      setMovies(list.map(normalizeMovie));
    } catch (error) {
      setMovies(DEMO_MOVIES.map(normalizeMovie));
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMovies(); }, []);

  const filteredMovies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return movies.filter((movie) => {
      const categoryMatch = category === "All films" || String(movie.genre).toLowerCase() === category.toLowerCase();
      const searchMatch = !term || `${movie.title} ${movie.genre} ${movie.synopsis}`.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [movies, category, search]);

  const dates = useMemo(() => Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      weekday: index === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" })
    };
  }), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedMovie && !dialog.open) dialog.showModal();
    if (!selectedMovie && dialog.open) dialog.close();
  }, [selectedMovie]);

  function openBooking(movie) {
    setSelectedMovie(movie);
    setSelectedSeats([]);
    setSelectedTime(movie.times[0]);
    setSelectedDate(0);
    setConfirmed(false);
  }

  function closeBooking() {
    setSelectedMovie(null);
    setSelectedSeats([]);
    setConfirmed(false);
  }

  function toggleSeat(seat) {
    setSelectedSeats((current) => current.includes(seat)
      ? current.filter((item) => item !== seat)
      : current.length < 8 ? [...current, seat] : current);
  }

  function showToast(message) {
    setToastText(message);
    setToastVisible(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2600);
  }

  function confirmBooking() {
    if (!selectedSeats.length) return;
    setConfirmed(true);
    showToast("Your seats are saved for this demo.");
  }

  const seatCount = selectedSeats.length;
  const total = seatCount * PRICE;

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="IMovies home">
          <span className="brand-mark">iM</span>
          <span className="brand-name">i<span>Movies</span></span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <a href="#movies">Now showing</a>
          <a href="#about">Our little cinema</a>
        </nav>
        <div className="nav-right">
          <div className="location-chip"><span className="location-dot"></span> Riverside Cinema</div>
          <button className="profile-button" onClick={() => showToast("Bookings are just for fun — no account needed.")}>My tickets</button>
        </div>
      </header>

      <main>
        <div className="hero-wrap">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line"></span> A good night starts here</div>
              <h1 id="hero-title">Your next favorite<br /><em>is on the big screen.</em></h1>
              <p>Eight stories, one cozy neighborhood cinema. Pick a film, bring your people, and we’ll save you the good seats.</p>
              <button className="hero-action" onClick={() => document.getElementById("movies").scrollIntoView({ behavior: "smooth" })}>
                Find your film <span aria-hidden="true">↘</span>
              </button>
            </div>
            <div className="ticket-art" aria-hidden="true">
              <div className="ticket-inner"><span className="ticket-graphic">iM</span><span className="ticket-stamp">YOUR NIGHT OUT</span><span className="ticket-spark">✳</span></div>
            </div>
          </section>
        </div>

        <section className="content" id="movies" aria-labelledby="movies-title">
          <div className="section-top">
            <div>
              <p className="section-kicker">The marquee</p>
              <h2 id="movies-title">Now showing</h2>
            </div>
            <p className="section-note">Good films. Great company. Right around the corner.</p>
          </div>
          <div className="toolbar" role="toolbar" aria-label="Filter films">
            {CATEGORIES.map((item) => (
              <button key={item} className={`filter-btn${category === item ? " active" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
            ))}
            <label className="search-box">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"></circle><path d="m16 16 4.4 4.4"></path></svg>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search films" placeholder="Find a film" />
            </label>
          </div>

          {loading ? (
            <div className="status-area" aria-label="Loading films">
              <div className="loading-grid">{[0, 1, 2, 3].map((item) => <div key={item} className="skeleton" />)}</div>
            </div>
          ) : loadError && movies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">!</div><h3>The marquee is taking a breather</h3>
              <p>We couldn’t load the film list right now.</p><button className="retry-button" onClick={loadMovies}>Try again</button>
            </div>
          ) : filteredMovies.length ? (
            <>
              {loadError && <div className="section-note" role="status" style={{ margin: "0 0 14px" }}>Showing a few favorites while the marquee reconnects.</div>}
              <div className="movie-grid">
                {filteredMovies.map((movie, index) => {
                  const colors = movie._genreTheme || movie.poster || ["#354c69", "#ef8766", "#e6c4a4"];
                  return (
                    <article className="movie-card" key={movie.id} style={{ "--i": index }}>
                      <div className="poster" role="img" aria-label={`${movie.title} illustrated film poster`} style={{ "--poster-bg": colors[0], "--poster-orb": colors[1], "--poster-figure": colors[2] }}>
                        <div className="poster-shape"></div>
                        <span className="poster-glint" aria-hidden="true">✳</span>
                        <div className="poster-copy"><small>{movie.genre}</small><strong>{movie.title}</strong><span>ONLY AT RIVERSIDE</span></div>
                      </div>
                      <div className="movie-info">
                        <div className="movie-heading"><h3>{movie.title}</h3><span className="rating" aria-label={`Rated ${movie.rating} out of 10`}>★ {movie.rating}</span></div>
                        <div className="movie-meta"><span>{movie.genre}</span><span className="meta-dot"></span><span>{movie.duration} min</span><span className="meta-dot"></span><span>{movie.classification}</span></div>
                        <div className="movie-footer">
                          <span className="showtime"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3.2 2"></path></svg>{movie.times.slice(0, 2).join(" · ")}</span>
                          <button className="book-button" onClick={() => openBooking(movie)} aria-label={`Choose seats for ${movie.title}`}>Choose seats</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⌕</div><h3>No films in that frame</h3>
              <p>Try another title or browse all films.</p><button className="retry-button" onClick={() => { setCategory("All films"); setSearch(""); }}>Show every film</button>
            </div>
          )}
          <div className="lobby-note" id="about">
            <strong>A little cinema with a lot of heart.</strong>
            <div className="note-right"><span></span> Doors open 30 minutes before showtime <span></span> Fresh popcorn, always</div>
          </div>
        </section>
      </main>

      <dialog ref={dialogRef} aria-label="Choose your seats" onClose={closeBooking} onClick={(event) => { if (event.target === dialogRef.current) closeBooking(); }}>
        {selectedMovie && (confirmed ? (
          <div className="confirmation">
            <div className="confirm-mark" aria-hidden="true">✓</div>
            <p className="dialog-kicker">A night well spent</p>
            <h2>Your seats are saved.</h2>
            <p>{selectedMovie.title} · {selectedTime}<br />{selectedSeats.slice().sort().join(", ")} · Riverside Cinema</p>
            <button className="confirm-button" onClick={closeBooking}>Lovely, thanks</button>
          </div>
        ) : (
          <div className="booking-layout">
            <div className="booking-main">
              <div className="dialog-top">
                <div><p className="dialog-kicker">The Riverside · Screen 1</p><h2>Pick your seats</h2></div>
                <button className="dialog-close" onClick={closeBooking} aria-label="Close seat selector">×</button>
              </div>
              <p className="booking-subtitle">The best part is choosing who sits next to you.</p>
              <div className="date-row" aria-label="Choose a day">
                {dates.map((date, index) => <button key={`${date.month}-${date.day}`} className={`date-chip${selectedDate === index ? " selected" : ""}`} aria-pressed={selectedDate === index} onClick={() => setSelectedDate(index)}>{date.weekday}<strong>{date.day} {date.month}</strong></button>)}
              </div>
              <div className="times-row" aria-label="Choose a showtime">
                {selectedMovie.times.map((time) => <button key={time} className={`time-chip${selectedTime === time ? " selected" : ""}`} aria-pressed={selectedTime === time} onClick={() => setSelectedTime(time)}>{time}</button>)}
              </div>
              <div className="screen-label">Screen</div><div className="screen" aria-hidden="true"></div>
              <div className="seat-grid" role="group" aria-label="Available seats">
                {["A", "B", "C", "D", "E"].flatMap((row) => Array.from({ length: 8 }, (_, index) => {
                  const seat = `${row}${index + 1}`;
                  const isTaken = TAKEN_SEATS.has(seat);
                  const isSelected = selectedSeats.includes(seat);
                  return <button key={seat} className={`seat${isTaken ? " taken" : ""}${isSelected ? " selected" : ""}`} disabled={isTaken} aria-label={`Row ${row}, seat ${index + 1}${isTaken ? ", occupied" : isSelected ? ", selected" : ", available"}`} aria-pressed={isSelected} onClick={() => toggleSeat(seat)}>{seat}</button>;
                }))}
              </div>
              <div className="seat-legend" aria-label="Seat key">
                <span className="legend-item"><i className="legend-swatch"></i> Available</span><span className="legend-item"><i className="legend-swatch chosen"></i> Your seat</span><span className="legend-item"><i className="legend-swatch occupied"></i> Taken</span>
              </div>
            </div>
            <aside className="booking-aside">
              <span className="summary-label">Your evening</span>
              <div className="summary-movie">{selectedMovie.title}</div>
              <div className="summary-detail">{selectedMovie.genre} · {selectedMovie.duration} min<br />{dates[selectedDate].weekday}, {dates[selectedDate].month} {dates[selectedDate].day}<br />{selectedTime} · Screen 1</div>
              <div className="summary-divider"></div>
              <div className="summary-line"><span>Seats</span><strong>{seatCount ? selectedSeats.slice().sort().join(", ") : "Choose seats"}</strong></div>
              <div className="summary-line"><span>Tickets × {seatCount}</span><strong>${(seatCount * PRICE).toFixed(2)}</strong></div>
              <div className="summary-total"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
              <button className="confirm-button" disabled={!seatCount} onClick={confirmBooking}>{seatCount ? "Save my seats" : "Choose a seat first"}</button>
            </aside>
          </div>
        ))}
      </dialog>
      <div className={`toast${toastVisible ? " visible" : ""}`} role="status" aria-live="polite">{toastText}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
