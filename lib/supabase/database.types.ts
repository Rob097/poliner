export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      manutenzioni: {
        Row: {
          created_at: string
          data: string
          foto_url: string | null
          id: string
          note: string | null
          pollaio_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          note?: string | null
          pollaio_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          note?: string | null
          pollaio_id?: string
          tipo?: string
        }
        Relationships: []
      }
      manutenzioni_config: {
        Row: {
          frequenza_giorni: number
          pollaio_id: string
          tipo: string
        }
        Insert: {
          frequenza_giorni: number
          pollaio_id: string
          tipo: string
        }
        Update: {
          frequenza_giorni?: number
          pollaio_id?: string
          tipo?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_my_pollaio: { Args: { p_pollaio: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
