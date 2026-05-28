'use client' // build-fix
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import FoodCostTab from './FoodCostTab'
import PurchasesTab from './PurchasesTab'
import PilotageTab from './PilotageTab'
import FoodCostAlertsWidget from './FoodCostAlertsWidget'
import InvoicesReceivedWidget from './InvoicesReceivedWidget'
import NotifsTab from './NotifsTab'
import JournalTab from './JournalTab'
import InstaTab from './InstaTab'
import DashboardModals from './DashboardModals'
import QuotesTab from './catering/QuotesTab'
import QuoteEditor from './catering/QuoteEditor'
import QuoteWizard from './catering/QuoteWizard'
import RhTab from './RhTab'
import LegalTab from './LegalTab'
import WeatherWidget from './WeatherWidget'
import FoodCostAlertWidget from './FoodCostAlertWidget'
import ZdeCaisseWidget from './ZdeCaisseWidget'
import HomeOverviewTab from './HomeOverviewTab'
import Sidebar from './Sidebar'
import FloatingChat from './FloatingChat'
import TasksTab from './TasksTab'
import CrmTab from './CrmTab'
import ProspectionTab from './ProspectionTab'
import { G } from './styles'
import { LOGO_PINK, LOGO_YELLOW, STAMP_YELLOW, STAMP_PINK } from './logos'
import {
  CATS_MAP, STATUS_P, STATUS_PC, TASK_S, CAT_ANN,
  INIT_TASKS, INIT_PROSPECTS, INIT_CONTACTS, INIT_VAULT,
  RECIPES_DATA, FC_CATALOG, ALL_PROSPECTS
} from './data'

const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)
const sb = () => _supabase

function DashboardImpl() {
  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('dash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [prospects, setProspects] = useState(INIT_PROSPECTS)
  const [contacts, setContacts] = useState([])
  const [annCat, setAnnCat] = useState('all')
  const [priceAlerts, setPriceAlerts] = useState([])
  const [vault, setVault] = useState(INIT_VAULT)
  const [reports, setReports] = useState([])
  const [toastMsg, setToastMsg] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState({})
  const [pwVisible, setPwVisible] = useState({})
  const [contactedToday, setContactedToday] = useState(0)
  const [activityLog, setActivityLog] = useState([])
  const [journalUser, setJournalUser] = useState('all')
  const [planningWeek, setPlanningWeek] = useState(0)
  const [planningView, setPlanningView] = useState('3j')
  const [taskStatusFilter, setTaskStatusFilter] = useState('all')
  const [chasseCat, setChasseChasse] = useState('all')
  const [chasseSearch, setChasseSearch] = useState('')
  const [chasseSort, setChasseSort] = useState('score')
  const [chasseStatus, setChasseStatus2] = useState('all')
  const [chasse, setChasse] = useState(ALL_PROSPECTS.map(function(p) { return Object.assign({}, p) }))
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [emailProspect, setEmailProspect] = useState(null)
  const [zeltyData, setZeltyData] = useState(null)
  const [zeltyLoading, setZeltyLoading] = useState(false)
  const [zeltyPeriod, setZeltyPeriod] = useState('day')
  const [devisList, setDevisList] = useState([])
  const [devisView, setDevisView] = useState('list')
  const [currentDevisId, setCurrentDevisId] = useState(null)
  const [cateringWizardOpen, setCateringWizardOpen] = useState(false)
  const [devisMode, setDevisMode] = useState('catering')
  const [cateringEditorOpen, setCateringEditorOpen] = useState(false)
  const [cateringEditingId, setCateringEditingId] = useState(null)
  const [devisLivraison, setDevisLivraison] = useState(0)
  const [devisLivraisonOffert, setDevisLivraisonOffert] = useState(false)
  const [devisMepOffert, setDevisMepOffert] = useState(false)
  const [devisNbPersonnes, setDevisNbPersonnes] = useState(50)
  const [devisFormat, setDevisFormat] = useState('normal')
  const [devisItems, setDevisItems] = useState([])
  const [devisMiseEnPlace, setDevisMiseEnPlace] = useState(1500)
  const [devisMiseEnPlaceRemise, setDevisMiseEnPlacePct] = useState(0)
  const [devisRemiseTotal, setDevisRemiseTotal] = useState(0)
  const [devisClient, setDevisClient] = useState({nom:'',contact:'',email:'',phone:'',date:'',lieu:'',prospectId:null})
  const [devisNotes, setDevisNotes] = useState('')
  const [devisNumero, setDevisNumero] = useState('DEV-2026-001')
  const [crmFilter, setCrmFilter] = useState('all')
  const [scriptProspect, setScriptProspect] = useState(null)
  const [scriptContent, setScriptContent] = useState('')
  const [scriptLoading, setScriptLoading] = useState(false)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [scoringLoading, setScoringLoading] = useState(false)
  const [instaData, setInstaData] = useState(null)
  const [instaLoading, setInstaLoading] = useState(false)
  const [commissionObjectif, setCommissionObjectif] = useState(2000)
  const [fcSeuil, setFcSeuil] = useState(25)
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgUnread, setMsgUnread] = useState(0)
  const [fcRecipes, setFcRecipes] = useState(function(){
    try {
      var FC_VERSION = 'v7_spread_fix'
      var storedVersion = localStorage.getItem('meshuga_fc_version')
      if (storedVersion !== FC_VERSION) {
        localStorage.removeItem('meshuga_fc_recipes')
        localStorage.removeItem('meshuga_fc_prix_ttc')
        localStorage.setItem('meshuga_fc_version', FC_VERSION)
        return RECIPES_DATA
      }
      var saved = localStorage.getItem('meshuga_fc_recipes')
      if (saved) return JSON.parse(saved)
    } catch(e) {}
    return RECIPES_DATA
  })
  const [fcAlertCat, setFcAlertCat] = useState('tous')
  const [fcPriceAnalysis, setFcPriceAnalysis] = useState(null)
  const [fcPriceLoading, setFcPriceLoading] = useState(false)
  const [gmbData, setGmbData] = useState(null)
  const [gmbLoading, setGmbLoading] = useState(false)
  const [gmbFilter, setGmbFilter] = useState('all')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [aiEventsLoading, setAiEventsLoading] = useState(false)
  const [calEvents, setCalEvents] = useState([])
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calView, setCalView] = useState('list')

  useEffect(function() { setMounted(true) }, [])

  useEffect(function() {
    // Timer securite 10s
    var hardTimer = setTimeout(function() {
      window.location.href = '/login'
    }, 10000)

    var profileSet = false

    function handleSession(session) {
      clearTimeout(hardTimer)
      if (!session || !session.user) {
        if (!profileSet) window.location.href = '/login'
        return
      }
      if (profileSet) return
      profileSet = true
      var user = session.user
      sb().from('profiles').select('*').eq('id', user.id).single().then(function(r2) {
        var prof = r2.data
        if (prof && prof.role) {
          setProfile(prof)
        } else {
          var role = user.email && user.email.includes('emy') ? 'emy' : 'edward'
          setProfile({ role: role, full_name: role === 'emy' ? 'Emy' : 'Edward', email: user.email })
        }
      })
    }

    // getSession en premier - fix Safari + remount React
    sb().auth.getSession().then(function(r) {
      if (r.data && r.data.session) {
        handleSession(r.data.session)
      }
    })

    // onAuthStateChange pour les changements futurs
    var sub = sb().auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        handleSession(session)
      }
    })

    return function() {
      clearTimeout(hardTimer)
      if (sub && sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe()
      }
    }
  }, [])

  useEffect(function() {
    if (!profile) return
    setZeltyLoading(true)
    fetch('/api/zelty').then(function(r){return r.json()}).then(function(d){setZeltyData(d);setZeltyLoading(false)}).catch(function(){setZeltyLoading(false)})
    sb().from('devis').select('*').order('created_at',{ascending:false}).then(function(r){if(r.data)setDevisList(r.data)})
    fetch('/api/gmb').then(function(r){return r.json()}).then(function(d){setGmbData(d)}).catch(function(){})
    sb().from('activity_log').select('*').order('created_at', {ascending: false}).limit(200).then(function(r) {
      if (r.data) setActivityLog(r.data)
    })
    sb().from('activity_log').insert({user_role: profile.role, user_name: profile.full_name || profile.role, type: 'session_start', description: 'Connexion au B2B Manager', prospect_name: null, email_content: null}).then(function(r) {
      if (r.error) { console.warn('[Journal] session_start insert error:', r.error.message) }
    })
  }, [profile])

  useEffect(function() {
    if (!profile) return
    loadContacts()
    loadMessages()
    loadCalEvents()
    // Check push subscription status
    loadPriceAlerts()
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration('/sw.js').then(function(reg) {
        if (reg) {
          reg.pushManager.getSubscription().then(function(sub) {
            if (sub) setPushEnabled(true)
          })
        }
      })
    }
  }, [profile])

  // Auto-refresh tasks + planning toutes les 30s + au retour sur l'app
  useEffect(function() {
    if (!profile) return
    var interval = setInterval(function() {
      loadTasks()
      loadCalEvents()
    }, 30000)
    var onVisible = function() {
      if (document.visibilityState === 'visible') {
        loadTasks()
        loadCalEvents()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return function() {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [profile])

  useEffect(function() {
    if (!profile) return
    var startTime = Date.now()
    var inactivityTimer = null
    var INACTIVITY_MS = 20 * 60 * 1000
    function closeSession() {
      var duration = Math.round((Date.now() - startTime) / 60000)
      if (duration < 1) duration = 1
      logActivity('session_end', 'Fin de session — durée : ' + duration + ' min', null, null)
    }
    function resetTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(function() {
        closeSession()
        startTime = Date.now()
        logActivity('session_start', 'Reprise de session (inactivité)', null, null)
      }, INACTIVITY_MS)
    }
    var events = ['mousedown','keydown','scroll','touchstart']
    events.forEach(function(e) { window.addEventListener(e, resetTimer, true) })
    window.addEventListener('beforeunload', closeSession)
    resetTimer()
    return function() {
      events.forEach(function(e) { window.removeEventListener(e, resetTimer, true) })
      window.removeEventListener('beforeunload', closeSession)
      if (inactivityTimer) clearTimeout(inactivityTimer)
    }
  }, [profile])

  useEffect(function() {
    if (page !== 'gmb') return
    setGmbLoading(true)
    fetch('/api/gmb').then(function(r) { return r.json() }).then(function(d) {
      setGmbData(d)
      setGmbLoading(false)
    }).catch(function() {
      setGmbLoading(false)
      setGmbData({ok: false, error: 'Erreur de connexion GMB'})
    })
  }, [page])

  useEffect(function() {
    if (page !== 'instagram') return
    setInstaLoading(true)
    fetch('/api/instagram').then(function(r) { return r.json() }).then(function(d) {
      setInstaData(d)
      setInstaLoading(false)
    }).catch(function() {
      setInstaLoading(false)
    })
  }, [page])

  useEffect(function(){
    if(page === 'messagerie'){
      loadMessages()
      var el = document.getElementById('msg-list')
      if(el) el.scrollTop = el.scrollHeight
    }
  }, [page])

  useEffect(function(){
    var el = document.getElementById('msg-list')
    if(el) el.scrollTop = el.scrollHeight
  }, [messages])

  const toast = function(msg) { setToastMsg(msg); setTimeout(function() { setToastMsg('') }, 2800) }
  const openModal = function(id, data) { setForm(data || {}); setModal(id) }
  const closeModal = function() { setModal(''); setForm({}) }
  const nav = function(p) { setPage(p); setSidebarOpen(false) }

  const today = new Date().toISOString().split('T')[0]
  const isEmy = profile && profile.role === 'emy'
  const senderSig = isEmy ? 'Emy | B2B Manager | emy@meshuga.fr | +33 6 24 67 78 66' : 'Edward | Big Boss | edward@meshuga.fr | +33 6 58 58 58 01'

  const VAPID_PUBLIC_KEY = 'BBwJb444Jzo-UcTnBZbiy6BCZOZM7W0IbsQbkK2-Tw9RijSHRu3vtbOpyIG4jQoF_BvWyL8Nq-unbiYrneRKTx4'
  const SUPABASE_FN_URL = 'https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push'

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4)
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    var rawData = window.atob(base64)
    var outputArray = new Uint8Array(rawData.length)
    for (var i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i) }
    return outputArray
  }

  function registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast('Push non supporté sur ce navigateur'); return
    }
    setPushLoading(true)
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      // Attendre que le SW soit prêt (évite les états intermédiaires)
      return navigator.serviceWorker.ready.then(function() { return reg })
    }).then(function(reg) {
      return Notification.requestPermission().then(function(perm) {
        if (perm !== 'granted') { toast('Notifications refusées'); setPushLoading(false); return }
        // 1. Révoquer toute souscription existante (évite la réutilisation fantôme)
        return reg.pushManager.getSubscription().then(function(existing) {
          var cleanup = existing ? existing.unsubscribe().catch(function(){ return null }) : Promise.resolve(null)
          return cleanup.then(function() {
            // 2. Créer une souscription neuve
            return reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })
          })
        }).then(function(sub) {
          // 3. Enregistrer en base — on attend vraiment la réponse
          var subJson = sub.toJSON()
          return fetch('/api/push-subscribe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              subscription: subJson,
              userRole: (profile && profile.role) || 'edward',
              userName: (profile && profile.full_name) || ''
            })
          }).then(function(res) {
            return res.json().then(function(data) {
              if (res.ok && data && data.ok) {
                setPushEnabled(true)
                toast('🔔 Notifications activées !')
              } else {
                toast('Erreur enregistrement: ' + ((data && data.error) || res.status))
              }
              setPushLoading(false)
            })
          })
        })
      })
    }).catch(function(e) {
      console.error('registerPush error:', e)
      toast('Erreur push: ' + (e.message || e))
      setPushLoading(false)
    })
  }

  function unregisterPush() {
    setPushLoading(true)
    navigator.serviceWorker.getRegistration('/sw.js').then(function(reg) {
      if (!reg) { setPushEnabled(false); setPushLoading(false); toast('Notifications désactivées'); return }
      return reg.pushManager.getSubscription().then(function(sub) {
        if (!sub) { setPushEnabled(false); setPushLoading(false); toast('Notifications désactivées'); return }
        // Supprimer en base PUIS désinscrire le navigateur
        return fetch('/api/push-subscribe', {
          method: 'DELETE',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({endpoint: sub.endpoint})
        }).then(function() {
          return sub.unsubscribe()
        }).then(function() {
          setPushEnabled(false)
          setPushLoading(false)
          toast('Notifications désactivées')
        })
      })
    }).catch(function(e) {
      console.error('unregisterPush error:', e)
      setPushEnabled(false)
      setPushLoading(false)
    })
  }

  function generateScript(p) {
    setScriptProspect(p)
    setScriptContent('')
    setScriptLoading(true)
    fetch('/api/generate-script', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        prospect: {
          name: p.name,
          category: p.category || p.cat || '',
          size: p.size || p.taille || '',
          notes: p.notes || p.pitch || '',
          status: p.status,
          temperature: p.temperature,
          email: p.email,
          arrondissement: p.arrondissement || ''
        }
      })
    })
    .then(function(r){return r.json()})
    .then(function(d){
      setScriptContent(d.content || d.email || d.text || 'Erreur génération')
      setScriptLoading(false)
    })
    .catch(function(e){
      setScriptContent('Erreur: '+e.message)
      setScriptLoading(false)
    })
  }

  function autoScore() {
    if (prospects.length === 0) { toast('Aucun prospect à scorer'); return }
    setScoringLoading(true)
    var batch = prospects.filter(function(p){ return p.status !== 'won' && p.status !== 'lost' }).slice(0, 20)
    fetch('/api/score-prospects', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ prospects: batch })
    })
    .then(function(r){ return r.json() })
    .then(function(d) {
      if (d.scores) {
        setProspects(function(prev) {
          return prev.map(function(p) {
            var found = d.scores.find(function(s) { return s.id === p.id })
            return found ? Object.assign({}, p, { score: found.score, scoreReason: found.reason }) : p
          })
        })
        toast('🎯 Scoring mis à jour !')
      }
    })
    .catch(function(e){ toast('Erreur scoring: ' + e.message) })
    .finally(function(){ setScoringLoading(false) })
  }

  function enrichProspect() {
    var name = form.name || ''
    if (!name || name.length < 2) { toast("Saisis d'abord le nom de l'entreprise"); return }
    setEnrichLoading(true)
    fetch('/api/enrich-prospect', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name: name })
    })
    .then(function(r){ return r.json() })
    .then(function(d) {
      if (d.error) { toast('Erreur: ' + d.error); return }
      setForm(function(prev) {
        return Object.assign({}, prev, {
          category: d.category || prev.category,
          size: d.size || prev.size,
          email: d.email || prev.email,
          phone: d.phone || prev.phone,
          notes: d.pitch ? (prev.notes ? prev.notes + '\n' + d.pitch : d.pitch) : prev.notes,
          temperature: d.temperature || prev.temperature
        })
      })
      toast("✨ Fiche enrichie par l'IA !")
    })
    .catch(function(e){ toast('Erreur: ' + e.message) })
    .finally(function(){ setEnrichLoading(false) })
  }

  function sendPushToAll(title, body, target) {
    fetch(SUPABASE_FN_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({title: title, body: body, target: target || 'all'})
    }).catch(function(e) { console.error('Push send error:', e) })
  }

  function logActivity(type, description, prospectName, emailContent) {
    const entry = {user_role: (profile && profile.role) || 'unknown', user_name: (profile && profile.full_name) || '?', type: type, description: description, prospect_name: prospectName || null, email_content: emailContent || null}
    sb().from('activity_log').insert(entry)
    setActivityLog(function(prev) { return [{id: Date.now(), created_at: new Date().toISOString(), user_role: entry.user_role, user_name: entry.user_name, type: type, description: description, prospect_name: prospectName || null, email_content: emailContent || null}].concat(prev.slice(0, 199)) })
  }

  function loadTasks() {
    sb().from('tasks').select('*').order('created_at', {ascending: false}).then(function(res) {
      if (res.data) {
        setTasks(res.data.map(function(t) {
          return {
            id: t.id,
            title: t.title,
            assignee: t.assignee || 'edward',
            deadline: t.deadline || '',
            status: t.status || 'todo',
            priority: t.priority || 'medium',
            description: t.description || '',
            checklist: t.checklist || [],
            files: [],
            chasseId: null
          }
        }))
      }
    })
  }

  function loadPriceAlerts() {
    sb().from('price_history').select('*').eq('acknowledged', false).gt('change_pct', 0).order('change_pct', {ascending:false}).limit(10).then(function(res){
      if (res.data) setPriceAlerts(res.data)
    })
  }

  function dismissAlert(id) {
    sb().from('price_history').update({acknowledged: true}).eq('id', id).then(function(){
      setPriceAlerts(function(prev){ return prev.filter(function(a){ return a.id !== id }) })
    })
  }

  function loadDevis() {
    sb().from('devis').select('*').order('created_at',{ascending:false}).then(function(r){if(r.data)setDevisList(r.data)})
  }
  function loadCalEvents() {
    sb().from('cal_events').select('*').order('start_date',{ascending:true}).then(function(r){if(r.data)setCalEvents(r.data)})
  }
  function saveCalEvent(payload, cb) {
    if(payload.id) {
      var id=payload.id; var p=Object.assign({},payload); delete p.id
      sb().from('cal_events').update(p).eq('id',id).then(function(r){if(!r.error){loadCalEvents();if(cb)cb()}else toast('Erreur: '+r.error.message)})
    } else {
      sb().from('cal_events').insert(payload).then(function(r){if(!r.error){loadCalEvents();if(cb)cb()}else toast('Erreur: '+r.error.message)})
    }
  }
  function deleteCalEvent(id) {
    sb().from('cal_events').delete().eq('id',id).then(function(r){if(!r.error)loadCalEvents()})
  }
  function sendBriefing() {
    setBriefingLoading(true)
    fetch('/api/daily-briefing', {method:'POST'})
      .then(function(r){return r.json()})
      .then(function(d){
        setBriefingLoading(false)
        if(d.ok) toast('☀️ Briefing envoyé à Edward & Emy !')
        else toast('Erreur briefing')
      })
      .catch(function(){setBriefingLoading(false);toast('Erreur de connexion')})
  }
  function fetchAIEvents() {
    setAiEventsLoading(true)
    fetch('/api/cal-ai-events', {method:'POST'})
      .then(function(r){return r.json()})
      .then(function(d){
        setAiEventsLoading(false)
        if(d.ok){loadCalEvents();toast('✨ '+d.count+' suggestions IA ajoutées !')}
        else toast('Erreur IA: '+(d.error||'Inconnue'))
      })
      .catch(function(){setAiEventsLoading(false);toast('Erreur de connexion')})
  }
  function loadMessages() {
    sb().from('messages').select('*').order('created_at',{ascending:true}).limit(100)
      .then(function(res){
        if(res.data){
          setMessages(res.data)
          var myRole = profile && profile.email && profile.email.indexOf('emy') > -1 ? 'emy' : 'edward'
          var unread = res.data.filter(function(m){ return m.sender !== myRole && !m.read_at }).length
          setMsgUnread(unread)
          if(unread > 0){
            res.data.filter(function(m){ return m.sender !== myRole && !m.read_at })
              .forEach(function(m){
                sb().from('messages').update({read_at: new Date().toISOString()}).eq('id', m.id).then(function(){})
              })
          }
        }
      })
  }

  function sendMessage(text) {
    if (!text || !text.trim()) return
    var myRole = profile && profile.email && profile.email.indexOf('emy') > -1 ? 'emy' : 'edward'
    var msg = {sender: myRole, content: text.trim()}
    setMsgSending(true)
    sb().from('messages').insert([msg]).select().then(function(res){
      if (res.data) {
        setMessages(function(prev){ return prev.concat(res.data) })
        setMsgText('')
        fetch('https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({title: '\uD83D\uDCAC ' + (myRole === 'edward' ? 'Edward' : 'Emy'), body: text.trim().length > 80 ? text.trim().substring(0,80) + '\u2026' : text.trim(), target: myRole === 'edward' ? 'emy' : 'edward'})
        }).catch(function(){})
      }
      setMsgSending(false)
    })
  }

    function loadContacts() {
    sb().from('contacts').select('*').order('name',{ascending:true}).then(function(r){if(r.data)setContacts(r.data)})
  }
  function saveDevisToSupabase(payload, cb) {
    var isNew=!payload.id
    if(isNew){
      sb().from('devis').insert(payload).select().then(function(r){if(r.data&&r.data[0]){loadDevis();if(cb)cb(r.data[0])}})
    } else {
      var id=payload.id; var p=Object.assign({},payload); delete p.id; delete p.created_at
      sb().from('devis').update(p).eq('id',id).then(function(){loadDevis();if(cb)cb(payload)})
    }
  }
  function updateDevisStatut(id,statut,note) {
    sb().from('devis').update({statut:statut}).eq('id',id).then(function(){
      sb().from('devis_historique').insert({devis_id:id,action:statut,note:note||'',user_name:(profile&&profile.name)||''}).then(function(){})
      loadDevis()
    loadTasks()
      toast('Statut : '+statut)
      var dv = devisList.find(function(d){return String(d.id)===String(id)})
      if(dv && dv.prospect_id) {
        var ts = new Date().toLocaleDateString('fr-FR')
        var devisNote = '['+ts+'] Devis '+dv.numero+' statut : '+statut+(statut==='accepte'?' ✅ SIGNÉ':statut==='facture'?' 🧾 Facturé':statut==='paye'?' 💰 Soldé':'')
        setProspects(function(prev){return prev.map(function(p){
          if(String(p.id)!==String(dv.prospect_id)) return p
          var newN = (p.notes ? p.notes+'\n' : '') + devisNote
          return Object.assign({},p,{notes:newN})
        })})
      }
    })
  }
  function generateAndPrintDoc(dv, isFacture) {
    var items=(dv.items||[]).map(function(x){return '<tr><td>'+x.nom+'</td><td style="text-align:center">'+x.qte+'</td><td style="text-align:right">'+parseFloat(x.prix||x.pu_ht||0).toFixed(2)+' EUR</td><td style="text-align:right;font-weight:900">'+parseFloat(x.total_ht||0).toFixed(2)+' EUR</td></tr>'}).join('')
    var mep=parseFloat(dv.mep||dv.mise_en_place||0)
    var mepOffert=dv.mep_offert||dv.mise_en_place_offert
    var liv=parseFloat(dv.liv||dv.livraison||0)
    var livOffert=dv.liv_offert||dv.livraison_offert
    var mepHT=mepOffert?mep:mep*(1-(parseFloat(dv.mep_remise||dv.remise_mep_pct||0)/100))
    var livHT=livOffert?liv:liv
    var remisePct=parseFloat(dv.remise_pct||dv.remise_total_pct||0)
    var remiseMontant=parseFloat(dv.remise_montant||0)
    var totalHT=parseFloat(dv.total_ht||0)
    var tva=parseFloat(dv.tva||0)
    var totalTTC=parseFloat(dv.total_ttc||0)
    var numero=isFacture?(dv.facture_numero||dv.numero):dv.numero
    var titre=isFacture?'FACTURE':'DEVIS'
    var mepRow=mep>0?'<tr><td>'+(mepOffert?'<span style="text-decoration:line-through;opacity:.4">Mise en place / Show cooking</span> <strong style="color:#009D3A">OFFERT</strong>':'Mise en place / Show cooking')+'</td><td style="text-align:center">1</td><td style="text-align:right">'+(mepOffert?'<span style="text-decoration:line-through;opacity:.4">'+mep.toFixed(2)+' EUR</span>':mepHT.toFixed(2)+' EUR')+'</td><td style="text-align:right;font-weight:900">'+(mepOffert?'<strong style="color:#009D3A">0,00 EUR</strong>':mepHT.toFixed(2)+' EUR')+'</td></tr>':''
    var livRow=liv>0?'<tr><td>'+(livOffert?'<span style="text-decoration:line-through;opacity:.4">Frais de livraison</span> <strong style="color:#009D3A">OFFERT</strong>':'Frais de livraison')+'</td><td style="text-align:center">1</td><td style="text-align:right">'+(livOffert?'<span style="text-decoration:line-through;opacity:.4">'+liv.toFixed(2)+' EUR</span>':livHT.toFixed(2)+' EUR')+'</td><td style="text-align:right;font-weight:900">'+(livOffert?'<strong style="color:#009D3A">0,00 EUR</strong>':livHT.toFixed(2)+' EUR')+'</td></tr>':''
    var remRow=remiseMontant>0?'<tr><td style="color:#CC0066;font-weight:900">Remise commerciale ('+remisePct+'%)</td><td></td><td></td><td style="text-align:right;color:#CC0066;font-weight:900">-'+remiseMontant.toFixed(2)+' EUR</td></tr>':''
    var logoSrc = LOGO_YELLOW
    var css=['* { margin:0; padding:0; box-sizing:border-box }','body { font-family: Arial, sans-serif; color: #191923; font-size: 11px; background: white }','@page { size: A4; margin: 0mm }','@media print { html { -webkit-print-color-adjust: exact; print-color-adjust: exact } .no-print { display:none !important } }','.page { width:210mm; min-height:297mm; padding:14mm 16mm 0 16mm; display:flex; flex-direction:column }','.content { flex:1 }','.yt { font-family: Yellowtail, cursive }','.header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:3px solid #FF82D7; margin-bottom:16px }','.logo img { height:52px; width:auto }','.logo-sub { font-size:8px; color:#aaa; margin-top:3px }','.doc-type { font-family:Yellowtail,cursive; font-size:38px; color:#191923; text-align:right; line-height:1 }','.doc-num { font-size:10px; color:#888; text-align:right; margin-top:3px }','.parties { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px }','.party { background:#F8F8F8; border-radius:5px; padding:11px 13px; border-left:3px solid #FFEB5A }','.party.client { border-left-color:#FF82D7 }','.party-label { font-family:Yellowtail,cursive; font-size:14px; color:#888; margin-bottom:5px }','.party-name { font-size:13px; font-weight:900; margin-bottom:3px }','.party-detail { font-size:9px; color:#555; margin-top:1px; line-height:1.5 }','.badge { display:inline-block; background:#FFEB5A; border:1.5px solid #191923; border-radius:3px; padding:2px 8px; font-family:Yellowtail,cursive; font-size:13px; margin-top:6px }','table { width:100%; border-collapse:collapse; margin-bottom:14px }','thead th { padding:8px 10px; font-size:8px; text-transform:uppercase; letter-spacing:1px; font-weight:900; color:#191923; border-top:2px solid #191923; border-bottom:2px solid #191923 }','tbody td { padding:7px 10px; border-bottom:1px solid #EBEBEB; font-size:10.5px }','tr:nth-child(even) td { background:#FAFAFA }','.totals-wrap { display:flex; justify-content:flex-end; margin-bottom:14px }','.totals { width:260px }','.t-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #EBEBEB; font-size:11px }','.t-row.gray { color:#999; font-size:9.5px }','.t-final { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:#FFEB5A; border:2px solid #191923; border-radius:4px; margin-top:6px }','.t-final .lbl { font-family:Yellowtail,cursive; font-size:22px; color:#191923 }','.t-final .amt { font-weight:900; font-size:15px; color:#191923 }','.per-person { text-align:right; font-size:9px; color:#aaa; margin-top:3px }','.rib { border:1.5px solid #191923; border-radius:5px; padding:12px 14px; margin-bottom:14px; background:#FAFAFA }','.rib-title { font-family:Yellowtail,cursive; font-size:17px; color:#FF82D7; margin-bottom:8px }','.rib-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px }','.rib-item label { display:block; font-size:7px; text-transform:uppercase; letter-spacing:1px; color:#aaa; margin-bottom:2px }','.rib-item span { font-size:10px; font-weight:900; font-family:monospace }','.cond-title { font-family:Yellowtail,cursive; font-size:14px; margin-bottom:2px }','.cond { font-size:9.5px; color:#555; margin-bottom:14px; line-height:1.6 }','.notes { background:#FFFDE7; border-left:3px solid #FFEB5A; padding:8px 12px; margin-bottom:12px; font-size:10px }','.footer { padding:12px 0 8px 0; border-top:1px solid #EBEBEB; margin-top:auto }','.legal { font-size:7px; color:#ccc; line-height:1.7; margin-bottom:8px }','.pink-bar { background:#FF82D7; padding:7px 14px; border-radius:4px; text-align:center; font-family:Yellowtail,cursive; font-size:16px; color:#191923 }'].join(' ')
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet"><title>'+titre+' '+numero+'</title><style>'+css+'</style></head><body><div class="page"><div class="content"><div class="header"><div class="logo"><img src="'+logoSrc+'" alt="meshuga"><div class="logo-sub">Crazy Deli &nbsp;&middot;&nbsp; 3 rue Vavin, 75006 Paris</div></div><div><div class="doc-type">'+titre+'</div><div class="doc-num">N&deg; '+numero+'</div><div class="doc-num">'+new Date().toLocaleDateString('fr-FR')+'</div></div></div><div class="parties"><div class="party"><div class="party-label">Emetteur</div><div class="party-name">SAS AEGIA FOOD</div><div class="party-detail">Enseigne : Meshuga Crazy Deli</div><div class="party-detail">3 rue Vavin, 75006 Paris</div><div class="party-detail">SIRET : 904 639 531 00014</div><div class="party-detail">TVA : FR31904639531</div><div class="party-detail">hello@meshuga.fr</div></div><div class="party client"><div class="party-label">Client</div><div class="party-name">'+dv.client_nom+'</div>'+(dv.client_contact?'<div class="party-detail">'+dv.client_contact+'</div>':'')+(dv.client_email?'<div class="party-detail">'+dv.client_email+'</div>':'')+((dv.event_date||dv.event_lieu)?'<div class="party-detail" style="margin-top:5px"><strong>Evénement :</strong> '+(dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):'')+(dv.event_lieu?' &mdash; '+dv.event_lieu:'')+'</div>':'')+'<div class="badge">'+dv.nb_personnes+' personnes</div></div></div><table><thead><tr><th style="text-align:left;width:52%">Désignation</th><th style="text-align:center;width:10%">Qte</th><th style="text-align:right;width:19%">PU HT</th><th style="text-align:right;width:19%">Total HT</th></tr></thead><tbody>'+items+mepRow+livRow+remRow+'</tbody></table><div class="totals-wrap"><div class="totals"><div class="t-row"><span>Total HT</span><span style="font-weight:900">'+totalHT.toFixed(2)+' EUR</span></div><div class="t-row gray"><span>TVA 5,5%</span><span>'+tva.toFixed(2)+' EUR</span></div><div class="t-final"><span class="lbl">Total TTC</span><span class="amt">'+totalTTC.toFixed(2)+' EUR</span></div><div class="per-person">soit '+parseFloat(totalTTC/dv.nb_personnes).toFixed(2)+' EUR TTC / personne</div></div></div><div class="rib"><div class="rib-title">'+(isFacture?'Règlement par virement bancaire':'Coordonnées bancaires pour l&#39;acompte')+'</div><div class="rib-grid"><div class="rib-item"><label>Titulaire</label><span>SAS AEGIA FOOD</span></div><div class="rib-item"><label>Banque</label><span>Banque Populaire</span></div><div class="rib-item"><label>IBAN</label><span>FR76 1020 7000 8723 2175 3218 077</span></div><div class="rib-item"><label>BIC</label><span>CCBPFRPPMTG</span></div></div></div>'+(dv.notes?'<div class="notes"><strong>Notes :</strong> '+dv.notes+'</div>':'')+'<div class="cond-title">Conditions de règlement</div><div class="cond">'+(isFacture?'Virement bancaire &mdash; 30% à la commande, solde 72h avant l&#39;événement.':'30% à la commande, solde 72h avant l&#39;événement. Devis valable 30 jours.')+'</div></div><div class="footer"><div class="legal">SAS AEGIA FOOD (enseigne Meshuga) &mdash; SASU &mdash; Capital social : 1 000 EUR &mdash; RCS Paris &mdash; SIRET 904 639 531 00014 &mdash; Code APE : 56.10C &mdash; TVA intracommunautaire : FR31904639531 &mdash; 3 rue Vavin, 75006 Paris<br>'+(isFacture?'Conformément à la loi, tout retard de paiement entra&icirc;ne l&#39;exigibilité de pénalités d&#39;un taux égal à 3 fois le taux d&#39;intérêt légal, ainsi qu&#39;une indemnité forfaitaire de 40 EUR pour frais de recouvrement.':'TVA sur les produits alimentaires à taux réduit de 5,5%. Prix HT en euros. Tout commencement d&#39;exécution vaut acceptation du présent devis.')+'</div><div class="pink-bar">meshuga &mdash; crazy deli &mdash; 3 rue vavin, paris 6e &mdash; hello@meshuga.fr</div></div></div><div class="no-print" style="text-align:center;padding:20px;background:#F8F8F8;border-top:2px solid #EBEBEB"><p style="margin-bottom:10px;font-size:11px;color:#888">Dans la fenêtre d&#39;impression : décochez <strong>En-têtes et pieds de page</strong> puis <strong>Enregistrer en PDF</strong></p><button onclick="document.fonts.ready.then(function(){window.print()})" style="padding:11px 28px;background:#191923;color:#FFEB5A;border:none;border-radius:5px;font-size:13px;font-weight:900;cursor:pointer">&#128229; Imprimer / PDF</button></div></body></html>'
    var w=window.open('','_blank'); w.document.write(html); w.document.close(); w.focus()
  }

  function sendChasseToCrm(pros) {
    if (!pros) return
    var today = new Date().toISOString().split('T')[0]
    var rel = new Date(); rel.setDate(rel.getDate() + 3)
    var relStr = rel.toISOString().split('T')[0]
    var alreadyInCrm = prospects.find(function(p) { return p.name === pros.name })
    if (alreadyInCrm) {
      setProspects(function(prev) { return prev.map(function(p) { return p.name === pros.name ? Object.assign({}, p, {status: 'nego', temperature: 'chaud'}) : p }) })
      toast('Déjà dans le CRM — passé en négo')
      return
    }
    var newProspect = {
      id: 'crm-' + pros.id + '-' + Date.now(),
      name: pros.name,
      email: pros.contact_email && pros.contact_email !== '—' ? pros.contact_email : '',
      phone: pros.contact_phone && pros.contact_phone !== '—' ? pros.contact_phone : '',
      size: pros.taille || '',
      category: (pros.cat && pros.cat.charAt(0).toUpperCase() + pros.cat.slice(1)) || 'Autre',
      status: 'nego',
      temperature: 'chaud',
      nextDate: relStr,
      nextAction: 'Envoyer le devis',
      notes: pros.pitch || '',
      ca: Number(pros.vm) || 0,
      estimated_monthly_revenue: Number(pros.vm) || 0,
      score: pros.score || 5,
      files: [],
      chasseId: pros.id,
      contactedDate: today,
    }
    setProspects(function(prev) { return prev.concat([newProspect]) })
    logActivity('prospect_contacte', 'Lead envoyé au CRM : ' + pros.name, pros.name, null)
  }

  function contactProspect(id) {
    var pros = chasse.find(function(x) { return x.id === id })
    var today = new Date().toISOString().split('T')[0]
    var relDate = new Date(); relDate.setDate(relDate.getDate() + 3)
    var relDateStr = relDate.toISOString().split('T')[0]
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {status: 'contacted', contacted: true, contactedDate: today, lastAction: 'Contact le ' + today, relanceDate: relDateStr, relanceStatut: 'en_attente'}) : x }) })
    setContactedToday(function(n) { return n + 1 })
    if (pros) {
      sb().from('tasks').insert({title:'Relancer '+pros.name,assignee:'emy',priority:'medium',status:'todo',deadline:relDateStr}).then(function(){loadTasks(); logActivity("tache_creee", "Nouvelle tache : Relancer " + pros.name, null, null)})
      var alreadyInCrm = prospects.find(function(p) { return p.name === pros.name })
      if (!alreadyInCrm) {
        var newProspect = {
          id: 'crm-' + id + '-' + Date.now(),
          name: pros.name,
          email: pros.email || '',
          phone: pros.phone || '',
          size: pros.taille || '',
          category: (pros.cat && pros.cat.charAt(0).toUpperCase() + pros.cat.slice(1)) || 'Autre',
          status: 'contacted',
          temperature: 'tiede',
          nextDate: relDateStr,
          nextAction: 'Relance J+3',
          notes: pros.pitch || '',
          ca: 0,
          score: pros.score || 5,
          files: [],
          chasseId: id,
          contactedDate: today,
        }
        setProspects(function(prev) { return prev.concat([newProspect]) })
        toast('Contacté ! Ajouté au CRM — Relance dans 3 jours')
      } else {
        setProspects(function(prev) { return prev.map(function(p) { return p.name === pros.name ? Object.assign({}, p, {status: 'contacted', nextDate: relDateStr, nextAction: 'Relance J+3'}) : p }) })
        toast('Contacté ! Pipeline CRM mis à jour')
      }
    }
    logActivity('prospect_contacte', 'Prospect contacte : ' + (pros ? pros.name : id), pros ? pros.name : id, null)
  }

  function relanceProspect(id) {
    var pros = chasse.find(function(x) { return x.id === id })
    var today = new Date().toISOString().split('T')[0]
    var next = new Date(); next.setDate(next.getDate() + 7)
    var nextStr = next.toISOString().split('T')[0]
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {lastAction: 'Relance le ' + today, relanceDate: nextStr, relanceStatut: 'relance'}) : x }) })
    sb().from('tasks').insert({title:'Suivi '+(pros?pros.name:id)+' - en attente reponse',assignee:'emy',priority:'high',status:'todo',deadline:nextStr}).then(function(){loadTasks(); logActivity("tache_creee", "Nouvelle tache : Suivi " + (pros?pros.name:id), null, null)})
    logActivity('prospect_relance', 'Relance : ' + (pros ? pros.name : id), pros ? pros.name : id, null)
    toast('Relance! Suivi dans 7 jours')
  }

  function reponseProspect(id, rep) {
    var pros = chasse.find(function(x) { return x.id === id })
    var today = new Date().toISOString().split('T')[0]
    var newSt = rep === 'interesse' ? 'nego' : rep === 'lost' ? 'lost' : 'contacted'
    var action = rep === 'interesse' ? 'Interesse !' : rep === 'lost' ? 'Pas interesse' : 'A rappeler'
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {status: newSt, lastAction: action + ' - ' + today, relanceStatut: rep}) : x }) })
    
    if (rep === 'interesse' && pros) {
      sb().from('tasks').insert({title:'NEGO - Envoyer devis a '+pros.name,assignee:'emy',priority:'high',status:'todo',deadline:today,checklist:['Preparer devis','Envoyer via module Devis','Fixer RDV']}).then(function(){loadTasks(); logActivity("tache_creee", "Nouvelle tache : NEGO - Envoyer devis a " + pros.name, null, null)})
      toast('Super ! En nego - devis a preparer !')
    } else if (rep === 'rappeler' && pros) {
      var next2 = new Date(); next2.setDate(next2.getDate() + 14)
      sb().from('tasks').insert({title:'Rappeler '+pros.name+' dans 2 semaines',assignee:'emy',priority:'medium',status:'todo',deadline:next2.toISOString().split('T')[0]}).then(function(){loadTasks(); logActivity("tache_creee", "Nouvelle tache : Rappeler " + pros.name + " dans 2 semaines", null, null)})
      toast('Rappel dans 2 semaines')
    } else if (rep === 'lost') {
      toast('OK, prospect archive.')
    }
  }
  async function generateEmail(p, emailType) {
    setEmailProspect(p)
    setGeneratingEmail(true)
    setGeneratedEmail('')
    openModal('email', p)
    const senderName = isEmy ? 'Emy, B2B Manager' : 'Edward, patron'
    const senderSig = isEmy ? 'Emy' : 'Edward'
    const isRelance = emailType === 'relance'
    const isDevisRelance = emailType === 'devis_relance'
    const pressLinks = [
      {name: 'Paris Première', url: 'https://www.facebook.com/watch/?v=648051137321383'},
      {name: 'Telerama', url: 'https://www.telerama.fr/restos-loisirs/meshuga-de-la-street-food-de-haut-niveau-pres-du-jardin-du-luxembourg_cri-7043251.php'},
      {name: 'Konbini', url: 'https://www.konbini.com/food/on-a-teste-meshuga-le-deli-aux-sandwiches-les-plus-confort-du-moment/'},
      {name: 'Les Echos', url: 'https://www.lesechos.fr/weekend/gastronomie-vins/ou-manger-les-meilleurs-grilled-cheese-1873791'},
      {name: 'Do It In Paris', url: 'https://www.doitinparis.com/fr/street-food-usa-paris-26393'},
      {name: 'Grazia', url: 'https://www.grazia.fr/cuisine/surprenantes-regressives-ou-rafraichissantes-les-meilleures-adresses-ou-deguster-de-bonnes-glaces-cet-ete-a-paris-773498.html'},
      {name: 'Magazine Acumen', url: 'https://magazine-acumen.com/gastronomie/meshuga-la-nouvelle-adresse-qui-fait-bouger-la-rive-gauche-parisienne/'}
    ]
    const pick3 = pressLinks.sort(function(){return Math.random()-0.5}).slice(0,3)
    const pressNames = pick3.map(function(l){return l.name}).join(', ')
    var baseContext = 'Tu es ' + senderName + ' de Meshuga Crazy Deli (3 rue Vavin Paris 6e). Deli new-yorkais premium, NY-style, Paris 6e, connu par '+pressNames+'.\n\n'
    var prospectInfo = 'Prospect : '+p.name+' ('+p.category+')'+( p.size?' — '+p.size+' personnes':'')+'\n'
    var relanceContext = ''
    if (isRelance) {
      relanceContext = 'TU ECRIS UN EMAIL DE RELANCE DOUX (2ème contact). Tu as déjà contacté ce prospect. Le ton doit être chaleureux, jamais insistant. Propose une des options suivantes selon le contexte : (1) demander si des questions ou des précisions sur votre offre, (2) proposer de venir déjeuner gratuitement pour découvrir, (3) proposer un appel de 10min pour adapter loffre. Réfère-toi subtilement au premier contact. Mentionne 1 lien presse parmi ceux fournis pour rappeler la crédibilité. Objet : court et engageant. Max 100 mots. Ton : humain, léger, bienveillant.\n' + 'Liens presse disponibles : '+pick3.map(function(l){return l.name+' ('+l.url+')'}).join(', ')+'\n'
    } else if (isDevisRelance) {
      relanceContext = 'TU ECRIS UN EMAIL DE SUIVI DEVIS (très doux). Tu as envoyé un devis. Demande si tout est clair, si besoin précisions. Propose un appel de 5min ou une visite déjeuner offerte pour en discuter. Mentionne 1 lien presse pour rappeler la qualité. Jamais pressant. Max 90 mots.\n' + 'Liens presse : '+pick3.map(function(l){return l.name+' ('+l.url+')'}).join(', ')+'\n'
    } else {
      relanceContext = 'TU ECRIS UN PREMIER EMAIL DE PROSPECTION. Ton : chaleureux, humain, jamais commercial. Montre que tu connais leur univers. Propose un déjeuner découverte offert ou un plateau pour leur équipe. Court (120 mots max). Intègre naturellement 1 lien presse parmi ceux fournis.\n' + 'Liens presse : '+pick3.map(function(l){return l.name+' ('+l.url+')'}).join(', ')+'\n'
    }
    var signatureLine = "Reponds UNIQUEMENT avec le corps de l'email en francais. Commence par l'objet sur la 1ere ligne (Objet : ...) puis le corps."
    const prompt = baseContext + prospectInfo + relanceContext + "Signature : " + senderSig + ". " + signatureLine
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: prompt, type: emailType || 'first'})
      })
      if (!res.ok) {
        setGeneratedEmail('Erreur serveur (' + res.status + '). Réessaie.')
        setGeneratingEmail(false)
        return
      }
      const data = await res.json()
      const text = data.text || data.email || data.content || ''
      setGeneratedEmail(text || 'Réponse vide. Réessaie.')
      if (text) {
        logActivity('email_genere', 'Email IA généré pour ' + p.name + ' (par ' + (isEmy?'Emy':'Edward') + ')', p.name, null)
      }
    } catch(e) {
      setGeneratedEmail('Erreur : ' + String(e.message || e))
    }
    setGeneratingEmail(false)
  }

  function saveTask() {
    if (!form.title) { toast('Titre requis !'); return }
    var payload = {title:form.title, assignee:form.assignee||'emy', deadline:form.deadline||null, priority:form.priority||'medium', status:form.status||'todo', description:form.description||'', checklist:form.checklist||[]}
    if (form.id) {
      sb().from('tasks').update(payload).eq('id', form.id).then(function(){loadTasks(); if(payload.status==="done") logActivity("tache_terminee", "Tache terminee : " + payload.title, null, null); toast('Tâche mise à jour')})
    } else {
      sb().from('tasks').insert(payload).then(function(){
        loadTasks(); logActivity("tache_creee", "Nouvelle tache : " + payload.title, null, null)
        var assigneeName = form.assignee === 'emy' ? 'Emy' : 'Edward'
        var senderName = isEmy ? 'Emy' : 'Edward'
        if (form.assignee !== (isEmy ? 'emy' : 'edward')) {
          sendPushToAll('📋 Nouvelle tâche — ' + form.title, 'Assignée à ' + assigneeName + ' par ' + senderName + (form.deadline ? '\nDeadline : ' + form.deadline : ''), form.assignee)
        }
        toast('Tâche créée !')
      })
    }
    closeModal()
  }

  function saveProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    const p = Object.assign({}, form, {files: form.files || []})
    if (form.id) { setProspects(function(prev) { return prev.map(function(x) { return x.id === form.id ? p : x }) }) }
    else { setProspects(function(prev) { return prev.concat([Object.assign({}, p, {id: Date.now(), status: 'to_contact', ca: 0})]) }) }
    closeModal()
  }

  function saveContact() {
    var nom = (form.nom||'').trim()
    var prenom = (form.prenom||'').trim()
    var fullName = (prenom ? prenom+' '+nom : nom).trim()
    if (!fullName) { toast('Nom requis !'); return }
    var payload = {
      full_name: fullName,
      nom: nom,
      prenom: prenom,
      category: form.category||form.cat||'autre',
      company_name: form.societe||form.company_name||'',
      societe: form.societe||'',
      phone: form.phone||'',
      phone2: form.phone2||'',
      email: form.email||'',
      email2: form.email2||'',
      website: form.website||'',
      notes: form.notes||'',
      is_vip: !!form.vip,
      vip: !!form.vip
    }
    if (form.id) {
      sb().from('contacts').update(payload).eq('id', form.id).then(function(r){
        if (r.error) { toast('Erreur: '+r.error.message); return }
        loadContacts(); toast('Contact modifié ✓')
      })
    } else {
      sb().from('contacts').insert(payload).then(function(r){
        if (r.error) {
          toast('Erreur: '+r.error.message)
          return
        }
        loadContacts(); toast('Contact créé ✓')
      })
    }
    closeModal()
  }

  function saveVault() {
    if (!form.title) { toast('Titre requis !'); return }
    if (form.id) { setVault(function(prev) { return prev.map(function(x) { return x.id === form.id ? Object.assign({}, form) : x }) }) }
    else { setVault(function(prev) { return prev.concat([Object.assign({}, form, {id: Date.now()})]) }) }
    closeModal()
  }

  function submitCR() {
    if (!form.week) { toast('Semaine requise !'); return }
    const cr = Object.assign({}, form, {id: Date.now(), status: 'submitted', date: new Date().toLocaleDateString('fr-FR')})
    setReports(function(prev) { return [cr].concat(prev) })
    closeModal()
  }

  var chasseFiltered = chasse.filter(function(p) { return chasseCat === 'all' || p.cat === chasseCat })
  if (chasseSearch) { chasseFiltered = chasseFiltered.filter(function(p) { return p.name.toLowerCase().indexOf(chasseSearch.toLowerCase()) >= 0 || (p.arrondissement && p.arrondissement.toLowerCase().indexOf(chasseSearch.toLowerCase()) >= 0) }) }
  if (chasseStatus !== 'all') { chasseFiltered = chasseFiltered.filter(function(p) { return p.status === chasseStatus }) }
  chasseFiltered = chasseFiltered.slice().sort(function(a, b) {
    if (chasseSort === 'score') return b.score - a.score
    if (chasseSort === 'valeur') return (b.valeur_event + b.valeur_mois*12) - (a.valeur_event + a.valeur_mois*12)
    return a.name.localeCompare(b.name)
  })

  var zeltyCA = zeltyData && zeltyData.stats ? (zeltyData.stats[zeltyPeriod].ca/100).toFixed(2) + ' €' : '--'
  var zeltyTickets = zeltyData && zeltyData.stats ? zeltyData.stats[zeltyPeriod].tickets : '--'
  var zeltyAvg = zeltyData && zeltyData.stats ? (zeltyData.stats[zeltyPeriod].avg/100).toFixed(2) + ' €' : '--'
  var zeltyUpdated = zeltyData && zeltyData.lastUpdated ? new Date(zeltyData.lastUpdated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '--'
  var zeltyEvol = zeltyData && zeltyData.evolution && zeltyData.evolution[zeltyPeriod] !== null && zeltyData.evolution[zeltyPeriod] !== undefined ? (zeltyData.evolution[zeltyPeriod] >= 0 ? '+' : '') + zeltyData.evolution[zeltyPeriod] + '%' : '--'
  var zeltyEvolColor = zeltyData && zeltyData.evolution && zeltyData.evolution[zeltyPeriod] !== null && zeltyData.evolution[zeltyPeriod] !== undefined ? (zeltyData.evolution[zeltyPeriod] >= 0 ? '#009D3A' : '#CC0066') : '#888'
  const NAV = [
    {id: 'pilotage', label: '📊 Pilotage', icon: '📊'},
    {id: 'dash', label: 'Dashboard', icon: '⚡'},
    {id: 'chasse', label: 'Prospection', icon: '🔍'},
    {id: 'crm', label: 'CRM Prospects', icon: '◎'},
    {id: 'devis', label: 'Devis', icon: '📄'},
    {id: 'annuaire', label: 'Annuaire', icon: '📒'},
    {id: 'calendrier', label: 'Calendrier', icon: '📅'},
    {id: 'reporting', label: 'Reporting', icon: '📋'},
    {id: 'vault', label: 'Coffre-fort', icon: '🔐'},
    {id: 'gmb', label: 'Google My Biz.', icon: '⭐'},
    {id: 'instagram', label: 'Instagram', icon: '📸'},
    {id: 'journal', label: 'Journal Emy', icon: '📓', edwardOnly: true},
    {id: 'notifs', label: 'Notifications', icon: '🔔'},
    {id: 'recipes', label: 'Recettes', icon: '🥪'},
    {id: 'purchases', label: 'Achats', icon: '🛒'},
    {id: 'rh', label: 'Ressources Humaines', icon: '👥'},
    {id: 'legal', label: 'Légal & Conformité', icon: '⚖️'},
    {id: 'messagerie', label: 'Messagerie', icon: '💬'}, // legacy — remplacé par FloatingChat (présent partout)
  ]
  
  if (!mounted) return null

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: G}} />

      {!profile && (
        <div style={{position:'fixed',inset:0,background:'var(--y)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,flexDirection:'column',gap:14}}>
          <img src="/stamp-pink.png" alt="meshuga" style={{width:130,height:130,objectFit:"contain"}} />
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:30,color:'var(--p)',lineHeight:1}}>Chargement…</div>
        </div>
      )}

      <div className="topbar">
        <img src={LOGO_PINK} alt="meshuga" className="topbar-logo" />
      </div>

      <div className="shell">
        <div className="shell-inner">
        <div className={sidebarOpen ? 'sidebar-overlay open' : 'sidebar-overlay'} onClick={function() { setSidebarOpen(false) }} />
        <Sidebar
            page={page}
            nav={nav}
            isEmy={isEmy}
            profile={profile}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            pushEnabled={pushEnabled}
            pushLoading={pushLoading}
            registerPush={registerPush}
            unregisterPush={unregisterPush}
            onLogout={function() { sb().auth.signOut().then(function() { window.location.href = '/login' }) }}
          />

        <div className="main">
          <div className="strip" />

          {page === 'pilotage' && (
            <PilotageTab toast={toast} />
          )}

          {page === 'dash' && <HomeOverviewTab profile={profile} isEmy={isEmy} tasks={tasks} nav={nav} toast={toast} openModal={openModal} />}

          {page === 'chasse' && (
            <ProspectionTab
              generateEmail={generateEmail}
              toast={toast}
              sendPushToAll={sendPushToAll}
              nav={nav}
              isEmy={isEmy}
              onSendToCrm={sendChasseToCrm}
            />
          )}

          {page === 'crm' && (
            <CrmTab
              prospects={prospects}
              setProspects={setProspects}
              devisList={devisList}
              commissionObjectif={commissionObjectif}
              setCommissionObjectif={setCommissionObjectif}
              scoringLoading={scoringLoading}
              autoScore={autoScore}
              openModal={openModal}
              toast={toast}
              nav={nav}
              generateEmail={generateEmail}
              generateScript={generateScript}
              sendPushToAll={sendPushToAll}
              scriptProspect={scriptProspect}
              setScriptProspect={setScriptProspect}
              scriptContent={scriptContent}
              scriptLoading={scriptLoading}
              isEmy={isEmy}
            />
          )}

          {page === 'annuaire' && (
            <div>
              <div className="ph">
                <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts</div></div>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-y btn-sm" onClick={function(){openModal('contact',{category:'food',vip:false})}}>+ Contact</button>
                  <button className="btn btn-sm" style={{background:'#FFEB5A',border:'2px solid #191923'}} onClick={function(){document.getElementById('csv-imp').click()}}>📥 Import CSV</button>
                  <input id="csv-imp" type="file" accept=".csv" style={{display:'none'}} onChange={function(e){
                    var f=e.target&&e.target.files&&e.target.files[0]
                    if(!f)return
                    var r=new FileReader()
                    r.onload=function(ev){
                      var raw=ev.target?String(ev.target.result):''
                      var rows=raw.split('\n').filter(function(l){return l.trim()})
                      var added=rows.slice(1).map(function(row){
                        var cols=row.split(',').map(function(x){return x.replace(/"/g,'').trim()})
                        return {id:Date.now()+Math.random(),cat:'prestataire',name:cols[0]||'',phone:cols[1]||'',email:cols[2]||'',notes:cols[3]||'',vip:false}
                      }).filter(function(c){return c.name})
                      if(added.length>0){
                      var inserts = added.map(function(c){return {full_name:c.name||'',phone:c.phone||'',email:c.email||'',notes:c.notes||'',category:'prestataire',is_vip:false}})
                      sb().from('contacts').insert(inserts).then(function(){loadContacts();toast(added.length+' contacts importés !')})
                    }
                    }
                    r.readAsText(f)
                    e.target.value=''
                  }} />
                </div>
              </div>

              {/* FILTRES CATÉGORIES */}
              {(function(){
                var cats = ['all','food','prestataire','photographe','comptabilite','client','presse','banque','team','autre']
                var catLabels = {all:'Tous',food:'Fournisseurs',prestataire:'Prestataires',photographe:'Photographe',comptabilite:'Comptabilité',client:'Clients B2B',presse:'Presse',banque:'Banque',team:'Team Meshuga',autre:'Autre'}
                var catColors = {food:'#009D3A',prestataire:'#005FFF',photographe:'#7B3FBE',comptabilite:'#2D7A5A',client:'#FF82D7',presse:'#FF6B2B',banque:'#1A1A6E',team:'#FFEB5A',autre:'#888'}
                var filtered = contacts
                  .filter(function(c){ return annCat==='all' || (c.category||c.cat)===annCat })
                  .slice().sort(function(a,b){ return (function(){var an=a.nom||(a.full_name||'').split(' ').pop()||'';var bn=b.nom||(b.full_name||'').split(' ').pop()||'';return an.localeCompare(bn,'fr')})() })
                return(
                  <div>
                    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                      {cats.map(function(cat){
                        var count = cat==='all' ? contacts.length : contacts.filter(function(c){return (c.category||c.cat)===cat}).length
                        return(
                          <button key={cat} style={{fontSize:10,padding:'4px 10px',borderRadius:4,border:'2px solid '+(annCat===cat?catColors[cat]||'#191923':'#DDD'),background:annCat===cat?catColors[cat]||'#191923':'#fff',color:annCat===cat?(cat==='team'||cat==='banque'?'#191923':'#fff'):'#555',fontWeight:annCat===cat?900:400,cursor:'pointer'}} onClick={function(){setAnnCat(cat)}}>
                            {catLabels[cat]} <span style={{opacity:.5,fontSize:9}}>({count})</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
                      {filtered.map(function(c){
                        var catColor = catColors[c.category||c.cat]||'#888'
                        return(
                          <div key={c.id} className="card" style={{cursor:'pointer',borderTop:'3px solid '+catColor}} onClick={function(){openModal('contact',Object.assign({},c))}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                              <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 7px',background:catColor,color:'#fff',borderRadius:3,display:'inline-block',letterSpacing:.5}}>{catLabels[c.category||c.cat]||c.category||c.cat}</div>
                              {(c.is_vip||c.vip)&&<span style={{fontSize:10}}>⭐ VIP</span>}
                            </div>
                            <div style={{fontWeight:900,fontSize:15}}>{c.full_name || (c.nom ? (c.prenom ? c.prenom+' '+c.nom : c.nom) : c.name) || ''}</div>
                            {(c.company_name||c.societe)&&<div style={{fontSize:12,color:'#555',marginTop:1,fontStyle:'italic'}}>{c.company_name||c.societe}</div>}
                            {c.phone&&c.phone!=='—'&&<a href={'tel:'+c.phone.replace(/\s/g,'')} style={{display:'block',fontSize:12,marginTop:6,color:'inherit',textDecoration:'none'}} onClick={function(e){e.stopPropagation()}}>📞 {c.phone}</a>}
                            {c.phone2&&<a href={'tel:'+c.phone2.replace(/\s/g,'')} style={{display:'block',fontSize:11,color:'#888',textDecoration:'none'}} onClick={function(e){e.stopPropagation()}}>📞 {c.phone2}</a>}
                            {c.email&&<a href={'mailto:'+c.email} style={{display:'block',fontSize:12,marginTop:2,color:'inherit',textDecoration:'none'}} onClick={function(e){e.stopPropagation()}}>✉️ {c.email}</a>}
                            {c.email2&&<a href={'mailto:'+c.email2} style={{display:'block',fontSize:11,color:'#888',textDecoration:'none'}} onClick={function(e){e.stopPropagation()}}>✉️ {c.email2}</a>}
                            {c.website&&<div style={{fontSize:11,marginTop:2}}><a href={c.website.startsWith('http')?c.website:'https://'+c.website} target="_blank" rel="noopener noreferrer" style={{color:'#005FFF',textDecoration:'none'}} onClick={function(e){e.stopPropagation()}}>🌐 {c.website.replace(/^https?:\/\//,'')}</a></div>}
                            {c.notes&&<div style={{fontSize:10,opacity:.5,marginTop:6,lineHeight:1.4}}>{c.notes}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {page === 'tasks' && (
            <TasksTab
              tasks={tasks}
              loadTasks={loadTasks}
              openModal={openModal}
              toast={toast}
              isEmy={isEmy}
            />
          )}

          {page === 'calendrier' && (
            <div>
              <div className="ph">
                <div><div className="pt">Calendrier 📅</div><div className="ps">{calEvents.length} événements</div></div>
                <div style={{display:'flex',gap:6}}>
                  <div style={{display:'flex',background:'#EBEBEB',borderRadius:5,overflow:'hidden'}}>
                    {['month','week','list'].map(function(v){return(
                      <button key={v} style={{padding:'5px 12px',fontSize:10,fontWeight:900,background:calView===v?'#191923':'transparent',color:calView===v?'#FFEB5A':'#191923',border:'none',cursor:'pointer'}} onClick={function(){setCalView(v)}}>{v==='month'?'Mois':v==='week'?'Semaine':'Liste'}</button>
                    )})}
                  </div>
                  <button className="btn btn-b btn-sm" onClick={fetchAIEvents} disabled={aiEventsLoading} style={{opacity:aiEventsLoading?0.6:1}}>{aiEventsLoading?'⏳ Recherche...':'✨ Suggestions IA'}</button>
                  <button className="btn btn-sm" style={{background:'#FF6B2B',color:'#fff',opacity:briefingLoading?0.6:1}} onClick={sendBriefing} disabled={briefingLoading}>{briefingLoading?'⏳ Envoi...':'☀️ Envoyer briefing'}</button>
                  <button className="btn btn-y btn-sm" onClick={function(){openModal('cal_event',{assignee:'all',type:'event',start_date:new Date().toISOString().split('T')[0]})}}>+ Événement</button>
                </div>
              </div>

              {/* STATS RAPIDES */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                {(function(){
                  var today=new Date().toISOString().split('T')[0]
                  var upcoming=calEvents.filter(function(e){return e.start_date>=today}).length
                  var thisMonth=calEvents.filter(function(e){return e.start_date&&e.start_date.startsWith(new Date().toISOString().slice(0,7))}).length
                  var totalCA=calEvents.filter(function(e){return e.amount}).reduce(function(s,e){return s+(parseFloat(e.amount)||0)},0)
                  var rdvs=calEvents.filter(function(e){return e.type==='rdv'&&e.start_date>=today}).length
                  return([
                    {label:'À venir',val:upcoming,color:'#005FFF'},
                    {label:'Ce mois',val:thisMonth,color:'#FF82D7'},
                    {label:'RDV prospects',val:rdvs,color:'#009D3A'},
                    {label:'CA planifié',val:totalCA.toLocaleString('fr-FR',{maximumFractionDigits:0})+' €',color:'#CC6600'},
                  ]).map(function(s,i){return(
                    <div key={i} className="kc" style={{background:'#fff',textAlign:'center'}}>
                      <div className="kl" style={{fontSize:11}}>{s.label}</div>
                      <div className="kv" style={{fontSize:24,color:s.color}}>{s.val}</div>
                    </div>
                  )})
                })()}
              </div>

              {/* NAVIGATION MOIS */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <button className="btn btn-sm btn-y" onClick={function(){
                  var d=new Date(calYear,calMonth-1,1)
                  setCalMonth(d.getMonth());setCalYear(d.getFullYear())
                }}>&#8592;</button>
                <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,flex:1,textAlign:'center'}}>
                  {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][calMonth]} {calYear}
                </div>
                <button className="btn btn-sm btn-y" onClick={function(){
                  var d=new Date(calYear,calMonth+1,1)
                  setCalMonth(d.getMonth());setCalYear(d.getFullYear())
                }}>&#8594;</button>
                <button className="btn btn-sm btn-p" onClick={function(){setCalMonth(new Date().getMonth());setCalYear(new Date().getFullYear())}}>Aujourd&apos;hui</button>
              </div>

              {calView==='month'&&(function(){
                var firstDay=new Date(calYear,calMonth,1)
                var lastDay=new Date(calYear,calMonth+1,0)
                var startDow=firstDay.getDay()===0?6:firstDay.getDay()-1
                var cells=[]
                for(var i=0;i<startDow;i++) cells.push(null)
                for(var d=1;d<=lastDay.getDate();d++) cells.push(d)
                var today=new Date().toISOString().split('T')[0]
                var days=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
                return(
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:2,marginBottom:4}}>
                      {days.map(function(d){return <div key={d} style={{textAlign:'center',fontSize:10,fontWeight:900,padding:'4px 0',opacity:.5,textTransform:'uppercase'}}>{d}</div>})}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:2}}>
                      {cells.map(function(day,idx){
                        if(!day) return <div key={'e'+idx} style={{minHeight:120,background:'#F8F8F8',borderRadius:6}}/>
                        var ds=calYear+'-'+(calMonth+1<10?'0'+(calMonth+1):(calMonth+1))+'-'+(day<10?'0'+day:day)
                        var dayEvts=calEvents.filter(function(e){return e.start_date<=ds&&(e.end_date||e.start_date)>=ds})
                        var isToday=ds===today
                        var evtColors={event:'#FF82D7',rdv:'#005FFF',livraison:'#009D3A',relance:'#FF6B2B',admin:'#888',other:'#FFEB5A'}
                        return(
                          <div key={day} style={{minHeight:120,background:isToday?'#FFF5FF':'#fff',borderRadius:6,border:isToday?'2px solid #FF82D7':'1px solid #EBEBEB',padding:'6px',cursor:'pointer'}} onClick={function(){openModal('cal_event',{assignee:'all',type:'event',start_date:ds})}}>
                            <div style={{fontWeight:isToday?900:400,fontSize:12,color:isToday?'#FF82D7':'#191923',marginBottom:2}}>{day}</div>
                            {dayEvts.slice(0,3).map(function(e,ei){return(
                              <div key={ei} style={{fontSize:9,fontWeight:700,background:e.source==='ai_suggestion'?'#F0F4FF':evtColors[e.type]||'#FFEB5A',color:e.source==='ai_suggestion'?'#005FFF':(e.type==='admin'||e.type==='other'?'#191923':'#fff'),borderRadius:2,padding:'1px 4px',marginBottom:1,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',cursor:'pointer',maxWidth:'100%',boxSizing:'border-box',border:e.source==='ai_suggestion'?'1px dashed #005FFF':'none',opacity:e.source==='ai_suggestion'?0.85:1}} onClick={function(ev){ev.stopPropagation();openModal('cal_event',Object.assign({},e))}}>
                                {e.source==='ai_suggestion'?'💡 ':''}{e.time?e.time.slice(0,5)+' ':''}{e.title}
                              </div>
                            )})}
                            {dayEvts.length>3&&<div style={{fontSize:8,opacity:.5}}>+{dayEvts.length-3}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {calView==='list'&&(
                <div>
                  {(function(){
                    var today=new Date().toISOString().split('T')[0]
                    var sorted=calEvents.slice().sort(function(a,b){return (a.start_date||'').localeCompare(b.start_date||'')})
                    var upcoming=sorted.filter(function(e){return (e.end_date||e.start_date)>=today})
                    var past=sorted.filter(function(e){return (e.end_date||e.start_date)<today})
                    var evtColors={event:'#FF82D7',rdv:'#005FFF',livraison:'#009D3A',relance:'#FF6B2B',admin:'#888',other:'#FFEB5A'}
                    var evtLabels={event:'🎉 Event client',rdv:'🤝 RDV',livraison:'🚚 Livraison',relance:'📞 Relance',admin:'📋 Admin',other:'Autre'}
                    var renderEvt = function(e,i){
                      var col=evtColors[e.type]||'#FFEB5A'
                      return(
                        <div key={i} className="card" style={{marginBottom:6,borderLeft:'4px solid '+(e.source==='ai_suggestion'?'#005FFF':col),cursor:'pointer',background:e.source==='ai_suggestion'?'#F8FAFF':'#fff',opacity:e.source==='ai_suggestion'?0.92:1}} onClick={function(){openModal('cal_event',Object.assign({},e))}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                                <span style={{fontSize:9,background:col,color:e.type==='other'?'#191923':'#fff',padding:'2px 6px',borderRadius:3,fontWeight:900}}>{evtLabels[e.type]||e.type}</span>
                                {e.assignee&&e.assignee!=='all'&&<span style={{fontSize:9,background:'#EBEBEB',padding:'2px 6px',borderRadius:3}}>{e.assignee}</span>}
                              </div>
                              <div style={{fontWeight:900,fontSize:14}}>{e.title}</div>
                              {e.prospect&&<div style={{fontSize:12,color:'#555',marginTop:1}}>👤 {e.prospect}</div>}
                              {e.location&&<div style={{fontSize:11,color:'#888',marginTop:1}}>📍 {e.location}</div>}
                              {e.notes&&<div style={{fontSize:11,opacity:.5,marginTop:4}}>{e.notes}</div>}
                            {e.contact_info&&<div style={{fontSize:10,color:'#005FFF',background:'#EFF3FF',borderRadius:4,padding:'4px 8px',marginTop:6,lineHeight:1.7}}>{e.contact_info}</div>}
                            </div>
                            <div style={{textAlign:'right',flexShrink:0}}>
                              <div style={{fontWeight:900,fontSize:13}}>{e.start_date?new Date(e.start_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}):''}</div>
                              {e.time&&<div style={{fontSize:11,color:'#888'}}>{e.time.slice(0,5)}</div>}
                              {e.amount&&<div style={{fontSize:12,fontWeight:900,color:'#009D3A',marginTop:2}}>{parseFloat(e.amount).toLocaleString('fr-FR')} €</div>}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return(
                      <div>
                        {upcoming.length>0&&(
                          <div style={{marginBottom:16}}>
                            <div className="yt" style={{fontSize:18,marginBottom:8,color:'#005FFF'}}>📅 À venir ({upcoming.length})</div>
                            {upcoming.map(renderEvt)}
                          </div>
                        )}
                        {past.length>0&&(
                          <div>
                            <div className="yt" style={{fontSize:18,marginBottom:8,opacity:.5}}>📁 Passés ({past.length})</div>
                            {past.slice().reverse().map(renderEvt)}
                          </div>
                        )}
                        {calEvents.length===0&&<div style={{textAlign:'center',padding:40,opacity:.4}}>Aucun événement — crée le premier !</div>}
                      </div>
                    )
                  })()}
                </div>
              )}

              {calView==='week'&&(function(){
                var today=new Date()
                var dow=today.getDay()===0?6:today.getDay()-1
                var monday=new Date(calYear,calMonth,1)
                var weekDays=[]
                for(var i=0;i<7;i++){
                  var d=new Date(monday)
                  d.setDate(monday.getDate()+i)
                  weekDays.push(d)
                }
                var todayStr=new Date().toISOString().split('T')[0]
                var evtColors={event:'#FF82D7',rdv:'#005FFF',livraison:'#009D3A',relance:'#FF6B2B',admin:'#888',other:'#FFEB5A'}
                return(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:4}}>
                    {weekDays.map(function(d,i){
                      var ds=d.toISOString().split('T')[0]
                      var dayEvts=calEvents.filter(function(e){return e.start_date<=ds&&(e.end_date||e.start_date)>=ds})
                      var isToday=ds===todayStr
                      var dayNames=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
                      return(
                        <div key={i} style={{background:isToday?'#FFF5FF':'#fff',borderRadius:6,border:isToday?'2px solid #FF82D7':'1px solid #EBEBEB',padding:'10px',minHeight:160}}>
                          <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase',color:isToday?'#FF82D7':'#888',marginBottom:4}}>{dayNames[i]}</div>
                          <div style={{fontWeight:900,fontSize:20,color:isToday?'#FF82D7':'#191923',marginBottom:6}}>{d.getDate()}</div>
                          {dayEvts.map(function(e,ei){return(
                            <div key={ei} style={{fontSize:10,background:evtColors[e.type]||'#FFEB5A',color:e.type==='other'?'#191923':'#fff',borderRadius:3,padding:'3px 6px',marginBottom:3,cursor:'pointer',lineHeight:1.4}} onClick={function(){openModal('cal_event',Object.assign({},e))}}>
                              {e.time?e.time.slice(0,5)+' ':''}{e.title}
                            </div>
                          )})}
                          <div style={{opacity:.3,fontSize:9,cursor:'pointer',marginTop:4}} onClick={function(){openModal('cal_event',{assignee:'all',type:'event',start_date:ds})}}>+ Ajouter</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {page === 'reporting' && (
            <div>
              <div className="ph">
                <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo</div></div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={function() { openModal('cr', {}) }}>+ Nouveau CR</button>}
              </div>
              {!isEmy && (
                <div className="card-y" style={{marginBottom:12}}>
                  <div className="ct">📝 Formulaire CR Emy</div>
                  <div style={{fontSize:12,opacity:.7,marginBottom:8}}>Ce qu&apos;Emy remplit chaque semaine :</div>
                  <div style={{fontSize:11,opacity:.6,lineHeight:1.8}}>Semaine du · Prospects contactés · RDV effectués · Commandes · Victoires · Challenges · Priorités S+1 · Note pour Edward</div>
                </div>
              )}
              {reports.length === 0 && (
                <div className="card" style={{textAlign:'center',padding:40}}>
                  <div style={{fontSize:40,marginBottom:10}}>📋</div>
                  <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun CR pour l&apos;instant</div>
                  {isEmy && <button className="btn btn-y" style={{marginTop:14}} onClick={function() { openModal('cr', {}) }}>Creer le premier CR</button>}
                </div>
              )}
              {reports.map(function(r, i) {
                return (
                  <div key={r.id} className="card-y" style={{border:'2px solid #191923',borderRadius:7,boxShadow:'3px 3px 0 #191923',marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{r.week}</div>
                      <span style={{fontSize:10,opacity:.5}}>{r.date}</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                      <div style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{r.prospects}</div><div className="yt" style={{fontSize:11,opacity:.5}}>Prospects</div></div>
                      <div style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{r.rdv}</div><div className="yt" style={{fontSize:11,opacity:.5}}>RDV</div></div>
                      <div style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{r.cmds}</div><div className="yt" style={{fontSize:11,opacity:.5}}>Commandes</div></div>
                    </div>
                    {r.wins && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>✅ Victoires</div><div style={{fontSize:12}}>{r.wins}</div></div>}
                    {r.challenges && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>⚡ Challenges</div><div style={{fontSize:12}}>{r.challenges}</div></div>}
                    {r.next && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>🎯 Priorites S+1</div><div style={{fontSize:12}}>{r.next}</div></div>}
                    {r.notes && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>💬 Note d&apos;Emy</div><div style={{fontSize:12}}>{r.notes}</div></div>}
                    {r.feedback && <div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:10}}><div className="yt" style={{fontSize:14,marginBottom:4}}>Retour d&apos;Edward</div><div style={{fontSize:12}}>{r.feedback}</div></div>}
                    {!isEmy && !r.feedback && (
                      <div style={{marginTop:10}}>
                        <div className="lbl">Ton retour a Emy</div>
                        <textarea className="inp" placeholder="Bravo, recadrages..." id={'fb-'+r.id} style={{minHeight:60}} />
                        <button className="btn btn-y btn-sm" style={{marginTop:6}} onClick={function() {
                          var el = document.getElementById('fb-'+r.id)
                          var v = el ? el.value : ''
                          if (v) { setReports(function(prev) { return prev.map(function(x, j) { return j===i ? Object.assign({},x,{feedback:v,status:'read'}) : x }) }); toast('Retour envoye ✓') }
                        }}>Envoyer</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {page === 'vault' && (
            <div>
              <div className="ph">
                <div><div className="pt">Coffre-fort 🔐</div><div className="ps">Acces securises</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('vault', {}) }}>+ Ajouter</button>
              </div>
              {vault.map(function(v, i) {
                return (
                  <div key={v.id} className="card" style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                      <div style={{fontWeight:900,fontSize:13}}>{v.title}</div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none'}} onClick={function(e) { e.stopPropagation() }}>{v.url}</a>
                      <div style={{fontSize:11}}>{v.user}</div>
                      <div style={{fontFamily:'monospace',fontSize:11,cursor:'pointer'}} onClick={function() { setPwVisible(function(prev) { var n = Object.assign({}, prev); n[i] = !n[i]; return n }) }}>{pwVisible[i] ? (v.pw || '(vide)') : '••••••••'}</div>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-sm" onClick={function() { openModal('vault', Object.assign({}, v)) }}>✏️</button>
                        <button className="btn btn-sm btn-red" onClick={function() { setVault(function(prev) { return prev.filter(function(x) { return x.id !== v.id }) }); toast('Supprime') }}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {page === 'gmb' && (
            <div>
              <div className='ph'>
                <div><div className='pt'>Google My Business</div><div className='ps'>{gmbData ? gmbData.rating + ' ★ · ' + gmbData.totalRatings + ' avis' : 'Chargement...'}</div></div>
                <div style={{display:'flex',gap:6}}>
                  {gmbData && gmbData.mock && <span style={{fontSize:10,background:'#FF6B2B',color:'#fff',padding:'2px 6px',borderRadius:3,fontWeight:900}}>DEMO</span>}
                  <button className='btn btn-sm btn-y' onClick={function(){navigator.clipboard.writeText('https://g.page/r/CUKxo2Ia8TH1EBM/review');toast('Lien avis copie ! 📋')}}>📋 Lien avis</button>
                  <a href='https://business.google.com' target='_blank' rel='noopener noreferrer' className='btn btn-sm'>Gerer →</a>
                </div>
              </div>
              {gmbLoading && <div style={{textAlign:'center',padding:60,opacity:.4}}><div style={{fontSize:36}}>⭐</div><div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',marginTop:8}}>Chargement des avis...</div></div>}
              {gmbData && (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                    <div className='kc' style={{background:'#191923',textAlign:'center'}}>
                      <div className='kl' style={{color:'rgba(255,235,90,.7)'}}>Note Google</div>
                      <div style={{fontSize:36,fontWeight:900,color:'#FFEB5A',fontFamily:'Arial Narrow,Arial,sans-serif'}}>{gmbData.rating}</div>
                      <div style={{color:'#FFEB5A',fontSize:16,letterSpacing:2}}>{'★'.repeat(Math.round(gmbData.rating))}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{gmbData.totalRatings} avis</div>
                    </div>
                    <div className='kc' style={{background:'#FFF',textAlign:'center',cursor:'pointer'}} onClick={function(){setGmbFilter(gmbFilter==='noreply'?'all':'noreply')}}>
                      <div className='kl'>Sans reponse</div>
                      <div className='kv' style={{fontSize:28,color:gmbData.withoutReply>0?'#CC0066':'#009D3A'}}>{gmbData.withoutReply}</div>
                      <div style={{fontSize:10,opacity:.4,marginTop:2}}>{gmbData.withoutReply>0?'⚠️ A traiter':'✅ RAS'}</div>
                    </div>
                    <div className='kc' style={{background:'#FFF',textAlign:'center'}}>
                      <div className='kl'>Ce mois</div>
                      <div className='kv' style={{fontSize:28}}>{gmbData.reviews.filter(function(r){var d=new Date(r.date);var now=new Date();return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length}</div>
                      <div style={{fontSize:10,opacity:.4,marginTop:2}}>nouveaux avis</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    {['all','5','4','3','noreply'].map(function(f){return(
                      <button key={f} className={'btn btn-sm'+(gmbFilter===f?' btn-n':'')} onClick={function(){setGmbFilter(f)}} style={{fontSize:10}}>
                        {f==='all'?'Tous':f==='noreply'?'Sans reponse':f+'★'}
                      </button>
                    )})}
                  </div>
                  {gmbData.reviews.slice().sort(function(a,b){return new Date(b.date).getTime()-new Date(a.date).getTime()}).filter(function(r){
                    if(gmbFilter==='noreply') return !r.replied
                    if(gmbFilter==='5') return r.rating===5
                    if(gmbFilter==='4') return r.rating===4
                    if(gmbFilter==='3') return r.rating<=3
                    return true
                  }).map(function(r,i){return(
                    <div key={i} className='card' style={{marginBottom:8,borderLeft:r.rating<=2?'4px solid #CC0066':r.rating===3?'4px solid #FF6B2B':r.rating===4?'4px solid #FFEB5A':'4px solid #009D3A'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                        <div>
                          <div style={{fontWeight:900,fontSize:13}}>{r.author}</div>
                          <div style={{fontSize:11,opacity:.5}}>{new Date(r.date).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          <span style={{color:'#FFEB5A',fontSize:13,letterSpacing:1}}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                          {!r.replied && <span style={{fontSize:9,background:'#CC0066',color:'#fff',padding:'1px 5px',borderRadius:3,fontWeight:900}}>SANS REPONSE</span>}
                        </div>
                      </div>
                      {r.text && <div style={{fontSize:12,lineHeight:1.5,color:'#444',marginBottom:r.replied||!r.text?0:8}}>{r.text}</div>}
                      {!r.replied && (
                        <button className='btn btn-sm btn-y' style={{fontSize:10,marginTop:6}} onClick={function(){window.open('https://business.google.com/reviews','_blank')}}>
                          ✍️ Repondre sur Google Business
                        </button>
                      )}
                      {r.replied && (
                        <div style={{marginTop:8,borderLeft:'3px solid #009D3A',paddingLeft:10,background:'#F0FFF4',borderRadius:'0 4px 4px 0',padding:'8px 10px'}}>
                          <div style={{fontSize:10,fontWeight:900,color:'#009D3A',marginBottom:3}}>✅ Réponse de Meshuga :</div>
                          {r.reply_text
                            ? <div style={{fontSize:12,lineHeight:1.5,color:'#333'}}>{r.reply_text}</div>
                            : <div style={{fontSize:11,color:'#009D3A',fontStyle:'italic'}}>Réponse envoyée sur Google Business</div>
                          }
                        </div>
                      )}
                    </div>
                  )})}
                  <div style={{textAlign:'center',padding:'12px 0',opacity:.4,fontSize:12}}>
                    Google Places API · {gmbData.mock?'Mode demonstration - Ajoutez GOOGLE_MAPS_SERVER_KEY dans Vercel pour les vrais avis':'Donnees en temps reel'}
                  </div>
                </div>
              )}
            </div>
          )}

          {page === 'devis' && (
            <div>
              {/* PHASE 2 — MODE TOGGLE: Catering (nouveau) vs Classique (legacy) */}
              <div style={{display:'flex',gap:8,marginBottom:14,padding:'10px 14px',background:'#FFFFFF',borderRadius:7,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontFamily:"'Yellowtail',cursive",fontSize:15,marginRight:4}}>Mode :</span>
                <button className={'btn btn-sm' + (devisMode === 'catering' ? ' btn-p' : '')} onClick={function(){setDevisMode('catering')}}>📦 Catering (Phase 2)</button>
                <button className={'btn btn-sm' + (devisMode === 'legacy' ? ' btn-y' : '')} onClick={function(){setDevisMode('legacy')}}>🥪 Classique</button>
              </div>
             {devisMode === 'catering' && !cateringEditorOpen && (
                <QuotesTab
                  supabase={sb()}
                  profile={profile}
                  onNew={function(){
                    setCateringWizardOpen(true)
                  }}
                  onOpen={function(d){
                    setCateringEditingId(d && d.id ? d.id : null)
                    setCateringEditorOpen(true)
                  }}
                />
              )}
              {devisMode === 'catering' && cateringWizardOpen && (
                <QuoteWizard
                  supabase={sb()}
                  profile={profile}
                  onClose={function(){
                    setCateringWizardOpen(false)
                  }}
                  onOpenEditor={function(devisId, devisData){
                    setCateringWizardOpen(false)
                    setCateringEditingId(devisId)
                    setCateringEditorOpen(true)
                  }}
                />
              )}
              {devisMode === 'catering' && cateringEditorOpen && (
                <QuoteEditor
                  supabase={sb()}
                  profile={profile}
                  devisId={cateringEditingId}
                  prospects={prospects}
                  onClose={function(){
                    setCateringEditorOpen(false)
                    setCateringEditingId(null)
                  }}
                  onSaved={function(saved){
                    loadDevis()
                    setCateringEditorOpen(false)
                    setCateringEditingId(null)
                  }}
                  toast={toast}
                />
              )}
              <div style={{display: devisMode === 'catering' ? 'none' : 'block'}}>
              <div className="ph">
                <div><div className="pt">Devis</div><div className="ps">{devisView==='list'?devisList.length+' devis':'Editeur'}</div></div>
                <div style={{display:'flex',gap:6}}>
                  {devisView==='edit'&&<button className="btn btn-p btn-sm" onClick={function(){setDevisView('list')}}>&#8592; Fermer l&apos;éditeur</button>}
                  <button className="btn btn-y btn-sm" onClick={function(){
                    setDevisView('edit');setDevisItems([]);setCurrentDevisId(null)
                    setDevisClient({nom:'',contact:'',email:'',phone:'',date:'',lieu:'',prospectId:null})
                    setDevisNbPersonnes(50);setDevisFormat('normal');setDevisMiseEnPlace(1500)
                    setDevisMiseEnPlacePct(0);setDevisRemiseTotal(0);setDevisNotes('');setDevisLivraison(0)
                    setDevisLivraisonOffert(false);setDevisMepOffert(false)
                    setDevisNumero('DEV-'+new Date().getFullYear()+'-'+String(devisList.length+1).padStart(3,'0'))
                  }}>+ Nouveau devis</button>
                </div>
              </div>
              {devisView==='list'&&(
                <div>
                  {devisList.length===0?(
                    <div className="card" style={{textAlign:'center',padding:50,opacity:.4}}>
                      <div style={{fontSize:40,marginBottom:10}}>📄</div>
                      <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun devis — crée le premier !</div>
                    </div>
                  ):(
                    <div>
                      {devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).length>0&&(
                        <div style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:'#EBF3FF',borderRadius:6,border:'1.5px solid #005FFF'}}>
                            <div className="yt" style={{fontSize:17,color:'#005FFF'}}>📤 En attente de réponse</div>
                            <div style={{fontWeight:900,fontSize:12,color:'#005FFF',marginLeft:'auto'}}>{devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).reduce(function(s,d){return s+(parseFloat(d.total_ttc)||0)},0).toLocaleString('fr-FR')} € TTC</div>
                            <span style={{fontSize:10,background:'#005FFF',color:'#fff',padding:'2px 7px',borderRadius:3,fontWeight:900}}>{devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).length}</span>
                          </div>
                          {devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).map(function(dv){
                            var sc2={brouillon:'#888',envoye:'#005FFF',accepte:'#009D3A',refuse:'#CC0066',a_modifier:'#FF6B2B',facture:'#191923',paye:'#009D3A'}
                            var sl2={brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé',a_modifier:'À modifier',facture:'Facturé',paye:'Soldé'}
                            var col=sc2[dv.statut]||'#888'
                            return(
                              <div key={dv.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+col}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                                      <span style={{fontWeight:900,fontSize:14}}>{dv.numero}</span>
                                      <span className="badge" style={{color:col,borderColor:col}}>{sl2[dv.statut]||dv.statut}</span>
                                      {dv.facture_numero&&<span className="badge" style={{color:'#191923',borderColor:'#191923'}}>FACT {dv.facture_numero}</span>}
                                      {dv.acompte_recu&&<span style={{fontSize:9,background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'1px 5px',fontWeight:900}}>💰 Acompte OK</span>}
                                    </div>
                                    <div style={{fontWeight:900,fontSize:13}}>{dv.client_nom}</div>
                                    <div style={{fontSize:11,opacity:.5}}>{dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):''} {dv.event_lieu?'· '+dv.event_lieu:''} · {dv.nb_personnes} pers.</div>
                                  </div>
                                  <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:18}}>{parseFloat(dv.total_ttc||0).toFixed(2)} €</div><div style={{fontSize:9,opacity:.4}}>TTC</div></div>
                                </div>
                                <div style={{display:'flex',gap:5,marginTop:10,flexWrap:'wrap'}}>
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){setDevisView('edit');setCurrentDevisId(dv.id);setDevisNumero(dv.numero);setDevisClient({nom:dv.client_nom,contact:dv.client_contact||'',email:dv.client_email||'',phone:dv.client_phone||'',date:dv.event_date||'',lieu:dv.event_lieu||'',prospectId:dv.prospect_id});setDevisNbPersonnes(dv.nb_personnes||50);setDevisFormat(dv.format||'normal');setDevisItems(dv.items||[]);setDevisMiseEnPlace(parseFloat(dv.mise_en_place||0));setDevisMiseEnPlacePct(parseFloat(dv.remise_mep_pct||0));setDevisRemiseTotal(parseFloat(dv.remise_total_pct||0));setDevisNotes(dv.notes||'');setDevisLivraison(parseFloat(dv.livraison||0));setDevisLivraisonOffert(!!dv.livraison_offert);setDevisMepOffert(!!dv.mise_en_place_offert)}}>✏️ Modifier</button>
                                  {dv.statut==='brouillon'&&<button className="btn btn-p btn-sm" style={{fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'envoye','')}}>📤 Envoyé</button>}
                                  {dv.statut==='envoye'&&<button className="btn btn-sm" style={{background:'#009D3A',color:'#fff',fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'accepte','')}}>✓ Accepté</button>}
                                  {dv.statut==='envoye'&&<button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'refuse','')}}>✗ Refusé</button>}
                                  {dv.statut==='envoye'&&<button className="btn btn-sm" style={{background:'#FF6B2B',color:'#fff',fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'a_modifier','')}}>⚠️ À modifier</button>}
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,false)}}>📄 PDF</button>
                                  {dv.facture_numero&&<button className="btn btn-n btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,true)}}>🧾 PDF Fact.</button>}
                                  <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){sb().from('devis').delete().eq('id',dv.id).then(function(){loadDevis();toast('Devis supprimé')})}}>🗑️</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).length>0&&(
                        <div style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:'#F0FFF4',borderRadius:6,border:'1.5px solid #009D3A'}}>
                            <div className="yt" style={{fontSize:17,color:'#009D3A'}}>🎯 À facturer / Solder</div>
                            <div style={{fontWeight:900,fontSize:12,color:'#009D3A',marginLeft:'auto'}}>{devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).reduce(function(s,d){return s+(parseFloat(d.total_ttc)||0)},0).toLocaleString('fr-FR')} € TTC</div>
                            <span style={{fontSize:10,background:'#009D3A',color:'#fff',padding:'2px 7px',borderRadius:3,fontWeight:900}}>{devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).length}</span>
                          </div>
                          {devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).map(function(dv){
                            var sc2={brouillon:'#888',envoye:'#005FFF',accepte:'#009D3A',refuse:'#CC0066',a_modifier:'#FF6B2B',facture:'#191923',paye:'#009D3A'}
                            var sl2={brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé',a_modifier:'À modifier',facture:'Facturé',paye:'Soldé'}
                            var col=sc2[dv.statut]||'#888'
                            return(
                              <div key={dv.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+col}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                                      <span style={{fontWeight:900,fontSize:14}}>{dv.numero}</span>
                                      <span className="badge" style={{color:col,borderColor:col}}>{sl2[dv.statut]||dv.statut}</span>
                                      {dv.facture_numero&&<span className="badge" style={{color:'#191923',borderColor:'#191923'}}>FACT {dv.facture_numero}</span>}
                                      {dv.acompte_recu&&<span style={{fontSize:9,background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'1px 5px',fontWeight:900}}>💰 Acompte OK</span>}
                                    </div>
                                    <div style={{fontWeight:900,fontSize:13}}>{dv.client_nom}</div>
                                    <div style={{fontSize:11,opacity:.5}}>{dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):''} {dv.event_lieu?'· '+dv.event_lieu:''} · {dv.nb_personnes} pers.</div>
                                  </div>
                                  <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:18}}>{parseFloat(dv.total_ttc||0).toFixed(2)} €</div><div style={{fontSize:9,opacity:.4}}>TTC</div></div>
                                </div>
                                <div style={{display:'flex',gap:5,marginTop:10,flexWrap:'wrap'}}>
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){setDevisView('edit');setCurrentDevisId(dv.id);setDevisNumero(dv.numero);setDevisClient({nom:dv.client_nom,contact:dv.client_contact||'',email:dv.client_email||'',phone:dv.client_phone||'',date:dv.event_date||'',lieu:dv.event_lieu||'',prospectId:dv.prospect_id});setDevisNbPersonnes(dv.nb_personnes||50);setDevisFormat(dv.format||'normal');setDevisItems(dv.items||[]);setDevisMiseEnPlace(parseFloat(dv.mise_en_place||0));setDevisMiseEnPlacePct(parseFloat(dv.remise_mep_pct||0));setDevisRemiseTotal(parseFloat(dv.remise_total_pct||0));setDevisNotes(dv.notes||'');setDevisLivraison(parseFloat(dv.livraison||0));setDevisLivraisonOffert(!!dv.livraison_offert);setDevisMepOffert(!!dv.mise_en_place_offert)}}>✏️ Modifier</button>
                                  {(dv.statut==='accepte'||dv.statut==='facture')&&!dv.acompte_recu&&<button className="btn btn-sm" style={{background:'#FFEB5A',color:'#191923',fontSize:10}} onClick={function(){sb().from('devis').update({acompte_recu:true,acompte_date:new Date().toISOString().split('T')[0]}).eq('id',dv.id).then(function(){loadDevis();toast('💰 Acompte reçu !')})}}>💰 Acompte reçu</button>}
                                  {dv.statut==='accepte'&&!dv.facture_numero&&<button className="btn btn-n btn-sm" style={{fontSize:10}} onClick={function(){var fn='FACT-'+new Date().getFullYear()+'-'+String(devisList.filter(function(x){return x.facture_numero}).length+1).padStart(3,'0');sb().from('devis').update({statut:'facture',facture_numero:fn,facture_date:new Date().toISOString().split('T')[0]}).eq('id',dv.id).then(function(){loadDevis();toast('🧾 Facture '+fn+' générée!')})}}>🧾 Facturer</button>}
                                  {dv.statut==='facture'&&dv.paiement_statut!=='paye'&&<button className="btn btn-sm" style={{background:'#009D3A',color:'#fff',fontSize:10}} onClick={function(){sb().from('devis').update({paiement_statut:'paye',statut:'paye',solde_recu:true,solde_date:new Date().toISOString().split('T')[0]}).eq('id',dv.id).then(function(){loadDevis();toast('✅ Soldé!')})}}>✅ Soldé</button>}
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,false)}}>📄 PDF</button>
                                  {dv.facture_numero&&<button className="btn btn-n btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,true)}}>🧾 PDF Fact.</button>}
                                  <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){sb().from('devis').delete().eq('id',dv.id).then(function(){loadDevis();toast('Devis supprimé')})}}>🗑️</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {devisList.filter(function(d2){return d2.statut==="paye"||d2.statut==="refuse"||d2.statut==="brouillon"}).length>0&&(
                        <div style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:'#F8F8F8',borderRadius:6,border:'1.5px solid #DEDEDE'}}>
                            <div className="yt" style={{fontSize:17,color:'#888'}}>📁 Archives</div>
                            <span style={{fontSize:10,background:'#888',color:'#fff',padding:'2px 7px',borderRadius:3,fontWeight:900,marginLeft:'auto'}}>{devisList.filter(function(d2){return d2.statut==="paye"||d2.statut==="refuse"||d2.statut==="brouillon"}).length}</span>
                          </div>
                          {devisList.filter(function(d2){return d2.statut==="paye"||d2.statut==="refuse"||d2.statut==="brouillon"}).map(function(dv){
                            var sc2={brouillon:'#888',envoye:'#005FFF',accepte:'#009D3A',refuse:'#CC0066',a_modifier:'#FF6B2B',facture:'#191923',paye:'#009D3A'}
                            var sl2={brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé',a_modifier:'À modifier',facture:'Facturé',paye:'Soldé'}
                            var col=sc2[dv.statut]||'#888'
                            return(
                              <div key={dv.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+col,opacity:.7}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                                      <span style={{fontWeight:900,fontSize:14}}>{dv.numero}</span>
                                      <span className="badge" style={{color:col,borderColor:col}}>{sl2[dv.statut]||dv.statut}</span>
                                    </div>
                                    <div style={{fontWeight:900,fontSize:13}}>{dv.client_nom}</div>
                                    <div style={{fontSize:11,opacity:.5}}>{dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):''} · {dv.nb_personnes} pers.</div>
                                  </div>
                                  <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:16}}>{parseFloat(dv.total_ttc||0).toFixed(2)} €</div></div>
                                </div>
                                <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,false)}}>📄 PDF</button>
                                  <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){sb().from('devis').delete().eq('id',dv.id).then(function(){loadDevis();toast('Supprimé')})}}>🗑️</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {devisView==='edit'&&(
                <div className="g2">
                  <div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Client</div>
                      <div className="fg"><label className="lbl">Prospect existant</label>
                        <select className="inp" value={devisClient.prospectId ? String(devisClient.prospectId) : ''} onChange={function(e){
                          var pid = e.target.value
                          if(!pid){setDevisClient(Object.assign({},devisClient,{prospectId:null,nom:'',email:'',phone:''}));return}
                          var allPs = prospects.concat(chasse.filter(function(c){return c.status!=='to_contact'}))
                          var p = allPs.find(function(x){return String(x.id)===pid})
                          if(p) setDevisClient(Object.assign({},devisClient,{nom:p.name||'',email:p.email||'',phone:p.phone||'',prospectId:p.id}))
                        }}>
                          <option value="">-- Nouveau client --</option>
                          <optgroup label="CRM Prospects">
                            {prospects.map(function(p){return <option key={'crm-'+p.id} value={String(p.id)}>{p.name}</option>})}
                          </optgroup>
                          <optgroup label="Tableau de chasse (contactés)">
                            {chasse.filter(function(c){return c.status!=='to_contact'}).map(function(p){return <option key={'ch-'+p.id} value={String(p.id)}>{p.name}</option>})}
                          </optgroup>
                        </select>
                      </div>
                      <div className="fg"><label className="lbl">Entreprise *</label><input className="inp" value={devisClient.nom} onChange={function(e){setDevisClient(Object.assign({},devisClient,{nom:e.target.value}))}} /></div>
                      <div className="fg2">
                        <div className="fg"><label className="lbl">Contact</label><input className="inp" value={devisClient.contact} onChange={function(e){setDevisClient(Object.assign({},devisClient,{contact:e.target.value}))}} /></div>
                        <div className="fg"><label className="lbl">Email</label><input className="inp" value={devisClient.email} onChange={function(e){setDevisClient(Object.assign({},devisClient,{email:e.target.value}))}} /></div>
                      </div>
                      <div className="fg2">
                        <div className="fg"><label className="lbl">Date événement</label><input type="date" className="inp" value={devisClient.date} onChange={function(e){setDevisClient(Object.assign({},devisClient,{date:e.target.value}))}} /></div>
                        <div className="fg"><label className="lbl">Lieu</label><input className="inp" value={devisClient.lieu} onChange={function(e){setDevisClient(Object.assign({},devisClient,{lieu:e.target.value}))}} /></div>
                      </div>
                      {!devisClient.prospectId&&devisClient.nom&&<button className="btn btn-y btn-sm" style={{marginTop:4}} onClick={function(){
                        var np={id:Date.now(),name:devisClient.nom,email:devisClient.email,phone:'',size:'',category:'Evénementiel',status:'contacted',nextAction:'Devis envoyé',nextDate:'',notes:'',ca:0,score:7,files:[]}
                        setProspects(function(prev){return prev.concat([np])})
                        setDevisClient(Object.assign({},devisClient,{prospectId:np.id}))
                        toast('Prospect ajouté au CRM !')
                      }}>+ Ajouter au CRM</button>}
                      <div className="fg" style={{marginTop:8}}><label className="lbl">N° Devis</label><input className="inp" value={devisNumero} onChange={function(e){setDevisNumero(e.target.value)}} /></div>
                    </div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Format</div>
                      <div className="fg"><label className="lbl">Nombre de personnes</label><input type="number" className="inp" value={devisNbPersonnes} min="1" onChange={function(e){setDevisNbPersonnes(parseInt(e.target.value)||1)}} /></div>
                      <div className="fg">
                        <label className="lbl">Format (indicatif)</label>
                        <div style={{display:'flex',gap:8}}>
                          <div onClick={function(){setDevisFormat('normal')}} style={{flex:1,padding:'10px',border:'2px solid '+(devisFormat==='normal'?'#191923':'#EBEBEB'),borderRadius:5,cursor:'pointer',background:devisFormat==='normal'?'#FFEB5A':'#FAFAFA',textAlign:'center'}}>
                            <div style={{fontWeight:900,fontSize:12}}>Normal</div><div style={{fontSize:10,opacity:.5}}>~1/pers.</div>
                          </div>
                          <div onClick={function(){setDevisFormat('mini')}} style={{flex:1,padding:'10px',border:'2px solid '+(devisFormat==='mini'?'#191923':'#EBEBEB'),borderRadius:5,cursor:'pointer',background:devisFormat==='mini'?'#FFEB5A':'#FAFAFA',textAlign:'center'}}>
                            <div style={{fontWeight:900,fontSize:12}}>Mini</div><div style={{fontSize:10,opacity:.5}}>~3/pers.</div>
                          </div>
                        </div>
                      </div>
                      <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'5px 8px',fontSize:10}}>Conseillé : {devisFormat==='normal'?devisNbPersonnes:(devisNbPersonnes*3)} pièces</div>
                    </div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Frais & Remises</div>
                      <div style={{padding:'10px',border:'1.5px solid #EBEBEB',borderRadius:5,marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <div style={{fontWeight:900,fontSize:12}}>Mise en place / Show cooking</div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={devisMepOffert} style={{width:14,height:14,accentColor:'#009D3A'}} onChange={function(e){setDevisMepOffert(e.target.checked)}} /><span style={{fontSize:11,fontWeight:900,color:devisMepOffert?'#009D3A':'#888'}}>Offert</span></div>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <input type="number" className="inp" style={{flex:1}} value={devisMiseEnPlace} onChange={function(e){setDevisMiseEnPlace(parseFloat(e.target.value)||0)}} disabled={devisMepOffert} />
                          <input type="number" className="inp" style={{width:60}} placeholder="%" value={devisMiseEnPlaceRemise} min="0" max="100" onChange={function(e){setDevisMiseEnPlacePct(parseFloat(e.target.value)||0)}} disabled={devisMepOffert} />
                        </div>
                      </div>
                      <div style={{padding:'10px',border:'1.5px solid #EBEBEB',borderRadius:5,marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <div style={{fontWeight:900,fontSize:12}}>Frais de livraison</div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={devisLivraisonOffert} style={{width:14,height:14,accentColor:'#009D3A'}} onChange={function(e){setDevisLivraisonOffert(e.target.checked)}} /><span style={{fontSize:11,fontWeight:900,color:devisLivraisonOffert?'#009D3A':'#888'}}>Offert</span></div>
                        </div>
                        <input type="number" className="inp" value={devisLivraison} onChange={function(e){setDevisLivraison(parseFloat(e.target.value)||0)}} disabled={devisLivraisonOffert} />
                      </div>
                      <div className="fg"><label className="lbl">Remise sur le total (%)</label><input type="number" className="inp" value={devisRemiseTotal} min="0" max="100" onChange={function(e){setDevisRemiseTotal(parseFloat(e.target.value)||0)}} /></div>
                    </div>
                    <div className="card"><div className="ct">Notes</div><textarea className="inp" value={devisNotes} onChange={function(e){setDevisNotes(e.target.value)}} placeholder="Conditions spéciales..." style={{minHeight:70}} /></div>
                  </div>
                  <div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Sandwichs</div>
                      <div style={{fontSize:10,opacity:.4,marginBottom:8,padding:'4px 8px',background:'#F8F8F8',borderRadius:4}}>Conseillé : {devisFormat==='normal'?devisNbPersonnes:(devisNbPersonnes*3)} pièces</div>
                      {(devisFormat==='normal'?[{id:"hot_dog",nom:"Hot Dog",prix:7.56},{id:"grilled_cheese",nom:"Grilled Cheese",prix:7.56},{id:"egg_salad",nom:"Egg Salad",prix:8.51},{id:"chicken_caesar",nom:"Chicken Caesar",prix:11.34},{id:"tuna_melt",nom:"Tuna Melt",prix:11.34},{id:"pastrami",nom:"Pastrami",prix:14.18},{id:"smoked_salmon",nom:"Smoked Salmon",prix:13.23},{id:"lobster_roll",nom:"Lobster Roll",prix:20.79},{id:"pbn",nom:"PBN",prix:5.67}]:[{id:"hot_dog_m",nom:"Hot Dog Mini",prix:2.7},{id:"grilled_cheese_m",nom:"Grilled Cheese Mini",prix:2.87},{id:"egg_salad_m",nom:"Egg Salad Mini",prix:2.65},{id:"chicken_caesar_m",nom:"Chicken Caesar Mini",prix:3.35},{id:"tuna_melt_m",nom:"Tuna Melt Mini",prix:3.0},{id:"pastrami_m",nom:"Pastrami Mini",prix:3.8},{id:"smoked_salmon_m",nom:"Smoked Salmon Mini",prix:3.9},{id:"lobster_roll_m",nom:"Lobster Roll Mini",prix:7.5},{id:"pbn_m",nom:"PBN Mini",prix:2.7},{id:"mini_veggie",nom:"Salade Mini Veggie",prix:4.72}]).map(function(s){
                        var ex=devisItems.filter(function(x){return x.id===s.id})[0]
                        var qty=ex?ex.qte:0
                        var setQty = function(nq){
                          if(nq<=0)setDevisItems(devisItems.filter(function(x){return x.id!==s.id}))
                          else if(qty===0)setDevisItems(devisItems.concat([{id:s.id,nom:s.nom,prix:s.prix,qte:nq,total_ht:nq*s.prix}]))
                          else setDevisItems(devisItems.map(function(x){return x.id===s.id?Object.assign({},x,{qte:nq,total_ht:nq*s.prix}):x}))
                        }
                        return(
                          <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #EBEBEB'}}>
                            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:qty>0?900:400}}>{s.nom}</div><div style={{fontSize:9,opacity:.4}}>{s.prix.toFixed(2)} EUR HT</div></div>
                            <div style={{display:'flex',alignItems:'center',gap:5}}>
                              <button className="btn btn-sm" onClick={function(){setQty(qty-1)}}>-</button>
                              <input type="number" min="0" style={{width:46,textAlign:'center',border:'2px solid #191923',borderRadius:4,padding:'3px',fontSize:12,fontWeight:900}} value={qty} onChange={function(e){setQty(parseInt(e.target.value)||0)}} />
                              <button className="btn btn-y btn-sm" onClick={function(){setQty(qty+1)}}>+</button>
                            </div>
                          </div>
                        )
                      })}
                      <div style={{marginTop:8,padding:'6px 10px',background:'#FFEB5A',borderRadius:4,border:'1.5px solid #191923',display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:11,fontWeight:900}}>Total sélectionné</span>
                        <span style={{fontSize:13,fontWeight:900}}>{devisItems.reduce(function(s,x){return s+x.qte},0)} pièces</span>
                      </div>
                    </div>
                    {(function(){
                      var sandTotal=devisItems.reduce(function(s,x){return s+x.total_ht},0)
                      var mepHT=devisMepOffert?devisMiseEnPlace:devisMiseEnPlace*(1-devisMiseEnPlaceRemise/100)
                      var livHT=devisLivraisonOffert?devisLivraison:devisLivraison
                      var sousTotal=sandTotal+mepHT+livHT
                      var remiseMontant=sousTotal*devisRemiseTotal/100
                      var totalHT=sousTotal-remiseMontant
                      var tva=totalHT*0.055
                      var totalTTC=totalHT+tva
                      return(
                        <div className="card" style={{border:'3px solid #191923',boxShadow:'4px 4px 0 #191923'}}>
                          <div className="ct">Récapitulatif</div>
                          <div style={{borderRadius:5,overflow:'hidden',marginBottom:8}}>
                            {devisItems.map(function(item){return <div key={item.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #EBEBEB',background:'#FAFAFA',fontSize:11}}><span>{item.nom} x{item.qte}</span><span style={{fontWeight:900}}>{item.total_ht.toFixed(2)} EUR</span></div>})}
                            {devisMiseEnPlace>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #EBEBEB',background:'#FAFAFA',fontSize:11}}>
                              <span style={{textDecoration:devisMepOffert?'line-through':'none',opacity:devisMepOffert?.5:1}}>Mise en place{devisMepOffert&&<span style={{color:'#009D3A',marginLeft:6,fontWeight:900}}>OFFERT</span>}</span>
                              <span style={{fontWeight:900,textDecoration:devisMepOffert?'line-through':'none',opacity:devisMepOffert?.5:1}}>{devisMiseEnPlace.toFixed(2)} EUR</span>
                            </div>}
                            {devisLivraison>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #EBEBEB',background:'#FAFAFA',fontSize:11}}>
                              <span style={{textDecoration:devisLivraisonOffert?'line-through':'none',opacity:devisLivraisonOffert?.5:1}}>Livraison{devisLivraisonOffert&&<span style={{color:'#009D3A',marginLeft:6,fontWeight:900}}>OFFERT</span>}</span>
                              <span style={{fontWeight:900,textDecoration:devisLivraisonOffert?'line-through':'none',opacity:devisLivraisonOffert?.5:1}}>{devisLivraison.toFixed(2)} EUR</span>
                            </div>}
                            {remiseMontant>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:'#FFF0F5',fontSize:11,color:'#CC0066'}}><span>Remise ({devisRemiseTotal}%)</span><span style={{fontWeight:900}}>-{remiseMontant.toFixed(2)} EUR</span></div>}
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #EBEBEB',fontSize:12}}><span>Total HT</span><span style={{fontWeight:900}}>{totalHT.toFixed(2)} EUR</span></div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #EBEBEB',fontSize:11,opacity:.5}}><span>TVA 5,5%</span><span>{tva.toFixed(2)} EUR</span></div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'10px 8px',background:'#FFEB5A',borderRadius:5,marginTop:8,border:'2px solid #191923'}}><span className="yt" style={{fontSize:20}}>Total TTC</span><span style={{fontWeight:900,fontSize:18}}>{totalTTC.toFixed(2)} EUR</span></div>
                          <div style={{fontSize:10,opacity:.35,textAlign:'center',marginTop:4}}>{(totalTTC/devisNbPersonnes).toFixed(2)} EUR TTC / personne</div>
                          <div style={{display:'flex',gap:6,marginTop:12}}>
                            <button className="btn btn-y" style={{flex:1,justifyContent:'center',fontSize:11}} onClick={function(){
                              if(!devisClient.nom){toast('Nom du client requis !');return}
                              if(devisItems.length===0){toast('Sélectionnez au moins un sandwich !');return}
                              var payload={numero:devisNumero,statut:'brouillon',prospect_id:devisClient.prospectId?String(devisClient.prospectId):null,client_nom:devisClient.nom,client_contact:devisClient.contact,client_email:devisClient.email,client_phone:devisClient.phone||'',event_date:devisClient.date||null,event_lieu:devisClient.lieu,nb_personnes:devisNbPersonnes,format:devisFormat,items:devisItems,mise_en_place:devisMiseEnPlace,mise_en_place_offert:devisMepOffert,livraison:devisLivraison,livraison_offert:devisLivraisonOffert,remise_mep_pct:devisMiseEnPlaceRemise,remise_total_pct:devisRemiseTotal,remise_montant:remiseMontant,total_ht:totalHT,tva:tva,total_ttc:totalTTC,notes:devisNotes,date_validite:new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0]}
                              if(currentDevisId)payload.id=currentDevisId
                              saveDevisToSupabase(payload,function(saved){sendPushToAll('📄 Devis sauvegardé', 'Devis ' + (payload.numero||'') + ' pour ' + (payload.client_nom||'') + ' — ' + ((payload.total_ttc||0)).toLocaleString('fr-FR') + ' € TTC', 'edward');toast('Devis sauvegardé !');setCurrentDevisId(saved.id)})
                            }}>&#128190; Sauvegarder</button>
                            <button className="btn btn-p" style={{flex:1,justifyContent:'center',fontSize:11}} onClick={function(){
                              if(!devisClient.nom){toast('Nom du client requis !');return}
                              generateAndPrintDoc({items:devisItems,mep:devisMiseEnPlace,mep_offert:devisMepOffert,mep_remise:devisMiseEnPlaceRemise,liv:devisLivraison,liv_offert:devisLivraisonOffert,remise_pct:devisRemiseTotal,remise_montant:remiseMontant,total_ht:totalHT,tva:tva,total_ttc:totalTTC,client_nom:devisClient.nom,client_contact:devisClient.contact,client_email:devisClient.email,event_date:devisClient.date,event_lieu:devisClient.lieu,nb_personnes:devisNbPersonnes,format:devisFormat,numero:devisNumero,notes:devisNotes},false)
                            }}>&#128196; PDF Devis</button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {page === 'instagram' && (
            <InstaTab
              toast={toast}
              instaData={instaData}
              instaLoading={instaLoading}
              fcRecipes={fcRecipes}
              fcSeuil={fcSeuil}
              fcAlertCat={fcAlertCat}
              setFcAlertCat={setFcAlertCat}
              fcPriceAnalysis={fcPriceAnalysis}
              setFcPriceAnalysis={setFcPriceAnalysis}
              fcPriceLoading={fcPriceLoading}
              setFcPriceLoading={setFcPriceLoading}
              messages={messages}
            />
          )}
         {page === 'rh' && <RhTab />}
          {page === 'legal' && <LegalTab />}
       {page === 'recipes' && (
            <FoodCostTab
              fcRecipes={fcRecipes}
              setFcRecipes={setFcRecipes}
              fcSeuil={fcSeuil}
              setFcSeuil={setFcSeuil}
              fcAlertCat={fcAlertCat}
              setFcAlertCat={setFcAlertCat}
              fcPriceAnalysis={fcPriceAnalysis}
              setFcPriceAnalysis={setFcPriceAnalysis}
              fcPriceLoading={fcPriceLoading}
              setFcPriceLoading={setFcPriceLoading}
              toast={toast}
            />
          )}
          {page === 'purchases' && (
            <PurchasesTab toast={toast} />
          )}

          {/* MODAL EDITION/CREATION RECETTE FOOD COST */}
                    {/* MODAL IMPORT FACTURE */}

          {page === 'notifs' && (
            <NotifsTab
              toast={toast}
              isEmy={isEmy}
              pushEnabled={pushEnabled}
              setPushEnabled={setPushEnabled}
              pushLoading={pushLoading}
              setPushLoading={setPushLoading}
              registerPush={registerPush}
              unregisterPush={unregisterPush}
            />
          )}
          {page === 'journal' && !isEmy && (
            <JournalTab
              activityLog={activityLog}
              isEmy={isEmy}
            />
          )}
        </div>
      </div>

      <DashboardModals
        modal={modal}
        form={form}
        setForm={setForm}
        closeModal={closeModal}
        saveTask={saveTask}
        saveContact={saveContact}
        saveVault={saveVault}
        saveCalEvent={saveCalEvent}
        deleteCalEvent={deleteCalEvent}
        submitCR={submitCR}
        enrichProspect={enrichProspect}
        enrichLoading={enrichLoading}
        generateEmail={generateEmail}
        generatingEmail={generatingEmail}
        generatedEmail={generatedEmail}
        setGeneratedEmail={setGeneratedEmail}
        emailProspect={emailProspect}
        setEmailProspect={setEmailProspect}
        prospects={prospects}
        contacts={contacts}
        vault={vault}
        toast={toast}
        nav={nav}
      />
        </div>
      <div className="bottom-bar">
        <div className={page === "dash" ? "bb-btn active" : "bb-btn"} onClick={function(){ nav("dash") }}><span className="bb-ico">{"⚡"}</span><span className="bb-lbl">Accueil</span></div>
        <div className={page === "crm" ? "bb-btn active" : "bb-btn"} onClick={function(){ nav("crm") }}><span className="bb-ico">{"◎"}</span><span className="bb-lbl">CRM</span></div>
        <div className="bb-menu" onClick={function(){ setMenuOpen(true) }}>
          <div className="bb-menu-circle"><img src={STAMP_PINK} alt="menu" /></div>
          <span className="bb-menu-lbl">Menu</span>
        </div>
        <div className={page === "devis" ? "bb-btn active" : "bb-btn"} onClick={function(){ nav("devis") }}><span className="bb-ico">{"📄"}</span><span className="bb-lbl">Devis</span></div>
        <div className={(page === "recipes" || page === "purchases") ? "bb-btn active" : "bb-btn"} onClick={function(){ nav("recipes") }}><span className="bb-ico">{"🥪"}</span><span className="bb-lbl">Recettes</span></div>
      </div>
      <div className={menuOpen ? "mms-overlay open" : "mms-overlay"} onClick={function(){ setMenuOpen(false) }}></div>
      <div className={menuOpen ? "mms-sheet open" : "mms-sheet"}>
        <div className="mms-handle" onClick={function(){ setMenuOpen(false) }}></div>
        <div className="mms-header">
          <div className="mms-title">{isEmy ? 'Bonjour Emy' : 'Bonjour Edward'}</div>
          <div className="mms-subtitle">Où veux-tu aller ?</div>
        </div>
        <div className="mms-sec">Accueil</div>
        <div className="mms-grid">
          <div className={page === "dash" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("dash"); setMenuOpen(false) }}><div className="mms-tile-ico">{"⚡"}</div><div className="mms-tile-lbl">Dashboard</div></div>
          <div className={page === "pilotage" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("pilotage"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📈"}</div><div className="mms-tile-lbl">Analytics</div></div>
          <div className={page === "tasks" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("tasks"); setMenuOpen(false) }}><div className="mms-tile-ico">{"✅"}</div><div className="mms-tile-lbl">Tâches</div></div>
        </div>
        <div className="mms-sec">Commercial B2B</div>
        <div className="mms-grid">
          <div className={page === "crm" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("crm"); setMenuOpen(false) }}><div className="mms-tile-ico">{"◎"}</div><div className="mms-tile-lbl">CRM</div></div>
          <div className={page === "chasse" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("chasse"); setMenuOpen(false) }}><div className="mms-tile-ico">{"🔍"}</div><div className="mms-tile-lbl">Prospection</div></div>
          <div className={page === "devis" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("devis"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📄"}</div><div className="mms-tile-lbl">Devis</div></div>
          {!isEmy && <div className={page === "reporting" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("reporting"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📋"}</div><div className="mms-tile-lbl">Reporting</div></div>}
        </div>
        <div className="mms-sec">Cuisine & Achats</div>
        <div className="mms-grid">
          <div className={page === "recipes" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("recipes"); setMenuOpen(false) }}><div className="mms-tile-ico">{"🥪"}</div><div className="mms-tile-lbl">Recettes</div></div>
          <div className={page === "purchases" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("purchases"); setMenuOpen(false) }}><div className="mms-tile-ico">{"🛒"}</div><div className="mms-tile-lbl">Achats</div></div>
          <div className={page === "annuaire" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("annuaire"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📒"}</div><div className="mms-tile-lbl">Annuaire</div></div>
        </div>
        <div className="mms-sec">Équipe & Admin</div>
        <div className="mms-grid">
          <div className={page === "rh" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("rh"); setMenuOpen(false) }}><div className="mms-tile-ico">{"👥"}</div><div className="mms-tile-lbl">RH</div></div>
          <div className={page === "legal" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("legal"); setMenuOpen(false) }}><div className="mms-tile-ico">{"⚖️"}</div><div className="mms-tile-lbl">Légal</div></div>
          {!isEmy && <div className={page === "journal" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("journal"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📓"}</div><div className="mms-tile-lbl">Journal</div></div>}
        </div>
        <div className="mms-sec">Marketing</div>
        <div className="mms-grid">
          <div className={page === "instagram" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("instagram"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📸"}</div><div className="mms-tile-lbl">Instagram</div></div>
          <div className={page === "gmb" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("gmb"); setMenuOpen(false) }}><div className="mms-tile-ico">{"⭐"}</div><div className="mms-tile-lbl">Google Biz</div></div>
        </div>
        <div className="mms-sec">Outils</div>
        <div className="mms-grid">
          <div className={page === "calendrier" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("calendrier"); setMenuOpen(false) }}><div className="mms-tile-ico">{"📅"}</div><div className="mms-tile-lbl">Calendrier</div></div>
          <div className={page === "notifs" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("notifs"); setMenuOpen(false) }}><div className="mms-tile-ico">{"🔔"}</div><div className="mms-tile-lbl">Notifs</div></div>
          <div className={page === "vault" ? "mms-tile active" : "mms-tile"} onClick={function(){ nav("vault"); setMenuOpen(false) }}><div className="mms-tile-ico">{"🔐"}</div><div className="mms-tile-lbl">Coffre</div></div>
        </div>
      </div>
      <FloatingChat profile={profile} isEmy={isEmy} />
      <div className={toastMsg ? 'toast show' : 'toast'}>{toastMsg}</div>
    </div>
  )
}
export default DashboardImpl
