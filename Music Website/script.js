// ===== Element references =====
const addBtn = document.getElementById("addBtn");
const filePicker = document.getElementById("filePicker");
const audio = document.getElementById("audio");

const cover = document.getElementById("cover");
const currentTitle = document.getElementById("currentTitle");
const currentArtist = document.getElementById("currentArtist");

const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

const prevBtn = document.getElementById("prevBtn");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const volume = document.getElementById("volume");

const songList = document.getElementById("songList");
const songCount = document.getElementById("songCount");

// ===== State =====
let songs = [];          // { id, title, artist, url }
let currentIndex = -1;   // index of the song loaded in the player
let nextId = 1;
let isSeeking = false;

audio.volume = Number(volume.value);

// ===== Helpers =====
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + String(s).padStart(2, "0");
}

// "Artist - Song Name.mp3" -> { artist: "Artist", title: "Song Name" }
function parseFileName(fileName) {
  const base = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ").trim();
  const parts = base.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "Unknown artist", title: base || "Untitled" };
}

function updatePlayButton() {
  playBtn.textContent = audio.paused ? "▶" : "⏸";
}

// ===== Add songs =====
addBtn.addEventListener("click", () => filePicker.click());

filePicker.addEventListener("change", () => {
  const files = Array.from(filePicker.files).filter(
    (f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|opus|weba)$/i.test(f.name)
  );

  files.forEach((file) => {
    const { title, artist } = parseFileName(file.name);
    songs.push({
      id: nextId++,
      title,
      artist,
      url: URL.createObjectURL(file),
    });
  });

  filePicker.value = ""; // allow picking the same file again
  renderPlaylist();

  // If nothing was loaded yet, load the first new song (without autoplay)
  if (currentIndex === -1 && songs.length > 0) {
    loadSong(0, false);
  }
});

// ===== Render playlist =====
function renderPlaylist() {
  songList.innerHTML = "";
  songCount.textContent = songs.length + (songs.length === 1 ? " song" : " songs");

  if (songs.length === 0) {
    songList.innerHTML =
      '<div class="empty">' +
      '<div class="empty-icon">🎵</div>' +
      "<h3>Your playlist is empty</h3>" +
      "<p>Tap <b>Add Song</b> and choose music from your device.</p>" +
      "</div>";
    return;
  }

  songs.forEach((song, index) => {
    const row = document.createElement("div");
    row.className = "song" + (index === currentIndex ? " active" : "");

    const number = document.createElement("div");
    number.className = "song-number";
    number.textContent = index === currentIndex && !audio.paused ? "♪" : index + 1;

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "song-title";
    title.textContent = song.title;
    const artist = document.createElement("div");
    artist.className = "song-artist";
    artist.textContent = song.artist;
    info.append(title, artist);

    const right = document.createElement("div");
    const status = document.createElement("span");
    status.className = "song-status";
    status.textContent = index === currentIndex ? (audio.paused ? "Paused" : "Playing") : "";
    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.title = "Remove";
    remove.textContent = "✕";
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeSong(index);
    });
    right.append(status, remove);

    row.append(number, info, right);
    row.addEventListener("click", () => {
      if (index === currentIndex) {
        togglePlay();
      } else {
        loadSong(index, true);
      }
    });

    songList.appendChild(row);
  });
}

// ===== Load / play =====
function loadSong(index, autoplay) {
  if (index < 0 || index >= songs.length) return;
  currentIndex = index;
  const song = songs[index];

  audio.src = song.url;
  currentTitle.textContent = song.title;
  currentArtist.textContent = song.artist;
  cover.textContent = "♪";
  progress.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";

  if ("mediaSession" in navigator && window.MediaMetadata) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
    });
  }

  if (autoplay) {
    audio.play().catch(() => {});
  }
  updatePlayButton();
  renderPlaylist();
}

function togglePlay() {
  if (currentIndex === -1) {
    if (songs.length > 0) loadSong(0, true);
    return;
  }
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
}

function playNext() {
  if (songs.length === 0) return;
  loadSong((currentIndex + 1) % songs.length, true);
}

function playPrev() {
  if (songs.length === 0) return;
  // If more than 3 seconds in, restart the current song instead
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  loadSong((currentIndex - 1 + songs.length) % songs.length, true);
}

// ===== Remove song =====
function removeSong(index) {
  const removed = songs[index];
  const wasCurrent = index === currentIndex;
  const wasPlaying = !audio.paused;

  URL.revokeObjectURL(removed.url);
  songs.splice(index, 1);

  if (songs.length === 0) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    currentIndex = -1;
    currentTitle.textContent = "No song selected";
    currentArtist.textContent = "Choose a song to start listening";
    progress.value = 0;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    updatePlayButton();
  } else if (wasCurrent) {
    const newIndex = Math.min(index, songs.length - 1);
    currentIndex = -1;
    loadSong(newIndex, wasPlaying);
    return;
  } else if (index < currentIndex) {
    currentIndex--;
  }

  renderPlaylist();
}

// ===== Control buttons =====
playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);

// ===== Audio events =====
audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  if (!isSeeking && isFinite(audio.duration) && audio.duration > 0) {
    progress.value = (audio.currentTime / audio.duration) * 100;
  }
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("play", () => { updatePlayButton(); renderPlaylist(); });
audio.addEventListener("pause", () => { updatePlayButton(); renderPlaylist(); });
audio.addEventListener("ended", playNext);

// ===== Progress bar (seek) =====
progress.addEventListener("input", () => {
  isSeeking = true;
  if (isFinite(audio.duration)) {
    currentTimeEl.textContent = formatTime((progress.value / 100) * audio.duration);
  }
});

progress.addEventListener("change", () => {
  if (isFinite(audio.duration)) {
    audio.currentTime = (progress.value / 100) * audio.duration;
  }
  isSeeking = false;
});

// ===== Volume =====
volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

// ===== Keyboard shortcuts =====
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowRight") {
    playNext();
  } else if (e.code === "ArrowLeft") {
    playPrev();
  }
});

// ===== Media Session (lock screen / headset controls) =====
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => audio.play());
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack", playPrev);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);
}

// ===== Initial render =====
renderPlaylist();
