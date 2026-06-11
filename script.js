const fileInput = document.querySelector("#fileInput");
const pickFilesBtn = document.querySelector("#pickFilesBtn");
const dropZone = document.querySelector("#dropZone");
const uploadList = document.querySelector("#uploadList");
const emptyState = document.querySelector("#emptyState");
const template = document.querySelector("#fileCardTemplate");
const totalFiles = document.querySelector("#totalFiles");
const totalSize = document.querySelector("#totalSize");
const searchInput = document.querySelector("#searchInput");
const categorySelect = document.querySelector("#categorySelect");
const studentName = document.querySelector("#studentName");
const subjectName = document.querySelector("#subjectName");
const dueDate = document.querySelector("#dueDate");
const tagsInput = document.querySelector("#tagsInput");
const noteInput = document.querySelector("#noteInput");
const exportBtn = document.querySelector("#exportBtn");
const clearBtn = document.querySelector("#clearBtn");
const gridViewBtn = document.querySelector("#gridViewBtn");
const listViewBtn = document.querySelector("#listViewBtn");

const storageKey = "studydrop_uploads_v1";
let uploads = JSON.parse(localStorage.getItem(storageKey) || "[]");
let activeFilter = "all";
let activeView = "grid";

const categoryLabels = {
  assignment: "Assignment",
  notes: "Notes",
  project: "Project",
  media: "Media",
};

function saveUploads() {
  localStorage.setItem(storageKey, JSON.stringify(uploads));
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function fileIcon(name, type) {
  const extension = name.split(".").pop().slice(0, 4).toUpperCase();
  if (type.startsWith("image/")) return "IMG";
  if (type.startsWith("video/")) return "VID";
  if (type.includes("pdf")) return "PDF";
  return extension || "FILE";
}

function currentDetails() {
  const tags = tagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    student: studentName.value.trim() || "Student",
    subject: subjectName.value.trim() || "General",
    category: categorySelect.value,
    due: dueDate.value,
    tags,
    note: noteInput.value.trim(),
  };
}

function addFiles(fileList) {
  const details = currentDetails();
  const files = Array.from(fileList);
  const newUploads = files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || "unknown",
    addedAt: new Date().toISOString(),
    ...details,
  }));

  uploads = [...newUploads, ...uploads];
  saveUploads();
  render();
  uploadToPython(files, details);
}

async function uploadToPython(files, details) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("student", details.student);
  formData.append("subject", details.subject);
  formData.append("category", details.category);
  formData.append("due", details.due);
  formData.append("tags", details.tags.join(", "));
  formData.append("note", details.note);

  try {
    await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.info("Python upload server is not running; saved in browser only.");
  }
}

function matchesUpload(upload) {
  const search = searchInput.value.trim().toLowerCase();
  const haystack = [
    upload.name,
    upload.student,
    upload.subject,
    upload.category,
    upload.note,
    ...(upload.tags || []),
  ].join(" ").toLowerCase();

  const filterMatch = activeFilter === "all" || upload.category === activeFilter;
  return filterMatch && (!search || haystack.includes(search));
}

function renderStats() {
  const bytes = uploads.reduce((sum, upload) => sum + Number(upload.size || 0), 0);
  totalFiles.textContent = uploads.length;
  totalSize.textContent = formatBytes(bytes);
}

function renderCard(upload) {
  const card = template.content.firstElementChild.cloneNode(true);
  const title = card.querySelector("h4");
  const thumb = card.querySelector(".file-thumb");
  const meta = card.querySelector(".file-meta");
  const tagRow = card.querySelector(".tag-row");
  const removeButton = card.querySelector(".remove-button");

  title.textContent = upload.name;
  thumb.textContent = fileIcon(upload.name, upload.type);
  meta.textContent = `${categoryLabels[upload.category]} • ${upload.subject} • ${formatBytes(upload.size)}${upload.due ? ` • Due ${upload.due}` : ""}`;

  const tags = [upload.student, ...(upload.tags || [])];
  if (upload.note) tags.push(upload.note);
  tags.slice(0, 5).forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tag;
    tagRow.append(chip);
  });

  removeButton.addEventListener("click", () => {
    uploads = uploads.filter((item) => item.id !== upload.id);
    saveUploads();
    render();
  });

  return card;
}

function render() {
  renderStats();
  uploadList.classList.toggle("list-view", activeView === "list");
  uploadList.replaceChildren();

  const visibleUploads = uploads.filter(matchesUpload);
  visibleUploads.forEach((upload) => uploadList.append(renderCard(upload)));
  emptyState.classList.toggle("visible", visibleUploads.length === 0);
}

pickFilesBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});

dropZone.addEventListener("drop", (event) => {
  addFiles(event.dataTransfer.files);
});

document.querySelectorAll(".folder-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".folder-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});

searchInput.addEventListener("input", render);

gridViewBtn.addEventListener("click", () => {
  activeView = "grid";
  gridViewBtn.classList.add("active");
  listViewBtn.classList.remove("active");
  render();
});

listViewBtn.addEventListener("click", () => {
  activeView = "list";
  listViewBtn.classList.add("active");
  gridViewBtn.classList.remove("active");
  render();
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(uploads, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "studydrop-upload-list.json";
  link.click();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", () => {
  if (!uploads.length) return;
  uploads = [];
  saveUploads();
  render();
});

render();
