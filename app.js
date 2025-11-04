/* HP67 Rechnungstool - Vanilla JS, offline, PWA.
 * Fixes: LocalStorage-Hardening + Safari-sicheres PDF (kein Popup).
 */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const KEY = 'hp67_invoice_app_v1';

// ---- Storage Hardening ----
let STORAGE_OK = true;
(function testStorage(){
  try{
    localStorage.setItem('__hp67_test__','1');
    localStorage.removeItem('__hp67_test__');
  }catch(e){
    STORAGE_OK = false;
    console.warn('localStorage nicht verfügbar:', e);
    setTimeout(()=>alert('Hinweis: Lokaler Speicher ist blockiert. Daten werden nur temporär gespeichert. Nutze „JSON exportieren“.')),0;
  }
})();

const state = {
  company:{
    name:'',
    address:'',
    email:'',
    phone:'',
    vatid:'',
    iban:'',
    bic:'',
    logoDataUrl:'',
    kleinunternehmer:false
  },
  customers:[],
  current:{
    customerId:null,
    customer:{name:'',address:'',email:'',phone:''},
    number: defaultInvoiceNumber(),
    date: todayISO(),
    due: plusDaysISO(14),
    currency:'EUR',
    vat:19,
    applyVat:false,
    items:[{text:'Artikel / Leistung', qty:1, unit:'Stk.', price:0, vat:null}],
    notes:'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    terms:''
  }
};

/* Utilities */
function todayISO(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function plusDaysISO(n){
  const d = new Date();
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function defaultInvoiceNumber(){
  const d = new Date();
  const part = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;
  const seq = Math.floor(Math.random()*9000)+1000;
  return `${part}-${seq}`;
}
function fmt(amount, currency){
  try {
    return new Intl.NumberFormat('de-DE', {style:'currency',currency}).format(amount);
  } catch(e){
    return `${amount.toFixed(2)} ${currency}`;
  }
}
function save(){
  if(!STORAGE_OK) return;
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
  }catch(e){
    console.warn('Speichern fehlgeschlagen:', e);
  }
}
function load(){
  if(!STORAGE_OK) return;
  const raw = localStorage.getItem(KEY);
  if(!raw) return;
  try{
    const obj = JSON.parse(raw);
    Object.assign(state.company, obj.company||{});
    state.customers = obj.customers||[];
    Object.assign(state.current, obj.current||{});
  }catch(e){
    console.warn('Laden fehlgeschlagen:', e);
  }
}
function clone(o){return JSON.parse(JSON.stringify(o));}

function populateForm(){
  // company
  $('#c-name').value = state.company.name||'';
  $('#c-address').value = state.company.address||'';
  $('#c-email').value = state.company.email||'';
  $('#c-phone').value = state.company.phone||'';
  $('#c-vatid').value = state.company.vatid||'';
  $('#c-iban').value = state.company.iban||'';
  $('#c-bic').value = state.company.bic||'';
  $('#c-kleinunternehmer').checked = !!state.company.kleinunternehmer;

  // customers select
  const sel = $('#customer-select');
  sel.innerHTML = '<option value="">— Neuer Kunde —</option>';
  state.customers.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  if(state.current.customerId){
    sel.value = state.current.customerId;
  } else {
    sel.value = '';
  }

  // customer fields
  $('#cu-name').value = state.current.customer.name||'';
  $('#cu-address').value = state.current.customer.address||'';
  $('#cu-email').value = state.current.customer.email||'';
  $('#cu-phone').value = state.current.customer.phone||'';

  // invoice meta
  $('#inv-number').value = state.current.number||defaultInvoiceNumber();
  $('#inv-date').value = state.current.date||todayISO();
  $('#inv-due').value = state.current.due||plusDaysISO(14);
  $('#inv-currency').value = state.current.currency||'EUR';
  $('#inv-vat').value = state.current.vat ?? 19;
  $('#inv-apply-vat').checked = !!state.current.applyVat;

  // items
  renderItems();
  // text blocks
  $('#inv-notes').value = state.current.notes||'';
  $('#inv-terms').value = state.current.terms||'';
  // preview
  renderPreview();
}

function renderItems(){
  const wrap = $('#items');
  wrap.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'item';
  head.innerHTML = `
    <strong>Beschreibung</strong>
    <strong>Menge</strong>
    <strong>Einheit</strong>
    <strong>Einzelpreis</strong>
    <strong>MwSt.%</strong>
    <span></span>
  `;
  wrap.appendChild(head);

  state.current.items.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <input value="${it.text??''}" data-k="text">
      <input type="number" step="0.01" min="0" value="${it.qty??0}" data-k="qty">
      <input value="${it.unit??''}" data-k="unit">
      <input type="number" step="0.01" min="0" value="${it.price??0}" data-k="price">
      <input type="number" step="0.1" min="0" max="100" value="${it.vat??''}" data-k="vat">
      <div class="row">
        <button class="x" data-act="dup">Duplizieren</button>
        <button class="x" data-act="del">Löschen</button>
      </div>
    `;
    row.addEventListener('input', (e)=>{
      const k = e.target.dataset.k;
      if(!k) return;
      let val = e.target.value;
      if(['qty','price','vat'].includes(k)) val = parseFloat(val||0);
      state.current.items[idx][k] = val;
      autoSave();
      renderPreview();
    });
    row.addEventListener('click',(e)=>{
      const act = e.target.dataset.act;
      if(act==='del'){
        state.current.items.splice(idx,1);
        renderItems();renderPreview();autoSave();
      }
      if(act==='dup'){
        state.current.items.splice(idx+1,0,clone(state.current.items[idx]));
        renderItems();renderPreview();autoSave();
      }
    });
    wrap.appendChild(row);
  });
}

function totals(){
  const applyVat = !!state.current.applyVat && !state.company.kleinunternehmer;
  const stdVat = parseFloat(state.current.vat||0) || 0;
  let net = 0, vat = 0;
  state.current.items.forEach(it=>{
    const line = (parseFloat(it.qty||0))*(parseFloat(it.price||0));
    net += line;
    const r = (it.vat==null || isNaN(it.vat)) ? stdVat : parseFloat(it.vat||0);
    if(applyVat) vat += line * (r/100.0);
  });
  return {net, vat, gross: net + vat};
}

function renderPreview(){
  const inv = $('#invoice');
  const {net, vat, gross} = totals();
  const currency = state.current.currency || 'EUR';

  // seller block
  const sellerLines = [];
  if(state.company.name) sellerLines.push(state.company.name);
  if(state.company.address) sellerLines.push(state.company.address);
  if(state.company.email) sellerLines.push(`E-Mail: ${state.company.email}`);
  if(state.company.phone) sellerLines.push(`Tel.: ${state.company.phone}`);
  if(state.company.vatid) sellerLines.push(`USt-IdNr.: ${state.company.vatid}`);
  if(state.company.iban || state.company.bic) sellerLines.push(`IBAN: ${state.company.iban||''}  BIC: ${state.company.bic||''}`);

  // customer block
  const cust = state.current.customer||{};
  const custLines = [];
  if(cust.name) custLines.push(cust.name);
  if(cust.address) custLines.push(cust.address);
  if(cust.email) custLines.push(`E-Mail: ${cust.email}`);
  if(cust.phone) custLines.push(`Tel.: ${cust.phone}`);

  const logoImg = state.company.logoDataUrl ? `<img src="${state.company.logoDataUrl}" style="height:60px;object-fit:contain">` : '';

  let itemsHtml = `
    <table class="table">
      <thead><tr>
        <th style="width:48%">Beschreibung</th>
        <th class="right" style="width:10%">Menge</th>
        <th style="width:10%">Einheit</th>
        <th class="right" style="width:16%">Einzelpreis</th>
        <th class="right" style="width:16%">Zwischensumme</th>
      </tr></thead>
      <tbody>`;

  state.current.items.forEach(it=>{
    const qty = parseFloat(it.qty||0);
    const price = parseFloat(it.price||0);
    const sum = qty*price;
    itemsHtml += `<tr>
      <td>${escapeHtml(it.text||'')}</td>
      <td class="right">${isFinite(qty)? qty.toFixed(2):'0.00'}</td>
      <td>${escapeHtml(it.unit||'')}</td>
      <td class="right">${fmt(isFinite(price)? price:0, currency)}</td>
      <td class="right">${fmt(isFinite(sum)? sum:0, currency)}</td>
    </tr>`;
  });
  itemsHtml += `</tbody></table>`;

  const kuNote = state.company.kleinunternehmer ? `<div class="notes">Hinweis: Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</div>` : '';

  inv.innerHTML = `
    <div class="head">
      <div class="seller">
        ${logoImg}
        <div class="meta">${sellerLines.map(escapeHtml).join('<br>')}</div>
      </div>
      <div class="meta" style="text-align:right">
        <h1>Rechnung</h1>
        <div>Nr.: ${escapeHtml(state.current.number||'')}</div>
        <div>Datum: ${escapeHtml(state.current.date||'')}</div>
        <div>Fällig: ${escapeHtml(state.current.due||'')}</div>
      </div>
    </div>

    <div class="meta" style="margin-bottom:8mm">
      <strong>Rechnung an</strong><br>
      ${custLines.map(escapeHtml).join('<br>')}
    </div>

    ${itemsHtml}

    <div class="totals">
      <div></div><div>Zwischensumme: ${fmt(net, currency)}</div>
      <div></div><div>Mehrwertsteuer: ${fmt(vat, currency)}</div>
      <div style="font-weight:700"></div><div style="font-weight:700">Gesamt: ${fmt(gross, currency)}</div>
    </div>

    ${kuNote}

    <div class="notes" style="margin-top:8mm"><strong>Hinweise</strong><br>${escapeHtml(state.current.notes||'')}</div>
    <div class="notes"><strong>AGB / Zahlungsbedingungen</strong><br>${escapeHtml(state.current.terms||'')}</div>
  `;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

/* Event wiring */
function wire(){
  // company
  $('#btn-save-company').addEventListener('click', ()=>{
    Object.assign(state.company, {
      name: $('#c-name').value.trim(),
      address: $('#c-address').value.trim(),
      email: $('#c-email').value.trim(),
      phone: $('#c-phone').value.trim(),
      vatid: $('#c-vatid').value.trim(),
      iban: $('#c-iban').value.trim(),
      bic: $('#c-bic').value.trim(),
      kleinunternehmer: $('#c-kleinunternehmer').checked
    });
    autoSave(); renderPreview();
    alert('Eigene Daten gespeichert.');
  });
  $('#c-logo').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    const dataUrl = await fileToDataUrl(file);
    state.company.logoDataUrl = dataUrl;
    autoSave(); renderPreview();
  });
  $('#c-kleinunternehmer').addEventListener('change', ()=>{
    state.company.kleinunternehmer = $('#c-kleinunternehmer').checked;
    autoSave(); renderPreview();
  });

  // customers
  $('#customer-select').addEventListener('change', ()=>{
    const id = $('#customer-select').value;
    if(!id){
      state.current.customerId = null;
      state.current.customer = {name:'',address:'',email:'',phone:''};
    }else{
      const c = state.customers.find(x=>String(x.id)===String(id));
      if(c){
        state.current.customerId = c.id;
        state.current.customer = {name:c.name,address:c.address,email:c.email,phone:c.phone};
      }
    }
    autoSave(); populateForm(); renderPreview();
  });
  $('#btn-save-customer').addEventListener('click', ()=>{
    const c = {
      id: Date.now(),
      name: $('#cu-name').value.trim(),
      address: $('#cu-address').value.trim(),
      email: $('#cu-email').value.trim(),
      phone: $('#cu-phone').value.trim()
    };
    if(!c.name){ alert('Kundenname fehlt.'); return; }
    state.customers.push(c);
    state.current.customerId = c.id;
    state.current.customer = {name:c.name,address:c.address,email:c.email,phone:c.phone};
    autoSave(); populateForm(); alert('Kunde gespeichert.');
  });
  $('#btn-delete-customer').addEventListener('click', ()=>{
    const id = state.current.customerId;
    if(!id){ alert('Kein Kunde ausgewählt.'); return; }
    state.customers = state.customers.filter(c=>c.id!==id);
    state.current.customerId = null;
    state.current.customer = {name:'',address:'',email:'',phone:''};
    autoSave(); populateForm(); alert('Kunde gelöscht.');
  });

  // invoice meta
  $('#inv-number').addEventListener('input', e=>{state.current.number=e.target.value; autoSave(); renderPreview();});
  $('#inv-date').addEventListener('input', e=>{state.current.date=e.target.value; autoSave(); renderPreview();});
  $('#inv-due').addEventListener('input', e=>{state.current.due=e.target.value; autoSave(); renderPreview();});
  $('#inv-currency').addEventListener('change', e=>{state.current.currency=e.target.value; autoSave(); renderPreview();});
  $('#inv-vat').addEventListener('input', e=>{state.current.vat=parseFloat(e.target.value||0); autoSave(); renderPreview();});
  $('#inv-apply-vat').addEventListener('change', e=>{state.current.applyVat = e.target.checked; autoSave(); renderPreview();});

  // items
  $('#btn-add-item').addEventListener('click', ()=>{
    state.current.items.push({text:'',qty:1,unit:'Stk.',price:0,vat:null});
    renderItems(); renderPreview(); autoSave();
  });
  $('#btn-clear-items').addEventListener('click', ()=>{
    if(confirm('Alle Positionen löschen?')){
      state.current.items = [];
      renderItems(); renderPreview(); autoSave();
    }
  });

  // texts
  $('#inv-notes').addEventListener('input', e=>{state.current.notes=e.target.value; autoSave(); renderPreview();});
  $('#inv-terms').addEventListener('input', e=>{state.current.terms=e.target.value; autoSave(); renderPreview();});

  // header actions
  $('#btn-new').addEventListener('click', ()=>{
    if(!confirm('Neue leere Rechnung beginnen? Aktuelle Änderungen bleiben lokal gespeichert.')) return;
    state.current = {
      customerId:null,
      customer:{name:'',address:'',email:'',phone:''},
      number: defaultInvoiceNumber(),
      date: todayISO(),
      due: plusDaysISO(14),
      currency: state.current.currency||'EUR',
      vat: state.current.vat??19,
      applyVat: state.current.applyVat??false,
      items:[{text:'Artikel / Leistung', qty:1, unit:'Stk.', price:0, vat:null}],
      notes: state.current.notes||'',
      terms: state.current.terms||''
    };
    autoSave(); populateForm();
  });
  $('#btn-save').addEventListener('click', ()=>{
    autoSave(); alert('Zwischenspeicher aktualisiert.');
  });
  $('#btn-export-json').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rechnungstool_export_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  });
  $('#import-json').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    const txt = await file.text();
    try{
      const obj = JSON.parse(txt);
      if(STORAGE_OK){
        localStorage.setItem(KEY, JSON.stringify(obj));
        load();
      }else{
        Object.assign(state.company, obj.company||{});
        state.customers = obj.customers||[];
        Object.assign(state.current, obj.current||{});
      }
      populateForm(); renderPreview();
      alert('Import erfolgreich.');
    }catch{
      alert('Ungültige JSON-Datei.');
    }
  });
  $('#btn-reset').addEventListener('click', ()=>{
    if(!confirm('Wirklich alles zurücksetzen?')) return;
    if(STORAGE_OK) localStorage.removeItem(KEY);
    location.reload();
  });

  // ---- Preview + Print (Safari-sicher) ----
  $('#btn-preview').addEventListener('click', renderPreview);

  // Kein neues Fenster. Direkt System-Printdialog öffnen → „Als PDF sichern“ wählen.
  const doPrint = ()=>{ window.focus(); window.print(); };
  $('#btn-print').addEventListener('click', doPrint);
  $('#btn-open-print').addEventListener('click', doPrint);
}

function fileToDataUrl(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

let saveTimeout;
function autoSave(){
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(save, 250);
}

/* Init */
load();
window.addEventListener('DOMContentLoaded', ()=>{
  populateForm();
  wire();
});
