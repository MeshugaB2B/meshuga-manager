'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const sb = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CATS_MAP: any = {
  all:{label:'Tous',emoji:'☰'},
  evenementiel:{label:'Événementiel',emoji:'🎉'},
  avocats:{label:'Avocats',emoji:'⚖️'},
  startup:{label:'Startups',emoji:'🚀'},
  hotel:{label:'Hôtels',emoji:'🏨'},
  conseil:{label:'Conseil',emoji:'📊'},
  tech:{label:'Tech',emoji:'💻'},
  luxe:{label:'Luxe & Mode',emoji:'👜'},
  coworking:{label:'Coworking',emoji:'🏗️'},
  banque:{label:'Banques',emoji:'🏦'},
  immo:{label:'Immobilier',emoji:'🏢'},
  institution:{label:'Institutions',emoji:'🏛️'},
  medias:{label:'Médias',emoji:'📰'},
  production:{label:'Tournages',emoji:'🎬'},
  ecole:{label:'Écoles',emoji:'🎓'},
  agence_pub:{label:'Agences créa',emoji:'🎨'},
  medical:{label:'Médical',emoji:'🏥'},
}
const STATUS_P: any = {to_contact:'À contacter',contacted:'Contacté',nego:'Négo',won:'Gagné ✓',lost:'Perdu'}
const STATUS_PC: any = {to_contact:'#888',contacted:'#B8920A',nego:'#005FFF',won:'#009D3A',lost:'#CC0066'}
const TASK_S: any = {todo:'À faire',in_progress:'En cours',done:'Terminé ✓'}
const CAT_ANN: any = {food:'🥩 Fournisseur food',banque:'🏦 Banque',presse:'📰 Presse',prestataire:'🔧 Prestataire',partenaire:'🤝 Partenaire',livraison:'🚲 Livraison',fournisseur:'📦 Fournisseur',it:'💻 IT',juridique:'⚖️ Juridique'}

const INIT_TASKS = [
  {id:1,title:'Créer le kit B2B',assignee:'emy',deadline:'2026-03-28',status:'in_progress',priority:'high',checklist:['Sélectionner les sandwichs','Faire les photos','Rédiger les tarifs'],files:[]},
  {id:2,title:'RDV Wagram Events',assignee:'emy',deadline:'2026-03-28',status:'todo',priority:'high',checklist:['Réviser le pitch','Préparer les échantillons'],files:[]},
  {id:3,title:'Valider le menu B2B',assignee:'edward',deadline:'2026-03-30',status:'todo',priority:'high',checklist:[],files:[]},
  {id:4,title:'Appeler 5 prospects',assignee:'emy',deadline:'2026-03-31',status:'todo',priority:'medium',checklist:[],files:[]},
]
const INIT_PROSPECTS = [
  {id:1,name:'Agence Wagram Events',email:'contact@wagram.fr',phone:'01 40 xx xx xx',size:'10-50',category:'Événementiel',status:'contacted',nextAction:'Envoyer devis',nextDate:'2026-03-25',notes:'Intéressée plateaux.',ca:0,score:8,files:[]},
  {id:2,name:'Station F',email:'office@stationf.co',phone:'06 98 76 54 32',size:'200-1000',category:'Startup',status:'nego',nextAction:'Envoyer devis URGENT',nextDate:'2026-03-25',notes:'Commandes régulières.',ca:0,score:9,files:[]},
]
const INIT_CONTACTS = [
  {id:1,cat:'food',name:'Maison Vérot',contact:'—',phone:'01 45 44 01 66',email:'contact@maisonverot.fr',notes:'Livraison lun-ven',vip:false},
  {id:2,cat:'banque',name:'BNP Paribas Vavin',contact:'Marie Dupont',phone:'01 56 xx xx xx',email:'m.dupont@bnp.fr',notes:'Gestionnaire pro',vip:false},
]
const INIT_VAULT = [
  {id:1,title:'Supabase',url:'https://supabase.com',user:'edward@meshuga.fr',pw:''},
  {id:2,title:'Vercel',url:'https://vercel.com',user:'edward@meshuga.fr',pw:''},
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [page, setPage] = useState('dash')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await sb().auth.getUser()
      if (!user) return
      const { data: prof } = await sb().from('profiles').select('*').eq('id', user.id).single()
      if (prof && prof.role) {
        setProfile(prof)
      } else {
        const role = user.email?.includes('emy') ? 'emy' : 'edward'
        setProfile({ role, full_name: role === 'emy' ? 'Emy' : 'Edward', email: user.email })
      }
    }
    load()
  }, [])

  const isEmy = profile?.role === 'emy'

  return (
    <div style={{background:'#FFEB5A',minHeight:'100vh',padding:20}}>
      {!profile && <div style={{position:'fixed',inset:0,background:'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}><div style={{fontWeight:900,fontSize:18,textTransform:'uppercase'}}>Chargement...</div></div>}
      <h1 style={{fontWeight:900,fontSize:32,textTransform:'uppercase'}}>Bonjour {isEmy ? 'Emy' : 'Edward'} 👋</h1>
      <p>Page active: {page}</p>
      <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
        {['dash','chasse','crm','annuaire','tasks','reporting','vault','journal'].map(p => (
          <button key={p} onClick={() => setPage(p)} style={{padding:'8px 14px',background:page===p?'#191923':'#fff',color:page===p?'#FFEB5A':'#191923',border:'2px solid #191923',borderRadius:4,fontWeight:900,cursor:'pointer',textTransform:'uppercase',fontSize:11}}>
            {p}
          </button>
        ))}
      </div>
      <div style={{marginTop:20,background:'#fff',border:'2px solid #191923',borderRadius:7,padding:16}}>
        <div style={{fontWeight:900,fontSize:16,marginBottom:8}}>Tâches actives</div>
        {INIT_TASKS.filter(t => t.status !== 'done').map(t => (
          <div key={t.id} style={{padding:'8px 0',borderBottom:'1px solid #eee',fontSize:13}}>
            {t.title} — <span style={{opacity:.5}}>{t.assignee} · {t.deadline}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
