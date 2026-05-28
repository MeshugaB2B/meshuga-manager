'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// ProspectionTab — "Prospection 🔍" (ex-Tableau de chasse)
//
// CHANGEMENT MAJEUR : connecté à la table Supabase `chasse_prospects`
// (avant : ALL_PROSPECTS en mémoire, perdu au refresh). Désormais tout
// persiste : génération IA, contacté, relancé, gagné, envoi CRM.
//
// Structure :
//   1. Générateur de leads IA (catégorie + zone + nombre)
//   2. Stats (total / à contacter / contactés / gagnés / valeur potentielle)
//   3. Filtres (catégories emojis) + recherche + tri
//   4. Cartes en grille
//   + Workflow : Contacté → Relancer → Intéressé/Rappeler/Non → Gagné
//   + Bouton "Envoyer au CRM" sur les leads chauds
//
// Props : generateEmail, toast, sendPushToAll, nav, isEmy, onSendToCrm
// =============================================================================

var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'
var NOIR = '#191923'
var BLEU = '#005FFF'
var VERT = '#009D3A'
var ROUGE = '#CC0066'
var OR = '#B8920A'
var ORANGE = '#FF6B2B'

var CATS = {
  all:          { label:'Tous',         emoji:'☰' },
  evenementiel: { label:'Événementiel', emoji:'🎉' },
  avocats:      { label:'Avocats',      emoji:'⚖️' },
  startup:      { label:'Startups',     emoji:'🚀' },
  agence_pub:   { label:'Agences créa', emoji:'🎨' },
  hotel:        { label:'Hôtels',       emoji:'🏨' },
  immo:         { label:'Immobilier',   emoji:'🏢' },
  medical:      { label:'Médical',      emoji:'🏥' },
  production:   { label:'Tournages',    emoji:'🎬' },
  ecole:        { label:'Écoles',       emoji:'🎓' },
  institution:  { label:'Institutions', emoji:'🏛️' },
  luxe:         { label:'Luxe & Mode',  emoji:'👜' },
  tech:         { label:'Tech',         emoji:'💻' },
  conseil:      { label:'Conseil',      emoji:'📊' },
  medias:       { label:'Médias',       emoji:'📰' },
  coworking:    { label:'Coworking',    emoji:'🏗️' },
  banque:       { label:'Banques',      emoji:'🏦' }
}
var GEN_CATS = Object.keys(CATS).filter(function(k){ return k !== 'all' })

var STATUS_LABELS = { to_contact:'À contacter', contacted:'Contacté', nego:'En négo', won:'🏆 Gagné', lost:'✗ Perdu' }
var STATUS_COLORS = { to_contact:'#7A7A85', contacted:BLEU, nego:ROSE, won:VERT, lost:ROUGE }

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function ProspectionTab(props) {
  var generateEmail = props.generateEmail || function(){}
  var toast = props.toast || function(){}
  var sendPushToAll = props.sendPushToAll || function(){}
  var nav = props.nav || function(){}
  var isEmy = !!props.isEmy
  var onSendToCrm = props.onSendToCrm || null

  var [leads, setLeads] = useState([])
  var [loading, setLoading] = useState(true)
  var [search, setSearch] = useState('')
  var [sort, setSort] = useState('score')
  var [catFilter, setCatFilter] = useState('all')
  var [statusFilter, setStatusFilter] = useState('all')

  // Générateur
  var [genCat, setGenCat] = useState('avocats')
  var [genZone, setGenZone] = useState('Paris')
  var [genCount, setGenCount] = useState(15)
  var [genLoading, setGenLoading] = useState(false)

  // Modal fiche
  var [editLead, setEditLead] = useState(null)

  useEffect(function(){ loadLeads() }, [])

  function loadLeads() {
    setLoading(true)
    sb().from('chasse_prospects').select('*').order('score', { ascending: false }).then(function(r){
      setLeads(r.data || [])
      setLoading(false)
    })
  }

  // ---- Génération IA ----
  function generateLeads() {
    if (genLoading) return
    setGenLoading(true)
    fetch('/api/generate-prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cat: genCat, zone: genZone, count: genCount })
    }).then(function(res){ return res.json() }).then(function(data){
      setGenLoading(false)
      if (data && data.inserted) {
        toast('✨ ' + data.inserted + ' leads générés !')
        loadLeads()
      } else {
        toast('Erreur génération : ' + (data && data.error ? data.error : 'inconnue'))
      }
    }).catch(function(err){
      setGenLoading(false)
      toast('Erreur : ' + err.message)
    })
  }

  // ---- Actions DB ----
  function patchLead(id, patch) {
    setLeads(function(prev){ return prev.map(function(x){ return x.id === id ? Object.assign({}, x, patch) : x }) })
    sb().from('chasse_prospects').update(patch).eq('id', id).then(function(){})
  }
  function saveLead(id, fields) {
    setLeads(function(prev){ return prev.map(function(x){ return x.id === id ? Object.assign({}, x, fields) : x }) })
    sb().from('chasse_prospects').update(fields).eq('id', id).then(function(r){
      if (r.error) { toast('Erreur sauvegarde : ' + r.error.message) }
      else { toast('Fiche enregistrée ✓'); setEditLead(null) }
    })
  }
  function markContacted(p) {
    var rel = new Date(); rel.setDate(rel.getDate() + 7)
    patchLead(p.id, { status:'contacted', contacted_at:new Date().toISOString(), last_action:'Contacté le '+todayStr(), relance_date:rel.toISOString().split('T')[0] })
    toast('📞 Marqué contacté')
  }
  function relance(p) {
    var next = new Date(); next.setDate(next.getDate() + 7)
    patchLead(p.id, { last_action:'Relancé le '+todayStr(), relance_date:next.toISOString().split('T')[0] })
    toast('↩ Relancé')
  }
  function reponse(p, rep) {
    var map = { interesse:{status:'nego', a:'Intéressé'}, rappeler:{status:'contacted', a:'À rappeler'}, lost:{status:'lost', a:'Pas intéressé'} }
    var r = map[rep] || map.lost
    patchLead(p.id, { status:r.status, last_action:r.a+' - '+todayStr() })
    toast(r.a)
  }
  function markWon(p) {
    patchLead(p.id, { status:'won', last_action:'Gagné le '+todayStr() })
    sendPushToAll('🏆 Prospect gagné !', p.name + ' rejoint la liste clients !', 'all')
    toast('🎉 Gagné !')
  }
  function sendToCrm(p) {
    if (onSendToCrm) {
      onSendToCrm(p)
    }
    patchLead(p.id, { sent_to_crm: true, last_action:'Envoyé au CRM le '+todayStr() })
    toast('→ Envoyé au CRM ✓')
  }
  function delLead(p) {
    setLeads(function(prev){ return prev.filter(function(x){ return x.id !== p.id }) })
    sb().from('chasse_prospects').delete().eq('id', p.id).then(function(){ toast('Lead supprimé') })
  }

  // ---- Stats ----
  var nbTotal = leads.length
  var nbToContact = leads.filter(function(p){ return p.status === 'to_contact' }).length
  var nbContacted = leads.filter(function(p){ return p.status === 'contacted' || p.status === 'nego' }).length
  var nbWon = leads.filter(function(p){ return p.status === 'won' }).length
  var totalValue = leads.filter(function(p){ return p.status !== 'lost' && p.status !== 'won' }).reduce(function(s,p){ return s + (Number(p.ve)||0) + (Number(p.vm)||0)*12 }, 0)

  // ---- Filtrage + tri ----
  var filtered = leads.filter(function(p){
    if (catFilter !== 'all' && p.cat !== catFilter) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search) {
      var s = search.toLowerCase()
      if (p.name.toLowerCase().indexOf(s) === -1 && (p.arr||'').toLowerCase().indexOf(s) === -1 && (p.type||'').toLowerCase().indexOf(s) === -1) return false
    }
    return true
  })
  filtered = filtered.slice().sort(function(a,b){
    if (sort === 'score') return (b.score||0) - (a.score||0)
    if (sort === 'valeur') return ((b.ve||0)+(b.vm||0)) - ((a.ve||0)+(a.vm||0))
    if (sort === 'name') return a.name < b.name ? -1 : 1
    return 0
  })

  // Catégories présentes dans les données (pour ne montrer que les tags utiles)
  var presentCats = {}
  leads.forEach(function(p){ presentCats[p.cat] = (presentCats[p.cat]||0) + 1 })

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:38,lineHeight:1,color:ROSE}}>Prospection</div>
          <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:700}}>🔍 {nbToContact} à contacter · {nbTotal} leads au radar</div>
        </div>
        {isEmy && <span style={{fontWeight:900,fontSize:12,background:JAUNE,border:'2px solid '+NOIR,borderRadius:14,padding:'4px 12px'}}>Objectif : 5 contacts/jour</span>}
      </div>

      {/* ===== GÉNÉRATEUR IA ===== */}
      <div className="card" style={{borderColor:ROSE, borderWidth:3, background:'#FFF7FC'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <span style={{fontSize:22}}>🤖</span>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:ROSE,lineHeight:1}}>Générateur de leads IA</div>
            <div style={{fontSize:10,opacity:0.6,fontWeight:700,marginTop:2}}>L&apos;IA trouve des entreprises parisiennes réelles et les ajoute au radar</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:'1 1 160px'}}>
            <label style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:0.6,display:'block',marginBottom:3}}>Catégorie</label>
            <select className="inp" value={genCat} onChange={function(e){ setGenCat(e.target.value) }} style={{width:'100%'}}>
              {GEN_CATS.map(function(k){ return <option key={k} value={k}>{CATS[k].emoji + ' ' + CATS[k].label}</option> })}
            </select>
          </div>
          <div style={{flex:'1 1 140px'}}>
            <label style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:0.6,display:'block',marginBottom:3}}>Zone</label>
            <input className="inp" value={genZone} onChange={function(e){ setGenZone(e.target.value) }} placeholder="Paris 8e, La Défense..." style={{width:'100%'}} />
          </div>
          <div style={{flex:'0 0 90px'}}>
            <label style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:0.6,display:'block',marginBottom:3}}>Nombre</label>
            <select className="inp" value={genCount} onChange={function(e){ setGenCount(parseInt(e.target.value)) }} style={{width:'100%'}}>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
          <button className="btn btn-p" style={{flex:'0 0 auto',fontWeight:900,opacity:genLoading?0.6:1,minWidth:150,justifyContent:'center'}} disabled={genLoading} onClick={generateLeads}>
            {genLoading ? '⏳ Recherche...' : '✨ Générer ' + genCount + ' leads'}
          </button>
        </div>
        {genLoading && <div style={{fontSize:11,opacity:0.6,marginTop:10,fontWeight:700,textAlign:'center'}}>🧠 L&apos;IA prospecte des {CATS[genCat].label.toLowerCase()} dans « {genZone} »... (~15-20s)</div>}
      </div>

      {/* ===== STATS ===== */}
      <div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
        <StatChip icon="📡" label="Total radar" value={nbTotal} color={NOIR} />
        <StatChip icon="📋" label="À contacter" value={nbToContact} color={BLEU} active={statusFilter==='to_contact'} onClick={function(){ setStatusFilter(statusFilter==='to_contact'?'all':'to_contact') }} />
        <StatChip icon="📞" label="En cours" value={nbContacted} color={ROSE} active={statusFilter==='contacted'} onClick={function(){ setStatusFilter(statusFilter==='contacted'?'all':'contacted') }} />
        <StatChip icon="🏆" label="Gagnés" value={nbWon} color={VERT} active={statusFilter==='won'} onClick={function(){ setStatusFilter(statusFilter==='won'?'all':'won') }} />
        <StatChip icon="💰" label="Valeur pot." value={(totalValue/1000).toFixed(0)+'k€'} color={OR} />
      </div>

      {/* ===== RECHERCHE + TRI ===== */}
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
        <input className="inp" style={{flex:1,minWidth:140}} value={search} onChange={function(e){ setSearch(e.target.value) }} placeholder="🔍 Rechercher (nom, arr., type)..." />
        <select className="inp" style={{width:130}} value={sort} onChange={function(e){ setSort(e.target.value) }}>
          <option value="score">Tri : Score</option>
          <option value="valeur">Tri : Valeur</option>
          <option value="name">Tri : A-Z</option>
        </select>
      </div>

      {/* ===== TAGS CATÉGORIES ===== */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        <CatTag active={catFilter==='all'} onClick={function(){ setCatFilter('all') }} emoji="☰" label={'Tous ('+nbTotal+')'} />
        {Object.keys(CATS).filter(function(k){ return k!=='all' && presentCats[k] }).map(function(k){
          return <CatTag key={k} active={catFilter===k} onClick={function(){ setCatFilter(k) }} emoji={CATS[k].emoji} label={CATS[k].label+' ('+presentCats[k]+')'} />
        })}
      </div>

      {/* ===== ÉTATS ===== */}
      {loading && <div style={{padding:40,textAlign:'center',opacity:0.5,fontWeight:700}}>⏳ Chargement du radar...</div>}
      {!loading && filtered.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:'30px 20px'}}>
          <div style={{fontSize:36,marginBottom:8}}>📡</div>
          <div style={{fontWeight:900,fontSize:15}}>Aucun lead {catFilter!=='all'||statusFilter!=='all'||search?'pour ce filtre':'pour l\'instant'}</div>
          <div style={{fontSize:12,opacity:0.5,marginTop:4}}>{catFilter!=='all'||statusFilter!=='all'||search?'Change les filtres':'Lance une génération IA ci-dessus !'}</div>
        </div>
      )}

      {/* ===== GRILLE DE CARTES ===== */}
      {!loading && filtered.length > 0 && (
        <div className="g-cards">
          {filtered.map(function(p){
            return <LeadCard key={p.id} p={p}
              onOpen={function(){ setEditLead(p) }}
              onEmail={function(){ generateEmail(p) }}
              onContacted={function(){ markContacted(p) }}
              onRelance={function(){ relance(p) }}
              onReponse={function(rep){ reponse(p, rep) }}
              onWon={function(){ markWon(p) }}
              onSendCrm={onSendToCrm ? function(){ sendToCrm(p) } : null}
              onDelete={function(){ delLead(p) }}
            />
          })}
        </div>
      )}

      <style>{'.g-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}@media(max-width:520px){.g-cards{grid-template-columns:1fr}}'}</style>

      {/* ===== MODAL FICHE ÉDITABLE ===== */}
      {editLead && (
        <LeadModal
          lead={editLead}
          onClose={function(){ setEditLead(null) }}
          onSave={function(fields){ saveLead(editLead.id, fields) }}
          onSendCrm={onSendToCrm ? function(){ sendToCrm(editLead); setEditLead(null) } : null}
        />
      )}
    </div>
  )
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function StatChip(props) {
  var active = props.active
  var clickable = !!props.onClick
  return (
    <div onClick={props.onClick} style={{
      flex:'1 1 0', minWidth:100,
      background: active ? props.color : '#FFFFFF',
      color: active ? '#FFFFFF' : NOIR,
      border:'2px solid '+NOIR, borderRadius:8, padding:'10px 12px',
      boxShadow: active ? '3px 3px 0 '+NOIR : '2px 2px 0 '+NOIR,
      cursor: clickable ? 'pointer' : 'default', transition:'all .12s'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
        <span style={{fontSize:13}}>{props.icon}</span>
        <span style={{fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:0.3,opacity:active?0.95:0.6}}>{props.label}</span>
      </div>
      <div style={{fontWeight:900,fontSize:20,lineHeight:1,color:active?'#FFFFFF':props.color}}>{props.value}</div>
    </div>
  )
}

function CatTag(props) {
  var active = props.active
  return (
    <div onClick={props.onClick} style={{
      fontSize:11, fontWeight:900, padding:'5px 11px', borderRadius:16,
      border:'2px solid '+NOIR, background:active?ROSE:'#FFFFFF', color:active?'#FFFFFF':NOIR,
      cursor:'pointer', whiteSpace:'nowrap', transition:'all .1s'
    }}>{props.emoji} {props.label}</div>
  )
}

function LeadCard(props) {
  var p = props.p
  var cat = CATS[p.cat] || { emoji:'📍', label:p.cat }
  var scoreHot = p.score >= 9
  var siteUrl = p.site && p.site !== '—' ? (p.site.indexOf('http') === 0 ? p.site : 'https://' + p.site) : null

  return (
    <div style={{background:'#FFFFFF',border:'2px solid '+NOIR,borderRadius:9,padding:14,boxShadow:'3px 3px 0 '+NOIR,display:'flex',flexDirection:'column',gap:10}}>
      {/* Ligne badges + bouton Fiche (hors zone cliquable) */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
        <span style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'3px 8px',border:'2px solid '+NOIR,borderRadius:4,background:JAUNE}}>{cat.emoji} {cat.label}</span>
        <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:900,background:scoreHot?ROSE:'#EBEBEB',color:scoreHot?'#FFFFFF':NOIR,border:'2px solid '+NOIR,borderRadius:4,padding:'2px 7px'}}>{p.score}/10</span>
          {p.status !== 'to_contact' && <span style={{fontSize:9,fontWeight:900,color:STATUS_COLORS[p.status],border:'1.5px solid '+STATUS_COLORS[p.status],borderRadius:10,padding:'2px 7px'}}>{STATUS_LABELS[p.status]}</span>}
          <button onClick={props.onOpen} title="Modifier la fiche" style={{fontSize:13,fontWeight:900,background:'#FFFFFF',border:'2px solid '+NOIR,borderRadius:5,padding:'1px 7px',cursor:'pointer',lineHeight:1.4}}>✏️</button>
        </div>
      </div>

      {/* --- Zone cliquable (ouvre la fiche) --- */}
      <div onClick={props.onOpen} style={{cursor:'pointer',display:'flex',flexDirection:'column',gap:10}}>
        {/* Nom + meta */}
        <div>
          <div style={{fontWeight:900,fontSize:16,lineHeight:1.15}}>{p.name}</div>
          <div style={{fontSize:11,opacity:0.5,marginTop:2,fontWeight:600}}>{p.arr}{p.taille?' · '+p.taille+' emp.':''}</div>
        </div>

        {/* Décideur (si renseigné) */}
        {p.contact_name && p.contact_name !== '—' && (
          <div style={{fontSize:11,fontWeight:700}}>
            👤 {p.contact_name}{p.contact_role && p.contact_role !== '—' ? ' · ' + p.contact_role : ''}
          </div>
        )}

        {/* Valeurs */}
        {(p.ve > 0 || p.vm > 0) && (
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {p.ve > 0 && <span style={{fontSize:12,fontWeight:900,color:VERT}}>~{Number(p.ve).toLocaleString('fr-FR')}€/event</span>}
            {p.vm > 0 && <span style={{fontSize:12,fontWeight:900,color:VERT}}>~{Number(p.vm).toLocaleString('fr-FR')}€/mois</span>}
          </div>
        )}

        {/* Pitch */}
        {p.pitch && <div style={{background:JAUNE,border:'2px solid '+NOIR,borderRadius:6,padding:'8px 10px',fontSize:12,lineHeight:1.4}}>💡 {p.pitch}</div>}

        {/* Dernière action */}
        {p.last_action && <div style={{fontSize:9,opacity:0.45,fontStyle:'italic'}}>→ {p.last_action}{p.relance_date?' · relance '+p.relance_date:''}</div>}
      </div>

      {/* Contacts (cliquables vers mail/tel, hors zone d'ouverture) */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:11,opacity:0.75}}>
        {p.contact_email && p.contact_email !== '—' && <a href={'mailto:'+p.contact_email} style={{color:NOIR,textDecoration:'none'}}>✉️ {p.contact_email}</a>}
        {p.contact_phone && p.contact_phone !== '—' && <a href={'tel:'+p.contact_phone} style={{color:NOIR,textDecoration:'none'}}>📞 {p.contact_phone}</a>}
        {siteUrl && <a href={siteUrl} target="_blank" rel="noopener noreferrer" style={{color:BLEU,textDecoration:'none',fontWeight:700}}>🌐 Site</a>}
      </div>

      {/* Actions — séquence de contact */}
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:'auto',paddingTop:8,borderTop:'1px solid #EEE'}}>
        <button className="btn btn-p btn-sm" style={{fontSize:10}} onClick={props.onEmail}>✉️ Email IA</button>
        {p.status === 'to_contact' && <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={props.onContacted}>📞 Contacté</button>}
        {p.status === 'contacted' && (
          <span style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            <button className="btn btn-sm" style={{background:BLEU,color:'#fff',fontSize:10}} onClick={props.onRelance}>↩ Relancer</button>
            <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={function(){ props.onReponse('interesse') }}>✅ Intéressé</button>
            <button className="btn btn-sm" style={{background:ORANGE,color:'#fff',fontSize:10}} onClick={function(){ props.onReponse('rappeler') }}>📞 Rappeler</button>
            <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){ props.onReponse('lost') }}>✗ Non</button>
          </span>
        )}
        {p.status === 'nego' && <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={props.onWon}>🏆 Gagné</button>}
        {/* Bouton CRM : visible tant que pas déjà envoyé, gagné ou perdu */}
        {props.onSendCrm && !p.sent_to_crm && p.status !== 'won' && p.status !== 'lost' && (
          <button className="btn btn-sm" style={{background:ROSE,color:'#fff',fontSize:10,fontWeight:900}} onClick={props.onSendCrm}>→ CRM</button>
        )}
        {p.sent_to_crm && p.status !== 'won' && <span style={{fontSize:9,fontWeight:900,padding:'3px 8px',background:'#EBF3FF',color:BLEU,border:'1.5px solid '+BLEU,borderRadius:10}}>↗ Dans le CRM</span>}
        {p.status === 'won' && <span style={{fontSize:9,fontWeight:900,padding:'3px 8px',background:'#F0FFF4',color:VERT,border:'1.5px solid '+VERT,borderRadius:10}}>🏆 Client</span>}
        <button className="btn btn-sm btn-red" style={{fontSize:10,marginLeft:'auto'}} onClick={props.onDelete} title="Supprimer">✕</button>
      </div>
    </div>
  )
}

// =============================================================================
// MODAL FICHE ÉDITABLE
// =============================================================================

function LeadModal(props) {
  var lead = props.lead
  var [f, setF] = useState({
    name: lead.name || '',
    cat: lead.cat || 'evenementiel',
    score: lead.score || 5,
    status: lead.status || 'to_contact',
    contact_name: lead.contact_name && lead.contact_name !== '—' ? lead.contact_name : '',
    contact_role: lead.contact_role && lead.contact_role !== '—' ? lead.contact_role : '',
    contact_email: lead.contact_email && lead.contact_email !== '—' ? lead.contact_email : '',
    contact_phone: lead.contact_phone && lead.contact_phone !== '—' ? lead.contact_phone : '',
    site: lead.site && lead.site !== '—' ? lead.site : '',
    arr: lead.arr || '',
    adresse: lead.adresse || '',
    taille: lead.taille || '',
    type: lead.type || '',
    ve: lead.ve || 0,
    vm: lead.vm || 0,
    pitch: lead.pitch || '',
    notes: lead.notes || ''
  })

  function set(k, v) { setF(function(prev){ var n = Object.assign({}, prev); n[k] = v; return n }) }

  function handleSave() {
    props.onSave({
      name: f.name, cat: f.cat, score: parseInt(f.score) || 5, status: f.status,
      contact_name: f.contact_name || '—', contact_role: f.contact_role || '—',
      contact_email: f.contact_email || '—', contact_phone: f.contact_phone || '—',
      site: f.site || '—', arr: f.arr, adresse: f.adresse, taille: f.taille,
      type: f.type, ve: parseInt(f.ve) || 0, vm: parseInt(f.vm) || 0,
      pitch: f.pitch, notes: f.notes, updated_at: new Date().toISOString()
    })
  }

  var lblStyle = { fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:0.3, opacity:0.6, display:'block', marginBottom:3 }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(25,25,35,.6)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px',overflowY:'auto'}} onClick={props.onClose}>
      <div style={{background:'#FFFFFF',borderRadius:12,width:'100%',maxWidth:560,border:'3px solid '+NOIR,boxShadow:'5px 5px 0 '+NOIR,marginTop:20,marginBottom:40}} onClick={function(e){ e.stopPropagation() }}>

        {/* En-tête */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'2px solid '+NOIR,position:'sticky',top:0,background:'#FFF7FC',borderRadius:'9px 9px 0 0'}}>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:ROSE,lineHeight:1}}>Fiche prospect</div>
          <button style={{background:'#FFFFFF',border:'2px solid '+NOIR,borderRadius:'50%',width:32,height:32,cursor:'pointer',fontWeight:900}} onClick={props.onClose}>✕</button>
        </div>

        <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>

          {/* Entreprise */}
          <div>
            <label style={lblStyle}>Nom de l&apos;entreprise</label>
            <input className="inp" value={f.name} onChange={function(e){ set('name', e.target.value) }} style={{width:'100%',fontWeight:900,fontSize:15}} />
          </div>

          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 160px'}}>
              <label style={lblStyle}>Catégorie</label>
              <select className="inp" value={f.cat} onChange={function(e){ set('cat', e.target.value) }} style={{width:'100%'}}>
                {Object.keys(CATS).filter(function(k){ return k!=='all' }).map(function(k){ return <option key={k} value={k}>{CATS[k].emoji + ' ' + CATS[k].label}</option> })}
              </select>
            </div>
            <div style={{flex:'0 0 80px'}}>
              <label style={lblStyle}>Score</label>
              <select className="inp" value={f.score} onChange={function(e){ set('score', e.target.value) }} style={{width:'100%'}}>
                {[1,2,3,4,5,6,7,8,9,10].map(function(n){ return <option key={n} value={n}>{n}/10</option> })}
              </select>
            </div>
            <div style={{flex:'1 1 140px'}}>
              <label style={lblStyle}>Statut</label>
              <select className="inp" value={f.status} onChange={function(e){ set('status', e.target.value) }} style={{width:'100%'}}>
                <option value="to_contact">À contacter</option>
                <option value="contacted">Contacté</option>
                <option value="nego">En négo</option>
                <option value="won">Gagné</option>
                <option value="lost">Perdu</option>
              </select>
            </div>
          </div>

          {/* Bloc décideur — mis en avant */}
          <div style={{background:'#FFF7FC',border:'2px solid '+ROSE,borderRadius:8,padding:'14px'}}>
            <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,color:ROSE}}>👤 Le décideur</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <div style={{flex:'1 1 180px'}}>
                <label style={lblStyle}>Prénom &amp; nom</label>
                <input className="inp" value={f.contact_name} onChange={function(e){ set('contact_name', e.target.value) }} placeholder="Marie Dupont" style={{width:'100%'}} />
              </div>
              <div style={{flex:'1 1 160px'}}>
                <label style={lblStyle}>Rôle / poste</label>
                <input className="inp" value={f.contact_role} onChange={function(e){ set('contact_role', e.target.value) }} placeholder="Office Manager" style={{width:'100%'}} />
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:10}}>
              <div style={{flex:'1 1 180px'}}>
                <label style={lblStyle}>Email direct</label>
                <input className="inp" value={f.contact_email} onChange={function(e){ set('contact_email', e.target.value) }} placeholder="marie@entreprise.fr" style={{width:'100%'}} />
              </div>
              <div style={{flex:'1 1 140px'}}>
                <label style={lblStyle}>Téléphone</label>
                <input className="inp" value={f.contact_phone} onChange={function(e){ set('contact_phone', e.target.value) }} placeholder="06 12 34 56 78" style={{width:'100%'}} />
              </div>
            </div>
          </div>

          {/* Coordonnées entreprise */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 140px'}}>
              <label style={lblStyle}>Arrondissement / zone</label>
              <input className="inp" value={f.arr} onChange={function(e){ set('arr', e.target.value) }} placeholder="Paris 8e" style={{width:'100%'}} />
            </div>
            <div style={{flex:'1 1 120px'}}>
              <label style={lblStyle}>Taille (employés)</label>
              <input className="inp" value={f.taille} onChange={function(e){ set('taille', e.target.value) }} placeholder="50-100" style={{width:'100%'}} />
            </div>
            <div style={{flex:'1 1 140px'}}>
              <label style={lblStyle}>Site web</label>
              <input className="inp" value={f.site} onChange={function(e){ set('site', e.target.value) }} placeholder="entreprise.fr" style={{width:'100%'}} />
            </div>
          </div>

          <div>
            <label style={lblStyle}>Adresse</label>
            <input className="inp" value={f.adresse} onChange={function(e){ set('adresse', e.target.value) }} placeholder="12 rue de la Paix, 75002 Paris" style={{width:'100%'}} />
          </div>

          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 130px'}}>
              <label style={lblStyle}>Valeur / event (€)</label>
              <input className="inp" type="number" value={f.ve} onChange={function(e){ set('ve', e.target.value) }} style={{width:'100%'}} />
            </div>
            <div style={{flex:'1 1 130px'}}>
              <label style={lblStyle}>Valeur / mois (€)</label>
              <input className="inp" type="number" value={f.vm} onChange={function(e){ set('vm', e.target.value) }} style={{width:'100%'}} />
            </div>
            <div style={{flex:'1 1 160px'}}>
              <label style={lblStyle}>Type de besoin</label>
              <input className="inp" value={f.type} onChange={function(e){ set('type', e.target.value) }} placeholder="Plateaux déjeuner" style={{width:'100%'}} />
            </div>
          </div>

          {/* Pitch */}
          <div>
            <label style={lblStyle}>💡 Pitch / angle d&apos;approche</label>
            <textarea className="inp" value={f.pitch} onChange={function(e){ set('pitch', e.target.value) }} rows={2} style={{width:'100%',resize:'vertical',fontFamily:'inherit'}} />
          </div>

          {/* Notes */}
          <div>
            <label style={lblStyle}>📝 Notes (échanges, infos, contexte...)</label>
            <textarea className="inp" value={f.notes} onChange={function(e){ set('notes', e.target.value) }} rows={4} placeholder="Tout ce que tu sais sur ce prospect : historique, préférences, objections, dates clés..." style={{width:'100%',resize:'vertical',fontFamily:'inherit'}} />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{display:'flex',gap:8,padding:'14px 20px',borderTop:'2px solid '+NOIR,position:'sticky',bottom:0,background:'#FFFFFF',borderRadius:'0 0 9px 9px',flexWrap:'wrap'}}>
          <button className="btn btn-p" style={{flex:1,minWidth:140,justifyContent:'center',fontWeight:900}} onClick={handleSave}>💾 Enregistrer</button>
          {props.onSendCrm && !lead.sent_to_crm && (
            <button className="btn" style={{background:ROSE,color:'#fff',fontWeight:900,justifyContent:'center'}} onClick={props.onSendCrm}>→ Envoyer au CRM</button>
          )}
          <button className="btn" style={{background:'#FFFFFF',border:'2px solid '+NOIR,justifyContent:'center'}} onClick={props.onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
