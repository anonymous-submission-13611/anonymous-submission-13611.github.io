const wukongPreview = document.querySelector("#wukongPreview");
const heroDemos = document.querySelector("#heroDemos");
const frameworkComparison = document.querySelector("#frameworkComparison");

const fallbackData = {
  heroDemos: [],
  frameworkComparisons: [
    {
      case: "EX01 Battle of the Heavenly Titans",
      prompt: "Battle sequence with cross-shot identity and action continuity.",
      metrics: [
        { label: "Identity", value: 0.86 },
        { label: "Scene", value: 0.78 },
        { label: "Causality", value: 0.82 }
      ],
      methods: [
        { name: "VGoT", src: "", caption: "Baseline framework" },
        { name: "Mora", src: "", caption: "Baseline framework" },
        { name: "MovieAgent", src: "", caption: "Baseline framework" },
        { name: "Ours", src: "", caption: "Our multi-shot extrapolation result" }
      ]
    },
    {
      case: "EX02 Boxing",
      prompt: "A source-grounded location must pass through several cinematically distinct shots.",
      metrics: [
        { label: "Identity", value: 0.81 },
        { label: "Scene", value: 0.84 },
        { label: "Causality", value: 0.79 }
      ],
      methods: [
        { name: "VGoT", src: "", caption: "Baseline framework" },
        { name: "Mora", src: "", caption: "Baseline framework" },
        { name: "MovieAgent", src: "", caption: "Baseline framework" },
        { name: "Ours", src: "", caption: "Our multi-shot extrapolation result" }
      ]
    }
  ]
};

async function loadData() {
  try {
    const response = await fetch("./videos.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`videos.json returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallbackData;
  }
}

async function loadWukongPreview() {
  try {
    const response = await fetch("./wukong-preview.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`wukong-preview.json returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function formatTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remaining = Math.floor(value % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function labelFromId(id = "") {
  return id
    .replace(/^shot\d+_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sceneName(value = "") {
  return value
    .replace(/^EX(?:Pending|\d+)\s*/i, "")
    .replace("Battle of the Heavenly Titans", "Heavenly Titans")
    .trim();
}

function withShotStarts(shots = []) {
  let current = 0;
  return shots.map((shot) => {
    const item = { ...shot, start_s: current };
    current += Number(shot.duration_s) || 0;
    return item;
  });
}

function posterFromItem(item = {}) {
  return item.poster
    || item.thumbnail
    || item.frames?.[0]?.thumbnail
    || item.highlights?.[0]?.thumbnail
    || item.evidence?.[0]?.thumbnail
    || "";
}

function activateLazyVideo(video, options = {}) {
  if (!video) return;
  video.muted = false;
  video.volume = 1;

  const target = Number(options.seekTo);
  const hasTarget = Number.isFinite(target);
  const playFromTarget = () => {
    if (hasTarget) video.currentTime = Math.max(0, target);
    video.play().catch(() => {});
  };

  if (video.readyState >= 1) playFromTarget();
  else video.addEventListener("loadedmetadata", playFromTarget, { once: true });
}

function createLazyVideo(item = {}, className = "") {
  const video = document.createElement("video");
  if (className) video.className = className;
  video.controls = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "none";
  video.src = item.src || item.preview_src || "";
  video.dataset.baseSrc = video.src;
  const poster = posterFromItem(item);
  if (poster) video.poster = poster;
  video.addEventListener("play", () => {
    activateLazyVideo(video);
  }, { once: true });
  return video;
}

function seekVideo(video, seconds) {
  if (!video) return;
  const target = Math.max(0, Number(seconds) || 0);
  video.scrollIntoView({ behavior: "smooth", block: "center" });
  video.muted = false;
  video.volume = 1;
  const applySeek = () => {
    video.currentTime = target;
    video.muted = false;
    video.volume = 1;
    video.play().catch(() => {});
  };
  if (video.readyState >= 1) applySeek();
  else {
    video.addEventListener("loadedmetadata", applySeek, { once: true });
    video.load();
  }
}

function slotMedia(item) {
  const media = document.createElement("div");
  media.className = "image-container";
  if (item.src) {
    const video = createLazyVideo(item);
    media.append(video);
    const overlay = document.createElement("div");
    overlay.className = "video-slot-label";
    const duration = formatDuration(item.duration_s || item.duration);
    overlay.innerHTML = `<span>${item.name || item.title || "Video"}</span>${duration ? `<small>${duration}</small>` : ""}`;
    media.append(overlay);
  } else if (item.poster) {
    const image = document.createElement("img");
    image.src = item.poster;
    image.alt = item.title;
    media.append(image);
  } else {
    const empty = document.createElement("div");
    empty.className = "slot-placeholder";
    empty.innerHTML = `<strong>${item.title}</strong><span>Set src in videos.json</span>`;
    media.append(empty);
  }
  return media;
}

function renderFrameStrip(frames = [], video) {
  if (!frames.length) return null;
  const strip = document.createElement("div");
  strip.className = "frame-strip";
  frames.forEach((frame) => {
    const button = document.createElement("button");
    button.className = "frame-chip";
    button.type = "button";
    if (frame.thumbnail) button.style.setProperty("--frame-preview", `url("${frame.thumbnail}")`);
    button.innerHTML = `
      <img src="${frame.thumbnail}" alt="${formatDuration(frame.time_s)} frame">
      <span>${formatDuration(frame.time_s)}</span>
    `;
    button.addEventListener("click", () => seekVideo(video, frame.time_s));
    strip.append(button);
  });
  return strip;
}

function renderDemoTimeline(item = {}, video, limit = 5) {
  const frames = (item.frames || []).slice(0, limit);
  const strip = renderFrameStrip(frames, video);
  if (!strip) return null;
  const timeline = document.createElement("div");
  timeline.className = "demo-timeline";
  const heading = document.createElement("div");
  heading.className = "demo-timeline-heading";
  heading.textContent = "Evidence Timeline";
  timeline.append(heading, strip);
  return timeline;
}

function renderEvidenceList(items = [], video, tone = "issue", heading = "", options = {}) {
  if (!items.length) return null;
  const list = document.createElement("div");
  list.className = `evidence-list ${tone}`;
  if (heading) {
    const title = document.createElement("div");
    title.className = "evidence-heading";
    title.textContent = heading;
    list.append(title);
  }
  const visibleItems = Number.isFinite(options.limit) ? items.slice(0, options.limit) : items;
  visibleItems.forEach((item) => {
    const button = document.createElement("button");
    button.className = "evidence-item";
    button.type = "button";
    if (item.thumbnail) button.style.setProperty("--preview-image", `url("${item.thumbnail}")`);
    if (item.compare_thumbnail) button.style.setProperty("--compare-image", `url("${item.compare_thumbnail}")`);
    if (item.compare_thumbnail) button.classList.add("compare");
    if (item.duration_issue) button.classList.add("duration-issue");
    const previewTitle = `${formatDuration(item.time_s)} · ${item.title || ""}`.replace(/"/g, "&quot;");
    const previewText = `${item.text || ""}`.replace(/"/g, "&quot;");
    button.dataset.previewTitle = previewTitle;
    button.dataset.previewText = previewText;
    const thumbnail = item.compare_thumbnail ? `
      <span class="compare-thumbs">
        <span class="compare-jump" data-time="${Number(item.compare_time_s) || 0}" style="--thumb-image: url('${item.compare_thumbnail}')"><img src="${item.compare_thumbnail}" alt="Before ${item.title || "Evidence"}"><em>Before · ${formatDuration(item.compare_time_s)}</em></span>
        <span class="compare-jump" data-time="${Number(item.time_s) || 0}" style="--thumb-image: url('${item.thumbnail}')"><img src="${item.thumbnail}" alt="After ${item.title || "Evidence"}"><em>After · ${formatDuration(item.time_s)}</em></span>
      </span>
    ` : item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title || "Evidence"}">` : "";
    const duration = item.duration_issue ? `<span class="duration-badge">${item.duration_label || "Long duration"}</span>` : "";
    button.innerHTML = `
      ${thumbnail}
      <span class="evidence-copy">
        <strong>${formatDuration(item.time_s)} · ${item.title || ""}</strong>
        ${duration}
        <small>${item.text || ""}</small>
      </span>
    `;
    button.addEventListener("click", () => seekVideo(video, item.time_s));
    button.querySelectorAll(".compare-jump").forEach((jump) => {
      jump.addEventListener("click", (event) => {
        event.stopPropagation();
        seekVideo(video, Number(jump.dataset.time));
      });
    });
    list.append(button);
  });
  return list;
}

function renderMoreFrames(frames = [], video) {
  const strip = renderFrameStrip(frames, video);
  if (!strip) return null;
  const details = document.createElement("details");
  details.className = "more-frames";
  const summary = document.createElement("summary");
  summary.textContent = "More frames";
  details.append(summary, strip);
  return details;
}

function renderHeroDemos(items = []) {
  heroDemos.replaceChildren(...items.map((item, index) => {
    const card = document.createElement("article");
    card.className = `hero-demo-card ${index === 0 ? "featured-main" : "featured-small"}`;

    const eyebrow = document.createElement("div");
    eyebrow.className = "hero-demo-eyebrow";
    eyebrow.textContent = item.eyebrow || `Main Demo ${index + 1}`;

    const title = document.createElement("h3");
    title.textContent = item.title || `Demo ${index + 1}`;

    const frame = document.createElement("div");
    frame.className = "hero-demo-frame";
    if (item.src) {
      frame.append(slotMedia(item));
    } else {
      const empty = document.createElement("div");
      empty.className = "slot-placeholder";
      empty.innerHTML = `<strong>${title.textContent}</strong><span>Set src in videos.json</span>`;
      frame.append(empty);
    }
    const video = frame.querySelector("video");
    const evidence = renderDemoTimeline(item, video, index === 0 ? 6 : 4);

    const copy = document.createElement("div");
    copy.className = "hero-demo-copy";
    copy.append(eyebrow, title);
    card.append(copy, frame);
    if (evidence) card.append(evidence);
    return card;
  }));
}

function renderWukongPreview(data) {
  if (!data || !wukongPreview) return;
  const shots = withShotStarts(data.shots || []);
  const totalDuration = Number(data.total_duration_s) || shots.reduce((sum, shot) => sum + (Number(shot.duration_s) || 0), 0);

  const video = createLazyVideo({
    preview_src: data.preview_src,
    poster: posterFromItem(data),
    frames: data.frames,
    highlights: data.highlights
  }, "preview-video");

  const videoWrap = document.createElement("div");
  videoWrap.className = "preview-video-frame";
  videoWrap.append(video);

  const progressLine = document.createElement("div");
  progressLine.className = "preview-progress";
  const progressFill = document.createElement("div");
  progressFill.className = "preview-progress-fill";
  progressLine.append(progressFill);

  const rail = document.createElement("div");
  rail.className = "shot-rail";
  shots.forEach((shot, index) => {
    const shotButton = document.createElement("button");
    shotButton.className = "shot-pill";
    shotButton.type = "button";
    shotButton.dataset.start = String(shot.start_s);
    shotButton.style.setProperty("--share", `${Math.max(3, (shot.duration_s / totalDuration) * 100)}%`);
    shotButton.innerHTML = `
      <span class="shot-index">${String(index + 1).padStart(2, "0")}</span>
      <strong>${labelFromId(shot.shot_id)}</strong>
      <small>${formatTime(shot.start_s)} · ${shot.duration_s}s</small>
    `;
    const thumb = document.createElement("img");
    thumb.className = "shot-thumb";
    const thumbIndex = Math.min(data.frames?.length - 1 || 0, Math.floor((index / Math.max(1, shots.length)) * (data.frames?.length || 1)));
    thumb.src = shot.thumbnail || data.frames?.[thumbIndex]?.thumbnail || posterFromItem(data);
    thumb.alt = labelFromId(shot.shot_id);
    shotButton.prepend(thumb);
    shotButton.addEventListener("click", () => {
      seekVideo(video, shot.start_s);
    });
    rail.append(shotButton);
  });

  const meta = document.createElement("div");
  meta.className = "preview-meta";
  meta.innerHTML = `<span>${shots.length} shots · ${(data.bridges || []).length} bridges · ${formatDuration(data.duration_s || totalDuration)}</span>`;

  video.addEventListener("timeupdate", () => {
    const current = video.currentTime || 0;
    progressFill.style.width = `${Math.min(100, (current / totalDuration) * 100)}%`;
    [...rail.querySelectorAll(".shot-pill")].forEach((item, index) => {
      const start = Number(item.dataset.start);
      const end = index < shots.length - 1 ? shots[index + 1].start_s : totalDuration;
      item.classList.toggle("active", current >= start && current < end);
    });
  });

  const highlights = renderEvidenceList(data.highlights || [], video, "highlight", "Evidence Timeline", { limit: 4 });
  const previewTop = document.createElement("div");
  previewTop.className = "preview-topline";
  previewTop.append(videoWrap);
  if (highlights) previewTop.append(highlights);
  wukongPreview.replaceChildren(previewTop, progressLine, rail, meta);
}

function metricBar(metric) {
  const item = document.createElement("div");
  item.className = "metric-chip";
  item.textContent = metric.label;
  return item;
}

function renderFrameworkComparisons(cases) {
  if (!frameworkComparison) return;
  frameworkComparison.replaceChildren(...cases.map((caseData, caseIndex) => {
    const row = document.createElement("article");
    row.className = "comparison-case";

    const header = document.createElement("div");
    header.className = "comparison-case-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.innerHTML = `<span>Scene ${caseIndex + 1}</span><small>${sceneName(caseData.case)}</small>`;
    titleWrap.append(title);
    const metrics = document.createElement("div");
    metrics.className = "case-metrics";
    (caseData.metrics || []).forEach((metric) => metrics.append(metricBar(metric)));
    header.append(titleWrap, metrics);

    const methods = document.createElement("div");
    methods.className = "method-grid";
    const isLandmarksCase = caseData.case.includes("World Landmarks");
    (caseData.methods || []).forEach((method) => {
      const isOurs = method.name.toLowerCase() === "ours" || method.isOurs;
      const card = document.createElement("div");
      card.className = isOurs ? "method-card ours" : "method-card";
      const methodName = document.createElement("div");
      methodName.className = "method-name";
      methodName.textContent = method.name;
      if (isOurs) {
        const badge = document.createElement("span");
        badge.className = "ours-badge";
        badge.textContent = "Ours";
        methodName.append(badge);
      }
      const caption = document.createElement("div");
      caption.className = "method-caption";
      caption.textContent = method.caption || "";
      const media = slotMedia(method);
      const video = media.querySelector("video");
      const evidence = renderEvidenceList(method.evidence || [], video, isOurs ? "highlight" : "issue", isOurs ? "Strength Points" : "Failure Points", { limit: 2 });
      const frames = renderMoreFrames(method.frames || [], video);
      card.append(methodName, media);
      if (!isLandmarksCase) {
        if (evidence) card.append(evidence);
        if (frames) card.append(frames);
      }
      methods.append(card);
    });

    if (isLandmarksCase) {
      const note = document.createElement("p");
      note.className = "landmarks-note";
      note.textContent = "All frameworks can render recognizable landmarks, while ours presents the scene with stronger scale, cleaner detail, and a more cinematic aesthetic.";
      row.append(header, note, methods);
    } else {
      row.append(header, methods);
    }
    return row;
  }));
}

loadData().then((data) => {
  renderHeroDemos(data.heroDemos || fallbackData.heroDemos || []);
  renderFrameworkComparisons(data.frameworkComparisons || fallbackData.frameworkComparisons);
});

loadWukongPreview().then(renderWukongPreview);
