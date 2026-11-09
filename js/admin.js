(function () {
  "use strict";

  const API_URL = "/api/admin";
  const TOKEN_KEY = "genreAdminToken";
  const USER_KEY = "genreAdminUser";
  const PAGE_OPTIONS = [
    ["index.html", "Beranda"], ["tentang.html", "Tentang"],
    ["kegiatan.html", "Kegiatan & galeri"], ["anggota.html", "Anggota"],
    ["sosialmedia.html", "Sosial media"], ["pendaftaran.html", "Pendaftaran"],
    ["berita.html", "Berita"], ["agenda.html", "Agenda"],
    ["unduhan.html", "Unduhan"], ["faq.html", "FAQ"],
  ];
  const SECTION_TYPES = [
    ["hero", "Hero / banner"], ["text", "Teks"], ["image", "Gambar"],
    ["gallery", "Galeri gambar"], ["cards", "Kartu / tautan"], ["cta", "Ajakan bertindak"],
  ];
  const DEFAULT_NAVIGATION = [
    { label: "Beranda", href: "index.html", visible: true },
    { label: "Tentang", href: "tentang.html", visible: true },
    { label: "Kegiatan", href: "kegiatan.html", visible: true },
    { label: "Anggota", href: "anggota.html", visible: true },
    { label: "Sosial media", href: "sosialmedia.html", visible: true },
    { label: "Pendaftaran", href: "pendaftaran.html", visible: true },
    { label: "Berita", href: "berita.html", visible: true },
    { label: "Agenda", href: "agenda.html", visible: true },
    { label: "Unduhan", href: "unduhan.html", visible: true },
    { label: "FAQ", href: "faq.html", visible: true },
  ];
  const state = {
    settings: {}, items: [], media: [], pages: {}, navigation: [], toastTimer: null,
    editingPageSlug: "index.html",
  };
  const loginView = document.getElementById("login-view");
  const app = document.getElementById("admin-app");

  function showMessage(message, isError) {
    const toast = document.getElementById("app-message");
    toast.textContent = message;
    toast.classList.toggle("error", Boolean(isError));
    toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 3600);
  }

  function setFormMessage(element, message, isError) {
    element.textContent = message;
    element.style.color = isError ? "#c94c4c" : "#26805c";
  }

  async function request(action, payload) {
    const body = Object.assign({ action: action }, payload || {});
    if (action !== "login" && action !== "public") {
      body.token = sessionStorage.getItem(TOKEN_KEY) || "";
    }
    let response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new Error("Koneksi ke server gagal. Periksa jaringan dan konfigurasi backend.");
    }
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error("Server mengembalikan respons yang tidak dapat dibaca.");
    }
    if (!response.ok || !result.ok) {
      if (result.error && /sesi|session/i.test(result.error)) clearSession();
      throw new Error(result.error || "Permintaan gagal. Silakan coba lagi.");
    }
    return result.data;
  }

  async function cloudinaryRequest(action, payload) {
    const response = await fetch("/api/cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({
        action: action,
        token: sessionStorage.getItem(TOKEN_KEY) || "",
      }, payload || {})),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Operasi Cloudinary gagal.");
    }
    return result.data;
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  function showLogin() {
    app.hidden = true;
    loginView.hidden = false;
  }

  function showApp(username) {
    loginView.hidden = true;
    app.hidden = false;
    document.getElementById("admin-username").textContent = username;
    document.getElementById("welcome-name").textContent = username;
  }

  function setBusy(form, busy, label) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = label || "Memproses...";
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Simpan";
    }
  }

  async function loadAdminData() {
    const data = await request("admin");
    state.settings = data.settings || {};
    state.items = data.items || [];
    state.media = data.media || [];
    state.pages = {};
    (data.pages || []).forEach(function (page) {
      let sections = [];
      try {
        sections = JSON.parse(page.sectionsJson || "[]");
      } catch (error) {
        showMessage("Isi layout " + page.slug + " tidak valid dan perlu diperiksa.", true);
      }
      state.pages[page.slug] = {
        title: page.title,
        customLayout: page.customLayout === true || page.customLayout === "TRUE",
        sections: Array.isArray(sections) ? sections : [],
      };
    });
    state.navigation = parseNavigation(state.settings.navigation);
    renderAll();
  }

  function renderAll() {
    renderSettings();
    renderItems();
    renderMedia();
    renderPageNavigation();
    renderPageShortcuts();
    renderPageEditor();
    renderNavigation();
    renderStats();
  }

  function makePageLink(option, compact) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = compact ? "page-shortcut" : "page-nav-link";
    button.dataset.pageSlug = option[0];
    if (compact) {
      const number = document.createElement("span");
      number.className = "page-shortcut-number";
      number.textContent = String(PAGE_OPTIONS.indexOf(option) + 1).padStart(2, "0");
      const title = document.createElement("b");
      title.textContent = option[1];
      const action = document.createElement("span");
      action.className = "page-shortcut-action";
      action.textContent = "Atur halaman →";
      button.append(number, title, action);
      return button;
    }

    const marker = document.createElement("span");
    marker.className = "page-nav-marker";
    marker.textContent = String(PAGE_OPTIONS.indexOf(option) + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.textContent = option[1];
    button.append(marker, label);
    return button;
  }

  function renderPageNavigation() {
    const navigation = document.getElementById("page-navigation");
    navigation.replaceChildren();
    PAGE_OPTIONS.forEach(function (option) {
      navigation.appendChild(makePageLink(option, false));
    });
    syncPageNavigation();
  }

  function renderPageShortcuts() {
    const shortcuts = document.getElementById("page-shortcuts");
    shortcuts.replaceChildren();
    PAGE_OPTIONS.forEach(function (option) {
      shortcuts.appendChild(makePageLink(option, true));
    });
  }

  function syncPageNavigation() {
    const currentSlug = selectedPageSlug();
    const isPageEditorOpen = document.getElementById("panel-pages").classList.contains("active");
    document.querySelectorAll(".page-nav-link").forEach(function (button) {
      const selected = isPageEditorOpen && button.dataset.pageSlug === currentSlug;
      button.classList.toggle("active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function openPageEditor(slug) {
    updatePageStateFromEditor();
    document.getElementById("page-select").value = slug;
    renderPageEditor();
    openPanel("pages");
  }

  function parseNavigation(value) {
    if (!value) return DEFAULT_NAVIGATION.map(function (entry) { return Object.assign({}, entry); });
    try {
      const links = JSON.parse(value);
      if (!Array.isArray(links)) throw new Error("Navigasi tidak valid.");
      return links.map(function (entry) {
        return {
          label: String(entry.label || ""),
          href: String(entry.href || ""),
          visible: entry.visible !== false,
        };
      });
    } catch (error) {
      return DEFAULT_NAVIGATION.map(function (entry) { return Object.assign({}, entry); });
    }
  }

  function renderSettings() {
    const form = document.getElementById("settings-form");
    Object.keys(state.settings).forEach(function (key) {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = state.settings[key];
      }
    });
    const color = form.elements.namedItem("primaryColor");
    if (color && !/^#[0-9a-f]{6}$/i.test(color.value)) color.value = "#1a365d";
  }

  function renderStats() {
    const published = state.items.filter(function (item) { return item.published; });
    document.getElementById("stat-news").textContent =
      published.filter(function (item) { return item.type === "news"; }).length;
    document.getElementById("stat-events").textContent =
      published.filter(function (item) { return item.type === "event"; }).length;
    document.getElementById("stat-media").textContent = state.media.length;
    document.getElementById("stat-resources").textContent =
      published.filter(function (item) { return item.type === "resource"; }).length;
  }

  function selectedPageSlug() {
    return document.getElementById("page-select").value;
  }

  function renderPageEditor() {
    const slug = selectedPageSlug();
    state.editingPageSlug = slug;
    const page = state.pages[slug] || { title: pageLabel(slug), customLayout: false, sections: [] };
    document.getElementById("page-title-input").value = page.title || pageLabel(slug);
    document.getElementById("custom-layout-enabled").checked = page.customLayout;
    const list = document.getElementById("page-sections-list");
    list.replaceChildren();
    page.sections.forEach(function (section, index) {
      list.appendChild(makeSectionEditor(section, index));
    });
    if (!page.sections.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada komponen khusus. Tambahkan komponen atau aktifkan layout khusus.";
      list.appendChild(empty);
    }
  }

  function pageLabel(slug) {
    const page = PAGE_OPTIONS.find(function (option) { return option[0] === slug; });
    return page ? page[1] : slug;
  }

  function sectionField(section, key, label, multiline, placeholder) {
    const wrapper = document.createElement("label");
    wrapper.className = "page-field";
    wrapper.textContent = label;
    const field = multiline ? document.createElement("textarea") : document.createElement("input");
    field.dataset.field = key;
    field.value = section[key] || "";
    if (multiline) {
      field.rows = key === "body" ? 4 : 2;
      field.placeholder = placeholder || "";
    } else {
      field.type = "text";
      field.placeholder = placeholder || "";
    }
    wrapper.appendChild(field);
    return wrapper;
  }

  function makeSectionEditor(section, index) {
    const card = document.createElement("article");
    card.className = "page-section-editor";
    card.dataset.sectionId = section.id || ("section-" + index);
    card.dataset.index = String(index);

    const heading = document.createElement("div");
    heading.className = "page-section-heading";
    const type = document.createElement("select");
    type.dataset.field = "type";
    type.setAttribute("aria-label", "Jenis komponen");
    SECTION_TYPES.forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      type.appendChild(option);
    });
    type.value = section.type || "text";
    const actions = document.createElement("div");
    actions.className = "page-section-actions";
    [
      ["↑", "Naikkan komponen", -1],
      ["↓", "Turunkan komponen", 1],
    ].forEach(function (action) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "icon-button";
      button.textContent = action[0];
      button.title = action[1];
      button.addEventListener("click", function () { moveSection(index, action[2]); });
      actions.appendChild(button);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small-button danger";
    remove.textContent = "Hapus";
    remove.addEventListener("click", function () {
      updatePageStateFromEditor();
      const slug = selectedPageSlug();
      state.pages[slug].sections.splice(index, 1);
      renderPageEditor();
    });
    actions.appendChild(remove);
    heading.append(type, actions);

    const fields = document.createElement("div");
    fields.className = "page-section-fields";
    fields.appendChild(sectionField(section, "title", "Judul", false, "Judul komponen"));
    fields.appendChild(sectionField(
      section, "body", "Teks / deskripsi", true,
      section.type === "gallery" || section.type === "cards"
        ? "Satu kartu per baris: Judul | Deskripsi | tautan | URL gambar"
        : "Teks isi komponen"
    ));
    fields.appendChild(sectionField(section, "image", "URL gambar", false, "https://res.cloudinary.com/..."));
    const images = state.media.filter(function (file) {
      return String(file.mimeType).indexOf("image/") === 0;
    });
    if (images.length) {
      const picker = document.createElement("label");
      picker.className = "page-field";
      picker.textContent = "Pilih dari pustaka Cloudinary";
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Pilih gambar yang sudah diunggah";
      select.appendChild(placeholder);
      images.forEach(function (image) {
        const option = document.createElement("option");
        option.value = image.url;
        option.textContent = image.name;
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        const imageField = card.querySelector('[data-field="image"]');
        if (select.value && imageField) {
          imageField.value = select.value;
          updatePageStateFromEditor();
        }
      });
      picker.appendChild(select);
      fields.appendChild(picker);
    }
    fields.appendChild(sectionField(section, "url", "Tautan tombol", false, "https://... atau ./tentang.html"));
    fields.appendChild(sectionField(section, "buttonText", "Teks tombol", false, "Selengkapnya"));

    const layout = document.createElement("label");
    layout.className = "page-field";
    layout.textContent = "Tampilan";
    const layoutSelect = document.createElement("select");
    layoutSelect.dataset.field = "layout";
    [
      ["wide", "Lebar"],
      ["narrow", "Lebar baca"],
      ["split", "Gambar & teks"],
      ["center", "Rata tengah"],
      ["accent", "Sorotan warna"],
    ].forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      layoutSelect.appendChild(option);
    });
    layoutSelect.value = section.layout || "wide";
    layout.appendChild(layoutSelect);
    fields.appendChild(layout);

    const visibility = document.createElement("label");
    visibility.className = "checkbox-label";
    const visible = document.createElement("input");
    visible.type = "checkbox";
    visible.dataset.field = "visible";
    visible.checked = section.visible !== false;
    visibility.append(visible, document.createTextNode(" Tampilkan komponen ini"));
    card.append(heading, fields, visibility);
    return card;
  }

  function updatePageStateFromEditor() {
    const slug = state.editingPageSlug || selectedPageSlug();
    state.pages[slug] = {
      title: document.getElementById("page-title-input").value.trim() || pageLabel(slug),
      customLayout: document.getElementById("custom-layout-enabled").checked,
      sections: Array.from(document.querySelectorAll(".page-section-editor")).map(function (card) {
        const section = { id: card.dataset.sectionId };
        card.querySelectorAll("[data-field]").forEach(function (field) {
          section[field.dataset.field] = field.type === "checkbox" ? field.checked : field.value.trim();
        });
        return section;
      }),
    };
  }

  function moveSection(index, direction) {
    updatePageStateFromEditor();
    const sections = state.pages[selectedPageSlug()].sections;
    const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    const moved = sections.splice(index, 1)[0];
    sections.splice(next, 0, moved);
    renderPageEditor();
  }

  function addPageSection() {
    updatePageStateFromEditor();
    const page = state.pages[selectedPageSlug()];
    if (page.sections.length >= 40) {
      showMessage("Halaman maksimal berisi 40 komponen.", true);
      return;
    }
    page.sections.push({
      id: "section-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type: "text",
      title: "",
      body: "",
      image: "",
      url: "",
      buttonText: "",
      layout: "wide",
      visible: true,
    });
    renderPageEditor();
    const editors = document.querySelectorAll(".page-section-editor");
    if (editors.length) editors[editors.length - 1].scrollIntoView({ behavior: "smooth" });
  }

  function renderNavigation() {
    const editor = document.getElementById("navigation-editor");
    if (!editor) return;
    editor.replaceChildren();
    state.navigation.forEach(function (entry, index) {
      const row = document.createElement("div");
      row.className = "navigation-editor-row";
      const order = document.createElement("div");
      order.className = "navigation-order";
      [-1, 1].forEach(function (step) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "icon-button";
        button.textContent = step < 0 ? "↑" : "↓";
        button.setAttribute("aria-label", step < 0 ? "Naikkan tautan" : "Turunkan tautan");
        button.addEventListener("click", function () {
          const next = index + step;
          if (next < 0 || next >= state.navigation.length) return;
          const current = state.navigation.splice(index, 1)[0];
          state.navigation.splice(next, 0, current);
          renderNavigation();
        });
        order.appendChild(button);
      });

      const label = document.createElement("input");
      label.setAttribute("aria-label", "Label menu");
      label.value = entry.label;
      label.maxLength = 40;
      label.addEventListener("input", function () { entry.label = label.value; });
      const href = document.createElement("select");
      href.setAttribute("aria-label", "Halaman tujuan");
      PAGE_OPTIONS.forEach(function (page) {
        const option = document.createElement("option");
        option.value = page[0];
        option.textContent = page[1];
        href.appendChild(option);
      });
      href.value = entry.href;
      href.addEventListener("change", function () { entry.href = href.value; });

      const visibleLabel = document.createElement("label");
      visibleLabel.className = "nav-visibility";
      const visible = document.createElement("input");
      visible.type = "checkbox";
      visible.checked = entry.visible;
      visible.addEventListener("change", function () { entry.visible = visible.checked; });
      visibleLabel.append(visible, document.createTextNode(" Tampil"));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "small-button danger";
      remove.textContent = "Hapus";
      remove.addEventListener("click", function () {
        state.navigation.splice(index, 1);
        renderNavigation();
      });
      row.append(order, label, href, visibleLabel, remove);
      editor.appendChild(row);
    });
    if (!state.navigation.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Menu belum memiliki tautan.";
      editor.appendChild(empty);
    }
  }

  function addNavigationLink() {
    if (state.navigation.length >= PAGE_OPTIONS.length) {
      showMessage("Semua halaman sudah tersedia di menu.", true);
      return;
    }
    const unused = PAGE_OPTIONS.find(function (option) {
      return !state.navigation.some(function (entry) { return entry.href === option[0]; });
    });
    state.navigation.push({
      label: unused ? unused[1] : "Tautan baru",
      href: unused ? unused[0] : "index.html",
      visible: true,
    });
    renderNavigation();
  }

  function makeItemRow(item, recent) {
    const row = document.createElement("article");
    row.className = "content-row";
    if (item.image) {
      const image = document.createElement("img");
      image.className = "content-thumb";
      image.src = item.image;
      image.alt = "";
      image.loading = "lazy";
      image.onerror = function () { image.hidden = true; };
      row.appendChild(image);
    }

    const meta = document.createElement("div");
    meta.className = "content-meta";
    const title = document.createElement("b");
    title.textContent = item.title || "Tanpa judul";
    const detail = document.createElement("small");
    detail.textContent = typeLabel(item.type) + " · " +
      (item.date || "Tanpa tanggal") + " · " + (item.published ? "Tayang" : "Draft");
    meta.append(title, detail);
    row.appendChild(meta);

    if (!recent) {
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "small-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () { fillItemForm(item); });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "small-button danger";
      remove.textContent = "Hapus";
      remove.addEventListener("click", function () { removeItem(item.id); });
      actions.append(edit, remove);
      row.appendChild(actions);
    }
    return row;
  }

  function typeLabel(type) {
    return {
      news: "Berita",
      event: "Agenda",
      gallery: "Galeri",
      member: "Anggota",
      resource: "Dokumen",
      faq: "FAQ",
    }[type] || "Konten";
  }

  function renderItems() {
    const list = document.getElementById("content-list");
    const filter = document.getElementById("content-filter").value;
    list.replaceChildren();
    const visible = state.items.filter(function (item) {
      return filter === "all" || item.type === filter;
    }).sort(function (left, right) {
      return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    });
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada konten pada kategori ini.";
      list.appendChild(empty);
    } else {
      visible.forEach(function (item) { list.appendChild(makeItemRow(item, false)); });
    }

    const recent = document.getElementById("recent-content");
    recent.replaceChildren();
    const latest = state.items.slice().sort(function (left, right) {
      return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    }).slice(0, 5);
    if (!latest.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada konten. Mulai dengan menambahkan berita atau agenda.";
      recent.appendChild(empty);
    } else {
      latest.forEach(function (item) { recent.appendChild(makeItemRow(item, true)); });
    }
    renderStats();
  }

  function fillItemForm(item) {
    const form = document.getElementById("item-form");
    form.elements.namedItem("item-id").value = item.id;
    form.elements.namedItem("item-type").value = item.type;
    updateItemValidation();
    form.elements.namedItem("item-title").value = item.title;
    form.elements.namedItem("item-summary").value = item.summary || "";
    form.elements.namedItem("item-date").value = item.date || "";
    form.elements.namedItem("item-url").value = item.url || "";
    form.elements.namedItem("item-image").value = item.image || "";
    form.elements.namedItem("item-published").checked = item.published;
    document.getElementById("item-form-title").textContent = "Edit konten";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetItemForm() {
    const form = document.getElementById("item-form");
    form.reset();
    form.elements.namedItem("item-id").value = "";
    form.elements.namedItem("item-published").checked = true;
    document.getElementById("item-form-title").textContent = "Tambah konten";
    updateItemValidation();
  }

  function updateItemValidation() {
    const type = document.getElementById("item-type").value;
    document.getElementById("item-image").required = type === "gallery" || type === "member";
    document.getElementById("item-url").required = type === "resource";
  }

  async function removeItem(id) {
    if (!window.confirm("Hapus konten ini dari website?")) return;
    try {
      await request("deleteItem", { id: id });
      state.items = state.items.filter(function (item) { return item.id !== id; });
      renderItems();
      showMessage("Konten berhasil dihapus.");
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  function renderMedia() {
    const grid = document.getElementById("media-grid");
    grid.replaceChildren();
    if (!state.media.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada file. Unggah gambar atau dokumen untuk memulai.";
      grid.appendChild(empty);
      return;
    }
    state.media.slice().reverse().forEach(function (file) {
      const card = document.createElement("article");
      card.className = "media-card";
      const preview = document.createElement("div");
      preview.className = "media-preview";
      if (String(file.mimeType).indexOf("image/") === 0) {
        const image = document.createElement("img");
        image.src = file.url;
        image.alt = file.name;
        image.loading = "lazy";
        preview.appendChild(image);
      } else {
        const badge = document.createElement("span");
        badge.className = "file-badge";
        badge.textContent = file.name.split(".").pop();
        preview.appendChild(badge);
      }
      const info = document.createElement("div");
      info.className = "media-info";
      const name = document.createElement("b");
      name.textContent = file.name;
      const size = document.createElement("small");
      size.textContent = file.mimeType + " · " + formatDate(file.createdAt);
      const actions = document.createElement("div");
      actions.className = "media-actions";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "small-button";
      copy.textContent = "Salin URL";
      copy.addEventListener("click", function () {
        navigator.clipboard.writeText(file.url).then(function () {
          showMessage("URL file berhasil disalin.");
        }).catch(function () { showMessage("Tidak dapat menyalin URL di browser ini.", true); });
      });
      const use = document.createElement("button");
      use.type = "button";
      use.className = "small-button";
      use.textContent = "Gunakan";
      use.addEventListener("click", function () { useMedia(file); });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "small-button danger";
      remove.textContent = "Hapus";
      remove.addEventListener("click", function () { removeMedia(file); });
      if (String(file.mimeType).indexOf("image/") === 0) actions.appendChild(use);
      actions.append(copy, remove);
      info.append(name, size, actions);
      card.append(preview, info);
      grid.appendChild(card);
    });
  }

  function useMedia(file) {
    if (String(file.mimeType).indexOf("image/") === 0) {
      document.getElementById("item-image").value = file.url;
    } else {
      document.getElementById("item-type").value = "resource";
      document.getElementById("item-url").value = file.url;
    }
    openPanel("content");
    showMessage(String(file.mimeType).indexOf("image/") === 0
      ? "URL gambar dimasukkan ke formulir konten."
      : "URL dokumen dimasukkan ke formulir unduhan.");
  }

  async function removeMedia(file) {
    if (!window.confirm("Hapus file " + file.name + " dari Cloudinary?")) return;
    try {
      if (file.provider === "cloudinary" && file.publicId) {
        await cloudinaryRequest("delete", {
          publicId: file.publicId,
          resourceType: file.resourceType || "image",
        });
      }
      await request("deleteMedia", { id: file.id });
      state.media = state.media.filter(function (entry) { return entry.id !== file.id; });
      renderMedia();
      renderStats();
      showMessage("File berhasil dihapus.");
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Tanggal tidak diketahui" :
      date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function openPanel(name) {
    document.querySelectorAll(".side-link[data-panel]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.panel === name);
    });
    document.querySelectorAll(".panel-section").forEach(function (section) {
      section.classList.toggle("active", section.id === "panel-" + name);
    });
    const selected = document.querySelector('.side-link[data-panel="' + name + '"]');
    document.getElementById("page-title").textContent =
      name === "pages" ? pageLabel(selectedPageSlug()) :
        selected ? selected.textContent.trim().replace(/^[▦▤◈▣▧⚙]\s*/, "") : "Ringkasan";
    syncPageNavigation();
  }

  document.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const error = document.getElementById("login-error");
    setFormMessage(error, "", false);
    setBusy(form, true, "Memeriksa...");
    try {
      const result = await request("login", {
        username: form.elements.namedItem("username").value,
        password: form.elements.namedItem("password").value,
      });
      sessionStorage.setItem(TOKEN_KEY, result.token);
      sessionStorage.setItem(USER_KEY, result.username);
      await loadAdminData();
      showApp(result.username);
    } catch (exception) {
      clearSession();
      showLogin();
      setFormMessage(error, exception.message, true);
    } finally {
      setBusy(form, false);
    }
  });

  document.getElementById("logout-button").addEventListener("click", function () {
    clearSession();
    showLogin();
    document.getElementById("login-form").reset();
  });

  document.querySelectorAll(".side-link[data-panel]").forEach(function (button) {
    button.addEventListener("click", function () { openPanel(button.dataset.panel); });
  });
  document.querySelectorAll("[data-go]").forEach(function (button) {
    button.addEventListener("click", function () { openPanel(button.dataset.go); });
  });
  document.getElementById("page-navigation").addEventListener("click", function (event) {
    const link = event.target.closest("[data-page-slug]");
    if (link) openPageEditor(link.dataset.pageSlug);
  });
  document.getElementById("page-shortcuts").addEventListener("click", function (event) {
    const link = event.target.closest("[data-page-slug]");
    if (link) openPageEditor(link.dataset.pageSlug);
  });
  document.getElementById("content-filter").addEventListener("change", renderItems);
  document.getElementById("reset-item").addEventListener("click", resetItemForm);
  document.getElementById("item-type").addEventListener("change", updateItemValidation);
  updateItemValidation();
  document.getElementById("page-select").addEventListener("change", function () {
    updatePageStateFromEditor();
    renderPageEditor();
    openPanel("pages");
  });
  document.getElementById("add-page-section").addEventListener("click", addPageSection);
  document.getElementById("page-sections-list").addEventListener("input", updatePageStateFromEditor);
  document.getElementById("page-sections-list").addEventListener("change", updatePageStateFromEditor);
  document.getElementById("page-title-input").addEventListener("input", updatePageStateFromEditor);
  document.getElementById("custom-layout-enabled").addEventListener("change", updatePageStateFromEditor);
  document.getElementById("preview-page").addEventListener("click", function () {
    window.open(selectedPageSlug(), "_blank", "noopener");
  });
  document.getElementById("save-page").addEventListener("click", async function (event) {
    updatePageStateFromEditor();
    const slug = selectedPageSlug();
    const page = state.pages[slug];
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const saved = await request("savePage", {
        page: {
          slug: slug,
          title: page.title,
          customLayout: page.customLayout,
          sections: page.sections,
        },
      });
      state.pages[slug] = saved;
      showMessage("Halaman " + pageLabel(slug) + " berhasil disimpan.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById("add-nav-link").addEventListener("click", addNavigationLink);
  document.getElementById("save-navigation").addEventListener("click", async function (event) {
    const button = event.currentTarget;
    const links = state.navigation.map(function (entry) {
      return {
        label: entry.label.trim(),
        href: entry.href,
        visible: entry.visible,
      };
    });
    if (links.some(function (entry) { return !entry.label; })) {
      showMessage("Semua tautan menu harus memiliki nama.", true);
      return;
    }
    button.disabled = true;
    try {
      const result = await request("saveSettings", {
        settings: { navigation: JSON.stringify(links) },
      });
      state.settings = result;
      state.navigation = parseNavigation(result.navigation);
      renderNavigation();
      showMessage("Navigasi berhasil disimpan.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("item-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const item = {
      id: form.elements.namedItem("item-id").value,
      type: form.elements.namedItem("item-type").value,
      title: form.elements.namedItem("item-title").value,
      summary: form.elements.namedItem("item-summary").value,
      date: form.elements.namedItem("item-date").value,
      url: form.elements.namedItem("item-url").value,
      image: form.elements.namedItem("item-image").value,
      published: form.elements.namedItem("item-published").checked,
    };
    setBusy(form, true);
    try {
      const saved = await request("saveItem", { item: item });
      const index = state.items.findIndex(function (entry) { return entry.id === saved.id; });
      if (index < 0) state.items.push(saved);
      else state.items[index] = saved;
      resetItemForm();
      renderItems();
      showMessage("Konten berhasil disimpan.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setBusy(form, false);
    }
  });

  document.getElementById("settings-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const settings = {};
    Array.from(form.elements).forEach(function (field) {
      if (field.name) settings[field.name] = field.value.trim();
    });
    setBusy(form, true);
    try {
      state.settings = await request("saveSettings", { settings: settings });
      showMessage("Tampilan website berhasil diperbarui.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setBusy(form, false);
    }
  });

  document.getElementById("upload-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.namedItem("file").files[0];
    const status = document.getElementById("upload-status");
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setFormMessage(status, "Ukuran file maksimal 3 MB.", true);
      return;
    }
    setBusy(form, true, "Mengunggah...");
    const supportedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!supportedTypes.includes(file.type)) {
      setFormMessage(status, "Format file ini tidak didukung.", true);
      return;
    }
    setFormMessage(status, "Menghubungkan ke Cloudinary...", false);
    try {
      const credentials = await cloudinaryRequest("sign-upload");
      const resourceType = file.type.indexOf("image/") === 0 ? "image" : "raw";
      const data = new FormData();
      data.append("file", file);
      data.append("api_key", credentials.apiKey);
      data.append("timestamp", String(credentials.timestamp));
      data.append("signature", credentials.signature);
      data.append("folder", credentials.folder);
      data.append("use_filename", "true");
      data.append("unique_filename", "true");
      const uploadResponse = await fetch(
        "https://api.cloudinary.com/v1_1/" + encodeURIComponent(credentials.cloudName) +
          "/" + resourceType + "/upload",
        { method: "POST", body: data }
      );
      const cloudFile = await uploadResponse.json();
      if (!uploadResponse.ok || !cloudFile.secure_url || !cloudFile.public_id) {
        throw new Error(cloudFile.error && cloudFile.error.message || "Cloudinary gagal mengunggah file.");
      }
      const uploaded = await request("saveMedia", {
        file: {
          name: file.name,
          mimeType: file.type,
          url: cloudFile.secure_url,
          publicId: cloudFile.public_id,
          resourceType: resourceType,
        },
      });
      state.media.push(uploaded);
      form.reset();
      renderMedia();
      renderStats();
      setFormMessage(status, "File berhasil diunggah ke Cloudinary.", false);
    } catch (error) {
      setFormMessage(status, error.message, true);
    } finally {
      setBusy(form, false);
    }
  });

  document.getElementById("password-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const currentPassword = form.elements.namedItem("current-password").value;
    const newPassword = form.elements.namedItem("new-password").value;
    if (newPassword !== form.elements.namedItem("confirm-password").value) {
      showMessage("Konfirmasi password baru tidak sama.", true);
      return;
    }
    setBusy(form, true, "Memperbarui...");
    try {
      await request("changePassword", { currentPassword: currentPassword, newPassword: newPassword });
      form.reset();
      showMessage("Password berhasil diubah.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      setBusy(form, false);
    }
  });

  const existingToken = sessionStorage.getItem(TOKEN_KEY);
  if (!existingToken) {
    showLogin();
    return;
  }
  showApp(sessionStorage.getItem(USER_KEY) || "Admin");
  loadAdminData().catch(function (error) {
    clearSession();
    showLogin();
    setFormMessage(document.getElementById("login-error"), error.message, true);
  });
})();
