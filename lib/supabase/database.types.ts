export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      animali: {
        Row: {
          attivo: boolean
          colore_piumaggio: string | null
          created_at: string
          data_nascita: string | null
          eta_approssimativa_mesi: number | null
          foto_url: string | null
          id: string
          nome: string
          note: string | null
          pollaio_id: string
          razza_custom: string | null
          razza_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          colore_piumaggio?: string | null
          created_at?: string
          data_nascita?: string | null
          eta_approssimativa_mesi?: number | null
          foto_url?: string | null
          id?: string
          nome: string
          note?: string | null
          pollaio_id: string
          razza_custom?: string | null
          razza_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          colore_piumaggio?: string | null
          created_at?: string
          data_nascita?: string | null
          eta_approssimativa_mesi?: number | null
          foto_url?: string | null
          id?: string
          nome?: string
          note?: string | null
          pollaio_id?: string
          razza_custom?: string | null
          razza_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animali_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      contatti: {
        Row: {
          created_at: string
          id: string
          nome: string
          note: string | null
          pollaio_id: string
          relazione: string | null
          telefono: string | null
          updated_at: string
          utente_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          note?: string | null
          pollaio_id: string
          relazione?: string | null
          telefono?: string | null
          updated_at?: string
          utente_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          note?: string | null
          pollaio_id?: string
          relazione?: string | null
          telefono?: string | null
          updated_at?: string
          utente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatti_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_salute: {
        Row: {
          animale_id: string
          created_at: string
          data: string
          data_risoluzione: string | null
          descrizione: string | null
          foto_url: string | null
          id: string
          note_followup: string | null
          pollaio_id: string
          stato: string
          tipo: string
          updated_at: string
        }
        Insert: {
          animale_id: string
          created_at?: string
          data?: string
          data_risoluzione?: string | null
          descrizione?: string | null
          foto_url?: string | null
          id?: string
          note_followup?: string | null
          pollaio_id: string
          stato?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          animale_id?: string
          created_at?: string
          data?: string
          data_risoluzione?: string | null
          descrizione?: string | null
          foto_url?: string | null
          id?: string
          note_followup?: string | null
          pollaio_id?: string
          stato?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventi_salute_animale_id_fkey"
            columns: ["animale_id"]
            isOneToOne: false
            referencedRelation: "animali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_salute_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_spesa: {
        Row: {
          categoria: string | null
          comprato: boolean
          created_at: string
          data_acquisto: string | null
          id: string
          pollaio_id: string
          quantita: string | null
          testo: string
        }
        Insert: {
          categoria?: string | null
          comprato?: boolean
          created_at?: string
          data_acquisto?: string | null
          id?: string
          pollaio_id: string
          quantita?: string | null
          testo: string
        }
        Update: {
          categoria?: string | null
          comprato?: boolean
          created_at?: string
          data_acquisto?: string | null
          id?: string
          pollaio_id?: string
          quantita?: string | null
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lista_spesa_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      log_uscite: {
        Row: {
          created_at: string
          data: string
          id: string
          note: string | null
          ora_rientro: string | null
          ora_uscita: string | null
          pollaio_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          note?: string | null
          ora_rientro?: string | null
          ora_uscita?: string | null
          pollaio_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          ora_rientro?: string | null
          ora_uscita?: string | null
          pollaio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_uscite_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      manutenzioni: {
        Row: {
          created_at: string
          data: string
          foto_url: string | null
          id: string
          note: string | null
          pollaio_id: string
          voce_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          note?: string | null
          pollaio_id: string
          voce_id: string
        }
        Update: {
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          note?: string | null
          pollaio_id?: string
          voce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutenzioni_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutenzioni_voce_id_fkey"
            columns: ["voce_id"]
            isOneToOne: false
            referencedRelation: "manutenzioni_voci"
            referencedColumns: ["id"]
          },
        ]
      }
      manutenzioni_voci: {
        Row: {
          attivo: boolean
          consiglio_id: string | null
          created_at: string
          dove: string | null
          frequenza_giorni: number
          icona: string
          id: string
          nome: string
          note: string | null
          pollaio_id: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          consiglio_id?: string | null
          created_at?: string
          dove?: string | null
          frequenza_giorni: number
          icona?: string
          id?: string
          nome: string
          note?: string | null
          pollaio_id: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          consiglio_id?: string | null
          created_at?: string
          dove?: string | null
          frequenza_giorni?: number
          icona?: string
          id?: string
          nome?: string
          note?: string | null
          pollaio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutenzioni_voci_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      meteo_storico: {
        Row: {
          condizione: string | null
          created_at: string
          data: string
          id: string
          ore_sole: number | null
          pollaio_id: string
          precipitazioni_mm: number | null
          temp_max: number | null
          temp_min: number | null
          vento_max_kmh: number | null
        }
        Insert: {
          condizione?: string | null
          created_at?: string
          data: string
          id?: string
          ore_sole?: number | null
          pollaio_id: string
          precipitazioni_mm?: number | null
          temp_max?: number | null
          temp_min?: number | null
          vento_max_kmh?: number | null
        }
        Update: {
          condizione?: string | null
          created_at?: string
          data?: string
          id?: string
          ore_sole?: number | null
          pollaio_id?: string
          precipitazioni_mm?: number | null
          temp_max?: number | null
          temp_min?: number | null
          vento_max_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meteo_storico_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      nidi: {
        Row: {
          created_at: string
          id: string
          nome: string
          note: string | null
          ordine: number
          pollaio_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          note?: string | null
          ordine?: number
          pollaio_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          note?: string | null
          ordine?: number
          pollaio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nidi_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      note: {
        Row: {
          archiviata: boolean
          created_at: string
          data: string
          foto_url: string | null
          id: string
          pollaio_id: string
          promemoria_canale: string | null
          promemoria_data: string | null
          promemoria_inviato: boolean
          tag: string | null
          testo: string
          updated_at: string
        }
        Insert: {
          archiviata?: boolean
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          pollaio_id: string
          promemoria_canale?: string | null
          promemoria_data?: string | null
          promemoria_inviato?: boolean
          tag?: string | null
          testo: string
          updated_at?: string
        }
        Update: {
          archiviata?: boolean
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          pollaio_id?: string
          promemoria_canale?: string | null
          promemoria_data?: string | null
          promemoria_inviato?: boolean
          tag?: string | null
          testo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      notifiche_inviate: {
        Row: {
          categoria: string
          id: string
          inviata_il: string
          riferimento_id: string
          user_id: string
        }
        Insert: {
          categoria: string
          id?: string
          inviata_il?: string
          riferimento_id: string
          user_id: string
        }
        Update: {
          categoria?: string
          id?: string
          inviata_il?: string
          riferimento_id?: string
          user_id?: string
        }
        Relationships: []
      }
      periodi_muta: {
        Row: {
          animale_id: string
          created_at: string
          data_fine: string | null
          data_inizio: string
          id: string
          note: string | null
          pollaio_id: string
        }
        Insert: {
          animale_id: string
          created_at?: string
          data_fine?: string | null
          data_inizio: string
          id?: string
          note?: string | null
          pollaio_id: string
        }
        Update: {
          animale_id?: string
          created_at?: string
          data_fine?: string | null
          data_inizio?: string
          id?: string
          note?: string | null
          pollaio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodi_muta_animale_id_fkey"
            columns: ["animale_id"]
            isOneToOne: false
            referencedRelation: "animali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodi_muta_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      pollai: {
        Row: {
          conservazione_ambiente_giorni: number
          conservazione_frigo_giorni: number
          created_at: string
          foto_url: string | null
          id: string
          nome: string
          posizione_lat: number | null
          posizione_lng: number | null
          posizione_nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conservazione_ambiente_giorni?: number
          conservazione_frigo_giorni?: number
          created_at?: string
          foto_url?: string | null
          id?: string
          nome: string
          posizione_lat?: number | null
          posizione_lng?: number | null
          posizione_nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conservazione_ambiente_giorni?: number
          conservazione_frigo_giorni?: number
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string
          posizione_lat?: number | null
          posizione_lng?: number | null
          posizione_nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pollaio_inviti: {
        Row: {
          accettato_da: string | null
          accettato_il: string | null
          created_at: string
          email: string
          id: string
          invitato_da: string
          messaggio: string | null
          pollaio_id: string
          ruolo: string
          scadenza: string
          token: string
        }
        Insert: {
          accettato_da?: string | null
          accettato_il?: string | null
          created_at?: string
          email: string
          id?: string
          invitato_da: string
          messaggio?: string | null
          pollaio_id: string
          ruolo: string
          scadenza?: string
          token?: string
        }
        Update: {
          accettato_da?: string | null
          accettato_il?: string | null
          created_at?: string
          email?: string
          id?: string
          invitato_da?: string
          messaggio?: string | null
          pollaio_id?: string
          ruolo?: string
          scadenza?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pollaio_inviti_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      pollaio_members: {
        Row: {
          created_at: string
          pollaio_id: string
          ruolo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pollaio_id: string
          ruolo: string
          user_id: string
        }
        Update: {
          created_at?: string
          pollaio_id?: string
          ruolo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pollaio_members_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      preferenze_notifiche: {
        Row: {
          categorie: Json
          created_at: string
          email_attivo: boolean
          globale_attivo: boolean
          non_disturbare_fine: string | null
          non_disturbare_inizio: string | null
          ora_notifiche_meteo: string
          push_attivo: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categorie?: Json
          created_at?: string
          email_attivo?: boolean
          globale_attivo?: boolean
          non_disturbare_fine?: string | null
          non_disturbare_inizio?: string | null
          ora_notifiche_meteo?: string
          push_attivo?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categorie?: Json
          created_at?: string
          email_attivo?: boolean
          globale_attivo?: boolean
          non_disturbare_fine?: string | null
          non_disturbare_inizio?: string | null
          ora_notifiche_meteo?: string
          push_attivo?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          pollaio_attivo_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          pollaio_attivo_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          pollaio_attivo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pollaio_attivo_id_fkey"
            columns: ["pollaio_attivo_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      regali: {
        Row: {
          contatto_id: string | null
          created_at: string
          data: string
          id: string
          note: string | null
          pollaio_id: string
          quantita: number
        }
        Insert: {
          contatto_id?: string | null
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          pollaio_id: string
          quantita: number
        }
        Update: {
          contatto_id?: string | null
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          pollaio_id?: string
          quantita?: number
        }
        Relationships: [
          {
            foreignKeyName: "regali_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regali_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      richieste_uova: {
        Row: {
          created_at: string
          evasa_da: string | null
          evasa_il: string | null
          id: string
          nota: string | null
          pollaio_id: string
          quantita: number
          regalo_id: string | null
          richiedente_user_id: string
          stato: string
        }
        Insert: {
          created_at?: string
          evasa_da?: string | null
          evasa_il?: string | null
          id?: string
          nota?: string | null
          pollaio_id: string
          quantita: number
          regalo_id?: string | null
          richiedente_user_id: string
          stato?: string
        }
        Update: {
          created_at?: string
          evasa_da?: string | null
          evasa_il?: string | null
          id?: string
          nota?: string | null
          pollaio_id?: string
          quantita?: number
          regalo_id?: string | null
          richiedente_user_id?: string
          stato?: string
        }
        Relationships: [
          {
            foreignKeyName: "richieste_uova_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richieste_uova_regalo_id_fkey"
            columns: ["regalo_id"]
            isOneToOne: false
            referencedRelation: "regali"
            referencedColumns: ["id"]
          },
        ]
      }
      scorte_cibo: {
        Row: {
          created_at: string
          id: string
          nome: string
          pollaio_id: string
          quantita: number | null
          soglia_avviso: number | null
          unita: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          pollaio_id: string
          quantita?: number | null
          soglia_avviso?: number | null
          unita?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          pollaio_id?: string
          quantita?: number | null
          soglia_avviso?: number | null
          unita?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorte_cibo_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      scorte_rifornimenti: {
        Row: {
          created_at: string
          data: string
          id: string
          note: string | null
          quantita_aggiunta: number
          scorta_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          quantita_aggiunta: number
          scorta_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          quantita_aggiunta?: number
          scorta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorte_rifornimenti_scorta_id_fkey"
            columns: ["scorta_id"]
            isOneToOne: false
            referencedRelation: "scorte_cibo"
            referencedColumns: ["id"]
          },
        ]
      }
      spese: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descrizione: string
          id: string
          importo_euro: number
          note: string | null
          pollaio_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data: string
          descrizione: string
          id?: string
          importo_euro: number
          note?: string | null
          pollaio_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descrizione?: string
          id?: string
          importo_euro?: number
          note?: string | null
          pollaio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spese_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      trattamenti: {
        Row: {
          animale_id: string | null
          applica_a_tutti: boolean
          created_at: string
          data: string
          dose: string | null
          id: string
          note: string | null
          notifica_inviata: boolean
          pollaio_id: string
          prodotto: string | null
          prossima_data: string | null
          tipo: string
        }
        Insert: {
          animale_id?: string | null
          applica_a_tutti?: boolean
          created_at?: string
          data?: string
          dose?: string | null
          id?: string
          note?: string | null
          notifica_inviata?: boolean
          pollaio_id: string
          prodotto?: string | null
          prossima_data?: string | null
          tipo: string
        }
        Update: {
          animale_id?: string | null
          applica_a_tutti?: boolean
          created_at?: string
          data?: string
          dose?: string | null
          id?: string
          note?: string | null
          notifica_inviata?: boolean
          pollaio_id?: string
          prodotto?: string | null
          prossima_data?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "trattamenti_animale_id_fkey"
            columns: ["animale_id"]
            isOneToOne: false
            referencedRelation: "animali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trattamenti_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
        ]
      }
      uova: {
        Row: {
          animale_id: string | null
          conservazione: string
          created_at: string
          data_consumato: string | null
          data_deposizione: string
          foto_url: string | null
          id: string
          nido_id: string | null
          note: string | null
          pollaio_id: string
          regalo_id: string | null
          stato: string
          updated_at: string
        }
        Insert: {
          animale_id?: string | null
          conservazione?: string
          created_at?: string
          data_consumato?: string | null
          data_deposizione?: string
          foto_url?: string | null
          id?: string
          nido_id?: string | null
          note?: string | null
          pollaio_id: string
          regalo_id?: string | null
          stato?: string
          updated_at?: string
        }
        Update: {
          animale_id?: string | null
          conservazione?: string
          created_at?: string
          data_consumato?: string | null
          data_deposizione?: string
          foto_url?: string | null
          id?: string
          nido_id?: string | null
          note?: string | null
          pollaio_id?: string
          regalo_id?: string | null
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uova_animale_id_fkey"
            columns: ["animale_id"]
            isOneToOne: false
            referencedRelation: "animali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uova_nido_id_fkey"
            columns: ["nido_id"]
            isOneToOne: false
            referencedRelation: "nidi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uova_pollaio_id_fkey"
            columns: ["pollaio_id"]
            isOneToOne: false
            referencedRelation: "pollai"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uova_regalo_id_fkey"
            columns: ["regalo_id"]
            isOneToOne: false
            referencedRelation: "regali"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invito: { Args: { p_token: string }; Returns: Json }
      accetta_richiesta_uova: { Args: { p_richiesta: string }; Returns: Json }
      is_my_pollaio: { Args: { p_pollaio: string }; Returns: boolean }
      merge_contatto_con_utente: {
        Args: { p_contatto: string; p_rinomina?: string; p_utente: string }
        Returns: Json
      }
      my_pollaio_role: { Args: { p_pollaio: string }; Returns: string }
      rifiuta_richiesta_uova: { Args: { p_richiesta: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
