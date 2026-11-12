/* Low-Battery Reader for Zotero 7 and 8
 * Adds "Open in Low-Battery Reader" to the item context menu and an "Aa" button
 * to the PDF reader toolbar. Opens the paper reflowed in its own window.
 */
var chromeHandle;
var PLUGIN_ID = 'low-battery-reader@valtenap.github.io';
var MENU_LABEL = 'Open in Low-Battery Reader';
var DOM_MENU_ID = 'lowbattery-itemmenu';
var READER_URL = 'chrome://lowbattery/content/reader.xhtml';

function install() {}
function uninstall() {}

async function startup({ id, version, rootURI }) {
  var aomStartup = Cc['@mozilla.org/addons/addon-manager-startup;1'].getService(Ci.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + 'manifest.json');
  chromeHandle = aomStartup.registerChrome(manifestURI, [['content', 'lowbattery', rootURI + 'content/']]);

  // Zotero 8+: official menu API (cleaned up automatically on shutdown)
  if (Zotero.MenuManager) {
    try {
      Zotero.MenuManager.registerMenu({
        menuID: 'lowbattery-item-menu',
        pluginID: id,
        target: 'main/library/item',
        menus: [{
          menuType: 'menuitem',
          l10nID: 'lowbattery-open-menu',
          onCommand: () => openSelected(),
        }],
      });
    } catch (e) { Zotero.logError(e); }
  }

  // Button in the built-in PDF reader's toolbar (Zotero 7 and 8)
  try {
    Zotero.Reader.registerEventListener('renderToolbar', onRenderToolbar, id);
  } catch (e) { Zotero.logError(e); }

  for (let win of Zotero.getMainWindows()) {
    if (win.ZoteroPane) onMainWindowLoad({ window: win });
  }
}

function onMainWindowLoad({ window }) {
  try { window.MozXULElement.insertFTLIfNeeded('lowbattery.ftl'); } catch (e) {}
  if (Zotero.MenuManager) return; // Zotero 8 menu is registered in startup()

  // Zotero 7: add the menu item to the item context menu ourselves
  let doc = window.document;
  let popup = doc.getElementById('zotero-itemmenu');
  if (!popup || doc.getElementById(DOM_MENU_ID)) return;
  let sep = doc.createXULElement('menuseparator');
  sep.id = DOM_MENU_ID + '-sep';
  let item = doc.createXULElement('menuitem');
  item.id = DOM_MENU_ID;
  item.setAttribute('label', MENU_LABEL);
  item.addEventListener('command', () => openSelected());
  popup.appendChild(sep);
  popup.appendChild(item);
}

function onMainWindowUnload({ window }) {
  let doc = window.document;
  doc.getElementById(DOM_MENU_ID)?.remove();
  doc.getElementById(DOM_MENU_ID + '-sep')?.remove();
  doc.querySelector('[href="lowbattery.ftl"]')?.remove();
}

function shutdown() {
  for (let win of Zotero.getMainWindows()) onMainWindowUnload({ window: win });
  // close any open reader windows
  let en = Services.wm.getEnumerator('lowbattery:reader');
  while (en.hasMoreElements()) { try { en.getNext().close(); } catch (e) {} }
  if (chromeHandle) { chromeHandle.destruct(); chromeHandle = null; }
}

// ---------------------------------------------------------------------------

function onRenderToolbar(event) {
  let { reader, doc, append } = event;
  let btn = doc.createElement('button');
  btn.className = 'toolbar-button lowbattery-toolbar-button';
  btn.title = MENU_LABEL;
  btn.setAttribute('aria-label', MENU_LABEL);
  btn.textContent = 'Aa';
  btn.style.cssText = 'font-weight:700;font-size:13px;width:auto;padding:0 7px;';
  btn.addEventListener('click', () => {
    let item = reader._item || Zotero.Items.get(reader.itemID);
    if (item) openForItem(item);
  });
  append(btn);
}

function openSelected() {
  let pane = Zotero.getActiveZoteroPane();
  let items = pane ? pane.getSelectedItems() : [];
  if (!items.length) return;
  // open up to 5 papers at once
  items.slice(0, 5).forEach(item => openForItem(item));
}

async function findPDF(item) {
  if (item.isAttachment()) return isPDF(item) ? item : null;
  if (!item.isRegularItem()) return null;
  let best = await item.getBestAttachment();
  if (best && isPDF(best)) return best;
  for (let id of item.getAttachments()) {
    let att = Zotero.Items.get(id);
    if (att && isPDF(att)) return att;
  }
  return null;
}

function isPDF(att) {
  return att.attachmentContentType === 'application/pdf';
}

function field(item, name) {
  try { return item.getField(name) || ''; } catch (e) { return ''; }
}

async function openForItem(item) {
  let win = Zotero.getMainWindow();
  try {
    let att = await findPDF(item);
    if (!att) {
      Services.prompt.alert(win, 'Low-Battery Reader', 'This item has no PDF attached.');
      return;
    }
    let path = await att.getFilePathAsync();
    if (!path) {
      Services.prompt.alert(win, 'Low-Battery Reader', "The PDF file isn't on this computer yet. Open it once in Zotero to download it, then try again.");
      return;
    }
    let parent = att.parentItem || att;
    let creators = [];
    try {
      creators = parent.getCreators().map(c => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || '').filter(Boolean);
    } catch (e) {}
    let creatorText = creators.length > 6 ? creators.slice(0, 5).join(', ') + ', et al.' : creators.join(', ');
    let meta = {
      path,
      itemID: parent.id,
      title: field(parent, 'title') || att.getField('title'),
      creators: creatorText,
      publication: field(parent, 'publicationTitle') || field(parent, 'proceedingsTitle') || field(parent, 'repository'),
      year: (field(parent, 'date').match(/\d{4}/) || [''])[0],
      abstract: field(parent, 'abstractNote'),
    };
    win.openDialog(READER_URL, '_blank', 'chrome,dialog=no,resizable,centerscreen,width=1280,height=900', { meta, Zotero });
  } catch (e) {
    Zotero.logError(e);
    Services.prompt.alert(win, 'Low-Battery Reader', 'Something went wrong: ' + e);
  }
}
