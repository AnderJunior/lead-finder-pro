import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useIntegracoesConfig } from "@/lib/integracoes-config";
import { Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Aparece automaticamente para usuários novos (que ainda não viram o vídeo de onboarding).
 * Não pode ser fechado até o vídeo acabar.
 * Persistência: ao terminar, marca no backend; logout/login não mostra de novo.
 */
export function OnboardingVideoModal() {
  const { dbUser, reloadProfile } = useAuth();
  const { config, loading: configLoading } = useIntegracoesConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bloqueia ESC e backdrop click impedindo fechamento
  useEffect(() => {
    if (!shouldShow()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser?.onboarding_video_watched]);

  function shouldShow() {
    if (!dbUser) return false;
    if (dbUser.onboarding_video_watched) return false;
    if (dbUser.role === "super_admin") return false;
    return true;
  }

  if (!shouldShow()) return null;
  // Aguarda config carregar antes de renderizar (evita flicker sem URL)
  if (configLoading) return null;

  const videoUrl = config.onboarding_video_url?.trim() || "";

  async function handleVideoEnded() {
    setCompleted(true);
  }

  async function handleConcluir() {
    setSaving(true);
    try {
      await api.post("/api/auth/onboarding-watched");
      await reloadProfile();
    } catch (err) {
      console.warn("Erro ao marcar onboarding:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <PlayCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Bem-vindo ao LeadRadar! 🎉
              </h2>
              <p className="text-xs text-muted-foreground">
                Assista ao vídeo até o final para liberar o acesso ao sistema
              </p>
            </div>
          </div>
        </div>

        <div className="bg-black aspect-video w-full">
          {videoUrl ? (
            isYouTubeUrl(videoUrl) ? (
              // YouTube: não há "ended" via postMessage simples, usar player API.
              // Aqui mostramos o iframe com aviso que o usuário deve clicar em "Já assisti" depois de ver tudo.
              <iframe
                src={toYouTubeEmbed(videoUrl)}
                title="Onboarding"
                className="w-full h-full"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full"
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onEnded={handleVideoEnded}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
              Vídeo de onboarding não configurado.
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-between gap-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground flex-1">
            {completed
              ? "✓ Vídeo concluído. Você já pode prosseguir."
              : "Esta janela só liberará após o final do vídeo."}
          </p>
          <Button
            onClick={handleConcluir}
            disabled={(!completed && !isYouTubeUrl(videoUrl)) || saving || !videoUrl}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isYouTubeUrl(videoUrl) ? "Já assisti, prosseguir" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function isYouTubeUrl(url: string) {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function toYouTubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  const id = m?.[1];
  if (!id) return url;
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}
