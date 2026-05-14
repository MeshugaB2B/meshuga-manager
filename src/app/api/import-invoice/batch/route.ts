POST /api/import-invoice/batch
  body: { 
    files: [{ name, base64, hash }], 
    supplier_id_forced?: uuid,  // si tu zippes par fournisseur
    bypass_alerts: true 
  }
  
→ Pour chaque fichier :
  1. Check duplicate (hash + métier)
  2. Si pas doublon → OCR Claude (Sonnet 4.6, prompt enrichi avec les règles ci-dessus)
  3. Détection avoir (flag info, pas de logique business)
  4. Insert dans pending_invoices avec is_historical=true, batch_id
  5. Update compteur du batch

→ Retour : { batch_id, summary: {imported, duplicates, errors, anomalies} }
