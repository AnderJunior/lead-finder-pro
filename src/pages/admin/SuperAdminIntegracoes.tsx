import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { invalidateIntegracoesCache } from "@/lib/integracoes-config";
import {
  Eye,
  EyeOff,
  Loader2,
  Map,
  MessageSquare,
  PlayCircle,
  Puzzle,
  Save,
  Search,
} from "lucide-react";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";

interface ConfigGlobal {
  google_maps_api_key: string;
  serper_api_key: string;
  evolution_api_url: string;
  evolution_api_instance: string;
  evolution_api_key: string;
  onboarding_video_url: string;
}

const DEFAULT_CONFIG: ConfigGlobal = {
  google_maps_api_key: "",
  serper_api_key: "",
  evolution_api_url: "",
  evolution_api_instance: "",
  evolution_api_key: "",
  onboarding_video_url: "",
};

interface Field {
  key: keyof ConfigGlobal;
  label: string;
  placeholder: string;
  group: string;
  secret: boolean;
}

const FIELDS: Field[] = [
  {
    key: "google_maps_api_key",
    label: "API Key",
    placeholder: "AIzaSy...",
    group: "Google Maps API",
    secret: true,
  },
  {
    key: "serper_api_key",
    label: "API Key",
    placeholder: "sua-chave-serper",
    group: "Serper API",
    secret: true,
  },
  {
    key: "evolution_api_url",
    label: "URL",
    placeholder: "https://api.exemplo.com",
    group: "Evolution API",
    secret: false,
  },
  {
    key: "evolution_api_instance",
    label: "Nome da Instância",
    placeholder: "minha-instancia",
    group: "Evolution API",
    secret: false,
  },
  {
    key: "evolution_api_key",
    label: "API Key",
    placeholder: "sua-chave-evolution",
    group: "Evolution API",
    secret: true,
  },
  {
    key: "onboarding_video_url",
    label: "URL do Vídeo de Boas-vindas",
    placeholder: "https://... (mp4 direto ou link YouTube)",
    group: "Onboarding",
    secret: false,
  },
];

const GROUP_ICONS: Record<string, typeof Map> = {
  "Google Maps API": Map,
  "Serper API": Search,
  "Evolution API": MessageSquare,
  Onboarding: PlayCircle,
};

export default function SuperAdminIntegracoes() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const [config, setConfig] = useState<ConfigGlobal>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<any>("/api/configuracoes-globais");
        setConfig({
          google_maps_api_key: data.google_maps_api_key || "",
          serper_api_key: data.serper_api_key || "",
          evolution_api_url: data.evolution_api_url || "",
          evolution_api_instance: data.evolution_api_instance || "",
          evolution_api_key: data.evolution_api_key || "",
          onboarding_video_url: data.onboarding_video_url || "",
        });
      } catch (err) {
        console.warn("Erro ao carregar config global:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleChange(key: keyof ConfigGlobal, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function toggleShow(key: string) {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/api/configuracoes-globais", config);
      await invalidateIntegracoesCache();
      toast({
        title: "Salvo",
        description: "Integrações globais atualizadas.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const groups: Record<string, Field[]> = {};
  for (const field of FIELDS) {
    if (!groups[field.group]) groups[field.group] = [];
    groups[field.group].push(field);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <main className="ml-64 p-8">
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Puzzle className="h-6 w-6" />
              Integrações
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configurações de integrações usadas por todos os clientes do sistema.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {Object.entries(groups).map(([groupName, fields]) => {
                const GroupIcon = GROUP_ICONS[groupName] || Puzzle;
                return (
                  <Card key={groupName}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <GroupIcon className="h-5 w-5" />
                        {groupName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">
                            {field.label}
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type={
                                field.secret && !showKeys[field.key]
                                  ? "password"
                                  : "text"
                              }
                              placeholder={field.placeholder}
                              value={config[field.key]}
                              onChange={(e) =>
                                handleChange(field.key, e.target.value)
                              }
                              className="font-mono text-sm"
                            />
                            {field.secret && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => toggleShow(field.key)}
                                title={
                                  showKeys[field.key] ? "Ocultar" : "Mostrar"
                                }
                              >
                                {showKeys[field.key] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              <div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Integrações
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
