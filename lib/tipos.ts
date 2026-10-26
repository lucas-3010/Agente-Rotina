export type Canal = "email" | "whatsapp";

export type Origem = "manual" | "calendar" | "gmail";

export type StatusLembrete = "pendente" | "enviado" | "falhou" | "perdido" | "cancelado";

export interface Compromisso {
  id: string;
  usuario_id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  observacoes: string | null;
  origem: Origem;
  google_event_id: string | null;
  gmail_message_id: string | null;
  revisado: boolean;
  cancelado: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Lembrete {
  id: string;
  usuario_id: string;
  compromisso_id: string;
  minutos_antes: number;
  canal: Canal;
  enviar_em: string;
  status: StatusLembrete;
  tentativas: number;
  erro: string | null;
  enviado_em: string | null;
  criado_em: string;
}

export interface Configuracoes {
  usuario_id: string;
  whatsapp_telefone: string | null;
  whatsapp_apikey: string | null;
  email_destino: string | null;
  lembrete_padrao_minutos: number | null;
  resumo_diario: boolean;
  resumo_hora: string;
  ultima_sync_calendar: string | null;
  ultima_sync_gmail: string | null;
  erro_google: string | null;
  atualizado_em: string;
}

export interface CompromissoComLembretes extends Compromisso {
  lembretes: Lembrete[];
}

/** O que o formulário manda ao criar ou editar uma tarefa. */
export interface EntradaCompromisso {
  titulo: string;
  inicio: string;
  fim?: string | null;
  local?: string | null;
  observacoes?: string | null;
  lembretes: { minutos_antes: number; canal: Canal }[];
}
