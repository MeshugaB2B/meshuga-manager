'use client'

export default function DashboardModals(props) {
  var modal = props.modal
  var form = props.form
  var setForm = props.setForm
  var closeModal = props.closeModal
  var saveTask = props.saveTask
  var saveContact = props.saveContact
  var saveVault = props.saveVault
  var saveCalEvent = props.saveCalEvent
  var deleteCalEvent = props.deleteCalEvent
  var submitCR = props.submitCR
  var enrichProspect = props.enrichProspect
  var enrichLoading = props.enrichLoading
  var generateEmail = props.generateEmail
  var generatingEmail = props.generatingEmail
  var generatedEmail = props.generatedEmail
  var setGeneratedEmail = props.setGeneratedEmail
  var emailProspect = props.emailProspect
  var setEmailProspect = props.setEmailProspect
  var prospects = props.prospects
  var contacts = props.contacts
  var vault = props.vault
  var toast = props.toast
  var nav = props.nav

  return (
    <div>
{modal === 'task' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" onClick={function(e){e.stopPropagation()}}>
      <div className="mh"><div className="mt">{form.id?'Modifier la tâche':'Nouvelle tâche'}</div></div>
      <div className="mb">
        <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e){setForm(Object.assign({},form,{title:e.target.value}))}} placeholder="Ex: Appeler Agence Wagram" /></div>
        <div className="fg"><label className="lbl">Description</label><textarea className="inp" value={form.description||''} onChange={function(e){setForm(Object.assign({},form,{description:e.target.value}))}} rows={2} /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Date limite</label><input type="date" className="inp" value={form.deadline||''} onChange={function(e){setForm(Object.assign({},form,{deadline:e.target.value}))}} /></div>
          <div className="fg"><label className="lbl">Assigné à</label>
            <select className="inp" value={form.assignee||'emy'} onChange={function(e){setForm(Object.assign({},form,{assignee:e.target.value}))}}>
              <option value="emy">Emy</option>
              <option value="edward">Edward</option>
            </select>
          </div>
        </div>
        <div className="fg"><label className="lbl">Priorité</label>
          <select className="inp" value={form.priority||'medium'} onChange={function(e){setForm(Object.assign({},form,{priority:e.target.value}))}}>
            <option value="high">🔴 Haute</option>
            <option value="medium">🟡 Moyenne</option>
            <option value="low">🟢 Basse</option>
          </select>
        </div>
      </div>
      <div className="mf">
        <button className="btn" onClick={closeModal}>Annuler</button>
        <button className="btn btn-y" onClick={saveTask}>{form.id?'Modifier':'Créer'}</button>
      </div>
    </div>
  </div>
)}

{modal === 'prospect' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" onClick={function(e){e.stopPropagation()}}>
      <div className="mh"><div className="mt">{form.id?'Modifier le prospect':'Nouveau prospect'}</div></div>
      <div className="mb">
        <div className="fg">
          <label className="lbl">Nom de l&apos;entreprise *</label>
          <div style={{display:'flex',gap:8}}>
            <input className="inp" value={form.name||''} onChange={function(e){setForm(Object.assign({},form,{name:e.target.value}))}} placeholder="Ex: Agence Wagram Events" style={{flex:1}} />
            <button className="btn btn-sm" style={{background:'#FF82D7',color:'#fff',flexShrink:0,opacity:enrichLoading?0.5:1,fontSize:11}} disabled={enrichLoading} onClick={enrichProspect}>
              {enrichLoading ? '⏳' : '✨ IA'}
            </button>
          </div>
          {!form.id && <div style={{fontSize:10,color:'#888',marginTop:3}}>Tape le nom et clique ✨ IA pour pré-remplir automatiquement</div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={function(e){setForm(Object.assign({},form,{email:e.target.value}))}} /></div>
          <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={function(e){setForm(Object.assign({},form,{phone:e.target.value}))}} /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Catégorie</label>
            <select className="inp" value={form.category||'Autre'} onChange={function(e){setForm(Object.assign({},form,{category:e.target.value}))}}>
              <option value="Startup">Startup</option>
              <option value="Corporate">Corporate</option>
              <option value="Agence">Agence</option>
              <option value="RH">RH</option>
              <option value="Luxe">Luxe</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div className="fg"><label className="lbl">Taille (personnes)</label><input type="number" className="inp" value={form.size||''} onChange={function(e){setForm(Object.assign({},form,{size:e.target.value}))}} /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Statut</label>
            <select className="inp" value={form.status||'to_contact'} onChange={function(e){setForm(Object.assign({},form,{status:e.target.value}))}}>
              <option value="to_contact">À contacter</option>
              <option value="contacted">Contacté</option>
              <option value="nego">En négo</option>
              <option value="won">Gagné</option>
              <option value="lost">Perdu</option>
            </select>
          </div>
          <div className="fg"><label className="lbl">Température</label>
            <select className="inp" value={form.temperature||'tiede'} onChange={function(e){setForm(Object.assign({},form,{temperature:e.target.value}))}}>
              <option value="chaud">🔥 Chaud</option>
              <option value="tiede">😐 Tiède</option>
              <option value="froid">🧊 Froid</option>
            </select>
          </div>
        </div>
        <div className="fg"><label className="lbl">Prochaine action</label><input className="inp" value={form.nextAction||''} onChange={function(e){setForm(Object.assign({},form,{nextAction:e.target.value}))}} placeholder="Ex: Relancer par email" /></div>
        <div className="fg"><label className="lbl">Date de relance</label><input type="date" className="inp" value={form.nextDate||''} onChange={function(e){setForm(Object.assign({},form,{nextDate:e.target.value}))}} /></div>
        <div className="fg"><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} rows={3} placeholder="Infos utiles, historique..." /></div>
      </div>
      <div className="mf">
        <button className="btn" onClick={closeModal}>Annuler</button>
        {form.id&&<button className="btn btn-red" onClick={function(){setProspects(function(prev){return prev.filter(function(x){return x.id!==form.id})});closeModal()}}>Supprimer</button>}
        <button className="btn btn-y" onClick={saveProspect}>{form.id?'Modifier':'Créer'}</button>
      </div>
    </div>
  </div>
)}

{modal === 'email' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" style={{maxWidth:640}} onClick={function(e){e.stopPropagation()}}>
      <div className="mh">
        <div className="mt">✉️ Email IA — {emailProspect&&emailProspect.name}</div>
      </div>
      <div className="mb">
        {generatingEmail&&(
          <div style={{textAlign:'center',padding:30,opacity:.5}}>
            <div style={{fontSize:28,marginBottom:8}}>✉️</div>
            <div style={{fontWeight:900,fontSize:12}}>Génération en cours...</div>
          </div>
        )}
        {!generatingEmail&&(
          <textarea className="inp" value={generatedEmail} onChange={function(e){setGeneratedEmail(e.target.value)}} rows={14} style={{width:'100%',fontSize:13,lineHeight:1.7,fontFamily:'Arial Narrow, Arial, sans-serif'}} />
        )}
      </div>
      <div className="mf">
        <button className="btn" onClick={closeModal}>Fermer</button>
        {!generatingEmail&&generatedEmail&&(
          <button className="btn btn-y" onClick={function(){
            navigator.clipboard.writeText(generatedEmail).then(function(){
              logActivity('email_copie','Email copié pour '+((emailProspect&&emailProspect.name)||''), (emailProspect&&emailProspect.name)||'',generatedEmail)
              toast('Email copié !')
            })
          }}>📋 Copier</button>
        )}
      </div>
    </div>
  </div>
)}

{modal === 'contact' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" onClick={function(e){e.stopPropagation()}}>
      <div className="mh"><div className="mt">{form.id?'Modifier le contact':'Nouveau contact'}</div></div>
      <div className="mb">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Prénom</label><input className="inp" value={form.prenom||''} onChange={function(e){setForm(Object.assign({},form,{prenom:e.target.value}))}} placeholder="Marie" /></div>
          <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.nom||''} onChange={function(e){setForm(Object.assign({},form,{nom:e.target.value}))}} placeholder="Dupont" /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Société</label><input className="inp" value={form.company_name||form.societe||''} onChange={function(e){setForm(Object.assign({},form,{company_name:e.target.value,societe:e.target.value}))}} placeholder="Ex: BNP Paribas" /></div>
          <div className="fg"><label className="lbl">Site web</label><input className="inp" value={form.website||''} onChange={function(e){setForm(Object.assign({},form,{website:e.target.value}))}} placeholder="https://..." /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Email principal</label><input className="inp" value={form.email||''} onChange={function(e){setForm(Object.assign({},form,{email:e.target.value}))}} /></div>
          <div className="fg"><label className="lbl">Email 2</label><input className="inp" value={form.email2||''} onChange={function(e){setForm(Object.assign({},form,{email2:e.target.value}))}} /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Téléphone principal</label><input className="inp" value={form.phone||''} onChange={function(e){setForm(Object.assign({},form,{phone:e.target.value}))}} /></div>
          <div className="fg"><label className="lbl">Téléphone 2</label><input className="inp" value={form.phone2||''} onChange={function(e){setForm(Object.assign({},form,{phone2:e.target.value}))}} /></div>
        </div>
        <div className="fg"><label className="lbl">Catégorie</label>
          <select className="inp" value={form.category||form.cat||'food'} onChange={function(e){setForm(Object.assign({},form,{category:e.target.value}))}}>
            <option value="food">Fournisseur alimentaire</option>
            <option value="prestataire">Prestataire</option>
            <option value="photographe">↳ Photographe</option>
            <option value="comptabilite">↳ Comptabilité</option>
            <option value="client">Client B2B</option>
            <option value="presse">Presse</option>
            <option value="banque">Banque</option>
            <option value="team">Team Meshuga</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div className="fg"><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} rows={2} /></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="checkbox" checked={!!form.vip} onChange={function(e){setForm(Object.assign({},form,{vip:e.target.checked}))}} />
          <label>Contact VIP ⭐</label>
        </div>
      </div>
      <div className="mf">
        <button className="btn" onClick={closeModal}>Annuler</button>
        {form.id&&<button className="btn btn-red" onClick={function(){sb().from('contacts').delete().eq('id',form.id).then(function(){loadContacts();toast('Contact supprimé')});closeModal()}}>Supprimer</button>}
        <button className="btn btn-y" onClick={saveContact}>{form.id?'Modifier':'Créer'}</button>
      </div>
    </div>
  </div>
)}


{modal === 'vault' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" onClick={function(e){e.stopPropagation()}}>
      <div className="mh"><div className="mt">{form.id?'Modifier':'Nouveau secret'}</div></div>
      <div className="mb">
        <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e){setForm(Object.assign({},form,{title:e.target.value}))}} /></div>
        <div className="fg"><label className="lbl">Identifiant / Login</label><input className="inp" value={form.login||''} onChange={function(e){setForm(Object.assign({},form,{login:e.target.value}))}} /></div>
        <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.password||''} onChange={function(e){setForm(Object.assign({},form,{password:e.target.value}))}} /></div>
        <div className="fg"><label className="lbl">URL / Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} rows={2} /></div>
      </div>
      <div className="mf">
        <button className="btn" onClick={closeModal}>Annuler</button>
        <button className="btn btn-y" onClick={saveVault}>{form.id?'Modifier':'Ajouter'}</button>
      </div>
    </div>
  </div>
)}

{modal === 'cal_event' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" onClick={function(e){e.stopPropagation()}}>
      <div className="mh"><div className="mt">{form.id?"Modifier l'événement":'Nouvel événement'}</div></div>
      <div className="mb">
        <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e){setForm(Object.assign({},form,{title:e.target.value}))}} placeholder="Ex: Event corporate Wagram" /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Date début *</label><input type="date" className="inp" value={form.start_date||''} onChange={function(e){setForm(Object.assign({},form,{start_date:e.target.value}))}} /></div>
          <div className="fg"><label className="lbl">Date fin</label><input type="date" className="inp" value={form.end_date||''} onChange={function(e){setForm(Object.assign({},form,{end_date:e.target.value}))}} /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Heure</label><input type="time" className="inp" value={form.time||''} onChange={function(e){setForm(Object.assign({},form,{time:e.target.value}))}} /></div>
          <div className="fg"><label className="lbl">Type</label>
            <select className="inp" value={form.type||'event'} onChange={function(e){setForm(Object.assign({},form,{type:e.target.value}))}}>
              <option value="event">🎉 Événement client</option>
              <option value="rdv">🤝 RDV prospect</option>
              <option value="livraison">🚚 Livraison / Prestation</option>
              <option value="relance">📞 Relance</option>
              <option value="admin">📋 Admin / Interne</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>
        <div className="fg"><label className="lbl">Lieu</label><input className="inp" value={form.location||''} onChange={function(e){setForm(Object.assign({},form,{location:e.target.value}))}} placeholder="Adresse ou lieu" /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="fg"><label className="lbl">Client / Prospect</label><input className="inp" value={form.prospect||''} onChange={function(e){setForm(Object.assign({},form,{prospect:e.target.value}))}} placeholder="Nom de l'entreprise" /></div>
          <div className="fg"><label className="lbl">Montant estimé €HT</label><input type="number" className="inp" value={form.amount||''} onChange={function(e){setForm(Object.assign({},form,{amount:e.target.value}))}} /></div>
        </div>
        <div className="fg"><label className="lbl">Assigné à</label>
          <select className="inp" value={form.assignee||'all'} onChange={function(e){setForm(Object.assign({},form,{assignee:e.target.value}))}}>
            <option value="all">Edward + Emy</option>
            <option value="edward">Edward</option>
            <option value="emy">Emy</option>
          </select>
        </div>
        <div className="fg"><label className="lbl">Notes</label><textarea className="inp" rows={2} value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} /></div>
        {form.contact_info&&<div style={{background:'#EFF3FF',border:'1px dashed #005FFF',borderRadius:6,padding:'8px 10px',fontSize:11,color:'#005FFF',lineHeight:1.7}}><strong>📋 Infos contact (suggestion IA) :</strong><br/>{form.contact_info}</div>}
      </div>
      <div className="mf">
        <button className="btn" onClick={closeModal}>Annuler</button>
        {form.id&&<button className="btn btn-red" onClick={function(){deleteCalEvent(form.id);closeModal();toast('Événement supprimé')}}>Supprimer</button>}
        <button className="btn btn-y" onClick={function(){
          if(!form.title||!form.start_date){toast('Titre et date requis !');return}
          saveCalEvent({
            id:form.id||undefined,
            title:form.title,start_date:form.start_date,end_date:form.end_date||form.start_date,
            time:form.time||null,type:form.type||'event',location:form.location||'',
            prospect:form.prospect||'',amount:parseFloat(form.amount)||null,
            assignee:form.assignee||'all',notes:form.notes||''
          },function(){closeModal();toast(form.id?'Événement modifié ✓':'Événement créé ✓')})
        }}>{form.id?'Modifier':'Créer'}</button>
      </div>
    </div>
  </div>
)}

{modal === 'cr' && (
  <div className="overlay" onClick={closeModal}>
    <div className="modal" onClick={function(e) { e.stopPropagation() }}>
      <div className="mh"><div className="mt">Compte-rendu hebdomadaire</div></div>
      <div className="mb">
        <div className="fg"><label className="lbl">Semaine du *</label><input className="inp" value={form.week||''} onChange={function(e) { setForm(Object.assign({},form,{week:e.target.value})) }} placeholder="ex: 25 mars 2026" /></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
          <div className="fg"><label className="lbl">Prospects</label><input type="number" className="inp" value={form.prospects||0} onChange={function(e) { setForm(Object.assign({},form,{prospects:parseInt(e.target.value)||0})) }} /></div>
          <div className="fg"><label className="lbl">RDV</label><input type="number" className="inp" value={form.rdv||0} onChange={function(e) { setForm(Object.assign({},form,{rdv:parseInt(e.target.value)||0})) }} /></div>
          <div className="fg"><label className="lbl">Commandes</label><input type="number" className="inp" value={form.cmds||0} onChange={function(e) { setForm(Object.assign({},form,{cmds:parseInt(e.target.value)||0})) }} /></div>
        </div>
        <div className="fg"><label className="lbl">✅ Victoires</label><textarea className="inp" value={form.wins||''} onChange={function(e) { setForm(Object.assign({},form,{wins:e.target.value})) }} /></div>
        <div className="fg"><label className="lbl">⚡ Challenges</label><textarea className="inp" value={form.challenges||''} onChange={function(e) { setForm(Object.assign({},form,{challenges:e.target.value})) }} /></div>
        <div className="fg"><label className="lbl">🎯 Priorites S+1</label><textarea className="inp" value={form.next||''} onChange={function(e) { setForm(Object.assign({},form,{next:e.target.value})) }} /></div>
        <div className="fg"><label className="lbl">💬 Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={function(e) { setForm(Object.assign({},form,{notes:e.target.value})) }} /></div>
      </div>
      <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={submitCR}>Soumettre a Edward</button></div>
    </div>
  </div>
)}
    </div>
  )
}
