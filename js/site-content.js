(function () {
  "use strict";

  const PAGE_TYPES = {
    "berita.html": { type: "news", title: "Berita & Informasi" },
    "agenda.html": { type: "event", title: "Agenda Kegiatan" },
    "unduhan.html": { type: "resource", title: "Dokumen & Unduhan" },
    "faq.html": { type: "faq", title: "Pertanyaan Umum" },
  };
  const DEFAULT_NAVIGATION = [
    { href: "index.html", label: "Beranda" },
    { href: "tentang.html", label: "Tentang" },
    { href: "kegiatan.html", label: "Kegiatan" },
    { href: "anggota.html", label: "Anggota" },
    { href: "sosialmedia.html", label: "Sosial media" },
    { href: "pendaftaran.html", label: "Pendaftaran" },
    { href: "berita.html", label: "Berita" },
    { href: "agenda.html", label: "Agenda" },
    { href: "unduhan.html", label: "Unduhan" },
    { href: "faq.html", label: "FAQ" },
  ];
  let siteHeader;

  function safeUrl(value) {
    const url = String(value || "").trim();
    return /^https:\/\//i.test(url) || /^\/(?!\/)/.test(url) || /^\.\//.test(url) ? url : "";
  }

  function mountNavbar(settings) {
    document.querySelectorAll("body > header").forEach(function (header) { header.remove(); });
    siteHeader = document.createElement("header");
    siteHeader.className = "site-header";
    const bar = document.createElement("div");
    bar.className = "site-header-inner";
    const brand = document.createElement("a");
    brand.className = "site-brand";
    brand.href = "index.html";
    const logo = document.createElement("img");
    logo.src = safeUrl(settings.logoUrl) || "./img/logogic.png";
    logo.alt = "";
    const label = document.createElement("span");
    label.textContent = settings.siteName || "Duta GenRe HSU";
    brand.append(logo, label);
    const controls = document.createElement("div");
    controls.className = "site-menu-controls";
    const menuLabel = document.createElement("span");
    menuLabel.textContent = "JELAJAHI";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "site-menu-toggle";
    toggle.setAttribute("aria-label", "Buka navigasi");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "site-menu-popover");
    toggle.innerHTML = '<span class="site-menu-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    controls.append(menuLabel, toggle);
    bar.append(brand, controls);

    const menu = document.createElement("nav");
    menu.id = "site-menu-popover";
    menu.className = "site-menu-popover";
    menu.setAttribute("aria-label", "Menu utama");
    menu.hidden = true;
    let navigation = DEFAULT_NAVIGATION;
    try {
      const configured = JSON.parse(settings.navigation || "[]");
      if (Array.isArray(configured) && configured.length) navigation = configured;
    } catch (error) {
      console.warn("Konfigurasi menu tidak valid; menggunakan menu bawaan.");
    }
    navigation.filter(function (entry) {
      return entry && entry.visible !== false && PAGE_TYPES_HAS_SLUG(entry.href) &&
        String(entry.label || "").trim();
    }).forEach(function (entry, index) {
      const link = document.createElement("a");
      link.className = "site-menu-link";
      link.href = entry.href;
      link.style.setProperty("--menu-index", String(index));
      const number = document.createElement("span");
      number.className = "site-menu-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const text = document.createElement("span");
      text.textContent = entry.label;
      const arrow = document.createElement("span");
      arrow.className = "site-menu-arrow";
      arrow.textContent = "↗";
      link.append(number, text, arrow);
      menu.appendChild(link);
    });

    const home = location.pathname.split("/").pop() || "index.html";
    const active = menu.querySelector('a[href="' + home + '"]');
    if (active) active.setAttribute("aria-current", "page");
    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Tutup navigasi" : "Buka navigasi");
      menu.hidden = !open;
      siteHeader.classList.toggle("menu-open", open);
    });
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Buka navigasi");
        siteHeader.classList.remove("menu-open");
      }
    });
    document.addEventListener("click", function (event) {
      if (!siteHeader.contains(event.target) && !menu.hidden) {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Buka navigasi");
        siteHeader.classList.remove("menu-open");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
        siteHeader.classList.remove("menu-open");
      }
    });
    siteHeader.append(bar, menu);
    document.body.insertBefore(siteHeader, document.body.firstChild);
  }

  function PAGE_TYPES_HAS_SLUG(value) {
    return DEFAULT_NAVIGATION.some(function (entry) { return entry.href === value; });
  }

  function addPublicFooter() {
    const footer = document.querySelector("footer, body > .text-sm.text-gray-400");
    if (!footer) return;
    if (!footer.querySelector(".admin-entry")) {
      const link = document.createElement("a");
      link.href = "admin.html";
      link.className = "admin-entry";
      link.textContent = "Admin";
      footer.appendChild(link);
    }
    if (!footer.querySelector("[data-site-whatsapp]")) {
      const whatsapp = document.createElement("a");
      whatsapp.dataset.siteWhatsapp = "";
      whatsapp.className = "admin-entry";
      whatsapp.textContent = "Hubungi kami";
      whatsapp.hidden = true;
      footer.appendChild(whatsapp);
    }
  }

  function applySettings(settings) {
    document.documentElement.style.setProperty("--primary", settings.primaryColor || "#1a365d");
    document.documentElement.style.setProperty("--accent", settings.primaryColor || "#1a365d");
    document.querySelectorAll("[data-site]").forEach(function (element) {
      const key = element.dataset.site;
      if (settings[key] == null) return;
      if (element instanceof HTMLImageElement) {
        const url = safeUrl(settings[key]);
        if (url) element.src = url;
      } else {
        element.textContent = settings[key];
      }
    });

    if (settings.siteName) {
      document.title = document.title.replace(/Duta GenRe HSU|DUTA GENRE HSU|Genre HSU/ig, settings.siteName);
    }
    const hero = document.querySelector(".hero");
    const heroImage = safeUrl(settings.heroImage);
    if (hero && heroImage) {
      hero.style.backgroundImage = "linear-gradient(135deg, rgba(13,31,56,.48), rgba(13,31,56,.32)), url('" +
        heroImage.replace(/'/g, "%27") + "')";
      hero.style.backgroundPosition = "center";
      hero.style.backgroundSize = "cover";
    }

    const announcement = document.querySelector("[data-site-announcement]");
    if (announcement && settings.announcement) {
      announcement.textContent = settings.announcement;
      announcement.hidden = false;
    } else if (announcement) {
      announcement.hidden = true;
    }

    const registration = safeUrl(settings.registrationUrl);
    document.querySelectorAll("[data-site-registration]").forEach(function (link) {
      if (registration) {
        link.dataset.siteRegistration = registration;
        if (link.tagName === "A") link.href = registration;
      }
    });
    const instagram = safeUrl(settings.instagramUrl);
    document.querySelectorAll("[data-site-instagram]").forEach(function (link) {
      if (instagram) link.href = instagram;
    });
    const whatsapp = safeUrl(settings.whatsappUrl);
    document.querySelectorAll("[data-site-whatsapp]").forEach(function (link) {
      if (whatsapp) {
        link.href = whatsapp;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.hidden = false;
      }
    });

    document.querySelectorAll("footer p, body > .text-sm.text-gray-400").forEach(function (footer) {
      if (!settings.footerText) return;
      if (footer.tagName === "P") {
        footer.textContent = settings.footerText;
      } else {
        const textNode = Array.from(footer.childNodes).find(function (node) {
          return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
        });
        if (textNode) textNode.textContent = settings.footerText;
      }
    });
  }

  function cardFor(item) {
    const card = document.createElement("article");
    card.className = "site-content-card";
    if (item.image && safeUrl(item.image)) {
      const image = document.createElement("img");
      image.className = "site-content-image";
      image.src = safeUrl(item.image);
      image.alt = item.title || "";
      image.loading = "lazy";
      card.appendChild(image);
    }
    const content = document.createElement("div");
    content.className = "site-content-card-body";
    if (item.date) {
      const date = document.createElement("p");
      date.className = "site-content-date";
      date.textContent = item.date;
      content.appendChild(date);
    }
    const title = document.createElement("h2");
    title.textContent = item.title || "Informasi";
    content.appendChild(title);
    if (item.summary) {
      const summary = document.createElement("p");
      summary.textContent = item.summary;
      content.appendChild(summary);
    }
    const url = safeUrl(item.url);
    if (url && item.type === "resource") {
      const link = document.createElement("a");
      link.className = "site-content-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Lihat / unduh dokumen ↗";
      content.appendChild(link);
    } else if (url) {
      const link = document.createElement("a");
      link.className = "site-content-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Informasi selengkapnya ↗";
      content.appendChild(link);
    }
    card.appendChild(content);
    return card;
  }

  function renderCustomPage(slug, page, settings) {
    const scripts = Array.from(document.body.querySelectorAll("script"));
    document.body.replaceChildren(siteHeader);
    const main = document.createElement("main");
    main.className = "cms-page-shell";
    (page.sections || []).filter(function (section) { return section.visible !== false; })
      .forEach(function (section) {
        const block = document.createElement("section");
        block.className = "cms-block cms-block-" + section.type +
          " cms-layout-" + (section.layout || "wide");
        if (section.type === "hero") {
          block.classList.add("cms-hero");
          const imageUrl = safeUrl(section.image);
          if (imageUrl) block.style.setProperty("--cms-hero-image", "url('" + imageUrl.replace(/'/g, "%27") + "')");
        }

        if (section.image && section.type !== "hero" && safeUrl(section.image)) {
          const image = document.createElement("img");
          image.className = "cms-block-image";
          image.src = safeUrl(section.image);
          image.alt = section.title || "";
          image.loading = "lazy";
          block.appendChild(image);
        }

        const body = document.createElement("div");
        body.className = "cms-block-copy";
        if (section.title) {
          const title = document.createElement(section.type === "hero" ? "h1" : "h2");
          title.textContent = section.title;
          body.appendChild(title);
        }

        if (section.type === "cards" || section.type === "gallery") {
          const grid = document.createElement("div");
          grid.className = section.type === "gallery" ? "cms-gallery-grid" : "cms-cards-grid";
          String(section.body || "").split(/\r?\n/).filter(function (line) { return line.trim(); })
            .forEach(function (line) {
              const parts = line.split("|").map(function (part) { return part.trim(); });
              const card = document.createElement("article");
              card.className = section.type === "gallery" ? "cms-gallery-card" : "cms-content-card";
              const imageUrl = safeUrl(parts[3] || "");
              if (imageUrl) {
                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = parts[0] || "";
                image.loading = "lazy";
                card.appendChild(image);
              }
              const cardTitle = document.createElement("h3");
              cardTitle.textContent = parts[0] || "Informasi";
              card.appendChild(cardTitle);
              if (parts[1]) {
                const description = document.createElement("p");
                description.textContent = parts[1];
                card.appendChild(description);
              }
              const href = safeUrl(parts[2] || "");
              if (href) {
                const link = document.createElement("a");
                link.href = href;
                link.textContent = "Selengkapnya ↗";
                card.appendChild(link);
              }
              grid.appendChild(card);
            });
          body.appendChild(grid);
        } else if (section.body && section.type !== "image") {
          const paragraph = document.createElement("p");
          paragraph.textContent = section.body;
          body.appendChild(paragraph);
        }

        const buttonUrl = safeUrl(section.url);
        if (buttonUrl && section.type !== "cards" && section.type !== "gallery") {
          const link = document.createElement("a");
          link.className = "cms-block-button";
          link.href = buttonUrl;
          link.textContent = section.buttonText || "Selengkapnya";
          if (/^https:\/\//i.test(buttonUrl)) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
          body.appendChild(link);
        }
        block.appendChild(body);
        main.appendChild(block);
      });

    const footer = document.createElement("footer");
    footer.className = "organization-footer";
    const footerText = document.createElement("p");
    footerText.textContent = settings.footerText ||
      ("© " + new Date().getFullYear() + " Duta GenRe HSU");
    footer.appendChild(footerText);
    document.body.append(main, footer);
    scripts.forEach(function (script) { document.body.appendChild(script); });
    document.title = page.title + " | " + (document.querySelector(".site-brand span").textContent || "Duta GenRe");
    addPublicFooter();
  }

  function renderItems(items) {
    const currentSlug = location.pathname.split("/").pop() || "index.html";
    if (window.__genreCustomPage) return;
    const currentPage = PAGE_TYPES[location.pathname.split("/").pop()];
    if (currentPage) {
      const container = document.getElementById("public-items");
      const filtered = items.filter(function (item) { return item.type === currentPage.type; });
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "site-empty-state";
        empty.textContent = "Informasi akan diperbarui. Silakan kembali lagi nanti.";
        container.appendChild(empty);
      } else {
        filtered.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); })
          .forEach(function (item) {
            if (item.type === "faq") {
              const details = document.createElement("details");
              details.className = "site-faq-item";
              const question = document.createElement("summary");
              question.textContent = item.title;
              const answer = document.createElement("p");
              answer.textContent = item.summary || "Informasi lebih lanjut akan segera diperbarui.";
              details.append(question, answer);
              container.appendChild(details);
            } else {
              container.appendChild(cardFor(item));
            }
          });
      }
      const search = document.querySelector("[data-content-search]");
      if (search) {
        search.addEventListener("input", function () {
          const query = search.value.trim().toLocaleLowerCase("id");
          container.querySelectorAll(".site-content-card").forEach(function (card) {
            card.hidden = !card.textContent.toLocaleLowerCase("id").includes(query);
          });
        });
      }
      return;
    }

    const featured = document.querySelector("[data-site-featured]");
    if (featured) {
      const selection = items.filter(function (item) {
        return item.type === "news" || item.type === "event";
      }).sort(function (a, b) {
        return String(b.updatedAt || b.date || "").localeCompare(String(a.updatedAt || a.date || ""));
      }).slice(0, 3);
      if (selection.length) {
        featured.hidden = false;
        const grid = featured.querySelector(".site-content-grid");
        selection.forEach(function (item) { grid.appendChild(cardFor(item)); });
      }
    }

    if (location.pathname.endsWith("/kegiatan.html")) {
      const gallery = items.filter(function (item) { return item.type === "gallery"; });
      if (gallery.length) {
        const section = document.getElementById("cms-gallery-section");
        const container = document.getElementById("cms-gallery");
        section.hidden = false;
        gallery.forEach(function (item) { container.appendChild(cardFor(item)); });
        const legacyGallery = document.getElementById("Kegitan");
        if (legacyGallery) legacyGallery.hidden = true;
      }
    }

    if (location.pathname.endsWith("/anggota.html")) {
      const members = items.filter(function (item) { return item.type === "member"; });
      if (members.length) {
        const container = document.getElementById("cms-members-grid");
        container.hidden = false;
        members.forEach(function (item) { container.appendChild(cardFor(item)); });
        document.getElementById("members-static-grid").hidden = true;
      }
    }

    document.querySelectorAll("[data-site-faq]").forEach(function (container) {
      items.filter(function (item) { return item.type === "faq"; }).forEach(function (item) {
        const details = document.createElement("details");
        details.className = "site-faq-item";
        const summary = document.createElement("summary");
        summary.textContent = item.title;
        const answer = document.createElement("p");
        answer.textContent = item.summary;
        details.append(summary, answer);
        container.appendChild(details);
      });
    });

    if (currentSlug === "kegiatan.html") {
      const gallery = items.filter(function (item) { return item.type === "gallery"; });
      if (gallery.length) {
        const section = document.getElementById("cms-gallery-section");
        const container = document.getElementById("cms-gallery");
        if (section && container) {
          section.hidden = false;
          gallery.forEach(function (item) { container.appendChild(cardFor(item)); });
          const original = document.getElementById("Kegitan");
          if (original) original.hidden = true;
        }
      }
    }

    if (currentSlug === "anggota.html") {
      const members = items.filter(function (item) { return item.type === "member"; });
      const container = document.getElementById("cms-members-grid");
      if (members.length && container) {
        container.hidden = false;
        members.forEach(function (item) { container.appendChild(cardFor(item)); });
        const original = document.getElementById("members-static-grid");
        if (original) original.hidden = true;
      }
    }
  }

  async function loadContent() {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "public" }),
      });
      if (!response.ok) throw new Error("Status " + response.status);
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Data publik tidak tersedia.");
      const data = result.data || {};
      mountNavbar(data.settings || {});
      applySettings(data.settings || {});
      const slug = location.pathname.split("/").pop() || "index.html";
      if (data.pages && data.pages[slug]) {
        window.__genreCustomPage = true;
        renderCustomPage(slug, data.pages[slug], data.settings || {});
      }
      addPublicFooter();
      renderItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.warn("Konten dinamis belum tersedia:", error.message);
      mountNavbar({});
      addPublicFooter();
      if (PAGE_TYPES[location.pathname.split("/").pop()]) {
        const container = document.getElementById("public-items");
        if (container && !container.childElementCount) {
          const message = document.createElement("p");
          message.className = "site-empty-state";
          message.textContent = "Informasi belum dapat dimuat. Silakan coba kembali beberapa saat lagi.";
          container.appendChild(message);
        }
      }
    }
  }

  loadContent();
})();
