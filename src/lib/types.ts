export type Website = {
  id: string;
  agent_id: string;
  name: string;
  origin: string;
  color: string;
  greeting: string;
  position: "left" | "right";
  online: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  site_id: string;
  visitor_name: string;
  email: string;
  page: string;
  status: "open" | "resolved";
  priority: boolean;
  unread: number;
  created_at: string;
  updated_at: string;
  site_name?: string;
  last_message?: string;
  last_sender?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender: "visitor" | "agent" | "bot";
  kind: "reply" | "note";
  body: string;
  file_url?: string | null;
  created_at: string;
};

export type Agent = {
  id: string;
  email: string;
  full_name: string;
};
