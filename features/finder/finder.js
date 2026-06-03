(function () {
  'use strict';

  var FINDER_ENDPOINT    = './features/finder/getfolders.php';
  var DOWNLOAD_ENDPOINT  = './features/finder/downloadfile.php';
  var VEAUFINDER_DMG_URL = '../inc/VeauFinder.dmg';

  var TRIGGER_SELECTORS = [
    '#file-upload-icon',
    '.file-upload-icon',
    '.chat-compose__upload',
    '[data-folder-upload]',
  ];

  var FILE_EXT_ICONS = {
    ai: '🎨', eps: '🎨', psd: '🎨', psb: '🎨', indd: '🎨',
    pdf: '📄', doc: '📄', docx: '📄', xls: '📄', xlsx: '📄',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', aep: '🎬', prproj: '🎬',
    mp3: '🎵', wav: '🎵',
    zip: '🗜', rar: '🗜',
  };

  /* ── State ────────────────────────────────────────────────── */

  var finderSelectedFiles  = Object.create(null);
  var finderSelectedFolder = null;
  var finderSelectionMode  = 'file';

  /* ── VeauFinder app detection ─────────────────────────────── */

  var finderAppAvailable                = null;
  var finderInstallModalSuppressedUntil = 0;

  function suppressInstallModal(ms) {
    finderInstallModalSuppressedUntil = Date.now() + ms;
  }

  function isInstallModalSuppressed() {
    return Date.now() < finderInstallModalSuppressedUntil;
  }

  function checkFinderApp(callback) {
    if (finderAppAvailable !== null) { callback(finderAppAvailable); return; }

    var iframe   = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    var resolved = false;

    function onVis() {
      if (document.visibilityState === 'hidden') {
        resolved = true;
        finderAppAvailable = true;
        document.removeEventListener('visibilitychange', onVis);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        callback(true);
      }
    }
    document.addEventListener('visibilitychange', onVis);
    try { iframe.src = 'veaufinder://ping'; } catch (_) {}
    setTimeout(function () {
      if (!resolved) {
        resolved = true;
        finderAppAvailable = false;
        document.removeEventListener('visibilitychange', onVis);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        callback(false);
      }
    }, 600);
  }

  function openViaFinderApp(filePath) {
    if (!filePath) return;
    window.location.href = 'veaufinder://open?path=' + encodeURIComponent(filePath);
  }

  /* ── VeauFinder install modal ─────────────────────────────── */

  function showInstallModal() {
    if (isInstallModalSuppressed()) return;

    var modal    = document.getElementById('finder-install-modal');
    var backdrop = document.getElementById('finder-install-backdrop');

    if (modal) {
      modal.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      return;
    }

    backdrop = document.createElement('div');
    backdrop.id        = 'finder-install-backdrop';
    backdrop.className = 'finder-backdrop';

    modal = document.createElement('div');
    modal.id        = 'finder-install-modal';
    modal.className = 'finder-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = ''
      + '<div class="modal-card">'
      + '  <button class="modal-close" type="button" id="finder-install-close" aria-label="Close">×</button>'
      + '  <div class="modal-header"><div class="modal-title">VeauFinder not installed</div></div>'
      + '  <div class="finder-install-body">'
      + '    <div class="finder-install-icon">📁</div>'
      + '    <p class="finder-install-intro">To open files directly in Finder, install the <strong>VeauFinder</strong> app on your Mac.</p>'
      + '    <ol class="finder-install-steps">'
      + '      <li>Download and run the installer below.</li>'
      + '      <li>Open the app. If macOS blocks it, go to <strong>Settings → Privacy &amp; Security</strong> and click <strong>Open Anyway</strong>.</li>'
      + '      <li>Come back here — <em>Show in Finder</em> will now work.</li>'
      + '    </ol>'
      + '    <div class="finder-install-actions">'
      + '      <a id="finder-install-download" class="online-finder-btn online-finder-btn--primary" href="' + VEAUFINDER_DMG_URL + '" download>⬇ Download VeauFinder.dmg</a>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    backdrop.classList.add('is-open');
    modal.classList.add('is-open');

    var dlLink = document.getElementById('finder-install-download');
    if (dlLink) dlLink.addEventListener('click', function () { suppressInstallModal(20000); });

    function close() {
      modal.classList.remove('is-open');
      backdrop.classList.remove('is-open');
    }
    backdrop.addEventListener('click', close);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'finder-install-close') close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  /* ── File action modal (click attachment chip in a message) ── */

  function ensureFileActionModal() {
    var modal    = document.getElementById('chat-attachment-action-modal');
    var backdrop = document.getElementById('chat-attachment-action-backdrop');

    if (!modal || !backdrop) {
      backdrop = document.createElement('div');
      backdrop.id        = 'chat-attachment-action-backdrop';
      backdrop.className = 'finder-backdrop';

      modal = document.createElement('div');
      modal.id        = 'chat-attachment-action-modal';
      modal.className = 'finder-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = ''
        + '<div class="modal-card chat-file-action-modal-card">'
        + '  <button class="modal-close" type="button" id="chat-attachment-action-close" aria-label="Close">×</button>'
        + '  <div class="modal-header"><div class="modal-title" id="chat-attachment-action-name"></div></div>'
        + '  <div class="chat-file-action-buttons">'
        + '    <a id="chat-attachment-download-link" class="online-finder-btn online-finder-btn--primary" href="#" download>Download</a>'
        + '    <button type="button" id="chat-attachment-open-folder-link" class="online-finder-btn online-finder-btn--ghost">Show in Finder</button>'
        + '  </div>'
        + '  <div class="chat-file-action-footer">'
        + '    <span class="chat-file-action-footer-text">Need the app? <a href="' + VEAUFINDER_DMG_URL + '" download class="chat-file-action-footer-link">Download VeauFinder</a></span>'
        + '  </div>'
        + '</div>';

      document.body.appendChild(backdrop);
      document.body.appendChild(modal);

      function close() {
        modal.classList.remove('is-open');
        backdrop.classList.remove('is-open');
      }
      backdrop.addEventListener('click', close);
      document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'chat-attachment-action-close') close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
      });
      modal.dataset.bound = '1';
    }

    return {
      open: function (file) {
        var fileName   = String(file.name || file.path || 'File');
        var filePath   = String(file.path || '');
        var nameEl     = document.getElementById('chat-attachment-action-name');
        var downloadEl = document.getElementById('chat-attachment-download-link');
        var openEl     = document.getElementById('chat-attachment-open-folder-link');

        if (nameEl)     nameEl.textContent = fileName;
        if (downloadEl) {
          downloadEl.href = DOWNLOAD_ENDPOINT + '?path=' + encodeURIComponent(filePath);
          downloadEl.setAttribute('download', fileName);
        }
        if (openEl) {
          openEl.disabled = !filePath;
          var newOpenEl = openEl.cloneNode(true);
          openEl.parentNode.replaceChild(newOpenEl, openEl);
          newOpenEl.addEventListener('click', function () {
            openViaFinderApp(filePath);
          });
        }
        modal.classList.add('is-open');
        backdrop.classList.add('is-open');
      },
    };
  }

  /* ── Helpers ──────────────────────────────────────────────── */

  function getFileIcon(ext) {
    return FILE_EXT_ICONS[String(ext).toLowerCase()] || '📄';
  }

  function formatBytes(bytes) {
    if (!+bytes) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Selection state ──────────────────────────────────────── */

  function toggleFileSelection(file, el) {
    if (finderSelectedFiles[file.path]) {
      delete finderSelectedFiles[file.path];
      el.classList.remove('is-selected');
    } else {
      finderSelectedFiles[file.path] = file;
      el.classList.add('is-selected');
    }
    updateFinderFooter();
  }

  function removeFromSelection(filePath) {
    delete finderSelectedFiles[filePath];
    if (finderSelectedFolder && finderSelectedFolder.path === filePath) {
      finderSelectedFolder = null;
      document.querySelectorAll('#online-finder-columns .finder-item--folder').forEach(function (el) {
        if (el.dataset.path === filePath) el.classList.remove('is-selected');
      });
    }
    document.querySelectorAll('#online-finder-columns .finder-item--file').forEach(function (el) {
      if (el.dataset.path === filePath) el.classList.remove('is-selected');
    });
    updateFinderFooter();
  }

  function clearSelection() {
    finderSelectedFiles  = Object.create(null);
    finderSelectedFolder = null;
    document.querySelectorAll('#online-finder-columns .finder-item').forEach(function (el) {
      el.classList.remove('is-selected');
    });
    updateFinderFooter();
  }

  function setFolderSelection(folder, el) {
    finderSelectedFolder = folder;
    document.querySelectorAll('#online-finder-columns .finder-item--folder').forEach(function (f) {
      f.classList.remove('is-selected');
    });
    if (el) el.classList.add('is-selected');
    updateFinderFooter();
  }

  function updateFinderFooter() {
    var items = finderSelectionMode === 'folder'
      ? (finderSelectedFolder ? [finderSelectedFolder] : [])
      : Object.values(finderSelectedFiles);

    var footer = document.getElementById('online-finder-footer');
    var tags   = document.getElementById('online-finder-footer-files');
    var btn    = document.getElementById('online-finder-upload');
    if (!footer) return;

    if (!items.length) {
      footer.classList.remove('is-visible');
      if (btn) btn.textContent = 'Attach';
      return;
    }

    footer.classList.add('is-visible');
    if (tags) {
      tags.innerHTML = '';
      items.forEach(function (f) {
        var icon = f.type === 'folder' ? '📁' : getFileIcon(f.ext || '');
        var tag  = document.createElement('span');
        tag.className = 'online-finder-footer-tag';
        tag.title     = f.name;
        tag.innerHTML = escHtml(icon) + ' ' + escHtml(f.name)
          + '<button class="online-finder-footer-tag-remove" data-path="' + escHtml(f.path) + '" aria-label="Remove">×</button>';
        tags.appendChild(tag);
      });
    }
    if (btn) btn.textContent = finderSelectionMode === 'folder' ? 'Attach folder' : 'Attach';
  }

  /* ── Online Finder modal ──────────────────────────────────── */

  function EnsureFinderModal() {
    var modal    = document.getElementById('online-finder-modal');
    var backdrop = document.getElementById('online-finder-backdrop');

    if (!modal || !backdrop) {
      backdrop = document.createElement('div');
      backdrop.id        = 'online-finder-backdrop';
      backdrop.className = 'finder-backdrop';

      modal = document.createElement('div');
      modal.id        = 'online-finder-modal';
      modal.className = 'finder-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = ''
        + '<div class="modal-card chats-modal-card">'
        + '  <button class="modal-close" type="button" id="online-finder-close" aria-label="Close">×</button>'
        + '  <div class="modal-header"><div class="modal-title">Online Finder</div></div>'
        + '  <div class="modal-body" style="padding:0; overflow:hidden;">'
        + '    <div class="online-finder-columns" id="online-finder-columns"></div>'
        + '    <div class="online-finder-footer" id="online-finder-footer">'
        + '      <div class="online-finder-footer-files" id="online-finder-footer-files"></div>'
        + '      <div class="online-finder-footer-actions">'
        + '        <button class="online-finder-btn online-finder-btn--ghost" id="online-finder-deselect">Deselect all</button>'
        + '        <button class="online-finder-btn online-finder-btn--primary" id="online-finder-upload">Attach</button>'
        + '      </div>'
        + '    </div>'
        + '  </div>'
        + '</div>';

      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
    }

    function close() {
      modal.classList.remove('is-open');
      backdrop.classList.remove('is-open');
    }

    function open() {
      finderSelectedFiles  = Object.create(null);
      finderSelectedFolder = null;
      modal.setAttribute('data-selection-mode', finderSelectionMode);
      updateFinderFooter();
      resetColumns();
      addColumn('', 0);
      modal.classList.add('is-open');
      backdrop.classList.add('is-open');
    }

    if (!modal.dataset.bound) {
      modal.dataset.bound = '1';

      backdrop.addEventListener('click', close);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
      });
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === 'online-finder-close')    { close(); return; }
        if (t.id === 'online-finder-deselect') { clearSelection(); return; }
        if (t.id === 'online-finder-upload')   { onAttachConfirmed(); return; }
        if (t.classList && t.classList.contains('online-finder-footer-tag-remove')) {
          removeFromSelection(t.dataset.path || '');
        }
      });
    }

    return { open: open, close: close };
  }

  /* ── Column engine ────────────────────────────────────────── */

  function resetColumns() {
    var c = document.getElementById('online-finder-columns');
    if (c) c.innerHTML = '';
  }

  function truncateColumnsAfter(depth) {
    document.querySelectorAll('#online-finder-columns .finder-column').forEach(function (col) {
      if (parseInt(col.dataset.depth || '0', 10) > depth) col.parentNode.removeChild(col);
    });
  }

  function addColumn(folderPath, depth) {
    var container = document.getElementById('online-finder-columns');
    if (!container) return;

    truncateColumnsAfter(depth - 1);

    var col    = document.createElement('div');
    col.className     = 'finder-column';
    col.dataset.depth = String(depth);

    var status = document.createElement('div');
    status.className   = 'finder-col-status';
    status.textContent = 'Loading…';
    col.appendChild(status);
    container.appendChild(col);
    setTimeout(function () { container.scrollLeft = container.scrollWidth; }, 0);

    var body = new URLSearchParams();
    if (folderPath) body.set('folder', folderPath);

    fetch(FINDER_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    body.toString(),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (col.contains(status)) col.removeChild(status);

        if (!data || !data.ok) {
          var err = document.createElement('div');
          err.className   = 'finder-col-status finder-col-error';
          err.textContent = 'Error: ' + (data && data.error ? data.error : 'Unknown error');
          col.appendChild(err);
          return;
        }

        var folders = Array.isArray(data.folders) ? data.folders : [];
        var files   = Array.isArray(data.files)   ? data.files   : [];

        if (!folders.length && !files.length) {
          var empty = document.createElement('div');
          empty.className   = 'finder-col-status';
          empty.textContent = 'Empty folder';
          col.appendChild(empty);
          return;
        }

        folders.forEach(function (folder) {
          var item = document.createElement('div');
          item.className    = 'finder-item finder-item--folder';
          item.dataset.path = folder.path;

          if (finderSelectionMode === 'folder' && finderSelectedFolder && finderSelectedFolder.path === folder.path) {
            item.classList.add('is-selected');
          }

          item.innerHTML = '<span class="finder-item-icon">📁</span>'
            + '<span class="finder-item-name">' + escHtml(folder.name) + '</span>'
            + '<span class="finder-item-chevron">›</span>';

          item.addEventListener('click', function () {
            col.querySelectorAll('.finder-item--folder').forEach(function (el) { el.classList.remove('is-active'); });
            item.classList.add('is-active');
            if (finderSelectionMode === 'folder') setFolderSelection(folder, item);
            addColumn(folder.path, depth + 1);
          });

          col.appendChild(item);
        });

        if (folders.length && files.length) {
          var divider = document.createElement('div');
          divider.className = 'finder-col-divider';
          col.appendChild(divider);
        }

        files.forEach(function (file) {
          var item = document.createElement('div');
          item.className    = 'finder-item finder-item--file';
          item.dataset.path = file.path;

          if (finderSelectedFiles[file.path]) item.classList.add('is-selected');

          item.innerHTML = '<span class="finder-item-icon">' + escHtml(getFileIcon(file.ext)) + '</span>'
            + '<span class="finder-item-name">' + escHtml(file.name) + '</span>'
            + '<span class="finder-item-size">' + escHtml(formatBytes(file.size)) + '</span>'
            + '<span class="finder-check">✓</span>';

          var clickCount = 0;
          var clickTimer = null;
          item.addEventListener('click', function () {
            clickCount++;
            if (clickCount === 1) {
              clickTimer = setTimeout(function () {
                clickCount = 0;
                truncateColumnsAfter(depth);
                toggleFileSelection(file, item);
              }, 250);
            } else {
              clearTimeout(clickTimer);
              clickCount = 0;
              // Double-click → open file action modal
              ensureFileActionModal().open(file);
            }
          });

          col.appendChild(item);
        });

        setTimeout(function () { container.scrollLeft = container.scrollWidth; }, 50);
      })
      .catch(function (err) {
        if (col.contains(status)) status.textContent = 'Network error: ' + String(err);
      });
  }

  /* ── Attach confirm ───────────────────────────────────────── */

  function onAttachConfirmed() {
    var files   = Object.values(finderSelectedFiles);
    var folders = finderSelectedFolder ? [finderSelectedFolder] : [];

    var modal    = document.getElementById('online-finder-modal');
    var backdrop = document.getElementById('online-finder-backdrop');
    if (modal)    modal.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');

    finderSelectedFiles  = Object.create(null);
    finderSelectedFolder = null;
    updateFinderFooter();

    document.dispatchEvent(new CustomEvent('onlineFinder:filesUploaded', {
      bubbles: true,
      detail:  { files: files, folders: folders, selectionMode: finderSelectionMode },
    }));
  }

  /* ── Init ─────────────────────────────────────────────────── */

  function init() {
    var finder = EnsureFinderModal();

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      var triggerEl = null;
      TRIGGER_SELECTORS.some(function (sel) {
        triggerEl = t.closest(sel);
        return !!triggerEl;
      });
      if (!triggerEl) return;

      e.preventDefault();
      finderSelectionMode = String(triggerEl.getAttribute('data-finder-selection') || 'file').trim().toLowerCase() === 'folder'
        ? 'folder' : 'file';
      finder.open();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Public API ───────────────────────────────────────────── */

  window.openOnlineFinder = function () { EnsureFinderModal().open(); };

  window.openVeauFinderPath = function (filePath) {
    checkFinderApp(function (installed) {
      if (installed) openViaFinderApp(filePath);
      else           showInstallModal();
    });
  };

  window.openFinderFileAction = function (file) {
    ensureFileActionModal().open(file);
  };
})();
