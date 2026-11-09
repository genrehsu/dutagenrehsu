const SHEETS = {
  users: "Users",
  settings: "Settings",
  content: "Content",
  media: "Media",
  pages: "Pages",
};
const ITEM_TYPES = ["news", "event", "gallery", "member", "resource", "faq"];
const PAGE_SLUGS = [
  "index.html", "tentang.html", "kegiatan.html", "anggota.html",
  "sosialmedia.html", "pendaftaran.html", "berita.html", "agenda.html",
  "unduhan.html", "faq.html",
];
const CONTENT_HEADERS = [
  "id", "type", "title", "summary", "url", "image", "date", "published", "updatedAt",
];
const MEDIA_HEADERS = [
  "id", "name", "mimeType", "url", "fileId", "createdAt",
  "provider", "publicId", "resourceType",
];
const PAGE_HEADERS = ["slug", "title", "customLayout", "sectionsJson", "updatedAt"];

function doPost(event) {
  try {
    const input = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const action = String(input.action || "");
    let result;

    if (action === "public") {
      result = getPublicData_();
    } else if (action === "login") {
      result = login_(input.username, input.password);
    } else if (action === "verifySession") {
      result = { username: requireSession_(input.token) };
    } else {
      const username = requireSession_(input.token);
      switch (action) {
        case "admin":
          result = getAdminData_();
          break;
        case "saveSettings":
          result = saveSettings_(input.settings);
          break;
        case "saveItem":
          result = saveItem_(input.item, username);
          break;
        case "deleteItem":
          result = deleteItem_(input.id);
          break;
        case "saveMedia":
          result = saveMedia_(input.file);
          break;
        case "savePage":
          result = savePage_(input.page);
          break;
        case "deletePage":
          result = deletePage_(input.slug);
          break;
        case "deleteMedia":
          result = deleteMedia_(input.id);
          break;
        case "changePassword":
          result = changePassword_(username, input.currentPassword, input.newPassword);
          break;
        default:
          throw new Error("Aksi tidak dikenali.");
      }
    }

    return jsonOutput_({ ok: true, data: result });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message || "Terjadi kesalahan." });
  }
}

function initializeCms() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Buka Apps Script dari Google Sheet yang akan digunakan.");

  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", spreadsheet.getId());
  if (!PropertiesService.getScriptProperties().getProperty("SESSION_SECRET")) {
    PropertiesService.getScriptProperties().setProperty(
      "SESSION_SECRET",
      Utilities.getUuid() + Utilities.getUuid()
    );
  }

  const settings = ensureSheet_(SHEETS.settings, ["key", "value"]);
  const content = ensureSheet_(SHEETS.content, CONTENT_HEADERS);
  const media = ensureSheet_(SHEETS.media, MEDIA_HEADERS);
  const pages = ensureSheet_(SHEETS.pages, PAGE_HEADERS);
  ensureSheet_(SHEETS.users, ["username", "salt", "passwordHash", "active"]);

  if (settings.getLastRow() === 1) {
    const defaults = [
      ["siteName", "Duta GenRe HSU"],
      ["tagline", "Generasi Berencana, Generasi Berkualitas"],
      ["heroTitle", "Duta Genre Kabupaten Hulu Sungai Utara"],
      ["heroSubtitle", "Duta Generasi Berencana Kabupaten Hulu Sungai Utara"],
      ["aboutTitle", "Tentang Kami"],
      ["aboutText", "Duta GenRe adalah figur remaja teladan dan agen perubahan yang mengajak remaja merencanakan masa depan yang berkualitas dan berkarakter. Karena berencana itu keren!"],
      ["heroImage", "./img/background.png"],
      ["aboutImage", "./img/tentang.jpg"],
      ["logoUrl", "./img/logogic.png"],
      ["registrationUrl", "https://docs.google.com/forms/d/e/1FAIpQLScvQrcstL0je--yk8kCiCXVS2rWf9-GCn6D2xvryEEf1fiGVg/viewform?usp=header"],
      ["whatsappUrl", ""],
      ["instagramUrl", "https://instagram.com/dutagenre_hsu"],
      ["primaryColor", "#1a365d"],
      ["footerText", "© 2025 Duta GenRe HSU"],
      ["announcement", ""],
      ["navigation", ""],
    ];
    settings.getRange(2, 1, defaults.length, 2).setValues(defaults);
  }
  [settings, content, media, pages].forEach(function (sheet) {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
  });
  Logger.log("CMS siap. Jalankan setupAdminAccount() untuk membuat akun administrator.");
}

function setupAdminAccount() {
  const ui = SpreadsheetApp.getUi();
  const usernamePrompt = ui.prompt(
    "Buat akun administrator",
    "Masukkan username admin:",
    ui.ButtonSet.OK_CANCEL
  );
  if (usernamePrompt.getSelectedButton() !== ui.Button.OK) return;
  const passwordPrompt = ui.prompt(
    "Buat akun administrator",
    "Masukkan password minimal 12 karakter:",
    ui.ButtonSet.OK_CANCEL
  );
  if (passwordPrompt.getSelectedButton() !== ui.Button.OK) return;

  const username = usernamePrompt.getResponseText().trim();
  const password = passwordPrompt.getResponseText();
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
    throw new Error("Username harus 3-40 karakter dan hanya boleh berisi huruf, angka, titik, _ atau -.");
  }
  if (password.length < 12) throw new Error("Password minimal 12 karakter.");

  const sheet = getSheet_(SHEETS.users);
  const data = sheet.getDataRange().getValues();
  const salt = Utilities.getUuid();
  const row = [username, salt, hashPassword_(salt, password), true];
  const existingRow = data.findIndex(function (entry, index) {
    return index > 0 && String(entry[0]).toLowerCase() === username.toLowerCase();
  });
  if (existingRow > 0) {
    sheet.getRange(existingRow + 1, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  ui.alert("Akun admin berhasil disimpan. Hash password tersimpan di tab Users.");
}

function getPublicData_() {
  const allSettings = readSettings_();
  const publicKeys = [
    "siteName", "tagline", "heroTitle", "heroSubtitle", "aboutTitle", "aboutText",
    "heroImage", "aboutImage", "logoUrl", "registrationUrl", "whatsappUrl",
    "instagramUrl", "primaryColor", "footerText", "announcement", "navigation",
  ];
  const settings = publicKeys.reduce(function (result, key) {
    if (Object.prototype.hasOwnProperty.call(allSettings, key)) result[key] = allSettings[key];
    return result;
  }, {});
  const items = readObjects_(getSheet_(SHEETS.content), CONTENT_HEADERS)
    .filter(function (item) { return item.published === true || item.published === "TRUE"; });
  const pages = readObjects_(getSheet_(SHEETS.pages), PAGE_HEADERS)
    .filter(function (page) { return page.customLayout; })
    .reduce(function (result, page) {
      let sections = [];
      try {
        sections = JSON.parse(page.sectionsJson || "[]");
      } catch (error) {
        console.error("Invalid page content for " + page.slug, error);
      }
      result[page.slug] = {
        title: page.title,
        sections: Array.isArray(sections) ? sections : [],
      };
      return result;
    }, {});
  return { settings: settings, items: items, pages: pages };
}

function getAdminData_() {
  return {
    settings: readSettings_(),
    items: readObjects_(getSheet_(SHEETS.content), CONTENT_HEADERS),
    media: readObjects_(getSheet_(SHEETS.media), MEDIA_HEADERS),
    pages: readObjects_(getSheet_(SHEETS.pages), PAGE_HEADERS),
  };
}

function login_(usernameValue, passwordValue) {
  const username = String(usernameValue || "").trim();
  const password = String(passwordValue || "");
  if (!username || !password) throw new Error("Username dan password wajib diisi.");
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || password.length > 256) {
    throw new Error("Username atau password tidak valid.");
  }
  const cache = CacheService.getScriptCache();
  const rateKey = "login:" + hashPassword_("rate", username.toLowerCase());
  const attempts = Number(cache.get(rateKey) || 0);
  if (attempts >= 8) throw new Error("Terlalu banyak percobaan. Coba lagi dalam 15 menit.");

  const rows = getSheet_(SHEETS.users).getDataRange().getValues();
  const account = rows.slice(1).find(function (row) {
    return String(row[0]).toLowerCase() === username.toLowerCase() &&
      (row[3] === true || String(row[3]).toUpperCase() === "TRUE");
  });
  if (!account || hashPassword_(String(account[1]), password) !== String(account[2])) {
    cache.put(rateKey, String(attempts + 1), 900);
    throw new Error("Username atau password salah.");
  }
  cache.remove(rateKey);
  const expiresAt = Date.now() + 6 * 60 * 60 * 1000;
  const payload = base64UrlEncode_(JSON.stringify({ username: String(account[0]), exp: expiresAt }));
  const signature = sign_(payload);
  return { token: payload + "." + signature, username: String(account[0]), expiresAt: expiresAt };
}

function requireSession_(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) {
    throw new Error("Sesi tidak valid. Silakan masuk kembali.");
  }
  let payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (error) {
    throw new Error("Sesi tidak valid. Silakan masuk kembali.");
  }
  if (!payload.username || Number(payload.exp) <= Date.now()) {
    throw new Error("Sesi telah berakhir. Silakan masuk kembali.");
  }
  const rows = getSheet_(SHEETS.users).getDataRange().getValues();
  const active = rows.slice(1).some(function (row) {
    return String(row[0]) === payload.username &&
      (row[3] === true || String(row[3]).toUpperCase() === "TRUE");
  });
  if (!active) throw new Error("Akun tidak aktif. Silakan hubungi administrator.");
  return payload.username;
}

function saveSettings_(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Pengaturan tidak valid.");
  }
  const allowed = [
    "siteName", "tagline", "heroTitle", "heroSubtitle", "aboutTitle", "aboutText",
    "heroImage", "aboutImage", "logoUrl", "registrationUrl", "whatsappUrl",
    "instagramUrl", "primaryColor", "footerText", "announcement", "navigation",
  ];
  const sheet = getSheet_(SHEETS.settings);
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);
  allowed.forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) return;
    const value = String(input[key] == null ? "" : input[key]).trim();
    if (value.length > 5000) throw new Error("Nilai pengaturan terlalu panjang: " + key);
    if (key === "navigation" && value) {
      let links;
      try {
        links = JSON.parse(value);
      } catch (error) {
        throw new Error("Format navigasi tidak valid.");
      }
      if (!Array.isArray(links) || links.length > PAGE_SLUGS.length) {
        throw new Error("Jumlah tautan navigasi tidak valid.");
      }
      links.forEach(function (link) {
        if (!link || PAGE_SLUGS.indexOf(String(link.href)) < 0 ||
            !String(link.label || "").trim() || String(link.label).length > 40) {
          throw new Error("Tautan navigasi hanya dapat menuju halaman website yang tersedia.");
        }
      });
    }
    const rowIndex = rows.findIndex(function (row) { return String(row[0]) === key; });
    if (rowIndex < 0) sheet.appendRow([key, value]);
    else sheet.getRange(rowIndex + 2, 2).setValue(value);
  });
  return readSettings_();
}

function saveItem_(input) {
  if (!input || ITEM_TYPES.indexOf(String(input.type)) < 0) {
    throw new Error("Jenis konten tidak valid.");
  }
  const item = {
    id: String(input.id || Utilities.getUuid()),
    type: String(input.type),
    title: cleanText_(input.title, 180, "Judul"),
    summary: String(input.summary || "").trim(),
    url: safeUrl_(input.url || ""),
    image: safeUrl_(input.image || ""),
    date: String(input.date || "").trim(),
    published: input.published !== false,
    updatedAt: new Date().toISOString(),
  };
  if (item.summary.length > 5000) throw new Error("Deskripsi maksimal 5000 karakter.");
  if (item.date.length > 30) throw new Error("Tanggal maksimal 30 karakter.");
  if ((item.type === "gallery" || item.type === "member") && !item.image) {
    throw new Error("Konten galeri dan anggota harus memiliki gambar.");
  }
  if (item.type === "resource" && !item.url) {
    throw new Error("Konten dokumen harus memiliki tautan file.");
  }
  const sheet = getSheet_(SHEETS.content);
  const rows = sheet.getDataRange().getValues();
  const existingRow = rows.findIndex(function (row, index) {
    return index > 0 && String(row[0]) === item.id;
  });
  const values = CONTENT_HEADERS.map(function (header) { return item[header]; });
  if (existingRow > 0) sheet.getRange(existingRow + 1, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  return item;
}

function deleteItem_(id) {
  const sheet = getSheet_(SHEETS.content);
  const rows = sheet.getDataRange().getValues();
  const rowIndex = rows.findIndex(function (row, index) {
    return index > 0 && String(row[0]) === String(id || "");
  });
  if (rowIndex < 1) throw new Error("Konten tidak ditemukan.");
  sheet.deleteRow(rowIndex + 1);
  return { id: String(id) };
}

function saveMedia_(input) {
  if (!input || !input.name || !input.mimeType || !input.url || !input.publicId) {
    throw new Error("Informasi media Cloudinary tidak lengkap.");
  }
  const mimeType = String(input.mimeType).toLowerCase();
  const resourceType = String(input.resourceType || "");
  if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.ms-(excel|powerpoint))$/.test(mimeType)) {
    throw new Error("Format file tidak didukung.");
  }
  if (!["image", "raw"].includes(resourceType)) throw new Error("Jenis file Cloudinary tidak valid.");
  const record = {
    id: Utilities.getUuid(),
    name: cleanText_(input.name, 120, "Nama file"),
    mimeType: mimeType,
    url: safeUrl_(input.url),
    fileId: "",
    createdAt: new Date().toISOString(),
    provider: "cloudinary",
    publicId: cleanText_(input.publicId, 250, "ID file"),
    resourceType: resourceType,
  };
  appendObject_(getSheet_(SHEETS.media), record);
  return record;
}

function deleteMedia_(id) {
  const sheet = getSheet_(SHEETS.media);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  const rowIndex = rows.findIndex(function (row, index) {
    return index > 0 && String(row[headers.indexOf("id")]) === String(id || "");
  });
  if (rowIndex < 1) throw new Error("File tidak ditemukan.");
  const providerIndex = headers.indexOf("provider");
  const fileIdIndex = headers.indexOf("fileId");
  const fileId = fileIdIndex < 0 ? "" : String(rows[rowIndex][fileIdIndex] || "");
  if ((providerIndex < 0 || !rows[rowIndex][providerIndex]) && fileId) {
    DriveApp.getFileById(fileId).setTrashed(true);
  }
  sheet.deleteRow(rowIndex + 1);
  return { id: String(id) };
}

function savePage_(input) {
  if (!input || PAGE_SLUGS.indexOf(String(input.slug)) < 0) {
    throw new Error("Halaman tidak valid.");
  }
  const sections = input.sections;
  if (!Array.isArray(sections) || sections.length > 40) {
    throw new Error("Halaman maksimal berisi 40 komponen.");
  }
  if (JSON.stringify(sections).length > 45000) {
    throw new Error("Total isi halaman terlalu panjang.");
  }
  sections.forEach(function (section) {
    if (!section || !/^[a-zA-Z0-9-]{1,80}$/.test(String(section.id || ""))) {
      throw new Error("Identitas komponen tidak valid.");
    }
    if (!["hero", "text", "image", "gallery", "cards", "cta"].includes(String(section.type))) {
      throw new Error("Jenis komponen tidak didukung.");
    }
    if (section.layout && ["wide", "narrow", "split", "center", "accent"].indexOf(String(section.layout)) < 0) {
      throw new Error("Tampilan komponen tidak valid.");
    }
    ["title", "body", "image", "url", "buttonText", "layout"].forEach(function (key) {
      if (String(section[key] || "").length > 5000) throw new Error("Data komponen terlalu panjang.");
    });
    if (section.image) safeUrl_(section.image);
    if (section.url) safeUrl_(section.url);
  });

  const title = cleanText_(input.title || input.slug.replace(".html", ""), 120, "Judul halaman");
  const record = {
    slug: String(input.slug),
    title: title,
    customLayout: input.customLayout === true,
    sectionsJson: JSON.stringify(sections),
    updatedAt: new Date().toISOString(),
  };
  const sheet = getSheet_(SHEETS.pages);
  const existing = readObjects_(sheet, PAGE_HEADERS).findIndex(function (page) {
    return page.slug === record.slug;
  });
  if (existing < 0) appendObject_(sheet, record);
  else setObjectRow_(sheet, existing + 2, record);
  return { slug: record.slug, title: record.title, customLayout: record.customLayout, sections: sections };
}

function deletePage_(slug) {
  if (PAGE_SLUGS.indexOf(String(slug)) < 0) throw new Error("Halaman tidak valid.");
  const sheet = getSheet_(SHEETS.pages);
  const rows = readObjects_(sheet, PAGE_HEADERS);
  const index = rows.findIndex(function (page) { return page.slug === String(slug); });
  if (index < 0) throw new Error("Pengaturan halaman tidak ditemukan.");
  sheet.deleteRow(index + 2);
  return { slug: String(slug) };
}

function changePassword_(username, currentPassword, newPassword) {
  const next = String(newPassword || "");
  if (next.length < 12) throw new Error("Password baru minimal 12 karakter.");
  const sheet = getSheet_(SHEETS.users);
  const rows = sheet.getDataRange().getValues();
  const rowIndex = rows.findIndex(function (row, index) {
    return index > 0 && String(row[0]) === username;
  });
  if (rowIndex < 1) throw new Error("Akun tidak ditemukan.");
  const row = rows[rowIndex];
  if (hashPassword_(String(row[1]), String(currentPassword || "")) !== String(row[2])) {
    throw new Error("Password saat ini tidak sesuai.");
  }
  const salt = Utilities.getUuid();
  sheet.getRange(rowIndex + 1, 2, 1, 2).setValues([[salt, hashPassword_(salt, next)]]);
  return { changed: true };
}

function readSettings_() {
  const values = getSheet_(SHEETS.settings).getDataRange().getValues();
  return values.slice(1).reduce(function (result, row) {
    if (row[0]) result[String(row[0])] = String(row[1] == null ? "" : row[1]);
    return result;
  }, {});
}

function readObjects_(sheet, headers) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const positions = {};
  values[0].forEach(function (header, index) { positions[String(header)] = index; });
  return values.slice(1).filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return headers.reduce(function (object, header, index) {
      const position = Object.prototype.hasOwnProperty.call(positions, header)
        ? positions[header]
        : index;
      const value = row[position];
      object[header] = header === "published" || header === "customLayout"
        ? value === true || String(value).toUpperCase() === "TRUE"
        : String(value == null ? "" : value);
      return object;
    }, {});
  });
}

function ensureSheet_(name, headers) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    headers.forEach(function (header) {
      if (existing.indexOf(header) < 0) {
        const column = sheet.getLastColumn() + 1;
        sheet.getRange(1, column).setValue(header);
        existing.push(header);
      }
    });
  }
  return sheet;
}

function appendObject_(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  }));
}

function setObjectRow_(sheet, rowIndex, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  })]);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("Tab " + name + " belum dibuat. Jalankan initializeCms().");
  return sheet;
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Spreadsheet belum disiapkan. Jalankan initializeCms().");
  return SpreadsheetApp.openById(id);
}

function hashPassword_(salt, password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + ":" + String(password),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
}

function sign_(message) {
  const secret = PropertiesService.getScriptProperties().getProperty("SESSION_SECRET");
  if (!secret) throw new Error("Rahasia sesi belum disiapkan. Jalankan initializeCms().");
  const signature = Utilities.computeHmacSha256Signature(message, secret);
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "");
}

function base64UrlEncode_(value) {
  return Utilities.base64EncodeWebSafe(value, Utilities.Charset.UTF_8).replace(/=+$/, "");
}

function cleanText_(value, limit, label) {
  const text = String(value == null ? "" : value).trim();
  if (!text || text.length > limit) throw new Error(label + " wajib diisi (maksimal " + limit + " karakter).");
  return text;
}

function safeUrl_(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https:\/\//i.test(url) || (/^\/(?!\/)/.test(url)) || /^\.\//.test(url)) return url;
  throw new Error("URL harus menggunakan HTTPS atau path relatif.");
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
