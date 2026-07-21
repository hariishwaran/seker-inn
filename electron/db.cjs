const {app} = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

// Kept in sync with src/data.ts's initialRooms — the main process is plain
// CommonJS and can't import the TS/ESM source directly, so the default
// 13-room layout is duplicated here for first-run seeding.
const DEFAULT_ROOMS = [
  {id: '101', floor: 1, roomType: 'Triple Room (AC)', status: 'vacant', isAC: 1, basePrice: 2500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '102', floor: 1, roomType: 'Triple Room (AC)', status: 'vacant', isAC: 1, basePrice: 2500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '103', floor: 1, roomType: 'Triple Room (AC)', status: 'vacant', isAC: 1, basePrice: 2500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '104', floor: 1, roomType: 'Double Room (AC)', status: 'vacant', isAC: 1, basePrice: 2000, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '105', floor: 1, roomType: 'Triple Room (AC)', status: 'vacant', isAC: 1, basePrice: 2500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '106', floor: 1, roomType: 'Double Room (AC)', status: 'vacant', isAC: 1, basePrice: 2000, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '107', floor: 1, roomType: 'Four Sharing (AC)', status: 'vacant', isAC: 1, basePrice: 3000, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '108', floor: 1, roomType: 'Triple Room (AC)', status: 'vacant', isAC: 1, basePrice: 2500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '109', floor: 1, roomType: 'Queen Suite (5 sharing) (AC)', status: 'vacant', isAC: 1, basePrice: 3500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '110', floor: 1, roomType: 'King Suite (6 sharing) (AC)', status: 'vacant', isAC: 1, basePrice: 4000, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '201', floor: 2, roomType: '10 Sharing (Non-AC)', status: 'vacant', isAC: 0, basePrice: 6000, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '202', floor: 2, roomType: 'Triple Room (Non-AC)', status: 'vacant', isAC: 0, basePrice: 1500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
  {id: '203', floor: 2, roomType: 'Triple Room (Non-AC)', status: 'vacant', isAC: 0, basePrice: 1500, extraBedPrice: 500, extraBedsCount: 0, guestName: '', guestId: '', amountDue: 0, maintenancePriority: 'Low', maintenanceNotes: ''},
];

const DEFAULT_SETTINGS = {
  id: 'default',
  address: 'Flat No.: 3, LAKSHMIMANAGARAM MIDDLE STREET, Arumuganeri, Thoothukudi, Tamil Nadu - 628202',
  phone: '+91 86670 92950',
  gstin: '33KKRPS8566Q1ZK',
  cgstPercentage: 9,
  sgstpercentage: 9,
  defaultcheckintime: '12:00',
  defaultcheckouttime: '11:00',
  bedsheetSmallPrice: 150,
  bedsheetLargePrice: 250,
  extraBedPrice: 500,
  towelPrice: 50,
  pillowCoverPrice: 30,
};

const ROOM_COLUMNS = ['id', 'floor', 'roomType', 'status', 'isAC', 'basePrice', 'extraBedPrice', 'extraBedsCount', 'numberOfPeople', 'guestName', 'guestId', 'guestGst', 'checkInDate', 'checkOutDate', 'expectedTime', 'maintenanceIssue', 'maintenancePriority', 'maintenanceNotes', 'amountDue', 'futureBookings'];
const INVOICE_COLUMNS = ['id', 'customerName', 'customerEmail', 'customerPhone', 'customerGst', 'numberOfPeople', 'sourceOfBooking', 'roomNumber', 'roomType', 'checkInDate', 'checkOutDate', 'date', 'totalNights', 'lineItems', 'notes', 'subtotal', 'cgst', 'sgst', 'grandTotal', 'status'];
const SETTINGS_COLUMNS = ['id', 'address', 'phone', 'gstin', 'cgstPercentage', 'sgstpercentage', 'defaultcheckintime', 'defaultcheckouttime', 'bedsheetSmallPrice', 'bedsheetLargePrice', 'extraBedPrice', 'towelPrice', 'pillowCoverPrice'];

let db;

// Adds `column` to `table` if an existing (pre-upgrade) database doesn't
// have it yet. Safe to call every launch — no-ops once the column exists.
function ensureColumn(table, column, definitionSql) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!existing.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definitionSql}`);
  }
}

function init() {
  const dbPath = path.join(app.getPath('userData'), 'sekarinn.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      floor INTEGER NOT NULL,
      roomType TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'vacant',
      isAC INTEGER NOT NULL DEFAULT 0,
      basePrice REAL NOT NULL DEFAULT 0,
      extraBedPrice REAL DEFAULT 500,
      extraBedsCount INTEGER DEFAULT 0,
      numberOfPeople INTEGER,
      guestName TEXT DEFAULT '',
      guestId TEXT DEFAULT '',
      guestGst TEXT DEFAULT '',
      checkInDate TEXT DEFAULT '',
      checkOutDate TEXT DEFAULT '',
      expectedTime TEXT DEFAULT '',
      maintenanceIssue TEXT DEFAULT '',
      maintenancePriority TEXT DEFAULT 'Low',
      maintenanceNotes TEXT DEFAULT '',
      amountDue REAL DEFAULT 0,
      futureBookings TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customerName TEXT,
      customerEmail TEXT DEFAULT '',
      customerPhone TEXT DEFAULT '',
      customerGst TEXT,
      numberOfPeople INTEGER,
      roomNumber TEXT,
      roomType TEXT,
      checkInDate TEXT,
      checkOutDate TEXT,
      date TEXT,
      totalNights INTEGER,
      lineItems TEXT NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      cgst REAL DEFAULT 0,
      sgst REAL DEFAULT 0,
      grandTotal REAL DEFAULT 0,
      status TEXT DEFAULT 'Draft',
      sourceOfBooking TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      gstin TEXT DEFAULT '',
      cgstPercentage REAL DEFAULT 9,
      sgstpercentage REAL DEFAULT 9,
      defaultcheckintime TEXT DEFAULT '12:00',
      defaultcheckouttime TEXT DEFAULT '11:00',
      bedsheetSmallPrice REAL DEFAULT 150,
      bedsheetLargePrice REAL DEFAULT 250,
      extraBedPrice REAL DEFAULT 500,
      towelPrice REAL DEFAULT 50,
      pillowCoverPrice REAL DEFAULT 30
    );
  `);

  // Migrations for databases created before a column was added — CREATE
  // TABLE IF NOT EXISTS above only helps on a brand new install.
  ensureColumn('invoices', 'sourceOfBooking', "TEXT DEFAULT ''");

  const roomCount = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
  if (roomCount === 0) {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, floor, roomType, status, isAC, basePrice, extraBedPrice, extraBedsCount, guestName, guestId, amountDue, maintenancePriority, maintenanceNotes)
      VALUES (@id, @floor, @roomType, @status, @isAC, @basePrice, @extraBedPrice, @extraBedsCount, @guestName, @guestId, @amountDue, @maintenancePriority, @maintenanceNotes)
    `);
    const insertAll = db.transaction((rooms) => {
      for (const room of rooms) insertRoom.run(room);
    });
    insertAll(DEFAULT_ROOMS);
  }

  const settingsRow = db.prepare('SELECT id FROM settings WHERE id = ?').get('default');
  if (!settingsRow) {
    const cols = SETTINGS_COLUMNS.join(', ');
    const placeholders = SETTINGS_COLUMNS.map((c) => `@${c}`).join(', ');
    db.prepare(`INSERT INTO settings (${cols}) VALUES (${placeholders})`).run(DEFAULT_SETTINGS);
  }
}

// better-sqlite3 throws if a named parameter referenced in the SQL is
// missing from the bound object entirely (unlike a plain `undefined` value
// in most drivers) — several Room/Invoice/SystemSettings fields are
// optional in the TypeScript types (e.g. a freshly added custom room has
// no numberOfPeople/guestName/etc. yet), so callers routinely omit them.
function fillMissingColumns(obj, columns) {
  const filled = {};
  for (const col of columns) {
    filled[col] = obj[col] === undefined ? null : obj[col];
  }
  return filled;
}

function roomFromRow(row) {
  return {...row, isAC: !!row.isAC, futureBookings: JSON.parse(row.futureBookings || '[]')};
}

function invoiceFromRow(row) {
  return {...row, lineItems: JSON.parse(row.lineItems || '[]')};
}

function getRooms() {
  const rows = db.prepare('SELECT * FROM rooms ORDER BY id').all();
  return rows.map(roomFromRow);
}

function saveRoom(room) {
  const row = fillMissingColumns(
    {...room, isAC: room.isAC ? 1 : 0, futureBookings: JSON.stringify(room.futureBookings || [])},
    ROOM_COLUMNS
  );
  const cols = ROOM_COLUMNS.join(', ');
  const placeholders = ROOM_COLUMNS.map((c) => `@${c}`).join(', ');
  const updates = ROOM_COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
  db.prepare(`
    INSERT INTO rooms (${cols}) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}
  `).run(row);
  return getRooms();
}

function deleteRoom(id) {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  return getRooms();
}

function getInvoices() {
  const rows = db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
  return rows.map(invoiceFromRow);
}

function saveInvoice(invoice) {
  const row = fillMissingColumns(
    {...invoice, lineItems: JSON.stringify(invoice.lineItems || [])},
    INVOICE_COLUMNS
  );
  const cols = INVOICE_COLUMNS.join(', ');
  const placeholders = INVOICE_COLUMNS.map((c) => `@${c}`).join(', ');
  const updates = INVOICE_COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
  db.prepare(`
    INSERT INTO invoices (${cols}) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}
  `).run(row);
  return getInvoices();
}

function deleteInvoice(id) {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
  return getInvoices();
}

function updateInvoiceStatus(id, status) {
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id);
  return getInvoices();
}

function getSettings() {
  const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('default');
  return row;
}

function saveSettings(settings) {
  const row = fillMissingColumns({...settings, id: 'default'}, SETTINGS_COLUMNS);
  const cols = SETTINGS_COLUMNS.join(', ');
  const placeholders = SETTINGS_COLUMNS.map((c) => `@${c}`).join(', ');
  const updates = SETTINGS_COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
  db.prepare(`
    INSERT INTO settings (${cols}) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}
  `).run(row);
  return getSettings();
}

function resetDatabase() {
  const wipe = db.transaction(() => {
    db.prepare('DELETE FROM rooms').run();
    db.prepare('DELETE FROM invoices').run();
    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, floor, roomType, status, isAC, basePrice, extraBedPrice, extraBedsCount, guestName, guestId, amountDue, maintenancePriority, maintenanceNotes)
      VALUES (@id, @floor, @roomType, @status, @isAC, @basePrice, @extraBedPrice, @extraBedsCount, @guestName, @guestId, @amountDue, @maintenancePriority, @maintenanceNotes)
    `);
    for (const room of DEFAULT_ROOMS) insertRoom.run(room);
  });
  wipe();
  return {rooms: getRooms(), invoices: getInvoices()};
}

module.exports = {
  init,
  getRooms,
  saveRoom,
  deleteRoom,
  getInvoices,
  saveInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getSettings,
  saveSettings,
  resetDatabase,
};
