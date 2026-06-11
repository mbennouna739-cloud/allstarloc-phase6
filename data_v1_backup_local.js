/* ============================================================
   ALL STAR LOC — SOURCE DE DONNÉES UNIQUE (Phase 1)
   Partagée entre le site client (index.html) et l'admin (admin/index.html)
   Stockage : localStorage du navigateur (persistant).
   ============================================================ */
(function (global) {
  'use strict';

  const KEY_FLEET = 'asl_fleet_v1';
  const KEY_RES   = 'asl_reservations_v1';
  const RATE_MAD  = 10.8; // 1 EUR = 10.8 MAD (utilisé pour les conversions)

  /* ---------- Flotte initiale (chargée une seule fois) ---------- */
  const DEFAULT_FLEET = [
    { id:1,  name:'Kia Picanto',           category:'citadine',   priceEUR:25, priceMAD:250, plate:'ABC-123-MK', status:'available',   fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Mini-Urbaine', featured:false, services:['Clim','Radio','GPS'],            img:'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=80' },
    { id:2,  name:'Hyundai Grand i10',     category:'citadine',   priceEUR:30, priceMAD:300, plate:'DEF-456-MK', status:'reserved',    fuel:'Essence', transmission:'Automatique', seats:5, badge:'Économique',   featured:false, services:['Clim','Radio','USB'],            img:'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80' },
    { id:3,  name:'Fiat 500',              category:'citadine',   priceEUR:30, priceMAD:300, plate:'GHI-789-MK', status:'available',   fuel:'Essence', transmission:'Automatique', seats:5, badge:'Citadine',     featured:false, services:['Clim','Bluetooth','Style'],      img:'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80' },
    { id:4,  name:'Peugeot 208',           category:'citadine',   priceEUR:30, priceMAD:300, plate:'JKL-012-MK', status:'available',   fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Moderne',      featured:false, services:['Clim','GPS','USB'],              img:'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80' },
    { id:5,  name:'Opel Corsa',            category:'economique', priceEUR:30, priceMAD:300, plate:'MNO-345-MK', status:'maintenance', fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Économique',   featured:false, services:['Clim','Radio','Bluetooth'],      img:'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80' },
    { id:6,  name:'Renault Clio 5',        category:'economique', priceEUR:30, priceMAD:300, plate:'PQR-678-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Compacte',     featured:false, services:['Clim','GPS','Radio'],            img:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80' },
    { id:7,  name:'Peugeot 301',           category:'familiale',  priceEUR:28, priceMAD:280, plate:'STU-901-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Familiale',    featured:false, services:['Clim','Grand Coffre','Confort'], img:'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80' },
    { id:8,  name:'Citroën C-Élysée',      category:'familiale',  priceEUR:30, priceMAD:300, plate:'VWX-234-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Spacieuse',    featured:false, services:['Clim','Grand Coffre','Confort'], img:'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80' },
    { id:9,  name:'Dacia Sandero Stepway', category:'economique', priceEUR:30, priceMAD:300, plate:'YZA-567-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Polyvalente',  featured:false, services:['Clim','Hauteur','Coffre'],       img:'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80' },
    { id:10, name:'Dacia Duster',          category:'suv',        priceEUR:40, priceMAD:400, plate:'BCD-890-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'SUV',          featured:true,  services:['4x4','Clim','GPS','Grand Coffre'], img:'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&q=80' },
    { id:11, name:'Kia Sportage',          category:'suv',        priceEUR:70, priceMAD:700, plate:'EFG-123-MK', status:'available',   fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Premium SUV',  featured:true,  services:['SUV Premium','Auto','GPS','Cuir'], img:'https://images.unsplash.com/photo-1617469767280-f8b69f46b1b0?w=600&q=80' },
  ];

  /* ---------- Lecture / écriture bas niveau ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('ASLDB write error', e); return false; }
  }

  /* ---------- Initialisation (seed une seule fois) ---------- */
  function init() {
    if (localStorage.getItem(KEY_FLEET) === null) write(KEY_FLEET, DEFAULT_FLEET);
    if (localStorage.getItem(KEY_RES)   === null) write(KEY_RES, []);
  }

  /* ---------- API Flotte ---------- */
  function getFleet() { return read(KEY_FLEET, DEFAULT_FLEET.slice()); }
  function saveFleet(fleet) { return write(KEY_FLEET, fleet); }

  function addVehicle(v) {
    const fleet = getFleet();
    v.id = Date.now(); // identifiant unique, jamais réutilisé après suppression
    fleet.push(v);
    saveFleet(fleet);
    return v;
  }

  function updateVehicle(id, patch) {
    const fleet = getFleet();
    const car = fleet.find(c => c.id === id);
    if (!car) return null;
    Object.assign(car, patch);
    saveFleet(fleet);
    return car;
  }

  function deleteVehicle(id) {
    const fleet = getFleet().filter(c => c.id !== id);
    return saveFleet(fleet);
  }

  /* ---------- API Réservations ---------- */
  function getReservations() {
    // Les plus récentes en premier
    return read(KEY_RES, []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
  function saveReservations(list) { return write(KEY_RES, list); }

  function addReservation(res) {
    const list = read(KEY_RES, []);
    if (!res.id) res.id = 'ASL' + Date.now().toString().slice(-6);
    if (!res.createdAt) res.createdAt = new Date().toISOString();
    list.push(res);
    saveReservations(list);
    return res;
  }

  function updateReservation(id, patch) {
    const list = read(KEY_RES, []);
    const r = list.find(x => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    saveReservations(list);
    return r;
  }

  /* ---------- Synchronisation entre onglets ouverts ---------- */
  function onChange(callback) {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY_FLEET || e.key === KEY_RES) callback(e.key);
    });
  }

  init();

  global.ASLDB = {
    RATE_MAD,
    getFleet, saveFleet, addVehicle, updateVehicle, deleteVehicle,
    getReservations, addReservation, updateReservation,
    onChange,
  };
})(window);
